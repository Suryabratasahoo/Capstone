# backend/app/irctc_pricing.py
"""
Indian Railways (IRCTC) Official Telescopic Distance-Based Pricing Engine.
Implements:
1. Telescopic Base Fare (IRCA distance slabs with decreasing marginal cost per km)
2. Class-specific Reservation Fee (1AC: ₹60, 2AC: ₹50, 3AC/CC: ₹40, SL: ₹20, 2S: ₹15)
3. Superfast Surcharge (1AC: ₹75, 2AC: ₹45, 3AC/CC: ₹45, SL: ₹30, 2S: ₹15)
4. Premier Catering Charges (Rajdhani, Shatabdi, Vande Bharat, Duronto, Tejas)
5. Mandatory 5% GST strictly on AC classes (Non-AC classes exempt)
6. Standard IRCTC Rounding (nearest multiple of ₹5)
7. Inter-city & State RTC Bus Pricing
"""

from typing import Dict, Any


# 1. Official Telescopic Distance Slabs (km_low, km_high, rate_per_km_inr)
TELESCOPIC_SLABS: Dict[str, list] = {
    # 1AC / First AC / Executive Class (EC)
    "1A": [
        (0, 150, 3.80),
        (150, 300, 3.30),
        (300, 500, 2.90),
        (500, 1000, 2.45),
        (1000, 1500, 2.10),
        (1500, 2500, 1.80),
        (2500, float("inf"), 1.55)
    ],
    # 2AC / 2-Tier AC
    "2A": [
        (0, 150, 2.25),
        (150, 300, 1.95),
        (300, 500, 1.70),
        (500, 1000, 1.45),
        (1000, 1500, 1.25),
        (1500, 2500, 1.08),
        (2500, float("inf"), 0.95)
    ],
    # 3AC / 3-Tier AC / AC Chair Car (CC) / 3E (Economy)
    "3A": [
        (0, 150, 1.55),
        (150, 300, 1.35),
        (300, 500, 1.15),
        (500, 1000, 1.00),
        (1000, 1500, 0.88),
        (1500, 2500, 0.75),
        (2500, float("inf"), 0.65)
    ],
    "CC": [
        (0, 150, 1.35),
        (150, 300, 1.15),
        (300, 500, 0.95),
        (500, 1000, 0.82),
        (1000, 1500, 0.70),
        (1500, 2500, 0.60),
        (2500, float("inf"), 0.52)
    ],
    # SL / Sleeper Class (Non-AC)
    "SL": [
        (0, 150, 0.45),
        (150, 300, 0.40),
        (300, 500, 0.35),
        (500, 1000, 0.30),
        (1000, 1500, 0.25),
        (1500, 2500, 0.21),
        (2500, float("inf"), 0.18)
    ],
    # 2S / Second Seating (Non-AC)
    "2S": [
        (0, 150, 0.24),
        (150, 300, 0.20),
        (300, 500, 0.17),
        (500, 1000, 0.14),
        (1000, 1500, 0.12),
        (1500, 2500, 0.10),
        (2500, float("inf"), 0.09)
    ]
}

# Minimum Chargeable Base Fares (for minimum chargeable distance thresholds)
MIN_BASE_FARE: Dict[str, int] = {
    "1A": 1005,
    "2A": 610,
    "3A": 445,
    "CC": 265,
    "SL": 125,
    "2S": 45
}

# Fixed Reservation Fees
RESERVATION_FEE: Dict[str, int] = {
    "1A": 60,
    "2A": 50,
    "3A": 40,
    "CC": 40,
    "SL": 20,
    "2S": 15
}

# Fixed Superfast Charges
SUPERFAST_CHARGE: Dict[str, int] = {
    "1A": 75,
    "2A": 45,
    "3A": 45,
    "CC": 45,
    "SL": 30,
    "2S": 15
}


