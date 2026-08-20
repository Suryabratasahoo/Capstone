# /backend/app/main.py
# Capstone/backend/app/main.py

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import os

# Cleaned McRAPTOR imports from local app package
from app.mcraptor_data import build_mcraptor_timetable, McRaptorTimetable
from app.mcraptor_engine import run_mcraptor_search

# Global In-Memory Instance
mcraptor_timetable: McRaptorTimetable = None

DB_PATH = os.path.join(os.path.dirname(__file__), "mcraptor_railway_database.db")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Server Lifespan Context Manager:
    Loads McRAPTOR Timetable & Seat Availability Maps into RAM on startup.
    """
    global mcraptor_timetable

    print("[+] Pre-processing McRAPTOR Timetable & Seat Availability Map into RAM...")
    start_t = time.time()
    mcraptor_timetable = build_mcraptor_timetable(DB_PATH)
    load_t = round((time.time() - start_t) * 1000, 2)
    print(f"[+] McRAPTOR Timetable & {len(mcraptor_timetable.seat_map)} Seat Records loaded in {load_t} ms!")

    yield

    print("[-] Shutting down server and releasing memory.")


app = FastAPI(
    title="Railway Journey Optimizer API",
    description="Multi-Criteria RAPTOR Engine optimizing Travel Time, Cost, Distance, and Seat Availability.",
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


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint used by the frontend to verify engine status."""
    return {
        "status": "online",
        "active_engine": "McRAPTOR Multi-Criteria",
        "mcraptor_seat_records": len(mcraptor_timetable.seat_map) if mcraptor_timetable else 0
    }


# =====================================================================
# MC-RAPTOR SEARCH ENDPOINT
# =====================================================================
@app.get("/api/search", tags=["Search"])
@app.get("/api/v3/mcraptor/search", tags=["Search"])
@app.get("/api/v3/search", tags=["Search"])
def search_mcraptor_routes(
    source: str = Query(..., description="Source station code (e.g. BZA)"),
    destination: str = Query(..., description="Destination station code (e.g. SRC)"),
    date: str = Query(..., description="Travel date in YYYY-MM-DD format (e.g. 2026-08-05)"),
    class_code: str = Query("3A", description="Travel class (3A, 2A, SL)"),
    top_k: int = Query(15, ge=1, le=50, description="Max Pareto routes to return")
):
    """
    Search routes using Multi-Criteria RAPTOR (McRAPTOR).
    Optimizes across Pareto Frontier evaluating Duration, Distance, Fare, and Seat Availability.
    """
    src_code = source.strip().upper()
    dst_code = destination.strip().upper()
    cls_code = class_code.strip().upper()

    if not mcraptor_timetable:
        raise HTTPException(status_code=503, detail="Timetable index not initialized.")

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
        class_code=cls_code,
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
        "travel_class": cls_code,
        "total_options_found": len(routes),
        "search_time_ms": elapsed_ms,
        "options": routes
    }