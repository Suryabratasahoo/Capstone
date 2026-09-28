import sys
sys.path.insert(0, '.')
from app.mcraptor_data import build_mcraptor_timetable
from app.mcraptor_city_engine import run_mcraptor_city_search
import json

tb = build_mcraptor_timetable('app/final.db')
results = run_mcraptor_city_search(tb, 'Vijayawada', 'Katpadi', top_k=50)
print(f'Total results: {len(results)}')

has_double_transfer = False
for r in results:
    if len(r['legs']) >= 3:
        l1 = r['legs'][0]
        l2 = r['legs'][1]
        l3 = r['legs'][2]
        if l2['service_number'] == 'TRANSFER':
            if l1['to_stop']['id'] == l2['to_stop']['id']:
                print(f"BAD ROUTE FOUND: {l1['service_number']} arrived at {l1['to_stop']['id']}, then transfer to {l2['to_stop']['id']}")
                has_double_transfer = True

if not has_double_transfer:
    print('SUCCESS: No ping-pong transfers detected!')
