// /test_frontend/mcraptor/app.js
// Capstone/test_frontend/mcraptor/app.js

const API_BASE_URL = "http://127.0.0.1:8000";

const STATION_COORDS = {
  BZA: [16.5193, 80.6305],
  EE: [16.7107, 81.0952],
  TDD: [16.8118, 81.5303],
  RJY: [16.9891, 81.7832],
  SLO: [16.9818, 82.2355],
  TUNI: [17.3551, 82.5482],
  AKP: [17.6896, 83.0034],
  DVD: [17.6976, 83.1537],
  VSKP: [17.7231, 83.2906],
  VZM: [18.1133, 83.3977],
  CHE: [18.2949, 83.8938],
  PSA: [18.7708, 84.4211],
  BAM: [19.3149, 84.7941],
  BALU: [19.7423, 85.1873],
  KUR: [20.1834, 85.6173],
  BBS: [20.2961, 85.8245],
  CTC: [20.4625, 85.8828],
  JJKR: [20.9507, 86.1362],
  BHC: [21.05, 86.5],
  BLS: [21.4934, 86.9135],
  KGP: [22.3302, 87.3237],
  SRC: [22.5601, 88.2907],
  HWH: [22.583, 88.3426],
  MAS: [13.0827, 80.2707],
  AP001: [17.6936, 83.2923],
};

let map;
let activePolylineGroup;
let rawApiData = null;

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  checkBackendHealth();

  document.getElementById("dateInput").value = "2026-08-01";
  document.getElementById("dateInput").value = "2026-08-01";
  document
    .getElementById("searchForm")
    .addEventListener("submit", handleSearch);

  setupAutocomplete("sourceInput", "sourceDropdown");
  setupAutocomplete("destInput", "destDropdown");
});

