"use client";

import { useState, useEffect } from "react";

export default function SectionFive() {
  const words = ["travelers", "backpackers", "commuters", "agencies", "explorers"];
  const [wordIndex, setWordIndex] = useState(0);
  const [isFading, setIsFading] = useState(true);

  useEffect(() => {
    const wordTimer = setInterval(() => {
      setIsFading(false);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
        setIsFading(true);
      }, 300);
    }, 2800);

    return () => clearInterval(wordTimer);
  }, []);

  // Marquee Cards Configuration
  const cards = [
    {
      id: "amtrak",
      width: "w-[420px] md:w-[540px]",
      shape: "rounded-[2.8rem]",
      bgImage: "/train_cutout.png",
      bgColor: "bg-black",
      bgSize: "contain",
      logo: (
        <div className="flex flex-col items-center gap-1.5 bg-black/40 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10">
          <svg viewBox="0 0 100 24" className="w-[100px] h-[24px] text-white fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M10,2 C15,2 20,8 24,14 C28,20 35,22 40,22 L10,22 C6,22 2,18 2,14 C2,8 6,2 10,2 Z" />
            <path d="M26,2 C31,2 36,8 40,14 C44,20 51,22 56,22 L26,22 C22,22 18,18 18,14 C18,8 22,2 26,2 Z" fillOpacity="0.6" />
            <path d="M42,2 C47,2 52,8 56,14 C60,20 67,22 72,22 L42,22 C38,22 34,18 34,14 C34,8 38,2 42,2 Z" fillOpacity="0.3" />
          </svg>
          <span className="text-white text-[10px] font-black tracking-[0.25em] uppercase mt-1">Amtrak</span>
        </div>
      )
    },
    {
      id: "clippers",
      width: "w-[300px] md:w-[380px]",
      shape: "rounded-[3.2rem]",
      bgImage: null,
      bgColor: "bg-white",
      logo: (
        <div className="flex items-center justify-center select-none">
          <svg viewBox="0 0 200 200" className="w-[150px] h-[150px] sm:w-[170px] sm:h-[170px]" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="82" stroke="#000000" strokeWidth="8" fill="none" />
            <line x1="18" y1="100" x2="182" y2="100" stroke="#000000" strokeWidth="8" />
            <line x1="100" y1="18" x2="100" y2="182" stroke="#000000" strokeWidth="8" />
            <path d="M42 42 A82 82 0 0 0 42 158" stroke="#000000" strokeWidth="8" fill="none" />
            <path d="M158 42 A82 82 0 0 1 158 158" stroke="#000000" strokeWidth="8" fill="none" />
            <rect x="73" y="55" width="54" height="90" fill="#ffffff" />
            <path d="M118 64 L86 64 L86 136 L118 136 M118 96 L104 96" stroke="#1d428a" strokeWidth="10" strokeLinecap="square" fill="none" />
            <text x="91" y="103" fontFamily="Impact, Arial Black, sans-serif" fontWeight="900" fontSize="26" fill="#c8102e">L</text>
            <text x="91" y="126" fontFamily="Impact, Arial Black, sans-serif" fontWeight="900" fontSize="26" fill="#c8102e">A</text>
          </svg>
        </div>
      )
    },
    {
      id: "traveler-profile",
      width: "w-[280px] md:w-[360px]",
      shape: "rounded-[2.5rem]",
      bgImage: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600&auto=format&fit=crop",
      bgColor: null,
      logo: null
    },
    {
      id: "delta",
      width: "w-[340px] md:w-[440px]",
      shape: "rounded-[4.5rem]",
      bgImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=600&auto=format&fit=crop",
      bgColor: null,
      logo: (
        <div className="bg-black/45 backdrop-blur-md p-5 rounded-full border border-white/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M12,2 L2,20 L12,17 L22,20 L12,2 Z" />
            <path d="M12,2 L12,17 L22,20 Z" fillOpacity="0.4" />
          </svg>
        </div>
      )
    },
    {
      id: "comedy_central",
      width: "w-[300px] md:w-[380px]",
      shape: "rounded-[3.2rem]",
      bgImage: null,
      bgColor: "bg-black",
      logo: (
        <div className="flex items-center justify-center select-none">
          <svg viewBox="0 0 120 120" className="w-[120px] h-[120px] sm:w-[135px] sm:h-[135px]" xmlns="http://www.w3.org/2000/svg">
            <path d="M 45,30 A 35,35 0 1,1 45,90" fill="none" stroke="#fecb2f" strokeWidth="14" strokeLinecap="round" />
            <path d="M 75,90 A 18,18 0 1,1 75,30" fill="none" stroke="#fecb2f" strokeWidth="14" strokeLinecap="round" />
          </svg>
        </div>
      )
    },
    {
      id: "globe-circle",
      width: "w-[340px] md:w-[440px]",
      shape: "rounded-full",
      bgImage: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=600&auto=format&fit=crop",
      bgColor: null,
      logo: null
    },
    {
      id: "flixbus",
      width: "w-[380px] md:w-[480px]",
      shape: "rounded-[3.2rem]",
      bgImage: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?q=80&w=600&auto=format&fit=crop",
      bgColor: null,
      logo: (
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 3h12l4 9-4 9H6l4-9-4-9z" />
            <path d="M10 12l-4 9h5l4-9-4-9H6l4 9z" fillOpacity="0.5" />
          </svg>
          <span className="text-white text-xs font-black tracking-widest uppercase">FlixBus</span>
        </div>
      )
    },
    {
      id: "metro-squircle",
      width: "w-[300px] md:w-[380px]",
      shape: "rounded-[3.8rem]",
      bgImage: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=600&auto=format&fit=crop",
      bgColor: null,
      logo: (
        <div className="bg-black/50 backdrop-blur-md w-16 h-16 rounded-full flex items-center justify-center border border-white/10">
          <span className="text-white text-3xl font-black italic tracking-tighter">M</span>
        </div>
      )
    }
  ];

  return (
    <section className="w-full bg-[#f3f3f1] pt-24 pb-28 flex flex-col items-center select-none overflow-hidden relative">
      
      {/* HEADER: Dynamic Rotating Keyword Title (Enforced to exactly 2 lines on all screens) */}
      <div className="flex flex-col items-center gap-4 text-center max-w-5xl px-6 mb-16">
        <h2 className="text-zinc-900 font-black tracking-tight text-[6.2vw] sm:text-6xl md:text-7xl leading-[0.95] select-none flex flex-col items-center">
          <span className="block whitespace-nowrap">The only travel link in bio</span>
          <span className="block whitespace-nowrap mt-2">
            trusted by 10M+{" "}
            <span
              className={`text-[#4766ce] inline-block transition-all duration-300 transform ${
                isFading ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}
            >
              {words[wordIndex]}
            </span>
          </span>
        </h2>
      </div>

      {/* MARQUEE CAROUSEL TRACK */}
      <div className="w-full overflow-hidden flex relative py-4 mb-28">
        <div className="animate-marquee-cutouts flex flex-row items-center gap-6 whitespace-nowrap">
          {/* Set 1 */}
          {cards.map((card) => (
            <div
              key={`set1-${card.id}`}
              className={`${card.width} h-[340px] md:h-[440px] ${card.shape} ${card.bgColor || ""} overflow-hidden relative shrink-0 shadow-lg group hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 cursor-pointer`}
              style={card.bgImage ? {
                backgroundImage: `url('${card.bgImage}')`,
                backgroundSize: card.bgSize || "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
              } : undefined}
            >
              {card.bgImage && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 group-hover:from-black/50 transition-all duration-500" />
              )}
              {card.logo && (
                <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500">
                  {card.logo}
                </div>
              )}
            </div>
          ))}
          {/* Set 2 (Duplicate for seamless loop) */}
          {cards.map((card) => (
            <div
              key={`set2-${card.id}`}
              className={`${card.width} h-[340px] md:h-[440px] ${card.shape} ${card.bgColor || ""} overflow-hidden relative shrink-0 shadow-lg group hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 cursor-pointer`}
              style={card.bgImage ? {
                backgroundImage: `url('${card.bgImage}')`,
                backgroundSize: card.bgSize || "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
              } : undefined}
            >
              {card.bgImage && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 group-hover:from-black/50 transition-all duration-500" />
              )}
              {card.logo && (
                <div className="absolute inset-0 flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500">
                  {card.logo}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* EXTENDED FEATURES SECTION GRID (Takes almost the entire width of the screen) */}
      <div className="w-full max-w-[95%] xl:max-w-[92%] px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 mb-28">
        
        {/* LEFT COLUMN: Stacked Cards (Lavender + Lime Green) */}
        <div className="flex flex-col gap-8">
          
          {/* Card 1: Lavender (Overlapping tickets graphic with full-bleed background image) */}
          <div 
            className="rounded-[3rem] min-h-[380px] shadow-md hover:scale-[1.01] transition-transform overflow-hidden relative cursor-pointer"
            style={{
              backgroundImage: "url('/travel_path.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          />

          {/* Card 2: Lime Green (Fare Passes graphic with full-bleed background image) */}
          <div 
            className="rounded-[3rem] min-h-[380px] shadow-md hover:scale-[1.01] transition-transform overflow-hidden relative cursor-pointer"
            style={{
              backgroundImage: "url('/train_planner.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          />

        </div>

        {/* RIGHT COLUMN: Tall Card (Dark Blue - Mock phone dashboard with full-bleed background image) */}
        <div 
          className="rounded-[3rem] min-h-[792px] shadow-md hover:scale-[1.01] transition-transform overflow-hidden relative cursor-pointer"
          style={{
            backgroundImage: "url('/travel_phones.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "top center"
          }}
        />

      </div>

      {/* PLAN HIGHLIGHT SECTION (Covers the full screen height) */}
      <div className="w-full min-h-screen flex flex-col justify-center items-center text-center bg-[#f3f3f1] px-6 select-none shrink-0 relative">
        <div className="flex flex-col items-center gap-10 max-w-4xl">
          <h3 className="text-zinc-900 font-black text-5xl sm:text-6xl md:text-7xl tracking-tight leading-[0.95] select-none max-w-3xl">
            The fast, friendly and powerful link in bio tool.
          </h3>
          <button className="bg-[#e0cefb] text-zinc-900 hover:bg-zinc-900 hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all rounded-full px-12 py-5.5 font-black text-base max-w-xs text-center shadow-2xl cursor-pointer">
            Explore all plans
          </button>
        </div>
      </div>

      {/* FEATURED PRESS GRID (Staggered two-row honeycomb layout matching your screenshot) */}
      <div className="flex flex-col items-center gap-16 mb-28 w-full max-w-4xl px-6">
        <h4 className="text-zinc-900 font-black text-5xl sm:text-6xl md:text-7xl tracking-tight leading-[0.95] text-center select-none">
          As featured in...
        </h4>
        
        <div className="flex flex-col items-center gap-5 w-full">
          
          {/* Row 1: 3 cards */}
          <div className="flex flex-row justify-center items-center gap-5 flex-wrap w-full">
            {/* TechCrunch */}
            <div className="bg-white w-[220px] sm:w-[250px] h-[64px] sm:h-[72px] rounded-full flex items-center justify-center shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
              <svg viewBox="0 0 140 32" className="w-[125px] h-[28px]" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="4" width="8" height="8" fill="#02B159"/>
                <rect x="8" y="12" width="8" height="8" fill="#02B159"/>
                <rect x="16" y="20" width="8" height="8" fill="#02B159"/>
                <rect x="8" y="4" width="16" height="8" fill="#02B159"/>
                <text x="32" y="22" fontFamily="sans-serif" fontWeight="900" fontSize="13.5" fill="#18181b">TechCrunch</text>
              </svg>
            </div>

            {/* Insider */}
            <div className="bg-white w-[220px] sm:w-[250px] h-[64px] sm:h-[72px] rounded-full flex items-center justify-center shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
              <svg viewBox="0 0 110 32" className="w-[100px] h-[28px]" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="15" r="9" stroke="#18181b" strokeWidth="2.2" fill="none" />
                <path d="M12,15 L16,19 L21,11" stroke="#18181b" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <text x="34" y="21" fontFamily="sans-serif" fontWeight="900" fontSize="16" fill="#18181b">insider</text>
              </svg>
            </div>

            {/* Forbes */}
            <div className="bg-white w-[220px] sm:w-[250px] h-[64px] sm:h-[72px] rounded-full flex items-center justify-center shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
              <svg viewBox="0 0 100 32" className="w-[90px] h-[28px]" xmlns="http://www.w3.org/2000/svg">
                <text x="10" y="23" fontFamily="Georgia, serif" fontWeight="900" fontStyle="italic" fontSize="24" letterSpacing="-1.5" fill="#18181b">Forbes</text>
              </svg>
            </div>
          </div>

          {/* Row 2: 2 cards (Offset centering) */}
          <div className="flex flex-row justify-center items-center gap-5 flex-wrap w-full">
            {/* Mashable */}
            <div className="bg-white w-[220px] sm:w-[250px] h-[64px] sm:h-[72px] rounded-full flex items-center justify-center shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
              <svg viewBox="0 0 100 32" className="w-[90px] h-[28px]" xmlns="http://www.w3.org/2000/svg">
                <text x="10" y="21" fontFamily="sans-serif" fontWeight="900" fontSize="18" fill="#475569">Mashable</text>
              </svg>
            </div>

            {/* Fortune */}
            <div className="bg-white w-[220px] sm:w-[250px] h-[64px] sm:h-[72px] rounded-full flex items-center justify-center shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer">
              <svg viewBox="0 0 110 32" className="w-[100px] h-[28px]" xmlns="http://www.w3.org/2000/svg">
                <text x="10" y="22" fontFamily="Times New Roman, serif" fontWeight="700" fontSize="16" letterSpacing="3" fill="#18181b">FORTUNE</text>
              </svg>
            </div>
          </div>

        </div>
      </div>

    </section>
  );
}
