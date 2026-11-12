"""
evaluation/evaluate_routing.py
------------------------------
Rigorous Routing Algorithm Evaluation & Metric Verification Script for ConnexLink.

Evaluates McRAPTOR against the core metrics formalized in the manuscript:
1. Route Discovery:
   - Total queries, successful queries, failed queries, success percentage.
   - Average itineraries returned, average transfers per itinerary.
2. Booking Certainty:
   - Confirmed journeys (every leg AVAILABLE).
   - RAC journeys (weakest leg is RAC).
   - Waitlisted journeys (weakest leg is WL).
   - Unknown status journeys.
3. Journey Quality:
   - Average duration (mins), distance (km), tariff (INR), Pareto solutions count.
4. Formal Thesis Metrics:
   - Route Discovery Success Rate = (Successful / Total valid queries) * 100
   - Confirmed Journey Rate = (Queries returning >= 1 fully confirmed itinerary / Total valid queries) * 100
   - Waitlist Escape Rate = (Direct-rail waitlisted queries with an alternative fully confirmed itinerary found / Total waitlisted direct-rail queries) * 100

Outputs:
- evaluation/results/routing_evaluation.json
- evaluation/results/routing_results.csv
- evaluation/results/routing_evaluation_report.txt
"""

import sys
import os
import json
import time
import random
import pandas as pd
from typing import Dict, Any, List

sys.path.insert(0, os.path.abspath("backend"))

from app.mcraptor_data import build_mcraptor_timetable, McRaptorTimetable
from app.mcraptor_city_engine import run_mcraptor_city_search


# Curated representative origin-destination pairs across diverse transit corridors
BENCHMARK_CITY_PAIRS = [
    # Trunk Corridors
    ("Vijayawada", "Visakhapatnam"),
    ("Hyderabad", "Visakhapatnam"),
    ("Visakhapatnam", "Bengaluru"),
    ("Vijayawada", "Sambalpur"),
    ("Hyderabad", "Bengaluru"),
    ("Bengaluru", "Chennai"),
    ("Howrah", "Visakhapatnam"),
    ("Kolkata", "Bhubaneswar"),
    ("Vijayawada", "Chennai"),
    ("Hyderabad", "Tirupati"),
    ("Bhubaneswar", "Sambalpur"),
    ("Cuttack", "Visakhapatnam"),
    ("Guntur", "Visakhapatnam"),
    ("Vijayawada", "Tirupati"),
    ("Visakhapatnam", "Kolkata"),
    ("Nellore", "Hyderabad"),
    ("Jharsuguda", "Bhubaneswar"),
    ("Sambalpur", "Howrah"),
    ("Tirupati", "Bengaluru"),
    ("Hyderabad", "Vijayawada"),
    # Regional & Secondary Connections
    ("Guntur", "Bengaluru"),
    ("Nellore", "Visakhapatnam"),
    ("Cuttack", "Sambalpur"),
    ("Jharsuguda", "Visakhapatnam"),
    ("Srikakulam", "Hyderabad"),
    ("Anakapalle", "Bengaluru"),
    ("Eluru", "Visakhapatnam"),
    ("Rajahmundry", "Bengaluru"),
    ("Samalkot", "Hyderabad"),
    ("Bhimavaram", "Visakhapatnam"),
    ("Khammam", "Visakhapatnam"),
    ("Warangal", "Visakhapatnam"),
    ("Kazipet", "Bengaluru"),
    ("Ongole", "Hyderabad"),
    ("Chirala", "Visakhapatnam"),
    ("Tenali", "Visakhapatnam"),
    ("Duvvada", "Hyderabad"),
    ("Simhachalam", "Bengaluru"),
    ("Secunderabad", "Visakhapatnam"),
    ("Bhubaneswar", "Hyderabad")
]


def generate_extended_query_pairs(timetable: McRaptorTimetable, target_count: int = 150) -> List[tuple]:
    """Generates a reproducible set of valid origin-destination city pairs."""
    random.seed(42)
    # Filter cities with at least one railway or bus stop
    active_cities = [c.title() for c, stops in timetable.city_stops.items() if len(stops) >= 1 and len(c) > 3]
    active_cities = list(set(active_cities))
    
    pairs = list(BENCHMARK_CITY_PAIRS)
    attempts = 0
    while len(pairs) < target_count and attempts < 1000:
        attempts += 1
        src = random.choice(active_cities)
        dst = random.choice(active_cities)
        if src != dst and (src, dst) not in pairs:
            pairs.append((src, dst))
            
    return pairs[:target_count]


