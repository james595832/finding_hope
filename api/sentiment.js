import { FALLBACK_COUNTRIES } from "../src/data/fallbackCountries.js";
import { REGION_KEYWORD_COUNT } from "../src/data/mergeLiveSentiment.js";

function extractJsonObject(text) {
  let t = String(text).trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```/m.exec(t);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function fetchGlobalNewsContext() {
  const sources = [
    "http://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"
  ];
  let headlines = [];
  
  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      const matches = [...text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g)];
      for (let i = 1; i < Math.min(25, matches.length); i++) {
        const title = (matches[i][1] || matches[i][2] || "").trim();
        if (title && !headlines.includes(title)) {
          headlines.push(title);
        }
      }
    } catch(e) {
      console.warn("Failed to fetch RSS from", url, e.message);
    }
  }
  return headlines.join("\n- ");
}

export default async function handler(req, res) {
  // CORS setup for testing if needed
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      live: false,
      error: "missing_gemini_key",
      message: "Set GEMINI_API_KEY in Vercel settings — app uses curated fallback.",
    });
  }

  const newsContext = await fetchGlobalNewsContext();
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const registry = FALLBACK_COUNTRIES.map((c) => `${c.id} — ${c.name}`).join("\n");

  const userPrompt = `Return a single JSON object only (no markdown fencing, no commentary) with this shape:
{"countries":[ ... ]}

The "countries" array must contain exactly ${FALLBACK_COUNTRIES.length} objects — one per region below — in the SAME ORDER as listed. Each object MUST use the exact "id" string shown.

Here are the LATEST HEADLINES from global news networks (BBC, NYT) right now:
- ${newsContext}

Use these specific news events to assess the CURRENT sentiment and topics for each country if relevant. If a country isn't explicitly in the news, extrapolate its current baseline civic condition.

Fields per country:
- "id": string (exact)
- "valence": number from -1 (very negative affect in public life) to +1 (very positive)
- "arousal": number from 0 (calm) to 1 (highly agitated / volatile)
- "phrase": one clear lowercase sentence (≤140 chars) stating what public mood you are summarising — concrete causes and stakes, not vague metaphor; still allowed to feel editorial
- "sources": optional array of 2–6 SHORT strings naming real news outlets or agencies you are implicitly drawing from (e.g. "Reuters", "BBC News"). Include "BBC News" or "NYT" if you derived context from the headlines above.
- "words": array of exactly ${REGION_KEYWORD_COUNT} objects in DISPLAY order (first = most dominant visually). Each word:
  - "t": string, SHORT LABEL IN ALL CAPS (≤24 chars) corresponding to news topics
  - "w": one of 200, 300, 400, 700, 900
  - "c": exactly one of "#E5140A", "#0035CC", "#1A1A1A", "#D4A800"
  - "it": boolean (italic for quieter / reflective register)
  - "op": number 0.35–1.0 (opacity / emphasis)
  - "vh": optional number from -1 (word reads negative) to +1 (positive); for thin UI ticks beside keywords. Omit if unsure.
  - "context": a clear, lowercase sentence (≤100 chars) explaining exactly WHY this word is trending for this region right now. This should provide specific editorial value.

The last word is always the hope / counterweight for that place: must use "c":"#D4A800" and "isHope":true.

Regions (in this order):
${registry}

Anchor judgments in real 2026 headlines and civic conditions; avoid lazy clichés. If uncertain, lean neutral (valence near 0).`;

  let geminiRes;
  try {
    geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: "gemini_network", message: String(e.message) });
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return res.status(502).json({
      error: "gemini_http",
      status: geminiRes.status,
      detail: errText.slice(0, 500),
    });
  }

  const body = await geminiRes.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = extractJsonObject(text);
  if (!parsed?.countries?.length) {
    return res.status(502).json({ error: "bad_model_json", raw: text.slice(0, 400) });
  }

  const timestamp = Date.now();
  // Vercel Serverless automatically returns this correctly
  return res.status(200).json({ countries: parsed.countries, model, from_cache: false, timestamp });
}
