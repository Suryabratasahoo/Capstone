"use client";

export default function SectionFour() {
  return (
    <section className="w-full min-h-screen bg-[#e9efd9] flex flex-col lg:flex-row-reverse items-stretch lg:h-screen lg:overflow-hidden select-none relative overflow-y-auto lg:overflow-y-hidden">
      
      {/* RIGHT COLUMN: Copy & CTA */}
      <div className="w-full lg:w-1/2 pt-16 lg:pt-0 pb-16 lg:pb-0 px-8 sm:px-12 md:px-16 lg:px-20 flex flex-col justify-start lg:justify-center bg-[#e9efd9] relative shrink-0 lg:h-full lg:overflow-y-auto">
        
        {/* Content Wrapper */}
        <div className="flex flex-col gap-10 lg:gap-12 w-full max-w-2xl">
          
          {/* Headline and Subtext */}
          <div className="flex flex-col gap-5">
            <h2 className="text-zinc-900 font-black tracking-tight text-5xl sm:text-6xl md:text-7xl leading-[0.95] select-none">
              Analyze your transit links and optimize your routes
            </h2>
            <p className="text-zinc-700 font-bold text-base md:text-lg xl:text-xl leading-relaxed max-w-xl">
              Track your passenger engagement over time, monitor click-throughs on tickets, and learn which connections are converting. Make informed updates on the fly to keep travelers moving.
            </p>
          </div>

          {/* CTA Button */}
          <button className="bg-[#e0cefb] text-zinc-900 hover:bg-zinc-900 hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all rounded-full px-10 py-5 font-black text-base max-w-xs text-center shadow-2xl cursor-pointer">
            Get started for free
          </button>

        </div>

      </div>

      {/* LEFT COLUMN: Asymmetric Transit Analytics Grid */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#e9efd9] shrink-0 p-6 sm:p-8 md:p-12 lg:p-16">
        
        {/* 3-Column Responsive Grid matching the screenshot layout exactly */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-xl w-full">
          
          {/* Card 1: Top-Left (Col Span 2) - Route Clicks */}
          <div className="md:col-span-2 bg-[#6b7c56] text-white rounded-[2.2rem] p-7 flex items-center justify-between shadow-lg hover:scale-[1.02] transition-transform cursor-pointer">
            {/* Bezier wave line chart SVG */}
            <svg viewBox="0 0 140 80" className="w-[120px] h-[70px] shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="10" y1="10" x2="10" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <line x1="30" y1="10" x2="30" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <line x1="50" y1="10" x2="50" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <line x1="70" y1="10" x2="70" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <line x1="90" y1="10" x2="90" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <line x1="110" y1="10" x2="110" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <line x1="130" y1="10" x2="130" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <path
                d="M10,55 Q25,25 40,48 T70,33 T100,58 T130,22"
                stroke="#d2e823"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="130" cy="22" r="4.5" fill="#ffffff" />
            </svg>
            <div className="flex flex-col text-right">
              <span className="text-3xl font-black text-[#d2e823] tracking-tight">43,500</span>
              <span className="text-[10px] font-black text-white/70 uppercase tracking-wider mt-1">Route Clicks</span>
            </div>
          </div>

          {/* Card 2: Top-Right (Col Span 1) - Route Shares */}
          <div className="md:col-span-1 bg-[#e0cefb] text-zinc-900 rounded-[2.2rem] p-7 flex flex-col items-center justify-center text-center shadow-lg hover:scale-[1.02] transition-transform cursor-pointer">
            {/* Connection Share icon */}
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-indigo-950 mb-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span className="text-3xl font-black text-indigo-950 tracking-tight leading-none">842</span>
            <span className="text-[9px] font-black text-indigo-950/60 uppercase tracking-wider mt-2">Route Shares</span>
          </div>

          {/* Card 3: Bottom-Left (Col Span 1) - Ticket Revenue */}
          <div className="md:col-span-1 bg-[#b53cd6] text-white rounded-[2.2rem] p-7 flex flex-col items-center justify-center text-center shadow-lg hover:scale-[1.02] transition-transform cursor-pointer">
            {/* Dollar progress badge */}
            <div className="relative w-12 h-12 flex items-center justify-center mb-4">
              <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
                <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none" />
                <circle cx="24" cy="24" r="20" stroke="#ffffff" strokeWidth="3" strokeDasharray="125" strokeDashoffset="35" fill="none" strokeLinecap="round" />
              </svg>
              <span className="text-white text-lg font-black">$</span>
            </div>
            <span className="text-2.5xl font-black text-white tracking-tight leading-none">$4,820</span>
            <span className="text-[9px] font-black text-white/70 uppercase tracking-wider mt-2">Ticket Sales</span>
          </div>

          {/* Card 4: Bottom-Right (Col Span 2) - Itinerary Visits */}
          <div className="md:col-span-2 bg-[#0c1968] text-white rounded-[2.2rem] p-7 flex items-center justify-between shadow-lg hover:scale-[1.02] transition-transform cursor-pointer">
            {/* Glowing Map Globe */}
            <div className="relative w-[90px] h-[90px] shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500 fill-current" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="#2563eb" />
                <path d="M25,50 Q30,35 45,35 T65,40 T75,60 T60,80 T35,70 Z" fill="#60a5fa" />
                <path d="M65,25 Q75,30 80,45 T65,55 Z" fill="#60a5fa" />
                <path d="M15,40 Q20,30 30,35 Z" fill="#60a5fa" />
              </svg>
              {/* Pulsing pink radar beacon dot over New York coordinate */}
              <span className="absolute top-[42%] left-[45%] flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
              </span>
            </div>
            
            <div className="flex flex-col text-right">
              <span className="text-[8px] font-bold text-white/50 uppercase tracking-wider">Delhi ➔ Kolkata</span>
              <span className="text-3xl font-black text-white tracking-tight mt-1">960</span>
              <span className="text-[10px] font-black text-white/70 uppercase tracking-wider mt-1">Itinerary Visits</span>
            </div>
          </div>

        </div>

      </div>

    </section>
  );
}
