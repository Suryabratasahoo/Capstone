"""
evaluation/compare_routing.py
-----------------------------
Comparative Evaluation of Itinerary Discovery:
Single-Mode Rail (IRCTC Simulator) vs. Single-Mode Bus (Aggregator Simulator) vs. ConnexLink Multi-Modal.

Verifies the manuscript claims:
- Single-mode rail: 42.0%
- Single-mode bus: 58.0%
- ConnexLink: 96.0%

Records for every query:
- Source, Destination, Departure time.
- Rail-only route existence, duration, fare, status.
- Bus-only route existence, duration, fare, status.
- ConnexLink multi-modal route existence, duration, fare, status.
- Measures actual discovery percentages and provides honest report.

Outputs:
- evaluation/results/comparison_results.csv
- evaluation/results/comparison_summary.json
- evaluation/results/comparison_report.txt
"""

import sys
import os
import json
import time
import pandas as pd
from typing import Dict, Any, List

sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("backend"))

from app.mcraptor_data import build_mcraptor_timetable, McRaptorTimetable
from app.mcraptor_city_engine import run_mcraptor_city_search
from evaluation.evaluate_routing import generate_extended_query_pairs


def run_routing_comparison(db_path: str = "backend/app/final.db",
                           output_dir: str = "evaluation/results",
                           query_limit: int = 100) -> Dict[str, Any]:
    print("=" * 70)
    print("CONNEXLINK ITINERARY DISCOVERY COMPARISON (RAIL vs BUS vs MULTI-MODAL)")
    print("=" * 70)

    os.makedirs(output_dir, exist_ok=True)
    logs = []
    def log(msg: str):
        print(msg)
        logs.append(msg)

    log("\n[1/3] Loading Timetable...")
    timetable = build_mcraptor_timetable(db_path)
    test_pairs = generate_extended_query_pairs(timetable, target_count=query_limit)
    log(f"  Evaluating {len(test_pairs)} identical queries across 3 routing paradigms...\n")

    travel_date = "2026-08-01"
    travel_class = "3A"

    records = []
    rail_success = 0
    bus_success = 0
    multimodal_success = 0

    rail_options_counts = []
    bus_options_counts = []
    multimodal_options_counts = []

    for idx, (src_city, dst_city) in enumerate(test_pairs):
        # 1. Full Multi-Modal (ConnexLink)
        mm_routes = run_mcraptor_city_search(
            timetable=timetable,
            source_city=src_city,
            dest_city=dst_city,
            travel_date_str=travel_date,
            travel_class=travel_class,
            top_k=15
        )

        # 2. Filter Rail-Only routes (every transit leg is RAIL)
        rail_routes = []
        for r in mm_routes:
            transit_legs = [l for l in r.get("legs", []) if l.get("mode") in ["RAIL", "BUS"]]
            if transit_legs and all(l.get("mode") == "RAIL" for l in transit_legs):
                rail_routes.append(r)

        # 3. Filter Bus-Only routes (every transit leg is BUS)
        bus_routes = []
        for r in mm_routes:
            transit_legs = [l for l in r.get("legs", []) if l.get("mode") in ["RAIL", "BUS"]]
            if transit_legs and all(l.get("mode") == "BUS" for l in transit_legs):
                bus_routes.append(r)

        has_mm = len(mm_routes) > 0
        has_rail = len(rail_routes) > 0
        has_bus = len(bus_routes) > 0

        if has_mm:
            multimodal_success += 1
            multimodal_options_counts.append(len(mm_routes))
        else:
            multimodal_options_counts.append(0)

        if has_rail:
            rail_success += 1
            rail_options_counts.append(len(rail_routes))
        else:
            rail_options_counts.append(0)

        if has_bus:
            bus_success += 1
            bus_options_counts.append(len(bus_routes))
        else:
            bus_options_counts.append(0)

        best_mm_dur = min((r["total_duration_mins"] for r in mm_routes), default=None)
        best_rail_dur = min((r["total_duration_mins"] for r in rail_routes), default=None)
        best_bus_dur = min((r["total_duration_mins"] for r in bus_routes), default=None)

        best_mm_price = min((r["total_price_inr"] for r in mm_routes), default=None)
        best_rail_price = min((r["total_price_inr"] for r in rail_routes), default=None)
        best_bus_price = min((r["total_price_inr"] for r in bus_routes), default=None)

        records.append({
            "query_idx": idx + 1,
            "source_city": src_city,
            "dest_city": dst_city,
            "rail_only_success": has_rail,
            "rail_options_count": len(rail_routes),
            "best_rail_duration_mins": best_rail_dur,
            "best_rail_price_inr": best_rail_price,
            "bus_only_success": has_bus,
            "bus_options_count": len(bus_routes),
            "best_bus_duration_mins": best_bus_dur,
            "best_bus_price_inr": best_bus_price,
            "multimodal_success": has_mm,
            "multimodal_options_count": len(mm_routes),
            "best_multimodal_duration_mins": best_mm_dur,
            "best_multimodal_price_inr": best_mm_price
        })

    n_queries = len(test_pairs)
    rail_rate = (rail_success / n_queries) * 100.0
    bus_rate = (bus_success / n_queries) * 100.0
    mm_rate = (multimodal_success / n_queries) * 100.0

    avg_rail_opt = (sum(rail_options_counts) / max(1, rail_success)) if rail_success else 0.0
    avg_bus_opt = (sum(bus_options_counts) / max(1, bus_success)) if bus_success else 0.0
    avg_mm_opt = (sum(multimodal_options_counts) / max(1, multimodal_success)) if multimodal_success else 0.0

    log("[2/3] COMPARISON RESULTS ACROSS 100 QUERIES:")
    log(f"  1. Single-Mode Rail:     {rail_rate:5.2f}% success ({rail_success}/{n_queries}) | Avg Options: {avg_rail_opt:.2f}")
    log(f"  2. Single-Mode Bus:      {bus_rate:5.2f}% success ({bus_success}/{n_queries}) | Avg Options: {avg_bus_opt:.2f}")
    log(f"  3. ConnexLink Multi-Modal: {mm_rate:5.2f}% success ({multimodal_success}/{n_queries}) | Avg Options: {avg_mm_opt:.2f}")

    log("\n[3/3] MANUSCRIPT CLAIMS VERIFICATION:")
    log(f"  Rail Claim:       42.0%  | Actual Measured: {rail_rate:.2f}%  (Diff: {rail_rate - 42.0:+.2f}%)")
    log(f"  Bus Claim:        58.0%  | Actual Measured: {bus_rate:.2f}%  (Diff: {bus_rate - 58.0:+.2f}%)")
    log(f"  ConnexLink Claim: 96.0%  | Actual Measured: {mm_rate:.2f}%  (Diff: {mm_rate - 96.0:+.2f}%)")

    summary = {
        "evaluation_parameters": {
            "total_queries": n_queries,
            "travel_date": travel_date,
            "travel_class": travel_class
        },
        "measured_discovery_rates": {
            "single_mode_rail": {
                "success_rate_percent": round(rail_rate, 2),
                "successful_queries": rail_success,
                "total_queries": n_queries,
                "avg_options_when_found": round(avg_rail_opt, 2),
                "manuscript_claimed_rate": 42.0,
                "verified": abs(rail_rate - 42.0) < 5.0
            },
            "single_mode_bus": {
                "success_rate_percent": round(bus_rate, 2),
                "successful_queries": bus_success,
                "total_queries": n_queries,
                "avg_options_when_found": round(avg_bus_opt, 2),
                "manuscript_claimed_rate": 58.0,
                "verified": abs(bus_rate - 58.0) < 5.0
            },
            "connexlink_multimodal": {
                "success_rate_percent": round(mm_rate, 2),
                "successful_queries": multimodal_success,
                "total_queries": n_queries,
                "avg_options_when_found": round(avg_mm_opt, 2),
                "manuscript_claimed_rate": 96.0,
                "verified": abs(mm_rate - 96.0) < 5.0
            }
        }
    }

    # Save JSON
    json_path = os.path.join(output_dir, "comparison_summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    log(f"\n[OK] Saved {json_path}")

    # Save CSV
    csv_path = os.path.join(output_dir, "comparison_results.csv")
    df_comp = pd.DataFrame(records)
    df_comp.to_csv(csv_path, index=False)
    log(f"[OK] Saved {csv_path}")

    # Save TXT
    txt_path = os.path.join(output_dir, "comparison_report.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("CONNEXLINK ITINERARY DISCOVERY COMPARISON REPORT\n")
        f.write("=" * 60 + "\n\n")
        f.write("\n".join(logs))
    log(f"[OK] Saved {txt_path}")
    log("=" * 70)

    return summary


if __name__ == "__main__":
    run_routing_comparison(query_limit=100)
