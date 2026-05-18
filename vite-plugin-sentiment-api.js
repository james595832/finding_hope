import { FALLBACK_COUNTRIES } from "./src/data/fallbackCountries.js";
import { REGION_KEYWORD_COUNT } from "./src/data/mergeLiveSentiment.js";
import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "sentiment_snapshot.json");
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

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
      // super naive RSS title extraction
      const matches = [...text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g)];
      // first match is usually site title, skip it
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

export function sentimentApiPlugin(env) {
  return {
    name: "sentiment-api-gemini",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/sentiment") || req.method !== "POST") {
          next();
          return;
        }

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              live: false,
              error: "missing_gemini_key",
              message: "Set GEMINI_API_KEY in .env — app uses curated fallback.",
            })
          );
          return;
        }

        // Cache TTL check
        try {
          if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
          }
          if (fs.existsSync(CACHE_FILE)) {
            const stats = fs.statSync(CACHE_FILE);
            const age = Date.now() - stats.mtimeMs;
            if (age < CACHE_TTL_MS) {
              const cacheData = fs.readFileSync(CACHE_FILE, "utf8");
              const parsedCache = JSON.parse(cacheData);
              parsedCache.timestamp = stats.mtimeMs;
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(parsedCache));
              return;
            }
          }
        } catch (e) {
          console.error("Cache read error:", e);
        }

        console.log("Fetching live RSS feeds for Gemini context...");
        const newsContext = await fetchGlobalNewsContext();

        const model = env.GEMINI_MODEL || "gemini-2.0-flash";

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

        await readBody(req).catch(() => "{}");

        let geminiRes;
        try {
          console.log("Calling Gemini API...");
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
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "gemini_network", message: String(e.message) }));
          return;
        }

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "gemini_http",
              status: geminiRes.status,
              detail: errText.slice(0, 500),
            })
          );
          return;
        }

        const body = await geminiRes.json();
        const text = body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const parsed = extractJsonObject(text);
        if (!parsed?.countries?.length) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "bad_model_json", raw: text.slice(0, 400) }));
          return;
        }

        const timestamp = Date.now();
        const payloadString = JSON.stringify({ countries: parsed.countries, model, from_cache: false, timestamp });
        
        // Write to cache
        try {
          fs.writeFileSync(CACHE_FILE, JSON.stringify({ countries: parsed.countries, model, from_cache: true, timestamp }));
          console.log("Sentiment cache updated.");
        } catch(e) {
          console.warn("Failed to write to cache:", e);
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(payloadString);
      });
    },
  };
}
