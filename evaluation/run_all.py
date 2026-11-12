"""
evaluation/run_all.py
---------------------
Master Orchestrator Script for ConnexLink Complete Evaluation Pipeline.

Executes all 7 evaluation modules in strict scientific order:
1. dataset_audit.py     - Comprehensive database & dataset audit.
2. test_pareto.py       - 4D Pareto dominance mathematical verification.
3. test_fare.py         - Authoritative IRCTC & bus fare verification.
4. test_transfers.py    - Footpath geodesic & layover boundary verification.
5. evaluate_nlp.py      - Semantic embeddings & TextBlob sentiment audit.
6. compare_routing.py   - Rail vs. Bus vs. Multi-Modal discovery comparison.
7. benchmark_routing.py - Performance, latency percentiles & memory footprint.

Generates consolidated outputs in evaluation/results/.
"""

import sys
import os
import time
import json
import traceback

sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("backend"))

from evaluation.dataset_audit import run_dataset_audit
from evaluation.test_pareto import run_pareto_tests
from evaluation.test_fare import run_fare_tests
from evaluation.test_transfers import run_transfer_tests
from evaluation.evaluate_nlp import run_nlp_evaluation
from evaluation.compare_routing import run_routing_comparison
from evaluation.benchmark_routing import run_benchmark
from evaluation.evaluate_routing import run_routing_evaluation


def run_complete_evaluation():
    start_time = time.perf_counter()
    print("=" * 80)
    print("      CONNEXLINK COMPREHENSIVE EXPERIMENTAL EVALUATION PIPELINE      ")
    print("=" * 80)
    print("Starting full evaluation run...\n")

    summary_status = {}
    output_dir = "evaluation/results"
    os.makedirs(output_dir, exist_ok=True)

    modules = [
        ("Phase 2: Dataset Audit", run_dataset_audit, {}),
        ("Phase 4: Pareto Optimality Verification", run_pareto_tests, {}),
        ("Phase 8: Fare Engine Verification", run_fare_tests, {}),
        ("Phase 8: Transfer & Footpath Verification", run_transfer_tests, {}),
        ("Phase 7: NLP & Sentiment Recommender Audit", run_nlp_evaluation, {}),
        ("Phase 6: Rail vs Bus vs Multimodal Comparison", run_routing_comparison, {"query_limit": 50}),
        ("Phase 3: McRAPTOR Routing Metrics Evaluation", run_routing_evaluation, {"query_limit": 50}),
        ("Phase 5: Performance & Latency Benchmarking", run_benchmark, {"num_queries": 60, "warmup_count": 15}),
    ]

    for name, func, kwargs in modules:
        print("\n" + "#" * 80)
        print(f"RUNNING: {name}")
        print("#" * 80)
        t0 = time.perf_counter()
        try:
            res = func(**kwargs)
            dur = time.perf_counter() - t0
            summary_status[name] = {"status": "SUCCESS", "duration_sec": round(dur, 2)}
            print(f"[OK] Completed {name} in {dur:.2f}s")
        except Exception as e:
            dur = time.perf_counter() - t0
            summary_status[name] = {"status": "FAILED", "error": str(e), "duration_sec": round(dur, 2)}
            print(f"[ERROR] Failed {name}: {e}")
            traceback.print_exc()

    total_time = time.perf_counter() - start_time

    # Save consolidated test results
    test_results_txt = os.path.join(output_dir, "test_results.txt")
    with open(test_results_txt, "w", encoding="utf-8") as f:
        f.write("CONNEXLINK MASTER PIPELINE EXECUTION SUMMARY\n")
        f.write("=" * 60 + "\n\n")
        for name, data in summary_status.items():
            f.write(f"{name:45s}: {data['status']} ({data['duration_sec']}s)\n")
            if "error" in data:
                f.write(f"  Error: {data['error']}\n")
        f.write(f"\nTotal Pipeline Execution Time: {total_time:.2f} seconds\n")

    print("\n" + "=" * 80)
    print("PIPELINE EXECUTION FINISHED")
    print("=" * 80)
    for name, data in summary_status.items():
        print(f"  {name:45s}: {data['status']} ({data['duration_sec']}s)")
    print(f"\nTotal Pipeline Execution Time: {total_time:.2f} seconds")
    print(f"Master summary saved to {test_results_txt}")


if __name__ == "__main__":
    run_complete_evaluation()

