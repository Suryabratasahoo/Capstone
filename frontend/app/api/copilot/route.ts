import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getGroqApiKey(): string {
  // 1. Check process.env first
  if (process.env.GROQ_API_KEY) {
    return process.env.GROQ_API_KEY.trim();
  }

  // 2. Read from backend/.env as provided by user
  try {
    const backendEnvPath = path.resolve(process.cwd(), '../backend/.env');
    if (fs.existsSync(backendEnvPath)) {
      const content = fs.readFileSync(backendEnvPath, 'utf-8');
      const match = content.match(/GROQ_API_KEY\s*=\s*(.+)/);
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch (err) {
    console.error('Error reading backend/.env:', err);
  }

  return '';
}

function formatRouteForPrompt(route: any, searchContext?: any): string {
  if (!route) return 'No specific route has been selected yet by the user.';

  let out = `### CURRENTLY HIGHLIGHTED ROUTE ON USER'S SCREEN:\n`;
  if (searchContext && (searchContext.fromCity || searchContext.toCity)) {
    out += `- Search Query: ${searchContext.fromCity || ''} ➔ ${searchContext.toCity || ''} on ${searchContext.travelDate || ''}\n`;
  }
  out += `- Total Travel Time: ${route.total_duration || `${route.total_duration_mins} mins`}\n`;
  out += `- Total Journey Price: ₹${route.total_price_inr} (Class: ${route.travel_class || 'Standard'})\n`;
  out += `- Transfers: ${route.transfers ?? 0} (${route.journey_type || (route.transfers === 0 ? 'Direct' : 'Connecting')})\n`;
  out += `- Overall Availability Status: ${route.overall_status || 'N/A'}${route.wl_number ? ` (WL ${route.wl_number})` : ''}${route.available_seats ? ` (${route.available_seats} Available Seats)` : ''}\n`;

  if (route.interchange_station) {
    out += `- Interchange / Layover Station: ${route.interchange_station.name} (${route.interchange_station.code || ''})\n`;
    out += `- Transfer Buffer / Layover Duration: ${route.interchange_station.layover_time || `${route.interchange_station.layover_minutes} mins`}\n`;
  }

  if (route.legs && Array.isArray(route.legs) && route.legs.length > 0) {
    out += `\nJourney Legs Breakdown:\n`;
    route.legs.forEach((leg: any, idx: number) => {
      const fromName = leg.from_stop?.name || leg.from_stop?.code || 'Origin';
      const toName = leg.to_stop?.name || leg.to_stop?.code || 'Destination';
      out += `  Leg ${idx + 1} [${leg.mode}]:\n`;
      out += `    • Service: ${leg.service_name || leg.mode} (Service #: ${leg.service_number || 'N/A'})\n`;
      out += `    • Departs: ${fromName} at ${leg.departure_time}\n`;
      out += `    • Arrives: ${toName} at ${leg.arrival_time}\n`;
      out += `    • Distance & Fare: ${leg.distance_km || 0} km | ₹${leg.price_inr || 0}\n`;
      out += `    • Seat Status: ${leg.seat_status || 'N/A'}${leg.wl_number ? ` (WL ${leg.wl_number})` : ''}${leg.available_seats ? ` (AVL ${leg.available_seats})` : ''}\n`;
      
      if (leg.seat_breakdown) {
        out += `    • Bus Deck & Senior Breakdown: Seater: ${leg.seat_breakdown.seater_seats}, Upper: ${leg.seat_breakdown.sleeper_upper_seats} (₹${leg.seat_breakdown.upper_deck_fare_inr}), Lower: ${leg.seat_breakdown.sleeper_lower_seats} (₹${leg.seat_breakdown.lower_deck_fare_inr}), Senior Reserved: ${leg.seat_breakdown.senior_lower_reserved} berths (₹${leg.seat_breakdown.senior_berth_fare_inr}). Guaranteed: ${leg.seat_breakdown.berth_type_guaranteed}\n`;
      }

      if (leg.smart_quota_unlock) {
        out += `    • 💡 Smart Quota Unlock / Alternate Boarding: Direct is in Waitlist (${leg.smart_quota_unlock.direct_status_text}). Passenger can legally book from ${leg.smart_quota_unlock.book_from.name} (${leg.smart_quota_unlock.book_from.code}) to ${leg.smart_quota_unlock.book_to.name} (${leg.smart_quota_unlock.book_to.code}) for confirmed seat (AVL ${leg.smart_quota_unlock.unlocked_seats}) and board at ${leg.smart_quota_unlock.actual_boarding.name}. Extra fare is ₹${leg.smart_quota_unlock.extra_fare_inr}.\n`;
      }
    });
  }

  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, language = 'en', selectedRoute, searchContext } = body;

    const apiKey = getGroqApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Groq API Key not found in backend/.env or process.env' },
        { status: 500 }
      );
    }

    const languageInstructions: Record<string, string> = {
      te: 'Strictly respond in natural, polite Telugu script (తెలుగు). Use respectful tone suitable for Indian travelers and elders.',
      hi: 'Strictly respond in clear, polite Hindi script (हिंदी). Use respectful tone ("आप", "जी") suitable for Indian travelers and elders.',
      en: 'Respond in clear, warm, polite Indian English.',
    };

    const langInstruction =
      languageInstructions[language] || languageInstructions['en'];

    const formattedRouteContext = formatRouteForPrompt(selectedRoute, searchContext);

    const systemPrompt = `You are OptiTransit Copilot, an empathetic, highly knowledgeable AI transit assistant specialized in Indian multi-modal travel (Indian Railways, state/private buses, and inter-station transfers).

Core Guidelines & Knowledge:
1. Language: ${langInstruction}
2. Grounded Route Context (Currently Selected on Screen):
${formattedRouteContext}

Instructions for Referencing the Highlighted Route:
- When the user refers to "this route", "the train", "the transfer", "my journey", "the price", or "why this route", DIRECTLY reference the specific train names, train numbers, station names, layover duration, and fares from the highlighted route context above.
- If there is a layover, evaluate whether the time is enough for eating or walking between stations.
- If the user asks why McRAPTOR picked this option, cite the specific seat status (e.g. Confirmed vs Waitlist), duration, and transfer buffer.
- Always be accurate to the exact numbers in the route breakdown.

3. Conversational Discovery: If the user asks to plan a new trip or provides incomplete details, warmly ask clarifying questions.
4. Transit & Transfer Nuances:
   - Understand the difference between same-station platform transfers (takes 10-15 mins) and cross-station transfers (e.g. Railway Station to City Bus Stand, which takes 20-30 mins by auto through traffic plus luggage handling).
   - Understand dining needs: A relaxed meal takes 45-60 mins.
   - For elderly passengers (aged 60-75+), stairs and hurried walking are difficult. A 2-hour window to cross town and eat is dangerously tight; recommend at least 3.5 to 4 hours of buffer.
5. Keep responses structured, concise, warm, and helpful. Use bullet points or bold text where appropriate. Never invent non-existent railway policies.
6. Completeness: Ensure your response is fully completed and never cut off mid-thought or mid-sentence.`;

    const groqPayload = {
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
      ],
      temperature: 0.5,
      max_tokens: 2048,
    };

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groqPayload),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API Error response:', errText);
      return NextResponse.json(
        { error: `Groq API error: ${groqRes.statusText}`, details: errText },
        { status: groqRes.status }
      );
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply, model: data.model || 'llama-3.3-70b-versatile' });
  } catch (error: any) {
    console.error('Copilot API Handler Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
