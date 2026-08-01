# /app/mcraptor/mcraptor_engine.py
# Capstone/backend/app/mcraptor/mcraptor_engine.py

from datetime import datetime, timedelta
from typing import List, Dict
from app.mcraptor.mcraptor_data import McRaptorTimetable

MIN_LAYOVER_MINS = 45
MAX_LAYOVER_MINS = 360

# Status rank for Pareto dominance comparison
STATUS_RANK = {
    "AVAILABLE": 3,
    "RAC": 2,
    "WL": 1,
    "UNKNOWN": 0
}


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


def is_dominated(candidate: dict, existing: dict) -> bool:
    """
    Pareto Domination Check:
    Returns True if 'existing' is better-or-equal in ALL criteria and strictly better in AT LEAST ONE.
    """
    cand_dur = candidate["total_duration_mins"]
    cand_dist = candidate["total_distance_km"]
    cand_price = candidate["total_price_inr"]
    cand_rank = STATUS_RANK.get(candidate["overall_status"], 0)

    ex_dur = existing["total_duration_mins"]
    ex_dist = existing["total_distance_km"]
    ex_price = existing["total_price_inr"]
    ex_rank = STATUS_RANK.get(existing["overall_status"], 0)

    better_or_equal = (
        ex_dur <= cand_dur and
        ex_dist <= cand_dist and
        ex_price <= cand_price and
        ex_rank >= cand_rank
    )

    strictly_better = (
        ex_dur < cand_dur or
        ex_dist < cand_dist or
        ex_price < cand_price or
        ex_rank > cand_rank
    )

    return better_or_equal and strictly_better


def merge_into_pareto_set(pareto_set: List[dict], candidate: dict) -> bool:
    """
    Attempts to add a candidate route to a Pareto set.
    Prunes dominated entries and returns True if candidate was added.
    """
    for existing in pareto_set:
        if is_dominated(candidate, existing):
            return False

    pareto_set[:] = [ex for ex in pareto_set if not is_dominated(ex, candidate)]
    pareto_set.append(candidate)
    return True


def deduplicate_train_pairs(results: List[dict]) -> List[dict]:
    """
    Deduplicates routes sharing the exact same Train 1 -> Train 2 pair across adjacent junctions,
    keeping only the one with the shortest layover time.
    """
    seen_pairs = {}
    for route in results:
        if route["journey_type"] == "DIRECT":
            t1 = route["legs"][0]["train_number"]
            key = f"DIRECT_{t1}"
            seen_pairs[key] = route
        else:
            t1 = route["legs"][0]["train_number"]
            t2 = route["legs"][1]["train_number"]
            key = f"TRANSFER_{t1}_{t2}"

            if key not in seen_pairs:
                seen_pairs[key] = route
            else:
                existing_layover = seen_pairs[key]["interchange_station"]["layover_minutes"]
                current_layover = route["interchange_station"]["layover_minutes"]
                if current_layover < existing_layover:
                    seen_pairs[key] = route

    return list(seen_pairs.values())


def get_leg_seat_info(
    timetable: McRaptorTimetable,
    train_number: int,
    date_str: str,
    from_code: str,
    to_code: str,
    class_code: str
) -> dict:
    """Fetches seat availability and fare directly from RAM using segment-aware key."""
    segment_key = (train_number, date_str, from_code, to_code, class_code)
    fallback_key = (train_number, date_str, class_code)

    # 1. Try exact segment match from DB
    if segment_key in timetable.seat_map:
        return timetable.seat_map[segment_key]

    # 2. Fall back to train-level status if exact segment isn't explicitly seeded
    if fallback_key in timetable.seat_map:
        return timetable.seat_map[fallback_key]

    # 3. Default fallback
    return {
        "status": "AVAILABLE",
        "available_seats": 20,
        "wl_number": 0,
        "price_inr": 850
    }


