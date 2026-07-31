# app/search_engine.py

from datetime import datetime, timedelta
from app.graph_builder import RailwayGraph

MIN_LAYOVER_MINS = 45     # Minimum layover at transfer station
MAX_LAYOVER_MINS = 360    # Maximum layover at transfer station (6 hours)


def parse_time(time_str: str):
    """Converts 'HH:MM' string to (hours, minutes) tuple."""
    if not time_str or time_str.upper() in ["SOURCE", "DESTINATION", "N/A"]:
        return 0, 0
    parts = time_str.split(":")
    return int(parts[0]), int(parts[1])


def calculate_duration_mins(dep_time_str: str, arr_time_str: str, day_dep: int, day_arr: int) -> int:
    """Calculates travel duration in minutes accounting for day offsets."""
    dep_h, dep_m = parse_time(dep_time_str)
    arr_h, arr_m = parse_time(arr_time_str)

    dep_total = dep_h * 60 + dep_m
    arr_total = arr_h * 60 + arr_m

    days_elapsed = day_arr - day_dep
    total_duration = (days_elapsed * 1440) + (arr_total - dep_total)
    return max(total_duration, 0)


def get_day_of_week_str(dt_obj: datetime) -> str:
    """Returns 3-letter uppercase day name for a datetime object."""
    days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    return days[dt_obj.weekday()]


def calculate_transfer_score(route: dict) -> float:
    """
    Ranks 1-transfer routes using a multi-factor penalty score:
    - Base: Total travel time (minutes)
    - Layover Quality Penalty: Adds penalty for tight layovers (<60 mins)
    """
    score = float(route["total_duration_mins"])
    layover = route["interchange_station"]["layover_minutes"]
    
    if layover < 60:
        score += (60 - layover) * 2.0
        
    return score


def get_all_downstream_stations(graph: RailwayGraph, start_code: str, train_num: int, current_day_name: str):
    """Follows a train forward from start_code to collect all downstream stations."""
    downstream = []
    curr = start_code

    outgoing = [e for e in graph.get_outgoing_edges(curr) if e["train_number"] == train_num]
    if not outgoing or not outgoing[0]["running_days"].get(current_day_name, False):
        return downstream

    start_edge = outgoing[0]
    accumulated_dist = 0.0

    while True:
        edges = [e for e in graph.get_outgoing_edges(curr) if e["train_number"] == train_num]
        if not edges:
            break

        edge = edges[0]
        accumulated_dist += edge["distance_km"]
        next_stn = edge["to_station"]

        duration_mins = calculate_duration_mins(
            start_edge["dep_time"],
            edge["arr_time"],
            start_edge["journey_day_dep"],
            edge["journey_day_arr"]
        )

        day_offset = edge["journey_day_arr"] - start_edge["journey_day_dep"]

        downstream.append({
            "station_code": next_stn,
            "arr_time": edge["arr_time"],
            "dep_time_from_start": start_edge["dep_time"],
            "duration_mins": duration_mins,
            "distance_km": round(accumulated_dist, 1),
            "day_offset": day_offset,
            "train_name": start_edge["train_name"]
        })
        curr = next_stn

    return downstream


def deduplicate_transfer_routes(transfer_routes: list) -> list:
    """
    De-duplicates routes that use the exact same Train 1 and Train 2 pair.
    Keeps only the single best interchange station for that pair.
    """
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


