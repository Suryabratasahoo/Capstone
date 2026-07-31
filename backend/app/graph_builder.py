# app/graph_builder.py

import sqlite3
import os

class RailwayGraph:
    def __init__(self):
        self.nodes = {}  # {station_code: {"name": str}}
        self.adjacency_list = {}  # {from_station_code: [edge_dict, ...]}

    def add_station(self, code: str, name: str):
        if code not in self.nodes:
            self.nodes[code] = {"name": name}
            self.adjacency_list[code] = []

    def add_edge(self, from_stn: str, to_stn: str, train_num: int, train_name: str,
                 arr_time: str, dep_time: str, distance_km: float,
                 day_dep: int, day_arr: int, running_days: dict):
        if from_stn not in self.adjacency_list:
            self.adjacency_list[from_stn] = []

        self.adjacency_list[from_stn].append({
            "to_station": to_stn,
            "train_number": train_num,
            "train_name": train_name,
            "arr_time": arr_time,
            "dep_time": dep_time,
            "distance_km": distance_km,
            "journey_day_dep": day_dep,
            "journey_day_arr": day_arr,
            "running_days": running_days
        })

    def get_outgoing_edges(self, station_code: str):
        return self.adjacency_list.get(station_code, [])


def build_graph(db_path: str = "railway_data.db") -> RailwayGraph:
    """Builds and returns the in-memory RailwayGraph instance from SQLite DB."""
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database file '{db_path}' not found at root directory.")

    graph = RailwayGraph()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Load Station Nodes
    cursor.execute("SELECT station_code, station_name FROM stations")
    for stn_code, stn_name in cursor.fetchall():
        graph.add_station(stn_code, stn_name)

    # 2. Load Train Running Days Map
    cursor.execute("""
        SELECT train_number, train_name, runs_sun, runs_mon, runs_tue, runs_wed, runs_thu, runs_fri, runs_sat 
        FROM trains
    """)
    trains_info = {}
    for row in cursor.fetchall():
        t_num = row[0]
        trains_info[t_num] = {
            "name": row[1],
            "runs": {
                "SUN": bool(row[2]), "MON": bool(row[3]), "TUE": bool(row[4]),
                "WED": bool(row[5]), "THU": bool(row[6]), "FRI": bool(row[7]), "SAT": bool(row[8])
            }
        }

    # 3. Load Consecutive Stop Segments (Edges)
    cursor.execute("""
        SELECT train_number, stop_sequence, station_code, arrival_time, departure_time, distance_km, journey_day 
        FROM train_stops 
        ORDER BY train_number, stop_sequence
    """)
    all_stops = cursor.fetchall()
    conn.close()

    current_train = None
    prev_stop = None

    for stop in all_stops:
        t_num, seq, stn_code, arr_time, dep_time, dist_km, day = stop

        # Reset tracker on new train encounter
        if t_num != current_train:
            current_train = t_num
            prev_stop = stop
            continue

        p_num, p_seq, p_code, p_arr, p_dep, p_dist, p_day = prev_stop
        segment_dist = round(dist_km - p_dist, 2)

        t_info = trains_info.get(t_num, {})
        
        graph.add_edge(
            from_stn=p_code,
            to_stn=stn_code,
            train_num=t_num,
            train_name=t_info.get("name", "Unknown Train"),
            arr_time=arr_time if arr_time else dep_time,
            dep_time=p_dep if p_dep else p_arr,
            distance_km=segment_dist,
            day_dep=p_day,
            day_arr=day,
            running_days=t_info.get("runs", {})
        )

        prev_stop = stop

    return graph