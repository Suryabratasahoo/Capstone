# /app/mcraptor/seed_mcraptor_db.py

import sqlite3
import random
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "mcraptor_railway_database.db")

CLASSES = ["SL", "3A", "2A"]
PRICE_PER_KM = {"SL": 0.75, "3A": 1.85, "2A": 2.65}
MIN_BASE_PRICE = {"SL": 150, "3A": 500, "2A": 750}


def create_schema(cursor):
    """Creates the seat_availability table if it doesn't exist."""
    cursor.execute("DROP TABLE IF EXISTS seat_availability;")
    cursor.execute("""
        CREATE TABLE seat_availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            train_number INTEGER,
            travel_date TEXT,
            from_station_code TEXT,
            to_station_code TEXT,
            class_code TEXT,
            availability_status TEXT,
            available_seats INTEGER,
            wl_number INTEGER,
            price_inr INTEGER,
            FOREIGN KEY (train_number) REFERENCES trains (train_number)
        );
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_seat_lookup 
        ON seat_availability (train_number, travel_date, class_code);
    """)


def generate_status():
    """Generates weighted ticket availability status (50% AVAILABLE, 35% WL, 15% RAC)."""
    rand = random.random()
    if rand < 0.50:
        return "AVAILABLE", random.randint(5, 90), 0
    elif rand < 0.85:
        return "WL", 0, random.randint(1, 60)
    else:
        return "RAC", 0, random.randint(1, 20)


def calculate_price(distance_km, class_code):
    """Calculates ticket fare based on travel distance and class rate."""
    dist = max(distance_km, 50)
    calc_price = int(dist * PRICE_PER_KM[class_code])
    return max(calc_price, MIN_BASE_PRICE[class_code])


def seed_database():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Target DB file not found at: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("[+] Creating seat_availability table and indexes...")
    create_schema(cursor)

    # Get distinct train numbers and their stops/distances
    cursor.execute("""
        SELECT train_number, station_code, stop_sequence, distance_km 
        FROM train_stops 
        ORDER BY train_number, stop_sequence
    """)
    stops_raw = cursor.fetchall()

    # Group stops by train
    train_stops_map = {}
    for t_num, stn, seq, dist in stops_raw:
        if t_num not in train_stops_map:
            train_stops_map[t_num] = []
        train_stops_map[t_num].append((stn, dist))

    # Generate 60 days starting from today (2026-08-01)
    today = datetime.strptime("2026-08-01", "%Y-%m-%d")
    date_list = [(today + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(60)]

    records_to_insert = []
    print(f"[+] Generating 60-day availability data for {len(train_stops_map)} trains...")

    for t_num, stops in train_stops_map.items():
        if len(stops) < 2:
            continue

        source_stn, _ = stops[0]
        dest_stn, total_dist = stops[-1]

        # Key segments to seed: Full Route + Intermediate Major Segments
        segments_to_seed = [(source_stn, dest_stn, total_dist)]

        # Sample up to 3 intermediate pairs if train has many stops
        if len(stops) > 4:
            mid_idx = len(stops) // 2
            segments_to_seed.append((source_stn, stops[mid_idx][0], stops[mid_idx][1]))
            segments_to_seed.append((stops[mid_idx][0], dest_stn, total_dist - stops[mid_idx][1]))

        for date_str in date_list:
            for from_code, to_code, seg_dist in segments_to_seed:
                for cls in CLASSES:
                    status, avail_seats, wl_num = generate_status()
                    price = calculate_price(seg_dist, cls)

                    records_to_insert.append((
                        t_num, date_str, from_code, to_code, cls,
                        status, avail_seats, wl_num, price
                    ))

    print(f"[+] Inserting {len(records_to_insert)} availability records into DB...")
    cursor.executemany("""
        INSERT INTO seat_availability 
        (train_number, travel_date, from_station_code, to_station_code, class_code, availability_status, available_seats, wl_number, price_inr)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, records_to_insert)

    conn.commit()
    conn.close()
    print("[+] Seeding Complete! Database is ready for McRAPTOR.")


if __name__ == "__main__":
    seed_database()