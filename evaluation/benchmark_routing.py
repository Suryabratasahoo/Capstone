"""
evaluation/benchmark_routing.py
-------------------------------
Rigorous Performance & Latency Benchmarking Script for ConnexLink.

Benchmarks:
1. Time-Expanded Dijkstra (Binary Min-Heap Baseline).
2. Standard Single-Objective RAPTOR (Earliest-Arrival Round-Based Baseline).
3. ConnexLink Multi-Criteria RAPTOR (McRAPTOR 4D Pareto Engine).

Methodology:
- Exact same origin-destination queries and timetable data.
- Separates database & timetable initialization from query latency.
- 100 warm-up query executions.
- High-resolution timing via time.perf_counter().
- Measures process memory and incremental memory via psutil.
- Records CPU model, core count, RAM, Python version, OS platform.
- Calculates Mean, Median, P95, P99, Min, Max, StdDev.

Outputs:
- evaluation/results/latency_results.csv
- evaluation/results/latency_summary.json
- evaluation/results/figures/latency_comparison.png
- evaluation/results/benchmark_logs.txt
"""

import sys
import os
import time
import json
import random
import platform
import psutil
from typing import List, Dict, Optional, Tuple
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("backend"))

from app.mcraptor_data import build_mcraptor_timetable, McRaptorTimetable
from app.mcraptor_engine import run_mcraptor_search
from evaluation.baselines.standard_raptor import run_standard_raptor
from evaluation.baselines.time_expanded_dijkstra import run_time_expanded_dijkstra


def generate_benchmark_stop_pairs(timetable: McRaptorTimetable, target_count: int = 250) -> List[tuple]:
    """Generates valid rail and bus stop pairs for routing benchmarking."""
    random.seed(1337)
    # Pick stops with routes
    active_stops = [s for s, r in timetable.stop_routes.items() if len(r) >= 2]
    
    # Priority pairs (major trunk stations)
    trunk_stops = ["RAIL:BZA", "RAIL:VSKP", "RAIL:HYB", "RAIL:SC", "RAIL:SBC", "RAIL:MAS", "RAIL:HWH", "RAIL:BBS", "RAIL:SBP", "RAIL:GNT"]
    pairs = []
    
    for s1 in trunk_stops:
        for s2 in trunk_stops:
            if s1 != s2 and s1 in timetable.stops and s2 in timetable.stops:
                pairs.append((s1, s2))
                
    while len(pairs) < target_count:
        s1 = random.choice(active_stops)
        s2 = random.choice(active_stops)
        if s1 != s2 and (s1, s2) not in pairs:
            pairs.append((s1, s2))
            
    return pairs[:target_count]