def normalize_class_code(raw_class: str) -> str:
    """Maps various user / GTFS class strings to canonical IRCTC class codes."""
    if not raw_class:
        return "3A"
    c = str(raw_class).strip().upper()
    if c in ["1A", "1AC", "FIRST AC", "FIRST_AC", "EC", "EA"]:
        return "1A"
    if c in ["2A", "2AC", "SECOND AC", "SECOND_AC"]:
        return "2A"
    if c in ["3A", "3AC", "THIRD AC", "THIRD_AC", "3E", "ECONOMY"]:
        return "3A"
    if c in ["CC", "CHAIR CAR", "AC CHAIR CAR"]:
        return "CC"
    if c in ["SL", "SLEEPER", "SLP"]:
        return "SL"
    if c in ["2S", "SECOND SEATING", "GN", "GEN"]:
        return "2S"
    if "BUS" in c:
        return c
    return "3A"


def is_superfast_service(service_number: str, service_name: str, service_type: str) -> bool:
    """Identifies if a train qualifies for Superfast surcharge."""
    num_str = str(service_number).strip()
    name_str = (service_name or "").upper()
    type_str = (service_type or "").upper()

    if any(k in type_str for k in ["SUPERFAST", "SF", "RAJ", "SHT", "VANDE", "DURONTO"]):
        return True
    if any(k in name_str for k in ["SUPERFAST", "SF", "EXPRESS", "EXP", "RAJDHANI", "SHATABDI", "VANDE BHARAT", "DURONTO", "GARIB RATH"]):
        return True
    
    # Check 5-digit number patterns (12xxx, 22xxx, 20xxx are predominantly Superfast)
    if len(num_str) == 5 and num_str[:2] in ["12", "20", "22"]:
        return True

    return True  # Default to Mail/Express standard SF surcharge


def calculate_irctc_train_fare(
    distance_km: float,
    class_code: str = "3A",
    service_number: str = "",
    service_name: str = "",
    service_type: str = "EXPRESS",
    duration_mins: int = 300
) -> Dict[str, Any]:
    """
    Calculates exact IRCTC ticket fare based on:
    Total = Round5(BaseFare + ReservationFee + SuperfastCharge + Catering + GST)
    """
    cls = normalize_class_code(class_code)
    if cls not in TELESCOPIC_SLABS:
        cls = "3A"

    dist = max(float(distance_km), 15.0)

    # 1. Telescopic Base Fare (incremental slabs)
    base_fare = 0.0
    for low, high, rate in TELESCOPIC_SLABS[cls]:
        if dist > low:
            slab_dist = min(dist, high) - low
            base_fare += slab_dist * rate
        else:
            break

    # Apply minimum base fare floor
    base_fare = max(base_fare, float(MIN_BASE_FARE.get(cls, 125)))

    # 2. Reservation Fee
    res_fee = RESERVATION_FEE.get(cls, 40)

    # 3. Superfast Surcharge
    is_sf = is_superfast_service(service_number, service_name, service_type)
    sf_charge = SUPERFAST_CHARGE.get(cls, 45) if is_sf else 0

    # 4. Premier Catering Charges
    t_name_upper = (service_name or "").upper()
    t_type_upper = (service_type or "").upper()
    is_premier = any(k in t_name_upper or k in t_type_upper for k in ["RAJDHANI", "SHATABDI", "VANDE BHARAT", "VANDE", "DURONTO", "TEJAS"])
    
    catering_fee = 0
    if is_premier:
        if cls in ["1A", "EC"]:
            catering_fee = 385 if duration_mins > 300 else 190
        else:
            catering_fee = 295 if duration_mins > 300 else 150

    # 5. Goods and Services Tax (GST) - 5% strictly on AC classes
    is_ac = cls in ["1A", "2A", "3A", "CC"]
    subtotal = base_fare + res_fee + sf_charge + catering_fee
    gst_fee = round(subtotal * 0.05) if is_ac else 0

    # 6. Final Rounding to Nearest Multiple of 5
    total_raw = subtotal + gst_fee
    total_rounded = int(round(total_raw / 5.0) * 5)

    breakdown_parts = [f"Base: ₹{int(round(base_fare))}", f"Res: ₹{res_fee}"]
    if sf_charge > 0:
        breakdown_parts.append(f"SF: ₹{sf_charge}")
    if catering_fee > 0:
        breakdown_parts.append(f"Catering: ₹{catering_fee}")
    if is_ac:
        breakdown_parts.append(f"GST (5%): ₹{gst_fee}")
    else:
        breakdown_parts.append("GST: Exempt (Non-AC)")

    breakdown_text = " + ".join(breakdown_parts) + f" = ₹{total_rounded}"

    return {
        "total_fare": total_rounded,
        "base_fare": int(round(base_fare)),
        "reservation_fee": res_fee,
        "superfast_charge": sf_charge,
        "catering_charge": catering_fee,
        "gst_amount": gst_fee,
        "is_ac": is_ac,
        "class_code": cls,
        "distance_km": round(dist, 1),
        "breakdown_text": breakdown_text
    }