def run_mcraptor_search(
    timetable: McRaptorTimetable,
    source_code: str,
    dest_code: str,
    travel_date_str: str,
    class_code: str = "3A",
    top_k: int = 15
) -> List[dict]:
    """
    McRAPTOR Core Search Engine.
    Evaluates Pareto Optimal routes balancing Time, Distance, Price, and Seat Status.
    """
    source_code = source_code.strip().upper()
    dest_code = dest_code.strip().upper()
    class_code = class_code.strip().upper()

    if source_code not in timetable.stations or dest_code not in timetable.stations:
        return []

    start_date = datetime.strptime(travel_date_str, "%Y-%m-%d")
    start_day_name = get_day_of_week_str(start_date)

    pareto_results: List[dict] = []
    source_route_ids = timetable.stop_routes.get(source_code, [])

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

            for down_idx in range(src_idx + 1, len(route_stops)):
                down_stn = route_stops[down_idx]
                down_stop_data = trip["stops"][down_idx]

                # Segment-aware lookup using exact from_code and down_stn
                seat_info = get_leg_seat_info(
                    timetable, t_num, travel_date_str, source_code, down_stn, class_code
                )

                duration_mins = calculate_duration_mins(
                    src_stop_data["dep_time"],
                    down_stop_data["arr_time"],
                    src_stop_data["journey_day"],
                    down_stop_data["journey_day"]
                )

                dist_km = round(down_stop_data["distance_km"] - src_stop_data["distance_km"], 1)
                day_offset = down_stop_data["journey_day"] - src_stop_data["journey_day"]

                route_payload = {
                    "journey_type": "DIRECT",
                    "transfers": 0,
                    "travel_class": class_code,
                    "overall_status": seat_info["status"],
                    "available_seats": seat_info["available_seats"],
                    "wl_number": seat_info["wl_number"],
                    "total_price_inr": seat_info["price_inr"],
                    "total_duration_mins": duration_mins,
                    "total_duration": f"{duration_mins // 60}h {duration_mins % 60}m",
                    "total_distance_km": dist_km,
                    "legs": [
                        {
                            "leg_number": 1,
                            "train_number": t_num,
                            "train_name": t_name,
                            "from_station": {"code": source_code, "name": timetable.stations[source_code]},
                            "to_station": {"code": down_stn, "name": timetable.stations[down_stn]},
                            "departure_time": src_stop_data["dep_time"],
                            "arrival_time": down_stop_data["arr_time"],
                            "distance_km": dist_km,
                            "seat_status": seat_info["status"],
                            "price_inr": seat_info["price_inr"]
                        }
                    ]
                }

                if down_stn == dest_code:
                    merge_into_pareto_set(pareto_results, route_payload)
                else:
                    if down_stn not in reachable_junctions:
                        reachable_junctions[down_stn] = []

                    reachable_junctions[down_stn].append({
                        "train_number": t_num,
                        "train_name": t_name,
                        "dep_time": src_stop_data["dep_time"],
                        "arr_time": down_stop_data["arr_time"],
                        "duration_mins": duration_mins,
                        "distance_km": dist_km,
                        "day_offset": day_offset,
                        "seat_info": seat_info
                    })

    # ==================== ROUND 2: 1-TRANSFER ROUTES ====================
    for junc_code, junc_arrivals in reachable_junctions.items():
        junc_route_ids = timetable.stop_routes.get(junc_code, [])

        for leg1 in junc_arrivals:
            arr_at_junc_date = start_date + timedelta(days=leg1["day_offset"])
            arr_at_junc_date_str = arr_at_junc_date.strftime("%Y-%m-%d")
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
                    if t2_num == leg1["train_number"]:
                        continue

                    if not trip["running_days"].get(arr_at_junc_day_name, False):
                        continue

                    junc_stop_data = trip["stops"][junc_idx]
                    dest_stop_data = trip["stops"][dest_idx]

                    leg1_arr_h, leg1_arr_m = parse_time(leg1["arr_time"])
                    leg2_dep_h, leg2_dep_m = parse_time(junc_stop_data["dep_time"])

                    leg1_arr_mins = leg1_arr_h * 60 + leg1_arr_m
                    leg2_dep_mins = leg2_dep_h * 60 + leg2_dep_m

                    layover_mins = leg2_dep_mins - leg1_arr_mins
                    if layover_mins < 0:
                        layover_mins += 1440

                    if not (MIN_LAYOVER_MINS <= layover_mins <= MAX_LAYOVER_MINS):
                        continue

                    # Segment-aware lookup for Leg 2: junc_code -> dest_code
                    leg2_seat_info = get_leg_seat_info(
                        timetable, t2_num, arr_at_junc_date_str, junc_code, dest_code, class_code
                    )

                    leg2_duration = calculate_duration_mins(
                        junc_stop_data["dep_time"],
                        dest_stop_data["arr_time"],
                        junc_stop_data["journey_day"],
                        dest_stop_data["journey_day"]
                    )
                    leg2_dist = round(dest_stop_data["distance_km"] - junc_stop_data["distance_km"], 1)

                    total_journey_mins = leg1["duration_mins"] + layover_mins + leg2_duration
                    total_dist = round(leg1["distance_km"] + leg2_dist, 1)
                    total_price = leg1["seat_info"]["price_inr"] + leg2_seat_info["price_inr"]

                    rank1 = STATUS_RANK.get(leg1["seat_info"]["status"], 0)
                    rank2 = STATUS_RANK.get(leg2_seat_info["status"], 0)
                    overall_status = leg1["seat_info"]["status"] if rank1 <= rank2 else leg2_seat_info["status"]

                    route_payload = {
                        "journey_type": "ONE_TRANSFER",
                        "transfers": 1,
                        "travel_class": class_code,
                        "overall_status": overall_status,
                        "available_seats": min(leg1["seat_info"]["available_seats"], leg2_seat_info["available_seats"]),
                        "wl_number": max(leg1["seat_info"]["wl_number"], leg2_seat_info["wl_number"]),
                        "total_price_inr": total_price,
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
                                "train_number": leg1["train_number"],
                                "train_name": leg1["train_name"],
                                "from_station": {"code": source_code, "name": timetable.stations[source_code]},
                                "to_station": {"code": junc_code, "name": timetable.stations[junc_code]},
                                "departure_time": leg1["dep_time"],
                                "arrival_time": leg1["arr_time"],
                                "distance_km": leg1["distance_km"],
                                "seat_status": leg1["seat_info"]["status"],
                                "price_inr": leg1["seat_info"]["price_inr"]
                            },
                            {
                                "leg_number": 2,
                                "train_number": t2_num,
                                "train_name": trip["train_name"],
                                "from_station": {"code": junc_code, "name": timetable.stations[junc_code]},
                                "to_station": {"code": dest_code, "name": timetable.stations[dest_code]},
                                "departure_time": junc_stop_data["dep_time"],
                                "arrival_time": dest_stop_data["arr_time"],
                                "distance_km": leg2_dist,
                                "seat_status": leg2_seat_info["status"],
                                "price_inr": leg2_seat_info["price_inr"]
                            }
                        ]
                    }

                    merge_into_pareto_set(pareto_results, route_payload)

    # Deduplicate parallel junction routes sharing the exact same train pair
    pareto_results = deduplicate_train_pairs(pareto_results)

    # Sort final Pareto optimal routes by duration
    pareto_results.sort(key=lambda x: (x["total_duration_mins"], -STATUS_RANK.get(x["overall_status"], 0)))
    return pareto_results[:top_k]