function setupAutocomplete(inputId, dropdownId) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  let timeout = null;

  input.addEventListener("input", (e) => {
    clearTimeout(timeout);
    const q = e.target.value.trim();
    
    if (q.length < 2) {
      dropdown.classList.add("hidden");
      return;
    }

    timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v4/cities/autocomplete?q=${encodeURIComponent(q)}`);
        const cities = await res.json();
        
        dropdown.innerHTML = "";
        if (cities.length === 0) {
          dropdown.classList.add("hidden");
          return;
        }

        cities.forEach(city => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-purple-900/50 hover:text-white transition-colors focus:bg-purple-900 focus:outline-none";
          btn.textContent = city;
          btn.onclick = () => {
            input.value = city;
            dropdown.classList.add("hidden");
          };
          dropdown.appendChild(btn);
        });
        
        dropdown.classList.remove("hidden");
      } catch (err) {
        console.error("Autocomplete error:", err);
      }
    }, 300);
  });

  // Close dropdown on click outside
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

function initMap() {
  map = L.map("map").setView([18.5, 83.0], 6);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18,
  }).addTo(map);

  activePolylineGroup = L.layerGroup().addTo(map);
}

async function checkBackendHealth() {
  const statusDiv = document.getElementById("apiStatus");
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();

    if (data.status === "online") {
      statusDiv.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="text-emerald-300 font-semibold">McRAPTOR Active (${data.total_stops} Stops)</span>
      `;
    }
  } catch (err) {
    statusDiv.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-rose-500"></span>
      <span class="text-rose-400 font-semibold">Engine Offline</span>
    `;
  }
}

async function handleSearch(e) {
  e.preventDefault();

  const src = document.getElementById("sourceInput").value.trim();
  const dst = document.getElementById("destInput").value.trim();
  const date = document.getElementById("dateInput").value;
  const travelClass = document.getElementById("classSelect").value;
  const requireBus = document.getElementById("requireBus").checked;

  const btn = document.getElementById("searchBtn");
  btn.disabled = true;
  btn.innerText = "Evaluating Pareto Frontier...";

  try {
    const url = `${API_BASE_URL}/api/v4/mcraptor/city-search?source_city=${src}&dest_city=${dst}&date=${date}&class_code=${travelClass}&top_k=25&require_bus=${requireBus}`;
    const res = await fetch(url);

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "McRAPTOR search failed.");
    }

    rawApiData = await res.json();
    document.getElementById("controlsBar").classList.remove("hidden");
    document.getElementById("foundCount").innerText =
      `${rawApiData.total_options_found}`;
    document.getElementById("searchTime").innerText =
      `${rawApiData.search_time_ms} ms`;

    applyFiltersAndSort();
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = "⚡ Run Multi-Modal Search";
  }
}

function applyFiltersAndSort() {
  if (!rawApiData || !rawApiData.options) return;

  const filterType = document.getElementById("filterType").value;
  const sortCriterion = document.getElementById("sortCriterion").value;

  let processed = [...rawApiData.options];
  if (filterType === "DIRECT") {
    processed = processed.filter((opt) => opt.journey_type === "DIRECT");
  } else if (filterType === "ONE_TRANSFER") {
    processed = processed.filter((opt) => opt.journey_type === "ONE_TRANSFER");
  } else if (filterType === "AVAILABLE_ONLY") {
    processed = processed.filter((opt) => opt.overall_status === "AVAILABLE");
  }

  const STATUS_RANK = { AVAILABLE: 3, RAC: 2, WL: 1 };

  if (sortCriterion === "DURATION") {
    processed.sort((a, b) => a.total_duration_mins - b.total_duration_mins);
  } else if (sortCriterion === "PRICE") {
    processed.sort((a, b) => a.total_price_inr - b.total_price_inr);
  } else if (sortCriterion === "DISTANCE") {
    processed.sort((a, b) => a.total_distance_km - b.total_distance_km);
  } else if (sortCriterion === "SEAT_STATUS") {
    processed.sort((a, b) => {
      const rankA = STATUS_RANK[a.overall_status] || 0;
      const rankB = STATUS_RANK[b.overall_status] || 0;
      if (rankB !== rankA) return rankB - rankA;
      return a.total_duration_mins - b.total_duration_mins;
    });
  } else if (sortCriterion === "DEPARTURE_TIME") {
    const parseDepTime = (str) => {
      const match = str.match(/(\d{2}):(\d{2})(?:\s*\(Day\s*(\d+)\))?/);
      if (!match) return 0;
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = match[3] ? parseInt(match[3], 10) : 1;
      return (d - 1) * 24 * 60 + h * 60 + m;
    };

    processed.sort((a, b) => {
      const timeA = parseDepTime(a.legs[0].departure_time);
      const timeB = parseDepTime(b.legs[0].departure_time);
      return timeA - timeB;
    });
  }

  renderResultsList(processed);
}

function getStatusBadge(status, seats, wl) {
  if (status === "AVAILABLE") {
    return `<span class="bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-mono font-bold text-xs">AVAILABLE (${seats})</span>`;
  } else if (status === "RAC") {
    return `<span class="bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded font-mono font-bold text-xs">RAC (${wl})</span>`;
  } else if (status === "N/A") {
    return `<span class="bg-slate-900 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-mono font-bold text-xs">WALK</span>`;
  } else {
    return `<span class="bg-rose-950 text-rose-300 border border-rose-700 px-2 py-0.5 rounded font-mono font-bold text-xs">WL ${wl}</span>`;
  }
}

function renderResultsList(options) {
  const container = document.getElementById("resultsContainer");
  container.innerHTML = "";

  if (options.length === 0) {
    container.innerHTML = `<p class="text-xs text-rose-400 text-center py-10">No matching Pareto routes found.</p>`;
    return;
  }

  options.forEach((option, idx) => {
    const isDirect = option.journey_type === "DIRECT";
    const card = document.createElement("div");

    card.className = `p-3.5 rounded-xl border-2 transition-all cursor-pointer space-y-2.5 shadow-lg ${
      isDirect
        ? "bg-slate-900 border-l-4 border-l-purple-500 border-slate-800 hover:border-purple-400 hover:bg-slate-800/80"
        : "bg-slate-900 border-l-4 border-l-indigo-500 border-slate-800 hover:border-indigo-400 hover:bg-slate-800/80"
    }`;

    card.onclick = () => highlightRouteOnMap(option);

    let legsHtml = option.legs
      .map((leg) => {
        let modeIcon = "🚆";
        if (leg.mode === "BUS") modeIcon = "🚌";
        if (leg.mode === "AUTO_CAB" || leg.service_number === "TRANSFER")
          modeIcon = "🚶";

        return `
            <div class="text-xs border-t border-slate-800/80 pt-2 text-slate-300">
                <div class="flex items-center justify-between mb-1">
                    <span class="font-bold text-purple-300 text-xs truncate max-w-[60%]" title="${leg.service_name || ''}">
                        ${modeIcon} ${leg.mode} #${leg.service_number} 
                        ${leg.service_name && leg.service_name !== 'Walk' ? `<span class="text-slate-400 font-normal">(${leg.service_name})</span>` : ''}
                    </span>
                    <span class="text-slate-300 font-mono text-[11px] font-semibold text-right max-w-[35%] truncate" title="${leg.from_stop.name} ➔ ${leg.to_stop.name}">
                        ${leg.from_stop.name} ➔ ${leg.to_stop.name}
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-2 bg-slate-950/80 p-2 rounded-md border border-slate-800/90 font-mono text-xs">
                    <div>
                        <span class="text-slate-500">From:</span> <b class="text-slate-200">${leg.from_stop.id}</b><br>
                        <span class="text-slate-500">Dep:</span> <b class="text-emerald-400">${leg.departure_time}</b>
                    </div>
                    <div>
                        <span class="text-slate-500">To:</span> <b class="text-slate-200">${leg.to_stop.id}</b><br>
                        <span class="text-slate-500">Arr:</span> <b class="text-amber-400">${leg.arrival_time}</b>
                    </div>
                </div>
                <div class="flex justify-between items-center text-[11px] text-slate-400 mt-1 px-1">
                    <span>Distance: <b class="text-slate-200">${leg.distance_km} km</b></span>
                    <span>Fare: <b class="text-emerald-400 font-bold">₹${leg.price_inr}</b></span>
                </div>
            </div>
        `;
      })
      .join("");

    let interchangeHtml = option.interchange_station
      ? `
            <div class="bg-rose-950/40 text-rose-200 p-2 rounded-md border border-rose-800/60 text-xs">
                <div class="flex items-center justify-between font-bold">
                    <span>🔄 Transfer at: ${option.interchange_station.name}</span>
                    <span class="text-rose-300 font-mono">${option.interchange_station.layover_time}</span>
                </div>
            </div>
        `
      : "";

    card.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <div class="flex items-center space-x-2">
                    <span class="text-[11px] font-extrabold px-2 py-0.5 rounded ${isDirect ? "bg-purple-950 text-purple-300 border border-purple-800" : "bg-indigo-950 text-indigo-300 border border-indigo-800"}">
                        ${option.journey_type}
                    </span>
                    ${getStatusBadge(option.overall_status, option.available_seats, option.wl_number)}
                </div>
                <div class="text-right">
                    <div class="text-sm font-extrabold text-amber-400">${option.total_duration}</div>
                    <div class="text-[11px] text-slate-300">${option.total_distance_km} km | <b class="text-emerald-400">₹${option.total_price_inr}</b></div>
                </div>
            </div>
            ${interchangeHtml}
            ${legsHtml}
        `;

    container.appendChild(card);
  });

  highlightRouteOnMap(options[0]);
}

