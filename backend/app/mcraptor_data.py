# Capstone/backend/app/mcraptor_data.py

import sqlite3
import os
from typing import Dict, List, Tuple, Set


class McRaptorTimetable:
    def __init__(self):
        # stop_id -> list of route_ids passing through it
        self.stop_routes: Dict[str, List[str]] = {}
        
        # route_id -> list of stop_ids in order
        self.routes: Dict[str, List[str]] = {}
        
        # trip_id -> list of stop_time dicts
        self.trip_stop_times: Dict[str, List[dict]] = {}
        
        # trip_id -> trip metadata dict
        self.trips: Dict[str, dict] = {}

        # route_id -> list of trip_ids
        self.route_trips: Dict[str, List[str]] = {}
        
        # stop_id -> stop metadata dict (name, lat, lon, mode, city)
        self.stops: Dict[str, dict] = {}
        
        # from_stop_id -> list of transfer dicts (to_stop_id, transfer_time_sec, walk_distance_km, transfer_mode)
        self.transfers: Dict[str, List[dict]] = {}

        # Train Segment Seat Availability: (train_number, travel_date, from_code, to_code, class_code) -> dict
        # Bus Fares: (route_number, from_stop_id, to_stop_id, bus_class) -> dict
        self.seat_map: Dict[Tuple, dict] = {}
        self.bus_fare_map: Dict[Tuple, dict] = {}


def build_mcraptor_timetable(db_path: str = "app/final.db") -> McRaptorTimetable:
    """Pre-processes SQLite unified DB (stops, trips, stop_times, transfers) into RAM for McRAPTOR."""
    if not os.path.exists(db_path):
        # Fallback to local directory check
        if os.path.exists("final.db"):
            db_path = "final.db"
        else:
            raise FileNotFoundError(f"Database file '{db_path}' not found.")

    timetable = McRaptorTimetable()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Load Unified Stops
    cursor.execute("SELECT stop_id, stop_name, latitude, longitude, city, state, mode FROM stops")
    for row in cursor.fetchall():
        stop_id, name, lat, lon, city, state, mode = row
        timetable.stops[stop_id] = {
            "name": name,
            "latitude": lat,
            "longitude": lon,
            "city": city,
            "state": state,
            "mode": mode
        }
        timetable.stop_routes[stop_id] = []

    # 2. Load Unified Trips and Routes
    cursor.execute("SELECT trip_id, route_id, mode, service_number FROM trips")
    for row in cursor.fetchall():
        trip_id, route_id, mode, service_number = row
        timetable.trips[trip_id] = {
            "route_id": route_id,
            "mode": mode,
            "service_number": service_number
        }
        if route_id not in timetable.route_trips:
            timetable.route_trips[route_id] = []
        timetable.route_trips[route_id].append(trip_id)

    # 3. Load Unified Stop Times & Build Route Stop Sequences
    cursor.execute("""
        SELECT trip_id, stop_id, stop_sequence, arrival_sec, departure_sec, distance_km 
        FROM stop_times 
        ORDER BY trip_id, stop_sequence
    """)
    all_stop_times = cursor.fetchall()

    route_stops_builder: Dict[str, List[Tuple[int, str]]] = {}

    for row in all_stop_times:
        trip_id, stop_id, seq, arr_sec, dep_sec, dist = row

        if trip_id not in timetable.trip_stop_times:
            timetable.trip_stop_times[trip_id] = []
        
        timetable.trip_stop_times[trip_id].append({
            "stop_id": stop_id,
            "stop_sequence": seq,
            "arrival_sec": arr_sec,
            "departure_sec": dep_sec,
            "distance_km": dist
        })

        # Build route stop patterns from first trips
        route_id = timetable.trips[trip_id]["route_id"]
        if route_id not in route_stops_builder:
            route_stops_builder[route_id] = []

        if len(timetable.route_trips[route_id]) == 1 or route_id not in timetable.routes:
            route_stops_builder[route_id].append((seq, stop_id))

    for route_id, seq_stop_list in route_stops_builder.items():
        # Sort by sequence order
        seq_stop_list.sort(key=lambda x: x[0])
        stop_sequence = [st[1] for st in seq_stop_list]
        timetable.routes[route_id] = stop_sequence

        for stop_id in stop_sequence:
            if stop_id in timetable.stop_routes:
                if route_id not in timetable.stop_routes[stop_id]:
                    timetable.stop_routes[stop_id].append(route_id)

    # 4. Load Modal Transfers / Footpaths
    cursor.execute("""
        SELECT from_stop_id, to_stop_id, transfer_time_sec, walk_distance_km, transfer_mode 
        FROM transfers
    """)
    for row in cursor.fetchall():
        f_stop, t_stop, time_sec, dist, mode = row
        if f_stop not in timetable.transfers:
            timetable.transfers[f_stop] = []
        timetable.transfers[f_stop].append({
            "to_stop_id": t_stop,
            "transfer_time_sec": time_sec,
            "walk_distance_km": dist,
            "transfer_mode": mode
        })

    # 5. Load Train Seat Availability into RAM
    cursor.execute("""
        SELECT train_number, travel_date, from_station_code, to_station_code, class_code, availability_status, available_seats, wl_number, price_inr 
        FROM seat_availability
    """)
    for row in cursor.fetchall():
        t_num, date_str, from_stn, to_stn, cls, status, seats, wl, price = row
        segment_key = (str(t_num), date_str, from_stn, to_stn, cls)
        timetable.seat_map[segment_key] = {
            "status": status,
            "available_seats": seats,
            "wl_number": wl,
            "price_inr": price
        }
        # Fallback key without segment
        fallback_key = (str(t_num), date_str, cls)
        if fallback_key not in timetable.seat_map:
            timetable.seat_map[fallback_key] = {
                "status": status,
                "available_seats": seats,
                "wl_number": wl,
                "price_inr": price
            }

    # 6. Load Bus Fares into RAM
    cursor.execute("""
        SELECT route_number, from_stop_id, to_stop_id, bus_class, price_inr, available_seats 
        FROM bus_fares
    """)
    for row in cursor.fetchall():
        r_num, f_stop, t_stop, b_cls, price, seats = row
        fare_key = (r_num, f_stop, t_stop, b_cls)
        timetable.bus_fare_map[fare_key] = {
            "status": "AVAILABLE" if seats > 0 else "WL",
            "available_seats": seats,
            "wl_number": 0,
            "price_inr": price
        }

    conn.close()
    return timetable