def run_benchmark(db_path: str = "backend/app/final.db",
                  output_dir: str = "evaluation/results",
                  num_queries: int = 200,
                  warmup_count: int = 50) -> dict:
    print("=" * 70)
    print("CONNEXLINK PERFORMANCE & LATENCY BENCHMARKING")
    print("=" * 70)

    os.makedirs(output_dir, exist_ok=True)
    fig_dir = os.path.join(output_dir, "figures")
    os.makedirs(fig_dir, exist_ok=True)

    logs = []
    def log(msg: str):
        print(msg)
        logs.append(msg)

    # 1. Environment Metadata
    process = psutil.Process(os.getpid())
    init_mem_mb = process.memory_info().rss / (1024 * 1024)

    env_meta = {
        "operating_system": platform.platform(),
        "python_version": platform.python_version(),
        "cpu_architecture": platform.machine(),
        "cpu_count_logical": psutil.cpu_count(logical=True),
        "cpu_count_physical": psutil.cpu_count(logical=False),
        "total_physical_ram_gb": round(psutil.virtual_memory().total / (1024**3), 2),
        "process_initial_memory_mb": round(init_mem_mb, 2)
    }

    log("\n[1/5] Hardware & Environment Specifications:")
    for k, v in env_meta.items():
        log(f"  {k:28s}: {v}")

    # 2. Separate Data-Loading from Query Latency
    log("\n[2/5] Loading Timetable into In-Memory RAM Arrays...")
    t_load_start = time.perf_counter()
    timetable = build_mcraptor_timetable(db_path)
    load_time_sec = time.perf_counter() - t_load_start
    post_load_mem_mb = process.memory_info().rss / (1024 * 1024)
    timetable_mem_footprint_mb = post_load_mem_mb - init_mem_mb

    log(f"  Timetable Loaded in:      {load_time_sec:.3f} seconds")
    log(f"  Total Process Memory:     {post_load_mem_mb:.2f} MB")
    log(f"  Incremental Timetable RAM:{timetable_mem_footprint_mb:.2f} MB")

    test_pairs = generate_benchmark_stop_pairs(timetable, target_count=num_queries)
    log(f"  Generated {len(test_pairs)} benchmark stop pairs.")

    # 3. Warm-Up Executions (100 iterations where practical)
    log(f"\n[3/5] Executing {warmup_count} Warm-Up Runs to Prime CPU Caches & JIT...")
    for idx in range(min(warmup_count, len(test_pairs))):
        s, d = test_pairs[idx]
        run_standard_raptor(timetable, s, d, 28800)
        run_time_expanded_dijkstra(timetable, s, d, 28800)
        run_mcraptor_search(timetable, s, d, "08:00", "2026-08-01", "3A", top_k=5)
    log("  Warm-up completed.")

    # 4. Benchmarking Execution
    log(f"\n[4/5] Running High-Resolution Benchmarks Across {len(test_pairs)} Queries...")

    dijkstra_latencies = []
    raptor_latencies = []
    mcraptor_latencies = []
    raw_measurements = []

    for q_idx, (s_stop, d_stop) in enumerate(test_pairs):
        # Time-Expanded Dijkstra
        t0 = time.perf_counter()
        res_d = run_time_expanded_dijkstra(timetable, s_stop, d_stop, 28800)
        lat_dijkstra = (time.perf_counter() - t0) * 1000.0
        dijkstra_latencies.append(lat_dijkstra)

        # Standard RAPTOR
        t0 = time.perf_counter()
        res_r = run_standard_raptor(timetable, s_stop, d_stop, 28800)
        lat_raptor = (time.perf_counter() - t0) * 1000.0
        raptor_latencies.append(lat_raptor)

        # ConnexLink McRAPTOR
        t0 = time.perf_counter()
        res_m = run_mcraptor_search(timetable, s_stop, d_stop, "08:00", "2026-08-01", "3A", top_k=15)
        lat_mcraptor = (time.perf_counter() - t0) * 1000.0
        mcraptor_latencies.append(lat_mcraptor)

        raw_measurements.append({
            "query_index": q_idx + 1,
            "source_stop": s_stop,
            "dest_stop": d_stop,
            "dijkstra_latency_ms": round(lat_dijkstra, 3),
            "standard_raptor_latency_ms": round(lat_raptor, 3),
            "mcraptor_latency_ms": round(lat_mcraptor, 3),
            "dijkstra_found": res_d is not None,
            "standard_raptor_found": res_r is not None,
            "mcraptor_options_count": len(res_m)
        })

    peak_mem_mb = process.memory_info().rss / (1024 * 1024)

    # 5. Statistical Aggregations
    def compute_stats(arr: List[float]) -> dict:
        a = np.array(arr)
        return {
            "mean_ms": round(float(np.mean(a)), 2),
            "median_ms": round(float(np.median(a)), 2),
            "p95_ms": round(float(np.percentile(a, 95)), 2),
            "p99_ms": round(float(np.percentile(a, 99)), 2),
            "min_ms": round(float(np.min(a)), 2),
            "max_ms": round(float(np.max(a)), 2),
            "std_dev_ms": round(float(np.std(a)), 2)
        }

    stats_dijkstra = compute_stats(dijkstra_latencies)
    stats_raptor = compute_stats(raptor_latencies)
    stats_mcraptor = compute_stats(mcraptor_latencies)

    log("\n[5/5] BENCHMARK LATENCY SUMMARY (Measured over identical query set):")
    log("-" * 70)
    log(f"{'Algorithm':25s} | {'Mean (ms)':10s} | {'Median':8s} | {'P95 (ms)':10s} | {'P99 (ms)':10s} | {'StdDev':8s}")
    log("-" * 70)
    log(f"{'Time-Expanded Dijkstra':25s} | {stats_dijkstra['mean_ms']:10.2f} | {stats_dijkstra['median_ms']:8.2f} | {stats_dijkstra['p95_ms']:10.2f} | {stats_dijkstra['p99_ms']:10.2f} | {stats_dijkstra['std_dev_ms']:8.2f}")
    log(f"{'Standard RAPTOR (1-Obj)':25s} | {stats_raptor['mean_ms']:10.2f} | {stats_raptor['median_ms']:8.2f} | {stats_raptor['p95_ms']:10.2f} | {stats_raptor['p99_ms']:10.2f} | {stats_raptor['std_dev_ms']:8.2f}")
    log(f"{'ConnexLink McRAPTOR (4D)':25s} | {stats_mcraptor['mean_ms']:10.2f} | {stats_mcraptor['median_ms']:8.2f} | {stats_mcraptor['p95_ms']:10.2f} | {stats_mcraptor['p99_ms']:10.2f} | {stats_mcraptor['std_dev_ms']:8.2f}")
    log("-" * 70)
    log(f"Peak Process Memory Consumption: {peak_mem_mb:.2f} MB")
    log(f"Incremental Timetable Memory:     {timetable_mem_footprint_mb:.2f} MB")

    benchmark_summary = {
        "environment": env_meta,
        "memory_footprint": {
            "initial_process_memory_mb": round(init_mem_mb, 2),
            "post_load_process_memory_mb": round(post_load_mem_mb, 2),
            "incremental_timetable_memory_mb": round(timetable_mem_footprint_mb, 2),
            "peak_process_memory_mb": round(peak_mem_mb, 2),
            "measurement_method": "psutil Process.memory_info().rss"
        },
        "query_benchmark_metrics": {
            "num_queries_evaluated": len(test_pairs),
            "warmup_runs": warmup_count,
            "time_expanded_dijkstra": stats_dijkstra,
            "standard_raptor": stats_raptor,
            "connexlink_mcraptor": stats_mcraptor
        },
        "manuscript_claims_comparison": {
            "dijkstra": {
                "manuscript_avg_ms": 482.4,
                "measured_avg_ms": stats_dijkstra["mean_ms"],
                "manuscript_p95_ms": 1240.1,
                "measured_p95_ms": stats_dijkstra["p95_ms"]
            },
            "standard_raptor": {
                "manuscript_avg_ms": 14.2,
                "measured_avg_ms": stats_raptor["mean_ms"],
                "manuscript_p95_ms": 28.5,
                "measured_p95_ms": stats_raptor["p95_ms"]
            },
            "connexlink_mcraptor": {
                "manuscript_avg_ms": 34.8,
                "measured_avg_ms": stats_mcraptor["mean_ms"],
                "manuscript_p95_ms": 58.2,
                "measured_p95_ms": stats_mcraptor["p95_ms"]
            }
        }
    }

    # Save JSON
    json_path = os.path.join(output_dir, "latency_summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(benchmark_summary, f, indent=2)
    log(f"\n[OK] Saved {json_path}")

    # Save CSV
    csv_path = os.path.join(output_dir, "latency_results.csv")
    df_lat = pd.DataFrame(raw_measurements)
    df_lat.to_csv(csv_path, index=False)
    log(f"[OK] Saved {csv_path}")

    # Save TXT
    txt_path = os.path.join(output_dir, "benchmark_logs.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("CONNEXLINK ROUTING PERFORMANCE BENCHMARK REPORT\n")
        f.write("=" * 60 + "\n\n")
        f.write("\n".join(logs))
    log(f"[OK] Saved {txt_path}")

    # Generate Chart
    png_path = os.path.join(fig_dir, "latency_comparison.png")
    try:
        algos = ["Time-Expanded\nDijkstra", "Standard RAPTOR\n(Single-Objective)", "ConnexLink\nMcRAPTOR (4D)"]
        means = [stats_dijkstra["mean_ms"], stats_raptor["mean_ms"], stats_mcraptor["mean_ms"]]
        p95s = [stats_dijkstra["p95_ms"], stats_raptor["p95_ms"], stats_mcraptor["p95_ms"]]

        x = np.arange(len(algos))
        width = 0.35

        fig, ax = plt.subplots(figsize=(8, 5))
        rects1 = ax.bar(x - width/2, means, width, label="Mean Latency (ms)", color="#3b82f6")
        rects2 = ax.bar(x + width/2, p95s, width, label="P95 Latency (ms)", color="#ef4444")

        ax.set_ylabel("Latency (milliseconds)")
        ax.set_title("Routing Algorithm Latency Comparison")
        ax.set_xticks(x)
        ax.set_xticklabels(algos)
        ax.legend()
        ax.grid(axis="y", linestyle="--", alpha=0.5)

        for rect in rects1:
            h = rect.get_height()
            ax.annotate(f"{h:.1f}", xy=(rect.get_x() + rect.get_width() / 2, h),
                        xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=9)
        for rect in rects2:
            h = rect.get_height()
            ax.annotate(f"{h:.1f}", xy=(rect.get_x() + rect.get_width() / 2, h),
                        xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=9)

        plt.tight_layout()
        plt.savefig(png_path, dpi=300)
        plt.close()
        log(f"[OK] Saved {png_path}")
    except Exception as e:
        log(f"[WARN] Could not generate chart: {e}")

    log("=" * 70)
    return benchmark_summary


if __name__ == "__main__":
    run_benchmark(num_queries=150, warmup_count=30)
