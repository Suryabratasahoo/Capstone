# =====================================================================
# RAILWAY MCRAPTOR BACKEND API & INTEGRATION GUIDE
# =====================================================================

FastAPI backend powered by an in-memory McRAPTOR (Multi-Criteria RAPTOR) 
routing engine optimizing Travel Time, Fare, Distance, and Seat Availability.


1. QUICK START
---------------------------------------------------------------------
Step 1: cd backend
Step 2: pip install -r requirements.txt
Step 3: uvicorn app.main:app --reload --port 8000

Base URL: http://127.0.0.1:8000
Interactive Docs (Swagger): http://127.0.0.1:8000/docs
Alternative Docs (ReDoc): http://127.0.0.1:8000/redoc


2. API ENDPOINTS
---------------------------------------------------------------------
HEALTH CHECK:
Method: GET
Endpoint: /health
Sample Response:
{
  "status": "online",
  "active_engine": "McRAPTOR Multi-Criteria",
  "mcraptor_seat_records": 436860
}

PARETO ROUTE SEARCH:
Method: GET
Endpoint: /api/search
Aliases: /api/v3/search, /api/v3/mcraptor/search

Query Parameters:
- source (string, required): Origin station code (e.g. BZA)
- destination (string, required): Destination station code (e.g. SRC)
- date (string, required): Travel date in YYYY-MM-DD format (e.g. 2026-08-05)
- class_code (string, optional, default: 3A): Travel class (SL, 3A, 2A)
- top_k (integer, optional, default: 15): Max Pareto routes (1-50)

Example Request:
GET http://127.0.0.1:8000/api/search?source=BZA&destination=SRC&date=2026-08-05&class_code=2A&top_k=15


3. SAMPLE JSON RESPONSE
---------------------------------------------------------------------
{
  "source": { "code": "BZA", "name": "Vijayawada Junction" },
  "destination": { "code": "SRC", "name": "Santragachi Junction" },
  "travel_date": "2026-08-05",
  "travel_class": "2A",
  "total_options_found": 1,
  "search_time_ms": 142.03,
  "options": [
    {
      "journey_type": "ONE_TRANSFER",
      "transfers": 1,
      "travel_class": "2A",
      "overall_status": "AVAILABLE",
      "available_seats": 12,
      "wl_number": 0,
      "total_price_inr": 6542,
      "interchange_station": {
        "code": "KUR",
        "name": "Khurda Road Junction",
        "layover_time": "2h 20m",
        "layover_minutes": 140
      },
      "total_duration_mins": 839,
      "total_duration": "13h 59m",
      "total_distance_km": 792.0,
      "legs": [
        {
          "leg_number": 1,
          "train_number": 22864,
          "train_name": "SMVB HWH AC EXP",
          "from_station": { "code": "BZA", "name": "Vijayawada Junction" },
          "to_station": { "code": "KUR", "name": "Khurda Road Junction" },
          "departure_time": "22:10",
          "arrival_time": "08:45",
          "distance_km": 760.0,
          "seat_status": "AVAILABLE",
          "price_inr": 5167
        },
        {
          "leg_number": 2,
          "train_number": 58002,
          "train_name": "PURI SRC PASS",
          "from_station": { "code": "KUR", "name": "Khurda Road Junction" },
          "to_station": { "code": "SRC", "name": "Santragachi Junction" },
          "departure_time": "11:05",
          "arrival_time": "12:09",
          "distance_km": 32.0,
          "seat_status": "AVAILABLE",
          "price_inr": 1375
        }
      ]
    }
  ]
}


4. TYPESCRIPT DEFINITIONS (For frontend/types/api.ts)
---------------------------------------------------------------------
export interface StationInfo {
  code: string;
  name: string;
}

export interface InterchangeStation {
  code: string;
  name: string;
  layover_time: string;
  layover_minutes: number;
}

export interface LegDetail {
  leg_number: number;
  train_number: number;
  train_name: string;
  from_station: StationInfo;
  to_station: StationInfo;
  departure_time: string;
  arrival_time: string;
  distance_km: number;
  seat_status: "AVAILABLE" | "RAC" | "WL" | "UNKNOWN";
  price_inr: number;
}

export interface JourneyOption {
  journey_type: "DIRECT" | "ONE_TRANSFER";
  transfers: number;
  travel_class: "SL" | "3A" | "2A";
  overall_status: "AVAILABLE" | "RAC" | "WL" | "UNKNOWN";
  available_seats: number;
  wl_number: number;
  total_price_inr: number;
  interchange_station: InterchangeStation | null;
  total_duration_mins: number;
  total_duration: string;
  total_distance_km: number;
  legs: LegDetail[];
}

export interface SearchApiResponse {
  source: StationInfo;
  destination: StationInfo;
  travel_date: string;
  travel_class: string;
  total_options_found: number;
  search_time_ms: number;
  options: JourneyOption[];
}


5. FRONTEND INTEGRATION RULES
---------------------------------------------------------------------
1. DIRECT vs TRANSFER:
   - If journey_type is DIRECT: interchange_station is null, transfers is 0, legs has 1 item.
   - If journey_type is ONE_TRANSFER: interchange_station contains junction code, name, layover.

2. STATUS BADGES:
   - AVAILABLE: Green badge showing available_seats.
   - RAC: Yellow badge showing wl_number.
   - WL: Red badge showing wl_number.

3. CORS:
   - Enabled for all origins by default (http://localhost:3000 supported).