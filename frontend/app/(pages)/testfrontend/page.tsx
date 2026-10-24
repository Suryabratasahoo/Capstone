'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import CityAutocomplete from '../../components/CityAutocomplete';

// Dynamically import leaflet because it requires the window object
let L: any = null;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

// Icons for the map
const createIcon = (color: string) => {
  if (!L) return null;
  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

// Helper to extract clean Indian Railway station codes (e.g., "RAIL:NZM" -> "NZM")
const extractStationCode = (stop: any): string => {
  if (!stop) return '';
  const raw = stop.id || stop.code || '';
  return raw.replace(/^(RAIL:|TRAIN_:?)/i, '').trim().toUpperCase();
};

// Helper to format YYYY-MM-DD into DD-MM-YYYY for ConfirmTkt
const formatToIndianDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    // YYYY-MM-DD -> DD-MM-YYYY
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

// Helper to construct prefilled ConfirmTkt booking URL
const getConfirmTktBookingUrl = (leg: any, date: string): string => {
  const fromCode = extractStationCode(leg.from_stop);
  const toCode = extractStationCode(leg.to_stop);
  const formattedDate = formatToIndianDate(date);
  if (!fromCode || !toCode) return 'https://www.confirmtkt.com/rbooking';
  return `https://www.confirmtkt.com/rbooking/trains/from/${encodeURIComponent(fromCode)}/to/${encodeURIComponent(toCode)}/${formattedDate}`;
};

// Helper to get train schedule & running status URL
const getTrainScheduleUrl = (leg: any): string => {
  const cleanNumber = (leg.service_number || '').replace(/\D/g, '');
  if (!cleanNumber) return 'https://www.confirmtkt.com/train-running-status';
  return `https://www.confirmtkt.com/train-running-status/${cleanNumber}`;
};

// Helper to get official IRCTC booking portal
const getIrctcBookingUrl = (): string => {
  return 'https://www.irctc.co.in/nget/train-search';
};

// Service Rating Badge with ABSA Tooltip
function ServiceRatingBadge({ serviceNumber, mode }: { serviceNumber: string, mode: string }) {
  const [ratingData, setRatingData] = useState<{ rating: number, highlights: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serviceNumber) return;

    let endpoint = "";
    if ((mode === 'RAIL' || mode === 'TRAIN') && !isNaN(Number(serviceNumber))) {
      endpoint = `http://127.0.0.1:8001/train/${serviceNumber}`;
    } else if (mode === 'BUS') {
      endpoint = `http://127.0.0.1:8001/bus/${encodeURIComponent(serviceNumber)}`;
    } else {
      return;
    }

    setLoading(true);
    fetch(endpoint)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        if (data && data.rating) {
          setRatingData({ rating: data.rating, highlights: data.highlights || [] });
        }
      })
      .catch(() => setRatingData(null))
      .finally(() => setLoading(false));
  }, [serviceNumber, mode]);

  if (loading) return <span className="ml-2 text-[9px] text-zinc-400 font-bold animate-pulse inline-block">Loading Rating...</span>;
  if (!ratingData) return null;

  return (
    <div className="inline-flex items-center gap-1.5 ml-1.5 group/badge relative">
      <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md text-[10px] font-black border border-amber-200 shadow-sm flex items-center cursor-help">
        <span className="mr-0.5 text-amber-500">★</span> {ratingData.rating.toFixed(1)}/5
      </span>
      {ratingData.highlights.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 opacity-0 group-hover/badge:opacity-100 transition-opacity bg-zinc-900/95 backdrop-blur-sm text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl max-w-xs overflow-y-auto z-50 pointer-events-none border border-zinc-700/50">
          <div className="text-[8px] font-bold tracking-wider text-zinc-400 uppercase mb-0.5">Passenger Feedback</div>
          <div className="flex flex-wrap items-center gap-1 font-medium">
            {ratingData.highlights.slice(0, 3).map((h, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <span className="text-zinc-500">•</span>}
                <span className={h.includes('Clean') || h.includes('Punctual') || h.includes('Good') || h.includes('Working') || h.includes('Comfortable') || h.includes('Helpful') || h.includes('Smooth') || h.includes('Budget') ? 'text-emerald-400 font-semibold' : 'text-amber-300'}>
                  {h}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TransitCopilotWidget({
  activeRoute,
  fromCity,
  toCity,
  travelDate,
}: {
  activeRoute: any;
  fromCity: string;
  toCity: string;
  travelDate: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'te'>('en');
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const initialGreetings: Record<'en' | 'hi' | 'te', string> = {
    en: "Namaste! I am your OptiTransit AI Copilot. I can analyze transfer layovers, explain why routes were selected, and check accessibility for senior travelers.",
    hi: "नमस्ते! मैं आपका ऑप्टिट्रांजिट एआई साथी हूँ। मैं लेओवर का समय, रूट चुनने का कारण और वरिष्ठ नागरिकों की यात्रा सुविधा की जाँच कर सकता हूँ।",
    te: "నమస్కారం! నేను మీ ఆప్టిట్రాన్సిట్ ఏఐ కోపైలట్‌ని. లేఓవర్ సమయం, రూట్ ఎంపిక కారణాలు మరియు వృద్ధుల ప్రయాణ సౌలభ్యాన్ని నేను విశ్లేషించగలను.",
  };

  const [messages, setMessages] = useState<
    Array<{ id: string; sender: 'user' | 'bot'; text: string; time: string }>
  >([
    {
      id: 'welcome',
      sender: 'bot',
      text: initialGreetings['en'],
      time: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  // Update welcome message when language changes if no conversation yet
  const handleLanguageChange = (lang: 'en' | 'hi' | 'te') => {
    setSelectedLang(lang);
    if (messages.length === 1 && messages[0].id === 'welcome') {
      setMessages([
        {
          id: 'welcome',
          sender: 'bot',
          text: initialGreetings[lang],
          time: 'Just now',
        },
      ]);
    }
  };

  const starterChips: Record<'en' | 'hi' | 'te', string[]> = {
    en: [
      "I want to visit my son in Bhopal",
      "Is 2 hours enough in Vijayawada to eat and change to bus?",
      "Why did you recommend this route over direct train?",
      "Is this route comfortable for a 75-year-old?",
    ],
    hi: [
      "मैं भोपाल में अपने बेटे से मिलने जा रहा हूँ",
      "क्या विजयवाड़ा में 2 घंटे खाना खाने और बस बदलने के लिए काफी हैं?",
      "सीधी ट्रेन के बजाय यह विकल्प क्यों चुना?",
      "क्या यह रूट 75 वर्ष के बुजुर्ग के लिए आरामदायक है?",
    ],
    te: [
      "నేను భోపాల్‌లో నా కుమారుడిని కలవాలనుకుంటున్నాను",
      "విజయవాడలో భోజనం చేసి బస్సు మారడానికి 2 గంటలు సరిపోతుందా?",
      "డైరెక్ట్ రైలు కంటే ఈ రూట్ ఎందుకు మంచిది?",
      "75 ఏళ్ల వృద్ధుడికి ఈ ప్రయాణం అనుకూలంగా ఉంటుందా?",
    ],
  };

  const generateSmartResponse = (userText: string, lang: 'en' | 'hi' | 'te'): string => {
    const lower = userText.toLowerCase();

    // 1. Missing Origin / Clarification scenario ("I want to visit my son in Bhopal")
    if (lower.includes('visit my son in bhopal') || (lower.includes('bhopal') && !lower.includes('from') && !lower.includes('chennai'))) {
      if (lang === 'te') {
        return "భోపాల్ వెళ్లడం చాలా సంతోషకరం! మీ ప్రయాణాన్ని ప్లాన్ చేయడానికి, దయచేసి మీరు ప్రస్తుతం ఏ నగరం లేదా స్టేషన్ నుండి బయలుదేరుతున్నారో తెలియజేయగలరా? (ఉదా: చెన్నై లేదా విజయవాడ)";
      }
      if (lang === 'hi') {
        return "भोपाल जाना बहुत अच्छी बात है! आपकी यात्रा की योजना बनाने के लिए, कृपया बताएं कि आप अभी किस शहर या स्टेशन से शुरुआत कर रहे हैं? (जैसे: चेन्नई या विजयवाड़ा)";
      }
      return "That's wonderful to visit your son in Bhopal! To find the safest and most comfortable options for you, could you please tell me: Where are you starting your journey from?";
    }

    // 2. Layover & Dining Constraint scenario ("2 hour is not enough... i will eat")
    if (lower.includes('2 hour') || lower.includes('2 hours') || lower.includes('eat') || lower.includes('enough') || lower.includes('భోజనం') || lower.includes('खाना')) {
      if (lang === 'te') {
        return "మీరు చెప్పింది 100% నిజం సర్. విజయవాడ రైల్వే స్టేషన్ నుండి పండిట్ నెహ్రూ బస్ టెర్మినల్ 2.2 కి.మీ దూరంలో ఉంది. లగేజీతో ఆటో ఎక్కడం మరియు విశ్రాంతిగా భోజనం చేయడానికి 2 గంటల సమయం వృద్ధులకు చాలా తక్కువ.\n\n💡 నా సిఫార్సు: మీకు కనీసం 3.5 నుండి 4 గంటల లేఓవర్ ఉండే మార్గాన్ని ఎంచుకోవడం మంచిది. దీనివల్ల స్టేషన్ దగ్గర ఉన్న భోజనశాలలో హాయిగా తిని, తీరిగ్గా బస్సు చేరుకోవచ్చు.";
      }
      if (lang === 'hi') {
        return "आपकी बात बिल्कुल सही है। विजयवाड़ा रेलवे स्टेशन से बस स्टैंड लगभग 2.2 किमी दूर है। सामान के साथ ऑटो लेना और शांति से भोजन करने के लिए 2 घंटे का समय एक बुजुर्ग यात्री के लिए बहुत कम है।\n\n💡 मेरा सुझाव: कम से कम 3.5 से 4 घंटे के बफर वाला रूट चुनें। इससे आप स्टेशन पर आराम से खाना खा सकेंगे और बिना किसी हड़बड़ी के बस तक पहुँच सकेंगे।";
      }
      return "You are completely right, sir. At 75, a 2-hour window between Vijayawada Railway Station and the Pandit Nehru Bus Stand (2.2 km away) is far too tight if you plan to eat. Taking an auto with luggage takes ~25 minutes, and a relaxed sit-down meal takes 45–60 minutes.\n\n💡 Recommendation: I advise choosing an option with at least a 3.5 to 4-hour layover buffer. This guarantees you have time for a relaxed hot meal without the stress of missing your bus.";
    }

    // 3. Explainable AI: "Why this route over direct?"
    if (lower.includes('why') || lower.includes('direct') || lower.includes('ఎందుకు') || lower.includes('क्यों')) {
      const interchange = activeRoute?.interchange_station?.name || 'Itarsi Jn';
      const wlNum = activeRoute?.wl_number || 38;
      if (lang === 'te') {
        return `ఈ మార్గాన్ని ఎందుకు ఎంచుకున్నామంటే: ప్రత్యక్ష (Direct) రైళ్లలో ప్రస్తుతం WL ${wlNum} ఉంది, అంటే సీటు కన్ఫర్మ్ అయ్యే అవకాశం 15% కంటే తక్కువ.\n\nఈ ప్రయాణంలో ${interchange} వద్ద 1 బదిలీ చేయడం ద్వారా మీకు కన్ఫర్మ్ బర్త్ లభిస్తుంది, అలాగే ప్లాట్‌ఫారమ్ మారడానికి తగినంత సేఫ్టీ సమయం ఉంది.`;
      }
      if (lang === 'hi') {
        return `यह रूट इसलिए चुना गया क्योंकि सीधी ट्रेनों में फिलहाल वेटिंग लिस्ट WL ${wlNum} है, जिसके कन्फर्म होने की संभावना बेहद कम (15% से कम) है।\n\n${interchange} पर 1 ट्रांसफर के साथ यह रूट आपको 100% कन्फर्म सीट देता है और प्लेटफॉर्म बदलने के लिए पर्याप्त समय भी देता है।`;
      }
      return `Here is why OptiTransit recommended this route:\n\n1. Seat Confirmation: Direct trains on this date are currently stuck on WL ${wlNum} (under 15% confirmation probability).\n2. Confirmed Alternative: Splitting the journey at ${interchange} gives you guaranteed confirmed berths for both segments.\n3. Safe Buffer: The layover provides a stress-free connection with lift and escalator access.`;
    }

    // 4. Senior Citizen Comfort Query
    if (lower.includes('75') || lower.includes('senior') || lower.includes('elder') || lower.includes('వృద్ధ') || lower.includes('बुजुर्ग')) {
      if (lang === 'te') {
        return "వృద్ధులకు ప్రయాణ సలహా: 75 ఏళ్ల ప్రయాణికుల కోసం మేము తక్కువ బదిలీలు (0-1 బదిలీ), లిఫ్ట్ సదుపాయాలు ఉన్న స్టేషన్లు మరియు లోయర్ బెర్త్ (Lower Berth) అవకాశాలను ప్రాధాన్యతగా చూపిస్తాము.";
      }
      if (lang === 'hi') {
        return "वरिष्ठ नागरिक यात्रा सलाह: 75 वर्ष के यात्रियों के लिए हम कम से कम ट्रांसफर, लिफ्ट/एस्केलेटर की सुविधा वाले स्टेशन और लोअर बर्थ (Lower Berth) की उपलब्धता को प्राथमिकता देते हैं।";
      }
      return "Senior Traveler Assessment: For a 75-year-old traveler, we prioritize:\n• Ground-floor lower berths in sleeper/AC segments\n• Avoiding tight cross-city transfers under 2.5 hours\n• Stations with operational lifts/escalators between platforms.";
    }

    // Default contextual response
    if (lang === 'te') {
      return `ఖచ్చితంగా! మీ ప్రయాణం (${fromCity} నుండి ${toCity}) కోసం నేను సహాయం చేయగలను. మీరు ఏదైనా నిర్దిష్ట సమయం లేదా వృద్ధుల సహాయం గురించి అడగాలనుకుంటున్నారా?`;
    }
    if (lang === 'hi') {
      return `बिल्कुल! आपकी यात्रा (${fromCity} से ${toCity}) के लिए मैं पूरी सहायता कर सकता हूँ। क्या आप किसी विशेष समय या सहायता के बारे में जानना चाहते हैं?`;
    }
    return `I am here to help with your journey from ${fromCity} to ${toCity}. You can ask me to evaluate layovers, suggest meal breaks, or find senior-friendly connections!`;
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user' as const,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    // Simulate intelligent LLM processing delay
    setTimeout(() => {
      const responseText = generateSmartResponse(text, selectedLang);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot' as const,
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 850);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-brand-forest to-emerald-700 text-white px-4 py-3 rounded-full shadow-2xl hover:shadow-brand-forest/40 hover:scale-105 transition-all duration-200 border border-emerald-400/30 group"
          title="Open OptiTransit AI Copilot"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-lime"></span>
          </span>
          <span className="text-lg">🤖</span>
          <div className="text-left">
            <div className="text-xs font-black tracking-wide flex items-center gap-1.5">
              <span>AI Transit Copilot</span>
              <span className="text-[9px] bg-emerald-500/30 text-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300/30 uppercase tracking-widest font-mono">
                {selectedLang.toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] text-emerald-100/80 font-medium">Explainable Route Assistant</div>
          </div>
        </button>
      )}

      {/* Expanded Chat Drawer / Card */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[410px] h-[580px] bg-white rounded-3xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-forest via-emerald-800 to-zinc-900 text-white p-3.5 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-lime/20 border border-brand-lime/40 flex items-center justify-center text-base">
                🤖
              </div>
              <div>
                <h3 className="text-xs font-black tracking-wide flex items-center gap-1.5">
                  OptiTransit Copilot
                  <span className="text-[9px] bg-emerald-400/20 text-emerald-200 px-1 py-0.2 rounded border border-emerald-400/30">
                    XAI Beta
                  </span>
                </h3>
                <p className="text-[10px] text-zinc-300 font-medium">Senior & Multi-Modal Travel Advisor</p>
              </div>
            </div>

            {/* Language Selector + Close */}
            <div className="flex items-center gap-1.5">
              <div className="flex bg-black/30 p-0.5 rounded-lg border border-white/10 text-[10px] font-bold">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-1.5 py-0.5 rounded ${selectedLang === 'en' ? 'bg-brand-lime text-black font-black' : 'text-zinc-300 hover:text-white'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => handleLanguageChange('hi')}
                  className={`px-1.5 py-0.5 rounded ${selectedLang === 'hi' ? 'bg-brand-lime text-black font-black' : 'text-zinc-300 hover:text-white'}`}
                >
                  हि
                </button>
                <button
                  onClick={() => handleLanguageChange('te')}
                  className={`px-1.5 py-0.5 rounded ${selectedLang === 'te' ? 'bg-brand-lime text-black font-black' : 'text-zinc-300 hover:text-white'}`}
                >
                  తె
                </button>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 hover:text-white text-xs font-bold transition-colors"
                title="Minimize chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Context Header: Current active route info */}
          {activeRoute && (
            <div className="bg-brand-cream/60 px-3.5 py-1.5 border-b border-zinc-200 flex items-center justify-between text-[10px] text-zinc-600 font-bold shrink-0">
              <span className="flex items-center gap-1 truncate">
                <span className="text-brand-forest font-black">Route Context:</span>
                <span>{activeRoute.legs?.length || 1} Legs • {activeRoute.total_duration}</span>
              </span>
              <span className="text-zinc-400 uppercase font-mono text-[9px]">
                {activeRoute.interchange_station ? `via ${activeRoute.interchange_station.name}` : 'Direct'}
              </span>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/60">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-medium shadow-xs leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-brand-forest text-white rounded-br-xs'
                      : 'bg-white text-zinc-800 border border-zinc-200/80 rounded-bl-xs'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-zinc-400 mt-0.5 px-1 font-medium">{m.time}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 bg-white border border-zinc-200 px-3 py-2 rounded-2xl w-fit shadow-xs">
                <div className="w-1.5 h-1.5 bg-brand-forest rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-brand-forest rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-brand-forest rounded-full animate-bounce [animation-delay:0.4s]"></div>
                <span className="text-[10px] font-bold text-zinc-400 ml-1">Analyzing route details...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Starter Question Chips */}
          <div className="p-2 border-t border-zinc-100 bg-white/90 shrink-0">
            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">
              Suggested Questions
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {starterChips[selectedLang].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="shrink-0 bg-zinc-100 hover:bg-brand-cream text-zinc-700 hover:text-brand-forest border border-zinc-200 hover:border-brand-forest/40 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all text-left truncate max-w-[240px]"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white border-t border-zinc-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                selectedLang === 'te'
                  ? "మీ ప్రయాణం లేదా వృద్ధుల సహాయం గురించి అడగండి..."
                  : selectedLang === 'hi'
                  ? "अपनी यात्रा या बुजुर्गों की सुविधा के बारे में पूछें..."
                  : "Ask about layovers, meal breaks, or elder travel..."
              }
              className="flex-1 bg-zinc-100 border border-zinc-200 rounded-full px-3.5 py-2 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-brand-forest"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="bg-brand-forest hover:bg-black disabled:opacity-40 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-md transition-colors shrink-0"
              title="Send Message"
            >
              ↑
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function TestFrontendContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialFrom = searchParams.get('from') || 'New Delhi';
  const initialTo = searchParams.get('to') || 'Patna';
  const initialDate = searchParams.get('date') || '2026-10-15';
  const initialClass = searchParams.get('class') || '3A';

  const [fromLocation, setFromLocation] = useState(initialFrom);
  const [toLocation, setToLocation] = useState(initialTo);
  const [travelDate, setTravelDate] = useState(initialDate);
  const [travelClass, setTravelClass] = useState(initialClass);
  const [requireBus, setRequireBus] = useState(false);

  const [loading, setLoading] = useState(true);
  const [rawApiData, setRawApiData] = useState<any>(null);
  const [processedOptions, setProcessedOptions] = useState<any[]>([]);

  const [filterType, setFilterType] = useState('ALL');
  const [sortCriterion, setSortCriterion] = useState('DURATION');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0); // Auto-expand first result in test view

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const polylineGroup = useRef<any>(null);

  const STATUS_RANK: Record<string, number> = {
    AVAILABLE: 4,
    RAC: 3,
    WL: 2,
    "N/A": 1,
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current && !mapInstance.current && L) {
      mapInstance.current = L.map(mapRef.current).setView([24.0, 82.0], 5);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
        className: 'dark-tiles'
      }).addTo(mapInstance.current);
      polylineGroup.current = L.layerGroup().addTo(mapInstance.current);
    }
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const url = `http://127.0.0.1:8000/api/v4/mcraptor/city-search?source_city=${encodeURIComponent(fromLocation)}&dest_city=${encodeURIComponent(toLocation)}&date=${travelDate}&class_code=${travelClass}&top_k=25&require_bus=${requireBus}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setRawApiData(data);
    } catch (err) {
      console.error(err);
      setRawApiData({ options: [], total_options_found: 0, search_time_ms: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFrom, initialTo, initialDate, initialClass]);

  useEffect(() => {
    if (rawApiData) {
      applyFiltersAndSort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawApiData, filterType, sortCriterion]);

  const applyFiltersAndSort = () => {
    if (!rawApiData) return;
    let processed = [...(rawApiData.options || [])];

    if (filterType === "DIRECT") {
      processed = processed.filter(opt => opt.transfers === 0);
    } else if (filterType === "ONE_TRANSFER") {
      processed = processed.filter(opt => opt.transfers === 1);
    } else if (filterType === "AVAILABLE_ONLY") {
      processed = processed.filter(opt => opt.overall_status === "AVAILABLE");
    }

    if (sortCriterion === "DURATION") {
      processed.sort((a, b) => a.total_duration_mins - b.total_duration_mins);
    } else if (sortCriterion === "PRICE") {
      processed.sort((a, b) => a.total_price_inr - b.total_price_inr);
    } else if (sortCriterion === "DISTANCE") {
      processed.sort((a, b) => a.total_distance_km - b.total_distance_km);
    } else if (sortCriterion === "SEAT_STATUS") {
      processed.sort((a, b) => {
        const rankA = STATUS_RANK[a.overall_status] || 0;
        const rankB = STATUS_RANK[b.overall_status] || 0;
        if (rankB !== rankA) return rankB - rankA;
        return a.total_duration_mins - b.total_duration_mins;
      });
    } else if (sortCriterion === "DEPARTURE_TIME") {
      const parseDepTime = (str: string) => {
        if (!str) return 0;
        const match = str.match(/(\d{2}):(\d{2})(?:\s*\(Day\s*(\d+)\))?/);
        if (!match) return 0;
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const d = match[3] ? parseInt(match[3], 10) : 1;
        return (d - 1) * 24 * 60 + h * 60 + m;
      };
      processed.sort((a, b) => {
        const timeA = parseDepTime(a.legs[0]?.departure_time || "");
        const timeB = parseDepTime(b.legs[0]?.departure_time || "");
        return timeA - timeB;
      });
    }

    setProcessedOptions(processed);
    if (processed.length > 0) {
      drawRouteOnMap(processed[0]);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.replace(`/testfrontend?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}&date=${travelDate}&class=${travelClass}`);
    fetchResults();
  };

  const drawRouteOnMap = (option: any) => {
    if (!polylineGroup.current || !L) return;
    polylineGroup.current.clearLayers();

    const bounds = L.latLngBounds([]);
    const legColors: Record<string, string> = {
      RAIL: "#3b82f6",
      TRAIN: "#3b82f6",
      BUS: "#f59e0b",
      FLIGHT: "#ef4444",
      WALK: "#10b981",
    };

    option.legs.forEach((leg: any) => {
      const color = legColors[leg.mode] || "#64748b";
      const coordsWithData = (leg.path || []).filter((pt: any) => pt.latitude !== 0 && pt.longitude !== 0);
      const coords = coordsWithData.map((pt: any) => [pt.latitude, pt.longitude]);

      if (coords.length > 0) {
        const polyline = L.polyline(coords, {
          color: color,
          weight: 4,
          opacity: 0.8,
        }).addTo(polylineGroup.current);

        bounds.extend(polyline.getBounds());

        if (coordsWithData.length > 2) {
          coordsWithData.slice(1, -1).forEach((pt: any) => {
            const dot = L.circleMarker([pt.latitude, pt.longitude], {
              radius: 3.5,
              fillColor: '#1e1e1e',
              color: color,
              weight: 2,
              opacity: 0.9,
              fillOpacity: 1
            }).addTo(polylineGroup.current);

            if (pt.name) {
              dot.bindTooltip(pt.name, { className: 'bg-zinc-900 text-white border-zinc-700 text-xs font-bold px-2 py-1', direction: 'top', opacity: 0.9 });
            }
          });
        }

        const startPt = coords[0];
        const endPt = coords[coords.length - 1];

        L.marker(startPt, { icon: createIcon('#10b981') })
          .bindPopup(`<b>${leg.from_stop.name}</b><br>Dep: ${leg.departure_time}`)
          .addTo(polylineGroup.current);

        L.marker(endPt, { icon: createIcon('#ef4444') })
          .bindPopup(`<b>${leg.to_stop.name}</b><br>Arr: ${leg.arrival_time}`)
          .addTo(polylineGroup.current);
      }
    });

    if (bounds.isValid()) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'RAIL':
      case 'TRAIN': return '🚆';
      case 'BUS': return '🚌';
      case 'FLIGHT': return '✈️';
      case 'WALK': return '🚶';
      default: return '📍';
    }
  };

  const isRailMode = (mode: string) => mode === 'RAIL' || mode === 'TRAIN';

  return (
    <div className="flex flex-col h-screen bg-brand-cream overflow-hidden text-brand-charcoal">
      {/* Top Test Notification Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between shrink-0 shadow-sm z-40">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold border border-white/30">
            🧪 Test Frontend Route (/testfrontend)
          </span>
          <span className="hidden sm:inline">
            Direct Train Booking Integration Demo: Click any train name or "Book" link to jump to IRCTC / ConfirmTkt!
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/planner"
            className="text-[11px] font-bold text-white/90 hover:text-white underline underline-offset-2 flex items-center gap-1"
          >
            ← Back to Main Planner
          </Link>
        </div>
      </div>

      {/* Top Header Navigation */}
      <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <span className="text-xl font-black text-brand-forest">Opti<span className="text-black drop-shadow-sm">Transit</span></span>
          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
            Booking Prototype
          </span>
        </div>
        <form onSubmit={handleManualSearch} className="flex items-center gap-2">
          <div className="w-40 relative">
            <CityAutocomplete
              value={fromLocation} onChange={setFromLocation}
              inputClassName="bg-zinc-100 border border-zinc-200 rounded-full px-4 py-1.5 text-sm font-bold w-full focus:outline-brand-forest"
            />
          </div>
          <span className="text-zinc-400">→</span>
          <div className="w-40 relative">
            <CityAutocomplete
              value={toLocation} onChange={setToLocation}
              inputClassName="bg-zinc-100 border border-zinc-200 rounded-full px-4 py-1.5 text-sm font-bold w-full focus:outline-brand-forest"
            />
          </div>
          <input
            type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)}
            className="bg-zinc-100 border border-zinc-200 rounded-full px-4 py-1.5 text-sm font-bold focus:outline-brand-forest"
          />
          <select
            value={travelClass}
            onChange={(e) => setTravelClass(e.target.value)}
            className="bg-zinc-100 border border-zinc-200 rounded-full px-3 py-1.5 text-xs font-bold text-zinc-800 focus:outline-brand-forest cursor-pointer"
          >
            <option value="3A">Class: 3A (3-Tier AC)</option>
            <option value="2A">Class: 2A (2-Tier AC)</option>
            <option value="1A">Class: 1A (First AC)</option>
            <option value="SL">Class: SL (Sleeper)</option>
            <option value="CC">Class: CC (Chair Car)</option>
            <option value="2S">Class: 2S (Second Sitting)</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer ml-2">
            <input type="checkbox" checked={requireBus} onChange={(e) => setRequireBus(e.target.checked)} className="accent-brand-forest w-4 h-4" />
            Bus Required
          </label>
          <button type="submit" className="ml-2 bg-brand-forest text-white rounded-full px-5 py-1.5 text-sm font-bold hover:bg-black transition-colors shadow-md">
            Update
          </button>
        </form>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left Panel: Filters & Results */}
        <div className="w-[490px] bg-white border-r border-zinc-200 flex flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">

          {/* Controls Bar */}
          <div className="p-4 border-b border-zinc-100 bg-brand-cream/30">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h2 className="text-sm font-black text-brand-forest">Optimal Multi-Transit Routes</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {loading ? 'Searching...' : `Found ${rawApiData?.total_options_found || 0} routes in ${rawApiData?.search_time_ms || 0}ms`}
                </p>
              </div>
              <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Booking Links Enabled
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white border border-zinc-200 rounded-lg px-2 py-2 text-xs font-bold text-zinc-700 outline-none focus:border-brand-forest shadow-sm"
              >
                <option value="ALL">Show All Routes</option>
                <option value="DIRECT">Direct Only (0 Transfers)</option>
                <option value="ONE_TRANSFER">1-Transfer Only</option>
                <option value="AVAILABLE_ONLY">Confirmed Seats Only</option>
              </select>

              <select
                value={sortCriterion}
                onChange={(e) => setSortCriterion(e.target.value)}
                className="bg-white border border-zinc-200 rounded-lg px-2 py-2 text-xs font-bold text-zinc-700 outline-none focus:border-brand-forest shadow-sm"
              >
                <option value="DURATION">Sort: Fastest First</option>
                <option value="DEPARTURE_TIME">Sort: Departure Time</option>
                <option value="PRICE">Sort: Lowest Price</option>
                <option value="DISTANCE">Sort: Shortest Distance</option>
                <option value="SEAT_STATUS">Sort: Confirmed Status</option>
              </select>
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50">
            {loading ? (
              <div className="flex flex-col mt-40 items-center justify-center h-40 space-y-3 opacity-50">
                <div className="w-8 h-8 border-4 border-brand-lime border-t-brand-forest rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-brand-forest animate-pulse">Running Router...</p>
              </div>
            ) : processedOptions.length === 0 ? (
              <div className="text-center py-10 text-zinc-400 text-sm font-bold">
                No matching routes found.
              </div>
            ) : (
              processedOptions.map((opt, idx) => {
                const isExpanded = expandedIndex === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      drawRouteOnMap(opt);
                      setExpandedIndex(isExpanded ? null : idx);
                    }}
                    className={`group cursor-pointer rounded-2xl border p-4 shadow-sm transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/40 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:border-brand-forest/40 hover:shadow-lg hover:shadow-brand-forest/5 ${isExpanded
                        ? 'border-brand-forest/40 bg-brand-cream/20 shadow-md shadow-brand-forest/5'
                        : 'border-zinc-200/80 bg-white hover:bg-brand-cream/5'
                      }`}
                  >
                    {/* Card Header: Duration & Price */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-lg font-black text-brand-forest">{opt.total_duration}</span>
                        <span className="text-[10px] text-zinc-400 font-bold ml-2 uppercase tracking-wider">{opt.transfers} Transfers</span>
                        {/* Show rating for the primary leg if it's a train or bus */}
                        {(isRailMode(opt.legs[0]?.mode) || opt.legs[0]?.mode === 'BUS') && (
                          <ServiceRatingBadge serviceNumber={opt.legs[0].service_number} mode={opt.legs[0].mode} />
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-zinc-800">₹{opt.total_price_inr}</span>
                        <div className="text-[9px] text-zinc-400 font-semibold tracking-wide uppercase">
                          Class {opt.travel_class || travelClass} • Total Fare
                        </div>
                        <div className="mt-0.5">
                          {opt.overall_status === 'AVAILABLE' ? (
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">
                              {opt.travel_class || travelClass} • AVAILABLE {opt.available_seats && opt.available_seats > 0 ? `(${opt.available_seats})` : ''}
                            </span>
                          ) : opt.overall_status === 'RAC' ? (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">
                              {opt.travel_class || travelClass} • RAC {opt.wl_number && opt.wl_number > 0 ? opt.wl_number : ''}
                            </span>
                          ) : (opt.overall_status === 'WL' || opt.overall_status === 'WAITLIST') ? (
                            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">
                              {opt.travel_class || travelClass} • WL {opt.wl_number && opt.wl_number > 0 ? opt.wl_number : 1}
                            </span>
                          ) : (
                            <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">
                              {opt.travel_class || travelClass} • {opt.overall_status || 'UNKNOWN'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Journey Leg Status Preview Strip WITH DIRECT BOOKING LINK BUTTONS */}
                    <div className="flex flex-wrap items-center gap-1.5 py-1.5 px-2 bg-zinc-50/80 rounded-lg border border-zinc-100 mb-2">
                      {opt.legs.map((leg: any, lIdx: number) => {
                        const legIsRail = isRailMode(leg.mode);
                        const legClass = legIsRail ? (leg.travel_class || opt.travel_class || travelClass) : (leg.mode === 'BUS' ? 'BUS' : '');
                        const confirmTktUrl = legIsRail ? getConfirmTktBookingUrl(leg, travelDate) : '';

                        return (
                          <React.Fragment key={lIdx}>
                            {lIdx > 0 && <span className="text-zinc-300 text-[10px] font-bold">→</span>}
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-700">
                              <span>{getModeIcon(leg.mode)}</span>
                              
                              {/* If train, make service number clickable with booking action */}
                              {legIsRail ? (
                                <a
                                  href={confirmTktUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`Book Train ${leg.service_number} on ConfirmTkt`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-extrabold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-0.5 bg-blue-50/80 hover:bg-blue-100/80 px-1 py-0.5 rounded transition-colors"
                                >
                                  <span>{leg.service_number}</span>
                                  <span className="text-[9px] text-blue-600">↗</span>
                                </a>
                              ) : (
                                <span className="font-extrabold text-zinc-800">{leg.service_number || (leg.mode === 'WALK' ? 'Transfer' : leg.service_name?.slice(0, 16))}</span>
                              )}

                              {legClass && legIsRail && (
                                <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1 py-0.2 rounded font-mono">
                                  {legClass}
                                </span>
                              )}
                              
                              {leg.mode !== 'WALK' && (
                                leg.seat_status === 'AVAILABLE' ? (
                                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                    AVL {leg.available_seats && leg.available_seats > 0 ? leg.available_seats : ''}
                                  </span>
                                ) : leg.seat_status === 'RAC' ? (
                                  <span className="text-[9px] font-black text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                                    RAC {leg.wl_number && leg.wl_number > 0 ? leg.wl_number : 1}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>
                                    WL {leg.wl_number && leg.wl_number > 0 ? leg.wl_number : 1}
                                  </span>
                                )
                              )}

                              {/* Dedicated direct mini "Book ↗" link beside train leg */}
                              {legIsRail && (
                                <a
                                  href={confirmTktUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-0.5"
                                  title="Deep link directly to live booking site"
                                >
                                  Book ↗
                                </a>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Expand / Collapse Indicator */}
                    {!isExpanded && (
                      <div className="text-center mt-1 pt-2 border-t border-zinc-100/80">
                        <span className="text-[10px] font-black text-brand-forest/60 group-hover:text-brand-forest uppercase tracking-widest flex items-center justify-center gap-1">
                          View {opt.legs.length} Leg Journey & Direct Booking Links
                          <svg className="w-3 h-3 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6" /></svg>
                        </span>
                      </div>
                    )}

                    {/* Legs Timeline - EXPANDED VIEW WITH DIRECT BOOKING BUTTONS */}
                    {isExpanded && (
                      <div className="relative pl-3 border-l-2 border-brand-lime/50 space-y-4 py-1 mt-4 pt-4 border-t border-zinc-100">
                        {opt.legs.map((leg: any, lIdx: number) => {
                          const legIsRail = isRailMode(leg.mode);
                          const confirmTktUrl = legIsRail ? getConfirmTktBookingUrl(leg, travelDate) : '';
                          const irctcUrl = getIrctcBookingUrl();

                          return (
                            <div key={lIdx} className="relative">
                              <div className="absolute -left-[18.5px] top-1 bg-white border-2 border-brand-lime w-3.5 h-3.5 rounded-full z-10 group-hover:border-brand-forest transition-colors"></div>
                              <div className="flex items-start gap-2">
                                <span className="text-base leading-none">{getModeIcon(leg.mode)}</span>
                                <div className="flex-1">
                                  {/* Leg Title & Booking Links */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Train Name as Clickable Booking Link */}
                                    {legIsRail ? (
                                      <a
                                        href={confirmTktUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Click to open booking portal"
                                        className="text-[12px] font-black text-blue-700 hover:text-blue-900 hover:underline tracking-wide flex items-center gap-1 group/name bg-blue-50/70 hover:bg-blue-100/70 px-1.5 py-0.5 rounded transition-all"
                                      >
                                        <span>{leg.service_name}</span>
                                        <span className="text-[10px] text-blue-500 group-hover/name:translate-x-0.5 group-hover/name:-translate-y-0.5 transition-transform">↗</span>
                                      </a>
                                    ) : (
                                      <p className="text-[11px] font-black text-zinc-800 tracking-wide">{leg.service_name}</p>
                                    )}

                                    {/* Class Badge */}
                                    {legIsRail && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono tracking-wider shadow-sm">
                                        Class {leg.travel_class || opt.travel_class || travelClass}
                                      </span>
                                    )}
                                    {leg.mode === 'BUS' && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-mono tracking-wider shadow-sm">
                                        Bus
                                      </span>
                                    )}

                                    {/* Seat Status Badge */}
                                    {leg.mode !== 'WALK' && leg.seat_status === 'AVAILABLE' && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm">
                                        {leg.available_seats && leg.available_seats > 0 ? `${leg.available_seats} Seats Available` : 'Available'}
                                      </span>
                                    )}
                                    {leg.mode !== 'WALK' && leg.seat_status === 'RAC' && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 shadow-sm">
                                        RAC {leg.wl_number && leg.wl_number > 0 ? leg.wl_number : 1}
                                      </span>
                                    )}
                                    {leg.mode !== 'WALK' && (leg.seat_status === 'WL' || leg.seat_status === 'WAITLIST') && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 shadow-sm flex items-center gap-1 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                        WL {leg.wl_number && leg.wl_number > 0 ? leg.wl_number : 1}
                                      </span>
                                    )}
                                    {(legIsRail || leg.mode === 'BUS') && <ServiceRatingBadge serviceNumber={leg.service_number} mode={leg.mode} />}
                                  </div>

                                  {/* Deep Linking Booking Action Bar specifically for Trains */}
                                  {legIsRail && (
                                    <div className="flex items-center gap-2 mt-2 pt-1.5 pb-1 border-t border-zinc-100">
                                      <span className="text-[9px] font-extrabold uppercase text-zinc-400 tracking-wider">
                                        Book Train:
                                      </span>
                                      
                                      {/* Official IRCTC Link */}
                                      <a
                                        href={irctcUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black shadow-xs transition-colors"
                                        title="Open Official IRCTC Portal"
                                      >
                                        <span>IRCTC Portal</span>
                                        <span className="text-[8px]">↗</span>
                                      </a>

                                      {/* Pre-filled Route on ConfirmTkt Link */}
                                      <a
                                        href={confirmTktUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black shadow-xs transition-colors"
                                        title={`Pre-fill route ${extractStationCode(leg.from_stop)} → ${extractStationCode(leg.to_stop)} on ConfirmTkt`}
                                      >
                                        <span>ConfirmTkt Search</span>
                                        <span className="text-[8px]">↗</span>
                                      </a>

                                      {/* Train Running Status & Schedule */}
                                      <a
                                        href={getTrainScheduleUrl(leg)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black shadow-xs transition-colors"
                                        title={`View live schedule and coach layout for Train ${leg.service_number}`}
                                      >
                                        <span>Live Status / Schedule</span>
                                        <span className="text-[8px]">↗</span>
                                      </a>
                                    </div>
                                  )}

                                  {/* Origin & Destination Stops */}
                                  <div className="flex justify-between text-[10px] text-zinc-500 font-medium mt-1">
                                    <span>
                                      {leg.from_stop.name}{' '}
                                      {legIsRail && <span className="text-[9px] font-mono text-zinc-400">({extractStationCode(leg.from_stop)})</span>}{' '}
                                      <strong className="text-zinc-700">{leg.departure_time}</strong>
                                    </span>
                                    <span>→</span>
                                    <span>
                                      <strong className="text-zinc-700">{leg.arrival_time}</strong>{' '}
                                      {leg.to_stop.name}{' '}
                                      {legIsRail && <span className="text-[9px] font-mono text-zinc-400">({extractStationCode(leg.to_stop)})</span>}
                                    </span>
                                  </div>

                                  {/* Fare breakdown & Distance */}
                                  {leg.mode !== 'WALK' && (
                                    <div className="flex flex-wrap justify-between items-center text-[10px] text-zinc-600 font-semibold mt-1 bg-zinc-50/80 px-2 py-0.5 rounded border border-zinc-100">
                                      <span>{leg.distance_km} km • Class: <strong className="text-zinc-900 font-mono">{leg.travel_class || opt.travel_class || travelClass}</strong> • Leg Fare: <strong className="text-zinc-900">₹{leg.price_inr}</strong></span>
                                      {leg.fare_breakdown?.breakdown_text && (
                                        <span className="text-[9px] text-zinc-400 font-normal hidden sm:inline" title={leg.fare_breakdown.breakdown_text}>
                                          {leg.fare_breakdown.breakdown_text}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Intermediate Stops */}
                                  {leg.path && leg.path.length > 2 && (
                                    <div className="mt-2 pl-2 border-l-2 border-zinc-200/50 space-y-1">
                                      <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                                        {leg.path.length - 2} Intermediate Stops
                                      </div>
                                      <div className="max-h-24 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200 space-y-1.5">
                                        {leg.path.slice(1, -1).map((stop: any, sIdx: number) => (
                                          <div key={sIdx} className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold">
                                            <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                                            <span>{stop.name || stop.id}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Panel: Map */}
        <div className="flex-1 bg-zinc-200 relative z-10">
          <div id="map" ref={mapRef} className="w-full h-full absolute inset-0 z-0"></div>
          {/* Subtle overlay logo on map */}
          <div className="absolute bottom-6 left-6 z-[400] pointer-events-none opacity-80 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl shadow-sm border border-zinc-200 flex flex-col gap-0.5">
            <span className="text-xs font-black text-brand-forest">Powered by McRAPTOR</span>
            <span className="text-[9px] font-bold text-zinc-500">OptiTransit Prototype Test Suite</span>
          </div>
        </div>

      </div>

      {/* Floating AI Transit Copilot Chatbot */}
      <TransitCopilotWidget
        activeRoute={processedOptions[expandedIndex ?? 0]}
        fromCity={fromLocation}
        toCity={toLocation}
        travelDate={travelDate}
      />
    </div>
  );
}

export default function TestFrontendPage() {
  return (
    <>
      <style>{`
        .dark-tiles {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
      `}</style>
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-brand-cream text-brand-forest font-black">Loading Test Frontend...</div>}>
        <TestFrontendContent />
      </Suspense>
    </>
  );
}
