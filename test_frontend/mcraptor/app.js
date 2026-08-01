// /test_frontend/mcraptor/app.js
// Capstone/test_frontend/mcraptor/app.js

const API_BASE_URL = "http://127.0.0.1:8000";

// Detailed Station Coordinates Map
const STATION_COORDS = {
  BZA: [16.5193, 80.6305], // Vijayawada Junction
  EE: [16.7107, 81.0952], // Eluru
  TDD: [16.8118, 81.5303], // Tadepalligudem
  RJY: [16.9891, 81.7832], // Rajahmundry
  SLO: [16.9818, 82.2355], // Samalkot
  TUNI: [17.3551, 82.5482], // Tuni
  AKP: [17.6896, 83.0034], // Anakapalle
  DVD: [17.6976, 83.1537], // Duvvada
  VSKP: [17.7231, 83.2906], // Visakhapatnam
  VZM: [18.1133, 83.3977], // Vizianagaram Junction
  CHE: [18.2949, 83.8938], // Srikakulam Road
  PSA: [18.7708, 84.4211], // Palasa
  BAM: [19.3149, 84.7941], // Berhampur
  BALU: [19.7423, 85.1873], // Balugaon
  KUR: [20.1834, 85.6173], // Khurda Road Junction
  HPGM: [20.18, 85.65], // Haripurgram PH
  BBS: [20.2961, 85.8245], // Bhubaneswar
  BBSN: [20.35, 85.82], // Bhubaneshwar New
  CTC: [20.4625, 85.8828], // Cuttack
  JJKR: [20.9507, 86.1362], // Jajpur Keonjhar Road
  BHC: [21.05, 86.5], // Bhadrak
  BLS: [21.4934, 86.9135], // Balasore
  KGP: [22.3302, 87.3237], // Kharagpur Junction
  SRC: [22.5601, 88.2907], // Santragachi Junction
  HWH: [22.583, 88.3426], // Howrah Junction
  MAS: [13.0827, 80.2707], // Chennai Central
};

// Main trunk sequence along Howrah-Chennai corridor to interpolate intermediate stops
const CORRIDOR_SEQUENCE = [
  "MAS",
  "BZA",
  "EE",
  "TDD",
  "RJY",
  "SLO",
  "TUNI",
  "AKP",
  "DVD",
  "VSKP",
  "VZM",
  "CHE",
  "PSA",
  "BAM",
  "BALU",
  "HPGM",
  "KUR",
  "BBS",
  "BBSN",
  "CTC",
  "JJKR",
  "BHC",
  "BLS",
  "KGP",
  "SRC",
  "HWH",
];

let map;
let activePolylineGroup;
let rawApiData = null;

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  checkBackendHealth();

  document.getElementById("dateInput").value = "2026-08-05";
  document
    .getElementById("searchForm")
    .addEventListener("submit", handleSearch);
});

function initMap() {
  map = L.map("map").setView([18.5, 83.0], 6);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
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
            <span class="text-emerald-300 font-semibold">McRAPTOR Active (${data.mcraptor_seat_records} Seats)</span>
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

  const src = document.getElementById("sourceInput").value.trim().toUpperCase();
  const dst = document.getElementById("destInput").value.trim().toUpperCase();
  const date = document.getElementById("dateInput").value;
  const travelClass = document.getElementById("classSelect").value;

  const btn = document.getElementById("searchBtn");
  btn.disabled = true;
  btn.innerText = "Evaluating Pareto Frontier...";

  try {
    const url = `${API_BASE_URL}/api/v3/mcraptor/search?source=${src}&destination=${dst}&date=${date}&class_code=${travelClass}&top_k=25`;
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
    btn.innerText = "⚡ Run McRAPTOR Search";
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
  }

  renderResultsList(processed);
}

