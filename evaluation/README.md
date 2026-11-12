# ConnexLink: Independent Evaluation & Reproducibility Suite

This directory contains the independent scientific evaluation, metric verification, and reproducibility audit pipeline for the ConnexLink multi-modal transit routing engine.

---

## Directory Structure

```
evaluation/
  ├── dataset_audit.py          # Phase 2: Complete database & CSV records audit
  ├── test_pareto.py            # Phase 4: 4D Pareto dominance mathematical verification
  ├── test_fare.py              # Phase 8: Official IRCTC & bus tariff rule verification
  ├── test_transfers.py         # Phase 8: Geodesic distance, walking duration & layover tests
  ├── evaluate_nlp.py           # Phase 7: Dense vector retrieval & TextBlob sentiment audit
  ├── compare_routing.py        # Phase 6: Single-mode Rail vs. Bus vs. ConnexLink comparison
  ├── evaluate_routing.py       # Phase 3: Route Discovery, Confirmed Berth & Waitlist Escape
  ├── benchmark_routing.py      # Phase 5: Dijkstra vs. RAPTOR vs. McRAPTOR latency & memory
  ├── run_all.py                # Master orchestrator executing the full pipeline
  ├── requirements-evaluation.txt
  ├── baselines/
  │   ├── standard_raptor.py    # Single-objective earliest-arrival RAPTOR baseline
  │   └── time_expanded_dijkstra.py # Time-Expanded Priority Queue Dijkstra baseline
  └── results/                  # Generated audit files, JSON summaries, CSVs & figures
      ├── dataset_audit.json
      ├── dataset_audit.csv
      ├── dataset_audit.txt
      ├── pareto_test_results.json
      ├── pareto_test_report.txt
      ├── fare_test_results.json
      ├── fare_test_report.txt
      ├── transfer_test_results.json
      ├── transfer_test_report.txt
      ├── nlp_evaluation.json
      ├── nlp_results.csv
      ├── nlp_evaluation_report.txt
      ├── comparison_summary.json
      ├── comparison_results.csv
      ├── comparison_report.txt
      ├── routing_evaluation.json
      ├── routing_results.csv
      ├── routing_evaluation_report.txt
      ├── latency_summary.json
      ├── latency_results.csv
      ├── benchmark_logs.txt
      ├── test_results.txt
      ├── final_evaluation_report.md
      └── figures/
          └── latency_comparison.png
```

---

## How to Execute and Reproduce Metrics

### 1. Environment Setup
Install dependencies:
```bash
pip install -r evaluation/requirements-evaluation.txt
```

### 2. Execute Entire Evaluation Pipeline
Run the master orchestrator:
```bash
python evaluation/run_all.py
```
This executes all 8 phases sequentially and outputs all JSON, CSV, TXT, and PNG artifacts into `evaluation/results/`.

### 3. Execute Individual Modules
You can also run any specific evaluation module independently:

```bash
# Phase 2: Dataset Audit
python evaluation/dataset_audit.py

# Phase 3: McRAPTOR Routing Quality & Waitlist Escape Rate
python evaluation/evaluate_routing.py

# Phase 4: 4D Pareto Dominance Stress Test
python evaluation/test_pareto.py

# Phase 5: Routing Latency & Memory Benchmarks (with figure generation)
python evaluation/benchmark_routing.py

# Phase 6: Modal Discovery Comparison (Rail vs Bus vs Multimodal)
python evaluation/compare_routing.py

# Phase 7: NLP Sentiment & Dense Semantic Query Evaluation
python evaluation/evaluate_nlp.py

# Phase 8: Fare Calculations & Transfer Boundary Tests
python evaluation/test_fare.py
python evaluation/test_transfers.py
```

