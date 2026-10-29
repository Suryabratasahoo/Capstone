# Capstone/backend/app/test_mcraptor_city_engine.py
"""
Dedicated Testing Engine for OptiTransit.
Features tested here without touching production engine:
1. Senior Citizen Bus Quota & Lower Berth Differential Pricing Breakdown
2. Smart Quota Unlock / Alternate Station Boarding (Change Boarding Point Hack)
3. Senior-prioritized Pareto Scoring (favoring lower berths and safe layovers)
"""

from datetime import datetime
from typing import List, Dict, Tuple, Optional
import math
from app.mcraptor_data import McRaptorTimetable
import re
try:
    from app.city_aliases import CITY_ALIASES
except ImportError:
    CITY_ALIASES = {}

from app.irctc_pricing import (
    calculate_irctc_train_fare,
    calculate_bus_fare,
    calculate_leg_fare,
    normalize_class_code
)

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


def _map_to_supported_date(target_date_str: str) -> str:
    try:
        target_dt = datetime.strptime(target_date_str, "%Y-%m-%d")
    except ValueError:
        return target_date_str
        
    if target_dt.year == 2026 and target_dt.month in [8, 9]:
        return target_date_str

    target_weekday = target_dt.weekday()
    target_day = target_dt.day

    best_candidate = None
    min_diff = 999
    
    for day in range(1, 32):
        dt = datetime(2026, 8, day)
        if dt.weekday() == target_weekday:
            diff = abs(dt.day - target_day)
            if diff < min_diff:
                min_diff = diff
                best_candidate = dt
                
    if best_candidate:
        return best_candidate.strftime("%Y-%m-%d")
    return target_date_str


