"use client";

import { useState, useEffect } from "react";

const slides = [
  {
    bgImage: "/train_journey.jpg",
    title: "Vijayawada → Bhubaneswar",
    profile: "@transit_link",
    icon: "🚆",
    legs: [
      {
        type: "train",
        icon: "🚆",
        name: "Coromandel Express (12842)",
        time: "VZA 10:15 AM ➔ VSKP 04:30 PM",
        status: "Seats Available",
        statusColor: "text-emerald-600 bg-emerald-50",
      },
      {
        type: "layover",
        icon: "🚌",
        name: "Transit Layover (1h 30m)",
        time: "VZA Station to Bus Stand",
        status: "Auto / Taxi Active",
        statusColor: "text-amber-600 bg-amber-50",
      },
      {
        type: "bus",
        icon: "🚍",
        name: "APSRTC AC Sleeper",
        time: "VSKP 06:00 PM ➔ BBS 11:45 PM",
        status: "12 Seats Left",
        statusColor: "text-rose-600 bg-rose-50",
      },
    ],
    caption: "Vijayawada to Bhubaneswar. Connected via Visakhapatnam by Train & Bus.",
    bgColor: "bg-brand-forest",
    accentColor: "#d2e823",
  },
  {
    bgImage: "/flight_view.jpg",
    title: "Delhi → Kolkata",
    profile: "@air_connect",
    icon: "✈️",
    legs: [
      {
        type: "flight",
        icon: "✈️",
        name: "IndiGo Flight 6E-203",
        time: "DEL 02:00 PM ➔ IXR 03:45 PM",
        status: "On Time",
        statusColor: "text-emerald-600 bg-emerald-50",
      },
      {
        type: "layover",
        icon: "🚕",
        name: "Transit Layover (2h 15m)",
        time: "Ranchi Airport to Train Station",
        status: "Prepaid Cab Included",
        statusColor: "text-sky-600 bg-sky-50",
      },
      {
        type: "train",
        icon: "🚆",
        name: "Kriya Yoga Express (18616)",
        time: "RNC 06:00 PM ➔ HWH 04:30 AM",
        status: "RAC Available",
        statusColor: "text-amber-600 bg-amber-50",
      },
    ],
    caption: "Delhi to Kolkata. Connected via Ranchi by Flight & Train.",
    bgColor: "bg-indigo-950",
    accentColor: "#38bdf8",
  },
  {
    bgImage: "/bus_highway.jpg",
    title: "Mumbai → Goa",
    profile: "@road_trip",
    icon: "🚍",
    legs: [
      {
        type: "bus",
        icon: "🚍",
        name: "KSRTC Swift Multi-Axle",
        time: "MUM 09:00 PM ➔ KOP 04:30 AM",
        status: "AC Sleeper (8.8/10)",
        statusColor: "text-emerald-600 bg-emerald-50",
      },
      {
        type: "layover",
        icon: "☕",
        name: "Layover Break (1h 00m)",
        time: "Kolhapur Bus Stand Rest Area",
        status: "Food Plaza Open",
        statusColor: "text-amber-600 bg-amber-50",
      },
      {
        type: "bus",
        icon: "🚍",
        name: "Kadamba AC Shuttle",
        time: "KOP 05:30 AM ➔ GOA 09:45 AM",
        status: "Seats Available",
        statusColor: "text-emerald-600 bg-emerald-50",
      },
    ],
    caption: "Mumbai to Goa. Connected via Kolhapur by Bus & Bus.",
    bgColor: "bg-rose-950",
    accentColor: "#fda4af",
  },
];

const doubledSlides = [...slides, ...slides];