function cleanCode(stopId) {
  return stopId.includes(":") ? stopId.split(":")[1] : stopId;
}

async function highlightRouteOnMap(route) {
  if (!route) return;
  activePolylineGroup.clearLayers();

  const isDirect = route.journey_type === "DIRECT";
  const lineColor = isDirect ? "#a855f7" : "#818cf8";
  const fullBounds = [];

  for (const leg of route.legs) {
    let latlngs = [];
    
    // Check if the backend provided path data
    if (leg.path && leg.path.length > 0) {
      // Filter out any stops that might be missing coordinates just in case
      const validPath = leg.path.filter(stop => stop.latitude && stop.longitude);
      latlngs = validPath.map(stop => [stop.latitude, stop.longitude]);
    } else {
      // Fallback for older API versions or missing path
      const rawFrom = cleanCode(leg.from_stop.id);
      const rawTo = cleanCode(leg.to_stop.id);
      const fromCoord = STATION_COORDS[rawFrom];
      const toCoord = STATION_COORDS[rawTo];
      if (fromCoord && toCoord) latlngs = [fromCoord, toCoord];
    }

    if (latlngs.length > 0) {
      latlngs.forEach(coord => fullBounds.push(coord));

      const legColor = leg.mode === "BUS" ? "#f59e0b" : (leg.mode === "AUTO_CAB" || leg.mode === "WALK" ? "#ef4444" : lineColor);

      if (leg.mode === "BUS" && latlngs.length >= 2) {
        try {
          // OSRM expects lon,lat;lon,lat. We limit to max 90 waypoints to be safe with OSRM limits
          let waypointsArray = latlngs.map(c => `${c[1]},${c[0]}`);
          if (waypointsArray.length > 90) {
            waypointsArray = [waypointsArray[0], waypointsArray[Math.floor(waypointsArray.length/2)], waypointsArray[waypointsArray.length-1]];
          }
          const waypoints = waypointsArray.join(';');
          
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
          const res = await fetch(osrmUrl);
          const data = await res.json();
          
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            const geojsonCoords = data.routes[0].geometry.coordinates;
            // OSRM returns [lon, lat], Leaflet needs [lat, lon]
            const osrmLatLngs = geojsonCoords.map(c => [c[1], c[0]]);
            osrmLatLngs.forEach(coord => fullBounds.push(coord));

            L.polyline(osrmLatLngs, {
              color: legColor,
              weight: 5,
              opacity: 0.85,
            }).addTo(activePolylineGroup);
          } else {
            throw new Error("OSRM failed");
          }
        } catch (e) {
          // Fallback to straight lines
          L.polyline(latlngs, {
            color: legColor,
            weight: 4.5,
            opacity: 0.85,
          }).addTo(activePolylineGroup);
        }
      } else {
        // Rail or other: straight lines
        L.polyline(latlngs, {
          color: legColor,
          weight: 4.5,
          opacity: 0.85,
          dashArray: leg.service_number === "TRANSFER" ? "6, 8" : null,
        }).addTo(activePolylineGroup);
      }

      // Draw markers for all intermediate stops if we have path data
      if (leg.path && leg.path.length > 0) {
        const validPath = leg.path.filter(stop => stop.latitude && stop.longitude);
        validPath.forEach((stop, idx) => {
          const isStartOrEnd = idx === 0 || idx === validPath.length - 1;
          L.circleMarker([stop.latitude, stop.longitude], {
            radius: isStartOrEnd ? 6 : 4,
            color: lineColor,
            fillColor: isStartOrEnd ? "#0f172a" : lineColor,
            fillOpacity: isStartOrEnd ? 1 : 0.6,
            weight: isStartOrEnd ? 2 : 1,
          })
            .addTo(activePolylineGroup)
            .bindPopup(`<b>${stop.name}</b> (${cleanCode(stop.id)})`);
        });
      } else {
        // Fallback drawing just start and end markers
        L.circleMarker(latlngs[0], {
          radius: 6,
          color: lineColor,
          fillColor: "#0f172a",
          fillOpacity: 1,
          weight: 2,
        })
          .addTo(activePolylineGroup)
          .bindPopup(`<b>${leg.from_stop.name}</b> (${cleanCode(leg.from_stop.id)})`);

        L.circleMarker(latlngs[latlngs.length - 1], {
          radius: 6,
          color: lineColor,
          fillColor: "#0f172a",
          fillOpacity: 1,
          weight: 2,
        })
          .addTo(activePolylineGroup)
          .bindPopup(`<b>${leg.to_stop.name}</b> (${cleanCode(leg.to_stop.id)})`);
      }
    }
  }

  if (fullBounds.length > 0) {
    map.fitBounds(L.polyline(fullBounds).getBounds(), { padding: [40, 40] });
  }
}
