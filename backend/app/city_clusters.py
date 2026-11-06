"""
city_clusters.py — Regional transit clusters & station summaries for Indian cities.
Unifies metropolitan areas (e.g. Visakhapatnam + Duvvada, Hyderabad + Secunderabad, Kolkata + Howrah, Bengaluru)
and provides short station summaries in accent foreground for search autocomplete.
"""

from typing import Dict, List, Optional
import re

METRO_CLUSTERS: Dict[str, dict] = {
    "visakhapatnam": {
        "canonical_name": "Visakhapatnam",
        "aliases": ["visakhapatnam", "vizag", "waltair", "etapalem", "duvvada", "visakhapatnam rural", "old gajuwaka", "pendurthi", "vskp", "dvd", "scm"],
        "included_db_cities": ["visakhapatnam", "etapalem", "visakhapatnam rural", "old gajuwaka", "pendurthi"],
        "key_rail_codes": ["VSKP", "DVD", "SCM", "MIPM"],
        "summary": "VSKP, DVD, SCM • Dwaraka, Gajuwaka Bus Stands"
    },
    "bengaluru": {
        "canonical_name": "Bengaluru",
        "aliases": ["bengaluru", "bangalore", "blr", "bangalore south", "anekal", "sbc", "ypr", "smvb", "bnc", "kjm"],
        "included_db_cities": ["bengaluru", "bangalore", "bangalore south", "anekal"],
        "key_rail_codes": ["SBC", "YPR", "SMVB", "BNC", "KJM", "YNK"],
        "summary": "SBC, YPR, SMVB, BNC • Majestic Bus Stand"
    },
    "hyderabad": {
        "canonical_name": "Hyderabad",
        "aliases": ["hyderabad", "secunderabad", "hyd", "cyberabad", "alwal mandal", "balapur mandal", "keesara mandal", "medipally mandal", "sc", "hyb", "kcg", "chz", "lpi"],
        "included_db_cities": ["hyderabad", "secunderabad", "alwal mandal", "balapur mandal", "keesara mandal", "medipally mandal"],
        "key_rail_codes": ["SC", "HYB", "KCG", "CHZ", "LPI"],
        "summary": "SC, HYB, KCG, CHZ • MGBS, JBS Bus Stands"
    },
    "secunderabad": {
        "canonical_name": "Secunderabad",
        "aliases": ["secunderabad", "hyderabad", "sc", "hyb"],
        "included_db_cities": ["secunderabad", "hyderabad"],
        "key_rail_codes": ["SC", "HYB", "KCG", "CHZ"],
        "summary": "SC, HYB, KCG • JBS, MGBS Bus Stands"
    },
    "kolkata": {
        "canonical_name": "Kolkata",
        "aliases": ["kolkata", "haora", "howrah", "calcutta", "sankrail", "howrah/kolkata", "baranagar", "bally", "hwh", "sdah", "src", "shm"],
        "included_db_cities": ["kolkata", "haora", "sankrail", "howrah/kolkata", "howrah", "calcutta", "baranagar", "bally"],
        "key_rail_codes": ["HWH", "SDAH", "SRC", "SHM"],
        "summary": "HWH, SDAH, SRC, SHM • Esplanade Bus Stand"
    },
    "howrah": {
        "canonical_name": "Howrah",
        "aliases": ["howrah", "haora", "kolkata", "calcutta", "sankrail", "howrah/kolkata", "hwh", "sdah", "src"],
        "included_db_cities": ["haora", "kolkata", "sankrail", "howrah/kolkata", "howrah"],
        "key_rail_codes": ["HWH", "SRC", "SDAH", "SHM"],
        "summary": "HWH, SRC, SDAH • Esplanade, Howrah Bus Stands"
    },
    "vijayawada": {
        "canonical_name": "Vijayawada",
        "aliases": ["vijayawada", "bza", "amaravati", "amaravathi", "rayanapad station", "penamaluru", "ryp"],
        "included_db_cities": ["vijayawada", "rayanapad station", "amaravati", "amaravathi", "penamaluru"],
        "key_rail_codes": ["BZA", "RYP"],
        "summary": "BZA, RYP • PNBS (Pandit Nehru Bus Station)"
    },
    "delhi": {
        "canonical_name": "Delhi",
        "aliases": ["delhi", "new delhi", "ndls", "dli", "ncr", "delhi ncr", "nzm", "anvt"],
        "included_db_cities": ["delhi"],
        "key_rail_codes": ["NDLS", "NZM", "ANVT", "SZM"],
        "summary": "NDLS, NZM, ANVT • ISBT Kashmere Gate"
    },
    "mumbai": {
        "canonical_name": "Mumbai",
        "aliases": ["mumbai", "bombay", "csmt", "kalyan-dombivli", "bhiwandi", "ltt", "dr"],
        "included_db_cities": ["mumbai", "kalyan-dombivli", "bhiwandi"],
        "key_rail_codes": ["CSMT", "LTT", "DR"],
        "summary": "CSMT, LTT, DR • Central ST Stand"
    },
    "chennai": {
        "canonical_name": "Chennai",
        "aliases": ["chennai", "madras", "mas", "chennai corporation", "alandur", "pallavaram", "ms", "tbm"],
        "included_db_cities": ["chennai", "chennai corporation", "alandur", "pallavaram"],
        "key_rail_codes": ["MAS", "MS", "TBM", "PER"],
        "summary": "MAS, MS, TBM • CMBT Koyambedu Bus Stand"
    },
    "bhubaneswar": {
        "canonical_name": "Bhubaneswar",
        "aliases": ["bhubaneswar", "bhubaneshwar", "bbs", "bhubaneswar municipal corporation", "nandankanan"],
        "included_db_cities": ["bhubaneswar", "bhubaneshwar", "bhubaneswar municipal corporation", "nandankanan"],
        "key_rail_codes": ["BBS", "MCS"],
        "summary": "BBS, MCS • Baramunda ISBT"
    },
    "sambalpur": {
        "canonical_name": "Sambalpur",
        "aliases": ["sambalpur", "sbp", "ainthapali"],
        "included_db_cities": ["sambalpur", "ainthapali"],
        "key_rail_codes": ["SBP", "SBPY"],
        "summary": "SBP, SBPY • Ainthapali Bus Stand"
    },
    "pune": {
        "canonical_name": "Pune",
        "aliases": ["pune", "poona", "pune jn"],
        "included_db_cities": ["pune"],
        "key_rail_codes": ["PUNE", "SVJR"],
        "summary": "PUNE, SVJR • Swargate Bus Stand"
    },
    "ahmedabad": {
        "canonical_name": "Ahmedabad",
        "aliases": ["ahmedabad", "amdavad", "adi", "maninagar taluka"],
        "included_db_cities": ["ahmedabad", "maninagar taluka"],
        "key_rail_codes": ["ADI", "SBT"],
        "summary": "ADI, SBT • Geeta Mandir Bus Station"
    },
    "tirupati": {
        "canonical_name": "Tirupati",
        "aliases": ["tirupati", "tpty", "renigunta", "ru"],
        "included_db_cities": ["tirupati", "renigunta"],
        "key_rail_codes": ["TPTY", "RU"],
        "summary": "TPTY, RU • Central Bus Stand"
    },
    "cuttack": {
        "canonical_name": "Cuttack",
        "aliases": ["cuttack", "ctc"],
        "included_db_cities": ["cuttack"],
        "key_rail_codes": ["CTC", "KTJI"],
        "summary": "CTC • Badambadi Bus Station"
    },
    "guntur": {
        "canonical_name": "Guntur",
        "aliases": ["guntur", "gnt"],
        "included_db_cities": ["guntur"],
        "key_rail_codes": ["GNT", "NGNT"],
        "summary": "GNT • NTR Bus Station"
    },
    "jharsuguda": {
        "canonical_name": "Jharsuguda",
        "aliases": ["jharsuguda", "jsg"],
        "included_db_cities": ["jharsuguda"],
        "key_rail_codes": ["JSG", "DTV"],
        "summary": "JSG, DTV • Old Bus Stand"
    },
    "nellore": {
        "canonical_name": "Nellore",
        "aliases": ["nellore", "nlr"],
        "included_db_cities": ["nellore"],
        "key_rail_codes": ["NLR", "VDE"],
        "summary": "NLR • PSR Bus Station"
    }
}