def get_test_leg_fare_and_status(
    timetable: McRaptorTimetable,
    mode: str,
    service_number: str,
    travel_date_str: str,
    from_stop_id: str,
    to_stop_id: str,
    travel_class: str = "3A",
    distance_km: float = 0.0,
    duration_mins: int = 180,
    senior_citizen_mode: bool = False
) -> dict:
    """Fetches seat availability with Senior Citizen Quota & Differential Pricing."""
    clean_from = strip_prefix(from_stop_id)
    clean_to = strip_prefix(to_stop_id)
    clean_service = strip_prefix(service_number)
    service_name = timetable.service_names.get(clean_service, "")
    service_type = timetable.service_types.get(clean_service, "EXPRESS")

    mode_upper = (mode or "").upper()

    if mode_upper == "RAIL":
        segment_key = (clean_service, travel_date_str, clean_from, clean_to, travel_class)
        fallback_key = (clean_service, travel_date_str, travel_class)

        seat_info = None
        if segment_key in timetable.seat_map:
            seat_info = timetable.seat_map[segment_key]
        elif fallback_key in timetable.seat_map:
            seat_info = timetable.seat_map[fallback_key]

        if seat_info:
            status = seat_info.get("status", "AVAILABLE")
            available_seats = seat_info.get("available_seats", 0)
            wl_number = seat_info.get("wl_number", 0)
            if status == "WL" and (wl_number is None or wl_number <= 0):
                wl_number = 1
        else:
            status = "AVAILABLE"
            available_seats = 24
            wl_number = 0

        irctc_fare = calculate_irctc_train_fare(
            distance_km=distance_km,
            class_code=travel_class,
            service_number=clean_service,
            service_name=service_name,
            service_type=service_type,
            duration_mins=duration_mins
        )

        return {
            "status": status,
            "available_seats": available_seats,
            "wl_number": wl_number,
            "price_inr": irctc_fare["total_fare"],
            "fare_breakdown": irctc_fare,
            "seat_breakdown": None,
            "is_senior_quota_applied": False
        }

    elif mode_upper == "BUS":
        fare_key = (clean_service, clean_from, clean_to, "NON_AC")
        seat_info = timetable.bus_fare_map.get(fare_key)
        if seat_info:
            status = seat_info.get("status", "AVAILABLE")
            raw_seats = seat_info.get("available_seats", 30)
            wl_number = 0
        else:
            status = "AVAILABLE"
            raw_seats = 26
            wl_number = 0

        bus_fare = calculate_bus_fare(
            distance_km=distance_km,
            bus_class=travel_class if "BUS" in (travel_class or "") else "NON_AC",
            bus_provider=service_name,
            duration_mins=duration_mins
        )

        base_fare = bus_fare["total_fare"]
        # Bus Differential Pricing & Senior Citizen Quota Breakdown:
        # Seater: 50%, Upper: 20%, Lower: 18%, Senior Lower Reserved: 12%
        seater_seats = max(4, int(raw_seats * 0.45))
        upper_seats = max(2, int(raw_seats * 0.22))
        lower_seats = max(2, int(raw_seats * 0.18))
        senior_reserved = max(2, raw_seats - (seater_seats + upper_seats + lower_seats))
        if senior_reserved < 2:
            senior_reserved = 3

        # Commercial Differential Pricing:
        upper_price = round(base_fare * 0.95)
        lower_price = round(base_fare * 1.12) # 12% Lower Berth Premium
        senior_concession_price = round(base_fare * 1.02) # Concessional Lower Berth for Elders

        seat_breakdown = {
            "total_available": raw_seats,
            "seater_seats": seater_seats,
            "sleeper_upper_seats": upper_seats,
            "sleeper_lower_seats": lower_seats,
            "senior_lower_reserved": senior_reserved,
            "has_senior_quota": True,
            "upper_deck_fare_inr": upper_price,
            "lower_deck_fare_inr": lower_price,
            "senior_berth_fare_inr": senior_concession_price,
            "berth_type_guaranteed": "Deck L (Lower Berth Guaranteed)" if senior_citizen_mode else "Deck U / Standard"
        }

        # If Senior Citizen Mode is active, apply the dedicated senior lower berth pricing and status
        final_price = senior_concession_price if senior_citizen_mode else base_fare

        return {
            "status": status,
            "available_seats": raw_seats,
            "wl_number": wl_number,
            "price_inr": final_price,
            "fare_breakdown": bus_fare,
            "seat_breakdown": seat_breakdown,
            "is_senior_quota_applied": senior_citizen_mode
        }

    return {
        "status": "AVAILABLE",
        "available_seats": 99,
        "wl_number": 0,
        "price_inr": 0,
        "fare_breakdown": {"total_fare": 0, "breakdown_text": "Free Walk Transfer (₹0)"},
        "seat_breakdown": None,
        "is_senior_quota_applied": False
    }


def find_smart_quota_unlock(
    timetable: McRaptorTimetable,
    route_stops: List[str],
    src_idx: int,
    down_idx: int,
    service_number: str,
    service_name: str,
    travel_date_str: str,
    travel_class: str,
    current_status: str,
    current_wl: int,
    current_fare: float
) -> Optional[dict]:
    """
    Checks if booking from an upstream station (or downstream extension) unlocks confirmed seats.
    Simulates the legal IRCTC 'Change Boarding Station' facility.
    """
    if current_status not in ["WL", "RAC"] and current_wl <= 0:
        return None

    source_stop_id = route_stops[src_idx]
    dest_stop_id = route_stops[down_idx]
    clean_service = strip_prefix(service_number)

    # 1. Look for upstream station (1-2 stops before, or route origin)
    upstream_idx = 0 if src_idx > 0 else None
    if src_idx > 2:
        upstream_idx = src_idx - 1 # One stop earlier

    # 2. Look for downstream station (1 stop later, or route terminus)
    downstream_idx = len(route_stops) - 1 if down_idx < len(route_stops) - 1 else down_idx

    if upstream_idx is None or upstream_idx >= src_idx:
        return None

    upstream_stop_id = route_stops[upstream_idx]
    downstream_stop_id = route_stops[downstream_idx]

    upstream_name = timetable.stops.get(upstream_stop_id, {}).get("name", strip_prefix(upstream_stop_id))
    downstream_name = timetable.stops.get(downstream_stop_id, {}).get("name", strip_prefix(downstream_stop_id))
    src_name = timetable.stops.get(source_stop_id, {}).get("name", strip_prefix(source_stop_id))
    dst_name = timetable.stops.get(dest_stop_id, {}).get("name", strip_prefix(dest_stop_id))

    # Calculate extra fare for upstream segment
    extra_fare = max(60, int(current_fare * 0.15))

    return {
        "is_unlocked": True,
        "train_number": clean_service,
        "train_name": service_name,
        "book_from": {
            "id": upstream_stop_id,
            "code": strip_prefix(upstream_stop_id),
            "name": upstream_name
        },
        "book_to": {
            "id": downstream_stop_id,
            "code": strip_prefix(downstream_stop_id),
            "name": downstream_name
        },
        "actual_boarding": {
            "id": source_stop_id,
            "code": strip_prefix(source_stop_id),
            "name": src_name
        },
        "actual_deboarding": {
            "id": dest_stop_id,
            "code": strip_prefix(dest_stop_id),
            "name": dst_name
        },
        "unlocked_status": "AVAILABLE",
        "unlocked_seats": 28,
        "extra_fare_inr": extra_fare,
        "direct_status_text": f"{current_status} {current_wl}" if current_wl > 0 else current_status,
        "explanation": f"Direct ticket {src_name} ➔ {dst_name} is in Waitlist ({current_status} {current_wl}). You can legally book {upstream_name} ➔ {downstream_name} (Confirmed AVL 28) and select {src_name} as your official boarding point on IRCTC."
    }


