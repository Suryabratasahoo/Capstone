# app/models.py

from pydantic import BaseModel
from typing import List, Optional


class StationRef(BaseModel):
    code: str
    name: str


class TrainLeg(BaseModel):
    leg_number: int
    train_number: int
    train_name: str
    from_station: StationRef
    to_station: StationRef
    departure_time: str
    arrival_time: str
    distance_km: float


class InterchangeDetail(BaseModel):
    code: str
    name: str
    layover_time: str
    layover_minutes: int


class RouteOption(BaseModel):
    journey_type: str  # "DIRECT" or "ONE_TRANSFER"
    transfers: int
    total_duration: str
    total_duration_mins: int
    total_distance_km: float
    score: Optional[float] = None  # <-- ADD THIS LINE HERE
    interchange_station: Optional[InterchangeDetail] = None
    legs: List[TrainLeg]


class SearchResponse(BaseModel):
    source: StationRef
    destination: StationRef
    travel_date: str
    total_options_found: int
    search_time_ms: float
    options: List[RouteOption]