def get_cluster_for_query(query: str) -> Optional[dict]:
    """Finds matching metro cluster configuration for a query string."""
    q = (query or "").strip().lower()
    if not q:
        return None

    if q in METRO_CLUSTERS:
        return METRO_CLUSTERS[q]

    for cluster in METRO_CLUSTERS.values():
        if q == cluster["canonical_name"].lower() or q in cluster["aliases"]:
            return cluster

    return None


def get_cluster_stop_ids(query: str, timetable) -> List[str]:
    """
    Returns all unified stop IDs (both rail and bus) belonging to the city's regional cluster.
    Guarantees satellite railway stations (e.g. DVD for Visakhapatnam, SC for Hyderabad, HWH/SRC for Kolkata)
    are always included.
    """
    q = (query or "").strip().lower()
    if not q or not timetable:
        return []

    cluster = get_cluster_for_query(q)
    stops = set()

    if cluster:
        for db_city in cluster["included_db_cities"]:
            for sid in timetable.city_stops.get(db_city.lower(), []):
                stops.add(sid)
        for code in cluster["key_rail_codes"]:
            sid = f"RAIL:{code.upper()}"
            if sid in timetable.stops:
                stops.add(sid)
        return list(stops)

    # Standard fallback for non-metro cities
    if q in timetable.city_stops:
        stops.update(timetable.city_stops[q])

    from app.city_aliases import CITY_ALIASES
    if q in CITY_ALIASES:
        parent = CITY_ALIASES[q].lower()
        if parent in timetable.city_stops:
            stops.update(timetable.city_stops[parent])

    return list(stops)


