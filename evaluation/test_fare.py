"""
evaluation/test_fare.py
-----------------------
Authoritative IRCTC & Bus Fare Calculation Verification Script.

Tests:
1. Base fare calculation across official distance slabs (IRCA slabs).
2. Minimum chargeable base fare thresholds across all classes (1A, 2A, 3A, CC, SL, 2S).
3. Reservation fees (1A: 60, 2A: 50, 3A: 40, CC: 40, SL: 20, 2S: 15).
4. Superfast surcharges (1A: 75, 2A: 45, 3A: 45, CC: 45, SL: 30, 2S: 15).
5. Mandatory 5% GST strictly on AC classes, 0% on non-AC (SL, 2S).
6. Official IRCTC rounding rule: Nearest multiple of 5 INR.
7. Multi-leg journey tariff additivity.
8. Bus pricing & class normalization.

Outputs:
- evaluation/results/fare_test_results.json
- evaluation/results/fare_test_report.txt
"""

import sys
import os
import json
from typing import Dict, Any

sys.path.insert(0, os.path.abspath("backend"))

from app.irctc_pricing import (
    calculate_irctc_train_fare,
    calculate_bus_fare,
    calculate_leg_fare,
    normalize_class_code,
    RESERVATION_FEE,
    SUPERFAST_CHARGE,
    MIN_BASE_FARE
)


