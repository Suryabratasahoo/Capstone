import sys
sys.path.insert(0, '.')
from app.mcraptor_data import build_mcraptor_timetable
from app.mcraptor_city_engine import run_mcraptor_city_search
tb = build_mcraptor_timetable('app/final.db')
res = run_mcraptor_city_search(tb, 'Vijayawada', 'Bengaluru', top_k=25)
print('Total:', len(res))
for r in res[:10]:
    print(f'Mode 0: {r["legs"][0].get("mode")}, Type: {r["journey_type"]}')