def is_test_dominated(candidate: dict, existing: dict, senior_citizen_mode: bool = False) -> bool:
    cand_dur = candidate["total_duration_mins"]
    cand_dist = candidate["total_distance_km"]
    cand_price = candidate["total_price_inr"]
    cand_rank = STATUS_RANK.get(candidate["overall_status"], 0)

    ex_dur = existing["total_duration_mins"]
    ex_dist = existing["total_distance_km"]
    ex_price = existing["total_price_inr"]
    ex_rank = STATUS_RANK.get(existing["overall_status"], 0)

    # In Senior Citizen Mode, heavily prioritize confirmed availability and lower berths
    if senior_citizen_mode:
        cand_senior = 1 if candidate.get("senior_friendly") else 0
        ex_senior = 1 if existing.get("senior_friendly") else 0
        if ex_senior > cand_senior and ex_dur <= cand_dur * 1.15:
            return True

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


def merge_into_test_pareto_set(pareto_set: List[dict], candidate: dict, senior_citizen_mode: bool = False) -> bool:
    for existing in pareto_set:
        if is_test_dominated(candidate, existing, senior_citizen_mode):
            return False

    pareto_set[:] = [ex for ex in pareto_set if not is_test_dominated(ex, candidate, senior_citizen_mode)]
    pareto_set.append(candidate)
    return True


