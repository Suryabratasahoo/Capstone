# Capstone/backend/app/mcraptor/mcraptor_engine.py

from datetime import datetime
from typing import List, Dict, Tuple
import math
from app.mcraptor_data import McRaptorTimetable
try:
    from app.city_aliases import CITY_ALIASES
except ImportError:
    CITY_ALIASES = {}

def haversine_distance_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

MIN_LAYOVER_MINS = 30
MAX_LAYOVER_MINS = 360

STATUS_RANK = {
    "AVAILABLE": 3,
    "RAC": 2,
    "WL": 1,
    "UNKNOWN": 0
}


def sec_to_time_str(seconds: int) -> str:
    """Converts continuous seconds into an HH:MM (Day X) format."""
    day = (seconds // 86400) + 1
    rem_sec = seconds % 86400
    hours = rem_sec // 3600
    mins = (rem_sec % 3600) // 60
    return f"{hours:02d}:{mins:02d} (Day {day})"


def strip_prefix(stop_or_service_id: str) -> str:
    """Strips RAIL: or BUS: prefixes for fare queries."""
    if ":" in stop_or_service_id:
        return stop_or_service_id.split(":", 1)[1]
    return stop_or_service_id


def get_path_coordinates(timetable: McRaptorTimetable, route_stops: List[str], start_idx: int, end_idx: int) -> List[dict]:
    path = []
    for i in range(start_idx, end_idx + 1):
        stop_id = route_stops[i]
        stop_data = timetable.stops.get(stop_id, {})
        path.append({
            "id": stop_id,
            "name": stop_data.get("name", ""),
            "latitude": stop_data.get("latitude", 0.0),
            "longitude": stop_data.get("longitude", 0.0)
        })
    return path


def is_dominated(candidate: dict, existing: dict) -> bool:
    # --- Modality check for balanced routing ---
    cand_modes = tuple(leg["mode"] for leg in candidate.get("legs", []))
    ex_modes = tuple(leg["mode"] for leg in existing.get("legs", []))
    
    # Do not allow cross-modal domination (e.g. a Train cannot dominate a Bus out of existence)
    if cand_modes != ex_modes:
        return False

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
    for existing in pareto_set:
        if is_dominated(candidate, existing):
            return False

    pareto_set[:] = [ex for ex in pareto_set if not is_dominated(ex, candidate)]
    pareto_set.append(candidate)
    return True


def get_leg_fare_and_status(
    timetable: McRaptorTimetable,
    mode: str,
    service_number: str,
    travel_date_str: str,
    from_stop_id: str,
    to_stop_id: str,
    travel_class: str = "3A"
) -> dict:
    """Fetches seat availability and pricing for rail or bus legs."""
    clean_from = strip_prefix(from_stop_id)
    clean_to = strip_prefix(to_stop_id)
    clean_service = strip_prefix(service_number)

    if mode == "RAIL":
        segment_key = (clean_service, travel_date_str, clean_from, clean_to, travel_class)
        fallback_key = (clean_service, travel_date_str, travel_class)

        if segment_key in timetable.seat_map:
            return timetable.seat_map[segment_key]
        if fallback_key in timetable.seat_map:
            return timetable.seat_map[fallback_key]
        
        return {"status": "AVAILABLE", "available_seats": 20, "wl_number": 0, "price_inr": 850}

    elif mode == "BUS":
        fare_key = (clean_service, clean_from, clean_to, "NON_AC")
        if fare_key in timetable.bus_fare_map:
            return timetable.bus_fare_map[fare_key]
        
        return {"status": "AVAILABLE", "available_seats": 30, "wl_number": 0, "price_inr": 150}

    return {"status": "AVAILABLE", "available_seats": 99, "wl_number": 0, "price_inr": 0}


def run_mcraptor_city_search(
    timetable: McRaptorTimetable,
    source_city: str,
    dest_city: str,
    departure_time_str: str = "08:00",
    travel_date_str: str = "2026-08-01",
    travel_class: str = "3A",
    top_k: int = 15
) -> List[dict]:
    """
    Unified Multi-Modal McRAPTOR Search Algorithm.
    Supports Train, Bus, and Modal Transfer Footpaths.
    """
    source_city = source_city.strip().lower()
    dest_city = dest_city.strip().lower()

    def resolve_city_stops(query: str) -> List[str]:
        """Collect all stop_ids for any city key that contains the query keyword."""
        # First check for exact match or partial match in city_stops
        all_stops = list(timetable.city_stops.get(query, []))
        for city_key, stops in timetable.city_stops.items():
            if city_key != query and query in city_key:
                all_stops.extend(stops)
                
        # Also include alias mapping if it exists (additive)
        if query in CITY_ALIASES:
            aliased = CITY_ALIASES[query]
            all_stops.extend(timetable.city_stops.get(aliased, []))
            for city_key, stops in timetable.city_stops.items():
                if city_key != aliased and aliased in city_key:
                    all_stops.extend(stops)
                    
        return list(set(all_stops))

    source_stops_list = resolve_city_stops(source_city)
    dest_stops_list = resolve_city_stops(dest_city)

    if not source_stops_list or not dest_stops_list:
        return []

    # Convert HH:MM departure time to seconds from midnight
    dep_h, dep_m = map(int, departure_time_str.split(":"))
    start_dep_sec = (dep_h * 3600) + (dep_m * 60)

    pareto_results: List[dict] = []
    source_stops = source_stops_list
    dest_stops = set(dest_stops_list)
    # Keep track of reachable intermediate stops after Round 1: stop_id -> list of arrival dicts
    reachable_intermediates: Dict[str, List[dict]] = {}

    for source_stop_id in source_stops:
        source_route_ids = timetable.stop_routes.get(source_stop_id, [])

    # ==================== ROUND 1: DIRECT ROUTES ====================
        for route_id in source_route_ids:
            route_stops = timetable.routes[route_id]
            if source_stop_id not in route_stops:
                continue

            src_idx = route_stops.index(source_stop_id)
            trip_ids = timetable.route_trips[route_id]

            for trip_id in trip_ids:
                stops = timetable.trip_stop_times[trip_id]
                src_stop_data = stops[src_idx]

            # Ensure trip departs AFTER the requested start time
                if src_stop_data["departure_sec"] < start_dep_sec:
                    continue

                trip_meta = timetable.trips[trip_id]
                mode = trip_meta["mode"]
                service_number = trip_meta["service_number"]
                
                # Exclude Local buses for intercity searches
                if source_city != dest_city and timetable.service_types.get(service_number) == "Local":
                    continue

                for down_idx in range(src_idx + 1, len(route_stops)):
                    down_stop_id = route_stops[down_idx]
                    down_stop_data = stops[down_idx]

                    duration_mins = int((down_stop_data["arrival_sec"] - src_stop_data["departure_sec"]) // 60)
                    dist_km = round(down_stop_data["distance_km"] - src_stop_data["distance_km"], 1)

                    fare_info = get_leg_fare_and_status(
                        timetable, mode, service_number, travel_date_str, source_stop_id, down_stop_id, travel_class
                    )

                    route_payload = {
                        "journey_type": "DIRECT",
                        "transfers": 0,
                        "travel_class": travel_class,
                        "overall_status": fare_info["status"],
                        "available_seats": fare_info["available_seats"],
                        "wl_number": fare_info["wl_number"],
                        "total_price_inr": fare_info["price_inr"],
                        "total_duration_mins": duration_mins,
                        "total_duration": f"{duration_mins // 60}h {duration_mins % 60}m",
                        "total_distance_km": dist_km,
                        "legs": [
                            {
                                "leg_number": 1,
                                "mode": mode,
                                "service_number": service_number,
                                "service_name": timetable.service_names.get(service_number, ""),
                                "from_stop": {"id": source_stop_id, "name": timetable.stops[source_stop_id]["name"]},
                                "to_stop": {"id": down_stop_id, "name": timetable.stops[down_stop_id]["name"]},
                                "departure_time": sec_to_time_str(src_stop_data["departure_sec"]),
                                "arrival_time": sec_to_time_str(down_stop_data["arrival_sec"]),
                                "distance_km": dist_km,
                                "seat_status": fare_info["status"],
                                "price_inr": fare_info["price_inr"],
                                "path": get_path_coordinates(timetable, route_stops, src_idx, down_idx)
                            }
                        ]
                    }

                    if down_stop_id in dest_stops:
                        merge_into_pareto_set(pareto_results, route_payload)
                    else:
                        if down_stop_id not in reachable_intermediates:
                            reachable_intermediates[down_stop_id] = []

                        try:
                            path_coords = get_path_coordinates(timetable, route_stops, src_idx, down_idx)
                        except IndexError as e:
                            print(f"IndexError in get_path_coordinates! len(route_stops)={len(route_stops)}, src_idx={src_idx}, down_idx={down_idx}")
                            raise e

                        reachable_intermediates[down_stop_id].append({
                            "mode": mode,
                            "service_number": service_number,
                            "service_name": timetable.service_names.get(service_number, ""),
                            "arr_sec": down_stop_data["arrival_sec"],
                            "dep_sec": src_stop_data["departure_sec"],
                            "duration_mins": duration_mins,
                            "distance_km": dist_km,
                            "fare_info": fare_info,
                            "path": path_coords
                        })

    # ==================== FOOTPATH / TRANSFER STEP ====================
    # Expand reachable intermediate stops with transfers
    expanded_intermediates: Dict[str, List[dict]] = {}
    for k, v in reachable_intermediates.items():
        expanded_intermediates[k] = list(v)

    for inter_stop_id, arrivals in reachable_intermediates.items():
        if inter_stop_id in timetable.transfers:
            for xfer in timetable.transfers[inter_stop_id]:
                target_stop_id = xfer["to_stop_id"]
                xfer_sec = xfer["transfer_time_sec"]

                if target_stop_id not in expanded_intermediates:
                    expanded_intermediates[target_stop_id] = []

                for arr in arrivals:
                    if target_stop_id in dest_stops:
                        walk_mins = xfer_sec // 60
                        total_mins = arr["duration_mins"] + walk_mins
                        
                        route_payload = {
                            "journey_type": "DIRECT",
                            "transfers": 0,
                            "travel_class": travel_class,
                            "overall_status": arr["fare_info"]["status"],
                            "available_seats": arr["fare_info"]["available_seats"],
                            "wl_number": arr["fare_info"]["wl_number"],
                            "total_price_inr": arr["fare_info"]["price_inr"],
                            "total_duration_mins": total_mins,
                            "total_duration": f"{total_mins // 60}h {total_mins % 60}m",
                            "total_distance_km": round(arr["distance_km"] + xfer["walk_distance_km"], 1),
                            "legs": [
                                {
                                    "leg_number": 1,
                                    "mode": arr["mode"],
                                    "service_number": arr["service_number"],
                                    "service_name": arr.get("service_name", ""),
                                    "from_stop": {"id": arr["path"][0]["id"], "name": arr["path"][0]["name"]} if arr.get("path") else {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]},
                                    "to_stop": {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]},
                                    "departure_time": sec_to_time_str(arr["dep_sec"]),
                                    "arrival_time": sec_to_time_str(arr["arr_sec"]),
                                    "distance_km": arr["distance_km"],
                                    "seat_status": arr["fare_info"]["status"],
                                    "price_inr": arr["fare_info"]["price_inr"],
                                    "path": arr.get("path", [])
                                },
                                {
                                    "leg_number": 2,
                                    "mode": xfer["transfer_mode"],
                                    "service_number": "TRANSFER",
                                    "service_name": "Walk",
                                    "from_stop": {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]},
                                    "to_stop": {"id": target_stop_id, "name": timetable.stops[target_stop_id]["name"]},
                                    "departure_time": sec_to_time_str(arr["arr_sec"]),
                                    "arrival_time": sec_to_time_str(arr["arr_sec"] + xfer_sec),
                                    "distance_km": xfer["walk_distance_km"],
                                    "seat_status": "N/A",
                                    "price_inr": 0,
                                    "path": [
                                        {
                                            "id": inter_stop_id, 
                                            "name": timetable.stops[inter_stop_id]["name"],
                                            "latitude": timetable.stops[inter_stop_id].get("latitude", 0.0),
                                            "longitude": timetable.stops[inter_stop_id].get("longitude", 0.0)
                                        },
                                        {
                                            "id": target_stop_id, 
                                            "name": timetable.stops[target_stop_id]["name"],
                                            "latitude": timetable.stops[target_stop_id].get("latitude", 0.0),
                                            "longitude": timetable.stops[target_stop_id].get("longitude", 0.0)
                                        }
                                    ]
                                }
                            ]
                        }
                        merge_into_pareto_set(pareto_results, route_payload)

                    expanded_intermediates[target_stop_id].append({
                        "mode": arr["mode"],
                        "service_number": arr["service_number"],
                        "service_name": arr.get("service_name", ""),
                        "arr_sec": arr["arr_sec"] + xfer_sec,  # Ready after transfer time
                        "dep_sec": arr["dep_sec"],
                        "duration_mins": arr["duration_mins"] + (xfer_sec // 60),
                        "distance_km": round(arr["distance_km"] + xfer["walk_distance_km"], 1),
                        "fare_info": arr["fare_info"],
                        "path": arr.get("path", []),
                        "transfer_info": {
                            "from_stop": inter_stop_id,
                            "to_stop": target_stop_id,
                            "transfer_time_mins": xfer_sec // 60,
                            "walk_distance_km": xfer["walk_distance_km"],
                            "transfer_mode": xfer["transfer_mode"]
                        }
                    })

    # ==================== ROUND 2: 1-TRANSFER ROUTES ====================
    for inter_stop_id, arrivals in expanded_intermediates.items():
        inter_route_ids = timetable.stop_routes.get(inter_stop_id, [])

        for leg1 in arrivals:
            for route_id in inter_route_ids:
                route_stops = timetable.routes[route_id]
                if inter_stop_id not in route_stops:
                    continue

                inter_idx = route_stops.index(inter_stop_id)
                
                # Check if this route eventually hits ANY destination stop
                found_dest = False
                dest_idx = -1
                dest_stop_id = None
                for d_idx in range(inter_idx + 1, len(route_stops)):
                    if route_stops[d_idx] in dest_stops:
                        dest_idx = d_idx
                        dest_stop_id = route_stops[d_idx]
                        found_dest = True
                        break
                
                if not found_dest:
                    continue

                trip_ids = timetable.route_trips[route_id]
                for trip_id in trip_ids:
                    stops = timetable.trip_stop_times[trip_id]
                    inter_stop_data = stops[inter_idx]
                    dest_stop_data = stops[dest_idx]

                    trip_meta = timetable.trips[trip_id]
                    t2_service = trip_meta["service_number"]
                    t2_mode = trip_meta["mode"]

                    # Exclude Local buses for intercity searches
                    if source_city != dest_city and timetable.service_types.get(t2_service) == "Local":
                        continue

                    if t2_service == leg1["service_number"]:
                        continue

                    # Layover evaluation in continuous seconds
                    layover_sec = inter_stop_data["departure_sec"] - leg1["arr_sec"]
                    layover_mins = layover_sec // 60

                    if not (MIN_LAYOVER_MINS <= layover_mins <= MAX_LAYOVER_MINS):
                        continue

                    # Anti-Backtracking Check using Haversine Triangle Inequality
                    actual_source_id = leg1["path"][0]["id"]
                    source_lat = timetable.stops[actual_source_id].get("latitude", 0)
                    source_lon = timetable.stops[actual_source_id].get("longitude", 0)
                    dest_lat = timetable.stops[dest_stop_id].get("latitude", 0)
                    dest_lon = timetable.stops[dest_stop_id].get("longitude", 0)
                    inter_lat = timetable.stops[inter_stop_id].get("latitude", 0)
                    inter_lon = timetable.stops[inter_stop_id].get("longitude", 0)
                    
                    if source_lat and dest_lat and inter_lat:
                        d1 = haversine_distance_km(source_lat, source_lon, inter_lat, inter_lon)
                        d2 = haversine_distance_km(inter_lat, inter_lon, dest_lat, dest_lon)
                        d_direct = haversine_distance_km(source_lat, source_lon, dest_lat, dest_lon)
                        
                        # If the transfer takes you more than 2x the direct distance out of the way, reject it
                        if d_direct > 10 and (d1 + d2) > (d_direct * 2.0):
                            continue

                    leg2_fare_info = get_leg_fare_and_status(
                        timetable, t2_mode, t2_service, travel_date_str, inter_stop_id, dest_stop_id, travel_class
                    )

                    leg2_duration = int((dest_stop_data["arrival_sec"] - inter_stop_data["departure_sec"]) // 60)
                    leg2_dist = round(dest_stop_data["distance_km"] - inter_stop_data["distance_km"], 1)

                    total_mins = leg1["duration_mins"] + layover_mins + leg2_duration
                    total_dist = round(leg1["distance_km"] + leg2_dist, 1)
                    total_price = leg1["fare_info"]["price_inr"] + leg2_fare_info["price_inr"]

                    rank1 = STATUS_RANK.get(leg1["fare_info"]["status"], 0)
                    rank2 = STATUS_RANK.get(leg2_fare_info["status"], 0)
                    overall_status = leg1["fare_info"]["status"] if rank1 <= rank2 else leg2_fare_info["status"]

                    legs = [
                        {
                            "leg_number": 1,
                            "mode": leg1["mode"],
                            "service_number": leg1["service_number"],
                            "service_name": leg1.get("service_name", ""),
                            "from_stop": {"id": actual_source_id, "name": timetable.stops[actual_source_id]["name"]},
                            "to_stop": {"id": leg1.get("transfer_info", {}).get("from_stop", inter_stop_id), 
                                        "name": timetable.stops[leg1.get("transfer_info", {}).get("from_stop", inter_stop_id)]["name"]},
                            "departure_time": sec_to_time_str(leg1["dep_sec"]),
                            "arrival_time": sec_to_time_str(leg1["arr_sec"]),
                            "distance_km": leg1["distance_km"],
                            "seat_status": leg1["fare_info"]["status"],
                            "price_inr": leg1["fare_info"]["price_inr"],
                            "path": leg1["path"]
                        }
                    ]

                    # Append modal transfer leg if present
                    if "transfer_info" in leg1:
                        xfer = leg1["transfer_info"]
                        legs.append({
                            "leg_number": 2,
                            "mode": xfer["transfer_mode"],
                            "service_number": "TRANSFER",
                            "service_name": "Walk",
                            "from_stop": {"id": xfer["from_stop"], "name": timetable.stops[xfer["from_stop"]]["name"]},
                            "to_stop": {"id": xfer["to_stop"], "name": timetable.stops[xfer["to_stop"]]["name"]},
                            "departure_time": sec_to_time_str(leg1["arr_sec"] - (xfer["transfer_time_mins"] * 60)),
                            "arrival_time": sec_to_time_str(leg1["arr_sec"]),
                            "distance_km": xfer["walk_distance_km"],
                            "seat_status": "N/A",
                            "price_inr": 0,
                            "path": [
                                {
                                    "id": xfer["from_stop"], 
                                    "name": timetable.stops[xfer["from_stop"]]["name"],
                                    "latitude": timetable.stops[xfer["from_stop"]].get("latitude", 0.0),
                                    "longitude": timetable.stops[xfer["from_stop"]].get("longitude", 0.0)
                                },
                                {
                                    "id": xfer["to_stop"], 
                                    "name": timetable.stops[xfer["to_stop"]]["name"],
                                    "latitude": timetable.stops[xfer["to_stop"]].get("latitude", 0.0),
                                    "longitude": timetable.stops[xfer["to_stop"]].get("longitude", 0.0)
                                }
                            ]
                        })

                    legs.append({
                        "leg_number": len(legs) + 1,
                        "mode": t2_mode,
                        "service_number": t2_service,
                        "service_name": timetable.service_names.get(t2_service, ""),
                        "from_stop": {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]},
                        "to_stop": {"id": dest_stop_id, "name": timetable.stops[dest_stop_id]["name"]},
                        "departure_time": sec_to_time_str(inter_stop_data["departure_sec"]),
                        "arrival_time": sec_to_time_str(dest_stop_data["arrival_sec"]),
                        "distance_km": leg2_dist,
                        "seat_status": leg2_fare_info["status"],
                        "price_inr": leg2_fare_info["price_inr"],
                        "path": get_path_coordinates(timetable, route_stops, inter_idx, dest_idx)
                    })

                    route_payload = {
                        "journey_type": "ONE_TRANSFER",
                        "transfers": 1,
                        "travel_class": travel_class,
                        "overall_status": overall_status,
                        "available_seats": min(leg1["fare_info"]["available_seats"], leg2_fare_info["available_seats"]),
                        "wl_number": max(leg1["fare_info"]["wl_number"], leg2_fare_info["wl_number"]),
                        "total_price_inr": total_price,
                        "interchange_station": {
                            "code": inter_stop_id,
                            "name": timetable.stops[inter_stop_id]["name"],
                            "layover_time": f"{layover_mins // 60}h {layover_mins % 60}m",
                            "layover_minutes": layover_mins
                        },
                        "total_duration_mins": total_mins,
                        "total_duration": f"{total_mins // 60}h {total_mins % 60}m",
                        "total_distance_km": total_dist,
                        "legs": legs
                    }

                    merge_into_pareto_set(pareto_results, route_payload)

    pareto_results.sort(key=lambda x: (x["total_duration_mins"], -STATUS_RANK.get(x["overall_status"], 0)))
    
    # Guarantee at least 5 bus routes in top_k if they exist
    buses = [r for r in pareto_results if r["legs"][0]["mode"] == "BUS"]
    trains = [r for r in pareto_results if r["legs"][0]["mode"] != "BUS"]
    
    if not buses:
        return pareto_results[:top_k]
        
    guaranteed = min(5, top_k)
    buses_to_include = buses[:guaranteed]
    remaining = trains + buses[guaranteed:]
    remaining.sort(key=lambda x: (x["total_duration_mins"], -STATUS_RANK.get(x["overall_status"], 0)))
    
    final_results = buses_to_include + remaining[:(top_k - len(buses_to_include))]
    final_results.sort(key=lambda x: (x["total_duration_mins"], -STATUS_RANK.get(x["overall_status"], 0)))
    
    return final_results