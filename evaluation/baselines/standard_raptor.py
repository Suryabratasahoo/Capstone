"""
evaluation/baselines/standard_raptor.py
---------------------------------------
Standard Single-Objective RAPTOR (Round-Based Public Transit Routing) Baseline.
Reference: Delling et al., "Round-based public transit routing," Transportation Science, 2015.

Finds earliest arrival journey connecting source_stop to dest_stop.
Operates on the identical McRaptorTimetable in-memory data structures without multi-criteria bags.
"""

from typing import Dict, List, Optional
import sys
import os

sys.path.insert(0, os.path.abspath("backend"))
from app.mcraptor_data import McRaptorTimetable


def run_standard_raptor(timetable: McRaptorTimetable,
                        source_stop_id: str,
                        dest_stop_id: str,
                        departure_sec: int = 28800,  # 08:00 AM
                        max_rounds: int = 3) -> Optional[Dict]:
    """
    Standard Single-Objective RAPTOR.
    Tracks earliest arrival time per stop in round k: earliest_arr[k][stop_id].
    """
    if source_stop_id not in timetable.stops or dest_stop_id not in timetable.stops:
        return None

    # earliest_arr[k][stop] = earliest arrival time in seconds
    earliest_arr = [{} for _ in range(max_rounds + 1)]
    best_overall: Dict[str, int] = {}

    for s in timetable.stops:
        best_overall[s] = float("inf")

    earliest_arr[0][source_stop_id] = departure_sec
    best_overall[source_stop_id] = departure_sec

    marked_stops = {source_stop_id}

    for k in range(1, max_rounds + 1):
        # Copy previous round values
        for s, arr in earliest_arr[k - 1].items():
            earliest_arr[k][s] = arr

        # Accumulate routes serving marked stops
        routes_to_scan = set()
        for stop_id in marked_stops:
            for r_id in timetable.stop_routes.get(stop_id, []):
                routes_to_scan.add(r_id)

        marked_stops.clear()

        for route_id in routes_to_scan:
            route_stops = timetable.routes[route_id]
            curr_trip_id = None
            board_stop_idx = -1

            for s_idx, stop_id in enumerate(route_stops):
                # Check if we can board an earlier trip
                prev_arr = earliest_arr[k - 1].get(stop_id, float("inf"))
                if prev_arr < float("inf"):
                    for trip_id in timetable.route_trips.get(route_id, []):
                        st_times = timetable.trip_stop_times[trip_id]
                        if s_idx < len(st_times) and st_times[s_idx]["departure_sec"] >= prev_arr:
                            if curr_trip_id is None:
                                curr_trip_id = trip_id
                                board_stop_idx = s_idx
                            else:
                                curr_dep = timetable.trip_stop_times[curr_trip_id][s_idx]["departure_sec"]
                                if st_times[s_idx]["departure_sec"] < curr_dep:
                                    curr_trip_id = trip_id
                                    board_stop_idx = s_idx
                            break

                # Update arrival time if currently on a trip
                if curr_trip_id is not None and s_idx > board_stop_idx:
                    arr_sec = timetable.trip_stop_times[curr_trip_id][s_idx]["arrival_sec"]
                    if arr_sec < best_overall.get(stop_id, float("inf")):
                        earliest_arr[k][stop_id] = arr_sec
                        best_overall[stop_id] = arr_sec
                        marked_stops.add(stop_id)

        # Footpath relaxation
        new_marked = set()
        for s in marked_stops:
            s_arr = earliest_arr[k].get(s, float("inf"))
            for tr in timetable.transfers.get(s, []):
                t_stop = tr["to_stop_id"]
                t_arr = s_arr + tr["transfer_time_sec"]
                if t_arr < best_overall.get(t_stop, float("inf")):
                    earliest_arr[k][t_stop] = t_arr
                    best_overall[t_stop] = t_arr
                    new_marked.add(t_stop)

        marked_stops.update(new_marked)
        if not marked_stops:
            break

    dest_arrival = best_overall.get(dest_stop_id, float("inf"))
    if dest_arrival < float("inf"):
        return {
            "source": source_stop_id,
            "destination": dest_stop_id,
            "departure_sec": departure_sec,
            "arrival_sec": dest_arrival,
            "duration_mins": (dest_arrival - departure_sec) // 60
        }
    return None

