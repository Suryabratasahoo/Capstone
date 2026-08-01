# app/raptor/raptor_engine.py

from datetime import datetime, timedelta
from typing import List, Dict
from app.raptor.raptor_data import RaptorTimetable

MIN_LAYOVER_MINS = 45
MAX_LAYOVER_MINS = 360


def parse_time(time_str: str):
    if not time_str or time_str.upper() in ["SOURCE", "DESTINATION", "N/A"]:
        return 0, 0
    parts = time_str.split(":")
    return int(parts[0]), int(parts[1])


def calculate_duration_mins(dep_time_str: str, arr_time_str: str, day_dep: int, day_arr: int) -> int:
    dep_h, dep_m = parse_time(dep_time_str)
    arr_h, arr_m = parse_time(arr_time_str)

    dep_total = dep_h * 60 + dep_m
    arr_total = arr_h * 60 + arr_m

    days_elapsed = day_arr - day_dep
    total_duration = (days_elapsed * 1440) + (arr_total - dep_total)
    return max(total_duration, 0)


def get_day_of_week_str(dt_obj: datetime) -> str:
    days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    return days[dt_obj.weekday()]


def calculate_transfer_score(route: dict) -> float:
    score = float(route["total_duration_mins"])
    layover = route["interchange_station"]["layover_minutes"]
    if layover < 60:
        score += (60 - layover) * 2.0
    return score


def deduplicate_transfer_routes(transfer_routes: list) -> list:
    best_pair_map = {}
    for route in transfer_routes:
        t1 = route["legs"][0]["train_number"]
        t2 = route["legs"][1]["train_number"]
        pair_key = (t1, t2)

        if pair_key not in best_pair_map:
            best_pair_map[pair_key] = route
        else:
            if route["score"] < best_pair_map[pair_key]["score"]:
                best_pair_map[pair_key] = route

    return list(best_pair_map.values())