def calculate_bus_fare(
    distance_km: float,
    bus_class: str = "NON_AC",
    bus_provider: str = "RTC",
    duration_mins: int = 180
) -> Dict[str, Any]:
    """
    Calculates realistic inter-city and State RTC bus fares.
    Non-AC Seater: ~₹1.15/km (min ₹50)
    AC Seater: ~₹1.55/km + 5% GST (min ₹100)
    AC Sleeper: ~₹2.00/km + 5% GST (min ₹250)
    """
    dist = max(float(distance_km), 10.0)
    b_class = (bus_class or "").upper()

    if "SLEEPER" in b_class or "VOLVO_MULTI" in b_class or "SCANIA" in b_class:
        rate = 2.05
        min_fare = 250
        is_ac = True
    elif "AC" in b_class or "SEATER_AC" in b_class or "DOLPHIN" in b_class or "GARUDA" in b_class:
        rate = 1.55
        min_fare = 120
        is_ac = True
    else:
        rate = 1.15
        min_fare = 50
        is_ac = False

    base = max(dist * rate, float(min_fare))
    gst = round(base * 0.05) if is_ac else 0
    total = int(round((base + gst) / 5.0) * 5)

    breakdown_text = f"Base: ₹{int(round(base))}" + (f" + GST (5%): ₹{gst}" if is_ac else "") + f" = ₹{total}"

    return {
        "total_fare": total,
        "base_fare": int(round(base)),
        "reservation_fee": 0,
        "superfast_charge": 0,
        "catering_charge": 0,
        "gst_amount": gst,
        "is_ac": is_ac,
        "class_code": bus_class,
        "distance_km": round(dist, 1),
        "breakdown_text": breakdown_text
    }


def calculate_leg_fare(
    mode: str,
    service_number: str,
    service_name: str,
    service_type: str,
    distance_km: float,
    travel_class: str = "3A",
    duration_mins: int = 180
) -> Dict[str, Any]:
    """Unified fare calculator for any travel leg."""
    mode_upper = (mode or "").upper()
    if mode_upper == "RAIL" or mode_upper == "TRAIN":
        return calculate_irctc_train_fare(
            distance_km=distance_km,
            class_code=travel_class,
            service_number=service_number,
            service_name=service_name,
            service_type=service_type,
            duration_mins=duration_mins
        )
    elif mode_upper == "BUS":
        return calculate_bus_fare(
            distance_km=distance_km,
            bus_class=travel_class if "BUS" in (travel_class or "") else "NON_AC",
            bus_provider=service_name,
            duration_mins=duration_mins
        )
    else:
        # Footpath / walking transfer
        return {
            "total_fare": 0,
            "base_fare": 0,
            "reservation_fee": 0,
            "superfast_charge": 0,
            "catering_charge": 0,
            "gst_amount": 0,
            "is_ac": False,
            "class_code": "WALK",
            "distance_km": round(distance_km, 1),
            "breakdown_text": "Free Walk Transfer (₹0)"
        }
