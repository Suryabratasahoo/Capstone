# 🚂 Route Recommendation System

A **semantic-search-powered** route recommendation engine for Indian Railways trains. Given a natural-language query (e.g. *"clean AC with good food"*), the system returns the **top 3 recommended trains** rated out of **5 stars**, backed by real user review data.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 **Semantic Search** | Uses `sentence-transformers` (MiniLM-L6-v2) to understand the *meaning* of queries, not just keywords |
| 💬 **Sentiment Analysis** | TextBlob-based sentiment scoring of every review |
| 🏷️ **Keyword Extraction** | NLTK-powered noun/adjective extraction surfaces key highlights for each route |
| ⭐ **Hybrid Ratings** | Final ratings (1–5 stars) combine text similarity, sentiment, and community upvotes |
| ⚡ **Caching** | `joblib`-powered caching of processed data and embeddings for near-instant restarts |
| 🌐 **REST API** | FastAPI server for integration with any frontend or mobile app |
| 💻 **CLI Mode** | Interactive terminal interface for direct testing |

---

## 📁 Project Structure

```
route-recommender-sys/
│
├── data_processor.py        # CSV loading, sentiment analysis, keyword extraction, caching
├── recommender.py           # Semantic search engine, scoring & rating logic
├── api.py                   # FastAPI REST API server
├── main.py                  # CLI / interactive interface
├── requirements.txt         # Python dependencies
│
├── reviews_train.csv          # Raw train review dataset
│
# Auto-generated (first run):
├── processed_data_train.pkl       # Cached aggregated DataFrame (joblib)
└── embeddings_cache_train.pkl     # Cached sentence embeddings (joblib)
```

---

## 🛠️ Setup & Installation

### Prerequisites
- Python 3.9+

### Install Dependencies

```bash
pip install -r requirements.txt
```

> [!NOTE]
> On the first run, the system will automatically download the `all-MiniLM-L6-v2` model (~80MB) and compute embeddings for all routes. Subsequent runs use cached data and start instantly.

---

## 🚀 Usage

### 1. REST API Server (Recommended)

Start the FastAPI server:

```bash
python api.py
```

The server starts at `http://localhost:8000`.

**Interactive API Docs:** Visit `http://localhost:8000/docs` in your browser.

**Example Request:**

```
GET http://localhost:8000/recommend?query=clean+and+comfortable+AC&top_n=3
```

**Example Response:**

```json
[
  {
    "train_number": 16536,
    "train_name": "GOLGUMBAZ EXP",
    "rating": 4.3,
    "highlights": ["clean", "food", "good", "service", "comfortable"],
    "similarity_score": 0.421,
    "sentiment_score": 0.12,
    "total_upvotes": 328.0
  },
  ...
]
```

---

### 2. CLI / Interactive Mode

```bash
python main.py
```

Type any query and get real-time results:

```
> clean and fast train
Top 3 recommendations:
1. GOLGUMBAZ EXP (16536)   Rating: 4.3 / 5
2. CBE HSR AC EXP (22476)  Rating: 3.8 / 5
3. ANANTAPURI EXP (20635)  Rating: 3.7 / 5
```

### 3. Single Query Mode (API Style CLI)

```bash
python main.py --query "worst food and dirty" --top-n 3
```

---

## ⚙️ How Ratings Work

The final **1–5 star rating** for each route is a weighted combination of three signals:

```
Rating = 1 + (final_score × 4)

Where:
  final_score = 0.75 × (Semantic Similarity)
              + 0.15 × (Normalised Sentiment)
              + 0.10 × (Normalised Upvotes)
```

| Signal | Weight | Source |
|---|---|---|
| Semantic Similarity | 75% | How well the reviews match your query |
| Sentiment Score | 15% | Overall positive/negative tone of reviews |
| Community Upvotes | 10% | Total upvotes across all reviews |

---

## 📦 Dependencies

| Library | Purpose |
|---|---|
| `pandas` | Data loading and aggregation |
| `scikit-learn` | Cosine similarity computation |
| `nltk` | Tokenization and POS tagging for keyword extraction |
| `textblob` | Sentiment analysis of individual reviews |
| `sentence-transformers` | Semantic embeddings using MiniLM-L6-v2 |
| `joblib` | Disk caching of processed data and embeddings |
| `fastapi` | REST API framework |
| `uvicorn` | ASGI server for FastAPI |

---

## 📊 Dataset

The system uses `reviews_train.csv`, a dataset of **~10,000** synthetic Indian Railways train reviews scraped from ConfirmTKT.

| Column | Description |
|---|---|
| `train_number` | Train ID |
| `train_name` | Train Name |
| `review` | User review text |
| `upvotes` | Community upvotes on the review |
| `author` | Reviewer name |
| `created_at` | Review timestamp |
