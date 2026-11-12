"""
evaluation/baselines/time_expanded_dijkstra.py
----------------------------------------------
Time-Expanded Priority-Queue Dijkstra Baseline for Schedule-Based Transit Networks.
Reference: Pyrga et al., "Efficient models for timetable information," ACM JEA, 2008.

Explores the time-dependent network using a binary min-heap (heapq).
Models departures and transfers on demand directly from the identical McRaptorTimetable.
"""

import heapq
import sys
import os
from typing import Dict, Optional

sys.path.insert(0, os.path.abspath("backend"))
from app.mcraptor_data import McRaptorTimetable


def run_time_expanded_dijkstra(timetable: McRaptorTimetable,
                               source_stop_id: str,
                               dest_stop_id: str,
                               departure_sec: int = 28800,  # 08:00 AM
                               max_lookahead_sec: int = 86400 * 2) -> Optional[Dict]:
    """
    Time-Expanded Dijkstra using priority queue.
    State in heap: (current_time_sec, stop_id, transfers_count)
    """
    if source_stop_id not in timetable.stops or dest_stop_id not in timetable.stops:
        return None

    # Priority queue: (time_sec, stop_id, transfers)
    pq = [(departure_sec, source_stop_id, 0)]
    earliest_arrival: Dict[str, int] = {source_stop_id: departure_sec}

    max_horizon = departure_sec + max_lookahead_sec

    while pq:
        curr_time, curr_stop, transfers = heapq.heappop(pq)

        if curr_time > earliest_arrival.get(curr_stop, float("inf")):
            continue

        if curr_stop == dest_stop_id:
            return {
                "source": source_stop_id,
                "destination": dest_stop_id,
                "departure_sec": departure_sec,
                "arrival_sec": curr_time,
                "duration_mins": (curr_time - departure_sec) // 60,
                "transfers": transfers
            }

        if curr_time > max_horizon or transfers >= 3:
            continue

        # 1. Expand Transit Legs (board trips departing from curr_stop)
        for route_id in timetable.stop_routes.get(curr_stop, []):
            route_stops = timetable.routes[route_id]
            curr_stop_idx = route_stops.index(curr_stop)

            for trip_id in timetable.route_trips.get(route_id, []):
                st_times = timetable.trip_stop_times[trip_id]
                board_dep = st_times[curr_stop_idx]["departure_sec"]

                if board_dep >= curr_time and board_dep <= curr_time + 14400:  # 4-hour window
                    # Traverse downstream stops on this trip
                    for down_idx in range(curr_stop_idx + 1, len(route_stops)):
                        down_stop = route_stops[down_idx]
                        arr_sec = st_times[down_idx]["arrival_sec"]

                        if arr_sec < earliest_arrival.get(down_stop, float("inf")):
                            earliest_arrival[down_stop] = arr_sec
                            heapq.heappush(pq, (arr_sec, down_stop, transfers + 1))

        # 2. Expand Transfer Footpaths
        for tr in timetable.transfers.get(curr_stop, []):
            to_stop = tr["to_stop_id"]
            trans_arr = curr_time + tr["transfer_time_sec"]

            if trans_arr < earliest_arrival.get(to_stop, float("inf")):
                earliest_arrival[to_stop] = trans_arr
                heapq.heappush(pq, (trans_arr, to_stop, transfers))

    return None