def run_routing_evaluation(db_path: str = "backend/app/final.db",
                           output_dir: str = "evaluation/results",
                           query_limit: int = 100) -> Dict[str, Any]:
    print("=" * 70)
    print("CONNEXLINK McRAPTOR ROUTING EVALUATION & METRIC VERIFICATION")
    print("=" * 70)

    os.makedirs(output_dir, exist_ok=True)
    logs = []
    def log(msg: str):
        print(msg)
        logs.append(msg)

    log("\n[1/4] Pre-loading Timetable into RAM...")
    t0 = time.perf_counter()
    timetable = build_mcraptor_timetable(db_path)
    load_time_sec = time.perf_counter() - t0
    log(f"  Timetable loaded in {load_time_sec:.3f} seconds.")
    log(f"  Stops: {len(timetable.stops)} | Routes: {len(timetable.routes)} | Trips: {len(timetable.trips)} | Seats: {len(timetable.seat_map)}")

    test_pairs = generate_extended_query_pairs(timetable, target_count=query_limit)
    log(f"\n[2/4] Executing McRAPTOR over {len(test_pairs)} Origin-Destination Queries...")

    travel_date = "2026-08-01"
    travel_class = "3A"

    query_records = []
    successful_queries = 0
    failed_queries = 0
    total_itineraries = 0

    queries_with_confirmed = 0
    waitlist_escape_eligible = 0
    waitlist_escaped = 0

    all_durations = []
    all_distances = []
    all_prices = []
    all_transfers = []
    itineraries_per_query = []

    confirmed_itineraries = 0
    rac_itineraries = 0
    wl_itineraries = 0
    unknown_itineraries = 0

    for idx, (src_city, dst_city) in enumerate(test_pairs):
        q_start = time.perf_counter()
        routes = run_mcraptor_city_search(
            timetable=timetable,
            source_city=src_city,
            dest_city=dst_city,
            travel_date_str=travel_date,
            travel_class=travel_class,
            top_k=15
        )
        q_elapsed_ms = (time.perf_counter() - q_start) * 1000.0

        is_success = len(routes) > 0
        if is_success:
            successful_queries += 1
            itineraries_per_query.append(len(routes))
        else:
            failed_queries += 1
            itineraries_per_query.append(0)

        # Examine itineraries for confirmed berths and waitlist escape
        has_fully_confirmed = False
        direct_rail_status = None
        has_confirmed_alternative = False

        for r in routes:
            total_itineraries += 1
            legs = r.get("legs", [])
            transit_legs = [l for l in legs if l.get("mode") in ["RAIL", "BUS"]]
            num_transfers = max(0, len(transit_legs) - 1)
            all_transfers.append(num_transfers)

            dur = r.get("total_duration_mins", 0)
            dist = r.get("total_distance_km", 0.0)
            price = r.get("total_price_inr", 0)
            status = r.get("overall_status", "UNKNOWN")

            if dur: all_durations.append(dur)
            if dist: all_distances.append(dist)
            if price: all_prices.append(price)

            # Strict booking verification: Every transit leg must be AVAILABLE
            is_leg_confirmed = all(l.get("seat_status") == "AVAILABLE" for l in transit_legs)
            if is_leg_confirmed and status == "AVAILABLE":
                confirmed_itineraries += 1
                has_fully_confirmed = True
            elif status == "RAC":
                rac_itineraries += 1
            elif status == "WL":
                wl_itineraries += 1
            else:
                unknown_itineraries += 1

            # Check direct rail vs alternative
            is_direct_rail = (len(transit_legs) == 1 and transit_legs[0].get("mode") == "RAIL")
            if is_direct_rail and direct_rail_status is None:
                direct_rail_status = transit_legs[0].get("seat_status")

            if not is_direct_rail and is_leg_confirmed:
                has_confirmed_alternative = True

        if has_fully_confirmed:
            queries_with_confirmed += 1

        # Waitlist Escape calculation:
        # Eligible if direct rail exists and is Waitlisted (or RAC)
        if direct_rail_status in ["WL", "RAC"]:
            waitlist_escape_eligible += 1
            if has_confirmed_alternative:
                waitlist_escaped += 1

        query_records.append({
            "query_idx": idx + 1,
            "source_city": src_city,
            "dest_city": dst_city,
            "routes_found": len(routes),
            "latency_ms": round(q_elapsed_ms, 2),
            "has_fully_confirmed": has_fully_confirmed,
            "direct_rail_status": direct_rail_status or "NO_DIRECT_RAIL",
            "escaped_waitlist": (direct_rail_status in ["WL", "RAC"] and has_confirmed_alternative)
        })

    # Calculations
    total_valid_queries = len(test_pairs)
    discovery_rate = (successful_queries / total_valid_queries) * 100.0
    confirmed_rate = (queries_with_confirmed / total_valid_queries) * 100.0
    escape_rate = (waitlist_escaped / waitlist_escape_eligible * 100.0) if waitlist_escape_eligible > 0 else 0.0

    avg_itineraries = (total_itineraries / successful_queries) if successful_queries > 0 else 0.0
    avg_transfers = (sum(all_transfers) / len(all_transfers)) if all_transfers else 0.0
    avg_duration = (sum(all_durations) / len(all_durations)) if all_durations else 0.0
    avg_distance = (sum(all_distances) / len(all_distances)) if all_distances else 0.0
    avg_price = (sum(all_prices) / len(all_prices)) if all_prices else 0.0

    log(f"\n[3/4] Routing Metrics Calculation:")
    log(f"  Total Evaluated Queries:         {total_valid_queries}")
    log(f"  Successful Queries:              {successful_queries}")
    log(f"  Failed Queries:                  {failed_queries}")
    log(f"  Route Discovery Success Rate:    {discovery_rate:.2f}% ({successful_queries}/{total_valid_queries})")
    log(f"  Confirmed Journey Rate:          {confirmed_rate:.2f}% ({queries_with_confirmed}/{total_valid_queries})")
    log(f"  Waitlist Escape Rate:            {escape_rate:.2f}% ({waitlist_escaped}/{waitlist_escape_eligible})")
    log(f"  Total Itineraries Returned:      {total_itineraries}")
    log(f"  Average Itineraries / Query:     {avg_itineraries:.2f}")
    log(f"  Average Transfers / Journey:     {avg_transfers:.2f}")
    log(f"  Average Journey Duration:        {avg_duration:.1f} mins ({avg_duration / 60.0:.1f} hours)")
    log(f"  Average Journey Distance:        {avg_distance:.1f} km")
    log(f"  Average Journey Fare:            {avg_price:.1f} INR")

    log(f"\n[4/4] Booking Certainty Breakdown Across All Discovered Itineraries ({total_itineraries}):")
    log(f"  Fully Confirmed (AVAILABLE):     {confirmed_itineraries} ({confirmed_itineraries / max(1, total_itineraries) * 100:.1f}%)")
    log(f"  Reservation Against Cancellation:{rac_itineraries} ({rac_itineraries / max(1, total_itineraries) * 100:.1f}%)")
    log(f"  Waiting List (WL):               {wl_itineraries} ({wl_itineraries / max(1, total_itineraries) * 100:.1f}%)")
    log(f"  Unknown Availability:            {unknown_itineraries}")

    results_summary = {
        "evaluation_parameters": {
            "total_queries_tested": total_valid_queries,
            "travel_date": travel_date,
            "travel_class": travel_class,
            "timetable_load_time_sec": round(load_time_sec, 3)
        },
        "formal_metrics": {
            "route_discovery_success_rate": {
                "percentage": round(discovery_rate, 2),
                "numerator": successful_queries,
                "denominator": total_valid_queries,
                "manuscript_claim": "96.0%"
            },
            "confirmed_journey_rate": {
                "percentage": round(confirmed_rate, 2),
                "numerator": queries_with_confirmed,
                "denominator": total_valid_queries
            },
            "waitlist_escape_rate": {
                "percentage": round(escape_rate, 2),
                "numerator": waitlist_escaped,
                "denominator": waitlist_escape_eligible,
                "manuscript_claim": "84.3%"
            }
        },
        "quality_metrics": {
            "average_itineraries_per_query": round(avg_itineraries, 2),
            "average_transfers_per_journey": round(avg_transfers, 2),
            "average_duration_mins": round(avg_duration, 1),
            "average_distance_km": round(avg_distance, 1),
            "average_fare_inr": round(avg_price, 1)
        },
        "booking_certainty_distribution": {
            "total_itineraries": total_itineraries,
            "confirmed_count": confirmed_itineraries,
            "rac_count": rac_itineraries,
            "waitlist_count": wl_itineraries,
            "unknown_count": unknown_itineraries
        }
    }

    # Save JSON
    json_path = os.path.join(output_dir, "routing_evaluation.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results_summary, f, indent=2)
    log(f"\n[OK] Saved {json_path}")

    # Save CSV
    csv_path = os.path.join(output_dir, "routing_results.csv")
    df_queries = pd.DataFrame(query_records)
    df_queries.to_csv(csv_path, index=False)
    log(f"[OK] Saved {csv_path}")

    # Save TXT
    txt_path = os.path.join(output_dir, "routing_evaluation_report.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("CONNEXLINK McRAPTOR ROUTING EVALUATION REPORT\n")
        f.write("=" * 60 + "\n\n")
        f.write("\n".join(logs))
    log(f"[OK] Saved {txt_path}")
    log("=" * 70)

    return results_summary


if __name__ == "__main__":
    run_routing_evaluation(query_limit=100)

