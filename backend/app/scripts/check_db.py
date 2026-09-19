# /backend/app/scripts/check_db.py

import os
import sqlite3

# Resolves to Capstone/backend/app/mcraptor_railway_database.db
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "mcraptor_railway_database.db"))

def verify_database():
    if not os.path.exists(DB_PATH):
        print(f"Error: Could not find database file at: {DB_PATH}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        print("=== DATABASE VERIFICATION SUMMARY ===")
        print(f"Database Path: {DB_PATH}\n")

        # 1. Fetch all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall() if row[0] != 'sqlite_sequence']
        print(f"1. Tables Found ({len(tables)}):", tables)

        # 2. Count rows in each table
        print("\n2. Row Counts:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"   - {table}: {count:,} rows")

        # 3. Check sample values from key tables
        print("\n3. Data Format Spot Check:")
        
        cursor.execute("SELECT station_code, station_name FROM stations LIMIT 3")
        print("   - Stations Sample:", cursor.fetchall())

        cursor.execute("SELECT train_number, stop_sequence, station_code, arrival_time, departure_time FROM train_stops LIMIT 3")
        print("   - Stops Sample:", cursor.fetchall())

        cursor.execute("SELECT train_number, travel_date, class_code, availability_status, price_inr FROM seat_availability LIMIT 3")
        print("   - Seat Availability Sample:", cursor.fetchall())

        conn.close()
        print("\n=== VERIFICATION SUCCESSFUL ===")

    except Exception as e:
        print(f"\nError inspecting database: {e}")

if __name__ == "__main__":
    verify_database()