# backend/app/models.py

from pydantic import BaseModel
from typing import List, Optional


class StopRef(BaseModel):
    code: str
    name: str
    stop_type: str = "TRAIN"  # "TRAIN", "BUS", or "INTERCHANGE"


class Leg(BaseModel):
    leg_number: int
    mode: str = "TRAIN"  # "TRAIN", "BUS", or "WALK"
    trip_identifier: Optional[str] = None  # Replaces train_number to support alphanumeric bus IDs
    service_name: str  # Replaces train_name (e.g., "Express Bus 101" or "Rajdhani Express")
    from_stop: StopRef
    to_stop: StopRef
    departure_time: str
    arrival_time: str
    distance_km: float


class TransferDetail(BaseModel):
    code: str
    name: str
    stop_type: str = "INTERCHANGE"
    layover_time: str
    layover_minutes: int


class FootpathTransfer(BaseModel):
    from_stop_code: str
    to_stop_code: str
    min_transfer_time_mins: int
    walking_distance_m: float


class RouteOption(BaseModel):
    journey_type: str  # "DIRECT", "ONE_TRANSFER", "MULTI_MODAL"
    transfers: int
    total_duration: str
    total_duration_mins: int
    total_distance_km: float
    score: Optional[float] = None
    interchange_station: Optional[TransferDetail] = None
    legs: List[Leg]


class SearchResponse(BaseModel):
    source: StopRef
    destination: StopRef
    travel_date: str
    total_options_found: int
    search_time_ms: float
    options: List[RouteOption]