def run_raptor_search(timetable: RaptorTimetable, source_code: str, dest_code: str, travel_date_str: str, top_k: int = 15):
    """
    RAPTOR (Round-Based Public Transit Routing) Core Algorithm
    - Round 1: Scans routes directly passing through Source station.
    - Round 2: Scans routes passing through reachable intermediate junctions.
    """
    source_code = source_code.strip().upper()
    dest_code = dest_code.strip().upper()

    if source_code not in timetable.stations or dest_code not in timetable.stations:
        return []

    start_date = datetime.strptime(travel_date_str, "%Y-%m-%d")
    start_day_name = get_day_of_week_str(start_date)

    direct_routes = []
    transfer_routes = []

    # Get all RAPTOR Route IDs serving the Source station
    source_route_ids = timetable.stop_routes.get(source_code, [])

    # Map to store reachability for Round 2: { junction_station_code: [reachability_info, ...] }
    reachable_junctions: Dict[str, List[dict]] = {}

    # ==================== ROUND 1: DIRECT ROUTES ====================
    for route_id in source_route_ids:
        route_stops = timetable.routes[route_id]
        if source_code not in route_stops:
            continue

        src_idx = route_stops.index(source_code)
        trips = timetable.route_trips[route_id]

        for trip in trips:
            if not trip["running_days"].get(start_day_name, False):
                continue

            src_stop_data = trip["stops"][src_idx]
            t_num = trip["train_number"]
            t_name = trip["train_name"]

            # Traverse downstream stops in this route pattern
            for down_idx in range(src_idx + 1, len(route_stops)):
                down_stn = route_stops[down_idx]
                down_stop_data = trip["stops"][down_idx]

                duration_mins = calculate_duration_mins(
                    src_stop_data["dep_time"],
                    down_stop_data["arr_time"],
                    src_stop_data["journey_day"],
                    down_stop_data["journey_day"]
                )

                dist_km = round(down_stop_data["distance_km"] - src_stop_data["distance_km"], 1)
                day_offset = down_stop_data["journey_day"] - src_stop_data["journey_day"]

                # Case A: Found Direct Route to Destination
                if down_stn == dest_code:
                    direct_routes.append({
                        "journey_type": "DIRECT",
                        "transfers": 0,
                        "total_duration_mins": duration_mins,
                        "total_duration": f"{duration_mins // 60}h {duration_mins % 60}m",
                        "total_distance_km": dist_km,
                        "legs": [
                            {
                                "leg_number": 1,
                                "train_number": t_num,
                                "train_name": t_name,
                                "from_station": {"code": source_code, "name": timetable.stations[source_code]},
                                "to_station": {"code": dest_code, "name": timetable.stations[dest_code]},
                                "departure_time": src_stop_data["dep_time"],
                                "arrival_time": down_stop_data["arr_time"],
                                "distance_km": dist_km
                            }
                        ]
                    })
                else:
                    # Case B: Store intermediate junction for Round 2
                    if down_stn not in reachable_junctions:
                        reachable_junctions[down_stn] = []

                    reachable_junctions[down_stn].append({
                        "train_number": t_num,
                        "train_name": t_name,
                        "arr_time": down_stop_data["arr_time"],
                        "duration_mins": duration_mins,
                        "distance_km": dist_km,
                        "day_offset": day_offset
                    })

    # Sort direct routes by duration
    direct_routes.sort(key=lambda x: x["total_duration_mins"])

    # ==================== ROUND 2: 1-TRANSFER ROUTES ====================
    for junc_code, junc_arrivals in reachable_junctions.items():
        junc_route_ids = timetable.stop_routes.get(junc_code, [])

        for leg1_info in junc_arrivals:
            arr_at_junc_date = start_date + timedelta(days=leg1_info["day_offset"])
            arr_at_junc_day_name = get_day_of_week_str(arr_at_junc_date)

            for route_id in junc_route_ids:
                route_stops = timetable.routes[route_id]
                if junc_code not in route_stops or dest_code not in route_stops:
                    continue

                junc_idx = route_stops.index(junc_code)
                dest_idx = route_stops.index(dest_code)

                if dest_idx <= junc_idx:
                    continue

                trips = timetable.route_trips[route_id]
                for trip in trips:
                    t2_num = trip["train_number"]
                    if t2_num == leg1_info["train_number"]:
                        continue

                    if not trip["running_days"].get(arr_at_junc_day_name, False):
                        continue

                    junc_stop_data = trip["stops"][junc_idx]
                    dest_stop_data = trip["stops"][dest_idx]

                    leg1_arr_h, leg1_arr_m = parse_time(leg1_info["arr_time"])
                    leg2_dep_h, leg2_dep_m = parse_time(junc_stop_data["dep_time"])

                    leg1_arr_mins = leg1_arr_h * 60 + leg1_arr_m
                    leg2_dep_mins = leg2_dep_h * 60 + leg2_dep_m

                    layover_mins = leg2_dep_mins - leg1_arr_mins
                    if layover_mins < 0:
                        layover_mins += 1440

                    if not (MIN_LAYOVER_MINS <= layover_mins <= MAX_LAYOVER_MINS):
                        continue

                    leg2_duration = calculate_duration_mins(
                        junc_stop_data["dep_time"],
                        dest_stop_data["arr_time"],
                        junc_stop_data["journey_day"],
                        dest_stop_data["journey_day"]
                    )

                    leg2_dist = round(dest_stop_data["distance_km"] - junc_stop_data["distance_km"], 1)
                    total_journey_mins = leg1_info["duration_mins"] + layover_mins + leg2_duration
                    total_dist = round(leg1_info["distance_km"] + leg2_dist, 1)

                    route_payload = {
                        "journey_type": "ONE_TRANSFER",
                        "transfers": 1,
                        "interchange_station": {
                            "code": junc_code,
                            "name": timetable.stations[junc_code],
                            "layover_time": f"{layover_mins // 60}h {layover_mins % 60}m",
                            "layover_minutes": layover_mins
                        },
                        "total_duration_mins": total_journey_mins,
                        "total_duration": f"{total_journey_mins // 60}h {total_journey_mins % 60}m",
                        "total_distance_km": total_dist,
                        "legs": [
                            {
                                "leg_number": 1,
                                "train_number": leg1_info["train_number"],
                                "train_name": leg1_info["train_name"],
                                "from_station": {"code": source_code, "name": timetable.stations[source_code]},
                                "to_station": {"code": junc_code, "name": timetable.stations[junc_code]},
                                "departure_time": leg1_info.get("dep_time", "N/A"),
                                "arrival_time": leg1_info["arr_time"],
                                "distance_km": leg1_info["distance_km"]
                            },
                            {
                                "leg_number": 2,
                                "train_number": t2_num,
                                "train_name": trip["train_name"],
                                "from_station": {"code": junc_code, "name": timetable.stations[junc_code]},
                                "to_station": {"code": dest_code, "name": timetable.stations[dest_code]},
                                "departure_time": junc_stop_data["dep_time"],
                                "arrival_time": dest_stop_data["arr_time"],
                                "distance_km": leg2_dist
                            }
                        ]
                    }
                    route_payload["score"] = calculate_transfer_score(route_payload)
                    transfer_routes.append(route_payload)

    clean_transfer_routes = deduplicate_transfer_routes(transfer_routes)
    clean_transfer_routes.sort(key=lambda x: x["score"])

    combined_results = direct_routes + clean_transfer_routes
    return combined_results[:top_k]