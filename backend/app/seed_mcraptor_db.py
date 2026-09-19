# backend/app/seed_mcraptor_db.py

import sqlite3
import random
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "mcraptor_railway_database.db")

CLASSES = ["SL", "3A", "2A", "BUS_SEATER", "BUS_SLEEPER"]
PRICE_PER_KM = {
    "SL": 0.75, 
    "3A": 1.85, 
    "2A": 2.65,
    "BUS_SEATER": 1.10,
    "BUS_SLEEPER": 1.60
}
MIN_BASE_PRICE = {
    "SL": 150, 
    "3A": 500, 
    "2A": 750,
    "BUS_SEATER": 100,
    "BUS_SLEEPER": 250
}


def create_schema_and_migrate_types(cursor):
    """Migrates train_number columns to TEXT across all tables to support string IDs."""
    
    # Enable foreign keys off during table recreation
    cursor.execute("PRAGMA foreign_keys = OFF;")

    # 1. Update `stations` table schema
    cursor.execute("PRAGMA table_info(stations);")
    cols = [col[1] for col in cursor.fetchall()]
    if "stop_type" not in cols:
        cursor.execute("ALTER TABLE stations ADD COLUMN stop_type TEXT DEFAULT 'TRAIN';")

    # 2. Re-create `trains` table with `train_number TEXT PRIMARY KEY`
    cursor.execute("PRAGMA table_info(trains);")
    trains_info = cursor.fetchall()
    train_num_type = next((col[2] for col in trains_info if col[1] == "train_number"), "INTEGER")

    if train_num_type.upper() != "TEXT":
        cursor.execute("""
            CREATE TABLE trains_new (
                train_number TEXT PRIMARY KEY,
                train_name TEXT NOT NULL,
                train_type TEXT NOT NULL,
                source_station_code TEXT NOT NULL,
                destination_station_code TEXT NOT NULL,
                total_stops INTEGER NOT NULL,
                runs_sun BOOLEAN NOT NULL,
                runs_mon BOOLEAN NOT NULL,
                runs_tue BOOLEAN NOT NULL,
                runs_wed BOOLEAN NOT NULL,
                runs_thu BOOLEAN NOT NULL,
                runs_fri BOOLEAN NOT NULL,
                runs_sat BOOLEAN NOT NULL,
                mode TEXT DEFAULT 'TRAIN'
            );
        """)
        cursor.execute("""
            INSERT INTO trains_new (
                train_number, train_name, train_type, source_station_code, destination_station_code,
                total_stops, runs_sun, runs_mon, runs_tue, runs_wed, runs_thu, runs_fri, runs_sat
            )
            SELECT CAST(train_number AS TEXT), train_name, train_type, source_station_code, destination_station_code,
                   total_stops, runs_sun, runs_mon, runs_tue, runs_wed, runs_thu, runs_fri, runs_sat
            FROM trains;
        """)
        cursor.execute("DROP TABLE trains;")
        cursor.execute("ALTER TABLE trains_new RENAME TO trains;")

    # Add 'mode' column if missing
    cursor.execute("PRAGMA table_info(trains);")
    cols = [col[1] for col in cursor.fetchall()]
    if "mode" not in cols:
        cursor.execute("ALTER TABLE trains ADD COLUMN mode TEXT DEFAULT 'TRAIN';")

    # 3. Re-create `train_stops` table with `train_number TEXT`
    cursor.execute("PRAGMA table_info(train_stops);")
    stops_info = cursor.fetchall()
    stop_train_num_type = next((col[2] for col in stops_info if col[1] == "train_number"), "INTEGER")

    if stop_train_num_type.upper() != "TEXT":
        cursor.execute("""
            CREATE TABLE train_stops_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                train_number TEXT NOT NULL,
                stop_sequence INTEGER NOT NULL,
                station_code TEXT NOT NULL,
                station_name TEXT,
                arrival_time TEXT,
                departure_time TEXT,
                distance_km REAL NOT NULL,
                journey_day INTEGER NOT NULL
            );
        """)
        cursor.execute("""
            INSERT INTO train_stops_new (
                id, train_number, stop_sequence, station_code, station_name,
                arrival_time, departure_time, distance_km, journey_day
            )
            SELECT id, CAST(train_number AS TEXT), stop_sequence, station_code, station_name,
                   arrival_time, departure_time, distance_km, journey_day
            FROM train_stops;
        """)
        cursor.execute("DROP TABLE train_stops;")
        cursor.execute("ALTER TABLE train_stops_new RENAME TO train_stops;")

    # 4. Create `transfers` table for McRAPTOR footpaths
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transfers (
            from_stop_code TEXT NOT NULL,
            to_stop_code TEXT NOT NULL,
            min_transfer_time_mins INTEGER NOT NULL,
            walking_distance_m REAL NOT NULL,
            PRIMARY KEY (from_stop_code, to_stop_code)
        );
    """)

    # 5. Re-create `seat_availability` table with `train_number TEXT`
    cursor.execute("DROP TABLE IF EXISTS seat_availability;")
    cursor.execute("""
        CREATE TABLE seat_availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            train_number TEXT NOT NULL,
            travel_date TEXT NOT NULL,
            from_station_code TEXT NOT NULL,
            to_station_code TEXT NOT NULL,
            class_code TEXT NOT NULL,
            availability_status TEXT NOT NULL,
            available_seats INTEGER NOT NULL,
            wl_number INTEGER NOT NULL,
            price_inr INTEGER NOT NULL
        );
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_seat_lookup 
        ON seat_availability (train_number, travel_date, class_code);
    """)

    cursor.execute("PRAGMA foreign_keys = ON;")


def generate_status(mode="TRAIN"):
    """Generates weighted ticket availability status."""
    rand = random.random()
    if mode == "BUS":
        if rand < 0.70:
            return "AVAILABLE", random.randint(5, 40), 0
        else:
            return "SOLD_OUT", 0, 0
    else:
        if rand < 0.50:
            return "AVAILABLE", random.randint(5, 90), 0
        elif rand < 0.85:
            return "WL", 0, random.randint(1, 60)
        else:
            return "RAC", 0, random.randint(1, 20)


def calculate_price(distance_km, class_code):
    """Calculates ticket fare based on travel distance and class rate."""
    dist = max(distance_km, 30)
    calc_price = int(dist * PRICE_PER_KM[class_code])
    return max(calc_price, MIN_BASE_PRICE[class_code])


def seed_sample_bus_data(cursor):
    """Seeds sample bus stops, routes (with string IDs), stops, and transfer footpaths into DB."""
    
    # 1. Add Sample Bus Stops
    bus_stops = [
        ('BS_NDLS', 'ISBT Kashmiri Gate', 'Delhi', 'Delhi', 28.6665, 77.2285, 'BUS'),
        ('BS_CNB', 'Jhangat Bus Terminal', 'Kanpur', 'Uttar Pradesh', 26.4583, 80.3173, 'BUS'),
        ('BS_PRYJ', 'Civil Lines Bus Stand', 'Prayagraj', 'Uttar Pradesh', 25.4525, 81.8310, 'BUS')
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO stations (station_code, station_name, city, state, latitude, longitude, stop_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, bus_stops)

    # 2. Add Sample Bus Trips using String IDs ('BUS_DL_CNB_101', 'BUS_CNB_PRYJ_202')
    bus_trips = [
        ('BUS_DL_CNB_101', 'Express Sleeper Bus 101', 'BUS_EXPRESS', 'BS_NDLS', 'BS_CNB', 2, 1, 1, 1, 1, 1, 1, 1, 'BUS'),
        ('BUS_CNB_PRYJ_202', 'Intercity Connect 202', 'BUS_EXPRESS', 'BS_CNB', 'BS_PRYJ', 2, 1, 1, 1, 1, 1, 1, 1, 'BUS')
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO trains 
        (train_number, train_name, train_type, source_station_code, destination_station_code, total_stops, 
         runs_sun, runs_mon, runs_tue, runs_wed, runs_thu, runs_fri, runs_sat, mode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, bus_trips)

    # 3. Add Sample Bus Stops Schedule
    bus_stops_schedule = [
        # Trip 1: Delhi -> Kanpur
        ('BUS_DL_CNB_101', 1, 'BS_NDLS', 'ISBT Kashmiri Gate', '21:00', '21:30', 0.0, 1),
        ('BUS_DL_CNB_101', 2, 'BS_CNB', 'Jhangat Bus Terminal', '05:00', '05:15', 440.0, 2),
        
        # Trip 2: Kanpur -> Prayagraj
        ('BUS_CNB_PRYJ_202', 1, 'BS_CNB', 'Jhangat Bus Terminal', '06:30', '07:00', 0.0, 1),
        ('BUS_CNB_PRYJ_202', 2, 'BS_PRYJ', 'Civil Lines Bus Stand', '10:00', '10:15', 200.0, 1)
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO train_stops 
        (train_number, stop_sequence, station_code, station_name, arrival_time, departure_time, distance_km, journey_day)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, bus_stops_schedule)

    # 4. Add Walking Transfers
    transfers = [
        ('NDLS', 'BS_NDLS', 20, 1500.0),
        ('BS_NDLS', 'NDLS', 20, 1500.0),
        ('CNB', 'BS_CNB', 15, 1000.0),
        ('BS_CNB', 'CNB', 15, 1000.0),
        ('PRYJ', 'BS_PRYJ', 10, 800.0),
        ('BS_PRYJ', 'PRYJ', 10, 800.0)
    ]
    cursor.executemany("""
        INSERT OR REPLACE INTO transfers (from_stop_code, to_stop_code, min_transfer_time_mins, walking_distance_m)
        VALUES (?, ?, ?, ?)
    """, transfers)


def seed_database():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Target DB file not found at: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("[+] Migrating database columns to TEXT for string ID support...")
    create_schema_and_migrate_types(cursor)

    print("[+] Seeding sample bus trips and walking transfers...")
    seed_sample_bus_data(cursor)

    # Get distinct train & bus trips
    cursor.execute("""
        SELECT ts.train_number, ts.station_code, ts.stop_sequence, ts.distance_km, COALESCE(t.mode, 'TRAIN')
        FROM train_stops ts
        JOIN trains t ON ts.train_number = t.train_number
        ORDER BY ts.train_number, ts.stop_sequence
    """)
    stops_raw = cursor.fetchall()

    trip_stops_map = {}
    trip_mode_map = {}
    for t_num, stn, seq, dist, mode in stops_raw:
        t_num_str = str(t_num)
        if t_num_str not in trip_stops_map:
            trip_stops_map[t_num_str] = []
            trip_mode_map[t_num_str] = mode
        trip_stops_map[t_num_str].append((stn, dist))

    today = datetime.now()
    date_list = [(today + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(60)]

    records_to_insert = []
    print(f"[+] Generating 60-day availability data for {len(trip_stops_map)} transit trips...")

    for t_num_str, stops in trip_stops_map.items():
        if len(stops) < 2:
            continue

        mode = trip_mode_map.get(t_num_str, "TRAIN")
        source_stn, _ = stops[0]
        dest_stn, total_dist = stops[-1]

        segments_to_seed = [(source_stn, dest_stn, total_dist)]

        if len(stops) > 4:
            mid_idx = len(stops) // 2
            segments_to_seed.append((source_stn, stops[mid_idx][0], stops[mid_idx][1]))
            segments_to_seed.append((stops[mid_idx][0], dest_stn, total_dist - stops[mid_idx][1]))

        classes_to_seed = ["BUS_SEATER", "BUS_SLEEPER"] if mode == "BUS" else ["SL", "3A", "2A"]

        for date_str in date_list:
            for from_code, to_code, seg_dist in segments_to_seed:
                for cls in classes_to_seed:
                    status, avail_seats, wl_num = generate_status(mode)
                    price = calculate_price(seg_dist, cls)

                    records_to_insert.append((
                        t_num_str, date_str, from_code, to_code, cls,
                        status, avail_seats, wl_num, price
                    ))

    print(f"[+] Inserting {len(records_to_insert)} seat availability records...")
    cursor.executemany("""
        INSERT INTO seat_availability 
        (train_number, travel_date, from_station_code, to_station_code, class_code, availability_status, available_seats, wl_number, price_inr)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, records_to_insert)

    conn.commit()
    conn.close()
    print("[+] Migration and Seeding Complete!")


if __name__ == "__main__":
    seed_database()