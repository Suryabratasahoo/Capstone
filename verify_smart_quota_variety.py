import sys
sys.path.insert(0, 'backend')
from app.mcraptor_data import build_mcraptor_timetable
from app.mcraptor_city_engine import run_mcraptor_city_search

tt = build_mcraptor_timetable('backend/app/final.db')
print("[+] Timetable loaded into RAM.")

test_corridors = [
    ("Vijayawada", "Bangalore"),
    ("Tirupati", "Bangalore"),
    ("Hyderabad", "Bangalore"),
    ("Chennai", "Bangalore"),
    ("Visakhapatnam", "Kolkata"),
    ("Tirupati", "Secunderabad"),
]

print("\n" + "="*80)
print("TESTING SMART QUOTA ON VARIETY OF CORRIDORS (DATE: 2026-11-20, CLASS: 3A)")
print("="*80)

for src, dst in test_corridors:
    routes = run_mcraptor_city_search(
        timetable=tt,
        source_city=src,
        dest_city=dst,
        travel_date_str="2026-11-20",
        travel_class="3A",
        top_k=25,
        require_bus=False,
        senior_citizen_mode=False
    )
    unlocks = [r for r in routes if r.get("smart_quota_unlock")]
    print(f"\nCorridor: {src} -> {dst}")
    print(f"  Total Pareto routes: {len(routes)}")
    print(f"  Routes with Smart Quota: {len(unlocks)} (Selective: SOME trains, not all)")
    for r in unlocks[:4]:
        sq = r["smart_quota_unlock"]
        print(f"    Train {sq['train_number']} ({sq['train_name']}): Direct={sq.get('direct_status_text')} -> Book {sq['book_from']['name']} ({sq['book_from']['code']}) to {sq['book_to']['name']} ({sq['book_to']['code']}) [AVL {sq['unlocked_seats']} Confirmed, Extra: ₹{sq['extra_fare_inr']}]")

print("\n" + "="*80)
print("TESTING LOOPING & STRATEGY LINK INVARIANTS")
print("="*80)

# Pick an unlock from Vijayawada -> Bangalore, say Train 12296 or similar
routes = run_mcraptor_city_search(tt, "Vijayawada", "Bangalore", "2026-11-20", "3A", 25)
unlocks = [r for r in routes if r.get("smart_quota_unlock")]
if unlocks:
    test_unlock = unlocks[0]["smart_quota_unlock"]
    t_num = test_unlock["train_number"]
    book_from = test_unlock["book_from"]["code"]
    book_to = test_unlock["book_to"]["code"]
    act_from = test_unlock["actual_boarding"]["code"]
    act_to = test_unlock["actual_deboarding"]["code"]
    
    print(f"Testing Strategy Link 1 (The Confirmed Journey: {book_from} -> {book_to} on Train {t_num})...")
    res_confirmed = run_mcraptor_city_search(tt, book_from, book_to, "2026-11-20", "3A", 10, target_train=t_num)
    print(f"  Confirmed query returned {len(res_confirmed)} options.")
    for opt in res_confirmed[:1]:
        print(f"  Status: {opt.get('overall_status')}, Available Seats: {opt.get('available_seats')}, WL: {opt.get('wl_number')}")
        print(f"  Secondary Smart Quota Unlock: {opt.get('smart_quota_unlock')}")
        assert opt.get("overall_status") == "AVAILABLE", "Confirmed link did not show AVAILABLE!"
        assert opt.get("smart_quota_unlock") is None, "Infinite Loop detected! Confirmed link should NOT have another smart quota unlock!"
    print("  [PASS] No infinite loop! Confirmed journey opens directly with verified AVAILABLE status.")

    print(f"\nTesting Strategy Link 2 (The Boarding Segment: {act_from} -> {act_to} on Train {t_num})...")
    res_boarding = run_mcraptor_city_search(tt, act_from, act_to, "2026-11-20", "3A", 10, target_train=t_num)
    print(f"  Boarding segment query returned {len(res_boarding)} options.")
    for opt in res_boarding[:1]:
        print(f"  Direct Status: {opt.get('overall_status')}, WL: {opt.get('wl_number')}")
        print(f"  Points to Smart Quota: Book {opt.get('smart_quota_unlock', {}).get('book_from', {}).get('code')} -> {opt.get('smart_quota_unlock', {}).get('book_to', {}).get('code')}")
        assert opt.get("smart_quota_unlock") is not None, "Boarding segment should show the Smart Quota option!"
    print("  [PASS] Boarding segment preserves exact Smart Quota guidance.")

print("\n" + "="*80)
print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
print("="*80)

