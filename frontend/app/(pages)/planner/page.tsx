'use client';

import React, { useState, useEffect, useRef, Suspense, forwardRef, useImperativeHandle } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import CityAutocomplete from '../../components/CityAutocomplete';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

// Helper to strip station suffixes (Junction, Jn, Cantt, Central, etc.) to get pure city name
const cleanCityName = (stationOrCity: string): string => {
  if (!stationOrCity) return '';
  return stationOrCity
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(junction|jn|cantt|cantonment|central|terminus|term|stn|station|railway station|city|main)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
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

function FormattedBotMessage({ text }: { text: string }) {
  return (
    <div className="text-zinc-800">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-xs">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-extrabold text-zinc-950 bg-amber-50/80 px-1 py-0.5 rounded border border-amber-200/60 inline">
              {children}
            </strong>
          ),
          ul: ({ children }) => <ul className="my-1.5 pl-4 list-disc space-y-1 marker:text-brand-forest text-xs">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 pl-4 list-decimal space-y-1 marker:font-bold marker:text-brand-forest text-xs">{children}</ol>,
          li: ({ children }) => <li className="text-[11.5px] leading-relaxed">{children}</li>,
          h1: ({ children }) => <h3 className="font-black text-xs text-brand-forest mt-2 mb-1">{children}</h3>,
          h2: ({ children }) => <h3 className="font-black text-xs text-brand-forest mt-2 mb-1">{children}</h3>,
          h3: ({ children }) => <h3 className="font-black text-xs text-brand-forest mt-2 mb-1">{children}</h3>,
          h4: ({ children }) => <h4 className="font-black text-[11px] text-zinc-900 mt-1.5 mb-0.5">{children}</h4>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-lg border border-zinc-200 shadow-xs">
              <table className="min-w-full divide-y divide-zinc-200 text-[10.5px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-zinc-100 font-bold text-zinc-700">{children}</thead>,
          th: ({ children }) => <th className="px-2.5 py-1.5 text-left font-bold">{children}</th>,
          td: ({ children }) => <td className="px-2.5 py-1.5 border-t border-zinc-100 text-zinc-800">{children}</td>,
          code: ({ children }) => (
            <code className="bg-zinc-100 text-indigo-700 font-mono text-[10px] px-1 py-0.5 rounded border border-zinc-200">
              {children}
            </code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function TransitCopilotWidgetInner({
  activeRoute,
  selectedRouteIndex = 0,
  fromCity,
  toCity,
  travelDate,
}: {
  activeRoute: any;
  selectedRouteIndex?: number;
  fromCity: string;
  toCity: string;
  travelDate: string;
}, ref: React.Ref<{ openAndSend: (msg: string) => void }>) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'te'>('en');
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const initialGreetings: Record<'en' | 'hi' | 'te', string> = {
    en: "Namaste! I am your OptiTransit AI Copilot. I am actively tracking the route highlighted on your screen. Ask me about train numbers, timings, layover safety, or senior citizen comfort.",
    hi: "नमस्ते! मैं आपका ऑप्टिट్రాंजिट एआई साथी हूँ। मैं आपकी स्क्रीन पर चुने गए रूट की निगरानी कर रहा हूँ। ट्रेन नंबर, समय, लेओवर की सुविधा या बुजुर्गों की सहायता के बारे में पूछें।",
    te: "నమస్కారం! నేను మీ ఆప్టిట్రాన్సిట్ ఏఐ కోపైలట్‌ని. మీ స్క్రీన్‌పై ఎంచుకున్న ప్రయాణ మార్గాన్ని నేను పరిశీలిస్తున్నాను. రైలు నంబర్లు, సమయాలు, లేఓవర్ లేదా వృద్ధుల ప్రయాణ సౌలభ్యం గురించి నన్ను అడగండి.",
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

  // Expose openAndSend method for external triggers (e.g. Smart Quota Unlock auto-briefing)
  useImperativeHandle(ref, () => ({
    openAndSend: (msg: string) => {
      setIsOpen(true);
      // Small delay to allow drawer to open before sending
      setTimeout(() => handleSendMessage(msg), 300);
    },
  }));

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

  const currentRouteNum = (selectedRouteIndex ?? 0) + 1;

  const starterChips: Record<'en' | 'hi' | 'te', string[]> = {
    en: [
      `Explain Route #${currentRouteNum} in detail`,
      "How does the Bus Senior Citizen Lower Berth quota work?",
      "How does Alternate Station Boarding unlock confirmed seats?",
      "Is the layover time in this route safe to eat lunch?",
      "Why did OptiTransit recommend this route over direct train?",
    ],
    hi: [
      `मुझे रूट #${currentRouteNum} के बारे में विस्तार से समझाएं`,
      "बस में वरिष्ठ नागरिकों के लिए लोअर बर्थ कोटा कैसे काम करता है?",
      "वैकल्पिक स्टेशन से टिकट बुक करके कन्फर्म सीट कैसे मिलती है?",
      "क्या इस रूट का लेओवर खाना खाने के लिए सुरक्षित है?",
      "सीधी ट्रेन के बजाय यह विकल्प क्यों चुना?",
    ],
    te: [
      `రూట్ #${currentRouteNum} వివరాలను నాకు పూర్తిగా వివరించండి`,
      "బస్సులో వృద్ధుల లోయర్ బెర్త్ రిజర్వేషన్ ఎలా పనిచేస్తుంది?",
      "ఆల్టర్నేట్ స్టేషన్ నుండి బుక్ చేసుకుని కన్ఫర్మ్ సీటు ఎలా పొందవచ్చు?",
      "ఈ రూట్ లేఓవర్ భోజనం చేయడానికి సురక్షితమైనదేనా?",
      "డైరెక్ట్ రైలు కంటే ఈ రూట్ ఎందుకు మంచిది?",
    ],
  };

  const generateSmartResponse = (userText: string, lang: 'en' | 'hi' | 'te'): string => {
    const lower = userText.toLowerCase();

    // Alternate Station Boarding Hack query
    if (lower.includes('alternate') || lower.includes('boarding') || lower.includes('unlock') || lower.includes('वैकल्पिक') || lower.includes('ఆల్టర్నేట్')) {
      if (lang === 'te') {
        return "**స్మార్ట్ కోటా అన్‌లాక్ & బోర్డింగ్ మార్పు పద్ధతి:**\n\nభారతీయ రైల్వేలో మధ్య స్టేషన్ల కోటా (RLWL) త్వరగా నిండిపోతుంది. అయితే రైలు బయలుదేరే ప్రధాన స్టేషన్ లేదా ముందు స్టేషన్ నుండి సాధారణ కోటా (GNWL) లో సీట్లు ఖాళీగా ఉంటాయి.\n\nమీరు ముందు స్టేషన్ నుండి టికెట్ బుక్ చేసుకుని, IRCTCలో 'Change Boarding Station' ద్వారా మీ స్టేషన్‌లోనే ఎక్కవచ్చు. ఇది 100% లీగల్ మరియు మీకు కన్ఫర్మ్ సీటును అందిస్తుంది!";
      }
      if (lang === 'hi') {
        return "**स्मार्ट कोटा अनलॉक एवं बोर्डिंग स्टेशन बदलाव नियम:**\n\nभारतीय रेलवे में बीच के स्टेशनों पर रिमोट कोटा (RLWL) बहुत जल्दी वेटलिस्ट हो जाता है। लेकिन उसी ट्रेन में शुरुआती मुख्य स्टेशन से जनरल कोटा (GNWL) में सीटें खाली रहती हैं।\n\nआप पहले वाले स्टेशन से टिकट बुक करके IRCTC पर 'Change Boarding Point' चुन सकते हैं और अपने वास्तविक स्टेशन से चढ़ सकते हैं। यह 100% वैध है और आपको कन्फर्म बर्थ दिलाता है!";
      }
      return "**Smart Seat Assurance (Boarding Point Change Rule):**\n\nIn Indian Railways, intermediate junctions get small Remote Location Quotas (RLWL) that waitlist fast. However, booking from an upstream major junction accesses the large General Quota (GNWL) with confirmed seats.\n\n**How Confirmed Reservation Works:**\n1. Book the ticket from the upstream station (e.g. GNT to KGP).\n2. Select your actual departure junction (e.g. BZA) as the **Official Boarding Point** on IRCTC.\n3. The ticket is 100% legal, confirmed, and your berth is held for you until you board!";
    }

    // Bus Lower Berth & Senior Quota query
    if (lower.includes('lower berth') || lower.includes('berth') || lower.includes('quota') || lower.includes('కోటా') || lower.includes('कोटा')) {
      if (lang === 'te') {
        return "**బస్సు లోయర్ బెర్త్ మరియు సీనియర్ సిటిజన్ కోటా:**\n\nస్లీపర్ బస్సులలో ఎగువ డెక్ (Upper Deck) ఎక్కడం వృద్ధులకు కష్టం. కాబట్టి మేము:\n• కింది డెక్ (Lower Deck) సీట్లను వృద్ధులకు ప్రత్యేకంగా కేటాయిస్తాము.\n• ప్రైవేట్ మరియు ఆర్టీసీ బస్సులలో లోయర్ బెర్త్‌లకు వర్తించే 10-12% డిఫరెన్షియల్ ధరను పారదర్శకంగా చూపిస్తాము.\n• సీనియర్ సిటిజన్ మోడ్ ఆన్ చేసినప్పుడు లోయర్ బెర్త్‌లు గల బస్సులకు మొదటి ప్రాధాన్యత ఇస్తాము.";
      }
      if (lang === 'hi') {
        return "**बस लोअर बर्थ एवं वरिष्ठ नागरिक कोटा नियम:**\n\nस्लीपर बसों में ऊपरी बर्थ (Upper Deck) पर चढ़ना बुजुर्गों के लिए जोखिम भरा होता है। इसलिए OptiTransit में:\n• नीचे की डेक (Deck L) पर वरिष्ठ नागरिकों के लिए 3-4 बर्थ प्राथमिकता से आरक्षित की जाती हैं।\n• लोअर बर्थ पर लगने वाले 10-12% डिफरेंशियल फेयर का पारदर्शी ब्रेकडाउन दिखाया जाता है।\n• सीनियर सिटीजन मोड ऑन करने पर लोअर बर्थ वाली बसों को टॉप पर रैंक किया जाता है।";
      }
      return "**Bus Lower Berth & Senior Citizen Quota:**\n\nClimbing vertical ladders into Upper Sleeper bunks (Deck U) is dangerous for travelers aged 60+. OptiTransit models commercial bus differential pricing:\n\n1. **Deck Separation:** Distinguishes Upper Deck (ladder required) from Lower Deck (walk-in level).\n2. **Differential Pricing:** Reflects the authentic 10–12% convenience premium for ground-level Lower Berths.\n3. **Senior Citizen Quota:** Reserves 3–4 lower deck berths specifically for elders on participating services.";
    }


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

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user' as const,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    try {
      // Sanitize the active selected route to exclude huge GPS polyline arrays before passing to LLM
      const sanitizedRoute = activeRoute
        ? {
            journey_type: activeRoute.journey_type,
            transfers: activeRoute.transfers,
            travel_class: activeRoute.travel_class,
            overall_status: activeRoute.overall_status,
            available_seats: activeRoute.available_seats,
            wl_number: activeRoute.wl_number,
            total_price_inr: activeRoute.total_price_inr,
            total_duration: activeRoute.total_duration,
            total_duration_mins: activeRoute.total_duration_mins,
            total_distance_km: activeRoute.total_distance_km,
            interchange_station: activeRoute.interchange_station,
            senior_friendly: activeRoute.senior_friendly,
            smart_quota_unlock: activeRoute.smart_quota_unlock,
            legs: (activeRoute.legs || []).map((l: any) => ({
              leg_number: l.leg_number,
              mode: l.mode,
              service_number: l.service_number,
              service_name: l.service_name,
              from_stop: { name: l.from_stop?.name, code: l.from_stop?.id || l.from_stop?.code },
              to_stop: { name: l.to_stop?.name, code: l.to_stop?.id || l.to_stop?.code },
              departure_time: l.departure_time,
              arrival_time: l.arrival_time,
              distance_km: l.distance_km,
              travel_class: l.travel_class,
              seat_status: l.seat_status,
              wl_number: l.wl_number,
              available_seats: l.available_seats,
              price_inr: l.price_inr,
              fare_breakdown: l.fare_breakdown?.breakdown_text,
              seat_breakdown: l.seat_breakdown,
              smart_quota_unlock: l.smart_quota_unlock,
            })),
          }
        : null;

      // Connect to live Groq LLM API route with selected route context
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.filter((m) => m.id !== 'welcome'),
          language: selectedLang,
          selectedRoute: sanitizedRoute,
          searchContext: { fromCity, toCity, travelDate },
        }),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      const botReply = data.reply || generateSmartResponse(text, selectedLang);

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot' as const,
        text: botReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.warn('Live Groq call fallback to local heuristic engine:', err);
      const responseText = generateSmartResponse(text, selectedLang);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot' as const,
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
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
          
          <div className="text-left">
            <div className="text-xs font-black tracking-wide flex items-center gap-1.5">
              <span>AI Transit Copilot</span>
              <span className="text-[9px] bg-emerald-500/30 text-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300/30 uppercase tracking-widest font-mono">
                {selectedLang.toUpperCase()}
              </span>
            </div>
            <div className="text-[10px] text-emerald-100/80 font-medium">⚡ Groq LPU Powered</div>
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
                AI
              </div>
              <div>
                <h3 className="text-xs font-black tracking-wide flex items-center gap-1.5">
                  OptiTransit Copilot
                  <span className="text-[9px] bg-emerald-400/20 text-emerald-200 px-1 py-0.2 rounded border border-emerald-400/30">
                    ⚡ Groq 120B
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
            <div className="bg-emerald-50 px-3.5 py-1.5 border-b border-emerald-200/80 flex items-center justify-between text-[10px] text-zinc-700 font-bold shrink-0">
              <span className="flex items-center gap-1.5 truncate">
                <span className="bg-brand-forest text-white px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                  Route #{currentRouteNum}
                </span>
                <span>{activeRoute.legs?.length || 1} Legs • {activeRoute.total_duration} • ₹{activeRoute.total_price_inr}</span>
              </span>
              <span className="text-emerald-800 uppercase font-mono text-[9px] font-extrabold">
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
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-brand-forest text-white rounded-br-xs font-semibold whitespace-pre-wrap'
                      : 'bg-white text-zinc-800 border border-zinc-200/90 rounded-bl-xs'
                  }`}
                >
                  {m.sender === 'user' ? (
                    m.text
                  ) : (
                    <FormattedBotMessage text={m.text} />
                  )}
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

const TransitCopilotWidget = forwardRef(TransitCopilotWidgetInner);

function PlannerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialFrom = searchParams.get('from') || 'Vijayawada';
  const initialTo = searchParams.get('to') || 'Sambalpur';
  
  // IRCTC 60-day advance reservation date range helper
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getMaxDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  };

  const rawDate = searchParams.get('date');
  const initialDate = (rawDate && rawDate >= getTodayStr() && rawDate <= getMaxDateStr()) ? rawDate : getTodayStr();
  const initialClass = searchParams.get('class') || '3A';

  const [fromLocation, setFromLocation] = useState(initialFrom);
  const [toLocation, setToLocation] = useState(initialTo);
  const [travelDate, setTravelDate] = useState(initialDate);
  const [travelClass, setTravelClass] = useState(initialClass);
  const initialTrain = searchParams.get('train') || '';
  const [trainFilter, setTrainFilter] = useState(initialTrain);
  const [requireBus, setRequireBus] = useState(false);
  const [seniorCitizenMode, setSeniorCitizenMode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [rawApiData, setRawApiData] = useState<any>(null);
  const [processedOptions, setProcessedOptions] = useState<any[]>([]);

  const [filterType, setFilterType] = useState('ALL');
  const [sortCriterion, setSortCriterion] = useState('DURATION');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0); // Auto-expand first result in test view
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0); // Track which route is focused for AI Copilot
  const [modalUnlockData, setModalUnlockData] = useState<{ leg: any; unlock: any; opt: any } | null>(null); // For separate Smart Quota Map & Details Modal

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const polylineGroup = useRef<any>(null);

  const modalMapRef = useRef<HTMLDivElement>(null);
  const modalMapInstance = useRef<any>(null);
  const modalPolylineGroup = useRef<any>(null);
  const copilotRef = useRef<{ openAndSend: (msg: string) => void }>(null);

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

  // Modal Map lifecycle: cleanly initialize map when modal opens, destroy on unmount
  useEffect(() => {
    if (!modalUnlockData || !L) return;

    let mapInst: any = null;
    let group: any = null;

    const timer = setTimeout(() => {
      if (!modalMapRef.current) return;
      try {
        mapInst = L.map(modalMapRef.current).setView([24.0, 82.0], 5);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
          className: 'dark-tiles',
        }).addTo(mapInst);
        group = L.layerGroup().addTo(mapInst);
        modalMapInstance.current = mapInst;
        modalPolylineGroup.current = group;

        drawQuotaUnlockOnModalMap(modalUnlockData.leg, modalUnlockData.unlock, modalUnlockData.opt, mapInst, group);
      } catch (e) {
        console.warn("Modal map init error:", e);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInst) {
        try {
          mapInst.remove();
        } catch (e) {}
        modalMapInstance.current = null;
        modalPolylineGroup.current = null;
      }
    };
  }, [modalUnlockData]);

  const closeModal = () => {
    setModalUnlockData(null);
  };

  const fetchResults = async (overrideTrain?: string) => {
    const activeTrain = overrideTrain !== undefined ? overrideTrain : trainFilter;
    if (fromLocation.trim().toLowerCase() === toLocation.trim().toLowerCase()) {
      setFormError("Source and Destination cannot be the same city. Please select different locations.");
      setRawApiData({ options: [], total_options_found: 0, search_time_ms: 0 });
      setLoading(false);
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      let url = `http://127.0.0.1:8000/api/v4/mcraptor/city-search?source_city=${encodeURIComponent(fromLocation)}&dest_city=${encodeURIComponent(toLocation)}&date=${travelDate}&class_code=${travelClass}&top_k=25&require_bus=${requireBus}&senior_citizen_mode=${seniorCitizenMode}`;
      if (activeTrain && activeTrain.trim()) {
        url += `&target_train=${encodeURIComponent(activeTrain.trim())}`;
      }
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
  }, [initialFrom, initialTo, initialDate, initialClass, seniorCitizenMode, trainFilter]);

  useEffect(() => {
    if (rawApiData) {
      applyFiltersAndSort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawApiData, filterType, sortCriterion]);

  const applyFiltersAndSort = () => {
    if (!rawApiData) return;
    let processed = [...(rawApiData.options || [])];

    if (trainFilter && trainFilter.trim()) {
      const cleanTarget = trainFilter.replace(/\D/g, '');
      processed = processed.filter(opt =>
        opt.legs.some((leg: any) => {
          const legNum = (leg.service_number || '').replace(/\D/g, '');
          return (cleanTarget && legNum === cleanTarget) || (leg.service_number || '').toLowerCase().includes(trainFilter.trim().toLowerCase());
        })
      );
    }

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
      setSelectedRouteIndex(0);
      drawRouteOnMap(processed[0]);
    }
  };

  const handleSwapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
    if (formError) setFormError(null);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromLocation.trim().toLowerCase() === toLocation.trim().toLowerCase()) {
      setFormError("Source and Destination cannot be the same city. Please select different locations.");
      return;
    }
    setFormError(null);
    setTrainFilter('');
    router.replace(`/planner?from=${encodeURIComponent(fromLocation)}&to=${encodeURIComponent(toLocation)}&date=${travelDate}&class=${travelClass}`);
    fetchResults('');
  };

  const drawRouteOnMap = (option: any) => {
    if (!polylineGroup.current || !L) return;
    polylineGroup.current.clearLayers();

    const bounds = L.latLngBounds([]);
    const legColors: Record<string, string> = {
      RAIL: "#3b82f6",     // Blue
      TRAIN: "#3b82f6",    // Blue
      BUS: "#f59e0b",      // Amber
      FLIGHT: "#ef4444",   // Red
      WALK: "#d946ef",     // Vivid Fuchsia / Magenta (distinct from train & bus)
    };

    option.legs.forEach((leg: any) => {
      const isWalk = leg.mode === 'WALK';
      const color = legColors[leg.mode] || "#64748b";
      const coordsWithData = (leg.path || []).filter((pt: any) => pt.latitude !== 0 && pt.longitude !== 0);
      const coords = coordsWithData.map((pt: any) => [pt.latitude, pt.longitude]);

      if (coords.length > 0) {
        const polyline = L.polyline(coords, {
          color: color,
          weight: isWalk ? 3.5 : 4.5,
          opacity: 0.85,
          dashArray: isWalk ? '6, 6' : undefined,
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

        L.marker(startPt, { icon: createIcon(isWalk ? '#d946ef' : '#10b981') })
          .bindPopup(`<b>${leg.from_stop.name}</b><br>${isWalk ? 'Transfer Start' : 'Dep: ' + leg.departure_time}`)
          .addTo(polylineGroup.current);

        L.marker(endPt, { icon: createIcon(isWalk ? '#d946ef' : '#ef4444') })
          .bindPopup(`<b>${leg.to_stop.name}</b><br>${isWalk ? 'Transfer End' : 'Arr: ' + leg.arrival_time}`)
          .addTo(polylineGroup.current);
      }
    });

    if (bounds.isValid()) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Confirmed Seat Assurance visualization inside the separate modal map:
  // Shows the main journey route, along with the real boarding source, destination of book,
  // reservation origin, and actual destination deboarding.
  const drawQuotaUnlockOnModalMap = (leg: any, unlock: any, opt: any, targetMap: any, targetGroup: any) => {
    if (!targetGroup || !targetMap || !L) return;
    targetGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Render the entire Main Route in subtle slate lines so the passenger sees full context
    if (opt && opt.legs && opt.legs.length > 0) {
      opt.legs.forEach((mainLeg: any) => {
        const coords = (mainLeg.path || [])
          .filter((pt: any) => pt.latitude !== 0 && pt.longitude !== 0)
          .map((pt: any) => [pt.latitude, pt.longitude]);
        if (coords.length > 1) {
          const mainLine = L.polyline(coords, {
            color: mainLeg.mode === 'BUS' ? '#f59e0b' : mainLeg.mode === 'WALK' ? '#d946ef' : '#64748b',
            weight: 3,
            opacity: 0.45,
            dashArray: mainLeg.mode === 'WALK' ? '4, 6' : undefined,
          }).addTo(targetGroup);
          bounds.extend(mainLine.getBounds());
        }
      });
    }

    const pathPoints = (leg?.path || []).filter((pt: any) => pt.latitude !== 0 && pt.longitude !== 0);
    if (pathPoints.length >= 2) {
      // Find indices of key stations along the rail path
      const findStationIdx = (code: string) => {
        const cleanCode = code.replace(/^(RAIL:|TRAIN_:?)/i, '').toUpperCase();
        return pathPoints.findIndex((pt: any) => {
          const ptCode = ((pt.id || pt.code || pt.name || '')).replace(/^(RAIL:|TRAIN_:?)/i, '').toUpperCase();
          return ptCode === cleanCode || (pt.name || '').toUpperCase().includes(cleanCode);
        });
      };

      const bookFromIdx = findStationIdx(unlock.book_from.code);
      const actualBoardIdx = findStationIdx(unlock.actual_boarding.code);
      const actualDeboardIdx = findStationIdx(unlock.actual_deboarding.code);
      const bookToIdx = findStationIdx(unlock.book_to.code);

      // Segment 1: Upstream Extended Reservation Segment (book_from -> actual_boarding)
      const upStart = bookFromIdx >= 0 ? bookFromIdx : 0;
      const upEnd = actualBoardIdx >= 0 ? actualBoardIdx : upStart;

      if (upEnd > upStart) {
        const upCoords = pathPoints.slice(upStart, upEnd + 1).map((pt: any) => [pt.latitude, pt.longitude]);
        if (upCoords.length >= 2) {
          const upLine = L.polyline(upCoords, {
            color: '#6366f1', // indigo
            weight: 4.5,
            opacity: 0.85,
            dashArray: '8, 8',
          }).addTo(targetGroup);
          bounds.extend(upLine.getBounds());

          const midUp = upCoords[Math.floor(upCoords.length / 2)];
          L.marker(midUp, {
            icon: L.divIcon({
              className: '',
              html: `<div style="background:#4f46e5;color:white;font-size:9px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);">Extended Reservation Segment</div>`,
              iconAnchor: [65, 10],
            }),
          }).addTo(targetGroup);
        }
      }

      // Segment 2: Your Traveled Journey (actual_boarding -> actual_deboarding) — SOLID EMERALD
      const rideStart = actualBoardIdx >= 0 ? actualBoardIdx : upEnd;
      const rideEnd = actualDeboardIdx >= 0 ? actualDeboardIdx : (bookToIdx >= 0 ? bookToIdx : pathPoints.length - 1);
      const rideCoords = pathPoints.slice(rideStart, rideEnd + 1).map((pt: any) => [pt.latitude, pt.longitude]);

      if (rideCoords.length >= 2) {
        const rideLine = L.polyline(rideCoords, {
          color: '#059669', // emerald
          weight: 5.5,
          opacity: 0.95,
        }).addTo(targetGroup);
        bounds.extend(rideLine.getBounds());

        const midRide = rideCoords[Math.floor(rideCoords.length / 2)];
        L.marker(midRide, {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#059669;color:white;font-size:9px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);">Your Traveled Journey</div>`,
            iconAnchor: [55, 10],
          }),
        }).addTo(targetGroup);
      }

      // Segment 3: Downstream Extended Reservation Segment (actual_deboarding -> book_to)
      const dnStart = rideEnd;
      const dnEnd = bookToIdx >= 0 ? bookToIdx : dnStart;

      if (dnEnd > dnStart) {
        const dnCoords = pathPoints.slice(dnStart, dnEnd + 1).map((pt: any) => [pt.latitude, pt.longitude]);
        if (dnCoords.length >= 2) {
          const dnLine = L.polyline(dnCoords, {
            color: '#6366f1', // indigo
            weight: 4.5,
            opacity: 0.85,
            dashArray: '8, 8',
          }).addTo(targetGroup);
          bounds.extend(dnLine.getBounds());

          const midDn = dnCoords[Math.floor(dnCoords.length / 2)];
          L.marker(midDn, {
            icon: L.divIcon({
              className: '',
              html: `<div style="background:#4f46e5;color:white;font-size:9px;font-weight:700;padding:2px 8px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);">Extended Reservation Segment</div>`,
              iconAnchor: [65, 10],
            }),
          }).addTo(targetGroup);
        }
      }

      // Key Station Markers: Source of Book, Real Boarding Source, Real Deboarding, Dest of Book
      // 1. Source of Book (if upstream of actual boarding)
      if (upEnd > upStart && upStart >= 0 && upStart < pathPoints.length) {
        const pt = pathPoints[upStart];
        L.marker([pt.latitude, pt.longitude], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#4f46e5;width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        })
          .bindPopup(`<b>Ticket Reservation Origin</b><br/>${unlock.book_from.name} (${unlock.book_from.code})<br/><span style="color:#64748b;font-size:10px;">Seat reserved from here to access General Quota</span>`)
          .bindTooltip(`Ticket Reservation Origin: ${unlock.book_from.name} (${unlock.book_from.code})`, { className: 'bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded', direction: 'top' })
          .addTo(targetGroup);
      }

      // 2. Real Boarding Source (Where passenger actually boards)
      if (actualBoardIdx >= 0 && actualBoardIdx < pathPoints.length) {
        const pt = pathPoints[actualBoardIdx];
        L.marker([pt.latitude, pt.longitude], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#059669;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(5,150,105,0.7);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        })
          .bindPopup(`<b>Your Boarding Station</b><br/>${unlock.actual_boarding.name} (${unlock.actual_boarding.code})<br/><span style="color:#059669;font-weight:700;font-size:10px;">Official Boarding Point — you board here</span>`)
          .bindTooltip(`Your Boarding Station: ${unlock.actual_boarding.name} (${unlock.actual_boarding.code})`, { className: 'bg-emerald-900 text-white text-[10px] font-bold px-2 py-1 rounded', direction: 'top' })
          .addTo(targetGroup);
      }

      // 3. Real Deboarding Destination (Where passenger actually exits)
      if (actualDeboardIdx >= 0 && actualDeboardIdx < pathPoints.length) {
        const pt = pathPoints[actualDeboardIdx];
        L.marker([pt.latitude, pt.longitude], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#e11d48;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(225,29,72,0.7);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        })
          .bindPopup(`<b>Your Deboarding Station</b><br/>${unlock.actual_deboarding.name} (${unlock.actual_deboarding.code})<br/><span style="color:#e11d48;font-weight:700;font-size:10px;">Your exit point — you deboard here</span>`)
          .bindTooltip(`Your Deboarding Station: ${unlock.actual_deboarding.name} (${unlock.actual_deboarding.code})`, { className: 'bg-rose-900 text-white text-[10px] font-bold px-2 py-1 rounded', direction: 'top' })
          .addTo(targetGroup);
      }

      // 4. Destination of Book (if extended past deboarding)
      if (dnEnd > dnStart && dnEnd >= 0 && dnEnd < pathPoints.length) {
        const pt = pathPoints[dnEnd];
        L.marker([pt.latitude, pt.longitude], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#7c3aed;width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        })
          .bindPopup(`<b>Ticket Reservation Destination</b><br/>${unlock.book_to.name} (${unlock.book_to.code})<br/><span style="color:#64748b;font-size:10px;">Ticket extended here to secure confirmed seat</span>`)
          .bindTooltip(`Ticket Reservation Destination: ${unlock.book_to.name} (${unlock.book_to.code})`, { className: 'bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 rounded', direction: 'top' })
          .addTo(targetGroup);
      }
    }

    // 3. Mark overall Journey Departure & Journey Arrival from the full route
    if (opt && opt.legs && opt.legs.length > 0) {
      const firstLeg = opt.legs[0];
      const lastLeg = opt.legs[opt.legs.length - 1];

      if (firstLeg.path && firstLeg.path.length > 0) {
        const p0 = firstLeg.path[0];
        if (p0.latitude !== 0 && p0.longitude !== 0) {
          L.circleMarker([p0.latitude, p0.longitude], {
            radius: 5,
            fillColor: '#0f172a',
            color: '#ffffff',
            weight: 2,
            opacity: 0.9,
            fillOpacity: 1
          })
            .bindTooltip(`Journey Departure: ${firstLeg.from_stop?.name || ''}`, { className: 'bg-zinc-800 text-white text-[9px] font-bold px-2 py-0.5 rounded', direction: 'bottom' })
            .addTo(targetGroup);
        }
      }

      if (lastLeg.path && lastLeg.path.length > 0) {
        const pN = lastLeg.path[lastLeg.path.length - 1];
        if (pN.latitude !== 0 && pN.longitude !== 0) {
          L.circleMarker([pN.latitude, pN.longitude], {
            radius: 5,
            fillColor: '#0f172a',
            color: '#ffffff',
            weight: 2,
            opacity: 0.9,
            fillOpacity: 1
          })
            .bindTooltip(`Journey Destination: ${lastLeg.to_stop?.name || ''}`, { className: 'bg-zinc-800 text-white text-[9px] font-bold px-2 py-0.5 rounded', direction: 'bottom' })
            .addTo(targetGroup);
        }
      }
    }

    if (bounds.isValid()) {
      targetMap.fitBounds(bounds, { padding: [45, 45] });
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'RAIL':
      case 'TRAIN': return 'Train';
      case 'BUS': return 'Bus';
      case 'FLIGHT': return 'Flight';
      case 'WALK': return 'Transfer';
      default: return 'Transit';
    }
  };

  const isRailMode = (mode: string) => mode === 'RAIL' || mode === 'TRAIN';

  return (
    <div className="flex flex-col h-screen bg-brand-cream overflow-hidden text-brand-charcoal">
      {/* Modern Top Header & Capsule Search Dock */}
      <header className="bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs z-30">
        <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => router.push('/')}>
          <span className="text-xl font-black text-brand-forest tracking-tight">Opti<span className="text-zinc-900">Transit</span></span>
          <span className="text-[10px] font-extrabold bg-emerald-100/80 text-emerald-800 border border-emerald-300/80 px-2 py-0.5 rounded-full shadow-2xs">
            Multi-Modal Route Planner
          </span>
        </div>

        {/* Unified Search Capsule Form */}
        <form onSubmit={handleManualSearch} className="flex flex-wrap items-center gap-2 bg-zinc-50 border border-zinc-200/90 rounded-2xl p-1.5 shadow-xs">
          {/* From Location */}
          <div className="w-40 relative">
            <CityAutocomplete
              value={fromLocation}
              onChange={(val) => {
                setFromLocation(val);
                if (formError) setFormError(null);
              }}
              inputClassName="bg-white border border-zinc-200 hover:border-zinc-300 focus:border-brand-forest rounded-xl px-3.5 py-1.5 text-xs font-bold text-zinc-900 w-full shadow-2xs outline-none transition-all placeholder:text-zinc-400"
            />
          </div>

          {/* Quick Swap Button */}
          <button
            type="button"
            onClick={handleSwapLocations}
            title="Swap departure and destination"
            className="w-7 h-7 rounded-xl bg-zinc-200/60 hover:bg-zinc-300 text-zinc-600 hover:text-zinc-900 flex items-center justify-center text-xs font-bold transition-all duration-300 hover:rotate-180 cursor-pointer shadow-2xs"
          >
            ⇄
          </button>

          {/* To Location */}
          <div className="w-40 relative">
            <CityAutocomplete
              value={toLocation}
              onChange={(val) => {
                setToLocation(val);
                if (formError) setFormError(null);
              }}
              inputClassName="bg-white border border-zinc-200 hover:border-zinc-300 focus:border-brand-forest rounded-xl px-3.5 py-1.5 text-xs font-bold text-zinc-900 w-full shadow-2xs outline-none transition-all placeholder:text-zinc-400"
            />
          </div>

          <div className="h-5 w-px bg-zinc-200 mx-0.5 hidden sm:block"></div>

          {/* Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={travelDate}
              min={getTodayStr()}
              max={getMaxDateStr()}
              onChange={(e) => {
                const val = e.target.value;
                const today = getTodayStr();
                const maxDate = getMaxDateStr();
                if (val < today) {
                  setTravelDate(today);
                } else if (val > maxDate) {
                  setTravelDate(maxDate);
                } else {
                  setTravelDate(val);
                }
              }}
              className="bg-white border border-zinc-200 hover:border-zinc-300 focus:border-brand-forest rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-800 shadow-2xs outline-none transition-all cursor-pointer"
            />
          </div>

          {/* Class Selector */}
          <select
            value={travelClass}
            onChange={(e) => setTravelClass(e.target.value)}
            className="bg-white border border-zinc-200 hover:border-zinc-300 focus:border-brand-forest rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-800 shadow-2xs outline-none transition-all cursor-pointer"
          >
            <option value="3A">Class: 3A (3-Tier AC)</option>
            <option value="2A">Class: 2A (2-Tier AC)</option>
            <option value="1A">Class: 1A (First AC)</option>
            <option value="SL">Class: SL (Sleeper)</option>
            <option value="CC">Class: CC (Chair Car)</option>
            <option value="2S">Class: 2S (Second Sitting)</option>
          </select>

          <div className="h-5 w-px bg-zinc-200 mx-0.5 hidden sm:block"></div>

          {/* Bus Checkbox Toggle */}
          <label className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer px-2.5 py-1.5 rounded-xl border transition-all ${requireBus ? 'bg-amber-100/90 border-amber-300 text-amber-900 shadow-xs' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100 shadow-2xs'}`}>
            <input type="checkbox" checked={requireBus} onChange={(e) => setRequireBus(e.target.checked)} className="accent-amber-600 w-3.5 h-3.5 rounded" />
            <span>Bus</span>
          </label>

          {/* Senior Mode Toggle */}
          <label className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer px-2.5 py-1.5 rounded-xl border transition-all ${seniorCitizenMode ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-xs font-extrabold' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100 shadow-2xs'}`}>
            <input
              type="checkbox"
              checked={seniorCitizenMode}
              onChange={(e) => setSeniorCitizenMode(e.target.checked)}
              className="accent-amber-600 w-3.5 h-3.5 rounded"
            />
            <span>Senior Mode (60+)</span>
          </label>

          {/* Search Button */}
          <button
            type="submit"
            className="bg-brand-forest hover:bg-emerald-800 text-white rounded-xl px-4 py-1.5 text-xs font-black shadow-md hover:shadow-emerald-700/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1"
          >
            <span>Search</span>
            <span className="text-[10px]">→</span>
          </button>
        </form>
      </header>

      {/* Same Source/Destination Validation Banner */}
      {formError && (
        <div className="bg-rose-100 border-b border-rose-300 text-rose-900 px-6 py-2.5 text-xs font-bold flex items-center justify-between z-30 shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{formError}</span>
          </div>
          <button
            onClick={() => setFormError(null)}
            className="text-rose-700 hover:text-black font-extrabold text-sm ml-4 px-2 py-0.5 rounded hover:bg-rose-200 transition-colors"
            title="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left Panel: Filters & Results */}
        <div className="w-[510px] bg-white border-r border-zinc-200 flex flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.03)]">

          {/* Controls Bar */}
          <div className="p-4 border-b border-zinc-100 bg-gradient-to-b from-brand-cream/40 to-transparent">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-sm font-black text-brand-forest tracking-tight">Optimal Multi-Transit Routes</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-emerald-100/80 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-300/80">
                    {loading ? 'Searching Pareto routes...' : `${processedOptions.length} Routes • ${rawApiData?.search_time_ms || 0}ms`}
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400">McRAPTOR Engine</span>
                </div>
              </div>
              <div className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span>Direct Booking</span>
              </div>
            </div>

            {/* 1-Click Filter Chips & Quick Sort Strip */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${filterType === 'ALL' ? 'bg-zinc-900 text-white shadow-xs' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}
                >
                  All ({rawApiData?.total_options_found || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('DIRECT')}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${filterType === 'DIRECT' ? 'bg-brand-forest text-white shadow-xs' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}
                >
                  Direct (0 Transfers)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('AVAILABLE_ONLY')}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${filterType === 'AVAILABLE_ONLY' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}
                >
                  Confirmed (AVL)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('ONE_TRANSFER')}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${filterType === 'ONE_TRANSFER' ? 'bg-indigo-700 text-white shadow-xs' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}
                >
                  1-Transfer
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-xs">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sort Options:</span>
                <select
                  value={sortCriterion}
                  onChange={(e) => setSortCriterion(e.target.value)}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-lg px-2 py-0.5 text-[10px] font-extrabold outline-none cursor-pointer transition-all"
                >
                  <option value="DURATION">Fastest Duration</option>
                  <option value="DEPARTURE_TIME">Departure Time</option>
                  <option value="PRICE">Lowest Price</option>
                  <option value="DISTANCE">Shortest Distance</option>
                  <option value="SEAT_STATUS">Confirmed Status</option>
                </select>
              </div>
            </div>
          </div>

          {trainFilter && (
            <div className="mx-4 mt-3 -mb-1 flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-900 shadow-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Filtered to Train #{trainFilter}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTrainFilter('');
                  const params = new URLSearchParams(window.location.search);
                  params.delete('train');
                  router.replace(`${window.location.pathname}?${params.toString()}`);
                }}
                className="text-[10px] text-emerald-700 hover:text-black underline font-extrabold cursor-pointer"
              >
                Show All Trains
              </button>
            </div>
          )}

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
                const isSelected = selectedRouteIndex === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      drawRouteOnMap(opt);
                      setSelectedRouteIndex(idx);
                      setExpandedIndex(isExpanded ? null : idx);
                    }}
                    className={`group cursor-pointer rounded-2xl border p-4 shadow-sm transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-forest/40 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:border-brand-forest/40 hover:shadow-lg hover:shadow-brand-forest/5 ${
                      isSelected ? 'ring-2 ring-emerald-500/80 shadow-md shadow-emerald-500/10' : ''
                    } ${isExpanded
                        ? 'border-brand-forest/40 bg-brand-cream/20 shadow-md shadow-brand-forest/5'
                        : 'border-zinc-200/80 bg-white hover:bg-brand-cream/5'
                      }`}
                  >
                    {/* Card Header: Duration & Price */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-lg font-black text-brand-forest">{opt.total_duration}</span>
                        <span className="text-[10px] text-zinc-400 font-bold ml-2 uppercase tracking-wider">{opt.transfers} Transfers</span>
                        {isSelected && (
                          <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full ml-2 shadow-xs uppercase tracking-wider inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            AI Focus
                          </span>
                        )}
                        {opt.senior_friendly && (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black px-2 py-0.5 rounded-full ml-1.5 shadow-xs uppercase tracking-wider inline-flex items-center gap-1">
                            Senior Friendly
                          </span>
                        )}
                        {opt.smart_quota_unlock && (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-full ml-1.5 shadow-xs uppercase tracking-wider inline-flex items-center gap-1">
                            Confirmed Seat Option
                          </span>
                        )}
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

                    {/* Horizontal Visual Flight/Rail Schedule Track */}
                    {(() => {
                      const firstLeg = opt.legs[0];
                      const lastLeg = opt.legs[opt.legs.length - 1];
                      if (!firstLeg || !lastLeg) return null;

                      const cleanDepTime = firstLeg.departure_time?.replace(/\s*\(Day\s*\d+\)/i, '') || '--:--';
                      const cleanArrTime = lastLeg.arrival_time || '--:--';
                      const fromCode = extractStationCode(firstLeg.from_stop) || 'SRC';
                      const toCode = extractStationCode(lastLeg.to_stop) || 'DST';

                      return (
                        <div className="flex items-center justify-between py-2.5 px-3 bg-zinc-50/90 rounded-xl border border-zinc-100 mb-2.5">
                          {/* Departure Node */}
                          <div className="flex flex-col text-left min-w-[70px]">
                            <span className="text-sm font-black text-zinc-900 tracking-tight">{cleanDepTime}</span>
                            <span className="text-[11px] font-extrabold text-indigo-900 font-mono">{fromCode}</span>
                            <span className="text-[9px] text-zinc-400 font-bold truncate max-w-[85px]" title={firstLeg.from_stop?.name}>
                              {firstLeg.from_stop?.name}
                            </span>
                          </div>

                          {/* Center Progress Line with Duration */}
                          <div className="flex-1 flex flex-col items-center px-2 max-w-[200px]">
                            <span className="text-[10px] font-extrabold text-brand-forest mb-0.5">{opt.total_duration}</span>
                            <div className="w-full flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full border-2 border-brand-forest bg-white shrink-0"></div>
                              <div className="flex-1 h-0.5 bg-zinc-300 relative flex items-center justify-center">
                                {opt.transfers > 0 && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" title={`${opt.transfers} Transfer Point`}></span>
                                )}
                              </div>
                              <div className="w-2 h-2 rounded-full border-2 border-zinc-500 bg-white shrink-0"></div>
                            </div>
                            <span className="text-[9px] font-bold text-zinc-400 mt-0.5 uppercase tracking-wider">
                              {opt.transfers === 0 ? 'Direct Journey' : `${opt.transfers} Transfer • ${opt.interchange_station ? opt.interchange_station.name : 'via Layover'}`}
                            </span>
                          </div>

                          {/* Arrival Node */}
                          <div className="flex flex-col text-right min-w-[70px]">
                            <span className="text-sm font-black text-zinc-900 tracking-tight">{cleanArrTime}</span>
                            <span className="text-[11px] font-extrabold text-indigo-900 font-mono">{toCode}</span>
                            <span className="text-[9px] text-zinc-400 font-bold truncate max-w-[85px]" title={lastLeg.to_stop?.name}>
                              {lastLeg.to_stop?.name}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Prominent Confirmed Berth Assurance Callout Banner directly on Card */}
                    {opt.smart_quota_unlock && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalUnlockData({ leg: opt.legs[0], unlock: opt.smart_quota_unlock, opt });
                        }}
                        className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300/90 hover:border-emerald-500 flex items-center justify-between gap-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer group/unlock mb-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                          <div className="text-left">
                            <span className="text-[11px] font-black text-emerald-950 block leading-tight">
                              Confirmed Berth via {opt.smart_quota_unlock.book_to.name}
                            </span>
                            <span className="text-[9px] text-emerald-800 font-semibold">
                              AVL {opt.smart_quota_unlock.unlocked_seats} Confirmed • +₹{opt.smart_quota_unlock.extra_fare_inr} fare difference
                            </span>
                          </div>
                        </div>
                        <span className="bg-emerald-700 group-hover/unlock:bg-emerald-800 text-white text-[9px] font-black px-2.5 py-1 rounded-lg shadow-2xs transition-colors shrink-0 flex items-center gap-1">
                          <span>View Map</span>
                          <span>↗</span>
                        </span>
                      </div>
                    )}

                    {/* Expand / Collapse Indicator */}
                    {!isExpanded && (
                      <div className="text-center mt-1 pt-2 border-t border-zinc-100/80">
                        <span className="text-[10px] font-black text-brand-forest/60 group-hover:text-brand-forest uppercase tracking-widest flex items-center justify-center gap-1">
                          View {opt.legs.length} Leg Journey Details
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
                                    {/* Leg Name or Train Booking Link */}
                                    {legIsRail ? (
                                      <span className="text-[12px] font-black text-zinc-900 tracking-wide bg-blue-50/80 text-blue-950 px-2 py-0.5 rounded border border-blue-200/60">
                                        {leg.service_name}
                                      </span>
                                    ) : leg.mode === 'WALK' ? (
                                      <p className="text-[11px] font-black text-fuchsia-800 tracking-wide">
                                        Auto / Cab Transfer ({leg.service_name || 'Travel on your own'})
                                      </p>
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
                                    {leg.mode === 'WALK' && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 font-mono tracking-wider shadow-sm">
                                        Self-Transfer
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

                                  {/* Dynamic Bus Inventory & Deck/Seat Layout */}
                                  {leg.mode === 'BUS' && leg.seat_breakdown && (
                                    <div className="mt-2.5 p-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-xs space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-black text-amber-950 text-xs">
                                            {leg.seat_breakdown.bus_type || 'Commercial Intercity Bus'}
                                          </span>
                                          <span className="text-[9px] font-mono font-bold bg-amber-200/60 text-amber-900 px-1.5 py-0.5 rounded">
                                            {leg.seat_breakdown.total_available} Seats Left
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                                          {leg.seat_breakdown.berth_type_guaranteed}
                                        </span>
                                      </div>

                                      {leg.seat_breakdown.layout_mode === 'SLEEPER' ? (
                                        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                                          <span className="bg-white border border-amber-200 text-zinc-700 px-2.5 py-1 rounded-lg shadow-2xs">
                                            Upper Deck: {leg.seat_breakdown.sleeper_upper_seats} Berths (₹{leg.seat_breakdown.upper_deck_fare_inr})
                                          </span>
                                          <span className="bg-white border border-amber-200 text-emerald-800 px-2.5 py-1 rounded-lg shadow-2xs">
                                            Lower Deck: {leg.seat_breakdown.sleeper_lower_seats} Berths (₹{leg.seat_breakdown.lower_deck_fare_inr})
                                          </span>
                                          <span className="bg-amber-200/90 border border-amber-400 text-amber-950 px-2.5 py-1 rounded-lg font-black flex items-center gap-1 shadow-2xs">
                                            Senior Lower Quota: {leg.seat_breakdown.senior_lower_reserved} Berths (₹{leg.seat_breakdown.senior_berth_fare_inr})
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                                          <span className="bg-white border border-amber-200 text-zinc-700 px-2.5 py-1 rounded-lg shadow-2xs">
                                            Window Seats: {leg.seat_breakdown.window_seats} (₹{leg.seat_breakdown.window_fare_inr})
                                          </span>
                                          <span className="bg-white border border-amber-200 text-zinc-700 px-2.5 py-1 rounded-lg shadow-2xs">
                                            Aisle Seats: {leg.seat_breakdown.aisle_seats} (₹{leg.seat_breakdown.aisle_fare_inr})
                                          </span>
                                          <span className="bg-amber-200/90 border border-amber-400 text-amber-950 px-2.5 py-1 rounded-lg font-black flex items-center gap-1 shadow-2xs">
                                            Senior Priority (Row 1-2): {leg.seat_breakdown.senior_lower_reserved} Seats (₹{leg.seat_breakdown.senior_berth_fare_inr})
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Smart Quota Unlock / Alternate Boarding — COMPACT CARD WITH MODAL TRIGGER */}
                                  {leg.smart_quota_unlock && (() => {
                                    const unlock = leg.smart_quota_unlock;
                                    const trainNo = unlock.train_number || leg.service_number || '';
                                    const trainTitle = unlock.train_name || leg.service_name || '';

                                    return (
                                      <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-blue-50/70 border border-emerald-300 shadow-xs">
                                        {/* Header row: Train info + Confirmed seat badge */}
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                                                Confirmed Seat Option
                                              </span>
                                              {trainNo && (
                                                <span className="bg-zinc-800 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded">
                                                  Train {trainNo}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[11px] font-extrabold text-zinc-800 mt-1">
                                              {trainTitle}
                                            </p>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block shadow-2xs">
                                              AVL {unlock.unlocked_seats} Confirmed
                                            </span>
                                            <span className="text-[9px] font-bold text-emerald-800 block mt-0.5">
                                              +₹{unlock.extra_fare_inr} fare difference
                                            </span>
                                          </div>
                                        </div>

                                        {/* Basic route & official boarding station summary */}
                                        <div className="mt-2 py-2 px-2.5 bg-white/95 rounded-xl border border-emerald-200/80 text-[10.5px] space-y-1.5">
                                          <div className="flex items-center justify-between text-zinc-700">
                                            <span className="font-semibold text-zinc-500">Ticket Reservation:</span>
                                            <span className="font-bold text-indigo-900">
                                              {unlock.book_from.name} ({unlock.book_from.code}) → {unlock.book_to.name} ({unlock.book_to.code})
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-zinc-700 border-t border-zinc-100 pt-1">
                                            <span className="font-semibold text-zinc-500">Your Boarding Station:</span>
                                            <span className="font-extrabold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 text-[10px]">
                                              {unlock.actual_boarding.name} ({unlock.actual_boarding.code})
                                            </span>
                                          </div>
                                        </div>

                                        {/* Action button: Open dedicated Map Visualizer & Boarding Advisory */}
                                        <div className="mt-2.5">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setModalUnlockData({ leg, unlock, opt });
                                            }}
                                            className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold py-2 px-3 rounded-xl shadow-xs transition-colors cursor-pointer"
                                          >
                                            <span>View Confirmed Berth Strategy & Map</span>
                                            <span className="text-[9px]">↗</span>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })()}

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

      {/* Dedicated Smart Seat Assurance & Route Visualizer Modal Window */}
      {modalUnlockData && (() => {
        const { leg, unlock, opt } = modalUnlockData;
        const trainNo = unlock.train_number || leg.service_number || '';
        const trainTitle = unlock.train_name || leg.service_name || '';

        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-zinc-200 text-zinc-800 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header (Fixed Top) */}
              <div className="p-5 sm:p-6 pb-3 border-b border-zinc-100 shrink-0">
                <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-emerald-700 text-white text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                      Confirmed Berth Assurance
                    </span>
                    {trainNo && (
                      <span className="bg-zinc-800 text-white font-mono text-xs font-bold px-2 py-0.5 rounded">
                        Train {trainNo}
                      </span>
                    )}
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                      AVL {unlock.unlocked_seats} Confirmed
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-600 mt-1.5">
                    {trainTitle} • Fare Difference: <span className="text-emerald-700 font-extrabold">+₹{unlock.extra_fare_inr}</span>
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-black flex items-center justify-center font-bold text-sm transition-colors shrink-0"
                  title="Close window"
                >
                  ✕
                </button>
                </div>
              </div>

              {/* Modal Scrollable Body Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 pt-3 space-y-4">

              {/* Connected Station Journey Stepper Track */}
              <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-200/90 shadow-2xs">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">
                  Official Reservation Path & Your Boarding Segment
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200/80 shadow-2xs relative">
                    <span className="text-[9px] font-extrabold text-indigo-700 block uppercase tracking-wider">1. Ticket Origin</span>
                    <span className="font-bold text-zinc-900 block truncate text-xs mt-0.5">{unlock.book_from.name}</span>
                    <span className="text-[10px] font-mono text-indigo-600 font-bold">{unlock.book_from.code}</span>
                  </div>

                  <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-300 shadow-2xs relative ring-1 ring-emerald-400/30">
                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-800 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>2. You Board Here</span>
                    </div>
                    <span className="font-black text-emerald-950 block truncate text-xs mt-0.5">{unlock.actual_boarding.name}</span>
                    <span className="text-[10px] font-mono text-emerald-700 font-black">{unlock.actual_boarding.code}</span>
                  </div>

                  <div className="bg-rose-50/80 p-2.5 rounded-xl border border-rose-300 shadow-2xs relative ring-1 ring-rose-400/30">
                    <div className="flex items-center gap-1 text-[9px] font-black text-rose-800 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>3. You Deboard Here</span>
                    </div>
                    <span className="font-black text-rose-950 block truncate text-xs mt-0.5">{unlock.actual_deboarding.name}</span>
                    <span className="text-[10px] font-mono text-rose-700 font-black">{unlock.actual_deboarding.code}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200/80 shadow-2xs relative">
                    <span className="text-[9px] font-extrabold text-indigo-700 block uppercase tracking-wider">4. Ticket Destination</span>
                    <span className="font-bold text-zinc-900 block truncate text-xs mt-0.5">{unlock.book_to.name}</span>
                    <span className="text-[10px] font-mono text-indigo-600 font-bold">{unlock.book_to.code}</span>
                  </div>
                </div>
              </div>

              {/* Dedicated Embedded Leaflet Map for Route & Boarding Points */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-zinc-800">
                    Route & Station Reservation Map
                  </span>
                  <div className="flex items-center gap-3 text-[10px] font-bold flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <span className="w-3.5 h-1 bg-emerald-600 rounded-full inline-block"></span>
                      Your Traveled Journey
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-indigo-700">
                      <span className="w-3.5 h-0.5 bg-indigo-500 inline-block" style={{ borderTop: '2px dashed #6366f1' }}></span>
                      Extended Reservation
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-zinc-500">
                      <span className="w-3.5 h-0.5 bg-zinc-400 inline-block"></span>
                      Full Route Context
                    </span>
                  </div>
                </div>
                <div
                  ref={modalMapRef}
                  className="h-52 w-full rounded-2xl overflow-hidden border border-zinc-200 shadow-inner bg-zinc-100"
                />
              </div>

              {/* Side-by-Side Comparison Table */}
              <div className="overflow-x-auto rounded-xl border border-zinc-200 shadow-xs">
                <table className="min-w-full text-xs">
                  <thead className="bg-zinc-100 text-zinc-700 font-black">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] uppercase">Parameter</th>
                      <th className="px-3 py-2 text-center text-[10px] uppercase text-rose-700 bg-rose-50 border-l border-zinc-200">
                        Standard Direct Route
                      </th>
                      <th className="px-3 py-2 text-center text-[10px] uppercase text-emerald-800 bg-emerald-50 border-l border-zinc-200">
                        Confirmed Seat Option
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white text-[11px]">
                    <tr>
                      <td className="px-3 py-2 font-bold text-zinc-600">Booking Segment</td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100 font-semibold text-zinc-700">
                        {unlock.actual_boarding.code} → {unlock.actual_deboarding.code}
                      </td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100 font-bold text-emerald-800">
                        {unlock.book_from.code} → {unlock.book_to.code}
                      </td>
                    </tr>
                    <tr className="bg-zinc-50/50">
                      <td className="px-3 py-2 font-bold text-zinc-600">Seat Status</td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100">
                        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-black text-[10px]">
                          {unlock.direct_status_text}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black text-[10px]">
                          AVL {unlock.unlocked_seats} Confirmed
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-bold text-zinc-600">Total Fare</td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100 font-bold">₹{leg.price_inr}</td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100 font-bold text-emerald-800">
                        ₹{leg.price_inr + unlock.extra_fare_inr} (+₹{unlock.extra_fare_inr})
                      </td>
                    </tr>
                    <tr className="bg-zinc-50/50">
                      <td className="px-3 py-2 font-bold text-zinc-600">Boarding Point</td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100 font-semibold">{unlock.actual_boarding.name}</td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100 font-bold text-emerald-800">
                        {unlock.actual_boarding.name}
                        <span className="text-[9px] text-zinc-500 font-medium block">(Designated Official Boarding Point)</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-bold text-zinc-600">Quota Pool</td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100 text-rose-600 font-bold">Remote Location (RLWL)</td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100 text-emerald-700 font-bold">General Quota (GNWL)</td>
                    </tr>
                    <tr className="bg-emerald-50/40">
                      <td className="px-3 py-2 font-bold text-zinc-600">Compliance</td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100">—</td>
                      <td className="px-3 py-2 text-center border-l border-zinc-100 font-black text-emerald-800">
                        <span className="bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded text-[10px]">IRCTC Authorized Facility</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Guidelines Card */}
              <div className="bg-zinc-50 rounded-2xl p-3.5 border border-zinc-200 text-xs leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1 text-zinc-900 font-black">
                  <span className="uppercase tracking-wider text-[11px]">How Confirmed Berth Assurance Works</span>
                </div>
                <p className="text-zinc-600 font-medium">
                  {unlock.explanation || `Direct ticket from ${unlock.actual_boarding.name} to ${unlock.actual_deboarding.name} is waitlisted because intermediate stations share a smaller quota pool. By reserving from ${unlock.book_from.name} to ${unlock.book_to.name}, you obtain a confirmed berth. You select ${unlock.actual_boarding.name} as your official boarding point on IRCTC, so your berth is legally reserved and waiting for you.`}
                </p>
              </div>

              </div>

              {/* Sticky Fixed Bottom Action Footer */}
              <div className="p-4 px-6 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>IRCTC Official Change Boarding Station (CBPS) Facility Authorized</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (copilotRef.current) {
                        copilotRef.current.openAndSend(
                          `Please explain how the alternate boarding rule works for train ${trainNo} from ${unlock.actual_boarding.name}. Will the TTE allow me to board from ${unlock.actual_boarding.name} if my ticket reservation starts from ${unlock.book_from.name}? Explain the official IRCTC Change Boarding Station rules.`
                        );
                      }
                    }}
                    className="inline-flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <span>Consult AI Copilot</span>
                  </button>
                  <button
                    onClick={closeModal}
                    className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating AI Transit Copilot Chatbot */}
      <TransitCopilotWidget
        ref={copilotRef}
        activeRoute={processedOptions[selectedRouteIndex] || processedOptions[0]}
        selectedRouteIndex={selectedRouteIndex}
        fromCity={fromLocation}
        toCity={toLocation}
        travelDate={travelDate}
      />
    </div>
  );
}

export default function PlannerPage() {
  return (
    <>
      <style>{`
        .dark-tiles {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
      `}</style>
      <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-brand-cream text-brand-forest font-black">Loading Test Frontend...</div>}>
        <PlannerContent />
      </Suspense>
    </>
  );
}
