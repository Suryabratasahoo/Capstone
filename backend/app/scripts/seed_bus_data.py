# /backend/app/scripts/seed_bus_data.py

import os
import sqlite3
import pandas as pd
from math import radians, cos, sin, asin, sqrt

# Absolute Path Resolution relative to this script location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "mcraptor_railway_database.db"))
CSV_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "simulated_bus_routes_1000.csv"))

# Distance & Speed Parameters
MAX_TRANSFER_RADIUS_KM = 3.0  # Max distance to consider for Train <-> Bus transfers
WALKING_SPEED_KMH = 4.5       # Average walking speed in km/h


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two points in kilometers."""
    if None in (lat1, lon1, lat2, lon2):
        return 9999.0
    r = 6371.0  # Earth radius in kilometers
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)**2
    c = 2 * asin(sqrt(a))
    return r * c


def seed_bus_data():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file not found at {DB_PATH}")
        return

    if not os.path.exists(CSV_PATH):
        print(f"Error: Bus CSV file not found at {CSV_PATH}")
        return

    print("=== STARTING BUS DATA INTEGRATION ===")
    print(f"Target DB:  {DB_PATH}")
    print(f"Source CSV: {CSV_PATH}\n")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Read CSV
    df = pd.read_csv(CSV_PATH)

    # 1. Ensure Table Schemas Support Multimodal Operations
    cursor.execute("PRAGMA table_info(stations)")
    station_cols = [c[1] for c in cursor.fetchall()]
    if "stop_type" not in station_cols:
        cursor.execute("ALTER TABLE stations ADD COLUMN stop_type TEXT DEFAULT 'TRAIN'")
        conn.commit()

    # Create buses and bus_stops tables if not exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS buses (
            route_number TEXT PRIMARY KEY,
            route_name TEXT,
            route_type TEXT,
            bus_provider TEXT,
            runs_sun INTEGER DEFAULT 1,
            runs_mon INTEGER DEFAULT 1,
            runs_tue INTEGER DEFAULT 1,
            runs_wed INTEGER DEFAULT 1,
            runs_thu INTEGER DEFAULT 1,
            runs_fri INTEGER DEFAULT 1,
            runs_sat INTEGER DEFAULT 1,
            mode TEXT DEFAULT 'BUS'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bus_stops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_number TEXT,
            stop_sequence INTEGER,
            stop_id TEXT,
            arrival_time TEXT,
            departure_time TEXT,
            distance_km REAL,
            journey_day INTEGER,
            FOREIGN KEY(route_number) REFERENCES buses(route_number)
        )
    """)
    conn.commit()

    # 2. Extract and Upsert Bus Stops into 'stations'
    unique_bus_stops = df[['stop_id', 'stop_name', 'latitude', 'longitude']].drop_duplicates(subset=['stop_id'])
    
    stops_to_insert = [
        (row['stop_id'], row['stop_id'], row['stop_name'], row['latitude'], row['longitude'], 'BUS')
        for _, row in unique_bus_stops.iterrows()
    ]

    cursor.executemany("""
        INSERT OR REPLACE INTO stations (station_id, station_code, station_name, latitude, longitude, stop_type)
        VALUES (?, ?, ?, ?, ?, ?)
    """, stops_to_insert)
    print(f"[1/4] Integrated {len(stops_to_insert):,} bus stops into 'stations'.")

    # 3. Seed Bus Routes and Stops
    unique_routes = df[['route_number', 'route_name', 'route_type', 'bus_provider']].drop_duplicates(subset=['route_number'])
    
    routes_to_insert = [
        (row['route_number'], row['route_name'], row['route_type'], row['bus_provider'], 1, 1, 1, 1, 1, 1, 1, 'BUS')
        for _, row in unique_routes.iterrows()
    ]

    cursor.executemany("""
        INSERT OR REPLACE INTO buses (route_number, route_name, route_type, bus_provider, runs_sun, runs_mon, runs_tue, runs_wed, runs_thu, runs_fri, runs_sat, mode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, routes_to_insert)
    print(f"[2/4] Integrated {len(routes_to_insert):,} bus routes into 'buses'.")

    bus_stops_to_insert = [
        (row['route_number'], int(row['stop_sequence']), row['stop_id'], str(row['arrival']), str(row['departure']), float(row['distance_km']), int(row['journey_day']))
        for _, row in df.iterrows()
    ]

    cursor.executemany("""
        INSERT INTO bus_stops (route_number, stop_sequence, stop_id, arrival_time, departure_time, distance_km, journey_day)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, bus_stops_to_insert)
    print(f"[3/4] Integrated {len(bus_stops_to_insert):,} bus schedules into 'bus_stops'.")

    # 4. Generate Inter-Modal Transfers (Train Station <-> Bus Stand Footpaths)
    cursor.execute("SELECT station_code, latitude, longitude FROM stations WHERE stop_type = 'TRAIN' AND latitude IS NOT NULL AND longitude IS NOT NULL")
    train_stns = cursor.fetchall()

    cursor.execute("SELECT station_code, latitude, longitude FROM stations WHERE stop_type = 'BUS' AND latitude IS NOT NULL AND longitude IS NOT NULL")
    bus_stns = cursor.fetchall()

    transfers_to_insert = []
    for t_code, t_lat, t_lon in train_stns:
        for b_code, b_lat, b_lon in bus_stns:
            dist_km = haversine(t_lat, t_lon, b_lat, b_lon)
            if dist_km <= MAX_TRANSFER_RADIUS_KM:
                walk_mins = int((dist_km / WALKING_SPEED_KMH) * 60) + 5  # Walk time + 5 min buffer
                walk_m = int(dist_km * 1000)
                # Bi-directional transfer link
                transfers_to_insert.append((t_code, b_code, max(walk_mins, 10), walk_m))
                transfers_to_insert.append((b_code, t_code, max(walk_mins, 10), walk_m))

    cursor.executemany("""
        INSERT OR REPLACE INTO transfers (from_stop_code, to_stop_code, min_transfer_time_mins, walking_distance_m)
        VALUES (?, ?, ?, ?)
    """, transfers_to_insert)
    print(f"[4/4] Generated {len(transfers_to_insert):,} inter-modal transfer links in 'transfers'.")

    conn.commit()
    conn.close()
    print("\n=== BUS DATA INTEGRATION SUCCESSFUL ===")


if __name__ == "__main__":
    seed_bus_data()