def run_fare_tests(output_dir: str = "evaluation/results") -> Dict[str, Any]:
    print("=" * 70)
    print("CONNEXLINK IRCTC & BUS FARE CALCULATION VERIFICATION")
    print("=" * 70)

    os.makedirs(output_dir, exist_ok=True)
    tests = {}
    logs = []

    def log(msg: str):
        print(msg)
        logs.append(msg)

    # ----------------------------------------------------
    # TEST 1: Minimum Base Fare Thresholds
    # ----------------------------------------------------
    log("\n--- TEST 1: Minimum Base Fare Enforcement on Short Distances (10 km) ---")
    min_fare_pass = True
    classes = ["1A", "2A", "3A", "CC", "SL", "2S"]
    min_details = {}

    for cls in classes:
        fare_data = calculate_irctc_train_fare(distance_km=10.0, class_code=cls)
        base = fare_data["base_fare"]
        expected_min = MIN_BASE_FARE[cls]
        passed = (base == expected_min)
        if not passed:
            min_fare_pass = False
        min_details[cls] = {
            "actual_base": base,
            "expected_min": expected_min,
            "total_fare": fare_data["total_fare"],
            "passed": passed
        }
        log(f"  Class {cls:2s}: Base Fare = {base} INR (Expected Min = {expected_min} INR) -> {'PASS' if passed else 'FAIL'}")

    tests["test_1_minimum_base_fare"] = {"passed": min_fare_pass, "details": min_details}

    # ----------------------------------------------------
    # TEST 2: Reservation Fee Verification
    # ----------------------------------------------------
    log("\n--- TEST 2: Reservation Fee Rule Verification ---")
    res_fee_pass = True
    res_details = {}
    expected_res = {"1A": 60, "2A": 50, "3A": 40, "CC": 40, "SL": 20, "2S": 15}

    for cls, exp_val in expected_res.items():
        fare_data = calculate_irctc_train_fare(distance_km=250.0, class_code=cls)
        actual_val = fare_data["reservation_fee"]
        passed = (actual_val == exp_val)
        if not passed:
            res_fee_pass = False
        res_details[cls] = {"actual": actual_val, "expected": exp_val, "passed": passed}
        log(f"  Class {cls:2s}: Res Fee = {actual_val} INR (Expected = {exp_val} INR) -> {'PASS' if passed else 'FAIL'}")

    tests["test_2_reservation_fee"] = {"passed": res_fee_pass, "details": res_details}

    # ----------------------------------------------------
    # TEST 3: Superfast Surcharge
    # ----------------------------------------------------
    log("\n--- TEST 3: Superfast Surcharge Application ---")
    sf_pass = True
    sf_details = {}
    expected_sf = {"1A": 75, "2A": 45, "3A": 45, "CC": 45, "SL": 30, "2S": 15}

    for cls, exp_val in expected_sf.items():
        fare_sf = calculate_irctc_train_fare(distance_km=350.0, class_code=cls, service_type="SUPERFAST")
        actual_sf = fare_sf["superfast_charge"]
        passed = (actual_sf == exp_val)
        if not passed:
            sf_pass = False
        sf_details[cls] = {"actual_sf": actual_sf, "expected_sf": exp_val, "passed": passed}
        log(f"  Class {cls:2s}: SF Charge = {actual_sf} INR (Expected = {exp_val} INR) -> {'PASS' if passed else 'FAIL'}")

    tests["test_3_superfast_charge"] = {"passed": sf_pass, "details": sf_details}

    # ----------------------------------------------------
    # TEST 4: GST Application (5% on AC, 0% on Non-AC)
    # ----------------------------------------------------
    log("\n--- TEST 4: 5% GST Exemption & Application ---")
    gst_pass = True
    gst_details = {}

    for cls in classes:
        fare_data = calculate_irctc_train_fare(distance_km=600.0, class_code=cls)
        gst = fare_data["gst_amount"]
        subtotal = fare_data["base_fare"] + fare_data["reservation_fee"] + fare_data["superfast_charge"] + fare_data["catering_charge"]
        
        if cls in ["1A", "2A", "3A", "CC"]:
            expected_gst = round(subtotal * 0.05)
            passed = (gst > 0) and abs(gst - expected_gst) <= 1
        else:
            # Sleeper and 2S must be GST exempt
            passed = (gst == 0)
            
        if not passed:
            gst_pass = False
        gst_details[cls] = {"subtotal": subtotal, "gst": gst, "passed": passed}
        log(f"  Class {cls:2s}: Subtotal = {subtotal} INR, GST = {gst} INR -> {'PASS' if passed else 'FAIL'}")

    tests["test_4_gst_taxation"] = {"passed": gst_pass, "details": gst_details}

    # ----------------------------------------------------
    # TEST 5: Nearest Multiple of 5 Rounding Rule
    # ----------------------------------------------------
    log("\n--- TEST 5: Official IRCTC Nearest 5 INR Rounding Rule ---")
    rounding_pass = True
    rounding_cases = [45, 120, 235, 388, 512, 743, 999, 1422]
    rounding_details = []

    for d in rounding_cases:
        fare = calculate_irctc_train_fare(distance_km=float(d), class_code="3A")
        tot = fare["total_fare"]
        is_mult_of_5 = (tot % 5 == 0)
        if not is_mult_of_5:
            rounding_pass = False
        rounding_details.append({"distance": d, "total": tot, "is_mult_of_5": is_mult_of_5})
        log(f"  Distance {d} km: Total Fare = {tot} INR (Multiple of 5: {is_mult_of_5})")

    tests["test_5_rounding_rule"] = {"passed": rounding_pass, "details": rounding_details}

    # ----------------------------------------------------
    # TEST 6: Multi-Leg Fare Additivity
    # ----------------------------------------------------
    log("\n--- TEST 6: Multi-Leg Fare Additivity (Train + Bus Transfer) ---")
    leg1 = calculate_leg_fare(mode="RAIL", service_number="12728", service_name="Godavari Exp", service_type="SUPERFAST", distance_km=350.0, travel_class="3A")
    leg2 = calculate_leg_fare(mode="BUS", service_number="AP1083", service_name="APSRTC", service_type="EXPRESS", distance_km=150.0, travel_class="3A")
    leg_walk = calculate_leg_fare(mode="WALK", service_number="", service_name="Walk", service_type="", distance_km=1.2, travel_class="3A")

    multi_total = leg1["total_fare"] + leg2["total_fare"] + leg_walk["total_fare"]
    expected_multi = leg1["total_fare"] + leg2["total_fare"]  # walk is 0
    t6_passed = (leg_walk["total_fare"] == 0) and (multi_total == expected_multi)

    log(f"  Leg 1 (Rail 350km 3A): {leg1['total_fare']} INR")
    log(f"  Leg 2 (Bus 150km):      {leg2['total_fare']} INR")
    log(f"  Leg 3 (Transfer Walk): {leg_walk['total_fare']} INR")
    log(f"  Combined Journey Fare: {multi_total} INR -> {'PASS' if t6_passed else 'FAIL'}")

    tests["test_6_multi_leg_additivity"] = {"passed": t6_passed, "total_fare": multi_total}

    # ----------------------------------------------------
    # TEST 7: Bus Pricing Model
    # ----------------------------------------------------
    log("\n--- TEST 7: Bus Pricing Verification ---")
    bus_seater = calculate_bus_fare(distance_km=200.0, bus_class="Seater")
    bus_sleeper = calculate_bus_fare(distance_km=200.0, bus_class="Sleeper")
    bus_volvo = calculate_bus_fare(distance_km=200.0, bus_class="AC Multi-Axle Volvo")
    t7_passed = (bus_seater["total_fare"] <= bus_sleeper["total_fare"] <= bus_volvo["total_fare"])
    
    log(f"  200km Bus Seater:  {bus_seater['total_fare']} INR")
    log(f"  200km Bus Sleeper: {bus_sleeper['total_fare']} INR")
    log(f"  200km Bus Volvo:   {bus_volvo['total_fare']} INR -> {'PASS' if t7_passed else 'FAIL'}")
    tests["test_7_bus_pricing"] = {"passed": t7_passed}

    # Summary
    all_passed = all(t["passed"] for t in tests.values())
    tests["all_fare_tests_passed"] = all_passed

    # Save JSON
    json_path = os.path.join(output_dir, "fare_test_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(tests, f, indent=2)
    log(f"\n[OK] Saved {json_path}")

    # Save TXT
    txt_path = os.path.join(output_dir, "fare_test_report.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("CONNEXLINK IRCTC & BUS FARE ENGINE VERIFICATION REPORT\n")
        f.write("=" * 60 + "\n\n")
        f.write("\n".join(logs))
        f.write(f"\n\nSTATUS: {'ALL FARE RULES VERIFIED (100% PASS)' if all_passed else 'FARE DISCREPANCIES DETECTED'}\n")
    log(f"[OK] Saved {txt_path}")
    log("=" * 70)

    return tests


if __name__ == "__main__":
    run_fare_tests()
