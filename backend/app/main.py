# app/main.py

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time

from app.graph_builder import build_graph, RailwayGraph
from app.search_engine import find_routes
from app.models import SearchResponse

# Global in-memory graph instance
graph_instance: RailwayGraph = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager: Runs ONCE when FastAPI starts up.
    Loads the railway graph into RAM and keeps it active.
    """
    global graph_instance
    print("[+] Initializing Railway Network into RAM...")
    start_t = time.time()
    graph_instance = build_graph("railway_data.db")
    load_time = round((time.time() - start_t) * 1000, 2)
    print(f"[+] Graph loaded successfully in {load_time} ms!")

    yield  # Server runs here listening for requests

    print("[-] Shutting down server and releasing memory.")


app = FastAPI(
    title="Train Journey Optimizer API",
    description="In-Memory Graph Search Engine for Indian Railways",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {
        "status": "online",
        "nodes_loaded": len(graph_instance.nodes) if graph_instance else 0
    }


@app.get("/api/v1/search", response_model=SearchResponse)
def search_train_routes(
    source: str = Query(..., description="Source station code (e.g. BZA)"),
    destination: str = Query(..., description="Destination station code (e.g. SRC)"),
    date: str = Query(..., description="Travel date in YYYY-MM-DD format"),
    max_transfers: int = Query(1, ge=0, le=2, description="Max transfers (0 or 1)"),
    top_k: int = Query(15, ge=1, le=50, description="Max results to return")
):
    """
    Search direct and 1-transfer train routes from source to destination.
    """
    src_code = source.strip().upper()
    dst_code = destination.strip().upper()

    if src_code not in graph_instance.nodes:
        raise HTTPException(status_code=404, detail=f"Source station '{src_code}' not found.")
    if dst_code not in graph_instance.nodes:
        raise HTTPException(status_code=404, detail=f"Destination station '{dst_code}' not found.")

    start_t = time.time()
    routes = find_routes(
        graph=graph_instance,
        source_code=src_code,
        dest_code=dst_code,
        travel_date_str=date,
        max_transfers=max_transfers,
        top_k=top_k
    )
    elapsed_ms = round((time.time() - start_t) * 1000, 2)

    return {
        "source": {
            "code": src_code,
            "name": graph_instance.nodes[src_code]["name"]
        },
        "destination": {
            "code": dst_code,
            "name": graph_instance.nodes[dst_code]["name"]
        },
        "travel_date": date,
        "total_options_found": len(routes),
        "search_time_ms": elapsed_ms,
        "options": routes
    }