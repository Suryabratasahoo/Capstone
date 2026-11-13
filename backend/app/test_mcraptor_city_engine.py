# Capstone/backend/app/test_mcraptor_city_engine.py
"""
Re-exports from app.mcraptor_city_engine to maintain 100% feature and logic parity.
"""

from app.mcraptor_city_engine import (
    run_mcraptor_city_search as run_test_mcraptor_city_search,
    get_leg_fare_and_status as get_test_leg_fare_and_status,
    is_dominated as is_test_dominated,
    merge_into_pareto_set as merge_into_test_pareto_set,
    get_train_seat_status as get_test_train_seat_status,
    find_smart_quota_unlock,
    run_mcraptor_city_search,
    get_leg_fare_and_status,
    is_dominated,
    merge_into_pareto_set,
    get_train_seat_status,
    STATUS_RANK,
    haversine_distance_km,
    sec_to_time_str,
    strip_prefix,
    get_path_coordinates,
)
