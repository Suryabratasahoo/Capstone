# /app/main.py

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time

# Engine 1: Legacy Graph Imports
from app.graph_builder import build_graph, RailwayGraph
from app.search_engine import find_routes as find_routes_legacy

# Engine 2: RAPTOR Imports
from app.raptor.raptor_data import build_raptor_timetable, RaptorTimetable
from app.raptor.raptor_engine import run_raptor_search

# Engine 3: McRAPTOR Imports
from app.mcraptor.mcraptor_data import build_mcraptor_timetable, McRaptorTimetable
from app.mcraptor.mcraptor_engine import run_mcraptor_search

from app.models import SearchResponse

# Global In-Memory Instances
graph_instance: RailwayGraph = None
raptor_timetable: RaptorTimetable = None
mcraptor_timetable: McRaptorTimetable = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Server Lifespan Context Manager:
    Loads Legacy Graph, RAPTOR Timetable, and McRAPTOR Timetable (with Seat Maps) into RAM on startup.
    """
    global graph_instance, raptor_timetable, mcraptor_timetable

    print("[+] Loading Legacy Railway Graph into RAM...")
    start_t = time.time()
    graph_instance = build_graph("railway_data.db")
    load_t1 = round((time.time() - start_t) * 1000, 2)
    print(f"[+] Legacy Graph loaded in {load_t1} ms!")

    print("[+] Pre-processing RAPTOR Timetable Arrays into RAM...")
    start_t = time.time()
    raptor_timetable = build_raptor_timetable("railway_data.db")
    load_t2 = round((time.time() - start_t) * 1000, 2)
    print(f"[+] RAPTOR Arrays loaded in {load_t2} ms!")

    print("[+] Pre-processing McRAPTOR Timetable & Seat Availability Map into RAM...")
    start_t = time.time()
    mcraptor_timetable = build_mcraptor_timetable("app/mcraptor/mcraptor_railway_database.db")
    load_t3 = round((time.time() - start_t) * 1000, 2)
    print(f"[+] McRAPTOR Timetable & {len(mcraptor_timetable.seat_map)} Seat Maps loaded in {load_t3} ms!")

    yield

    print("[-] Shutting down server and releasing memory.")


app = FastAPI(
    title="Train Journey Optimizer API",
    description="Multi-Engine API: Legacy Graph, Standard RAPTOR, and Multi-Criteria McRAPTOR Algorithm",
    version="3.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Simple health check endpoint returning node/route metrics for all three engines."""
    return {
        "status": "online",
        "legacy_nodes": len(graph_instance.nodes) if graph_instance else 0,
        "raptor_routes": len(raptor_timetable.routes) if raptor_timetable else 0,
        "mcraptor_seat_records": len(mcraptor_timetable.seat_map) if mcraptor_timetable else 0
    }


# =====================================================================
# ENDPOINT 1: LEGACY GRAPH APPROACH (Used by team main frontend)
# =====================================================================
@app.get("/api/v1/search", response_model=SearchResponse)
def search_train_routes(
    source: str = Query(..., description="Source station code (e.g. BZA)"),
    destination: str = Query(..., description="Destination station code (e.g. SRC)"),
    date: str = Query(..., description="Travel date in YYYY-MM-DD format"),
    max_transfers: int = Query(1, ge=0, le=2, description="Max transfers (0 or 1)"),
    top_k: int = Query(15, ge=1, le=50, description="Max results to return")
):
    """
    Search direct and 1-transfer train routes using Legacy Graph Adjacency algorithm.
    """
    src_code = source.strip().upper()
    dst_code = destination.strip().upper()

    if src_code not in graph_instance.nodes:
        raise HTTPException(status_code=404, detail=f"Source station '{src_code}' not found.")
    if dst_code not in graph_instance.nodes:
        raise HTTPException(status_code=404, detail=f"Destination station '{dst_code}' not found.")

    start_t = time.time()
    routes = find_routes_legacy(
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


# =====================================================================
# ENDPOINT 2: STANDARD RAPTOR APPROACH (Used by test benchmark frontend)
# =====================================================================
@app.get("/api/v2/raptor/search", response_model=SearchResponse)
def search_raptor_routes(
    source: str = Query(..., description="Source station code (e.g. BZA)"),
    destination: str = Query(..., description="Destination station code (e.g. SRC)"),
    date: str = Query(..., description="Travel date in YYYY-MM-DD format"),
    top_k: int = Query(15, ge=1, le=50, description="Max results to return")
):
    """
    Search direct and 1-transfer train routes using Round-Based RAPTOR Algorithm.
    """
    src_code = source.strip().upper()
    dst_code = destination.strip().upper()

    if src_code not in raptor_timetable.stations:
        raise HTTPException(status_code=404, detail=f"Source station '{src_code}' not found.")
    if dst_code not in raptor_timetable.stations:
        raise HTTPException(status_code=404, detail=f"Destination station '{dst_code}' not found.")

    start_t = time.time()
    routes = run_raptor_search(
        timetable=raptor_timetable,
        source_code=src_code,
        dest_code=dst_code,
        travel_date_str=date,
        top_k=top_k
    )
    elapsed_ms = round((time.time() - start_t) * 1000, 2)

    return {
        "source": {
            "code": src_code,
            "name": raptor_timetable.stations[src_code]
        },
        "destination": {
            "code": dst_code,
            "name": raptor_timetable.stations[dst_code]
        },
        "travel_date": date,
        "total_options_found": len(routes),
        "search_time_ms": elapsed_ms,
        "options": routes
    }


# =====================================================================
# ENDPOINT 3: MC-RAPTOR APPROACH (Multi-Criteria: Time, Distance, Price, Seats)
# =====================================================================
@app.get("/api/v3/mcraptor/search")
def search_mcraptor_routes(
    source: str = Query(..., description="Source station code (e.g. BZA)"),
    destination: str = Query(..., description="Destination station code (e.g. SRC)"),
    date: str = Query(..., description="Travel date in YYYY-MM-DD format"),
    class_code: str = Query("3A", description="Travel class (3A, 2A, SL)"),
    top_k: int = Query(15, ge=1, le=50, description="Max results to return")
):
    """
    Search routes using Multi-Criteria RAPTOR (McRAPTOR).
    Optimizes across Pareto Frontier evaluating Duration, Distance, Fare, and Seat Availability.
    """
    src_code = source.strip().upper()
    dst_code = destination.strip().upper()

    if src_code not in mcraptor_timetable.stations:
        raise HTTPException(status_code=404, detail=f"Source station '{src_code}' not found.")
    if dst_code not in mcraptor_timetable.stations:
        raise HTTPException(status_code=404, detail=f"Destination station '{dst_code}' not found.")

    start_t = time.time()
    routes = run_mcraptor_search(
        timetable=mcraptor_timetable,
        source_code=src_code,
        dest_code=dst_code,
        travel_date_str=date,
        class_code=class_code,
        top_k=top_k
    )
    elapsed_ms = round((time.time() - start_t) * 1000, 2)

    return {
        "source": {
            "code": src_code,
            "name": mcraptor_timetable.stations[src_code]
        },
        "destination": {
            "code": dst_code,
            "name": mcraptor_timetable.stations[dst_code]
        },
        "travel_date": date,
        "travel_class": class_code.upper(),
        "total_options_found": len(routes),
        "search_time_ms": elapsed_ms,
        "options": routes
    }