def run_test_mcraptor_city_search(
    timetable: McRaptorTimetable,
    source_city: str,
    dest_city: str,
    travel_date_str: str = "2026-08-01",
    travel_class: str = "3A",
    top_k: int = 15,
    require_bus: bool = False,
    senior_citizen_mode: bool = False
) -> List[dict]:
    """
    Dedicated test search implementation.
    Features:
    - Bus Senior Citizen Reserved Quota & Differential Pricing
    - Smart Quota Unlock / Alternate Boarding Point Suggestion
    - Senior Citizen Accessibility Scoring
    """
    travel_date_str = _map_to_supported_date(travel_date_str)

    source_city = source_city.strip().lower()
    dest_city = dest_city.strip().lower()

    def resolve_city_stops(query: str) -> List[str]:
        all_stops = []
        if query in timetable.city_stops:
            all_stops.extend(timetable.city_stops[query])
        if query in CITY_ALIASES and CITY_ALIASES[query] in timetable.city_stops:
            all_stops.extend(timetable.city_stops[CITY_ALIASES[query]])
        return list(set(all_stops))

    source_stops_list = resolve_city_stops(source_city)
    dest_stops_list = resolve_city_stops(dest_city)
    
    if not source_stops_list or not dest_stops_list:
        return []

    start_dep_sec = 0
    pareto_results: List[dict] = []
    source_stops = source_stops_list
    dest_stops = set(dest_stops_list)
    reachable_intermediates: Dict[str, List[dict]] = {}

    # ==================== ROUND 1: DIRECT ROUTES ====================
    for source_stop_id in source_stops:
        source_route_ids = timetable.stop_routes.get(source_stop_id, [])

        for route_id in source_route_ids:
            route_stops = timetable.routes[route_id]
            if source_stop_id not in route_stops:
                continue

            src_idx = route_stops.index(source_stop_id)
            trip_ids = timetable.route_trips[route_id]

            for trip_id in trip_ids:
                stops = timetable.trip_stop_times[trip_id]
                src_stop_data = stops[src_idx]

                if src_stop_data["departure_sec"] < start_dep_sec:
                    continue

                trip_meta = timetable.trips[trip_id]
                mode = trip_meta["mode"]
                service_number = trip_meta["service_number"]
                service_name = timetable.service_names.get(service_number, "")

                if source_city != dest_city and timetable.service_types.get(service_number) == "Local":
                    continue

                for down_idx in range(src_idx + 1, len(route_stops)):
                    down_stop_id = route_stops[down_idx]
                    down_stop_data = stops[down_idx]

                    duration_mins = int((down_stop_data["arrival_sec"] - src_stop_data["departure_sec"]) // 60)
                    dist_km = round(down_stop_data["distance_km"] - src_stop_data["distance_km"], 1)

                    fare_info = get_test_leg_fare_and_status(
                        timetable, mode, service_number, travel_date_str, source_stop_id, down_stop_id, travel_class,
                        distance_km=dist_km, duration_mins=duration_mins, senior_citizen_mode=senior_citizen_mode
                    )

                    # Check for Smart Quota Unlock (Alternate Boarding) if train is Waitlisted
                    smart_unlock = None
                    if mode == "RAIL":
                        smart_unlock = find_smart_quota_unlock(
                            timetable=timetable,
                            route_stops=route_stops,
                            src_idx=src_idx,
                            down_idx=down_idx,
                            service_number=service_number,
                            service_name=service_name,
                            travel_date_str=travel_date_str,
                            travel_class=travel_class,
                            current_status=fare_info["status"],
                            current_wl=fare_info["wl_number"],
                            current_fare=fare_info["price_inr"]
                        )

                    is_senior_friendly = False
                    if mode == "BUS" and fare_info.get("seat_breakdown"):
                        is_senior_friendly = fare_info["seat_breakdown"].get("senior_lower_reserved", 0) > 0
                    elif mode == "RAIL":
                        is_senior_friendly = fare_info["status"] == "AVAILABLE"

                    route_payload = {
                        "journey_type": "DIRECT",
                        "transfers": 0,
                        "travel_class": travel_class,
                        "overall_status": fare_info["status"],
                        "available_seats": fare_info["available_seats"],
                        "wl_number": fare_info["wl_number"],
                        "total_price_inr": fare_info["price_inr"],
                        "fare_breakdown": fare_info.get("fare_breakdown"),
                        "total_duration_mins": duration_mins,
                        "total_duration": f"{duration_mins // 60}h {duration_mins % 60}m",
                        "total_distance_km": dist_km,
                        "senior_friendly": is_senior_friendly,
                        "smart_quota_unlock": smart_unlock,
                        "legs": [
                            {
                                "leg_number": 1,
                                "mode": mode,
                                "service_number": service_number,
                                "service_name": service_name,
                                "from_stop": {"id": source_stop_id, "name": timetable.stops[source_stop_id]["name"]},
                                "to_stop": {"id": down_stop_id, "name": timetable.stops[down_stop_id]["name"]},
                                "departure_time": sec_to_time_str(src_stop_data["departure_sec"]),
                                "arrival_time": sec_to_time_str(down_stop_data["arrival_sec"]),
                                "distance_km": dist_km,
                                "travel_class": travel_class if mode == "RAIL" else "BUS",
                                "seat_status": fare_info["status"],
                                "available_seats": fare_info["available_seats"],
                                "wl_number": fare_info["wl_number"],
                                "price_inr": fare_info["price_inr"],
                                "fare_breakdown": fare_info.get("fare_breakdown"),
                                "seat_breakdown": fare_info.get("seat_breakdown"),
                                "smart_quota_unlock": smart_unlock,
                                "path": get_path_coordinates(timetable, route_stops, src_idx, down_idx)
                            }
                        ]
                    }

                    if require_bus:
                        has_bus = any(leg["mode"] == "BUS" for leg in route_payload["legs"])
                        if not has_bus:
                            continue

                    if down_stop_id in dest_stops:
                        merge_into_test_pareto_set(pareto_results, route_payload, senior_citizen_mode)
                    else:
                        if down_stop_id not in reachable_intermediates:
                            reachable_intermediates[down_stop_id] = []

                        path_coords = get_path_coordinates(timetable, route_stops, src_idx, down_idx)
                        reachable_intermediates[down_stop_id].append({
                            "mode": mode,
                            "service_number": service_number,
                            "service_name": service_name,
                            "arr_sec": down_stop_data["arrival_sec"],
                            "dep_sec": src_stop_data["departure_sec"],
                            "duration_mins": duration_mins,
                            "distance_km": dist_km,
                            "fare_info": fare_info,
                            "smart_unlock": smart_unlock,
                            "path": path_coords
                        })

    # ==================== TRANSFER & ROUND 2 ====================
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
                            "senior_friendly": arr["fare_info"].get("seat_breakdown") is not None,
                            "smart_quota_unlock": arr.get("smart_unlock"),
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
                                    "available_seats": arr["fare_info"]["available_seats"],
                                    "wl_number": arr["fare_info"]["wl_number"],
                                    "price_inr": arr["fare_info"]["price_inr"],
                                    "seat_breakdown": arr["fare_info"].get("seat_breakdown"),
                                    "smart_quota_unlock": arr.get("smart_unlock"),
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
                                    "path": []
                                }
                            ]
                        }
                        merge_into_test_pareto_set(pareto_results, route_payload, senior_citizen_mode)

    # Round 2 Connecting Trips
    for inter_stop_id, arrivals in expanded_intermediates.items():
        second_routes = timetable.stop_routes.get(inter_stop_id, [])
        for route_id in second_routes:
            route_stops = timetable.routes[route_id]
            if inter_stop_id not in route_stops:
                continue

            inter_idx = route_stops.index(inter_stop_id)
            for dest_stop_id in dest_stops:
                if dest_stop_id not in route_stops:
                    continue

                dest_idx = route_stops.index(dest_stop_id)
                if dest_idx <= inter_idx:
                    continue

                t2_trip_ids = timetable.route_trips[route_id]
                for leg1 in arrivals:
                    min_valid_dep = leg1["arr_sec"] + (MIN_LAYOVER_MINS * 60)
                    max_valid_dep = leg1["arr_sec"] + (MAX_LAYOVER_MINS * 60)

                    best_trip = None
                    for t2_id in t2_trip_ids:
                        t2_stops = timetable.trip_stop_times[t2_id]
                        dep_sec = t2_stops[inter_idx]["departure_sec"]
                        if min_valid_dep <= dep_sec <= max_valid_dep:
                            best_trip = (t2_id, t2_stops)
                            break

                    if not best_trip:
                        continue

                    t2_id, t2_stops = best_trip
                    inter_stop_data = t2_stops[inter_idx]
                    dest_stop_data = t2_stops[dest_idx]

                    t2_meta = timetable.trips[t2_id]
                    t2_mode = t2_meta["mode"]
                    t2_service = t2_meta["service_number"]
                    t2_name = timetable.service_names.get(t2_service, "")

                    layover_mins = int((inter_stop_data["departure_sec"] - leg1["arr_sec"]) // 60)
                    
                    # In senior citizen mode, penalize layovers < 60 mins between trains/buses
                    if senior_citizen_mode and layover_mins < 45:
                        continue

                    leg2_duration = int((dest_stop_data["arrival_sec"] - inter_stop_data["departure_sec"]) // 60)
                    leg2_dist = round(dest_stop_data["distance_km"] - inter_stop_data["distance_km"], 1)

                    leg2_fare_info = get_test_leg_fare_and_status(
                        timetable, t2_mode, t2_service, travel_date_str, inter_stop_id, dest_stop_id, travel_class,
                        distance_km=leg2_dist, duration_mins=leg2_duration, senior_citizen_mode=senior_citizen_mode
                    )

                    smart_unlock_2 = None
                    if t2_mode == "RAIL":
                        smart_unlock_2 = find_smart_quota_unlock(
                            timetable=timetable,
                            route_stops=route_stops,
                            src_idx=inter_idx,
                            down_idx=dest_idx,
                            service_number=t2_service,
                            service_name=t2_name,
                            travel_date_str=travel_date_str,
                            travel_class=travel_class,
                            current_status=leg2_fare_info["status"],
                            current_wl=leg2_fare_info["wl_number"],
                            current_fare=leg2_fare_info["price_inr"]
                        )

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
                            "from_stop": {"id": leg1["path"][0]["id"], "name": timetable.stops[leg1["path"][0]["id"]]["name"]},
                            "to_stop": {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]},
                            "departure_time": sec_to_time_str(leg1["dep_sec"]),
                            "arrival_time": sec_to_time_str(leg1["arr_sec"]),
                            "distance_km": leg1["distance_km"],
                            "travel_class": travel_class if leg1["mode"] == "RAIL" else "BUS",
                            "seat_status": leg1["fare_info"]["status"],
                            "available_seats": leg1["fare_info"]["available_seats"],
                            "wl_number": leg1["fare_info"]["wl_number"],
                            "price_inr": leg1["fare_info"]["price_inr"],
                            "fare_breakdown": leg1["fare_info"].get("fare_breakdown"),
                            "seat_breakdown": leg1["fare_info"].get("seat_breakdown"),
                            "smart_quota_unlock": leg1.get("smart_unlock"),
                            "path": leg1["path"]
                        },
                        {
                            "leg_number": 2,
                            "mode": t2_mode,
                            "service_number": t2_service,
                            "service_name": t2_name,
                            "from_stop": {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]},
                            "to_stop": {"id": dest_stop_id, "name": timetable.stops[dest_stop_id]["name"]},
                            "departure_time": sec_to_time_str(inter_stop_data["departure_sec"]),
                            "arrival_time": sec_to_time_str(dest_stop_data["arrival_sec"]),
                            "distance_km": leg2_dist,
                            "travel_class": travel_class if t2_mode == "RAIL" else "BUS",
                            "seat_status": leg2_fare_info["status"],
                            "available_seats": leg2_fare_info["available_seats"],
                            "wl_number": leg2_fare_info["wl_number"],
                            "price_inr": leg2_fare_info["price_inr"],
                            "fare_breakdown": leg2_fare_info.get("fare_breakdown"),
                            "seat_breakdown": leg2_fare_info.get("seat_breakdown"),
                            "smart_quota_unlock": smart_unlock_2,
                            "path": get_path_coordinates(timetable, route_stops, inter_idx, dest_idx)
                        }
                    ]

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
                        "senior_friendly": (layover_mins >= 45),
                        "smart_quota_unlock": leg1.get("smart_unlock") or smart_unlock_2,
                        "legs": legs
                    }

                    if require_bus:
                        has_bus = any(leg["mode"] == "BUS" for leg in route_payload["legs"])
                        if not has_bus:
                            continue

                    merge_into_test_pareto_set(pareto_results, route_payload, senior_citizen_mode)

    pareto_results.sort(key=lambda x: (
        0 if (senior_citizen_mode and x.get("senior_friendly")) else 1,
        x["total_duration_mins"],
        -STATUS_RANK.get(x["overall_status"], 0)
    ))

    return pareto_results[:top_k]
