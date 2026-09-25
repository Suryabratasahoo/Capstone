
import re

with open('app/mcraptor_city_engine.py', 'r') as f:
    lines = f.readlines()

out = []
in_round_1 = False
for line in lines:
    if 'def run_mcraptor_search(' in line:
        out.append('def run_mcraptor_city_search(\n')
    elif 'source_stop_id: str,' in line:
        out.append('    source_city: str,\n')
    elif 'dest_stop_id: str,' in line:
        out.append('    dest_city: str,\n')
    elif 'source_stop_id = source_stop_id.strip()' in line:
        out.append('    source_city = source_city.strip().lower()\n')
    elif 'dest_stop_id = dest_stop_id.strip()' in line:
        out.append('    dest_city = dest_city.strip().lower()\n')
    elif 'if source_stop_id not in timetable.stops or dest_stop_id not in timetable.stops:' in line:
        out.append('    if source_city not in timetable.city_stops or dest_city not in timetable.city_stops:\n')
    elif 'pareto_results: List[dict] = []' in line:
        out.append(line)
        out.append('    source_stops = timetable.city_stops[source_city]\n')
        out.append('    dest_stops = set(timetable.city_stops[dest_city])\n')
    elif 'source_route_ids = timetable.stop_routes.get(source_stop_id, [])' in line:
        out.append('    for source_stop_id in source_stops:\n')
        out.append('        source_route_ids = timetable.stop_routes.get(source_stop_id, [])\n')
        in_round_1 = True
    elif '# ==================== FOOTPATH / TRANSFER STEP ====================' in line:
        in_round_1 = False
        out.append(line)
    elif 'if down_stop_id == dest_stop_id:' in line:
        out.append(line.replace('down_stop_id == dest_stop_id', 'down_stop_id in dest_stops'))
    elif 'if target_stop_id == dest_stop_id:' in line:
        out.append(line.replace('target_stop_id == dest_stop_id', 'target_stop_id in dest_stops'))
    elif 'dest_stop_id = dest_stop_id.strip()' in line:
        pass # removed above
    else:
        if in_round_1 and not line.strip().startswith('#'):
            out.append('    ' + line if line.strip() else line)
        else:
            # We also need to replace dest_stop_id with dest_stops checks in Round 2
            if 'dest_stop_id not in route_stops' in line:
                # We need to find the FIRST dest stop in the route
                # This is a bit tricky for Round 2, let's fix it later
                out.append(line)
            else:
                out.append(line)

with open('app/mcraptor_city_engine.py', 'w') as f:
    f.writelines(out)
