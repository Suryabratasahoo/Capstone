'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import CityAutocomplete from '../../components/CityAutocomplete';

// Dynamically import leaflet because it requires the window object
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

// Helper to extract clean Indian Railway station codes (e.g., "RAIL:NZM" -> "NZM")
const extractStationCode = (stop: any): string => {
  if (!stop) return '';
  const raw = stop.id || stop.code || '';
  return raw.replace(/^(RAIL:|TRAIN_:?)/i, '').trim().toUpperCase();
};

// Helper to format YYYY-MM-DD into DD-MM-YYYY for ConfirmTkt
const formatToIndianDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    // YYYY-MM-DD -> DD-MM-YYYY
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

// Helper to construct prefilled ConfirmTkt booking URL
const getConfirmTktBookingUrl = (leg: any, date: string): string => {
  const fromCode = extractStationCode(leg.from_stop);
  const toCode = extractStationCode(leg.to_stop);
  const formattedDate = formatToIndianDate(date);
  if (!fromCode || !toCode) return 'https://www.confirmtkt.com/rbooking';
  return `https://www.confirmtkt.com/rbooking/trains/from/${encodeURIComponent(fromCode)}/to/${encodeURIComponent(toCode)}/${formattedDate}`;
};

// Helper to get train schedule & running status URL
const getTrainScheduleUrl = (leg: any): string => {
  const cleanNumber = (leg.service_number || '').replace(/\D/g, '');
  if (!cleanNumber) return 'https://www.confirmtkt.com/train-running-status';
  return `https://www.confirmtkt.com/train-running-status/${cleanNumber}`;
};

// Helper to get official IRCTC booking portal
const getIrctcBookingUrl = (): string => {
  return 'https://www.irctc.co.in/nget/train-search';
};

