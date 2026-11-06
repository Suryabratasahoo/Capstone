'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FooterSection from '../../components/FooterSection';
import CityAutocomplete from '../../components/CityAutocomplete';

interface RecentSearch {
  id: string;
  from: string;
  to: string;
  date: string;
  modeLabel: string;
}

interface Scenario {
  id: number;
  tag: string;
  tagBg: string;
  title: string;
  problem: string;
  solution: string;
  arrivalText: string;
  totalTime: string;
  totalPrice: string;
  node1: {
    type: string;
    title: string;
    subtitle: string;
    badge: string;
  };
  leg1: {
    mode: string;
    type: 'rail' | 'bus';
    name: string;
    route: string;
    status: string;
    statusColor: string;
  };
  transfer: {
    title: string;
    location: string;
    duration: string;
    details: string;
    type: 'cab' | 'platform' | 'walk';
  };
  leg2: {
    mode: string;
    type: 'rail' | 'bus';
    name: string;
    route: string;
    status: string;
    statusColor: string;
  };
  node2: {
    type: string;
    title: string;
    subtitle: string;
    badge: string;
  };
}

// Clean SVG Icons for zero-emoji compliance
function TrainIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2c-4.42 0-8 .5-8 4v10.5c0 2.15 1.75 3.5 3.5 3.5L6 22v1h12v-1l-1.5-2c1.75 0 3.5-1.35 3.5-3.5V6c0-3.5-3.58-4-8-4zm0 3c2.76 0 5 .22 5 .5S14.76 6 12 6s-5-.22-5-.5.22-.5 5-.5zm5 9c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-8 0c0 .83-.67 1.5-1.5 1.5S6 14.83 6 14s.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm8-4H7V8h10v2z" />
    </svg>
  );
}

function BusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} xmlns="http://www.w3.org/2000/svg">
      <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm2-9h12v4H6V7zm1.5 8c-.83 0-1.5-.67-1.5-1.5S6.67 12 7.5 12s1.5.67 1.5 1.5S8.33 15 7.5 15zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
  );
}

function CabIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} xmlns="http://www.w3.org/2000/svg">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z" />
      <circle cx="7.5" cy="14.5" r="1.5" />
      <circle cx="16.5" cy="14.5" r="1.5" />
    </svg>
  );
}

function PinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
    </svg>
  );
}

function FlagIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} xmlns="http://www.w3.org/2000/svg">
      <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
    </svg>
  );
}

function ClockIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} xmlns="http://www.w3.org/2000/svg">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
    </svg>
  );
}

function ChatIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-current`} xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  // Search input states
  const [fromLocation, setFromLocation] = useState<string>('Vijayawada');
  const [toLocation, setToLocation] = useState<string>('Sambalpur');
  const [departureDate, setDepartureDate] = useState<string>('');

  // Mode Preference & Senior Citizen switches
  const [modePreference, setModePreference] = useState<'ALL' | 'RAIL_ONLY' | 'BUS_ONLY'>('ALL');
  const [seniorCitizenMode, setSeniorCitizenMode] = useState<boolean>(false);

  // Mobile menu & navbar scroll visibility
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Multimodal Scenarios
  const [activeScenario, setActiveScenario] = useState<number>(0);
  const [isPlayingTour, setIsPlayingTour] = useState<boolean>(true);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<string | null>('faq-1');

  // Quick Help Assistant query state
  const [helpQuery, setHelpQuery] = useState('');
  const [helpResponse, setHelpResponse] = useState<string | null>(null);

  // Set default departure date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    setDepartureDate(`${year}-${month}-${day}`);
  }, []);

  // Navbar hide/show on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsNavbarVisible(false);
        setIsMobileMenuOpen(false);
      } else if (currentScrollY < lastScrollY) {
        setIsNavbarVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Multimodal transit combinations demonstrating how OptiTransit gets you there
  const scenarios: Scenario[] = [
    {
      id: 0,
      tag: 'TRAIN + BUS BREAK-JOURNEY',
      tagBg: 'bg-emerald-600',
      title: 'Direct Train Sold Out? Switch to Express Bus at Hub',
      problem: 'Direct train is completely waitlisted (WL 48 / REGRET) or not running today.',
      solution: 'OptiTransit books a Superfast Train halfway to a transit division, includes a cab transfer, and connects you to an overnight sleeper bus.',
      arrivalText: 'Arrives Tomorrow Morning 06:15 AM',
      totalTime: '11h 45m',
      totalPrice: 'INR 1,040',
      node1: {
        type: 'ORIGIN',
        title: 'Vijayawada (BZA)',
        subtitle: 'Railway Station Platform 1',
        badge: 'Boarding: 07:45 PM',
      },
      leg1: {
        mode: 'SUPERFAST EXPRESS RAIL',
        type: 'rail',
        name: 'Godavari / Coromandel Express',
        route: 'Vijayawada to Visakhapatnam Jn',
        status: 'Confirmed Seat Available',
        statusColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
      },
      transfer: {
        title: 'SMART TRANSFER HUB',
        location: 'Visakhapatnam (VSKP)',
        duration: '1h 30m Protected Layover',
        details: 'Local taxi from Railway Station to APSRTC Bus Complex (12 mins)',
        type: 'cab',
      },
      leg2: {
        mode: 'MULTI-AXLE AC SLEEPER BUS',
        type: 'bus',
        name: 'OSRTC / Private Express Sleeper',
        route: 'VSKP Bus Complex to Sambalpur',
        status: 'Guaranteed Lower Berth',
        statusColor: 'text-[#d2e823] bg-yellow-950/80 border-yellow-800',
      },
      node2: {
        type: 'DESTINATION',
        title: 'Sambalpur',
        subtitle: 'Government Bus Stand',
        badge: 'Arrival: 06:15 AM (Next Day)',
      },
    },
    {
      id: 1,
      tag: '2-TRAIN JUNCTION TRANSFER',
      tagBg: 'bg-blue-600',
      title: 'No Direct Train? Use 2 Trains with Platform Interchange',
      problem: 'No direct train operates between your source and destination on this date.',
      solution: 'OptiTransit stitches together two fast trains via a major interchange junction with a calibrated 75-minute platform layover.',
      arrivalText: 'Arrives Same Night 10:30 PM',
      totalTime: '8h 50m',
      totalPrice: 'INR 790',
      node1: {
        type: 'ORIGIN',
        title: 'Guntur (GNT)',
        subtitle: 'Platform 2',
        badge: 'Departure: 08:15 AM',
      },
      leg1: {
        mode: 'INTERCITY EXPRESS (TRAIN 1)',
        type: 'rail',
        name: 'GNT-BZA Intercity (12747)',
        route: 'Guntur to Vijayawada Jn',
        status: 'Confirmed 2S / CC Seat',
        statusColor: 'text-blue-400 bg-blue-950/80 border-blue-800',
      },
      transfer: {
        title: 'RAIL INTERCHANGE JUNCTION',
        location: 'Vijayawada Jn (BZA)',
        duration: '1h 15m Platform Switch',
        details: 'Switch Platform 1 to Platform 6 (Safe connection buffer)',
        type: 'platform',
      },
      leg2: {
        mode: 'SUPERFAST EXPRESS (TRAIN 2)',
        type: 'rail',
        name: 'Prashanti Express (18464)',
        route: 'Vijayawada to Bhubaneswar',
        status: 'Confirmed 3A Berth',
        statusColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
      },
      node2: {
        type: 'DESTINATION',
        title: 'Bhubaneswar (BBS)',
        subtitle: 'Platform 3',
        badge: 'Arrival: 10:30 PM',
      },
    },
    {
      id: 2,
      tag: 'BUS + TRAIN FEEDER LINK',
      tagBg: 'bg-purple-600',
      title: 'No Rail Station Nearby? Regional Bus Takes You to Express Rail',
      problem: 'Your town has no direct railway line, requiring manual split bookings.',
      solution: 'OptiTransit calculates a synchronized regional feeder bus to the nearest rail division, connecting seamlessly with the Superfast Express.',
      arrivalText: 'Arrives Next Day 07:10 AM',
      totalTime: '10h 20m',
      totalPrice: 'INR 860',
      node1: {
        type: 'ORIGIN',
        title: 'Eluru Town Bus Stand',
        subtitle: 'Regional Bus Bay 4',
        badge: 'Boarding: 06:30 PM',
      },
      leg1: {
        mode: 'APSRTC EXPRESS BUS',
        type: 'bus',
        name: 'APSRTC Super Luxury',
        route: 'Eluru to Rajahmundry (RJY)',
        status: 'Seat 14 Window Confirmed',
        statusColor: 'text-purple-400 bg-purple-950/80 border-purple-800',
      },
      transfer: {
        title: 'STATION FEEDER LINK',
        location: 'Rajahmundry (RJY)',
        duration: '50m Connecting Window',
        details: 'Short walk from Old Bus Stand directly to Railway Platform 1',
        type: 'walk',
      },
      leg2: {
        mode: 'OVERNIGHT SUPERFAST TRAIN',
        type: 'rail',
        name: 'Visakha Express (17016)',
        route: 'Rajahmundry to Visakhapatnam',
        status: 'Confirmed Sleeper / 3A',
        statusColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-800',
      },
      node2: {
        type: 'DESTINATION',
        title: 'Visakhapatnam (VSKP)',
        subtitle: 'Central Station',
        badge: 'Arrival: 07:10 AM',
      },
    },
  ];

  // Auto-cycle through multimodal scenarios
  useEffect(() => {
    if (!isPlayingTour) return;
    const interval = setInterval(() => {
      setActiveScenario((prev) => (prev + 1) % scenarios.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlayingTour, scenarios.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocation.trim() || !toLocation.trim()) {
      alert('Please enter both source and destination cities.');
      return;
    }
    const requireBusParam = modePreference === 'BUS_ONLY' ? 'true' : 'false';
    router.push(
      `/planner?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}&date=${departureDate}&require_bus=${requireBusParam}&senior_citizen_mode=${seniorCitizenMode}`
    );
  };

  const swapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  const setTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setDepartureDate(`${year}-${month}-${day}`);
  };

  const setTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    setDepartureDate(`${year}-${month}-${day}`);
  };

  // Quick Preset Routes for 1-Click Exploration
  const quickRoutes = [
    { from: 'Vijayawada', to: 'Sambalpur', label: 'Vijayawada to Sambalpur (Rail + Bus)', mode: 'ALL' as const },
    { from: 'Hyderabad', to: 'Visakhapatnam', label: 'Hyderabad to Visakhapatnam (Express Rail)', mode: 'RAIL_ONLY' as const },
    { from: 'Guntur', to: 'Bhubaneswar', label: 'Guntur to Bhubaneswar (2-Train Transfer)', mode: 'RAIL_ONLY' as const },
    { from: 'Bangalore', to: 'Goa', label: 'Bangalore to Goa (Express Bus)', mode: 'BUS_ONLY' as const },
  ];

  const applyQuickRoute = (r: typeof quickRoutes[0]) => {
    setFromLocation(r.from);
    setToLocation(r.to);
    setModePreference(r.mode);
  };

  // Recent multimodal searches
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([
    {
      id: 'recent-1',
      from: 'Vijayawada',
      to: 'Sambalpur',
      date: 'Tomorrow',
      modeLabel: 'Rail + Bus Combo',
    },
    {
      id: 'recent-2',
      from: 'Guntur',
      to: 'Bhubaneswar',
      date: 'This Weekend',
      modeLabel: '2-Train Transfer',
    },
    {
      id: 'recent-3',
      from: 'Eluru',
      to: 'Visakhapatnam',
      date: 'Friday',
      modeLabel: 'Bus + Rail Feeder',
    },
  ]);

  const applyRecentSearch = (search: RecentSearch) => {
    setFromLocation(search.from);
    setToLocation(search.to);
    router.push(
      `/planner?from=${encodeURIComponent(search.from)}&to=${encodeURIComponent(search.to)}&date=${departureDate}`
    );
  };

  // FAQs focusing on multimodal transit and transfers
  const faqs = [
    {
      id: 'faq-1',
      question: 'What is the main purpose of OptiTransit?',
      answer:
        'OptiTransit is built to get you to your destination when direct trains are fully booked or do not exist. Instead of reporting "No tickets available", our engine stitches together split journeys: Train + Bus combos, 2-Train transfers across railway junctions, or regional buses connecting to high-speed trains to ensure you always have a viable path.',
    },
    {
      id: 'faq-2',
      question: 'What happens during a layover between a train and a bus?',
      answer:
        'OptiTransit calculates a mandatory safe buffer (typically 60 to 90 minutes) between connecting services. This accounts for local transit time (via auto or cab) between railway stations and bus terminals so you never miss a connection.',
    },
    {
      id: 'faq-3',
      question: 'Can I choose a 2-Train transfer instead of taking a bus?',
      answer:
        'Yes. On the Planner results page, you can use the Mode Filter chips (e.g. "Direct Only", "All Modes", or "Trains Only") to view 2-train routes that switch at major interchange junctions (such as Vijayawada, Secunderabad, or Visakhapatnam).',
    },
    {
      id: 'faq-4',
      question: 'How does Smart Quota Unlocking help during the journey?',
      answer:
        'When your train leg has a waitlist (RLWL), OptiTransit also evaluates upstream stations to unlock available General Quota (GNWL) seats. You still board at your selected station, but your seat is legally confirmed for a few extra rupees.',
    },
  ];

  const handleHelpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpQuery.trim()) return;

    const q = helpQuery.toLowerCase();
    if (q.includes('bus') && q.includes('train')) {
      setHelpResponse(
        'Train + Bus is our flagship combination. If direct trains are full, we book you on a train to a major junction, allow 1h 30m for a local cab to the bus terminal, and connect you to an express sleeper bus.'
      );
    } else if (q.includes('transfer') || q.includes('layover') || q.includes('miss') || q.includes('delay')) {
      setHelpResponse(
        'Every transfer has calibrated safe buffers (60–90 mins) covering station-to-bus terminal cab rides so delays do not cause missed connections.'
      );
    } else if (q.includes('2 train') || q.includes('two train')) {
      setHelpResponse(
        'Yes. We compute 2-Train transfers switching platforms at major hubs (e.g. BZA, VSKP, SC) so you reach your destination even without a direct train.'
      );
    } else {
      setHelpResponse(
        `For "${helpQuery}": OptiTransit computes multi-modal combinations (Train + Bus, 2-Train transfers) in <30 ms. Click "Search" above to view all Pareto route options.`
      );
    }
  };

  const curr = scenarios[activeScenario];

  return (
    <div className="w-full min-h-screen bg-[#f1fffa] font-sans antialiased text-zinc-900 pb-20 select-none">
      {/* 1. CUSTOM DASHBOARD NAVIGATION HEADER */}
      <header
        className="fixed top-6 left-1/2 w-[calc(100%-2rem)] max-w-7xl mx-auto z-50 px-2 sm:px-4 md:px-8 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
        style={{
          transform: isNavbarVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-140px)',
          opacity: isNavbarVisible ? 1 : 0,
        }}
      >
        <nav className="relative flex items-center justify-between rounded-full bg-white px-8 py-5 shadow-lg border border-zinc-100/30">
          {/* Left: Logo */}
          <div className="flex items-center gap-10">
            <Link href="/dashboard" className="flex items-center gap-2.5 group cursor-pointer">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#254f1a] text-white transition-transform group-hover:scale-105">
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
              <span className="font-extrabold text-2xl tracking-tight text-zinc-800">
                opti<span className="text-[#254f1a]">transit</span>
              </span>
            </Link>

            {/* Desktop Nav Links: Dashboard, Need Help?, Classic */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-zinc-900 bg-zinc-100/90 border border-zinc-200/50 px-4 py-2 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#254f1a]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.65 2.12a.98.98 0 00-1.3 0L3.7 9.07a1 1 0 00-.3.73v10.7a1.5 1.5 0 001.5 1.5h14.2a1.5 1.5 0 001.5-1.5v-10.7a1 1 0 00-.3-.73l-7.65-6.95z" />
                </svg>
                Dashboard
              </Link>
              <a
                href="#need-help"
                className="text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Need Help?</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </a>
              <Link
                href="/"
                className="text-[#254f1a] hover:bg-emerald-50 border border-emerald-200/60 px-4 py-2 rounded-xl text-sm font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Switch to the Classic Landing & Planner Interface"
              >
                <span>Classic</span>
                <span className="text-xs">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Right: User Profile */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2.5 bg-zinc-900 text-white rounded-full p-2.5 pl-4 border border-zinc-800 shadow-md">
              <span className="text-xs font-black select-none tracking-wide">Suryabrata</span>
              <div className="w-7 h-7 rounded-full bg-[#d9c8f0] text-zinc-900 flex items-center justify-center font-black text-xs">
                S
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-zinc-600 hover:text-zinc-950 focus:outline-none"
            aria-label="Toggle Menu"
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
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-zinc-900 font-extrabold py-2 border-b border-zinc-50 cursor-pointer flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#254f1a]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.65 2.12a.98.98 0 00-1.3 0L3.7 9.07a1 1 0 00-.3.73v10.7a1.5 1.5 0 001.5 1.5h14.2a1.5 1.5 0 001.5-1.5v-10.7a1 1 0 00-.3-.73l-7.65-6.95z" />
                </svg>
                Dashboard
              </Link>
              <a
                href="#need-help"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-zinc-600 hover:text-zinc-950 font-bold py-2 border-b border-zinc-50 cursor-pointer flex items-center justify-between"
              >
                <span>Need Help?</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </a>
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-[#254f1a] font-extrabold py-2 border-b border-zinc-50 cursor-pointer flex items-center justify-between"
              >
                <span>Classic</span>
                <span>&rarr;</span>
              </Link>
              <div className="flex items-center justify-between bg-zinc-900 text-white rounded-2xl px-4 py-3 mt-2">
                <span className="text-sm font-black">Suryabrata</span>
                <div className="w-7 h-7 rounded-full bg-[#d9c8f0] text-zinc-900 flex items-center justify-center font-black text-xs">
                  S
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* 2. DYNAMIC HERO BANNER */}
      <div className="relative w-full h-[540px] bg-zinc-900 flex flex-col justify-center items-center px-4 select-none mb-[360px] sm:mb-[300px] lg:mb-48">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-45"
            style={{ backgroundImage: "url('/bus_highway.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-zinc-900/95" />
        </div>

        {/* Header Content */}
        <div className="relative z-10 text-center max-w-4xl px-4 flex flex-col items-center gap-3 mb-10">
          <span className="text-[#d2e823] font-black uppercase tracking-[0.3em] text-xs mt-3">
            Multi-Modal Transit Optimizer
          </span>
          <h1 className="text-white font-black tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.05] select-none">
            Get to Your Destination Somehow.
          </h1>
          <p className="text-white/80 font-medium text-sm sm:text-base max-w-xl leading-relaxed">
            When direct trains are full or unavailable, OptiTransit combines Trains, Buses, and Transfers so you never get stranded.
          </p>
        </div>

        {/* 3. FLOATING TICKET SEARCH CARD */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20 w-full max-w-7xl px-6">
          <div className="w-full bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl p-6 sm:p-8 flex flex-col gap-5 border border-white/40 select-none">
            
            {/* Top Bar: Title & Preference Toggles */}
            <div className="w-full flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-100 pb-3 gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-zinc-900">
                  Search Multi-Modal Routes (Train + Bus + Transfer)
                </h2>
                <p className="text-xs text-zinc-500 font-semibold mt-0.5">
                  Pareto optimization across Indian Railways, state and private buses, and local connections
                </p>
              </div>

              {/* Mode Selection Control */}
              <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl self-start md:self-auto border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setModePreference('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    modePreference === 'ALL'
                      ? 'bg-[#254f1a] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  All Combinations
                </button>
                <button
                  type="button"
                  onClick={() => setModePreference('RAIL_ONLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    modePreference === 'RAIL_ONLY'
                      ? 'bg-[#254f1a] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  Rail Only
                </button>
                <button
                  type="button"
                  onClick={() => setModePreference('BUS_ONLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    modePreference === 'BUS_ONLY'
                      ? 'bg-[#254f1a] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  Bus Only
                </button>
              </div>
            </div>

            {/* Travel Form Fields Inputs */}
            <form onSubmit={handleSearch} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch relative">
              {/* FROM (Source) Input */}
              <div className="lg:col-span-3 bg-zinc-100/90 rounded-2xl px-5 py-3.5 border border-zinc-200/60 hover:border-zinc-300 transition-colors flex items-center gap-3 relative">
                <div className="text-[#254f1a] shrink-0">
                  <PinIcon className="w-6 h-6" />
                </div>
                <CityAutocomplete
                  value={fromLocation}
                  onChange={setFromLocation}
                  label="From City"
                  inputClassName="bg-transparent outline-none border-none text-zinc-900 font-black text-lg placeholder-zinc-400 w-full mt-0.5"
                  labelClassName="text-[10px] font-black text-zinc-400 uppercase tracking-widest"
                />
              </div>

              {/* Swap Button */}
              <div className="absolute left-1/2 lg:left-[25%] top-[80px] lg:top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <button
                  type="button"
                  onClick={swapLocations}
                  className="w-10 h-10 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-[#254f1a] hover:text-zinc-900 cursor-pointer"
                  title="Swap Locations"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 fill-none stroke-current stroke-[2.5]"
                    xmlns="http://www.w3.org/2000/svg"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 3L21 7L17 11" />
                    <path d="M21 7H9" />
                    <path d="M7 21L3 17L7 13" />
                    <path d="M3 17H15" />
                  </svg>
                </button>
              </div>

              {/* TO (Destination) Input */}
              <div className="lg:col-span-3 bg-zinc-100/90 rounded-2xl px-5 py-3.5 border border-zinc-200/60 hover:border-zinc-300 transition-colors flex items-center gap-3">
                <div className="text-[#254f1a] shrink-0">
                  <FlagIcon className="w-5 h-5" />
                </div>
                <CityAutocomplete
                  value={toLocation}
                  onChange={setToLocation}
                  label="To City"
                  inputClassName="bg-transparent outline-none border-none text-zinc-900 font-black text-lg placeholder-zinc-400 w-full mt-0.5"
                  labelClassName="text-[10px] font-black text-zinc-400 uppercase tracking-widest"
                />
              </div>

              {/* DATE Picker Input */}
              <div className="lg:col-span-2 bg-zinc-100/90 rounded-2xl px-4 py-3.5 border border-zinc-200/60 hover:border-zinc-300 transition-colors flex items-center gap-2.5">
                <div className="text-[#254f1a] shrink-0">
                  <ClockIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                    Travel Date
                  </span>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="bg-transparent text-sm font-black text-zinc-900 focus:outline-none border-none p-0 mt-0.5 cursor-pointer w-full"
                  />
                </div>
              </div>

              {/* QUICK Date Selectors */}
              <div className="lg:col-span-2 flex flex-row lg:flex-col gap-2 justify-center">
                <button
                  type="button"
                  onClick={setTodayDate}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 active:scale-95 transition-all py-2 rounded-xl text-center text-xs font-black text-zinc-700 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={setTomorrowDate}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 active:scale-95 transition-all py-2 rounded-xl text-center text-xs font-black text-zinc-700 cursor-pointer"
                >
                  Tomorrow
                </button>
              </div>

              {/* Big Search Button */}
              <div className="lg:col-span-2 flex items-stretch">
                <button
                  type="submit"
                  className="w-full bg-[#254f1a] hover:bg-[#1d3d14] text-white rounded-2xl py-4 lg:py-0 flex items-center justify-center gap-2 font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer"
                >
                  <span>Search</span>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 fill-none stroke-current stroke-[3]"
                    xmlns="http://www.w3.org/2000/svg"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12H19" />
                    <path d="M12 5L19 12L12 19" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Bottom Row: Senior Citizen Checkbox & Quick Preset Chips */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
              {/* Senior Citizen Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={seniorCitizenMode}
                  onChange={(e) => setSeniorCitizenMode(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 border-zinc-300"
                />
                <span className="text-xs font-black text-zinc-800">
                  Senior Citizen Mode
                </span>
                <span className="text-[10px] text-zinc-500 font-semibold hidden sm:inline">
                  (Prioritizes lower berths on rail and ground floor bus seats)
                </span>
              </label>

              {/* Quick Preset Route Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Quick Pairs:
                </span>
                {quickRoutes.map((qr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyQuickRoute(qr)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-900 border border-zinc-200 transition-colors"
                  >
                    {qr.from} &rarr; {qr.to}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 4. RECENT SEARCHES */}
      <div className="w-full max-w-7xl mx-auto px-6 pt-10 sm:pt-14 select-none">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-zinc-900 font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-3">
              <span className="w-2.5 h-7 rounded-full bg-[#254f1a] shrink-0"></span>
              Recent Searches
            </h2>
            <button
              onClick={() => setRecentSearches([])}
              className="text-zinc-400 hover:text-zinc-900 font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentSearches.map((search) => (
              <div
                key={search.id}
                onClick={() => applyRecentSearch(search)}
                className="bg-white rounded-2xl p-4 border border-zinc-200/70 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col gap-3 group"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                  <span className="text-zinc-700 font-black text-xs">
                    {search.modeLabel}
                  </span>
                  <span className="text-zinc-400 font-bold text-xs">{search.date}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-900 font-extrabold text-base group-hover:text-[#254f1a] transition-colors truncate">
                    {search.from}
                  </span>
                  <div className="flex-1 flex items-center justify-center px-1">
                    <div className="w-full h-[1.5px] bg-zinc-200 relative flex items-center justify-end">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#254f1a]" />
                    </div>
                  </div>
                  <span className="text-zinc-900 font-extrabold text-base group-hover:text-[#254f1a] transition-colors truncate text-right">
                    {search.to}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. MULTIMODAL ROUTING IN ACTION (CONNECTED SVG TRACK ANIMATION) */}
      <section id="how-it-works" className="w-full max-w-7xl mx-auto px-6 mt-20 select-none scroll-mt-28">
        <div className="w-full bg-white rounded-[2.5rem] p-6 sm:p-10 md:p-12 border border-zinc-200/80 shadow-xl relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-[#254f1a] text-xs font-black uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-[#254f1a] animate-pulse"></span>
                The Core Multi-Modal Engine
              </div>
              <h2 className="text-zinc-900 font-black text-3xl sm:text-4xl tracking-tight">
                No Direct Route? OptiTransit Gets You There.
              </h2>
              <p className="text-zinc-600 font-medium text-sm sm:text-base mt-1 max-w-2xl">
                When direct trains are fully booked or do not exist, our algorithm stitches together Train + Bus combos, 2-Train transfers, and protected connections.
              </p>
            </div>

            {/* Play/Pause Animation Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsPlayingTour(!isPlayingTour)}
                className="px-4 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>{isPlayingTour ? 'Pause Auto-Tour' : 'Play Auto-Tour'}</span>
              </button>
            </div>
          </div>

          {/* Scenario Tab Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {scenarios.map((sc, idx) => {
              const isSelected = activeScenario === idx;
              return (
                <button
                  key={sc.id}
                  onClick={() => {
                    setActiveScenario(idx);
                    setIsPlayingTour(false);
                  }}
                  className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#254f1a] text-white border-[#254f1a] shadow-md scale-[1.01]'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/20 text-[#d2e823]' : 'bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      Scenario 0{idx + 1}
                    </span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-[#d2e823] animate-pulse"></span>}
                  </div>
                  <div className="font-extrabold text-sm">{sc.tag}</div>
                </button>
              );
            })}
          </div>

          {/* Connected SVG Multi-Modal Route Track Card */}
          <div className="w-full bg-zinc-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-inner mb-8">
            {/* Ambient Background Grid */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Scenario Status Bar */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-800">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-white ${curr.tagBg}`}>
                    {curr.tag}
                  </span>
                  <span className="text-sm font-black text-white">{curr.title}</span>
                </div>
                <div className="text-xs text-rose-300 font-semibold flex items-center gap-2 mt-0.5">
                  <span className="px-1.5 py-0.2 rounded bg-rose-950/80 border border-rose-800 text-[10px] uppercase font-mono">
                    Direct Booking Problem
                  </span>
                  <span>{curr.problem}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="text-right">
                  <span className="text-zinc-400 block text-[10px] uppercase">Journey Time</span>
                  <span className="text-[#d2e823] font-black text-sm">{curr.totalTime}</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 block text-[10px] uppercase">Combined Fare</span>
                  <span className="text-emerald-400 font-black text-sm">{curr.totalPrice}</span>
                </div>
              </div>
            </div>

            {/* Connected Route Diagram */}
            <div className="relative z-10 py-2">
              
              {/* Connected Visual Pipeline */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                
                {/* Node 1: Origin */}
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-md flex flex-col justify-between relative">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">{curr.node1.type}</span>
                      <PinIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="font-black text-lg text-white leading-tight">{curr.node1.title}</div>
                    <div className="text-xs text-zinc-400 mt-1">{curr.node1.subtitle}</div>
                  </div>
                  <div className="mt-4 pt-2 border-t border-zinc-800 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{curr.node1.badge}</span>
                  </div>
                </div>

                {/* Leg 1 */}
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-emerald-500/70 shadow-lg flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">LEG 1</span>
                      {curr.leg1.type === 'rail' ? (
                        <TrainIcon className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <BusIcon className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <div className="font-black text-base text-white">{curr.leg1.name}</div>
                    <div className="text-xs text-zinc-300 font-medium mt-1">{curr.leg1.route}</div>
                  </div>
                  <div className={`mt-3 p-1.5 rounded-lg border text-[11px] font-bold text-center ${curr.leg1.statusColor}`}>
                    {curr.leg1.status}
                  </div>
                </div>

                {/* Transfer Hub */}
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-blue-500/70 shadow-lg flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">{curr.transfer.title}</span>
                      {curr.transfer.type === 'cab' ? (
                        <CabIcon className="w-5 h-5 text-blue-400" />
                      ) : curr.transfer.type === 'platform' ? (
                        <TrainIcon className="w-5 h-5 text-blue-400" />
                      ) : (
                        <PinIcon className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    <div className="font-black text-base text-white">{curr.transfer.location}</div>
                    <div className="text-xs text-blue-200/90 mt-1">{curr.transfer.details}</div>
                  </div>
                  <div className="mt-3 p-1.5 rounded-lg bg-blue-950/80 border border-blue-800 text-[11px] font-bold text-blue-300 text-center flex items-center justify-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>{curr.transfer.duration}</span>
                  </div>
                </div>

                {/* Leg 2 & Destination */}
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-yellow-500/70 shadow-lg flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-[#d2e823] uppercase tracking-wider">LEG 2 (FINAL)</span>
                      {curr.leg2.type === 'rail' ? (
                        <TrainIcon className="w-5 h-5 text-[#d2e823]" />
                      ) : (
                        <BusIcon className="w-5 h-5 text-[#d2e823]" />
                      )}
                    </div>
                    <div className="font-black text-base text-white">{curr.leg2.name}</div>
                    <div className="text-xs text-zinc-300 font-medium mt-1">{curr.leg2.route}</div>
                  </div>
                  <div className={`mt-3 p-1.5 rounded-lg border text-[11px] font-bold text-center ${curr.leg2.statusColor}`}>
                    {curr.leg2.status}
                  </div>
                </div>

              </div>

              {/* Animated Continuous Transit Line Overlay */}
              <div className="relative mt-6 px-2">
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-[#d2e823] transition-all duration-700 ease-out"
                    style={{ width: `${((activeScenario + 1) / 3) * 100}%` }}
                  />
                </div>
              </div>

              {/* Solved Banner */}
              <div className="mt-6 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 font-mono text-[10px] uppercase font-bold">
                    OptiTransit Solved
                  </span>
                  <span className="text-emerald-100 font-medium">{curr.solution}</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500 text-zinc-950 font-black text-xs shrink-0">
                  {curr.arrivalText}
                </span>
              </div>
            </div>
          </div>

          {/* 3 Core Multi-Modal Tenets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#254f1a] flex items-center justify-center text-xs font-black mb-3">
                  RAIL + BUS
                </div>
                <h3 className="font-black text-base text-zinc-900 mb-1">Cross-Modal Synthesis</h3>
                <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                  Stitches trains and state/private buses into a single verified journey so you reach your town even if direct trains are booked for weeks.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center text-xs font-black mb-3">
                  BUFFER
                </div>
                <h3 className="font-black text-base text-zinc-900 mb-1">Protected Layover Buffers</h3>
                <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                  Every connection accounts for station-to-bus stand cab travel times with calibrated 60–90 minute windows so minor delays never strand you.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-900 flex items-center justify-center text-xs font-black mb-3">
                  &lt;30 ms
                </div>
                <h3 className="font-black text-base text-zinc-900 mb-1">Pareto-Optimal in &lt;30 ms</h3>
                <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                  Our RAM-based McRAPTOR algorithm simultaneously balances speed, cost, and number of transfers to present the best 1-transfer routes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. NEED HELP SECTION */}
      <section id="need-help" className="w-full max-w-7xl mx-auto px-6 mt-20 select-none scroll-mt-28">
        <div className="w-full bg-white rounded-[2.5rem] p-6 sm:p-10 md:p-12 border border-zinc-200/80 shadow-xl">
          {/* Header */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-[#254f1a] text-xs font-black uppercase tracking-wider mb-2">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
              </svg>
              Passenger Support
            </div>
            <h2 className="text-zinc-900 font-black text-3xl sm:text-4xl tracking-tight">
              Need Help With Your Route?
            </h2>
            <p className="text-zinc-600 font-medium text-sm sm:text-base mt-1 max-w-2xl">
              Instant answers about multi-modal combinations, bus-to-train transfers, safe buffers, and switching between views.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Interactive FAQ Accordion */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {faqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="border border-zinc-200/80 rounded-2xl overflow-hidden transition-all bg-zinc-50/50 hover:bg-zinc-50"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                      className="w-full p-5 text-left font-extrabold text-base text-zinc-900 flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center bg-white border border-zinc-200 text-zinc-600 shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 bg-[#254f1a] text-white border-transparent' : ''
                        }`}
                      >
                        v
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm font-medium text-zinc-600 leading-relaxed border-t border-zinc-100 pt-3 bg-white">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right: Quick Assistance Box */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="bg-[#254f1a] text-white rounded-3xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-[#d2e823]">
                      Route Copilot
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  </div>
                  <h3 className="text-xl font-black mb-1">Ask Any Transit Question</h3>
                  <p className="text-xs text-white/80 mb-4 leading-relaxed">
                    Doubts about bus-to-train transfers, layovers, or 2-train junctions? Type below:
                  </p>

                  <form onSubmit={handleHelpSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={helpQuery}
                      onChange={(e) => setHelpQuery(e.target.value)}
                      placeholder="e.g. Can I take a train and a bus?"
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/50 focus:outline-none focus:bg-white/20 font-medium"
                    />
                    <button
                      type="submit"
                      className="bg-[#d2e823] text-zinc-900 font-black px-4 py-2.5 rounded-xl text-xs hover:bg-yellow-300 transition-colors shrink-0 cursor-pointer"
                    >
                      Ask
                    </button>
                  </form>

                  {helpResponse && (
                    <div className="mt-4 p-3.5 rounded-xl bg-white/10 border border-white/20 text-xs font-medium leading-relaxed text-emerald-100 animate-in fade-in duration-300">
                      {helpResponse}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70">
                  <span>Instant Multi-Modal Route Discovery</span>
                  <Link href="/planner" className="text-[#d2e823] font-bold hover:underline">
                    Open Full Planner &rarr;
                  </Link>
                </div>
              </div>

              {/* 24/7 Helpline Card */}
              <div className="bg-zinc-100/80 border border-zinc-200/80 rounded-3xl p-6 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                    Emergency Transit Assist
                  </span>
                  <div className="text-base font-black text-zinc-900">24/7 Journey Support</div>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    Missed transfers, platform switches, or rerouting support
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0 shadow-2xs">
                  <ChatIcon className="w-5 h-5 text-zinc-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <FooterSection />
    </div>
  );
}
