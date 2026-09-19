# Capstone/backend/app/main.py

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import os

from app.mcraptor_data import build_mcraptor_timetable, McRaptorTimetable
from app.mcraptor_engine import run_mcraptor_search

mcraptor_timetable: McRaptorTimetable = None

# Default path points to final.db in backend/app/
DB_PATH = os.path.join(os.path.dirname(__file__), "final.db")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global mcraptor_timetable

    print("[+] Loading McRAPTOR Timetable from final.db into RAM...")
    start_t = time.time()
    mcraptor_timetable = build_mcraptor_timetable(DB_PATH)
    load_t = round((time.time() - start_t) * 1000, 2)
    print(f"[+] Loaded {len(mcraptor_timetable.stops)} stops, {len(mcraptor_timetable.trips)} trips, and {len(mcraptor_timetable.seat_map)} seat/fare records in {load_t} ms!")

    yield

    print("[-] Shutting down server and releasing memory.")


app = FastAPI(
    title="Multi-Modal Journey Optimizer API",
    description="Multi-Criteria RAPTOR Engine for Trains, Buses, and Transfers.",
    version="4.0.0",
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
    return {
        "status": "online",
        "active_engine": "McRAPTOR Unified Multi-Modal",
        "total_stops": len(mcraptor_timetable.stops) if mcraptor_timetable else 0,
        "total_trips": len(mcraptor_timetable.trips) if mcraptor_timetable else 0,
        "mcraptor_seat_records": len(mcraptor_timetable.seat_map) if mcraptor_timetable else 0
    }


def resolve_stop_id(raw_input: str, timetable: McRaptorTimetable) -> str:
    """Helper to automatically add RAIL: or BUS: prefix if user enters raw code."""
    raw = raw_input.strip()
    if raw in timetable.stops:
        return raw

    rail_id = f"RAIL:{raw.upper()}"
    if rail_id in timetable.stops:
        return rail_id

    bus_id = f"BUS:{raw.upper()}"
    if bus_id in timetable.stops:
        return bus_id

    return raw


@app.get("/api/search", tags=["Search"])
@app.get("/api/v3/mcraptor/search", tags=["Search"])
@app.get("/api/v3/search", tags=["Search"])
def search_mcraptor_routes(
    source: str = Query(..., description="Source station/stop ID (e.g. BZA or RAIL:BZA)"),
    destination: str = Query(..., description="Destination station/stop ID (e.g. SRC or RAIL:SRC)"),
    departure_time: str = Query("08:00", description="Departure time in HH:MM format (e.g. 08:00)"),
    date: str = Query("2026-08-01", description="Travel date in YYYY-MM-DD format (e.g. 2026-08-01)"),
    class_code: str = Query("3A", description="Travel class (3A, 2A, SL)"),
    top_k: int = Query(15, ge=1, le=50, description="Max Pareto routes to return")
):
    if not mcraptor_timetable:
        raise HTTPException(status_code=503, detail="Timetable index not initialized.")

    src_stop_id = resolve_stop_id(source, mcraptor_timetable)
    dst_stop_id = resolve_stop_id(destination, mcraptor_timetable)
    cls_code = class_code.strip().upper()

    if src_stop_id not in mcraptor_timetable.stops:
        raise HTTPException(status_code=404, detail=f"Source stop '{source}' not found in database.")
    if dst_stop_id not in mcraptor_timetable.stops:
        raise HTTPException(status_code=404, detail=f"Destination stop '{destination}' not found in database.")

    start_t = time.time()
    routes = run_mcraptor_search(
        timetable=mcraptor_timetable,
        source_stop_id=src_stop_id,
        dest_stop_id=dst_stop_id,
        departure_time_str=departure_time,
        travel_date_str=date,
        travel_class=cls_code,
        top_k=top_k
    )
    elapsed_ms = round((time.time() - start_t) * 1000, 2)

    return {
        "source": {
            "id": src_stop_id,
            "name": mcraptor_timetable.stops[src_stop_id]["name"]
        },
        "destination": {
            "id": dst_stop_id,
            "name": mcraptor_timetable.stops[dst_stop_id]["name"]
        },
        "departure_time": departure_time,
        "travel_date": date,
        "travel_class": cls_code,
        "total_options_found": len(routes),
        "search_time_ms": elapsed_ms,
        "options": routes
    }