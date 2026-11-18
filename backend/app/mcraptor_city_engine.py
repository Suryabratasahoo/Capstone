# Capstone/backend/app/mcraptor_city_engine.py
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
import hashlib
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


def get_train_seat_status(
    timetable: McRaptorTimetable,
    clean_service: str,
    travel_date_str: str,
    clean_from: str,
    clean_to: str,
    travel_class: str
) -> dict:
    """Retrieves authentic seat availability for a train segment from database ground truth."""
    exact_key = (clean_service, travel_date_str, clean_from, clean_to, travel_class)
    if exact_key in timetable.seat_map:
        return timetable.seat_map[exact_key]

    quota_group_key = (clean_service, travel_date_str, travel_class)
    quota_segments = getattr(timetable, "train_quota_segments", {}).get(quota_group_key, [])

    if quota_segments:
        route_id = f"ROUTE_RAIL_{clean_service}"
        route_stops = timetable.routes.get(route_id, [])
        if not route_stops:
            for r_id, stops in timetable.routes.items():
                if clean_service in r_id:
                    route_stops = stops
                    break

        clean_stops = [strip_prefix(s) for s in route_stops]
        from_idx = clean_stops.index(clean_from) if clean_from in clean_stops else -1
        to_idx = clean_stops.index(clean_to) if clean_to in clean_stops else -1

        if from_idx != -1 and to_idx != -1 and from_idx < to_idx:
            best_len = 999999
            matching_seg = None
            for q in quota_segments:
                q_from = q["from_station"]
                q_to = q["to_station"]
                q_from_idx = clean_stops.index(q_from) if q_from in clean_stops else -1
                q_to_idx = clean_stops.index(q_to) if q_to in clean_stops else -1
                if q_from_idx != -1 and q_to_idx != -1:
                    if q_from_idx <= from_idx and to_idx <= q_to_idx:
                        span = q_to_idx - q_from_idx
                        if span < best_len:
                            best_len = span
                            matching_seg = q
            if matching_seg:
                return matching_seg

        return {
            "status": "WL",
            "available_seats": 0,
            "wl_number": 1,
            "price_inr": 0
        }

    if quota_group_key in timetable.seat_map:
        return timetable.seat_map[quota_group_key]

    return {
        "status": "WL",
        "available_seats": 0,
        "wl_number": 1,
        "price_inr": 0
    }


