"""
evaluation/verify_all_unlocks.py
--------------------------------
Comprehensive multi-corridor consistency audit verifying:
1. Smart Quota Unlocks across multiple national and regional routes.
2. Boarding segment vs. Confirmed segment status veracity.
3. Assurance that NO direct segment falsely displays AVAILABLE when waitlisted.
"""

import sys
import os
sys.path.insert(0, os.path.abspath("backend"))

from app.mcraptor_data import build_mcraptor_timetable
import app.mcraptor_city_engine as mce

def run_audit():
    print("=" * 75, flush=True)
    print("COMPREHENSIVE MULTI-CORRIDOR SEAT STATUS & QUOTA AUDIT", flush=True)
    print("=" * 75, flush=True)

    tt = build_mcraptor_timetable("backend/app/final.db")

    test_corridors = [
        ("Vijayawada", "Bangalore", "2026-08-05"),
        ("Vijayawada", "Visakhapatnam", "2026-08-10"),
        ("Hyderabad", "Bangalore", "2026-08-12"),
        ("Chennai", "Bangalore", "2026-08-15"),
        ("Howrah", "Puri", "2026-08-18"),
        ("Visakhapatnam", "Kolkata", "2026-08-20"),
        ("Tirupati", "Secunderabad", "2026-08-22"),
        ("Bhubaneswar", "Howrah", "2026-08-25"),
        ("Vijayawada", "Sambalpur", "2026-08-28"),
        ("Guntur", "Chennai", "2026-09-02"),
        ("Secunderabad", "Tirupati", "2026-09-05"),
        ("Kharagpur", "Tatanagar", "2026-09-08"),
    ]

    total_unlocks_checked = 0
    total_corridors_passed = 0
    failures = []

    for src, dst, dt in test_corridors:
        routes = mce.run_mcraptor_city_search(tt, src, dst, dt, "3A", 25)
        unlocked_routes = [r for r in routes if r.get("smart_quota_unlock") is not None]
        
        corridor_errors = []
        for r in unlocked_routes:
            total_unlocks_checked += 1
            u = r["smart_quota_unlock"]
            train = u["train_number"]
            b_from = u["book_from"]["code"]
            b_to = u["book_to"]["code"]
            act_board = u["actual_boarding"]["code"]
            act_deboard = u["actual_deboarding"]["code"]
            
            # Check 1: Seat count valid
            if u["unlocked_seats"] <= 0:
                corridor_errors.append(f"Train {train}: unlocked_seats <= 0")
            
            # Check 2: Fare difference non-negative
            if u["extra_fare_inr"] < 0:
                corridor_errors.append(f"Train {train}: extra_fare_inr < 0")
                
            # Check 3: Direct leg integrity in engine seat_map
            direct_fare_info = mce.get_leg_fare_and_status(
                tt, "RAIL", train, dt,
                u["actual_boarding"]["id"], u["actual_deboarding"]["id"],
                "3A", 500, 300
            )
            if u["direct_status_text"].startswith("WL") and direct_fare_info["status"] == "AVAILABLE":
                corridor_errors.append(
                    f"Train {train}: Direct leg {act_board}->{act_deboard} seat_map returned AVAILABLE instead of WL!"
                )
            
            # Check 4: Truth in Boarding Segment Query via city search
            direct_check = mce.run_mcraptor_city_search(
                tt, u["actual_boarding"]["name"], u["actual_deboarding"]["name"],
                dt, "3A", 10, target_train=train
            )
            for dr in direct_check:
                for l in dr.get("legs", []):
                    if (l.get("service_number") == train and
                        mce.strip_prefix(l["from_stop"]["id"]) == act_board and
                        mce.strip_prefix(l["to_stop"]["id"]) == act_deboard):
                        if u["direct_status_text"].startswith("WL") and l.get("seat_status") == "AVAILABLE":
                            corridor_errors.append(
                                f"Train {train}: Direct segment {act_board}->{act_deboard} falsely reported AVAILABLE in city search!"
                            )

        status_str = "PASS" if len(corridor_errors) == 0 else "FAIL"
        if len(corridor_errors) == 0:
            total_corridors_passed += 1
        else:
            failures.extend(corridor_errors)
            
        print(f"Corridor: {src:15s} -> {dst:15s} | Date: {dt} | Routes: {len(routes):2d} | Unlocks: {len(unlocked_routes):2d} | [{status_str}]", flush=True)
        for err in corridor_errors:
            print(f"   [FAIL DETAIL]: {err}", flush=True)

    print("=" * 75, flush=True)
    print(f"SUMMARY: {total_corridors_passed} / {len(test_corridors)} corridors passed audit.", flush=True)
    print(f"Total Smart Quota Unlocks validated: {total_unlocks_checked}", flush=True)
    if failures:
        print(f"FAILURES DETECTED: {len(failures)}", flush=True)
        for f in set(failures):
            print(f" - {f}", flush=True)
    else:
        print("ALL AUDITED CORRIDORS VERIFIED: No false seat availability found anywhere in the network.", flush=True)
    print("=" * 75, flush=True)

if __name__ == "__main__":
    run_audit()
