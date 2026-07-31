"use client";

export default function SectionTwo() {
  return (
    <section className="w-full min-h-screen bg-[#4766ce] flex flex-col lg:flex-row items-stretch lg:h-screen lg:overflow-hidden select-none relative overflow-y-auto lg:overflow-y-hidden">
      
      {/* LEFT COLUMN */}
      <div className="w-full lg:w-1/2 h-[560px] lg:h-full flex items-center justify-center bg-[#4766ce] shrink-0 p-6 sm:p-8 md:p-12 lg:p-16">
        
        {/* Changed aspect ratio from 16/9 to 4/5 (taller height) and bumped container height */}
        <div 
          className="w-full max-w-[520px] aspect-[4/5] max-h-[80vh] relative flex items-center justify-center"
          style={{
            // Keeps the soft radial feathering at the edges
            WebkitMaskImage: "radial-gradient(ellipse at center, black 60%, transparent 98%)",
            maskImage: "radial-gradient(ellipse at center, black 60%, transparent 98%)",
          }}
        >
          <video
            src="/new.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover select-none pointer-events-none mix-blend-multiply"
          />
        </div>
        
      </div>

      {/* RIGHT COLUMN */}
      <div className="w-full lg:w-1/2 pt-12 lg:pt-0 pb-16 lg:pb-0 px-8 sm:px-12 md:px-16 lg:px-20 flex flex-col justify-start lg:justify-center bg-[#4766ce] relative shrink-0 lg:h-full lg:overflow-y-auto">
        
        <div className="flex flex-col gap-10 lg:gap-12 w-full max-w-2xl">
          <div className="flex flex-col gap-5">
            <h2 className="text-brand-lime font-black tracking-tight text-5xl sm:text-6xl md:text-7xl leading-[0.95] select-none">
              Combine and customize your routes in minutes
            </h2>
            <p className="text-white font-bold text-base md:text-lg xl:text-xl leading-relaxed max-w-xl">
              Connect flights, trains, and buses into a single visual path. Customize layovers, select classes, and let our engine automatically find the best connections to match your dates.
            </p>
          </div>

          <button className="bg-brand-lime text-brand-charcoal hover:bg-white hover:text-brand-forest hover:scale-[1.02] active:scale-[0.98] transition-all rounded-full px-10 py-5 font-black text-base max-w-xs text-center shadow-2xl cursor-pointer">
            Get started for free
          </button>
        </div>

      </div>

    </section>
  );
}