def find_routes(graph: RailwayGraph, source_code: str, dest_code: str, travel_date_str: str, max_transfers: int = 1, top_k: int = 15):
    """
    Unified Route Finder with Strict Direct Priority and Transfer De-duplication.
    """
    source_code = source_code.strip().upper()
    dest_code = dest_code.strip().upper()

    if source_code not in graph.nodes or dest_code not in graph.nodes:
        return []

    start_date = datetime.strptime(travel_date_str, "%Y-%m-%d")
    start_day_name = get_day_of_week_str(start_date)

    direct_routes = []
    transfer_routes = []

    # STAGE 1: DIRECT ROUTES
    source_edges = graph.get_outgoing_edges(source_code)
    trains_at_source = {e["train_number"]: e for e in source_edges}

    for t_num, start_edge in trains_at_source.items():
        if not start_edge["running_days"].get(start_day_name, False):
            continue

        downstream = get_all_downstream_stations(graph, source_code, t_num, start_day_name)
        for stn in downstream:
            if stn["station_code"] == dest_code:
                direct_routes.append({
                    "journey_type": "DIRECT",
                    "transfers": 0,
                    "total_duration_mins": stn["duration_mins"],
                    "total_duration": f"{stn['duration_mins'] // 60}h {stn['duration_mins'] % 60}m",
                    "total_distance_km": stn["distance_km"],
                    "legs": [
                        {
                            "leg_number": 1,
                            "train_number": t_num,
                            "train_name": start_edge["train_name"],
                            "from_station": {"code": source_code, "name": graph.nodes[source_code]["name"]},
                            "to_station": {"code": dest_code, "name": graph.nodes[dest_code]["name"]},
                            "departure_time": start_edge["dep_time"],
                            "arrival_time": stn["arr_time"],
                            "distance_km": stn["distance_km"]
                        }
                    ]
                })

    direct_routes.sort(key=lambda x: x["total_duration_mins"])

    if max_transfers == 0:
        return direct_routes[:top_k]

    # STAGE 2: ONE-TRANSFER ROUTES
    for t1_num, leg1_start_edge in trains_at_source.items():
        if not leg1_start_edge["running_days"].get(start_day_name, False):
            continue

        leg1_destinations = get_all_downstream_stations(graph, source_code, t1_num, start_day_name)

        for junction in leg1_destinations:
            x_code = junction["station_code"]
            if x_code == dest_code:
                continue

            junction_edges = graph.get_outgoing_edges(x_code)
            if len(junction_edges) < 2:
                continue

            arr_at_x_date = start_date + timedelta(days=junction["day_offset"])
            arr_at_x_day_name = get_day_of_week_str(arr_at_x_date)

            trains_at_x = {e["train_number"]: e for e in junction_edges if e["train_number"] != t1_num}

            for t2_num, leg2_start_edge in trains_at_x.items():
                if not leg2_start_edge["running_days"].get(arr_at_x_day_name, False):
                    continue

                leg1_arr_h, leg1_arr_m = parse_time(junction["arr_time"])
                leg2_dep_h, leg2_dep_m = parse_time(leg2_start_edge["dep_time"])

                leg1_arr_mins = leg1_arr_h * 60 + leg1_arr_m
                leg2_dep_mins = leg2_dep_h * 60 + leg2_dep_m

                layover_mins = leg2_dep_mins - leg1_arr_mins
                if layover_mins < 0:
                    layover_mins += 1440

                if not (MIN_LAYOVER_MINS <= layover_mins <= MAX_LAYOVER_MINS):
                    continue

                leg2_destinations = get_all_downstream_stations(graph, x_code, t2_num, arr_at_x_day_name)
                for final_stn in leg2_destinations:
                    if final_stn["station_code"] == dest_code:
                        total_journey_mins = junction["duration_mins"] + layover_mins + final_stn["duration_mins"]
                        total_dist = round(junction["distance_km"] + final_stn["distance_km"], 1)

                        route_payload = {
                            "journey_type": "ONE_TRANSFER",
                            "transfers": 1,
                            "interchange_station": {
                                "code": x_code,
                                "name": graph.nodes[x_code]["name"],
                                "layover_time": f"{layover_mins // 60}h {layover_mins % 60}m",
                                "layover_minutes": layover_mins
                            },
                            "total_duration_mins": total_journey_mins,
                            "total_duration": f"{total_journey_mins // 60}h {total_journey_mins % 60}m",
                            "total_distance_km": total_dist,
                            "legs": [
                                {
                                    "leg_number": 1,
                                    "train_number": t1_num,
                                    "train_name": leg1_start_edge["train_name"],
                                    "from_station": {"code": source_code, "name": graph.nodes[source_code]["name"]},
                                    "to_station": {"code": x_code, "name": graph.nodes[x_code]["name"]},
                                    "departure_time": leg1_start_edge["dep_time"],
                                    "arrival_time": junction["arr_time"],
                                    "distance_km": junction["distance_km"]
                                },
                                {
                                    "leg_number": 2,
                                    "train_number": t2_num,
                                    "train_name": leg2_start_edge["train_name"],
                                    "from_station": {"code": x_code, "name": graph.nodes[x_code]["name"]},
                                    "to_station": {"code": dest_code, "name": graph.nodes[dest_code]["name"]},
                                    "departure_time": leg2_start_edge["dep_time"],
                                    "arrival_time": final_stn["arr_time"],
                                    "distance_km": final_stn["distance_km"]
                                }
                            ]
                        }
                        route_payload["score"] = calculate_transfer_score(route_payload)
                        transfer_routes.append(route_payload)

    clean_transfer_routes = deduplicate_transfer_routes(transfer_routes)
    clean_transfer_routes.sort(key=lambda x: x["score"])

    combined_results = direct_routes + clean_transfer_routes
    return combined_results[:top_k]