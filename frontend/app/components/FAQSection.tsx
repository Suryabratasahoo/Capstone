"use client";

import { useState } from "react";

interface FAQItem {
  id: string;
  question: string;
  answer: string | React.ReactNode;
}

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const faqItems: FAQItem[] = [
    {
      id: "q1",
      question: "Is ConnexLink the original transit link in bio tool?",
      answer: (
        <>
          <p className="font-medium text-lg sm:text-xl text-[#f9f2f5] mb-6">
            The short answer? Yes!
          </p>
          <p className="font-normal text-base sm:text-lg text-[#e9e0f2] leading-relaxed">
            Back in 2026, we created ConnexLink as an easy way to link out to all socials and unify digital ecosystems, pioneering the transit link-in-bio category. ConnexLink remains the leading, biggest and most popular transit link-in-bio solution — but that’s just the beginning. You can use your ConnexLink URL or QR code <em className="italic">anywhere</em> your audience is, including on your business cards, in your email signature, on paper-based posters and brochures, and even on your resumé. If you don’t have a website, that’s fine. If you have a ConnexLink, you don’t need one!
          </p>
        </>
      )
    },
    {
      id: "q2",
      question: "Can you compare fares and book tickets from a ConnexLink?",
      answer: (
        <>
          <p className="font-medium text-lg sm:text-xl text-[#f9f2f5] mb-6">
            Comparing fares is built right in!
          </p>
          <p className="font-normal text-base sm:text-lg text-[#e9e0f2] leading-relaxed">
            Travelers can compare live pricing for buses, trains, and flights directly within your link. Integration with major booking engines allows them to complete ticket purchases in seconds without ever leaving your custom transit hub.
          </p>
        </>
      )
    },
    {
      id: "q3",
      question: "Is ConnexLink safe to use on all of my social media profiles?",
      answer: (
        <>
          <p className="font-medium text-lg sm:text-xl text-[#f9f2f5] mb-6">
            100% safe and verified across all platforms.
          </p>
          <p className="font-normal text-base sm:text-lg text-[#e9e0f2] leading-relaxed">
            ConnexLink is fully optimized and approved for use across all major social networks including Instagram, TikTok, YouTube, and LinkedIn, keeping your audience's connections secure and spam-free.
          </p>
        </>
      )
    },
    {
      id: "q4",
      question: "How does the automated connection engine work?",
      answer: (
        <>
          <p className="font-medium text-lg sm:text-xl text-[#f9f2f5] mb-6">
            Real-time schedule monitoring and smart buffers.
          </p>
          <p className="font-normal text-base sm:text-lg text-[#e9e0f2] leading-relaxed">
            Our connection engine dynamically monitors schedules across hundreds of transit operators worldwide. It calculates real-time connection buffers to ensure layovers are always safe and stress-free.
          </p>
        </>
      )
    },
    {
      id: "q5",
      question: "Can I customize layovers and connection times?",
      answer: (
        <>
          <p className="font-medium text-lg sm:text-xl text-[#f9f2f5] mb-6">
            Full granular control over route logic.
          </p>
          <p className="font-normal text-base sm:text-lg text-[#e9e0f2] leading-relaxed">
            Customize layover durations, filter by preferred transit modes (like train-only or flight-only), and choose your seating class options directly from your dashboard settings.
          </p>
        </>
      )
    },
    {
      id: "q6",
      question: "Is there a free plan available for ConnexLink?",
      answer: (
        <>
          <p className="font-medium text-lg sm:text-xl text-[#f9f2f5] mb-6">
            Yes, free forever with no credit card required.
          </p>
          <p className="font-normal text-base sm:text-lg text-[#e9e0f2] leading-relaxed">
            Our basic plan includes core route building, link aggregation, and standard analytics. You can upgrade to Pro anytime for custom styling, custom domains, and live API integrations.
          </p>
        </>
      )
    }
  ];

  const renderFAQCard = (item: FAQItem) => {
    const isOpen = !!openItems[item.id];
    return (
      <div
        key={item.id}
        className="w-full bg-[#3c0c14] hover:bg-[#4c0f1b] rounded-[2.25rem] transition-all duration-300 shadow-md border border-white/5 overflow-hidden"
      >
        {/* Header Button */}
        <button
          className={`w-full px-8 sm:px-12 flex justify-between items-start text-left text-[#f9f2f5] font-bold text-lg sm:text-xl md:text-2xl select-none cursor-pointer focus:outline-none transition-all duration-300 ${
            isOpen ? "pt-8 sm:pt-10 pb-4" : "py-9 sm:py-11"
          }`}
          onClick={() => toggleItem(item.id)}
        >
          <span className="pr-6 leading-tight">{item.question}</span>
          <svg
            className={`w-5 h-5 text-white/80 shrink-0 transition-transform duration-300 mt-1 ${
              isOpen ? "rotate-180 text-white" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        
        {/* Accordion Content with Dynamic Grid Height */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-8 sm:px-12 pb-8 sm:pb-12 pt-2">
              {item.answer}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="w-full bg-[#780116] flex flex-col items-center px-4 sm:px-6 py-20 sm:py-28 select-none relative">
      <div className="w-full max-w-5xl flex flex-col items-center gap-10 sm:gap-12">
        
        <h2 className="text-[#e9e0f2] font-black text-5xl sm:text-6xl md:text-[5rem] tracking-tight leading-[0.95] text-center select-none">
          Questions? Answered
        </h2>
        
        <div className="flex flex-col gap-4 sm:gap-5 w-full items-center">
          {faqItems.map(renderFAQCard)}
        </div>

      </div>
    </section>
  );
} 