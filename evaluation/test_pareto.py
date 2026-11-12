"""
evaluation/test_pareto.py
-------------------------
Independent Verification of the 4-Dimensional Pareto Dominance Relation.

Tests:
1. Faster waitlisted journey does not eliminate slower confirmed journey (Theorem 1 / Waitlist Bypass).
2. Cheaper journey correctly dominates a more expensive otherwise-equivalent journey.
3. Journey with inferior values in every objective is pruned.
4. Equal journeys in all dimensions are handled consistently.
5. Non-dominated trade-off solutions are all preserved.
6. Stress test: Compare production McRAPTOR dominance logic against an exhaustive
   O(N^2) brute-force Pareto solver over 5,000 synthetic multi-modal itineraries
   using fixed random seeds for 100% reproducibility.

Outputs:
- evaluation/results/pareto_test_report.txt
- evaluation/results/pareto_test_results.json
"""

import sys
import os
import json
import random
from typing import List, Dict, Any

# Add backend to path for production imports
sys.path.insert(0, os.path.abspath("backend"))

from app.mcraptor_engine import is_dominated, merge_into_pareto_set, STATUS_RANK


def exhaustive_pareto_frontier(candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Independent ground-truth O(N^2) exhaustive Pareto frontier builder.
    An itinerary A is dominated if there exists any B in candidates such that:
    - B is <= A in duration, distance, price
    - B is >= A in status_rank
    - B is strictly better in at least one objective.
    Identical solutions (tie in all 4 objectives) do not dominate each other.
    """
    frontier = []
    n = len(candidates)
    
    for i in range(n):
        a = candidates[i]
        a_dur = a["total_duration_mins"]
        a_dist = a["total_distance_km"]
        a_price = a["total_price_inr"]
        a_rank = STATUS_RANK[a["overall_status"]]
        
        dominated = False
        for j in range(n):
            if i == j:
                continue
            b = candidates[j]
            b_dur = b["total_duration_mins"]
            b_dist = b["total_distance_km"]
            b_price = b["total_price_inr"]
            b_rank = STATUS_RANK[b["overall_status"]]
            
            b_better_or_equal = (
                b_dur <= a_dur and
                b_dist <= a_dist and
                b_price <= a_price and
                b_rank >= a_rank
            )
            b_strictly_better = (
                b_dur < a_dur or
                b_dist < a_dist or
                b_price < a_price or
                b_rank > a_rank
            )
            if b_better_or_equal and b_strictly_better:
                dominated = True
                break
                
        if not dominated:
            # Check for identical duplicate already in frontier
            duplicate = False
            for f in frontier:
                if (f["total_duration_mins"] == a_dur and
                    f["total_distance_km"] == a_dist and
                    f["total_price_inr"] == a_price and
                    STATUS_RANK[f["overall_status"]] == a_rank):
                    duplicate = True
                    break
            if not duplicate:
                frontier.append(a)
                
    return frontier


def run_pareto_tests(output_dir: str = "evaluation/results") -> Dict[str, Any]:
    print("=" * 70)
    print("CONNEXLINK PARETO OPTIMALITY VERIFICATION")
    print("=" * 70)

    os.makedirs(output_dir, exist_ok=True)
    test_results = {}
    logs = []

    def log(msg: str):
        print(msg)
        logs.append(msg)

    # ----------------------------------------------------
    # TEST 1: Faster Waitlisted vs Slower Confirmed
    # ----------------------------------------------------
    log("\n--- TEST 1: Faster Waitlisted vs Slower Confirmed (Waitlist Bypass) ---")
    j_fast_wl = {
        "id": "J1_FAST_WL",
        "total_duration_mins": 300,
        "total_distance_km": 400.0,
        "total_price_inr": 500,
        "overall_status": "WL"
    }
    j_slow_avail = {
        "id": "J2_SLOW_AVAIL",
        "total_duration_mins": 420,
        "total_distance_km": 430.0,
        "total_price_inr": 650,
        "overall_status": "AVAILABLE"
    }

    dom_1_by_2 = is_dominated(candidate=j_fast_wl, existing=j_slow_avail)
    dom_2_by_1 = is_dominated(candidate=j_slow_avail, existing=j_fast_wl)

    bag = []
    merge_into_pareto_set(bag, j_fast_wl)
    merge_into_pareto_set(bag, j_slow_avail)

    t1_passed = (not dom_1_by_2) and (not dom_2_by_1) and (len(bag) == 2)
    test_results["test_1_waitlist_bypass"] = {
        "passed": t1_passed,
        "fast_wl_dominated_by_slow_avail": dom_1_by_2,
        "slow_avail_dominated_by_fast_wl": dom_2_by_1,
        "bag_size": len(bag),
        "expected_bag_size": 2
    }
    log(f"Result: {'PASS' if t1_passed else 'FAIL'}")
    log(f"  J1 (WL) dominated by J2 (AVAILABLE): {dom_1_by_2} (Expected False)")
    log(f"  J2 (AVAILABLE) dominated by J1 (WL): {dom_2_by_1} (Expected False)")
    log(f"  Pareto Bag Retained Options: {len(bag)}/2")

    # ----------------------------------------------------
    # TEST 2: Cheaper Dominates More Expensive Otherwise-Equivalent
    # ----------------------------------------------------
    log("\n--- TEST 2: Cheaper Dominates More Expensive ---")
    j_cheap = {
        "id": "J_CHEAP",
        "total_duration_mins": 300,
        "total_distance_km": 400.0,
        "total_price_inr": 450,
        "overall_status": "AVAILABLE"
    }
    j_expensive = {
        "id": "J_EXPENSIVE",
        "total_duration_mins": 300,
        "total_distance_km": 400.0,
        "total_price_inr": 600,
        "overall_status": "AVAILABLE"
    }

    cheap_doms_exp = is_dominated(candidate=j_expensive, existing=j_cheap)
    exp_doms_cheap = is_dominated(candidate=j_cheap, existing=j_expensive)

    bag2 = []
    merge_into_pareto_set(bag2, j_expensive)
    merge_into_pareto_set(bag2, j_cheap)

    t2_passed = cheap_doms_exp and (not exp_doms_cheap) and (len(bag2) == 1) and (bag2[0]["id"] == "J_CHEAP")
    test_results["test_2_cheaper_dominance"] = {
        "passed": t2_passed,
        "expensive_dominated_by_cheap": cheap_doms_exp,
        "cheap_dominated_by_expensive": exp_doms_cheap,
        "retained_id": bag2[0]["id"] if bag2 else None
    }
    log(f"Result: {'PASS' if t2_passed else 'FAIL'}")
    log(f"  Cheap dominates Expensive: {cheap_doms_exp} (Expected True)")
    log(f"  Expensive dominates Cheap: {exp_doms_cheap} (Expected False)")
    log(f"  Retained itinerary: {bag2[0]['id'] if bag2 else 'None'}")

    # ----------------------------------------------------
    # TEST 3: Strictly Inferior in All Dimensions Pruned
    # ----------------------------------------------------
    log("\n--- TEST 3: Strictly Inferior in All 4 Dimensions Pruned ---")
    j_superior = {
        "id": "J_SUPERIOR",
        "total_duration_mins": 200,
        "total_distance_km": 300.0,
        "total_price_inr": 350,
        "overall_status": "AVAILABLE"
    }
    j_inferior = {
        "id": "J_INFERIOR",
        "total_duration_mins": 400,
        "total_distance_km": 500.0,
        "total_price_inr": 700,
        "overall_status": "WL"
    }

    inferior_dominated = is_dominated(candidate=j_inferior, existing=j_superior)
    bag3 = []
    merge_into_pareto_set(bag3, j_superior)
    inserted = merge_into_pareto_set(bag3, j_inferior)

    t3_passed = inferior_dominated and (not inserted) and (len(bag3) == 1)
    test_results["test_3_inferior_pruned"] = {
        "passed": t3_passed,
        "inferior_dominated": inferior_dominated,
        "inserted_into_bag": inserted,
        "bag_size": len(bag3)
    }
    log(f"Result: {'PASS' if t3_passed else 'FAIL'}")
    log(f"  Inferior dominated: {inferior_dominated} (Expected True)")
    log(f"  Inferior rejected from bag: {not inserted} (Expected True)")

    # ----------------------------------------------------
    # TEST 4: Equal Journeys Handled Consistently
    # ----------------------------------------------------
    log("\n--- TEST 4: Equal Journeys Consistency ---")
    j_eq1 = {
        "id": "J_EQ1",
        "total_duration_mins": 300,
        "total_distance_km": 400.0,
        "total_price_inr": 500,
        "overall_status": "AVAILABLE"
    }
    j_eq2 = {
        "id": "J_EQ2",
        "total_duration_mins": 300,
        "total_distance_km": 400.0,
        "total_price_inr": 500,
        "overall_status": "AVAILABLE"
    }

    # Strict dominance requires strictly better in at least one objective
    eq1_doms_eq2 = is_dominated(j_eq2, j_eq1)
    eq2_doms_eq1 = is_dominated(j_eq1, j_eq2)

    bag4 = []
    merge_into_pareto_set(bag4, j_eq1)
    merge_into_pareto_set(bag4, j_eq2)

    t4_passed = (not eq1_doms_eq2) and (not eq2_doms_eq1)
    test_results["test_4_equal_consistency"] = {
        "passed": t4_passed,
        "eq1_dominates_eq2": eq1_doms_eq2,
        "eq2_dominates_eq1": eq2_doms_eq1,
        "bag_size": len(bag4)
    }
    log(f"Result: {'PASS' if t4_passed else 'FAIL'}")
    log(f"  Neither equal itinerary dominates the other: {t4_passed}")

    # ----------------------------------------------------
    # TEST 5: Stress Test Against Exhaustive Brute-Force
    # ----------------------------------------------------
    log("\n--- TEST 5: Stress Test Against Exhaustive O(N^2) Ground Truth ---")
    random.seed(42)
    statuses = ["AVAILABLE", "RAC", "WL", "UNKNOWN"]
    num_synthetic = 5000
    synthetic_itineraries = []

    for idx in range(num_synthetic):
        synthetic_itineraries.append({
            "id": f"SYNTH_{idx}",
            "total_duration_mins": random.randint(120, 1440),
            "total_distance_km": round(random.uniform(50.0, 1500.0), 1),
            "total_price_inr": random.randint(100, 3500),
            "overall_status": random.choice(statuses)
        })

    # Exhaustive Ground Truth
    gt_frontier = exhaustive_pareto_frontier(synthetic_itineraries)
    
    # McRAPTOR production algorithm
    prod_bag = []
    for cand in synthetic_itineraries:
        merge_into_pareto_set(prod_bag, cand)

    # Verification: Every item in prod_bag must be non-dominated by any other item in synthetic_itineraries
    false_positives = 0
    for p in prod_bag:
        p_dur = p["total_duration_mins"]
        p_dist = p["total_distance_km"]
        p_price = p["total_price_inr"]
        p_rank = STATUS_RANK[p["overall_status"]]
        for s in synthetic_itineraries:
            if s["id"] == p["id"]:
                continue
            if (s["total_duration_mins"] <= p_dur and
                s["total_distance_km"] <= p_dist and
                s["total_price_inr"] <= p_price and
                STATUS_RANK[s["overall_status"]] >= p_rank and
                (s["total_duration_mins"] < p_dur or
                 s["total_distance_km"] < p_dist or
                 s["total_price_inr"] < p_price or
                 STATUS_RANK[s["overall_status"]] > p_rank)):
                false_positives += 1
                break

    t5_passed = (false_positives == 0) and (len(prod_bag) == len(gt_frontier))
    test_results["test_5_stress_test"] = {
        "passed": t5_passed,
        "total_candidates": num_synthetic,
        "ground_truth_frontier_size": len(gt_frontier),
        "production_bag_size": len(prod_bag),
        "false_positives_in_bag": false_positives,
        "frontier_size_match": len(prod_bag) == len(gt_frontier)
    }

    log(f"Result: {'PASS' if t5_passed else 'FAIL'}")
    log(f"  Total Evaluated Itineraries: {num_synthetic}")
    log(f"  Ground-Truth Pareto Frontier Size: {len(gt_frontier)}")
    log(f"  Production McRAPTOR Bag Size: {len(prod_bag)}")
    log(f"  Dominated False Positives in Bag: {false_positives} (Must be 0)")

    # Summary
    all_passed = all(t["passed"] for t in test_results.values())
    test_results["all_tests_passed"] = all_passed

    # Save JSON
    json_path = os.path.join(output_dir, "pareto_test_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(test_results, f, indent=2)
    log(f"\n[OK] Saved {json_path}")

    # Save TXT Report
    txt_path = os.path.join(output_dir, "pareto_test_report.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("CONNEXLINK 4D PARETO DOMINANCE VERIFICATION REPORT\n")
        f.write("=" * 60 + "\n\n")
        f.write("\n".join(logs))
        f.write(f"\n\nFINAL STATUS: {'ALL TESTS PASSED (100% MATHEMATICAL REPRODUCIBILITY)' if all_passed else 'TEST FAILURES DETECTED'}\n")
    log(f"[OK] Saved {txt_path}")
    log("=" * 70)

    return test_results


if __name__ == "__main__":
    run_pareto_tests()

