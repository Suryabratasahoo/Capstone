// frontend/app/api/copilot/guardrails.ts
// Guardrails enforcement module for OptiTransit AI Copilot

export interface GuardrailDecision {
  isAllowed: boolean;
  refusalMessage?: string;
  reason?: string;
}

export const TRANSIT_REFUSALS: Record<string, string> = {
  en: "I am your OptiTransit Travel Copilot, specialized exclusively in Indian public transportation, train and bus schedules, station transfers, and travel assistance. I cannot answer general knowledge, political, or off-topic questions. Please ask me about your journey, routes, train/bus bookings, or station facilities!",
  hi: "मैं आपका OptiTransit यात्रा सहायक हूँ। मैं केवल भारतीय रेलवे, बस यात्रा, स्टेशन ट्रांसफर और यात्रा संबंधी सहायता के लिए उपलब्ध हूँ। सामान्य ज्ञान, राजनीति या अन्य बाहरी विषयों पर मैं उत्तर नहीं दे सकता। कृपया अपनी यात्रा, ट्रेन, बस या रूट से संबंधित प्रश्न ही पूछें।",
  te: "నేను మీ OptiTransit ప్రయాణ కోపైలట్‌ని. నేను భారతీయ రైల్వేలు, బస్సులు, స్టేషన్ బదిలీలు మరియు ప్రయాణ సమాచారానికి మాత్రమే సహాయం అందించగలను. సాధారణ విజ్ఞానం, రాజకీయాలు లేదా ఇతర అంశాలకు సంబంధించిన సమాధానాలను నేను ఇవ్వలేను. దయచేసి మీ ప్రయాణం లేదా రూట్లకు సంబంధించిన ప్రశ్నలను మాత్రమే అడగండి."
};

// Recognized transit, travel, and geography keywords that indicate legitimate in-domain queries
const TRANSIT_KEYWORDS = [
  'train', 'bus', 'flight', 'railway', 'station', 'junction', 'terminal', 'platform',
  'ticket', 'fare', 'price', 'cost', 'pnr', 'berth', 'seat', 'coach', 'bunk',
  'quota', 'gnwl', 'rlwl', 'pqwl', 'tatkal', 'premium', 'waitlist', 'rac', 'confirmed',
  'available', 'booking', 'board', 'boarding', 'layover', 'transfer', 'transit',
  'route', 'schedule', 'timing', 'duration', 'delay', 'distance', 'speed', 'stop',
  'leg', 'mode', 'multimodal', 'mcraptor', 'optitransit', 'connexlink',
  'irctc', 'apsrtc', 'tsrtc', 'ksrtc', 'osrtc', 'msrtc', 'redbus', 'abhibus',
  'sleeper', 'seater', 'volvo', 'ac', 'non-ac', 'superfast', 'express', 'vande bharat',
  'rajdhani', 'shatabdi', 'garib rath', 'duronto', 'passenger',
  'upper deck', 'lower deck', 'elder', 'senior', 'wheelchair', 'luggage', 'cloakroom',
  'food', 'meal', 'lunch', 'dinner', 'breakfast', 'pantry', 'water', 'washroom',
  'auto', 'taxi', 'cab', 'walk', 'walking', 'safe', 'safety', 'reach', 'travel',
  'journey', 'trip', 'visit', 'arrive', 'depart', 'city', 'cities'
];

// Explicit off-topic categories that must be intercepted immediately
const OFF_TOPIC_PATTERNS: Array<{ regex: RegExp; category: string }> = [
  // Politics, world leaders, heads of state, elections
  {
    regex: /\b(north\s*korea|kim\s*jong|president|prime\s*minister|parliament|election|biden|trump|putin|modi|zelensky|xi\s*jinping|congress|bjp|democrat|republican|political|politician|government\s*leader)\b/i,
    category: 'politics_world_leaders'
  },
  // Software programming, coding, dev tasks
  {
    regex: /\b(code|script|python|javascript|typescript|c\+\+|java|html|css|sql|function|debug|solve\s*leetcode|algorithm|compile|repository)\b/i,
    category: 'programming_coding'
  },
  // General science, physics, biology, chemistry homework
  {
    regex: /\b(quantum|photosynthesis|mitochondria|chemical\s*formula|derivative|integral|equation|solve\s*for\s*x|physics|biology|chemistry)\b/i,
    category: 'academic_homework'
  },
  // Pop culture, movies, celebrities, actors, singers
  {
    regex: /\b(taylor\s*swift|shah\s*rukh|salman|tom\s*cruise|beyonce|elon\s*musk|box\s*office|movie|actor|actress|hollywood|bollywood|netflix|oscar|celebrity)\b/i,
    category: 'entertainment_celebrity'
  },
  // Sports scores, match winners
  {
    regex: /\b(world\s*cup|ipl|fifa|cricket|football|nba|messi|ronaldo|virat\s*kohli|match\s*score|who\s*won)\b/i,
    category: 'sports_trivia'
  },
  // General trivia / world facts outside travel
  {
    regex: /\b(capital\s*of|highest\s*mountain|richest\s*(man|person)|who\s*invented|tell\s*me\s*a\s*joke|meaning\s*of\s*life)\b/i,
    category: 'general_trivia'
  },
  // System prompt injection & jailbreak attempts
  {
    regex: /\b(ignore\s*(all\s*)?(previous|prior)\s*instructions|disregard\s*(the\s*)?system\s*prompt|you\s*are\s*now\s*dan|jailbreak|pretend\s*you\s*have\s*no\s*rules)\b/i,
    category: 'jailbreak_attempt'
  }
];

/**
 * Fast deterministic pre-check for transit query validity.
 * Returns true if allowed, or false with localized refusal message.
 */
export function evaluateQueryGuardrails(query: string, language: string = 'en'): GuardrailDecision {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    return { isAllowed: true };
  }

  // 1. Check for explicit jailbreak attempts first
  const jailbreakMatch = OFF_TOPIC_PATTERNS.find(p => p.category === 'jailbreak_attempt' && p.regex.test(clean));
  if (jailbreakMatch) {
    const refusal = TRANSIT_REFUSALS[language] || TRANSIT_REFUSALS['en'];
    return {
      isAllowed: false,
      refusalMessage: refusal,
      reason: 'jailbreak_attempt'
    };
  }

  // 2. Check if the query contains any in-domain transit keywords
  const hasTransitKeyword = TRANSIT_KEYWORDS.some(kw => clean.includes(kw));

  // 3. Check for clear off-topic patterns
  const matchedPattern = OFF_TOPIC_PATTERNS.find(p => p.regex.test(clean));

  if (matchedPattern) {
    // If it matches an off-topic pattern and has NO transit context, reject immediately
    if (!hasTransitKeyword) {
      const refusal = TRANSIT_REFUSALS[language] || TRANSIT_REFUSALS['en'];
      return {
        isAllowed: false,
        refusalMessage: refusal,
        reason: matchedPattern.category
      };
    }

    // Special case: "North Korea president", "US president" even if transit word is accidentally present
    if (matchedPattern.category === 'politics_world_leaders' && (clean.includes('north korea') || clean.includes('kim jong') || clean.includes('who is the president') || clean.includes('who is the prime minister'))) {
      const refusal = TRANSIT_REFUSALS[language] || TRANSIT_REFUSALS['en'];
      return {
        isAllowed: false,
        refusalMessage: refusal,
        reason: 'strict_political_block'
      };
    }
  }

  // 4. Query is allowed for downstream LLM evaluation with grounded transit prompt
  return { isAllowed: true };
}
