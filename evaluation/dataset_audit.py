"""
evaluation/dataset_audit.py
---------------------------
Exhaustive Dataset Audit and Verification Script for ConnexLink.
Verifies all reported dataset claims against the actual database and CSV files:
- 15,420 transit stops (Manuscript claim)
- 42,180 active trips (Manuscript claim)
- 280,000+ stop-times (Manuscript claim)
- 12,500 train review records (Manuscript claim)

Outputs:
- evaluation/results/dataset_audit.json
- evaluation/results/dataset_audit.csv
- evaluation/results/dataset_audit.txt
"""

import os
import sys
import json
import sqlite3
import pandas as pd
from typing import Dict, Any


def run_dataset_audit(db_path: str = "backend/app/final.db",
                      reviews_train_path: str = "rec_backend/reviews_train.csv",
                      reviews_bus_path: str = "rec_backend/bus_reviews.csv",
                      output_dir: str = "evaluation/results") -> Dict[str, Any]:
    print("=" * 70)
    print("CONNEXLINK DATASET AUDIT & REPRODUCIBILITY VERIFICATION")
    print("=" * 70)

    os.makedirs(output_dir, exist_ok=True)
    results: Dict[str, Any] = {}

    # Check existence
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database not found at {db_path}")

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # 1. Stops & Stations
    c.execute("SELECT count(*) FROM stops")
    total_stops = c.fetchone()[0]

    c.execute("SELECT count(DISTINCT stop_id) FROM stops")
    unique_stops = c.fetchone()[0]

    c.execute("SELECT mode, count(*) FROM stops GROUP BY mode")
    stops_by_mode = dict(c.fetchall())

    c.execute("SELECT count(*) FROM stations")
    rail_stations_count = c.fetchone()[0]

    c.execute("SELECT count(*) FROM bus_stops")
    bus_stops_count = c.fetchone()[0]

    # Data Quality: Missing Coordinates
    c.execute("""
        SELECT count(*) FROM stops 
        WHERE latitude IS NULL OR longitude IS NULL OR (latitude = 0.0 AND longitude = 0.0)
    """)
    stops_missing_coords = c.fetchone()[0]

    # 2. Routes
    c.execute("SELECT count(*) FROM routes")
    total_routes = c.fetchone()[0]

    c.execute("SELECT mode, count(*) FROM routes GROUP BY mode")
    routes_by_mode = dict(c.fetchall())

    # 3. Trips
    c.execute("SELECT count(*) FROM trips")
    total_trips = c.fetchone()[0]

    c.execute("SELECT count(DISTINCT trip_id) FROM trips")
    unique_trips = c.fetchone()[0]

    c.execute("SELECT mode, count(*) FROM trips GROUP BY mode")
    trips_by_mode = dict(c.fetchall())

    c.execute("SELECT count(*) FROM trains")
    trains_count = c.fetchone()[0]

    c.execute("SELECT count(*) FROM buses")
    buses_count = c.fetchone()[0]

    # 4. Stop Times
    c.execute("SELECT count(*) FROM stop_times")
    total_stop_times = c.fetchone()[0]

    c.execute("SELECT count(*) FROM train_stops")
    train_stops_count = c.fetchone()[0]

    c.execute("SELECT count(*) FROM bus_route_stops")
    bus_route_stops_count = c.fetchone()[0]

    c.execute("""
        SELECT count(*) FROM stop_times 
        WHERE arrival_sec IS NULL OR departure_sec IS NULL
    """)
    missing_times = c.fetchone()[0]

    c.execute("""
        SELECT count(*) FROM stop_times 
        WHERE trip_id NOT IN (SELECT trip_id FROM trips)
    """)
    invalid_trip_refs = c.fetchone()[0]

    c.execute("""
        SELECT count(*) FROM stop_times 
        WHERE stop_id NOT IN (SELECT stop_id FROM stops)
    """)
    invalid_stop_refs = c.fetchone()[0]

    # Duplicate check on (trip_id, stop_sequence)
    c.execute("""
        SELECT count(*) FROM (
            SELECT trip_id, stop_sequence, count(*) as cnt 
            FROM stop_times 
            GROUP BY trip_id, stop_sequence 
            HAVING cnt > 1
        )
    """)
    duplicate_stop_times = c.fetchone()[0]

    # 5. Transfers / Footpaths
    c.execute("SELECT count(*) FROM transfers")
    total_transfers = c.fetchone()[0]

    c.execute("SELECT transfer_mode, count(*) FROM transfers GROUP BY transfer_mode")
    transfers_by_mode = dict(c.fetchall())

    # 6. Seat Availability
    c.execute("SELECT count(*) FROM seat_availability")
    total_seat_records = c.fetchone()[0]

    c.execute("SELECT availability_status, count(*) FROM seat_availability GROUP BY availability_status")
    seat_status_dist = dict(c.fetchall())

    c.execute("SELECT count(DISTINCT train_number) FROM seat_availability")
    trains_with_seats = c.fetchone()[0]

    c.execute("SELECT count(DISTINCT travel_date) FROM seat_availability")
    seat_dates_count = c.fetchone()[0]

    c.execute("SELECT count(*) FROM bus_fares")
    total_bus_fares = c.fetchone()[0]

    conn.close()

    # 7. Review Datasets (NLP)
    reviews_train_count = 0
    reviews_bus_count = 0
    train_review_columns = []
    bus_review_columns = []

    if os.path.exists(reviews_train_path):
        df_train = pd.read_csv(reviews_train_path)
        reviews_train_count = len(df_train)
        train_review_columns = list(df_train.columns)
    
    if os.path.exists(reviews_bus_path):
        df_bus = pd.read_csv(reviews_bus_path)
        reviews_bus_count = len(df_bus)
        bus_review_columns = list(df_bus.columns)

    total_reviews = reviews_train_count + reviews_bus_count

    # 8. Genuine vs Synthetic Categorization
    # Trains and Stations are scraped from official IRCTC / Indian Railway open timetables.
    # Buses and Bus Routes are generated from simulated_bus_routes_1000.csv.
    # Seat availability is synthetic / simulated across dates in August 2026.
    genuine_stops = stops_by_mode.get("RAIL", 0)
    synthetic_stops = stops_by_mode.get("BUS", 0)

    genuine_trips = trips_by_mode.get("RAIL", 0)
    synthetic_trips = trips_by_mode.get("BUS", 0)

    results = {
        "manuscript_claims": {
            "reported_transit_stops": 15420,
            "reported_active_trips": 42180,
            "reported_stop_times": 280000,
            "reported_train_reviews": 12500
        },
        "actual_database_measurements": {
            "total_stops": total_stops,
            "unique_stops": unique_stops,
            "rail_stops": stops_by_mode.get("RAIL", 0),
            "bus_stops": stops_by_mode.get("BUS", 0),
            "stops_missing_coordinates": stops_missing_coords,
            "total_routes": total_routes,
            "rail_routes": routes_by_mode.get("RAIL", 0),
            "bus_routes": routes_by_mode.get("BUS", 0),
            "total_trips": total_trips,
            "unique_trips": unique_trips,
            "rail_trips": trips_by_mode.get("RAIL", 0),
            "bus_trips": trips_by_mode.get("BUS", 0),
            "total_stop_times": total_stop_times,
            "train_stops_count": train_stops_count,
            "bus_route_stops_count": bus_route_stops_count,
            "missing_time_records": missing_times,
            "invalid_trip_references": invalid_trip_refs,
            "invalid_stop_references": invalid_stop_refs,
            "duplicate_stop_time_sequences": duplicate_stop_times,
            "total_transfers": total_transfers,
            "transfers_by_mode": transfers_by_mode,
            "total_seat_availability_records": total_seat_records,
            "seat_status_distribution": seat_status_dist,
            "trains_with_seat_records": trains_with_seats,
            "distinct_travel_dates": seat_dates_count,
            "total_bus_fares": total_bus_fares,
            "train_reviews_count": reviews_train_count,
            "bus_reviews_count": reviews_bus_count,
            "total_reviews": total_reviews
        },
        "genuine_vs_synthetic": {
            "genuine_rail_stops": genuine_stops,
            "synthetic_bus_stops": synthetic_stops,
            "genuine_rail_trips": genuine_trips,
            "synthetic_bus_trips": synthetic_trips,
            "seat_availability_type": "Synthetic / Simulated Monte Carlo (Aug 2026)",
            "bus_routes_type": "Simulated Regional Network (simulated_bus_routes_1000.csv)"
        },
        "verification_discrepancies": {
            "stops_discrepancy": {
                "manuscript": 15420,
                "actual": total_stops,
                "difference": total_stops - 15420,
                "verified": total_stops == 15420
            },
            "trips_discrepancy": {
                "manuscript": 42180,
                "actual": total_trips,
                "difference": total_trips - 42180,
                "verified": total_trips == 42180
            },
            "stop_times_discrepancy": {
                "manuscript": 280000,
                "actual": total_stop_times,
                "difference": total_stop_times - 280000,
                "verified": total_stop_times >= 280000
            },
            "train_reviews_discrepancy": {
                "manuscript": 12500,
                "actual": reviews_train_count,
                "difference": reviews_train_count - 12500,
                "verified": reviews_train_count == 12500
            }
        }
    }

    # Save JSON
    json_path = os.path.join(output_dir, "dataset_audit.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"[OK] Saved {json_path}")

    # Save CSV
    csv_rows = [
        {"entity": "Transit Stops", "manuscript_value": 15420, "actual_value": total_stops, "verified": total_stops == 15420, "notes": f"Rail: {stops_by_mode.get('RAIL', 0)}, Bus: {stops_by_mode.get('BUS', 0)}"},
        {"entity": "Active Trips", "manuscript_value": 42180, "actual_value": total_trips, "verified": total_trips == 42180, "notes": f"Rail: {trips_by_mode.get('RAIL', 0)}, Bus: {trips_by_mode.get('BUS', 0)}"},
        {"entity": "Stop-Time Entries", "manuscript_value": "280000+", "actual_value": total_stop_times, "verified": total_stop_times >= 280000, "notes": f"Rail stops: {train_stops_count}, Bus stops: {bus_route_stops_count}"},
        {"entity": "Train Reviews", "manuscript_value": 12500, "actual_value": reviews_train_count, "verified": reviews_train_count == 12500, "notes": f"reddit reviews_train.csv ({reviews_train_count})"},
        {"entity": "Seat Availability Records", "manuscript_value": "N/A", "actual_value": total_seat_records, "verified": True, "notes": f"Available: {seat_status_dist.get('AVAILABLE', 0)}, WL: {seat_status_dist.get('WL', 0)}, RAC: {seat_status_dist.get('RAC', 0)}"},
        {"entity": "Footpaths / Transfers", "manuscript_value": "N/A", "actual_value": total_transfers, "verified": True, "notes": f"WALK connections <= 3.0km"}
    ]
    df_audit = pd.DataFrame(csv_rows)
    csv_path = os.path.join(output_dir, "dataset_audit.csv")
    df_audit.to_csv(csv_path, index=False)
    print(f"[OK] Saved {csv_path}")

    # Save TXT Report
    txt_path = os.path.join(output_dir, "dataset_audit.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("CONNEXLINK DATASET AUDIT REPORT\n")
        f.write("=" * 60 + "\n\n")
        f.write("1. MANUSCRIPT CLAIM VS ACTUAL DATABASE MEASUREMENT\n")
        f.write("-" * 60 + "\n")
        f.write(f"Stops:         Claimed = 15,420     | Actual = {total_stops:6d}  [UNVERIFIED - DISCREPANCY: {total_stops - 15420}]\n")
        f.write(f"Trips:         Claimed = 42,180     | Actual = {total_trips:6d}  [UNVERIFIED - DISCREPANCY: {total_trips - 42180}]\n")
        f.write(f"Stop-Times:    Claimed = 280,000+   | Actual = {total_stop_times:6d}  [UNVERIFIED - DISCREPANCY: {total_stop_times - 280000}]\n")
        f.write(f"Train Reviews: Claimed = 12,500     | Actual = {reviews_train_count:6d}  [UNVERIFIED - DISCREPANCY: {reviews_train_count - 12500}]\n\n")
        
        f.write("2. COMPONENT BREAKDOWN\n")
        f.write("-" * 60 + "\n")
        f.write(f"Railway Stations:     {stops_by_mode.get('RAIL', 0):6d}\n")
        f.write(f"Bus Stops:            {stops_by_mode.get('BUS', 0):6d}\n")
        f.write(f"Total Unique Stops:   {unique_stops:6d}\n")
        f.write(f"Missing Coordinates:  {stops_missing_coords:6d}\n\n")
        
        f.write(f"Train Services:       {trips_by_mode.get('RAIL', 0):6d}\n")
        f.write(f"Bus Services:         {trips_by_mode.get('BUS', 0):6d}\n")
        f.write(f"Total Unique Trips:   {unique_trips:6d}\n\n")
        
        f.write(f"Stop Time Records:    {total_stop_times:6d}\n")
        f.write(f"  - Train Stops:      {train_stops_count:6d}\n")
        f.write(f"  - Bus Stops:        {bus_route_stops_count:6d}\n")
        f.write(f"Invalid Trip Refs:    {invalid_trip_refs:6d}\n")
        f.write(f"Invalid Stop Refs:    {invalid_stop_refs:6d}\n")
        f.write(f"Duplicate Sequences:  {duplicate_stop_times:6d}\n\n")
        
        f.write("3. SEAT AVAILABILITY DISTRIBUTION (seat_availability)\n")
        f.write("-" * 60 + "\n")
        for status, cnt in seat_status_dist.items():
            pct = (cnt / total_seat_records) * 100
            f.write(f"  {status:12s}: {cnt:7d} ({pct:5.2f}%)\n")
        f.write(f"Total Seat Records: {total_seat_records:7d}\n\n")

        f.write("4. GENUINE VS SYNTHETIC AUDIT\n")
        f.write("-" * 60 + "\n")
        f.write(f"Genuine Rail Network:  {genuine_stops} stations, {genuine_trips} train trips (scraped open IR timetables)\n")
        f.write(f"Synthetic Bus Network: {synthetic_stops} bus stands, {synthetic_trips} bus trips (from simulated_bus_routes_1000.csv)\n")
        f.write(f"Seat Availability:     Simulated status generator across August 2026 dates\n")
        f.write(f"Reviews Corpus:        {reviews_train_count} train reviews (Reddit) + {reviews_bus_count} bus reviews\n")

    print(f"[OK] Saved {txt_path}")
    print("=" * 70)
    return results


if __name__ == "__main__":
    run_dataset_audit()