def get_city_stations_summary(city_name: str, timetable) -> str:
    """
    Returns a crisp, accent-foreground summary string of the stations and bus stands in the city region.
    e.g. 'VSKP, DVD, SCM • Dwaraka, Gajuwaka Bus Stands'
    e.g. 'SBC, YPR, SMVB, BNC • Majestic Bus Stand'
    """
    q = (city_name or "").strip().lower()
    if not q:
        return ""

    cluster = get_cluster_for_query(q)
    if cluster:
        return cluster["summary"]

    if not timetable:
        return "City Transit Hub"

    # Dynamic extraction from timetable for any Indian city/town
    from app.city_aliases import CITY_ALIASES
    target_cities = [q]
    if q in CITY_ALIASES:
        target_cities.append(CITY_ALIASES[q].lower())

    rail_codes = []
    bus_names = []

    for c in target_cities:
        stop_ids = timetable.city_stops.get(c, [])
        for sid in stop_ids:
            if sid.startswith("RAIL:"):
                code = sid.replace("RAIL:", "").strip()
                if code not in rail_codes:
                    rail_codes.append(code)
            elif sid.startswith("BUS:"):
                s_data = timetable.stops.get(sid, {})
                name = s_data.get("name", "").strip()
                # Clean up typical redundant bus prefixes
                cleaned = re.sub(r'^(APSRTC|TGSRTC|KSRTC|OSRTC|MSRTC|WBTC|CSTC)\s+(Bus Station|Bus Stand|City Bus Stop)\s*[, -]*', '', name, flags=re.I).strip()
                cleaned = re.sub(r'\s*Bus\s*(Stop|Station|Stand)\b.*$', ' Bus Stand', cleaned, flags=re.I).strip()
                if cleaned and len(cleaned) < 28 and cleaned not in bus_names:
                    bus_names.append(cleaned)

    parts = []
    if rail_codes:
        parts.append(", ".join(rail_codes[:4]))
    if bus_names:
        parts.append(", ".join(bus_names[:2]))

    if parts:
        return " • ".join(parts)

    return "Regional Transit Hub"