export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");

  // Auto-scroll vertical carousel every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Handles the instant reset at the end of the original slide list
  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName === "transform" && currentIndex === slides.length) {
      setIsTransitioning(false);
      setCurrentIndex(0);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Searching connecting routes from "${source}" to "${destination}" on ${date || "any date"}...`);
  };

  return (
    <section className="w-full min-h-screen bg-brand-lime flex flex-col lg:flex-row items-stretch lg:h-screen lg:overflow-hidden select-none relative overflow-y-auto lg:overflow-y-hidden">
      
      {/* LEFT COLUMN: Hero content & Search widget */}
      <div className="w-full lg:w-[58%] pt-28 lg:pt-32 pb-16 px-6 sm:px-12 md:px-16 flex flex-col justify-center bg-brand-lime relative shrink-0 lg:h-full lg:overflow-y-auto left-hero-column">
        
        {/* Floating Custom Stickers (Playful elements) */}
        <div className="absolute top-28 left-6 hidden sm:block animate-bounce duration-[3500ms] pointer-events-none z-20">
          <div className="relative w-18 h-18 bg-white rounded-2xl shadow-xl border-2 border-brand-charcoal p-2 rotate-[-12deg] flex items-center justify-center">
            <span className="text-4xl">🚆</span>
            <div className="absolute -bottom-2.5 -right-2.5 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-brand-charcoal">
              LIVE
            </div>
          </div>
        </div>

        <div className="absolute top-1/4 right-8 hidden xl:block pointer-events-none rotate-12 z-20">
          <svg className="w-12 h-12 text-brand-forest fill-current" viewBox="0 0 24 24">
            <path d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
          </svg>
        </div>

        {/* Spaced Content Wrapper to occupy height cleanly */}
        <div className="flex flex-col gap-10 lg:gap-12 w-full max-w-2xl justify-center">
          
          {/* Title & Subheading Group */}
          <div className="flex flex-col gap-5">
            <h1 className="text-brand-forest font-black tracking-tight text-5xl sm:text-6xl md:text-7xl leading-[0.95] select-none relative">
              Every connection, <br />
              <span className="relative inline-block text-brand-charcoal">
                mapped for you.
                <svg
                  className="absolute -bottom-4 left-0 w-full text-brand-forest"
                  height="10"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 5 Q 25 0, 50 5 T 100 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="text-brand-forest font-bold text-base md:text-lg xl:text-xl leading-relaxed max-w-xl">
              Search, combine, and book flights, trains, and buses to find seamless connecting routes. No direct tickets available? Let us map out the perfect break-journey solution.
            </p>
          </div>

          {/* Search Widget Container */}
          <form onSubmit={handleSearch} className="w-full relative z-20">
            <div className="bg-white rounded-3xl p-4 md:rounded-full md:p-3 flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-2xl border border-brand-forest/10 hover:border-brand-forest/20 transition-all">
              
              {/* Field 1: Source */}
              <div className="flex-1 px-5 py-3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-zinc-100 min-w-0">
                <label className="text-[11px] uppercase font-black text-zinc-400 tracking-wider mb-1">
                  From
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Vijayawada"
                  className="bg-transparent text-base font-black text-brand-charcoal focus:outline-none border-none placeholder-zinc-300 w-full"
                  required
                />
              </div>

              {/* Field 2: Destination */}
              <div className="flex-1 px-5 py-3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-zinc-100 min-w-0">
                <label className="text-[11px] uppercase font-black text-zinc-400 tracking-wider mb-1">
                  To
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Bhubaneswar"
                  className="bg-transparent text-base font-black text-brand-charcoal focus:outline-none border-none placeholder-zinc-300 w-full"
                  required
                />
              </div>

              {/* Field 3: Date */}
              <div className="w-full md:w-40 px-5 py-3 flex flex-col justify-center min-w-0">
                <label className="text-[11px] uppercase font-black text-zinc-400 tracking-wider mb-1">
                  Travel Date
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  onFocus={(e) => (e.target.type = "date")}
                  onBlur={(e) => {
                    if (!e.target.value) e.target.type = "text";
                  }}
                  className="bg-transparent text-base font-black text-brand-charcoal focus:outline-none border-none placeholder-zinc-300 w-full"
                />
              </div>

              {/* CTA Button */}
              <button
                type="submit"
                className="bg-brand-forest hover:bg-black text-white px-8 py-4 rounded-2xl md:rounded-full font-black text-base transition-colors shrink-0 text-center cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                Find Connections
              </button>
            </div>

            {/* Yellow Hand-drawn Swirly Cartoon Arrow */}
            <div className="absolute -bottom-20 right-20 hidden sm:block pointer-events-none">
              <div className="relative">
                <svg
                  width="110"
                  height="100"
                  viewBox="0 0 100 90"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="rotate-[-8deg]"
                >
                  {/* 1. Black Outline Layer */}
                  <path
                    d="M75,12 C72,32 58,48 48,43 C38,38 42,22 52,27 C62,32 52,52 22,64"
                    stroke="#1c1917"
                    strokeWidth="13"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <polygon
                    points="10,70 30,52 32,76"
                    fill="#1c1917"
                    stroke="#1c1917"
                    strokeWidth="13"
                    strokeLinejoin="round"
                  />

                  {/* 2. Yellow Fill Layer */}
                  <path
                    d="M75,12 C72,32 58,48 48,43 C38,38 42,22 52,27 C62,32 52,52 22,64"
                    stroke="#f1c40f"
                    strokeWidth="7"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <polygon
                    points="10,70 30,52 32,76"
                    fill="#f1c40f"
                    stroke="#f1c40f"
                    strokeWidth="7"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="absolute left-[-60px] bottom-[-20px] font-sans font-black text-xs text-brand-forest uppercase tracking-widest bg-white border-2 border-brand-forest/20 shadow-md rounded-lg px-2.5 py-1">
                  Try it!
                </span>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: Floating rounded cards vertical carousel (Infinite one-way scroller) */}
      <div className="w-full lg:w-[42%] relative h-[650px] lg:h-full lg:min-h-screen overflow-hidden shrink-0 bg-brand-lime flex flex-col items-center justify-start">
        
        {/* Vertical Slides Scrolling Track */}
        <div
          className={`flex flex-col gap-8 lg:gap-[4vh] w-full items-center carousel-track ${
            isTransitioning ? "transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]" : "no-transition"
          }`}
          style={{
            ["--active-index" as any]: currentIndex,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {doubledSlides.map((slide, sIdx) => {
            const isOriginalActive = currentIndex % slides.length === sIdx % slides.length;
            
            return (
              <div 
                key={sIdx} 
                className="w-[90%] max-w-[380px] lg:max-w-none lg:w-[88%] h-[480px] lg:h-[72vh] rounded-[3.2rem] lg:rounded-[3.8rem] relative overflow-hidden shadow-2xl shrink-0 bg-zinc-950"
              >
                
                {/* Background Image of the Card (Standard img tag to ensure visual rendering) */}
                <img
                  src={slide.bgImage}
                  alt={slide.caption}
                  className="absolute inset-0 w-full h-full object-cover opacity-85"
                />
                
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/20" />

                {/* Overlaid Linktree Phone Mockup */}
                <div className="absolute inset-0 m-auto w-[68%] max-w-[240px] lg:max-w-[260px] aspect-[9/18] rounded-[2.5rem] border-[8px] border-zinc-900 bg-zinc-900/40 backdrop-blur-md p-4 shadow-2xl flex flex-col justify-start z-10 select-none animate-[float_4s_ease-in-out_infinite]">
                  
                  {/* Phone Notch/Dynamic Island */}
                  <div className="w-20 h-4.5 bg-zinc-900 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-zinc-800 mr-2" />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                  </div>

                  {/* Phone Header Profile */}
                  <div className="flex flex-col items-center gap-1 mt-1 text-center">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm shadow-md border-2 border-white"
                      style={{ backgroundColor: slide.accentColor }}
                    >
                      {slide.icon || "✈️"}
                    </div>
                    <span className="text-white text-xs font-black tracking-tight mt-1.5">
                      {slide.title}
                    </span>
                    <span className="text-[9px] text-zinc-300 font-bold">
                      {slide.profile}
                    </span>
                  </div>

                  {/* Phone Content (Linktree Buttons as Transit Steps) */}
                  <div className="flex flex-col gap-2 mt-4 overflow-y-auto max-h-[250px] pr-0.5 scrollbar-none">
                    {slide.legs.map((leg, lIdx) => (
                      <div key={lIdx} className="w-full flex flex-col gap-1.5">
                        {leg.type === "layover" ? (
                          // Layover pill
                          <div className="bg-zinc-950/80 text-white rounded-xl p-2.5 flex items-center justify-between border border-zinc-800 shadow-md">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{leg.icon}</span>
                              <div className="flex flex-col text-left">
                                <span className="text-[8.5px] font-black uppercase text-zinc-400">Layover</span>
                                <span className="text-[9.5px] font-extrabold text-zinc-200">{leg.name}</span>
                              </div>
                            </div>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${leg.statusColor}`}>
                              {leg.status}
                            </span>
                          </div>
                        ) : (
                          // Transit Leg Link Button
                          <div className="bg-white hover:bg-zinc-50 text-brand-charcoal rounded-2xl p-2.5 flex flex-col items-start border border-white/20 shadow-md transition-transform hover:scale-[1.02] cursor-pointer">
                            <div className="flex items-center gap-1.5 w-full justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{leg.icon}</span>
                                <span className="text-[10px] font-black text-brand-charcoal truncate max-w-[110px]">
                                    {leg.name}
                                  </span>
                              </div>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${leg.statusColor} shrink-0`}>
                                  {leg.status}
                                </span>
                            </div>
                            <div className="text-[8.5px] font-bold text-zinc-500 mt-1 flex items-center gap-1 w-full">
                              <span className="font-extrabold text-zinc-400 shrink-0">ROUTE:</span>
                              <span className="text-zinc-600 truncate">{leg.time}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Phone Footer Brand */}
                  <div className="mt-auto pt-2.5 text-center border-t border-white/5">
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                      Powered by ConnexLink
                    </span>
                  </div>

                </div>

                {/* Carousel Card Bottom Caption */}
                <div className="absolute bottom-6 left-6 right-6 lg:bottom-8 lg:left-8 lg:right-8 z-20 text-white bg-brand-charcoal/50 backdrop-blur-lg border border-white/10 p-4 lg:p-5 rounded-2xl lg:rounded-3xl flex items-center justify-between">
                  <div className="flex flex-col text-left">
                    <span className="text-[9.5px] font-black text-zinc-300 uppercase tracking-wider">
                      Featured Route
                    </span>
                    <span className="text-xs lg:text-sm font-extrabold text-white leading-snug mt-1">
                      {slide.caption}
                    </span>
                  </div>
                  {isOriginalActive && (
                    <div className="w-2.5 h-2.5 rounded-full animate-ping bg-emerald-400 shrink-0 ml-2" />
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Dots Indicator Overlay */}
        <div className="absolute top-1/2 right-6 -translate-y-1/2 z-30 flex flex-col gap-2.5">
          {slides.map((_, dotIdx) => {
            const isDotActive = currentIndex % slides.length === dotIdx;
            
            return (
              <button
                key={dotIdx}
                onClick={() => {
                  setIsTransitioning(true);
                  setCurrentIndex(dotIdx);
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  isDotActive ? "bg-white h-7" : "bg-white/40"
                }`}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            );
          })}
        </div>

      </div>
    </section>
  );
}
