"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Scrolling down and past threshold (e.g. 100px) -> hide navbar
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
        setIsMobileMenuOpen(false); // Close mobile menu if open
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up -> show navbar
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header 
      className="fixed top-6 left-1/2 w-[calc(100%-2rem)] max-w-7xl mx-auto z-50 px-2 sm:px-4 md:px-8 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        transform: isVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-140px)",
        opacity: isVisible ? 1 : 0
      }}
    >
      {/* Navbar Container Pill */}
      <nav className="relative flex items-center justify-between rounded-full bg-white px-8 py-5 shadow-lg border border-zinc-100/30">
        {/* Left: Logo */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Custom SVG Transit Connection Logo Mark */}
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-brand-forest text-brand-lime transition-transform group-hover:scale-105">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5.5 h-5.5"
              >
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="6" r="3" />
                <path d="M9 15L15 9" />
                <path d="M12 9h3v3" />
              </svg>
            </div>
            <span className="font-extrabold text-2xl md:text-3xl tracking-tight text-brand-charcoal">
              connex<span className="text-brand-forest">link</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-zinc-600 hover:text-brand-charcoal hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-base font-bold transition-all"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-zinc-600 hover:text-brand-charcoal hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-base font-bold transition-all"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="text-zinc-600 hover:text-brand-charcoal hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-base font-bold transition-all"
            >
              Pricing
            </Link>
            <Link
              href="#support"
              className="text-zinc-600 hover:text-brand-charcoal hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-base font-bold transition-all"
            >
              Support
            </Link>
          </div>
        </div>

        {/* Right: Auth Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="rounded-full bg-zinc-100 hover:bg-zinc-200 text-brand-charcoal px-6 py-3.5 font-extrabold text-base transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-brand-charcoal hover:bg-black text-white px-6 py-3.5 font-extrabold text-base transition-all shadow-md hover:shadow-lg"
          >
            Sign up free
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-zinc-600 hover:text-brand-charcoal focus:outline-none"
          aria-label="Toggle Menu"
          id="mobile-menu-btn"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
            stroke="currentColor"
            className="w-6 h-6"
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-white rounded-3xl p-6 shadow-xl border border-zinc-100 flex flex-col gap-4 z-50 md:hidden animate-in fade-in slide-in-from-top-4 duration-200">
            <Link
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-zinc-600 hover:text-brand-charcoal font-semibold py-2 border-b border-zinc-50"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-zinc-600 hover:text-brand-charcoal font-semibold py-2 border-b border-zinc-50"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-zinc-600 hover:text-brand-charcoal font-semibold py-2 border-b border-zinc-50"
            >
              Pricing
            </Link>
            <Link
              href="#support"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-zinc-600 hover:text-brand-charcoal font-semibold py-2 border-b border-zinc-50"
            >
              Support
            </Link>
            <div className="flex flex-col gap-2 pt-4">
              <Link
                href="/login"
                className="w-full text-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-brand-charcoal py-3 font-bold text-sm transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="w-full text-center rounded-full bg-brand-charcoal hover:bg-black text-white py-3 font-bold text-sm transition-all"
              >
                Sign up free
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
