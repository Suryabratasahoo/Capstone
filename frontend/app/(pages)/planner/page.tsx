'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import CityAutocomplete from '../../components/CityAutocomplete';

// We must dynamically import leaflet because it requires the window object
let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

// Icons for the map
const createIcon = (color: string) => {
  if (!L) return null;
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

function PlannerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialFrom = searchParams.get('from') || 'Vijayawada';
  const initialTo = searchParams.get('to') || 'Bengaluru';
  const initialDate = searchParams.get('date') || '2026-08-01';

  const [fromLocation, setFromLocation] = useState(initialFrom);
  const [toLocation, setToLocation] = useState(initialTo);
  const [travelDate, setTravelDate] = useState(initialDate);
  const [travelClass, setTravelClass] = useState('3A');
  const [requireBus, setRequireBus] = useState(false);

  const [loading, setLoading] = useState(true);
  const [rawApiData, setRawApiData] = useState<any>(null);
  const [processedOptions, setProcessedOptions] = useState<any[]>([]);

  const [filterType, setFilterType] = useState('ALL');
  const [sortCriterion, setSortCriterion] = useState('DURATION');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const polylineGroup = useRef<any>(null);

  // Status mapping
  const STATUS_RANK: Record<string, number> = {
    AVAILABLE: 4,
    RAC: 3,
    WL: 2,
    "N/A": 1,
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current && !mapInstance.current && L) {
      mapInstance.current = L.map(mapRef.current).setView([18.5, 83.0], 6);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
        className: 'dark-tiles'
      }).addTo(mapInstance.current);
      polylineGroup.current = L.layerGroup().addTo(mapInstance.current);
    }
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const url = `http://127.0.0.1:8000/api/v4/mcraptor/city-search?source_city=${encodeURIComponent(fromLocation)}&dest_city=${encodeURIComponent(toLocation)}&date=${travelDate}&class_code=${travelClass}&top_k=25&require_bus=${requireBus}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setRawApiData(data);
    } catch (err) {
      console.error(err);
      setRawApiData({ options: [], total_options_found: 0, search_time_ms: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFrom, initialTo, initialDate]);

  useEffect(() => {
    if (rawApiData) {
      applyFiltersAndSort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawApiData, filterType, sortCriterion]);

  const applyFiltersAndSort = () => {
    if (!rawApiData) return;
    let processed = [...(rawApiData.options || [])];

    // Filter
    if (filterType === "DIRECT") {
      processed = processed.filter(opt => opt.transfers === 0);
    } else if (filterType === "ONE_TRANSFER") {
      processed = processed.filter(opt => opt.transfers === 1);
    } else if (filterType === "AVAILABLE_ONLY") {
      processed = processed.filter(opt => opt.overall_status === "AVAILABLE");
    }

    // Sort
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
      const parseDepTime = (str: string) => {
        if(!str) return 0;
        const match = str.match(/(\d{2}):(\d{2})(?:\s*\(Day\s*(\d+)\))?/);
        if (!match) return 0;
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const d = match[3] ? parseInt(match[3], 10) : 1;
        return (d - 1) * 24 * 60 + h * 60 + m;
      };
      processed.sort((a, b) => {
        const timeA = parseDepTime(a.legs[0]?.departure_time || "");
        const timeB = parseDepTime(b.legs[0]?.departure_time || "");
        return timeA - timeB;
      });
    }

    setProcessedOptions(processed);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.replace(`/planner?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}&date=${travelDate}`);
    fetchResults();
  };

  const drawRouteOnMap = (option: any) => {
    if (!polylineGroup.current || !L) return;
    polylineGroup.current.clearLayers();

    const bounds = L.latLngBounds([]);
    const legColors: Record<string, string> = {
      RAIL: "#3b82f6", // blue-500
      BUS: "#f59e0b",  // amber-500
      FLIGHT: "#ef4444", // red-500
      WALK: "#10b981", // emerald-500
    };

    option.legs.forEach((leg: any) => {
      const color = legColors[leg.mode] || "#64748b";
      const coordsWithData = leg.path.filter((pt: any) => pt.latitude !== 0 && pt.longitude !== 0);
      const coords = coordsWithData.map((pt: any) => [pt.latitude, pt.longitude]);

      if (coords.length > 0) {
        // Draw polyline
        const polyline = L.polyline(coords, {
          color: color,
          weight: 4,
          opacity: 0.8,
        }).addTo(polylineGroup.current);
        
        bounds.extend(polyline.getBounds());

        // Draw intermediate stations as small dots
        if (coordsWithData.length > 2) {
          coordsWithData.slice(1, -1).forEach((pt: any) => {
            const dot = L.circleMarker([pt.latitude, pt.longitude], {
              radius: 3.5,
              fillColor: '#1e1e1e', // Dark mode background match
              color: color,
              weight: 2,
              opacity: 0.9,
              fillOpacity: 1
            }).addTo(polylineGroup.current);
            
            // If the backend provided station names in the path, show a sleek tooltip
            if (pt.name) {
              dot.bindTooltip(pt.name, { className: 'bg-zinc-900 text-white border-zinc-700 text-xs font-bold px-2 py-1', direction: 'top', opacity: 0.9 });
            }
          });
        }

        // Start and end markers
        const startPt = coords[0];
        const endPt = coords[coords.length - 1];

        L.marker(startPt, { icon: createIcon('#10b981') })
          .bindPopup(`<b>${leg.from_stop.name}</b><br>Dep: ${leg.departure_time}`)
          .addTo(polylineGroup.current);

        L.marker(endPt, { icon: createIcon('#ef4444') })
          .bindPopup(`<b>${leg.to_stop.name}</b><br>Arr: ${leg.arrival_time}`)
          .addTo(polylineGroup.current);
      }
    });

    if (bounds.isValid()) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Helper for mode icons
  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'RAIL': return '🚆';
      case 'BUS': return '🚌';
      case 'FLIGHT': return '✈️';
      case 'WALK': return '🚶';
      default: return '📍';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-brand-cream overflow-hidden text-brand-charcoal">
      {/* Top Header Navigation */}
      <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <span className="text-xl font-black text-brand-forest">Pareto<span className="text-brand-lime drop-shadow-sm">Planner</span></span>
        </div>
        <form onSubmit={handleManualSearch} className="flex items-center gap-2">
          <div className="w-40 relative">
            <CityAutocomplete 
              value={fromLocation} onChange={setFromLocation}
              inputClassName="bg-zinc-100 border border-zinc-200 rounded-full px-4 py-1.5 text-sm font-bold w-full focus:outline-brand-forest"
            />
          </div>
          <span className="text-zinc-400">→</span>
          <div className="w-40 relative">
            <CityAutocomplete 
              value={toLocation} onChange={setToLocation}
              inputClassName="bg-zinc-100 border border-zinc-200 rounded-full px-4 py-1.5 text-sm font-bold w-full focus:outline-brand-forest"
            />
          </div>
          <input 
            type="date" value={travelDate} onChange={(e)=>setTravelDate(e.target.value)}
            className="bg-zinc-100 border border-zinc-200 rounded-full px-4 py-1.5 text-sm font-bold focus:outline-brand-forest"
          />
          <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer ml-2">
            <input type="checkbox" checked={requireBus} onChange={(e)=>setRequireBus(e.target.checked)} className="accent-brand-forest w-4 h-4"/>
            Bus Required
          </label>
          <button type="submit" className="ml-2 bg-brand-forest text-white rounded-full px-5 py-1.5 text-sm font-bold hover:bg-black transition-colors shadow-md">
            Update
          </button>
        </form>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Panel: Filters & Results */}
        <div className="w-[450px] bg-white border-r border-zinc-200 flex flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          
          {/* Controls Bar */}
          <div className="p-4 border-b border-zinc-100 bg-brand-cream/30">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h2 className="text-sm font-black text-brand-forest">Pareto Optimal Routes</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {loading ? 'Searching...' : `Found ${rawApiData?.total_options_found || 0} routes in ${rawApiData?.search_time_ms || 0}ms`}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-zinc-200 rounded-lg px-2 py-2 text-xs font-bold text-zinc-700 outline-none focus:border-brand-forest shadow-sm"
              >
                <option value="ALL">Show All Routes</option>
                <option value="DIRECT">Direct Only (0 Transfers)</option>
                <option value="ONE_TRANSFER">1-Transfer Only</option>
                <option value="AVAILABLE_ONLY">Confirmed Seats Only</option>
              </select>

              <select 
                value={sortCriterion} 
                onChange={(e) => setSortCriterion(e.target.value)}
                className="bg-white border border-zinc-200 rounded-lg px-2 py-2 text-xs font-bold text-zinc-700 outline-none focus:border-brand-forest shadow-sm"
              >
                <option value="DURATION">Sort: Fastest First</option>
                <option value="DEPARTURE_TIME">Sort: Departure Time</option>
                <option value="PRICE">Sort: Lowest Price</option>
                <option value="DISTANCE">Sort: Shortest Distance</option>
                <option value="SEAT_STATUS">Sort: Confirmed Status</option>
              </select>
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 space-y-3 opacity-50">
                <div className="w-8 h-8 border-4 border-brand-lime border-t-brand-forest rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-brand-forest animate-pulse">Running McRAPTOR Engine...</p>
              </div>
            ) : processedOptions.length === 0 ? (
              <div className="text-center py-10 text-zinc-400 text-sm font-bold">
                No matching routes found.
              </div>
            ) : (
              processedOptions.map((opt, idx) => {
                const isExpanded = expandedIndex === idx;
                return (
                <div 
                  key={idx} 
                  onClick={() => {
                    drawRouteOnMap(opt);
                    setExpandedIndex(isExpanded ? null : idx);
                  }}
                  className={`bg-white rounded-2xl p-4 border shadow-sm hover:shadow-md hover:border-brand-forest/30 transition-all cursor-pointer group ${isExpanded ? 'border-brand-forest/40 bg-brand-cream/20' : 'border-zinc-200'}`}
                >
                  {/* Card Header: Duration & Price */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-lg font-black text-brand-forest">{opt.total_duration}</span>
                      <span className="text-[10px] text-zinc-400 font-bold ml-2 uppercase tracking-wider">{opt.transfers} Transfers</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-zinc-800">₹{opt.total_price_inr}</span>
                      <div className="mt-0.5">
                        {opt.overall_status === 'AVAILABLE' ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">AVAILABLE</span>
                        ) : opt.overall_status === 'RAC' ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">RAC</span>
                        ) : (
                          <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">{opt.overall_status}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expand / Collapse Indicator */}
                  {!isExpanded && (
                    <div className="text-center mt-1 pt-3 border-t border-zinc-100/80">
                      <span className="text-[10px] font-black text-brand-forest/60 group-hover:text-brand-forest uppercase tracking-widest flex items-center justify-center gap-1">
                        View {opt.legs.length} Leg Journey on Map
                        <svg className="w-3 h-3 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6"/></svg>
                      </span>
                    </div>
                  )}

                  {/* Legs Timeline - ONLY RENDERED IF EXPANDED */}
                  {isExpanded && (
                    <div className="relative pl-3 border-l-2 border-brand-lime/50 space-y-4 py-1 mt-4 pt-4 border-t border-zinc-100">
                      {opt.legs.map((leg: any, lIdx: number) => (
                        <div key={lIdx} className="relative">
                          <div className="absolute -left-[18.5px] top-1 bg-white border-2 border-brand-lime w-3.5 h-3.5 rounded-full z-10 group-hover:border-brand-forest transition-colors"></div>
                          <div className="flex items-start gap-2">
                            <span className="text-base leading-none">{getModeIcon(leg.mode)}</span>
                            <div className="flex-1">
                              <p className="text-[11px] font-black text-zinc-800 tracking-wide">{leg.service_name}</p>
                              <div className="flex justify-between text-[10px] text-zinc-500 font-medium mt-0.5">
                                <span>{leg.from_stop.name} <strong className="text-zinc-700">{leg.departure_time}</strong></span>
                                <span>→</span>
                                <span><strong className="text-zinc-700">{leg.arrival_time}</strong> {leg.to_stop.name}</span>
                              </div>
                              
                              {/* Intermediate Stops */}
                              {leg.path && leg.path.length > 2 && (
                                <div className="mt-2 pl-2 border-l-2 border-zinc-200/50 space-y-1">
                                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                                    {leg.path.length - 2} Intermediate Stops
                                  </div>
                                  <div className="max-h-24 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200 space-y-1.5">
                                    {leg.path.slice(1, -1).map((stop: any, sIdx: number) => (
                                      <div key={sIdx} className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold">
                                        <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                                        <span>{stop.name || stop.id}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )})
            )}
          </div>

        </div>

        {/* Right Panel: Map */}
        <div className="flex-1 bg-zinc-200 relative z-10">
          <div id="map" ref={mapRef} className="w-full h-full absolute inset-0 z-0"></div>
          {/* Subtle overlay logo on map */}
          <div className="absolute bottom-6 right-6 z-[400] pointer-events-none opacity-50 bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl shadow-sm border border-zinc-200">
            <span className="text-xs font-black text-brand-forest">Powered by McRAPTOR</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function PlannerPage() {
  return (
    <>
      <style>{`
        .dark-tiles {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
      `}</style>
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-brand-cream text-brand-forest font-black">Loading Planner...</div>}>
        <PlannerContent />
      </Suspense>
    </>
  );
}
