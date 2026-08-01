# app/raptor/raptor_data.py

from fileinput import filename
import sqlite3
import os
from typing import Dict, List

# Save file path comment as requested
# /app/raptor/raptor_data.py

class RaptorTimetable:
    def __init__(self):
        # Station code -> list of route IDs passing through it
        self.stop_routes: Dict[str, List[int]] = {}
        
        # Route ID -> list of station codes in order
        self.routes: Dict[int, List[str]] = {}
        
        # Route ID -> list of trips. Each trip is a dict with train_number, train_name, running_days, and stop timetables
        self.route_trips: Dict[int, List[dict]] = {}
        
        # Station code -> station name mapping
        self.stations: Dict[str, str] = {}


def build_raptor_timetable(db_path: str = "railway_data.db") -> RaptorTimetable:
    """Pre-processes SQLite railway database into high-performance RAPTOR arrays."""
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database file '{db_path}' not found.")

    timetable = RaptorTimetable()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Load Station Metadata
    cursor.execute("SELECT station_code, station_name FROM stations")
    for stn_code, stn_name in cursor.fetchall():
        timetable.stations[stn_code] = stn_name
        timetable.stop_routes[stn_code] = []

    # 2. Load Trains Running Days
    cursor.execute("""
        SELECT train_number, train_name, runs_sun, runs_mon, runs_tue, runs_wed, runs_thu, runs_fri, runs_sat 
        FROM trains
    """)
    trains_info = {}
    for row in cursor.fetchall():
        t_num = row[0]
        trains_info[t_num] = {
            "name": row[1],
            "runs": {
                "SUN": bool(row[2]), "MON": bool(row[3]), "TUE": bool(row[4]),
                "WED": bool(row[5]), "THU": bool(row[6]), "FRI": bool(row[7]), "SAT": bool(row[8])
            }
        }

    # 3. Group Stops into Route Patterns
    cursor.execute("""
        SELECT train_number, stop_sequence, station_code, arrival_time, departure_time, distance_km, journey_day 
        FROM train_stops 
        ORDER BY train_number, stop_sequence
    """)
    all_stops = cursor.fetchall()
    conn.close()

    # Group train stops by train_number
    train_stops_map = {}
    for row in all_stops:
        t_num, seq, stn_code, arr, dep, dist, day = row
        if t_num not in train_stops_map:
            train_stops_map[t_num] = []
        train_stops_map[t_num].append({
            "sequence": seq,
            "station_code": stn_code,
            "arr_time": arr if arr else dep,
            "dep_time": dep if dep else arr,
            "distance_km": dist,
            "journey_day": day
        })

    # Pattern Matching: Group trains with identical station sequences into RAPTOR Route IDs
    pattern_to_route_id = {}
    route_counter = 0

    for t_num, stops in train_stops_map.items():
        pattern_key = tuple(s["station_code"] for s in stops)

        if pattern_key not in pattern_to_route_id:
            route_id = route_counter
            pattern_to_route_id[pattern_key] = route_id
            timetable.routes[route_id] = list(pattern_key)
            timetable.route_trips[route_id] = []

            # Link stations to this route
            for stn in pattern_key:
                if stn in timetable.stop_routes:
                    if route_id not in timetable.stop_routes[stn]:
                        timetable.stop_routes[stn].append(route_id)

            route_counter += 1
        else:
            route_id = pattern_to_route_id[pattern_key]

        # Add this train trip to its corresponding route pattern
        t_info = trains_info.get(t_num, {})
        timetable.route_trips[route_id].append({
            "train_number": t_num,
            "train_name": t_info.get("name", "Unknown Train"),
            "running_days": t_info.get("runs", {}),
            "stops": stops
        })

    return timetable