'use client';

import React, { useState, useEffect } from 'react';
import FooterSection from '../../components/FooterSection';

type TabType = 'buses' | 'flights' | 'trains' | 'hotels';

interface RecentSearch {
  id: string;
  from: string;
  to: string;
  date: string;
  type: TabType;
}

function useIntersectionObserver(ref: React.RefObject<Element | null>) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        observer.unobserve(el);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return isIntersecting;
}

const AnimatedCounter = ({ target, suffix = '', decimals = 0, trigger = false }: { target: number; suffix?: string; decimals?: number; trigger: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let startTimestamp: number | null = null;
    const duration = 2000; // 2 seconds

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(progress * target);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [target, trigger]);

  return (
    <span>
      {decimals > 0 ? count.toFixed(decimals) : Math.floor(count).toLocaleString()}
      {suffix}
    </span>
  );
};

export default function DashboardPage() {
  // State variables for inputs and active tab
  const [activeTab, setActiveTab] = useState<TabType>('buses');
  const [fromLocation, setFromLocation] = useState<string>('Vijayawada');
  const [toLocation, setToLocation] = useState<string>('Bhubaneswar');
  
  // Set default departure date to tomorrow (YYYY-MM-DD format)
  const [departureDate, setDepartureDate] = useState<string>('');

  // Grid expansion states for popular routes
  const [showAllBuses, setShowAllBuses] = useState(false);
  const [showAllTrains, setShowAllTrains] = useState(false);
  const [showAllFlights, setShowAllFlights] = useState(false);

  // Stats ref and viewport trigger hook
  const statsRef = React.useRef<HTMLDivElement>(null);
  const statsTrigger = useIntersectionObserver(statsRef);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDepartureDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Scrolling down and past threshold (e.g. 100px) -> hide navbar
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsNavbarVisible(false);
        setIsMobileMenuOpen(false); // Close mobile menu if open
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up -> show navbar
        setIsNavbarVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Preset background images matching each travel tab
  const bgImages: Record<TabType, string> = {
    buses: '/bus_highway.jpg',
    flights: '/flight_view.jpg',
    trains: '/train_journey.jpg',
    hotels: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop',
  };

  // Prefilled recent searches list
  const recentSearches: RecentSearch[] = [
    {
      id: 'recent-1',
      from: 'Vijayawada',
      to: 'Bhubaneswar',
      date: '03 Aug 2026',
      type: 'buses',
    },
    {
      id: 'recent-2',
      from: 'Mumbai (BOM)',
      to: 'Delhi (DEL)',
      date: '04 Aug 2026',
      type: 'flights',
    },
    {
      id: 'recent-3',
      from: 'Tokyo (NRT)',
      to: 'Kyoto (KYO)',
      date: '08 Aug 2026',
      type: 'trains',
    }
  ];

  // Swapping source & destination
  const swapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  // Carousel ref and scroll handler
  const carouselRef = React.useRef<HTMLDivElement>(null);
  
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 340; // width of card + gap
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  interface TravelOperator {
    id: string;
    name: string;
    image: string;
    rating: string;
    amenities: string[];
  }

  const travelOperators: TravelOperator[] = [
    {
      id: 'op-1',
      name: 'IntrCity SmartBus',
      image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=600&auto=format&fit=crop',
      rating: '4.8',
      amenities: ['AC', 'Wifi', 'Sleeper'],
    },
    {
      id: 'op-2',
      name: 'NueGo',
      image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=600&auto=format&fit=crop',
      rating: '4.7',
      amenities: ['Electric', 'USB', 'AC'],
    },
    {
      id: 'op-3',
      name: 'Zingbus',
      image: 'https://images.unsplash.com/photo-1626847037657-fd3622613ce3?q=80&w=600&auto=format&fit=crop',
      rating: '4.9',
      amenities: ['Snacks', 'Wifi', 'AC'],
    },
    {
      id: 'op-4',
      name: 'Laxmi Holidays',
      image: 'https://images.unsplash.com/photo-1562620644-85650123f86e?q=80&w=600&auto=format&fit=crop',
      rating: '4.6',
      amenities: ['CCTV', 'AC', 'Sleeper'],
    },
    {
      id: 'op-5',
      name: 'VRL Travels',
      image: 'https://images.unsplash.com/photo-1557223562-6c77ef16210f?q=80&w=600&auto=format&fit=crop',
      rating: '4.8',
      amenities: ['Pillows', 'Water', 'AC'],
    },
    {
      id: 'op-6',
      name: 'SRS Travels',
      image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=600&auto=format&fit=crop',
      rating: '4.5',
      amenities: ['Blankets', 'AC', 'Sleeper'],
    }
  ];

  interface TravelRoute {
    id: string;
    name: string;
    image: string;
    count: string;
  }

  const busRoutes: TravelRoute[] = [
    {
      id: 'br-1',
      name: 'Hyderabad to Bangalore',
      image: 'https://images.unsplash.com/photo-1595855759920-86582396756a?q=80&w=500&auto=format&fit=crop',
      count: '277 Buses',
    },
    {
      id: 'br-2',
      name: 'Bangalore to Chennai',
      image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=500&auto=format&fit=crop',
      count: '207 Buses',
    },
    {
      id: 'br-3',
      name: 'Hyderabad to Chennai',
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=500&auto=format&fit=crop',
      count: '41 Buses',
    },
    {
      id: 'br-4',
      name: 'Hyderabad to Vijayawada',
      image: 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?q=80&w=500&auto=format&fit=crop',
      count: '489 Buses',
    },
    {
      id: 'br-5',
      name: 'Hyderabad to Mumbai',
      image: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?q=80&w=500&auto=format&fit=crop',
      count: '69 Buses',
    },
    {
      id: 'br-6',
      name: 'Bangalore to Hyderabad',
      image: 'https://images.unsplash.com/photo-1572445271230-a78b5944a659?q=80&w=500&auto=format&fit=crop',
      count: '280 Buses',
    },
    {
      id: 'br-7',
      name: 'Bangalore to Mumbai',
      image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=500&auto=format&fit=crop',
      count: '63 Buses',
    },
    {
      id: 'br-8',
      name: 'Bangalore to Goa',
      image: 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?q=80&w=500&auto=format&fit=crop',
      count: '29 Buses',
    },
    {
      id: 'br-9',
      name: 'Bangalore to Pune',
      image: 'https://images.unsplash.com/photo-1601999109332-542b18dbec57?q=80&w=500&auto=format&fit=crop',
      count: '82 Buses',
    },
    {
      id: 'br-10',
      name: 'Chennai to Bangalore',
      image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=500&auto=format&fit=crop',
      count: '203 Buses',
    },
    {
      id: 'br-11',
      name: 'Chandigarh to Delhi',
      image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=500&auto=format&fit=crop',
      count: '220 Buses',
    },
    {
      id: 'br-12',
      name: 'Chandigarh to Manali',
      image: 'https://images.unsplash.com/photo-1598091857921-62d770c1e878?q=80&w=500&auto=format&fit=crop',
      count: '97 Buses',
    },
    {
      id: 'br-13',
      name: 'Indore to Bhopal',
      image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?q=80&w=500&auto=format&fit=crop',
      count: '191 Buses',
    },
    {
      id: 'br-14',
      name: 'Lucknow to Delhi',
      image: 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=500&auto=format&fit=crop',
      count: '447 Buses',
    },
    {
      id: 'br-15',
      name: 'Nagpur to Pune',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=500&auto=format&fit=crop',
      count: '75 Buses',
    },
    {
      id: 'br-16',
      name: 'Delhi to Nainital',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=500&auto=format&fit=crop',
      count: '75 Buses',
    },
    {
      id: 'br-17',
      name: 'Hyderabad to Goa',
      image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=500&auto=format&fit=crop',
      count: '18 Buses',
    },
    {
      id: 'br-18',
      name: 'Bangalore to Pondicherry',
      image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=500&auto=format&fit=crop',
      count: '46 Buses',
    },
    {
      id: 'br-19',
      name: 'Chennai to Pondicherry',
      image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=500&auto=format&fit=crop',
      count: '104 Buses',
    },
    {
      id: 'br-20',
      name: 'Coimbatore to Bangalore',
      image: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?q=80&w=500&auto=format&fit=crop',
      count: '227 Buses',
    }
  ];

  const trainRoutes: TravelRoute[] = [
    {
      id: 'tr-1',
      name: 'Mumbai to Goa',
      image: 'https://images.unsplash.com/photo-1512100356356-de1b84283e18?q=80&w=500&auto=format&fit=crop',
      count: '8 Trains',
    },
    {
      id: 'tr-2',
      name: 'Delhi to Mumbai',
      image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=500&auto=format&fit=crop',
      count: '12 Trains',
    },
    {
      id: 'tr-3',
      name: 'Bangalore to Mysore',
      image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=500&auto=format&fit=crop',
      count: '18 Trains',
    },
    {
      id: 'tr-4',
      name: 'Kalka to Shimla',
      image: 'https://images.unsplash.com/photo-1598091857921-62d770c1e878?q=80&w=500&auto=format&fit=crop',
      count: '5 Trains',
    },
    {
      id: 'tr-5',
      name: 'Mumbai to Pune',
      image: 'https://images.unsplash.com/photo-1601999109332-542b18dbec57?q=80&w=500&auto=format&fit=crop',
      count: '14 Trains',
    },
    {
      id: 'tr-6',
      name: 'Tokyo to Kyoto',
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=500&auto=format&fit=crop',
      count: '45 Trains',
    },
    {
      id: 'tr-7',
      name: 'London to Edinburgh',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=500&auto=format&fit=crop',
      count: '22 Trains',
    },
    {
      id: 'tr-8',
      name: 'Paris to Amsterdam',
      image: 'https://images.unsplash.com/photo-1471623320832-752e8bbf8413?q=80&w=500&auto=format&fit=crop',
      count: '16 Trains',
    },
    {
      id: 'tr-9',
      name: 'SFO to Los Angeles',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=500&auto=format&fit=crop',
      count: '4 Trains',
    },
    {
      id: 'tr-10',
      name: 'New York to Boston',
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=500&auto=format&fit=crop',
      count: '28 Trains',
    },
    {
      id: 'tr-11',
      name: 'Rome to Florence',
      image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=500&auto=format&fit=crop',
      count: '32 Trains',
    },
    {
      id: 'tr-12',
      name: 'Venice to Milan',
      image: 'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?q=80&w=500&auto=format&fit=crop',
      count: '24 Trains',
    },
    {
      id: 'tr-13',
      name: 'Berlin to Munich',
      image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=500&auto=format&fit=crop',
      count: '19 Trains',
    },
    {
      id: 'tr-14',
      name: 'Zurich to Zermatt',
      image: 'https://images.unsplash.com/photo-1502784444187-359ac186c5bb?q=80&w=500&auto=format&fit=crop',
      count: '6 Trains',
    },
    {
      id: 'tr-15',
      name: 'Madrid to Barcelona',
      image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=500&auto=format&fit=crop',
      count: '30 Trains',
    },
    {
      id: 'tr-16',
      name: 'Sydney to Melbourne',
      image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=500&auto=format&fit=crop',
      count: '3 Trains',
    },
    {
      id: 'tr-17',
      name: 'Beijing to Shanghai',
      image: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=500&auto=format&fit=crop',
      count: '40 Trains',
    }
  ];

  const flightRoutes: TravelRoute[] = [
    {
      id: 'fr-1',
      name: 'Mumbai to Delhi',
      image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=500&auto=format&fit=crop',
      count: '85 Flights',
    },
    {
      id: 'fr-2',
      name: 'SFO to JFK',
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=500&auto=format&fit=crop',
      count: '42 Flights',
    },
    {
      id: 'fr-3',
      name: 'London to Paris',
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=500&auto=format&fit=crop',
      count: '55 Flights',
    },
    {
      id: 'fr-4',
      name: 'Tokyo to Osaka',
      image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=500&auto=format&fit=crop',
      count: '64 Flights',
    },
    {
      id: 'fr-5',
      name: 'Sydney to Melbourne',
      image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=500&auto=format&fit=crop',
      count: '92 Flights',
    },
    {
      id: 'fr-6',
      name: 'Los Angeles to Las Vegas',
      image: 'https://images.unsplash.com/photo-1522083165195-342750297f46?q=80&w=500&auto=format&fit=crop',
      count: '38 Flights',
    },
    {
      id: 'fr-7',
      name: 'New York to London',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=500&auto=format&fit=crop',
      count: '48 Flights',
    },
    {
      id: 'fr-8',
      name: 'Singapore to Jakarta',
      image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?q=80&w=500&auto=format&fit=crop',
      count: '50 Flights',
    },
    {
      id: 'fr-9',
      name: 'Dubai to London',
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=500&auto=format&fit=crop',
      count: '34 Flights',
    },
    {
      id: 'fr-10',
      name: 'Hong Kong to Taipei',
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=500&auto=format&fit=crop',
      count: '72 Flights',
    },
    {
      id: 'fr-11',
      name: 'Seoul to Jeju',
      image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=500&auto=format&fit=crop',
      count: '120 Flights',
    },
    {
      id: 'fr-12',
      name: 'Chicago to New York',
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=500&auto=format&fit=crop',
      count: '45 Flights',
    },
    {
      id: 'fr-13',
      name: 'Atlanta to Orlando',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=500&auto=format&fit=crop',
      count: '32 Flights',
    },
    {
      id: 'fr-14',
      name: 'Boston to Washington',
      image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0dba9?q=80&w=500&auto=format&fit=crop',
      count: '28 Flights',
    },
    {
      id: 'fr-15',
      name: 'Paris to Nice',
      image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=500&auto=format&fit=crop',
      count: '26 Flights',
    },
    {
      id: 'fr-16',
      name: 'SFO to Seattle',
      image: 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?q=80&w=500&auto=format&fit=crop',
      count: '24 Flights',
    }
  ];

  // Helper to format date display (DD-MM-YYYY)
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  };

  // Helper date pills selectors
  const setTodayDate = () => {
    const today = new Date();
    setDepartureDate(today.toISOString().split('T')[0]);
  };

  const setTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDepartureDate(tomorrow.toISOString().split('T')[0]);
  };

  // Large Vector icons for each tab category
  const renderTabIcon = (type: TabType, isActive: boolean) => {
    const fillClass = isActive ? 'text-white' : 'text-[#600619] group-hover:text-[#600619]';
    
    switch (type) {
      case 'buses':
        return (
          <svg viewBox="0 0 24 24" className={`w-9 h-9 ${fillClass} transition-colors fill-current`} xmlns="http://www.w3.org/2000/svg">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm2-9h12v4H6V7zm1.5 8c-.83 0-1.5-.67-1.5-1.5S6.67 12 7.5 12s1.5.67 1.5 1.5S8.33 15 7.5 15zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
          </svg>
        );
      case 'flights':
        return (
          <svg viewBox="0 0 24 24" className={`w-9 h-9 ${fillClass} transition-colors fill-current rotate-45`} xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l7 2.5z" />
          </svg>
        );
      case 'trains':
        return (
          <svg viewBox="0 0 24 24" className={`w-9 h-9 ${fillClass} transition-colors fill-current`} xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2c-4.42 0-8 .5-8 4v10.5c0 2.15 1.75 3.5 3.5 3.5L6 22v1h12v-1l-1.5-2c1.75 0 3.5-1.35 3.5-3.5V6c0-3.5-3.58-4-8-4zm0 3c2.76 0 5 .22 5 .5S14.76 6 12 6s-5-.22-5-.5.22-.5 5-.5zm5 9c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm-8 0c0 .83-.67 1.5-1.5 1.5S6 14.83 6 14s.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm8-4H7V8h10v2z" />
          </svg>
        );
      case 'hotels':
        return (
          <svg viewBox="0 0 24 24" className={`w-9 h-9 ${fillClass} transition-colors fill-current`} xmlns="http://www.w3.org/2000/svg">
            <path d="M19 15v-3c0-2.21-1.79-4-4-4h-6c-2.21 0-4 1.79-4 4v3c-1.1 0-2 .9-2 2v3h1.5v-2h17v2H21v-3c0-1.1-.9-2-2-2zm-9-4c0-.83.67-1.5 1.5-1.5S13 10.17 13 11s-.67 1.5-1.5 1.5S10 11.83 10 11zm-5 1c0-1.1.9-2 2-2h3v4H7c-1.1 0-2-.9-2-2zm12 2h-3v-4h3c1.1 0 2 .9 2 2c0 1.1-.9 2-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f3f3f1] font-sans antialiased text-zinc-900 pb-20 select-none">
      
      {/* 1. CUSTOM DASHBOARD NAVIGATION HEADER */}
      <header
        className="fixed top-6 left-1/2 w-[calc(100%-2rem)] max-w-7xl mx-auto z-50 px-2 sm:px-4 md:px-8 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
        style={{
          transform: isNavbarVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-140px)",
          opacity: isNavbarVisible ? 1 : 0
        }}
      >
        <nav className="relative flex items-center justify-between rounded-full bg-white px-8 py-7 shadow-lg border border-zinc-100/30">
          
          {/* Left: Logo */}
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2.5 group cursor-pointer">
              {/* Custom SVG Transit Connection Logo Mark in brand red */}
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#600619] text-white transition-transform group-hover:scale-105">
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
                connex<span className="text-[#600619]">link</span>
              </span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-zinc-900 bg-zinc-50 border border-zinc-200/40 px-4 py-2 rounded-xl text-base font-black transition-all cursor-pointer flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#600619]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.65 2.12a.98.98 0 00-1.3 0L3.7 9.07a1 1 0 00-.3.73v10.7a1.5 1.5 0 001.5 1.5h14.2a1.5 1.5 0 001.5-1.5v-10.7a1 1 0 00-.3-.73l-7.65-6.95z" />
                </svg>
                Dashboard
              </span>
              <span className="text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 px-4 py-2 rounded-xl text-base font-bold transition-all cursor-pointer">
                Offers
              </span>
              <span className="text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 px-4 py-2 rounded-xl text-base font-bold transition-all cursor-pointer">
                Track Ticket
              </span>
              <span className="text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 px-4 py-2 rounded-xl text-base font-bold transition-all cursor-pointer">
                Need Help?
              </span>
            </div>
          </div>

          {/* Right: User profile / Account */}
          <div className="hidden md:flex items-center gap-4">
            <button className="hidden sm:inline-flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 transition-colors rounded-full px-4 py-2 text-xs font-black text-zinc-800 cursor-pointer">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Agent Portal
            </button>
            <div className="flex items-center gap-2.5 bg-zinc-900 text-white rounded-full pl-3.5 pr-2.5 py-1.5 border border-zinc-800 shadow-md cursor-pointer hover:bg-zinc-800 transition-colors">
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
              <span
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-zinc-900 hover:text-zinc-950 font-extrabold py-2 border-b border-zinc-50 cursor-pointer flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#600619]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.65 2.12a.98.98 0 00-1.3 0L3.7 9.07a1 1 0 00-.3.73v10.7a1.5 1.5 0 001.5 1.5h14.2a1.5 1.5 0 001.5-1.5v-10.7a1 1 0 00-.3-.73l-7.65-6.95z" />
                </svg>
                Dashboard
              </span>
              <span
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-zinc-600 hover:text-zinc-950 font-semibold py-2 border-b border-zinc-50 cursor-pointer"
              >
                Offers
              </span>
              <span
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-zinc-600 hover:text-zinc-950 font-semibold py-2 border-b border-zinc-50 cursor-pointer"
              >
                Track Ticket
              </span>
              <span
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-zinc-600 hover:text-zinc-950 font-semibold py-2 border-b border-zinc-50 cursor-pointer"
              >
                Need Help?
              </span>
              <div className="flex flex-col gap-3 pt-4 border-t border-zinc-100">
                <button className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 py-3 rounded-full text-xs font-black text-zinc-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Agent Portal
                </button>
                <div className="w-full flex items-center justify-between bg-zinc-900 text-white rounded-full px-5 py-2.5 border border-zinc-800 shadow-md">
                  <span className="text-sm font-black">Suryabrata</span>
                  <div className="w-8 h-8 rounded-full bg-[#d9c8f0] text-zinc-900 flex items-center justify-center font-black text-sm">
                    S
                  </div>
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* 2. DYNAMIC HERO SCENIC BANNER */}
      {/* Increased bottom margin across screen sizes to accommodate the floating card height */}
      <div className="relative w-full h-[580px] bg-zinc-900 flex flex-col justify-center items-center px-4 select-none mb-[380px] sm:mb-[300px] lg:mb-48">
        
        {/* Scenic Background Images Wrapper with overflow-hidden */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Animated transition background images */}
          {Object.entries(bgImages).map(([key, url]) => (
            <div
              key={key}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out`}
              style={{
                backgroundImage: `url('${url}')`,
                opacity: activeTab === key ? 0.55 : 0,
              }}
            />
          ))}

          {/* Dark radial fade blend overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-zinc-900/10" />
          <div 
            className="absolute inset-0"
            style={{
              WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 95%)",
              maskImage: "radial-gradient(circle at center, black 40%, transparent 95%)",
              backgroundColor: "rgba(9, 9, 11, 0.1)"
            }}
          />
        </div>

        {/* Header content inside the Hero (Large bold typography) */}
        <div className="relative z-10 text-center max-w-4xl px-4 flex flex-col items-center gap-3.5 mb-14">
          <span className="text-brand-lime font-black uppercase tracking-[0.3em] text-xs sm:text-sm">
            ConnexLink Engine
          </span>
          <h1 className="text-white font-black tracking-tight text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.95] select-none">
            India's Fastest Connection Platform
          </h1>
          <p className="text-white/80 font-medium text-sm sm:text-base md:text-lg max-w-xl leading-relaxed mt-2">
            Build your travel path, find instant bookings, and sync tickets on your link in bio.
          </p>
        </div>

        {/* 3. FLOATING TICKET SEARCH CARD */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20 w-full max-w-7xl px-6">
          <div className="w-full bg-white/95 backdrop-blur-md rounded-[3rem] shadow-2xl p-6 sm:p-8 flex flex-col gap-6 border border-white/20 select-none">
            
            {/* Card Tab Bar */}
            <div className="w-full flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200/60 pb-5 gap-4">
              
              {/* Travel Mode Selectors */}
              <div className="flex flex-row flex-wrap items-center gap-3">
                {(['buses', 'flights', 'trains', 'hotels'] as TabType[]).map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`group flex items-center gap-3 px-6 py-4.5 rounded-2xl transition-all cursor-pointer select-none font-black text-lg ${
                        isActive 
                          ? 'bg-[#600619] text-white shadow-lg scale-[1.02]' 
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-[#600619]'
                      }`}
                    >
                      {renderTabIcon(tab, isActive)}
                      <span className="capitalize">{tab}</span>
                    </button>
                  );
                })}
              </div>

              {/* Platform Subheading */}
              <div className="text-right hidden lg:block select-none">
                <span className="text-zinc-400 font-bold text-xs uppercase tracking-widest block">
                  Official Booking Partner
                </span>
                <span className="text-zinc-800 font-black text-sm tracking-tight mt-0.5 block">
                  Instant ticketing, seat selections & updates
                </span>
              </div>

            </div>

            {/* Travel Form Fields Inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch relative">
              
              {/* FROM (Source) Input */}
              <div className="lg:col-span-3 bg-zinc-100/80 rounded-2xl px-5 py-4 border border-zinc-200/50 hover:border-zinc-300/80 transition-colors flex items-center gap-4 relative">
                <div className="text-[#600619] shrink-0">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                  </svg>
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    From City
                  </label>
                  <input
                    type="text"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    className="bg-transparent outline-none border-none text-zinc-900 font-black text-xl placeholder-zinc-400 w-full mt-0.5"
                  />
                </div>
              </div>

              {/* Swap Button (Absolute/Relative floating arrow capsule) */}
              <div className="absolute left-1/2 lg:left-[25%] top-[90px] lg:top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <button
                  onClick={swapLocations}
                  className="w-12 h-12 rounded-full bg-white border border-zinc-200 shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-[#600619] hover:text-zinc-900 cursor-pointer"
                  title="Swap Locations"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" xmlns="http://www.w3.org/2000/svg" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3L21 7L17 11" />
                    <path d="M3 17L7 21L3 25" className="hidden" />
                    <path d="M21 7H9" />
                    <path d="M7 21L3 17L7 13" />
                    <path d="M3 17H15" />
                  </svg>
                </button>
              </div>

              {/* TO (Destination) Input */}
              <div className="lg:col-span-3 bg-zinc-100/80 rounded-2xl px-5 py-4 border border-zinc-200/50 hover:border-zinc-300/80 transition-colors flex items-center gap-4">
                <div className="text-[#600619] shrink-0">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                  </svg>
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    To City
                  </label>
                  <input
                    type="text"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    className="bg-transparent outline-none border-none text-zinc-900 font-black text-xl placeholder-zinc-400 w-full mt-0.5"
                  />
                </div>
              </div>

              {/* DATE Picker Input */}
              <div className="lg:col-span-2 bg-zinc-100/80 rounded-2xl px-5 py-4 border border-zinc-200/50 hover:border-zinc-300/80 transition-colors flex items-center gap-3 relative cursor-pointer">
                <div className="text-[#600619] shrink-0">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm-7-7H7v2h5v-2z" />
                  </svg>
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                    Departure Date
                  </span>
                  <span className="text-zinc-900 font-black text-lg mt-0.5 block">
                    {departureDate ? formatDateDisplay(departureDate) : 'Select Date'}
                  </span>
                </div>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                />
              </div>

              {/* QUICK Date Selectors */}
              <div className="lg:col-span-2 flex flex-row lg:flex-col gap-2 justify-center">
                <button
                  onClick={setTodayDate}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 active:scale-95 transition-all py-3.5 rounded-2xl text-center text-xs font-black text-zinc-700 cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={setTomorrowDate}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 active:scale-95 transition-all py-3.5 rounded-2xl text-center text-xs font-black text-zinc-700 cursor-pointer"
                >
                  Tomorrow
                </button>
              </div>

              {/* Big Search button */}
              <div className="lg:col-span-2 flex items-stretch">
                <button
                  className="w-full bg-[#600619] hover:bg-[#4a0310] text-white rounded-2xl py-4 lg:py-0 flex items-center justify-center gap-2 font-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer"
                >
                  <span>Search</span>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[3]" xmlns="http://www.w3.org/2000/svg" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12H19" />
                    <path d="M12 5L19 12L12 19" />
                  </svg>
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* 4. RECENT SEARCHES / SAVED PATHS SECTION */}
      {/* Added pt-12 to ensure proper separation from the floating search bar */}
      <div className="w-full max-w-7xl mx-auto px-6 pt-12 sm:pt-16 select-none">
        
        <div className="flex flex-col gap-6">
          
          <div className="flex items-center justify-between">
            <h2 className="text-zinc-900 font-black text-3xl sm:text-4xl md:text-5xl tracking-tight flex items-center gap-3">
              <span className="w-3 h-8 sm:h-9 md:h-10 rounded-full bg-[#600619] shrink-0"></span>
              Recent Searches
            </h2>
            <button className="text-zinc-400 hover:text-zinc-900 font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer">
              Clear All
            </button>
          </div>

          {/* Recent Search Badges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentSearches.map((search) => (
              <div
                key={search.id}
                className="bg-white rounded-3xl p-5 border border-zinc-200/60 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer flex flex-col gap-4 group"
              >
                
                {/* Badge Header: Location swap visualization */}
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  
                  {/* Transit Icon Badge */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-[#600619]">
                      {search.type === 'buses' && (
                        <span className="text-lg">🚌</span>
                      )}
                      {search.type === 'flights' && (
                        <span className="text-lg rotate-45 inline-block">✈️</span>
                      )}
                      {search.type === 'trains' && (
                        <span className="text-lg">🚆</span>
                      )}
                    </div>
                    <span className="text-zinc-400 font-bold text-[10px] uppercase tracking-widest">
                      {search.type}
                    </span>
                  </div>

                  <span className="text-zinc-500 font-black text-xs">
                    {search.date}
                  </span>

                </div>

                {/* Cities Connection visual */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Origin</span>
                    <span className="text-zinc-800 font-black text-lg group-hover:text-[#600619] transition-colors truncate max-w-[120px]">
                      {search.from}
                    </span>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex-1 flex items-center justify-center px-2">
                    <div className="w-full h-[2px] bg-zinc-200 relative flex items-center justify-end">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#600619] absolute left-0" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#600619]" />
                    </div>
                  </div>

                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Destination</span>
                    <span className="text-zinc-800 font-black text-lg group-hover:text-[#600619] transition-colors truncate max-w-[120px]">
                      {search.to}
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>

      {/* 5. TOP PRIVATE TRAVELS CAROUSEL SECTION */}
      <div className="w-full max-w-7xl mx-auto px-6 mt-24 select-none relative group/carousel pb-20">
        
        {/* Title and Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-zinc-900 font-black text-3xl sm:text-4xl md:text-5xl tracking-tight flex items-center gap-3">
            <span className="w-3 h-8 sm:h-9 md:h-10 rounded-full bg-[#600619] shrink-0"></span>
            Top Private Travels
          </h2>
          
          {/* Navigation Arrows for desktop (top right) */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scrollCarousel('left')}
              className="w-10 h-10 rounded-full bg-white border border-zinc-200/80 shadow-sm flex items-center justify-center text-[#600619] hover:text-zinc-950 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[2.5]" xmlns="http://www.w3.org/2000/svg" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              className="w-10 h-10 rounded-full bg-white border border-zinc-200/80 shadow-sm flex items-center justify-center text-[#600619] hover:text-zinc-950 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[2.5]" xmlns="http://www.w3.org/2000/svg" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Carousel Scroller Container */}
        <div className="relative w-full">
          
          {/* Floating Right Arrow Button (Overlay right side of list) */}
          <button
            onClick={() => scrollCarousel('right')}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white border border-zinc-200 shadow-lg flex items-center justify-center text-[#600619] hover:text-zinc-950 hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="Next"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[3]" xmlns="http://www.w3.org/2000/svg" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Floating Left Arrow Button */}
          <button
            onClick={() => scrollCarousel('left')}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white border border-zinc-200 shadow-lg flex items-center justify-center text-[#600619] hover:text-zinc-950 hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="Previous"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[3]" xmlns="http://www.w3.org/2000/svg" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Horizontally scrolling track with hidden scrollbars */}
          <div
            ref={carouselRef}
            className="w-full flex gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-4 px-2 snap-x snap-mandatory scroll-smooth"
          >
            {travelOperators.map((operator) => (
              <div
                key={operator.id}
                className="snap-start shrink-0 w-[285px] sm:w-[310px] bg-white rounded-3xl border border-zinc-200/50 shadow-sm hover:shadow-md hover:scale-[1.03] transition-all duration-300 flex flex-col overflow-hidden group/card cursor-pointer"
              >
                
                {/* Card Top: Scenic vehicle image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100 shrink-0">
                  <img
                    src={operator.image}
                    alt={operator.name}
                    className="w-full h-full object-cover select-none pointer-events-none group-hover/card:scale-105 transition-transform duration-500"
                  />
                  {/* Rating star overlay badge */}
                  <div className="absolute top-3.5 right-3.5 bg-black/60 backdrop-blur-md text-[#f59e0b] font-black text-xs px-2.5 py-1 rounded-full flex items-center gap-1 select-none pointer-events-none">
                    <span>★</span>
                    <span className="text-white">{operator.rating}</span>
                  </div>
                </div>

                {/* Card Bottom: Metadata and details */}
                <div className="flex flex-col gap-3 p-5 bg-zinc-50 border-t border-zinc-200/40 rounded-b-3xl flex-1 justify-between">
                  <span className="text-zinc-900 font-black text-lg group-hover/card:text-[#600619] transition-colors truncate">
                    {operator.name}
                  </span>
                  
                  {/* Amenities pills */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {operator.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="bg-white px-2.5 py-1 border border-zinc-200/50 rounded-lg text-[10px] font-black text-zinc-500 uppercase tracking-wide select-none"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>

      {/* 5B. ANIMATED STATS COUNTER SECTION */}
      <div 
        ref={statsRef}
        className="w-full max-w-7xl mx-auto px-6 mt-20 select-none relative"
      >
        <div className="w-full bg-[#600619] rounded-[3rem] p-10 sm:p-14 relative overflow-hidden shadow-2xl flex items-center justify-center border border-white/10">
          
          {/* Overlapping corner design circles */}
          {/* Top-Left */}
          <div className="absolute -top-12 -left-12 w-28 h-28 rounded-full bg-[#dec8eb]/10 pointer-events-none" />
          <div className="absolute -top-6 -left-16 w-28 h-28 rounded-full bg-[#2d5f3d]/20 pointer-events-none" />

          {/* Bottom-Right */}
          <div className="absolute -bottom-12 -right-12 w-28 h-28 rounded-full bg-[#dec8eb]/10 pointer-events-none" />
          <div className="absolute -bottom-6 -right-16 w-28 h-28 rounded-full bg-[#2d5f3d]/20 pointer-events-none" />

          {/* Stats Counter Grid */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 relative z-10 text-center">
            
            {/* Stat 1 */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-[#dec8eb] font-black text-xs uppercase tracking-[0.2em] select-none text-center leading-relaxed">
                Bus routes across india
              </span>
              <span className="text-white font-black text-4xl sm:text-5xl md:text-6xl mt-3 tracking-tight select-none">
                <AnimatedCounter target={6.5} suffix="L+" decimals={1} trigger={statsTrigger} />
              </span>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-[#dec8eb] font-black text-xs uppercase tracking-[0.2em] select-none text-center leading-relaxed">
                Bus partners
              </span>
              <span className="text-white font-black text-4xl sm:text-5xl md:text-6xl mt-3 tracking-tight select-none">
                <AnimatedCounter target={6200} suffix="+" decimals={0} trigger={statsTrigger} />
              </span>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-[#dec8eb] font-black text-xs uppercase tracking-[0.2em] select-none text-center leading-relaxed">
                Trusted travellers
              </span>
              <span className="text-white font-black text-4xl sm:text-5xl md:text-6xl mt-3 tracking-tight select-none">
                <AnimatedCounter target={5} suffix="Cr+" decimals={0} trigger={statsTrigger} />
              </span>
            </div>

            {/* Stat 4 */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-[#dec8eb] font-black text-xs uppercase tracking-[0.2em] select-none text-center leading-relaxed">
                Buses with discounts
              </span>
              <span className="text-white font-black text-4xl sm:text-5xl md:text-6xl mt-3 tracking-tight select-none">
                <AnimatedCounter target={1} suffix="L+" decimals={0} trigger={statsTrigger} />
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* 6. POPULAR BUS ROUTES GRID SECTION */}
      <div className="w-full max-w-7xl mx-auto px-6 mt-20 select-none">
        
        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-zinc-900 font-black text-3xl sm:text-4xl md:text-5xl tracking-tight flex items-center gap-3">
            <span className="w-3 h-8 sm:h-9 md:h-10 rounded-full bg-[#600619] shrink-0"></span>
            Popular Bus Routes
          </h2>
        </div>

        {/* Routes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {(showAllBuses ? busRoutes : busRoutes.slice(0, 10)).map((route) => (
            <div
              key={route.id}
              className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer border border-zinc-200/20"
            >
              <img
                src={route.image}
                alt={route.name}
                className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
              />
              {/* Dark Gradient Text Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-5">
                <span className="text-white font-black text-lg leading-tight truncate">{route.name}</span>
                <span className="text-white/70 text-[10px] font-black mt-1.5 uppercase tracking-widest">{route.count}</span>
              </div>
              
              {/* Hover arrow badge */}
              <div className="absolute bottom-4.5 right-4.5 w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/45 backdrop-blur-md flex items-center justify-center text-white transition-colors cursor-pointer select-none">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2.5]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* View More button */}
        <div className="w-full flex items-center justify-center mt-10">
          <button
            onClick={() => setShowAllBuses(!showAllBuses)}
            className="border border-[#600619]/40 hover:border-[#600619] text-[#600619] hover:bg-[#600619] hover:text-white rounded-full px-8 py-3 font-black text-xs uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer shadow-sm"
          >
            {showAllBuses ? 'View Less' : 'View More'}
          </button>
        </div>

      </div>

      {/* 7. FAMOUS TRAIN ROUTES GRID SECTION */}
      <div className="w-full max-w-7xl mx-auto px-6 mt-20 select-none">
        
        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-zinc-900 font-black text-3xl sm:text-4xl md:text-5xl tracking-tight flex items-center gap-3">
            <span className="w-3 h-8 sm:h-9 md:h-10 rounded-full bg-[#600619] shrink-0"></span>
            Famous Train Routes
          </h2>
        </div>

        {/* Routes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {(showAllTrains ? trainRoutes : trainRoutes.slice(0, 10)).map((route) => (
            <div
              key={route.id}
              className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer border border-zinc-200/20"
            >
              <img
                src={route.image}
                alt={route.name}
                className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
              />
              {/* Dark Gradient Text Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-5">
                <span className="text-white font-black text-lg leading-tight truncate">{route.name}</span>
                <span className="text-white/70 text-[10px] font-black mt-1.5 uppercase tracking-widest">{route.count}</span>
              </div>
              
              {/* Hover arrow badge */}
              <div className="absolute bottom-4.5 right-4.5 w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/45 backdrop-blur-md flex items-center justify-center text-white transition-colors cursor-pointer select-none">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2.5]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* View More button */}
        <div className="w-full flex items-center justify-center mt-10">
          <button
            onClick={() => setShowAllTrains(!showAllTrains)}
            className="border border-[#600619]/40 hover:border-[#600619] text-[#600619] hover:bg-[#600619] hover:text-white rounded-full px-8 py-3 font-black text-xs uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer shadow-sm"
          >
            {showAllTrains ? 'View Less' : 'View More'}
          </button>
        </div>

      </div>

      {/* 8. FAMOUS FLIGHT ROUTES GRID SECTION */}
      <div className="w-full max-w-7xl mx-auto px-6 mt-20 select-none pb-24">
        
        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-zinc-900 font-black text-3xl sm:text-4xl md:text-5xl tracking-tight flex items-center gap-3">
            <span className="w-3 h-8 sm:h-9 md:h-10 rounded-full bg-[#600619] shrink-0"></span>
            Famous Flight Routes
          </h2>
        </div>

        {/* Routes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {(showAllFlights ? flightRoutes : flightRoutes.slice(0, 10)).map((route) => (
            <div
              key={route.id}
              className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer border border-zinc-200/20"
            >
              <img
                src={route.image}
                alt={route.name}
                className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
              />
              {/* Dark Gradient Text Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-5">
                <span className="text-white font-black text-lg leading-tight truncate">{route.name}</span>
                <span className="text-white/70 text-[10px] font-black mt-1.5 uppercase tracking-widest">{route.count}</span>
              </div>
              
              {/* Hover arrow badge */}
              <div className="absolute bottom-4.5 right-4.5 w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/45 backdrop-blur-md flex items-center justify-center text-white transition-colors cursor-pointer select-none">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2.5]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* View More button */}
        <div className="w-full flex items-center justify-center mt-10">
          <button
            onClick={() => setShowAllFlights(!showAllFlights)}
            className="border border-[#600619]/40 hover:border-[#600619] text-[#600619] hover:bg-[#600619] hover:text-white rounded-full px-8 py-3 font-black text-xs uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer shadow-sm"
          >
            {showAllFlights ? 'View Less' : 'View More'}
          </button>
        </div>

      </div>

      {/* 9. CONNECTED TRAVEL PROMO BANNER SECTION */}
      <div className="w-full max-w-7xl mx-auto px-6 mt-20 select-none pb-28">
        <div className="w-full bg-gradient-to-r from-[#d37064] via-[#e4a297] to-[#f4ad9d] rounded-[2.5rem] p-8 sm:p-12 md:p-14 shadow-xl border border-white/10 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10">
          
          {/* Decorative background dust particles */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none opacity-60 z-0" />

          {/* Left Column: Text Information */}
          <div className="flex flex-col gap-5 lg:w-[62%] relative z-10 text-white">
            <h2 className="font-black text-3xl sm:text-4xl tracking-tight leading-tight">
              Connected Travel Made Simple
            </h2>
            <p className="font-medium text-sm sm:text-base leading-relaxed text-white/90">
              Travellers can find exclusive <span className="underline font-black cursor-pointer hover:text-zinc-950 transition-colors">multimodal travel offers</span>, discount coupons, cashback, and connection protection on ConnexLink. You can book synchronized train, bus, and flight tickets at the lowest prices to any destination. Choose from budget-friendly regional routes to high-speed premium express paths. Check for real-time schedule comparisons, select your preferred transit combinations, apply promo codes, and save money on your journeys today!
            </p>
          </div>

          {/* Right Column: 3D Travel Graphic */}
          <div className="flex items-center justify-center lg:w-[33%] relative z-10">
            <img
              src="/promo_artwork.png"
              className="w-72 sm:w-80 md:w-96 h-auto object-contain hover:scale-[1.05] hover:-translate-y-2.5 transition-all duration-500 select-none pointer-events-none drop-shadow-xl"
              alt="ConnexLink Travel Promo"
            />
          </div>

        </div>
      </div>

      {/* Footer Section */}
      <FooterSection />

    </div>
  );
}