// Service Rating Badge with ABSA Tooltip
function ServiceRatingBadge({ serviceNumber, mode }: { serviceNumber: string, mode: string }) {
  const [ratingData, setRatingData] = useState<{ rating: number, highlights: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serviceNumber) return;

    let endpoint = "";
    if ((mode === 'RAIL' || mode === 'TRAIN') && !isNaN(Number(serviceNumber))) {
      endpoint = `http://127.0.0.1:8001/train/${serviceNumber}`;
    } else if (mode === 'BUS') {
      endpoint = `http://127.0.0.1:8001/bus/${encodeURIComponent(serviceNumber)}`;
    } else {
      return;
    }

    setLoading(true);
    fetch(endpoint)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        if (data && data.rating) {
          setRatingData({ rating: data.rating, highlights: data.highlights || [] });
        }
      })
      .catch(() => setRatingData(null))
      .finally(() => setLoading(false));
  }, [serviceNumber, mode]);

  if (loading) return <span className="ml-2 text-[9px] text-zinc-400 font-bold animate-pulse inline-block">Loading Rating...</span>;
  if (!ratingData) return null;

  return (
    <div className="inline-flex items-center gap-1.5 ml-1.5 group/badge relative">
      <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md text-[10px] font-black border border-amber-200 shadow-sm flex items-center cursor-help">
        <span className="mr-0.5 text-amber-500">★</span> {ratingData.rating.toFixed(1)}/5
      </span>
      {ratingData.highlights.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 opacity-0 group-hover/badge:opacity-100 transition-opacity bg-zinc-900/95 backdrop-blur-sm text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl max-w-xs overflow-y-auto z-50 pointer-events-none border border-zinc-700/50">
          <div className="text-[8px] font-bold tracking-wider text-zinc-400 uppercase mb-0.5">Passenger Feedback</div>
          <div className="flex flex-wrap items-center gap-1 font-medium">
            {ratingData.highlights.slice(0, 3).map((h, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <span className="text-zinc-500">•</span>}
                <span className={h.includes('Clean') || h.includes('Punctual') || h.includes('Good') || h.includes('Working') || h.includes('Comfortable') || h.includes('Helpful') || h.includes('Smooth') || h.includes('Budget') ? 'text-emerald-400 font-semibold' : 'text-amber-300'}>
                  {h}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TestFrontendContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialFrom = searchParams.get('from') || 'New Delhi';
  const initialTo = searchParams.get('to') || 'Patna';
  const initialDate = searchParams.get('date') || '2026-10-15';
  const initialClass = searchParams.get('class') || '3A';

  const [fromLocation, setFromLocation] = useState(initialFrom);
  const [toLocation, setToLocation] = useState(initialTo);
  const [travelDate, setTravelDate] = useState(initialDate);
  const [travelClass, setTravelClass] = useState(initialClass);
  const [requireBus, setRequireBus] = useState(false);

  const [loading, setLoading] = useState(true);
  const [rawApiData, setRawApiData] = useState<any>(null);
  const [processedOptions, setProcessedOptions] = useState<any[]>([]);

  const [filterType, setFilterType] = useState('ALL');
  const [sortCriterion, setSortCriterion] = useState('DURATION');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0); // Auto-expand first result in test view

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const polylineGroup = useRef<any>(null);

  const STATUS_RANK: Record<string, number> = {
    AVAILABLE: 4,
    RAC: 3,
    WL: 2,
    "N/A": 1,
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current && !mapInstance.current && L) {
      mapInstance.current = L.map(mapRef.current).setView([24.0, 82.0], 5);
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

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFrom, initialTo, initialDate, initialClass]);

  useEffect(() => {
    if (rawApiData) {
      applyFiltersAndSort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawApiData, filterType, sortCriterion]);

  const applyFiltersAndSort = () => {
    if (!rawApiData) return;
    let processed = [...(rawApiData.options || [])];

    if (filterType === "DIRECT") {
      processed = processed.filter(opt => opt.transfers === 0);
    } else if (filterType === "ONE_TRANSFER") {
      processed = processed.filter(opt => opt.transfers === 1);
    } else if (filterType === "AVAILABLE_ONLY") {
      processed = processed.filter(opt => opt.overall_status === "AVAILABLE");
    }

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
        if (!str) return 0;
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
    if (processed.length > 0) {
      drawRouteOnMap(processed[0]);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.replace(`/testfrontend?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}&date=${travelDate}&class=${travelClass}`);
    fetchResults();
  };

  const drawRouteOnMap = (option: any) => {
    if (!polylineGroup.current || !L) return;
    polylineGroup.current.clearLayers();

    const bounds = L.latLngBounds([]);
    const legColors: Record<string, string> = {
      RAIL: "#3b82f6",
      TRAIN: "#3b82f6",
      BUS: "#f59e0b",
      FLIGHT: "#ef4444",
      WALK: "#10b981",
    };

    option.legs.forEach((leg: any) => {
      const color = legColors[leg.mode] || "#64748b";
      const coordsWithData = (leg.path || []).filter((pt: any) => pt.latitude !== 0 && pt.longitude !== 0);
      const coords = coordsWithData.map((pt: any) => [pt.latitude, pt.longitude]);

      if (coords.length > 0) {
        const polyline = L.polyline(coords, {
          color: color,
          weight: 4,
          opacity: 0.8,
        }).addTo(polylineGroup.current);

        bounds.extend(polyline.getBounds());

        if (coordsWithData.length > 2) {
          coordsWithData.slice(1, -1).forEach((pt: any) => {
            const dot = L.circleMarker([pt.latitude, pt.longitude], {
              radius: 3.5,
              fillColor: '#1e1e1e',
              color: color,
              weight: 2,
              opacity: 0.9,
              fillOpacity: 1
            }).addTo(polylineGroup.current);

            if (pt.name) {
              dot.bindTooltip(pt.name, { className: 'bg-zinc-900 text-white border-zinc-700 text-xs font-bold px-2 py-1', direction: 'top', opacity: 0.9 });
            }
          });
        }

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

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'RAIL':
      case 'TRAIN': return '🚆';
      case 'BUS': return '🚌';
      case 'FLIGHT': return '✈️';
      case 'WALK': return '🚶';
      default: return '📍';
    }
  };

  const isRailMode = (mode: string) => mode === 'RAIL' || mode === 'TRAIN';

  return (
    <div className="flex flex-col h-screen bg-brand-cream overflow-hidden text-brand-charcoal">
      {/* Top Test Notification Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-sm z-40">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold border border-white/30">
            🧪 Test Frontend Route (/testfrontend)
          </span>
          <span className="hidden sm:inline">
            Direct Train Booking Integration Demo: Click any train name or "Book" link to jump to IRCTC / ConfirmTkt!
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/planner"
            className="text-[11px] font-bold text-white/90 hover:text-white underline underline-offset-2 flex items-center gap-1"
          >
            ← Back to Main Planner
          </Link>
        </div>
      </div>

      {/* Top Header Navigation */}
      <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <span className="text-xl font-black text-brand-forest">Opti<span className="text-black drop-shadow-sm">Transit</span></span>
          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
            Booking Prototype
          </span>
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
            type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)}
            className="bg-zinc-100 border border-zinc-200 rounded-full px-4 py-1.5 text-sm font-bold focus:outline-brand-forest"
          />
          <select
            value={travelClass}
            onChange={(e) => setTravelClass(e.target.value)}
            className="bg-zinc-100 border border-zinc-200 rounded-full px-3 py-1.5 text-xs font-bold text-zinc-800 focus:outline-brand-forest cursor-pointer"
          >
            <option value="3A">Class: 3A (3-Tier AC)</option>
            <option value="2A">Class: 2A (2-Tier AC)</option>
            <option value="1A">Class: 1A (First AC)</option>
            <option value="SL">Class: SL (Sleeper)</option>
            <option value="CC">Class: CC (Chair Car)</option>
            <option value="2S">Class: 2S (Second Sitting)</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer ml-2">
            <input type="checkbox" checked={requireBus} onChange={(e) => setRequireBus(e.target.checked)} className="accent-brand-forest w-4 h-4" />
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
        <div className="w-[490px] bg-white border-r border-zinc-200 flex flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">

          {/* Controls Bar */}
          <div className="p-4 border-b border-zinc-100 bg-brand-cream/30">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h2 className="text-sm font-black text-brand-forest">Optimal Multi-Transit Routes</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {loading ? 'Searching...' : `Found ${rawApiData?.total_options_found || 0} routes in ${rawApiData?.search_time_ms || 0}ms`}
                </p>
              </div>
              <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Booking Links Enabled
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
              <div className="flex flex-col mt-40 items-center justify-center h-40 space-y-3 opacity-50">
                <div className="w-8 h-8 border-4 border-brand-lime border-t-brand-forest rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-brand-forest animate-pulse">Running Router...</p>
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
                    className={`group cursor-pointer rounded-2xl border p-4 shadow-sm transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/40 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:border-brand-forest/40 hover:shadow-lg hover:shadow-brand-forest/5 ${isExpanded
                        ? 'border-brand-forest/40 bg-brand-cream/20 shadow-md shadow-brand-forest/5'
                        : 'border-zinc-200/80 bg-white hover:bg-brand-cream/5'
                      }`}
                  >
                    {/* Card Header: Duration & Price */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-lg font-black text-brand-forest">{opt.total_duration}</span>
                        <span className="text-[10px] text-zinc-400 font-bold ml-2 uppercase tracking-wider">{opt.transfers} Transfers</span>
                        {/* Show rating for the primary leg if it's a train or bus */}
                        {(isRailMode(opt.legs[0]?.mode) || opt.legs[0]?.mode === 'BUS') && (
                          <ServiceRatingBadge serviceNumber={opt.legs[0].service_number} mode={opt.legs[0].mode} />
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-zinc-800">₹{opt.total_price_inr}</span>
                        <div className="text-[9px] text-zinc-400 font-semibold tracking-wide uppercase">
                          Class {opt.travel_class || travelClass} • Total Fare
                        </div>
                        <div className="mt-0.5">
                          {opt.overall_status === 'AVAILABLE' ? (
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">
                              {opt.travel_class || travelClass} • AVAILABLE {opt.available_seats && opt.available_seats > 0 ? `(${opt.available_seats})` : ''}
                            </span>
                          ) : opt.overall_status === 'RAC' ? (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">
                              {opt.travel_class || travelClass} • RAC {opt.wl_number && opt.wl_number > 0 ? opt.wl_number : ''}
                            </span>
                          ) : (opt.overall_status === 'WL' || opt.overall_status === 'WAITLIST') ? (
                            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">
                              {opt.travel_class || travelClass} • WL {opt.wl_number && opt.wl_number > 0 ? opt.wl_number : 1}
                            </span>
                          ) : (
                            <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">
                              {opt.travel_class || travelClass} • {opt.overall_status || 'UNKNOWN'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Journey Leg Status Preview Strip WITH DIRECT BOOKING LINK BUTTONS */}
                    <div className="flex flex-wrap items-center gap-1.5 py-1.5 px-2 bg-zinc-50/80 rounded-lg border border-zinc-100 mb-2">
                      {opt.legs.map((leg: any, lIdx: number) => {
                        const legIsRail = isRailMode(leg.mode);
                        const legClass = legIsRail ? (leg.travel_class || opt.travel_class || travelClass) : (leg.mode === 'BUS' ? 'BUS' : '');
                        const confirmTktUrl = legIsRail ? getConfirmTktBookingUrl(leg, travelDate) : '';

                        return (
                          <React.Fragment key={lIdx}>
                            {lIdx > 0 && <span className="text-zinc-300 text-[10px] font-bold">→</span>}
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-700">
                              <span>{getModeIcon(leg.mode)}</span>
                              
                              {/* If train, make service number clickable with booking action */}
                              {legIsRail ? (
                                <a
                                  href={confirmTktUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Book Train ${leg.service_number} on ConfirmTkt`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-extrabold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-0.5 bg-blue-50/80 hover:bg-blue-100/80 px-1 py-0.5 rounded transition-colors"
                                >
                                  <span>{leg.service_number}</span>
                                  <span className="text-[9px] text-blue-600">↗</span>
                                </a>
                              ) : (
                                <span className="font-extrabold text-zinc-800">{leg.service_number || (leg.mode === 'WALK' ? 'Transfer' : leg.service_name?.slice(0, 16))}</span>
                              )}

                              {legClass && legIsRail && (
                                <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1 py-0.2 rounded font-mono">
                                  {legClass}
                                </span>
                              )}
                              
                              {leg.mode !== 'WALK' && (
                                leg.seat_status === 'AVAILABLE' ? (
                                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                    AVL {leg.available_seats && leg.available_seats > 0 ? leg.available_seats : ''}
                                  </span>
                                ) : leg.seat_status === 'RAC' ? (
                                  <span className="text-[9px] font-black text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                                    RAC {leg.wl_number && leg.wl_number > 0 ? leg.wl_number : 1}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>
                                    WL {leg.wl_number && leg.wl_number > 0 ? leg.wl_number : 1}
                                  </span>
                                )
                              )}

                              {/* Dedicated direct mini "Book ↗" link beside train leg */}
                              {legIsRail && (
                                <a
                                  href={confirmTktUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-0.5"
                                  title="Deep link directly to live booking site"
                                >
                                  Book ↗
                                </a>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Expand / Collapse Indicator */}
                    {!isExpanded && (
                      <div className="text-center mt-1 pt-2 border-t border-zinc-100/80">
                        <span className="text-[10px] font-black text-brand-forest/60 group-hover:text-brand-forest uppercase tracking-widest flex items-center justify-center gap-1">
                          View {opt.legs.length} Leg Journey & Direct Booking Links
                          <svg className="w-3 h-3 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6" /></svg>
                        </span>
                      </div>
                    )}

                    {/* Legs Timeline - EXPANDED VIEW WITH DIRECT BOOKING BUTTONS */}
                    {isExpanded && (
                      <div className="relative pl-3 border-l-2 border-brand-lime/50 space-y-4 py-1 mt-4 pt-4 border-t border-zinc-100">
                        {opt.legs.map((leg: any, lIdx: number) => {
                          const legIsRail = isRailMode(leg.mode);
                          const confirmTktUrl = legIsRail ? getConfirmTktBookingUrl(leg, travelDate) : '';
                          const irctcUrl = getIrctcBookingUrl();

                          return (
                            <div key={lIdx} className="relative">
                              <div className="absolute -left-[18.5px] top-1 bg-white border-2 border-brand-lime w-3.5 h-3.5 rounded-full z-10 group-hover:border-brand-forest transition-colors"></div>
                              <div className="flex items-start gap-2">
                                <span className="text-base leading-none">{getModeIcon(leg.mode)}</span>
                                <div className="flex-1">
                                  {/* Leg Title & Booking Links */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Train Name as Clickable Booking Link */}
                                    {legIsRail ? (
                                      <a
                                        href={confirmTktUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Click to open booking portal"
                                        className="text-[12px] font-black text-blue-700 hover:text-blue-900 hover:underline tracking-wide flex items-center gap-1 group/name bg-blue-50/70 hover:bg-blue-100/70 px-1.5 py-0.5 rounded transition-all"
                                      >
                                        <span>{leg.service_name}</span>
                                        <span className="text-[10px] text-blue-500 group-hover/name:translate-x-0.5 group-hover/name:-translate-y-0.5 transition-transform">↗</span>
                                      </a>
                                    ) : (
                                      <p className="text-[11px] font-black text-zinc-800 tracking-wide">{leg.service_name}</p>
                                    )}

                                    {/* Class Badge */}
                                    {legIsRail && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono tracking-wider shadow-sm">
                                        Class {leg.travel_class || opt.travel_class || travelClass}
                                      </span>
                                    )}
                                    {leg.mode === 'BUS' && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-mono tracking-wider shadow-sm">
                                        Bus
                                      </span>
                                    )}

                                    {/* Seat Status Badge */}
                                    {leg.mode !== 'WALK' && leg.seat_status === 'AVAILABLE' && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
                                        {leg.available_seats && leg.available_seats > 0 ? `${leg.available_seats} Seats Available` : 'Available'}
                                      </span>
                                    )}
                                    {leg.mode !== 'WALK' && leg.seat_status === 'RAC' && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">
                                        RAC {leg.wl_number && leg.wl_number > 0 ? leg.wl_number : 1}
                                      </span>
                                    )}
                                    {leg.mode !== 'WALK' && (leg.seat_status === 'WL' || leg.seat_status === 'WAITLIST') && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 shadow-sm flex items-center gap-1 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                        WL {leg.wl_number && leg.wl_number > 0 ? leg.wl_number : 1}
                                      </span>
                                    )}
                                    {(legIsRail || leg.mode === 'BUS') && <ServiceRatingBadge serviceNumber={leg.service_number} mode={leg.mode} />}
                                  </div>

                                  {/* Deep Linking Booking Action Bar specifically for Trains */}
                                  {legIsRail && (
                                    <div className="flex items-center gap-2 mt-2 pt-1.5 pb-1 border-t border-zinc-100">
                                      <span className="text-[9px] font-extrabold uppercase text-zinc-400 tracking-wider">
                                        Book Train:
                                      </span>
                                      
                                      {/* Official IRCTC Link */}
                                      <a
                                        href={irctcUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black shadow-xs transition-colors"
                                        title="Open Official IRCTC Portal"
                                      >
                                        <span>IRCTC Portal</span>
                                        <span className="text-[8px]">↗</span>
                                      </a>

                                      {/* Pre-filled Route on ConfirmTkt Link */}
                                      <a
                                        href={confirmTktUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black shadow-xs transition-colors"
                                        title={`Pre-fill route ${extractStationCode(leg.from_stop)} → ${extractStationCode(leg.to_stop)} on ConfirmTkt`}
                                      >
                                        <span>ConfirmTkt Search</span>
                                        <span className="text-[8px]">↗</span>
                                      </a>

                                      {/* Train Running Status & Schedule */}
                                      <a
                                        href={getTrainScheduleUrl(leg)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black shadow-xs transition-colors"
                                        title={`View live schedule and coach layout for Train ${leg.service_number}`}
                                      >
                                        <span>Live Status / Schedule</span>
                                        <span className="text-[8px]">↗</span>
                                      </a>
                                    </div>
                                  )}

                                  {/* Origin & Destination Stops */}
                                  <div className="flex justify-between text-[10px] text-zinc-500 font-medium mt-1">
                                    <span>
                                      {leg.from_stop.name}{' '}
                                      {legIsRail && <span className="text-[9px] font-mono text-zinc-400">({extractStationCode(leg.from_stop)})</span>}{' '}
                                      <strong className="text-zinc-700">{leg.departure_time}</strong>
                                    </span>
                                    <span>→</span>
                                    <span>
                                      <strong className="text-zinc-700">{leg.arrival_time}</strong>{' '}
                                      {leg.to_stop.name}{' '}
                                      {legIsRail && <span className="text-[9px] font-mono text-zinc-400">({extractStationCode(leg.to_stop)})</span>}
                                    </span>
                                  </div>

                                  {/* Fare breakdown & Distance */}
                                  {leg.mode !== 'WALK' && (
                                    <div className="flex flex-wrap justify-between items-center text-[10px] text-zinc-600 font-semibold mt-1 bg-zinc-50/80 px-2 py-0.5 rounded border border-zinc-100">
                                      <span>{leg.distance_km} km • Class: <strong className="text-zinc-900 font-mono">{leg.travel_class || opt.travel_class || travelClass}</strong> • Leg Fare: <strong className="text-zinc-900">₹{leg.price_inr}</strong></span>
                                      {leg.fare_breakdown?.breakdown_text && (
                                        <span className="text-[9px] text-zinc-400 font-normal hidden sm:inline" title={leg.fare_breakdown.breakdown_text}>
                                          {leg.fare_breakdown.breakdown_text}
                                        </span>
                                      )}
                                    </div>
                                  )}

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
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Panel: Map */}
        <div className="flex-1 bg-zinc-200 relative z-10">
          <div id="map" ref={mapRef} className="w-full h-full absolute inset-0 z-0"></div>
          {/* Subtle overlay logo on map */}
          <div className="absolute bottom-6 right-6 z-[400] pointer-events-none opacity-80 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl shadow-sm border border-zinc-200 flex flex-col gap-0.5">
            <span className="text-xs font-black text-brand-forest">Powered by McRAPTOR</span>
            <span className="text-[9px] font-bold text-zinc-500">OptiTransit Prototype Test Suite</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function TestFrontendPage() {
  return (
    <>
      <style>{`
        .dark-tiles {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
      `}</style>
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-brand-cream text-brand-forest font-black">Loading Test Frontend...</div>}>
        <TestFrontendContent />
      </Suspense>
    </>
  );
}
