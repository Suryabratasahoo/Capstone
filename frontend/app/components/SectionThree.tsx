"use client";

export default function SectionThree() {
  return (
    <section className="w-full min-h-screen bg-[#600619] flex flex-col lg:flex-row items-stretch lg:h-screen lg:overflow-hidden select-none relative overflow-y-auto lg:overflow-y-hidden">
      
      {/* LEFT COLUMN: Share Copy & CTA */}
      <div className="w-full lg:w-1/2 pt-16 lg:pt-0 pb-16 lg:pb-0 px-8 sm:px-12 md:px-16 lg:px-20 flex flex-col justify-start lg:justify-center bg-[#600619] relative shrink-0 lg:h-full lg:overflow-y-auto">
        
        {/* Content Wrapper */}
        <div className="flex flex-col gap-10 lg:gap-12 w-full max-w-2xl">
          
          {/* Headline and Subtext */}
          <div className="flex flex-col gap-5">
            <h2 className="text-[#e9e0f2] font-black tracking-tight text-5xl sm:text-6xl md:text-7xl leading-[0.95] select-none">
              Share your ConnexLink anywhere you like!
            </h2>
            <p className="text-white font-bold text-base md:text-lg xl:text-xl leading-relaxed max-w-xl">
              Add your unique ConnexLink URL to all the platforms and places you find your audience. Then use your QR code to drive your offline traffic back to your link in bio.
            </p>
          </div>

          {/* CTA Button */}
          <button className="bg-[#e9e0f2] text-[#600619] hover:bg-white hover:text-black hover:scale-[1.02] active:scale-[0.98] transition-all rounded-full px-10 py-5 font-black text-base max-w-xs text-center shadow-2xl cursor-pointer">
            Get started for free
          </button>

        </div>

      </div>

      {/* RIGHT COLUMN: Interactive Video Showcase (Styled to match video background) */}
      <div className="w-full lg:w-1/2 h-[560px] lg:h-full flex items-center justify-center bg-[#600619] shrink-0 p-6 sm:p-8 md:p-12 lg:p-16">
        <div className="w-full max-w-[400px] aspect-[4/5] max-h-[80vh] relative flex items-center justify-center">
          <video
            src="/section3.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        </div>
      </div>

    </section>
  );
}
