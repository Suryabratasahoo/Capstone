"use client";

import { useState } from "react";

export default function FooterSection() {
  const [claimValue, setClaimValue] = useState("");

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Claiming ConnexLink handle: ${claimValue}`);
  };

  const footerLinks = [
    {
      title: "Company",
      links: [
        { label: "The ConnexLink Blog", href: "#" },
        { label: "Engineering Blog", href: "#" },
        { label: "Marketplace", href: "#" },
        { label: "What's New", href: "#" },
        { label: "About", href: "#" },
        { label: "Press", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Link in Bio", href: "#" },
        { label: "Social Good", href: "#" },
        { label: "Contact", href: "#" }
      ]
    },
    {
      title: "Community",
      links: [
        { label: "ConnexLink for Enterprise", href: "#" },
        { label: "2026 Creator Report", href: "#" },
        { label: "2025 Creator Report", href: "#" },
        { label: "Charities", href: "#" },
        { label: "Creator Profile Directory", href: "#" },
        { label: "Explore Templates", href: "#" }
      ]
    },
    {
      title: "Support",
      links: [
        { label: "Help Topics", href: "#" },
        { label: "Getting Started", href: "#" },
        { label: "ConnexLink Pro", href: "#" },
        { label: "Features & How-Tos", href: "#" },
        { label: "FAQs", href: "#" },
        { label: "Report a Violation", href: "#" }
      ]
    },
    {
      title: "Trust & Legal",
      links: [
        { label: "Terms & Conditions", href: "#" },
        { label: "Privacy Notice", href: "#" },
        { label: "Cookie Notice", href: "#" },
        { label: "Trust Center", href: "#" },
        { label: "Cookies Preferences", href: "#" },
        { label: "Transparency Report", href: "#" },
        { label: "Law Enforcement Access Policy", href: "#" },
        { label: "Human Rights", href: "#" }
      ]
    }
  ];

  return (
    <footer className="w-full bg-[#502274] flex flex-col items-center select-none relative overflow-hidden shrink-0 pt-28 pb-10">
      
      {/* BACKGROUND GRAPHICS (Silhouettes from the screenshots) */}
      
      {/* Left: Profile Silhouette (Teal) */}
      <svg
        viewBox="0 0 300 450"
        className="absolute bottom-[280px] sm:bottom-[320px] left-0 h-[380px] sm:h-[480px] md:h-[550px] w-auto text-[#5cbcd3] fill-current pointer-events-none select-none z-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0,450 L0,150 C15,145 25,138 28,125 C30,112 28,95 32,80 C36,65 45,45 65,30 C85,15 120,10 145,25 C170,40 180,65 175,95 C170,125 155,138 150,150 C145,162 155,182 160,195 C165,208 175,220 170,245 C165,270 135,320 115,360 C95,400 85,450 85,450 Z" />
      </svg>

      {/* Right: Floral Leaves Silhouette (Lavender) */}
      <svg
        viewBox="0 0 300 450"
        className="absolute bottom-[280px] sm:bottom-[320px] right-0 h-[380px] sm:h-[480px] md:h-[550px] w-auto text-[#dec8eb] fill-current pointer-events-none select-none z-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M300,450 C260,420 230,370 230,310 C230,240 270,190 300,150 Z" fillOpacity="0.85"/>
        <path d="M300,320 C210,270 170,200 170,120 C170,40 230,0 300,-40 Z" fillOpacity="0.85"/>
        <path d="M300,180 C200,140 150,60 150,-20 C150,-100 220,-140 300,-180 Z" fillOpacity="0.85"/>
      </svg>

      {/* TOP SEGMENT: Title + Claim handle form */}
      <div className="w-full max-w-[95%] xl:max-w-[92%] flex flex-col items-center text-center gap-10 z-10 relative mb-28">
        
        <h2 className="text-[#dec8eb] font-black text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] tracking-tight leading-[0.95] max-w-4xl select-none">
          Jumpstart your corner of the internet today
        </h2>

        <form onSubmit={handleClaim} className="flex flex-col sm:flex-row gap-4 items-center w-full max-w-2xl px-4 mt-6">
          {/* Prefilled input field */}
          <div className="flex items-center bg-white rounded-2xl py-5 px-6 w-full shadow-lg">
            <span className="text-zinc-500 font-bold text-lg select-none pr-0.5">connexlink.com/</span>
            <input
              type="text"
              placeholder="yourname"
              value={claimValue}
              onChange={(e) => setClaimValue(e.target.value.replace(/\s+/g, "").toLowerCase())}
              className="bg-transparent text-zinc-900 placeholder-zinc-300 font-bold text-lg focus:outline-none w-full"
            />
          </div>
          {/* Action button */}
          <button
            type="submit"
            className="bg-[#d2e823] text-zinc-900 hover:scale-[1.02] active:scale-[0.98] transition-transform rounded-full px-8 py-5.5 font-black text-lg w-full sm:w-auto whitespace-nowrap shadow-lg cursor-pointer select-none"
          >
            Claim your ConnexLink
          </button>
        </form>

      </div>

      {/* BOTTOM SEGMENT: Floating White Card */}
      <div className="w-[95%] xl:w-[92%] max-w-[1440px] bg-white text-zinc-800 rounded-[3rem] p-10 sm:p-16 shadow-2xl flex flex-col gap-16 z-10 relative">
        
        {/* Top: 4 Columns of Links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          {footerLinks.map((column) => (
            <div key={column.title} className="flex flex-col gap-5.5">
              <h4 className="text-zinc-900 font-black text-xl tracking-tight leading-none uppercase">
                {column.title}
              </h4>
              <ul className="flex flex-col gap-4">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-zinc-600 hover:text-zinc-900 font-semibold text-sm sm:text-base leading-none transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar: Action buttons on left, App downloads & Socials on right */}
        <div className="flex flex-col xl:flex-row justify-between items-center gap-10 border-t border-zinc-100 pt-12">
          
          {/* Left: Login & Start Free buttons */}
          <div className="flex flex-row gap-4 items-center w-full xl:w-auto justify-center xl:justify-start">
            <button className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 py-4 px-8 font-black text-base rounded-full transition-colors cursor-pointer select-none">
              Log in
            </button>
            <button className="bg-[#d2e823] text-zinc-900 hover:scale-[1.02] active:scale-[0.98] py-4 px-8 font-black text-base rounded-full transition-transform cursor-pointer select-none">
              Get started for free
            </button>
          </div>

          {/* Right: App store links and social circle icons */}
          <div className="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto justify-center xl:justify-end">
            
            {/* App download badges */}
            <div className="flex flex-row gap-3 items-center">
              {/* App Store badge */}
              <a href="#" className="hover:scale-[1.02] active:scale-[0.98] transition-transform">
                <svg viewBox="0 0 135 40" className="w-[125px] h-[38px] shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <rect width="135" height="40" rx="8" fill="#18181b"/>
                  <path d="M18.5,12 C17,12 15.5,13 14.5,13 C13.5,13 12.5,12 11.5,12 C9.5,12 7.5,13.5 6.5,15.5 C4.5,19.5 6,25.5 8,28.5 C9,30 10,31.5 11.5,31.5 C13,31.5 13.5,30.5 15,30.5 C16.5,30.5 17,31.5 18.5,31.5 C20,31.5 21,30 22,28.5 C23,27 23.5,25.5 23.5,25.5 C23.5,25.5 21.5,24.5 21.5,22 C21.5,19.5 23.5,18.5 23.5,18.5 C23.5,18.5 22,17 21,16 C20,15 19,12 18.5,12 Z M17.5,11 C18.5,9.5 18.5,8 18,6.5 C16.5,6.5 15,7.5 14,9 C13,10.5 13,12 13.5,13.5 C15,13.5 16.5,12.5 17.5,11 Z" fill="#fff"/>
                  <text x="32" y="15" fill="#fff" fontFamily="sans-serif" fontSize="6.5" fontWeight="bold">Download on the</text>
                  <text x="32" y="27" fill="#fff" fontFamily="sans-serif" fontSize="11" fontWeight="bold">App Store</text>
                </svg>
              </a>
              {/* Google Play badge */}
              <a href="#" className="hover:scale-[1.02] active:scale-[0.98] transition-transform">
                <svg viewBox="0 0 135 40" className="w-[125px] h-[38px] shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <rect width="135" height="40" rx="8" fill="#18181b"/>
                  <path d="M12,12 L22,18 L12,24 Z" fill="#34A853"/>
                  <path d="M12,12 L22,18 L12,18 Z" fill="#4285F4"/>
                  <path d="M12,18 L22,18 L12,24 Z" fill="#EA4335"/>
                  <path d="M12,12 L17,18 L12,24 Z" fill="#FBBC05"/>
                  <text x="32" y="15" fill="#fff" fontFamily="sans-serif" fontSize="6" fontWeight="bold">GET IT ON</text>
                  <text x="32" y="27" fill="#fff" fontFamily="sans-serif" fontSize="11" fontWeight="bold">Google Play</text>
                </svg>
              </a>
            </div>

            {/* Social Circle Icons */}
            <div className="flex flex-row gap-2.5 items-center">
              {/* Star / Linktree Icon */}
              <a href="#" className="w-10 h-10 rounded-full bg-[#18181b] hover:bg-zinc-800 text-white flex items-center justify-center transition-colors cursor-pointer">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12,2 L12,22 M2,12 L22,12 M5,5 L19,19 M5,19 L19,5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </a>
              {/* Threads */}
              <a href="#" className="w-10 h-10 rounded-full bg-[#18181b] hover:bg-zinc-800 text-white flex items-center justify-center transition-colors cursor-pointer">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-4c0 1.38-1.12 2.5-2.5 2.5S9.5 13.88 9.5 12.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5z" />
                </svg>
              </a>
              {/* TikTok */}
              <a href="#" className="w-10 h-10 rounded-full bg-[#18181b] hover:bg-zinc-800 text-white flex items-center justify-center transition-colors cursor-pointer">
                <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12.93 2.59 1.32 4.02 1.37v3.42c-1.88-.04-3.72-.74-5.07-2.07-.01 2.76.01 5.51 0 8.27-.08 2.05-.8 4.14-2.4 5.37-1.92 1.63-4.79 1.94-7.01 1.01-2.91-1.04-4.83-4.27-4.22-7.39.42-2.73 2.74-5 5.51-5.15V9.08c-2.01.12-3.87 1.25-4.71 3.08-1.1 2.14-.72 5.01 1.15 6.69 1.83 1.71 4.79 1.77 6.63.15 1.16-1 1.72-2.53 1.68-4.08.01-4.96-.01-9.92.01-14.88z"/>
                </svg>
              </a>
              {/* Instagram */}
              <a href="#" className="w-10 h-10 rounded-full bg-[#18181b] hover:bg-zinc-800 text-white flex items-center justify-center transition-colors cursor-pointer">
                <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              {/* Discord */}
              <a href="#" className="w-10 h-10 rounded-full bg-[#18181b] hover:bg-zinc-800 text-white flex items-center justify-center transition-colors cursor-pointer">
                <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 1-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
                </svg>
              </a>
            </div>

          </div>

        </div>

      </div>

    </footer>
  );
}