function getStatusBadge(status, seats, wl) {
  if (status === "AVAILABLE") {
    return `<span class="bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-mono font-bold text-xs">
              AVAILABLE (${seats})
            </span>`;
  } else if (status === "RAC") {
    return `<span class="bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded font-mono font-bold text-xs">
              RAC (${wl})
            </span>`;
  } else {
    return `<span class="bg-rose-950 text-rose-300 border border-rose-700 px-2 py-0.5 rounded font-mono font-bold text-xs">
              WL ${wl}
            </span>`;
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

    // Distinct visual styling per card with strong left border indicator
    card.className = `p-3.5 rounded-xl border-2 transition-all cursor-pointer space-y-2.5 shadow-lg ${
      isDirect
        ? "bg-slate-900 border-l-4 border-l-purple-500 border-slate-800 hover:border-purple-400 hover:bg-slate-800/80"
        : "bg-slate-900 border-l-4 border-l-indigo-500 border-slate-800 hover:border-indigo-400 hover:bg-slate-800/80"
    }`;

    card.onclick = () => highlightRouteOnMap(option);

    // Detailed Leg Render
    let legsHtml = option.legs
      .map(
        (leg) => `
            <div class="text-xs border-t border-slate-800/80 pt-2 text-slate-300">
                <div class="flex items-center justify-between mb-1">
                    <span class="font-bold text-purple-300 text-xs">🚆 Train #${leg.train_number}</span>
                    <span class="text-slate-300 font-mono text-[11px] font-semibold">${leg.train_name}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 bg-slate-950/80 p-2 rounded-md border border-slate-800/90 font-mono text-xs">
                    <div>
                        <span class="text-slate-500">From:</span> <b class="text-slate-200">${leg.from_station.code}</b><br>
                        <span class="text-slate-500">Dep:</span> <b class="text-emerald-400">${leg.departure_time}</b>
                    </div>
                    <div>
                        <span class="text-slate-500">To:</span> <b class="text-slate-200">${leg.to_station.code}</b><br>
                        <span class="text-slate-500">Arr:</span> <b class="text-amber-400">${leg.arrival_time}</b>
                    </div>
                </div>
                <div class="flex justify-between items-center text-[11px] text-slate-400 mt-1 px-1">
                    <span>Distance: <b class="text-slate-200">${leg.distance_km} km</b></span>
                    <span>Leg Fare: <b class="text-emerald-400 font-bold">₹${leg.price_inr}</b></span>
                </div>
            </div>
        `,
      )
      .join("");

    // Render Interchange Junction Details
    let interchangeHtml = option.interchange_station
      ? `
            <div class="bg-rose-950/40 text-rose-200 p-2 rounded-md border border-rose-800/60 text-xs">
                <div class="flex items-center justify-between font-bold">
                    <span>🔄 Transfer at: ${option.interchange_station.name} (${option.interchange_station.code})</span>
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

/**
 * Traces exact station-by-station path along the railway corridor
 */
function getIntermediateStops(fromCode, toCode) {
  const fromIdx = CORRIDOR_SEQUENCE.indexOf(fromCode);
  const toIdx = CORRIDOR_SEQUENCE.indexOf(toCode);

  if (fromIdx !== -1 && toIdx !== -1) {
    if (fromIdx <= toIdx) {
      return CORRIDOR_SEQUENCE.slice(fromIdx, toIdx + 1);
    } else {
      return CORRIDOR_SEQUENCE.slice(toIdx, fromIdx + 1).reverse();
    }
  }

  return [fromCode, toCode];
}

function highlightRouteOnMap(route) {
  if (!route) return;
  activePolylineGroup.clearLayers();

  const isDirect = route.journey_type === "DIRECT";
  const lineColor = isDirect ? "#a855f7" : "#818cf8";
  const fullBounds = [];

  const transferStationCode = route.interchange_station
    ? route.interchange_station.code
    : null;

  route.legs.forEach((leg, legIdx) => {
    const fromCode = leg.from_station.code;
    const toCode = leg.to_station.code;

    // Get sequential station codes between leg source and destination
    const stopCodes = getIntermediateStops(fromCode, toCode);
    const legCoords = [];

    stopCodes.forEach((code) => {
      const coord = STATION_COORDS[code];
      if (!coord) return;

      legCoords.push(coord);
      fullBounds.push(coord);

      const isSource = code === route.legs[0].from_station.code;
      const isDestination =
        code === route.legs[route.legs.length - 1].to_station.code;
      const isTransfer = code === transferStationCode;

      // 1. RED PULSING TRANSFER MARKER
      if (isTransfer) {
        L.circleMarker(coord, {
          radius: 9,
          color: "#ef4444",
          fillColor: "#dc2626",
          fillOpacity: 1,
          weight: 3,
          className: "transfer-pulse",
        })
          .addTo(activePolylineGroup)
          .bindPopup(
            `
            <div style="color: #0f172a; font-family: sans-serif; font-size: 12px;">
                <b style="color: #dc2626;">🔄 TRANSFER JUNCTION</b><br>
                <b>${route.interchange_station.name} (${code})</b><br>
                Layover: <b>${route.interchange_station.layover_time}</b>
            </div>
        `,
          )
          .openPopup();
      }
      // 2. SOURCE / DESTINATION MARKERS
      else if (isSource || isDestination) {
        L.circleMarker(coord, {
          radius: 8,
          color: lineColor,
          fillColor: "#0f172a",
          fillOpacity: 1,
          weight: 3,
        }).addTo(activePolylineGroup).bindPopup(`
            <div style="color: #0f172a; font-family: sans-serif; font-size: 12px;">
                <b>${isSource ? "🚀 Departure:" : "🏁 Destination:"} ${code}</b><br>
                Train: #${leg.train_number} - ${leg.train_name}
            </div>
        `);
      }
      // 3. INTERMEDIATE STOPPAGES (Small nodes)
      else {
        L.circleMarker(coord, {
          radius: 4,
          color: lineColor,
          fillColor: "#334155",
          fillOpacity: 0.9,
          weight: 1.5,
        }).addTo(activePolylineGroup).bindPopup(`
            <div style="color: #0f172a; font-family: sans-serif; font-size: 11px;">
                📍 Stoppage: <b>${code}</b><br>
                Leg Train: #${leg.train_number}
            </div>
        `);
      }
    });

    // Draw station-by-station line segments for this leg
    if (legCoords.length > 0) {
      L.polyline(legCoords, {
        color: lineColor,
        weight: 4.5,
        opacity: 0.85,
        dashArray: legIdx === 1 ? "6, 8" : null,
      }).addTo(activePolylineGroup);
    }
  });

  if (fullBounds.length > 0) {
    map.fitBounds(L.polyline(fullBounds).getBounds(), { padding: [40, 40] });
  }
}
