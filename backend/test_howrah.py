import sys
sys.path.insert(0, '.')
from app.mcraptor_data import build_mcraptor_timetable
from app.mcraptor_city_engine import CITY_ALIASES

tb = build_mcraptor_timetable('app/final.db')

query = 'howrah'
alias = CITY_ALIASES.get(query, query)
print(f'howrah alias: {alias}')

all_stops = list(tb.city_stops.get(alias, []))
for city_key, stops in tb.city_stops.items():
    if city_key != alias and alias in city_key:
        all_stops.extend(stops)

print(f'\nStops resolved for {alias}:')
for stop_id in all_stops:
    print(f'  {stop_id}: {tb.stops[stop_id]["name"]} (City: {tb.stops[stop_id]["city"]})')

if alias != query:
    all_stops_orig = list(tb.city_stops.get(query, []))
    for city_key, stops in tb.city_stops.items():
        if city_key != query and query in city_key:
            all_stops_orig.extend(stops)
    print(f'\nStops that WOULD resolve for {query} directly:')
    for stop_id in all_stops_orig:
        print(f'  {stop_id}: {tb.stops[stop_id]["name"]} (City: {tb.stops[stop_id]["city"]})')
