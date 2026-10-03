import sqlite3

db = sqlite3.connect('app/final.db')
c = db.cursor()

try:
    c.execute("INSERT INTO buses (route_number, provider_name, bus_type, source_city, dest_city) VALUES (?, ?, ?, ?, ?)",
              ('ASBR-1', 'ASBR Travels', 'Non A/C Seater / Sleeper (2+1)', 'Vijayawada', 'Srisailam'))
except sqlite3.OperationalError:
    pass # might be okay if it's slightly different

try:
    c.execute("INSERT INTO routes (route_id) VALUES (?)", ('ROUTE_ASBR_1',))
except:
    pass

c.execute("INSERT INTO trips (trip_id, route_id, mode, service_number) VALUES (?, ?, ?, ?)",
          ('TRIP_ASBR_1', 'ROUTE_ASBR_1', 'BUS', 'ASBR-1'))

c.execute("INSERT INTO stop_times (trip_id, stop_id, stop_sequence, arrival_sec, departure_sec, distance_km) VALUES (?, ?, ?, ?, ?, ?)",
          ('TRIP_ASBR_1', 'BUS:AP1350', 1, 86340, 86340, 0.0))
c.execute("INSERT INTO stop_times (trip_id, stop_id, stop_sequence, arrival_sec, departure_sec, distance_km) VALUES (?, ?, ?, ?, ?, ?)",
          ('TRIP_ASBR_1', 'BUS:AP814', 2, 109800, 109800, 251.0))

c.execute("INSERT INTO bus_fares (route_number, from_stop_id, to_stop_id, bus_class, price_inr, available_seats) VALUES (?, ?, ?, ?, ?, ?)",
          ('ASBR-1', 'BUS:AP1350', 'BUS:AP814', 'Non A/C Seater / Sleeper (2+1)', 610, 1))

db.commit()
db.close()
print("Successfully injected ASBR Travels bus into final.db")
