import { FALLBACK_COUNTRIES } from "./fallbackCountries.js";
import { applyThemesToCountry } from "./themeThreads.js";

/** Panel + API: dominant → quiet; last slot is always hope (gold). */
export const REGION_KEYWORD_COUNT = 12;

const ALLOWED_COLORS = new Set(["#E5140A", "#0035CC", "#1A1A1A", "#D4A800"]);
const WEIGHTS = new Set([200, 300, 400, 700, 900]);

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, Number(n) || 0));
}

function normalizeSources(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => String(s).trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeWord(raw, idx, total, fallbackWord) {
  const t = String(raw?.t ?? fallbackWord?.t ?? "WORD")
    .toUpperCase()
    .slice(0, 24);
  const w = WEIGHTS.has(raw?.w) ? raw.w : fallbackWord?.w ?? 400;
  let c = String(raw?.c ?? fallbackWord?.c ?? "#1A1A1A");
  if (!ALLOWED_COLORS.has(c)) c = fallbackWord?.c ?? "#1A1A1A";
  const it = Boolean(raw?.it ?? fallbackWord?.it);
  let op = clamp(raw?.op ?? fallbackWord?.op ?? 0.75, 0.35, 1);
  const isLast = idx === total - 1;
  const vhRaw = raw?.vh ?? fallbackWord?.vh;
  const vh =
    vhRaw === undefined || vhRaw === null
      ? undefined
      : clamp(Number(vhRaw), -1, 1);
  if (isLast) {
    return {
      t,
      w,
      c: "#D4A800",
      it,
      op: Math.max(op, 0.95),
      isHope: true,
    };
  }
  const out = { t, w, c, it, op };
  if (vh !== undefined && !Number.isNaN(vh)) out.vh = vh;
  return out;
}

function normalizeWords(rawWords, fallbackWords) {
  const fb = Array.isArray(fallbackWords) ? fallbackWords : [];
  const src = Array.isArray(rawWords) && rawWords.length ? rawWords : fb;
  const n = REGION_KEYWORD_COUNT;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(normalizeWord(src[i], i, n, fb[i]));
  }
  return out;
}

/**
 * Merges Claude API rows into the static registry (lat/lon/name/ids from fallback).
 */
export function applyLivePayload(payload, fallback = FALLBACK_COUNTRIES) {
  if (!payload?.countries?.length) {
    return fallback.map((base) => {
      const themedBase = applyThemesToCountry(base);
      return {
        ...themedBase,
        sources: base.sources ? [...base.sources] : [],
      };
    });
  }
  const liveMap = new Map(payload.countries.map((c) => [c.id, c]));
  return fallback.map((base) => {
    const L = liveMap.get(base.id);
    if (!L) {
      const themedBase = applyThemesToCountry(base);
      return {
        ...themedBase,
        sources: base.sources ? [...base.sources] : [],
      };
    }
    return applyThemesToCountry({
      ...base,
      valence: clamp(L.valence, -1, 1),
      arousal: clamp(L.arousal, 0, 1),
      phrase: String(L.phrase ?? base.phrase).slice(0, 140),
      words: normalizeWords(L.words, base.words),
      sources: normalizeSources(L.sources ?? base.sources),
    });
  });
}