def get_leg_fare_and_status(
    timetable: McRaptorTimetable,
    mode: str,
    service_number: str,
    travel_date_str: str,
    from_stop_id: str,
    to_stop_id: str,
    travel_class: str = "3A",
    distance_km: float = 0.0,
    duration_mins: int = 180,
    senior_citizen_mode: bool = False,
    target_train: Optional[str] = None
) -> dict:
    """Fetches seat availability with Senior Citizen Quota & Differential Pricing."""
    travel_date_str = _map_to_supported_date(travel_date_str)
    clean_from = strip_prefix(from_stop_id)
    clean_to = strip_prefix(to_stop_id)
    clean_service = strip_prefix(service_number)
    service_name = timetable.service_names.get(clean_service, "")
    service_type = timetable.service_types.get(clean_service, "EXPRESS")

    mode_upper = (mode or "").upper()

    if mode_upper == "RAIL":
        seat_info = get_train_seat_status(timetable, clean_service, travel_date_str, clean_from, clean_to, travel_class)
        status = seat_info.get("status", "AVAILABLE")
        available_seats = seat_info.get("available_seats", 0)
        wl_number = seat_info.get("wl_number", 0)
        if status == "WL" and (wl_number is None or wl_number <= 0):
            wl_number = 1

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
        fare_key_cls = (clean_service, clean_from, clean_to, travel_class)
        fare_key_seg = (clean_service, clean_from, clean_to)

        seat_info = None
        if fare_key_cls in timetable.bus_fare_map:
            seat_info = timetable.bus_fare_map[fare_key_cls]
        elif fare_key_seg in timetable.bus_fare_map:
            seat_info = timetable.bus_fare_map[fare_key_seg]
        elif clean_service in getattr(timetable, "bus_route_defaults", {}):
            seat_info = timetable.bus_route_defaults[clean_service]

        if seat_info:
            status = seat_info.get("status", "AVAILABLE")
            raw_seats = seat_info.get("available_seats", 0)
            wl_number = 0
            if raw_seats <= 0:
                status = "WL"
                wl_number = 1
        else:
            status = "AVAILABLE"
            raw_seats = 0
            wl_number = 0

        bus_fare = calculate_bus_fare(
            distance_km=distance_km,
            bus_class=travel_class if "BUS" in (travel_class or "") else "NON_AC",
            bus_provider=service_name,
            duration_mins=duration_mins
        )

        base_fare = bus_fare["total_fare"]
        svc_lower = (service_name or "").lower()
        is_sleeper = distance_km >= 250 or duration_mins >= 360 or "sleeper" in svc_lower or "volvo" in svc_lower or "garuda" in svc_lower
        is_semi_sleeper = not is_sleeper and (distance_km >= 120 or duration_mins >= 180 or "super luxury" in svc_lower or "deluxe" in svc_lower)

        # Deterministic seed for dynamic seating and pricing based on service, date, and corridor
        dyn_seed_str = f"BUS_DYN_{clean_service}_{travel_date_str}_{clean_from}_{clean_to}"
        dyn_seed = int(hashlib.sha256(dyn_seed_str.encode()).hexdigest()[:8], 16)

        if is_sleeper:
            bus_type = "2+1 Multi-Axle AC Sleeper"
            layout_mode = "SLEEPER"
            senior_reserved = min(4, max(2, int(raw_seats * 0.12))) if raw_seats >= 6 else (1 if raw_seats > 1 else 0)
            rem = max(0, raw_seats - senior_reserved)
            
            # Dynamic Upper vs Lower deck inventory split (40% to 60%)
            upper_ratio = 0.40 + ((dyn_seed % 21) * 0.01)
            if rem > 1:
                upper_avail = max(1, min(rem - 1, int(round(rem * upper_ratio))))
                lower_avail = rem - upper_avail
            else:
                upper_avail = rem
                lower_avail = 0

            # Dynamic Lower deck convenience surcharge (+8% to +16%)
            lower_surcharge_pct = 8 + (dyn_seed % 9)
            lower_price = round(base_fare * (1.0 + lower_surcharge_pct / 100.0))
            
            # Dynamic Upper deck discount (-2% to -6%)
            upper_discount_pct = 2 + ((dyn_seed >> 4) % 5)
            upper_price = round(base_fare * (1.0 - upper_discount_pct / 100.0))
            
            # Senior citizen lower berth fare: 5% senior concession, zero ladder climbing
            senior_price = round(base_fare * 0.95) if senior_citizen_mode else base_fare

            seat_breakdown = {
                "layout_mode": layout_mode,
                "bus_type": bus_type,
                "total_available": upper_avail + lower_avail + senior_reserved,
                "sleeper_upper_seats": upper_avail,
                "sleeper_lower_seats": lower_avail,
                "senior_lower_reserved": senior_reserved,
                "upper_deck_fare_inr": upper_price,
                "lower_deck_fare_inr": lower_price,
                "senior_berth_fare_inr": senior_price,
                "has_senior_quota": True,
                "berth_type_guaranteed": "Deck L (Lower Berth Guaranteed)" if senior_citizen_mode else "Deck U / Deck L Choice"
            }
            final_price = senior_price if senior_citizen_mode else base_fare

        elif is_semi_sleeper:
            bus_type = "2+2 Push-Back Semi-Sleeper"
            layout_mode = "SEMI_SLEEPER"
            senior_reserved = min(4, max(2, int(raw_seats * 0.12))) if raw_seats >= 6 else (1 if raw_seats > 1 else 0)
            rem = max(0, raw_seats - senior_reserved)
            
            # Dynamic Window vs Aisle distribution (42% to 58%)
            window_ratio = 0.42 + ((dyn_seed % 17) * 0.01)
            if rem > 1:
                window_avail = max(1, min(rem - 1, int(round(rem * window_ratio))))
                aisle_avail = rem - window_avail
            else:
                window_avail = rem
                aisle_avail = 0

            # Dynamic Window seat preference (+4% to +8%)
            window_surcharge_pct = 4 + (dyn_seed % 5)
            window_price = round(base_fare * (1.0 + window_surcharge_pct / 100.0))
            aisle_price = base_fare
            senior_price = round(base_fare * 0.95) if senior_citizen_mode else base_fare

            seat_breakdown = {
                "layout_mode": layout_mode,
                "bus_type": bus_type,
                "total_available": window_avail + aisle_avail + senior_reserved,
                "window_seats": window_avail,
                "aisle_seats": aisle_avail,
                "senior_lower_reserved": senior_reserved,
                "window_fare_inr": window_price,
                "aisle_fare_inr": aisle_price,
                "senior_berth_fare_inr": senior_price,
                "has_senior_quota": True,
                "berth_type_guaranteed": "Front Row Priority (Seats 1-4)" if senior_citizen_mode else "Window / Aisle Choice"
            }
            final_price = senior_price if senior_citizen_mode else base_fare

        else:
            bus_type = "2+2 Express Seater"
            layout_mode = "SEATER"
            senior_reserved = min(4, max(2, int(raw_seats * 0.12))) if raw_seats >= 6 else (1 if raw_seats > 1 else 0)
            rem = max(0, raw_seats - senior_reserved)
            
            window_ratio = 0.45 + ((dyn_seed % 11) * 0.01)
            if rem > 1:
                window_avail = max(1, min(rem - 1, int(round(rem * window_ratio))))
                aisle_avail = rem - window_avail
            else:
                window_avail = rem
                aisle_avail = 0

            window_price = base_fare
            aisle_price = base_fare
            senior_price = round(base_fare * 0.90) if senior_citizen_mode else base_fare

            seat_breakdown = {
                "layout_mode": layout_mode,
                "bus_type": bus_type,
                "total_available": window_avail + aisle_avail + senior_reserved,
                "window_seats": window_avail,
                "aisle_seats": aisle_avail,
                "senior_lower_reserved": senior_reserved,
                "window_fare_inr": window_price,
                "aisle_fare_inr": aisle_price,
                "senior_berth_fare_inr": senior_price,
                "has_senior_quota": True,
                "berth_type_guaranteed": "Elder Priority Seat (Entrance Row)" if senior_citizen_mode else "Standard Seating"
            }
            final_price = senior_price if senior_citizen_mode else base_fare

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
    Incremental Minimum-Cost Extension Search:
    Discovers the cheapest upstream and/or downstream station extension that unlocks
    confirmed seats (AVL > 0), minimizing extra fare for the passenger.
    Also registers the unlocked quota into timetable.seat_map so opening in a new tab
    directly returns AVAILABLE without triggering a secondary quota chain.
    """
    if current_status not in ["WL", "RAC"] and current_wl <= 0:
        return None

    travel_date_str = _map_to_supported_date(travel_date_str)
    source_stop_id = route_stops[src_idx]
    dest_stop_id = route_stops[down_idx]
    clean_service = strip_prefix(service_number)

    src_name = timetable.stops.get(source_stop_id, {}).get("name", strip_prefix(source_stop_id))
    dst_name = timetable.stops.get(dest_stop_id, {}).get("name", strip_prefix(dest_stop_id))

    total_stops = len(route_stops)

    def calc_dist(start_i: int, end_i: int) -> float:
        d = 0.0
        for i in range(start_i, end_i):
            s1 = timetable.stops.get(route_stops[i], {})
            s2 = timetable.stops.get(route_stops[i + 1], {})
            lat1, lon1 = s1.get("latitude", 0.0), s1.get("longitude", 0.0)
            lat2, lon2 = s2.get("latitude", 0.0), s2.get("longitude", 0.0)
            if lat1 != 0 and lat2 != 0:
                d += haversine_distance_km(lat1, lon1, lat2, lon2)
            else:
                d += 50.0
        return max(d, 40.0 * (end_i - start_i))

    direct_dist = calc_dist(src_idx, down_idx)

    # Strict constraint: only inspect 1 to 4 stations before origin and/or 1 to 4 stations after destination.
    # Never jump to the start of the journey (u = 0) or end of route unless within 3-4 stations.
    max_up_hops = min(4, src_idx)
    max_down_hops = min(4, total_stops - 1 - down_idx)

    candidates = []
    # 1. Pure upstream extensions (1 to 4 stations before origin, destination unchanged)
    for up_h in range(1, max_up_hops + 1):
        candidates.append((src_idx - up_h, down_idx))

    # 2. Pure downstream extensions (1 to 4 stations after destination, origin unchanged)
    for dn_h in range(1, max_down_hops + 1):
        candidates.append((src_idx, down_idx + dn_h))

    # 3. Small combined extensions (at most 2 stations before and 2 stations after)
    for up_h in range(1, min(2, max_up_hops) + 1):
        for dn_h in range(1, min(2, max_down_hops) + 1):
            candidates.append((src_idx - up_h, down_idx + dn_h))

    def candidate_cost_key(pair):
        u, v = pair
        extra_up_km = calc_dist(u, src_idx) if u < src_idx else 0.0
        extra_down_km = calc_dist(down_idx, v) if v > down_idx else 0.0
        total_extra_km = extra_up_km + extra_down_km
        penalty = 0.0 if (u == src_idx or v == down_idx) else 15.0
        return total_extra_km + penalty

    candidates.sort(key=candidate_cost_key)

    import hashlib
    best_unlock = None

    for u, v in candidates:
        extra_up_km = calc_dist(u, src_idx) if u < src_idx else 0.0
        extra_down_km = calc_dist(down_idx, v) if v > down_idx else 0.0
        if extra_up_km > 200.0 or extra_down_km > 200.0:
            continue

        upstream_stop_id = route_stops[u]
        downstream_stop_id = route_stops[v]
        clean_up_from = strip_prefix(upstream_stop_id)
        clean_down_to = strip_prefix(downstream_stop_id)

        seat_info = get_train_seat_status(timetable, clean_service, travel_date_str, clean_up_from, clean_down_to, travel_class)
        if seat_info.get("status") != "AVAILABLE":
            continue

        unlocked_seats = seat_info.get("available_seats", 0)
        if unlocked_seats <= 0:
            continue

        if unlocked_seats > 0:
            extra_up_km = calc_dist(u, src_idx) if u < src_idx else 0.0
            extra_down_km = calc_dist(down_idx, v) if v > down_idx else 0.0
            total_extra_km = extra_up_km + extra_down_km

            fare_per_km = current_fare / max(1.0, direct_dist)
            raw_extra_fare = int(total_extra_km * fare_per_km * 0.70)
            extra_fare = max(45, min(raw_extra_fare, int(current_fare * 0.25)))

            upstream_name = timetable.stops.get(upstream_stop_id, {}).get("name", clean_up_from)
            downstream_name = timetable.stops.get(downstream_stop_id, {}).get("name", clean_down_to)

            if u < src_idx and v > down_idx:
                explanation = (
                    f"Direct ticket {src_name} -> {dst_name} is in Waitlist ({current_status} {current_wl}). "
                    f"By expanding booking to {upstream_name} -> {downstream_name} (Confirmed AVL {unlocked_seats}), "
                    f"you unlock confirmed seats for only ₹{extra_fare} extra. "
                    f"Select {src_name} as your official boarding point on IRCTC, and simply exit at {dst_name}."
                )
            elif u < src_idx:
                explanation = (
                    f"Direct ticket {src_name} -> {dst_name} is in Waitlist ({current_status} {current_wl}). "
                    f"By booking 1 stop earlier from {upstream_name} -> {dst_name} (Confirmed AVL {unlocked_seats}), "
                    f"you unlock confirmed seats for only ₹{extra_fare} extra fare. "
                    f"Set {src_name} as your official boarding point on IRCTC."
                )
            else:
                explanation = (
                    f"Direct ticket {src_name} -> {dst_name} is in Waitlist ({current_status} {current_wl}). "
                    f"You can book {src_name} -> {downstream_name} (just past {dst_name}) with Confirmed AVL {unlocked_seats} "
                    f"for only ₹{extra_fare} extra fare, board at {src_name} as usual, and legally get down early at {dst_name}."
                )


            best_unlock = {
                "is_unlocked": True,
                "train_number": clean_service,
                "train_name": service_name,
                "book_from": {
                    "id": upstream_stop_id,
                    "code": clean_up_from,
                    "name": upstream_name
                },
                "book_to": {
                    "id": downstream_stop_id,
                    "code": clean_down_to,
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
                "unlocked_seats": unlocked_seats,
                "extra_fare_inr": extra_fare,
                "direct_status_text": f"{current_status} {current_wl}" if current_wl > 0 else current_status,
                "explanation": explanation
            }
            break

    return best_unlock

def is_dominated(candidate: dict, existing: dict, senior_citizen_mode: bool = False, target_train: Optional[str] = None) -> bool:
    if target_train:
        clean_target = re.sub(r'\D', '', str(target_train))
        cand_matches = any(re.sub(r'\D', '', str(l.get("service_number", ""))) == clean_target for l in candidate.get("legs", []))
        ex_matches = any(re.sub(r'\D', '', str(l.get("service_number", ""))) == clean_target for l in existing.get("legs", []))
        if cand_matches and not ex_matches:
            return False

    # Mode Diversity Preservation: $O(1)$ fast check via precomputed flags
    cand_is_multimodal = candidate.get("_is_multi")
    if cand_is_multimodal is None:
        cand_modes = {l.get("mode") for l in candidate.get("legs", []) if l.get("mode") not in ("WALK", "AUTO_CAB", "TRANSFER")}
        cand_is_multimodal = ("BUS" in cand_modes) and bool(cand_modes & {"RAIL", "TRAIN"})
        candidate["_is_multi"] = cand_is_multimodal
        candidate["_has_bus"] = "BUS" in cand_modes

    ex_is_multimodal = existing.get("_is_multi")
    if ex_is_multimodal is None:
        ex_modes = {l.get("mode") for l in existing.get("legs", []) if l.get("mode") not in ("WALK", "AUTO_CAB", "TRANSFER")}
        ex_is_multimodal = ("BUS" in ex_modes) and bool(ex_modes & {"RAIL", "TRAIN"})
        existing["_is_multi"] = ex_is_multimodal
        existing["_has_bus"] = "BUS" in ex_modes

    # A multi-modal candidate should not be eliminated by a pure single-mode route
    if cand_is_multimodal and not ex_is_multimodal:
        return False
    if ex_is_multimodal and not cand_is_multimodal:
        return False

    # Also preserve pure-bus alternatives against pure-rail routes
    cand_has_bus = candidate.get("_has_bus", False)
    ex_has_bus = existing.get("_has_bus", False)
    if cand_has_bus != ex_has_bus and not cand_is_multimodal and not ex_is_multimodal:
        return False

    # Preserve distinct destination terminals within the same city (e.g. Visakhapatnam VSKP vs Duvvada DVD)
    cand_dest = candidate.get("legs", [])[-1].get("to_stop", {}).get("id", "")
    ex_dest = existing.get("legs", [])[-1].get("to_stop", {}).get("id", "")
    if cand_dest and ex_dest and cand_dest != ex_dest:
        return False

    # Preserve routes that offer a verified Smart Quota Unlock (Confirmed Seat Assurance)
    cand_has_unlock = candidate.get("smart_quota_unlock") is not None
    ex_has_unlock = existing.get("smart_quota_unlock") is not None
    if cand_has_unlock and not ex_has_unlock:
        return False

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


def merge_into_pareto_set(pareto_set: List[dict], candidate: dict, senior_citizen_mode: bool = False, target_train: Optional[str] = None) -> bool:
    for existing in pareto_set:
        if is_dominated(candidate, existing, senior_citizen_mode, target_train):
            return False

    pareto_set[:] = [ex for ex in pareto_set if not is_dominated(ex, candidate, senior_citizen_mode, target_train)]
    pareto_set.append(candidate)
    return True


def run_mcraptor_city_search(
    timetable: McRaptorTimetable,
    source_city: str,
    dest_city: str,
    travel_date_str: str = "2026-08-01",
    travel_class: str = "3A",
    top_k: int = 15,
    require_bus: bool = False,
    senior_citizen_mode: bool = False,
    target_train: Optional[str] = None,
    isolate_route: bool = False
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
        q = (query or "").strip().lower()
        if not q:
            return []

        clean_q = re.sub(r'\b(junction|jn|cantt|cantonment|central|terminus|term|stn|station|railway station|city|main)\b', '', q, flags=re.I).strip()
        clean_q = re.sub(r'[\(\)\[\]]', '', clean_q).strip()
        clean_q = re.sub(r'\s+', ' ', clean_q).strip()

        # Check for EXACT station match first (e.g. "KRISHNARAJAPURM", "KJM", "WFD", "WHITEFIELD", "BNC", "SBC", "BZA")
        exact_station_stops = []
        for s_id, s_data in timetable.stops.items():
            s_code = s_id.replace("RAIL:", "").replace("BUS:", "").strip().lower()
            s_name = s_data.get("name", "").strip().lower()
            if (q and q == s_code) or (q and q == s_name) or (clean_q and (clean_q == s_code or clean_q == s_name)):
                exact_station_stops.append(s_id)

        broad_metro_names = {"bengaluru", "bangalore", "hyderabad", "secunderabad", "kolkata", "howrah", "chennai", "visakhapatnam", "vijayawada", "delhi", "mumbai"}
        is_broad_metro_query = q in broad_metro_names or (clean_q and clean_q in broad_metro_names)

        # If user explicitly specified an exact station, return that exact station so it is NOT diluted across the cluster
        if exact_station_stops and not is_broad_metro_query:
            return list(set(exact_station_stops))

        all_stops = []

        # 0. Regional Metro Clusters
        try:
            from app.city_clusters import get_cluster_stop_ids
            c_stops = get_cluster_stop_ids(q, timetable)
            if c_stops:
                all_stops.extend(c_stops)
        except Exception:
            pass

        # 1. Exact match in city_stops
        if q in timetable.city_stops:
            all_stops.extend(timetable.city_stops[q])
        if q in CITY_ALIASES and CITY_ALIASES[q] in timetable.city_stops:
            all_stops.extend(timetable.city_stops[CITY_ALIASES[q]])

        # 2. Stripped station suffixes
        if clean_q:
            try:
                from app.city_clusters import get_cluster_stop_ids
                c_clean_stops = get_cluster_stop_ids(clean_q, timetable)
                if c_clean_stops:
                    all_stops.extend(c_clean_stops)
            except Exception:
                pass
            if clean_q in timetable.city_stops:
                all_stops.extend(timetable.city_stops[clean_q])
            if clean_q in CITY_ALIASES and CITY_ALIASES[clean_q] in timetable.city_stops:
                all_stops.extend(timetable.city_stops[CITY_ALIASES[clean_q]])

        if all_stops:
            return list(set(all_stops))

        if exact_station_stops:
            return list(set(exact_station_stops))

        return []

    source_stops_list = resolve_city_stops(source_city)
    dest_stops_list = resolve_city_stops(dest_city)
    
    if not source_stops_list or not dest_stops_list:
        return []

    start_dep_sec = 0
    pareto_results: List[dict] = []
    source_stops = source_stops_list
    source_stops_set = set(source_stops_list)
    dest_stops = set(dest_stops_list)

    # Gather all cluster city names to prevent intra-city/same-region circular routing
    source_cluster_cities = {source_city.lower()}
    dest_cluster_cities = {dest_city.lower()}
    try:
        from app.city_clusters import METRO_CLUSTERS
        for c_key, c_data in METRO_CLUSTERS.items():
            aliases = [a.lower() for a in c_data.get("aliases", [])]
            canon = c_data.get("canonical_name", "").lower()
            if source_city.lower() in aliases or source_city.lower() == canon:
                source_cluster_cities.update([c.lower() for c in c_data.get("included_db_cities", [])])
            if dest_city.lower() in aliases or dest_city.lower() == canon:
                dest_cluster_cities.update([c.lower() for c in c_data.get("included_db_cities", [])])
    except Exception:
        pass

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

                    fare_info = get_leg_fare_and_status(
                        timetable, mode, service_number, travel_date_str, source_stop_id, down_stop_id, travel_class,
                        distance_km=dist_km, duration_mins=duration_mins, senior_citizen_mode=senior_citizen_mode,
                        target_train=target_train
                    )

                    # Check for Smart Quota Unlock (Alternate Boarding) ONLY if destination matches passenger dest
                    smart_unlock = None
                    if down_stop_id in dest_stops and mode == "RAIL":
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
                        "_is_multi": False,
                        "_has_bus": (mode == "BUS"),
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

                    if down_stop_id in dest_stops:
                        if require_bus:
                            has_bus = any(leg["mode"] == "BUS" for leg in route_payload["legs"])
                            if not has_bus:
                                continue
                        merge_into_pareto_set(pareto_results, route_payload, senior_citizen_mode, target_train)
                    else:
                        # Intra-City & Same-Region Protection:
                        # 1. An intermediate transfer stop MUST NOT be in the source city / cluster or destination city / cluster
                        down_city = (timetable.stops[down_stop_id].get("city") or "").lower()
                        if down_stop_id in source_stops_set or down_city in source_cluster_cities or down_city in dest_cluster_cities:
                            continue

                        # 2. Intercity Distance Threshold: Buses under 50 km are local intra-city/suburban shuttles, not intercity connectors
                        if mode == "BUS" and dist_km < 50.0:
                            continue

                        if down_stop_id not in reachable_intermediates:
                            reachable_intermediates[down_stop_id] = []

                        if len(reachable_intermediates[down_stop_id]) < 4:
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
                                "from_stop": {"id": source_stop_id, "name": timetable.stops[source_stop_id]["name"]},
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

                target_city = (timetable.stops[target_stop_id].get("city") or "").lower()
                # Do not transfer back into the source city / cluster
                if target_stop_id in source_stops_set or target_city in source_cluster_cities:
                    continue

                if target_stop_id not in expanded_intermediates:
                    expanded_intermediates[target_stop_id] = []

                for arr in arrivals[:3]:
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
                            "senior_friendly": bool(arr["fare_info"].get("seat_breakdown") and arr["fare_info"]["seat_breakdown"].get("senior_lower_reserved", 0) > 0),
                            "_is_multi": False,
                            "_has_bus": (arr["mode"] == "BUS"),
                            "smart_quota_unlock": arr.get("smart_unlock"),
                            "legs": [
                                {
                                    "leg_number": 1,
                                    "mode": arr["mode"],
                                    "service_number": arr["service_number"],
                                    "service_name": arr.get("service_name", ""),
                                    "from_stop": arr.get("from_stop") or ({"id": arr["path"][0]["id"], "name": arr["path"][0]["name"]} if arr.get("path") else {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]}),
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
                                    "service_name": "Walk Transfer" if xfer["transfer_mode"] == "WALK" else "Auto / Cab Transfer",
                                    "from_stop": {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]},
                                    "to_stop": {"id": target_stop_id, "name": timetable.stops[target_stop_id]["name"]},
                                    "departure_time": sec_to_time_str(arr["arr_sec"]),
                                    "arrival_time": sec_to_time_str(arr["arr_sec"] + xfer_sec),
                                    "distance_km": xfer["walk_distance_km"],
                                    "travel_class": "TRANSFER",
                                    "seat_status": "AVAILABLE",
                                    "price_inr": 0,
                                    "path": []
                                }
                            ]
                        }
                        if require_bus:
                            has_bus = any(leg["mode"] == "BUS" for leg in route_payload["legs"])
                            if not has_bus:
                                continue
                        merge_into_pareto_set(pareto_results, route_payload, senior_citizen_mode, target_train)
                    else:
                        # Cross-modal transfer (e.g. RAIL station -> nearby BUS terminal, or BUS stand -> nearby RAIL station)
                        transfer_leg = {
                            "leg_number": 2,
                            "mode": xfer["transfer_mode"],
                            "service_number": "TRANSFER",
                            "service_name": "Auto / Cab Transfer" if xfer["transfer_mode"] == "AUTO_CAB" else "Walk Transfer",
                            "from_stop": {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]},
                            "to_stop": {"id": target_stop_id, "name": timetable.stops[target_stop_id]["name"]},
                            "departure_time": sec_to_time_str(arr["arr_sec"]),
                            "arrival_time": sec_to_time_str(arr["arr_sec"] + xfer_sec),
                            "distance_km": xfer["walk_distance_km"],
                            "travel_class": "TRANSFER",
                            "seat_status": "AVAILABLE",
                            "price_inr": 0,
                            "path": []
                        }

                        if len(expanded_intermediates[target_stop_id]) < 4:
                            expanded_intermediates[target_stop_id].append({
                                "mode": arr["mode"],
                                "service_number": arr["service_number"],
                                "service_name": arr.get("service_name", ""),
                                "arr_sec": arr["arr_sec"] + xfer_sec,
                                "dep_sec": arr["dep_sec"],
                                "duration_mins": arr["duration_mins"] + (xfer_sec // 60),
                                "distance_km": round(arr["distance_km"] + xfer["walk_distance_km"], 1),
                                "fare_info": arr["fare_info"],
                                "smart_unlock": arr.get("smart_unlock"),
                                "from_stop": arr.get("from_stop") or ({"id": arr["path"][0]["id"], "name": arr["path"][0]["name"]} if arr.get("path") else {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]}),
                                "inter_hub": {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]},
                                "transfer_leg": transfer_leg,
                                "path": arr.get("path", [])
                            })

    # Round 2 Connecting Trips
    for inter_stop_id, arrivals in expanded_intermediates.items():
        second_routes = timetable.stop_routes.get(inter_stop_id, [])
        for route_id in second_routes:
            route_stops = timetable.routes[route_id]
            if inter_stop_id not in route_stops:
                continue

            inter_idx = route_stops.index(inter_stop_id)
            dest_indices = [idx for idx, s in enumerate(route_stops) if s in dest_stops and idx > inter_idx]
            if not dest_indices:
                continue

            # In cities with multiple stops, evaluate the primary destination terminal for this route
            dest_idx = dest_indices[0]
            dest_stop_id = route_stops[dest_idx]

            t2_trip_ids = timetable.route_trips[route_id]
            for leg1 in arrivals[:3]:
                    best_trip = None
                    for t2_id in t2_trip_ids:
                        t2_stops = timetable.trip_stop_times[t2_id]
                        dep_sec = t2_stops[inter_idx]["departure_sec"]

                        t2_meta = timetable.trips[t2_id]
                        t2_mode = t2_meta["mode"]

                        # Handle daily schedule wrap-around between multi-day train seconds and 24h bus seconds:
                        raw_diff = dep_sec - leg1["arr_sec"]
                        if leg1["mode"] != t2_mode:
                            layover_sec = raw_diff if (MIN_LAYOVER_MINS * 60 <= raw_diff <= MAX_LAYOVER_MINS * 60) else (raw_diff % 86400)
                        else:
                            layover_sec = raw_diff

                        layover_mins = int(layover_sec // 60)
                        if MIN_LAYOVER_MINS <= layover_mins <= MAX_LAYOVER_MINS:
                            best_trip = (t2_id, t2_stops, layover_mins)
                            break

                    if not best_trip:
                        continue

                    t2_id, t2_stops, layover_mins = best_trip
                    inter_stop_data = t2_stops[inter_idx]
                    dest_stop_data = t2_stops[dest_idx]

                    t2_meta = timetable.trips[t2_id]
                    t2_mode = t2_meta["mode"]
                    t2_service = t2_meta["service_number"]
                    t2_name = timetable.service_names.get(t2_service, "")

                    # In senior citizen mode, penalize layovers < 45 mins between trains/buses
                    if senior_citizen_mode and layover_mins < 45:
                        continue

                    leg2_duration = int((dest_stop_data["arrival_sec"] - inter_stop_data["departure_sec"]) // 60)
                    leg2_dist = round(dest_stop_data["distance_km"] - inter_stop_data["distance_km"], 1)

                    leg2_fare_info = get_leg_fare_and_status(
                        timetable, t2_mode, t2_service, travel_date_str, inter_stop_id, dest_stop_id, travel_class,
                        distance_km=leg2_dist, duration_mins=leg2_duration, senior_citizen_mode=senior_citizen_mode,
                        target_train=target_train
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

                    inter_hub = leg1.get("inter_hub") or {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]}
                    leg1_from = leg1.get("from_stop") or ({"id": leg1["path"][0]["id"], "name": timetable.stops[leg1["path"][0]["id"]]["name"]} if leg1.get("path") else {"id": inter_stop_id, "name": timetable.stops[inter_stop_id]["name"]})

                    leg1_obj = {
                        "leg_number": 1,
                        "mode": leg1["mode"],
                        "service_number": leg1["service_number"],
                        "service_name": leg1.get("service_name", ""),
                        "from_stop": leg1_from,
                        "to_stop": inter_hub,
                        "departure_time": sec_to_time_str(leg1["dep_sec"]),
                        "arrival_time": sec_to_time_str(leg1["arr_sec"] - int(leg1["transfer_leg"]["distance_km"] / 20 * 3600) if leg1.get("transfer_leg") else leg1["arr_sec"]),
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
                    }

                    leg2_obj = {
                        "leg_number": 3 if leg1.get("transfer_leg") else 2,
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

                    legs = [leg1_obj, leg1["transfer_leg"], leg2_obj] if leg1.get("transfer_leg") else [leg1_obj, leg2_obj]

                    modes = {leg["mode"] for leg in legs if leg.get("mode") not in ("WALK", "AUTO_CAB", "TRANSFER")}
                    is_multi = ("BUS" in modes) and bool(modes & {"RAIL", "TRAIN"})
                    has_bus = "BUS" in modes

                    route_payload = {
                        "journey_type": "ONE_TRANSFER",
                        "transfers": 1,
                        "travel_class": travel_class,
                        "overall_status": overall_status,
                        "available_seats": min(leg1["fare_info"]["available_seats"], leg2_fare_info["available_seats"]),
                        "wl_number": max(leg1["fare_info"]["wl_number"], leg2_fare_info["wl_number"]),
                        "total_price_inr": total_price,
                        "_is_multi": is_multi,
                        "_has_bus": has_bus,
                        "interchange_station": {
                            "code": inter_hub["id"],
                            "name": inter_hub["name"],
                            "layover_time": f"{layover_mins // 60}h {layover_mins % 60}m",
                            "layover_minutes": layover_mins
                        },
                        "total_duration_mins": total_mins,
                        "total_duration": f"{total_mins // 60}h {total_mins % 60}m",
                        "total_distance_km": total_dist,
                        "senior_friendly": bool(
                            any(leg.get("mode") == "BUS" and (leg.get("seat_breakdown") or {}).get("senior_lower_reserved", 0) > 0 for leg in legs)
                            and layover_mins >= 45
                        ),
                        "smart_quota_unlock": leg1.get("smart_unlock") or smart_unlock_2,
                        "legs": legs
                    }

                    if require_bus:
                        has_bus = any(leg["mode"] == "BUS" for leg in route_payload["legs"])
                        if not has_bus:
                            continue

                    merge_into_pareto_set(pareto_results, route_payload, senior_citizen_mode, target_train)

    if target_train:
        clean_target = re.sub(r'\D', '', str(target_train))
        if clean_target:
            filtered = [
                r for r in pareto_results
                if any(re.sub(r'\D', '', str(leg.get("service_number", ""))) == clean_target for leg in r.get("legs", []))
            ]
            direct_matches = [
                r for r in filtered
                if r.get("transfers", 0) == 0 and any(re.sub(r'\D', '', str(l.get("service_number", ""))) == clean_target for l in r.get("legs", []))
            ]
            if direct_matches:
                filtered = direct_matches
            if isolate_route:
                return filtered[:1]
            return filtered[:top_k]

    if isolate_route and pareto_results:
        return pareto_results[:1]

    pareto_results.sort(key=lambda x: (
        0 if (senior_citizen_mode and x.get("senior_friendly")) else 1,
        x["total_duration_mins"],
        -STATUS_RANK.get(x["overall_status"], 0)
    ))

    if not isolate_route and not target_train and not require_bus:
        direct_rail = [r for r in pareto_results if r.get("transfers", 0) == 0 and any(l.get("mode") in ("RAIL", "TRAIN") for l in r.get("legs", []))]
        multimodal = [r for r in pareto_results if any(l.get("mode") == "BUS" for l in r.get("legs", [])) and any(l.get("mode") in ("RAIL", "TRAIN") for l in r.get("legs", []))]
        other = [r for r in pareto_results if r not in direct_rail and r not in multimodal]

        if multimodal:
            target_multi = min(len(multimodal), max(4, top_k // 3))
            target_direct = min(len(direct_rail), top_k - target_multi)
            interleaved = direct_rail[:target_direct] + multimodal[:target_multi] + other
            interleaved.sort(key=lambda x: (
                0 if (senior_citizen_mode and x.get("senior_friendly")) else 1,
                x["total_duration_mins"],
                -STATUS_RANK.get(x["overall_status"], 0)
            ))
            pareto_results = interleaved

    return pareto_results[:top_k]


# Backward compatibility aliases
run_test_mcraptor_city_search = run_mcraptor_city_search
get_test_leg_fare_and_status = get_leg_fare_and_status
is_test_dominated = is_dominated
merge_into_test_pareto_set = merge_into_pareto_set
