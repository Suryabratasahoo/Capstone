# /app/mcraptor/mcraptor_data.py

import sqlite3
import os
from typing import Dict, List, Tuple


class McRaptorTimetable:
    def __init__(self):
        # Station code -> list of route IDs passing through it
        self.stop_routes: Dict[str, List[int]] = {}
        
        # Route ID -> list of station codes in order
        self.routes: Dict[int, List[str]] = {}
        
        # Route ID -> list of trips
        self.route_trips: Dict[int, List[dict]] = {}
        
        # Station code -> station name mapping
        self.stations: Dict[str, str] = {}
        
        # Segment-Aware Seat Availability lookup:
        # Primary key: (train_number, travel_date, from_station_code, to_station_code, class_code)
        # Fallback key: (train_number, travel_date, class_code)
        self.seat_map: Dict[Tuple, dict] = {}


def build_mcraptor_timetable(db_path: str = "app/mcraptor/mcraptor_database.db") -> McRaptorTimetable:
    """Pre-processes SQLite railway DB & Seat Availability into RAM for McRAPTOR."""
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database file '{db_path}' not found.")

    timetable = McRaptorTimetable()
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

    # 3. Load All Stops & Group into Route Patterns
    cursor.execute("""
        SELECT train_number, stop_sequence, station_code, arrival_time, departure_time, distance_km, journey_day 
        FROM train_stops 
        ORDER BY train_number, stop_sequence
    """)
    all_stops = cursor.fetchall()

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

    pattern_to_route_id = {}
    route_counter = 0

    for t_num, stops in train_stops_map.items():
        pattern_key = tuple(s["station_code"] for s in stops)

        if pattern_key not in pattern_to_route_id:
            route_id = route_counter
            pattern_to_route_id[pattern_key] = route_id
            timetable.routes[route_id] = list(pattern_key)
            timetable.route_trips[route_id] = []

            for stn in pattern_key:
                if stn in timetable.stop_routes:
                    if route_id not in timetable.stop_routes[stn]:
                        timetable.stop_routes[stn].append(route_id)

            route_counter += 1
        else:
            route_id = pattern_to_route_id[pattern_key]

        t_info = trains_info.get(t_num, {})
        timetable.route_trips[route_id].append({
            "train_number": t_num,
            "train_name": t_info.get("name", "Unknown Train"),
            "running_days": t_info.get("runs", {}),
            "stops": stops
        })

    # 4. Load Seat Availability Table into RAM using Segment-Aware Keys
    cursor.execute("""
        SELECT train_number, travel_date, from_station_code, to_station_code, class_code, availability_status, available_seats, wl_number, price_inr 
        FROM seat_availability
    """)
    for row in cursor.fetchall():
        t_num, date_str, from_stn, to_stn, cls, status, seats, wl, price = row

        # Primary Segment-Aware Key: (train, date, from_station, to_station, class)
        segment_key = (t_num, date_str, from_stn, to_stn, cls)
        timetable.seat_map[segment_key] = {
            "status": status,
            "available_seats": seats,
            "wl_number": wl,
            "price_inr": price
        }

        # Backup Fallback Key: (train, date, class)
        fallback_key = (t_num, date_str, cls)
        if fallback_key not in timetable.seat_map:
            timetable.seat_map[fallback_key] = {
                "status": status,
                "available_seats": seats,
                "wl_number": wl,
                "price_inr": price
            }

    conn.close()
    return timetable