import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMediaQuery } from "./hooks/useMediaQuery.js";
import { useAudio } from "./context/AudioContext.jsx";
import MobileSentimentList from "./MobileSentimentList.jsx";
import * as THREE from "three";
import ThreeGlobe from "three-globe";

import { FALLBACK_COUNTRIES, REGION_COUNT } from "./data/fallbackCountries.js";
import { applyLivePayload } from "./data/mergeLiveSentiment.js";
import {
  buildGlobeLabels,
  buildGlobeSpikePaths,
  buildGlobeHopeSpikes,
} from "./data/globeLayersData.js";
import {
  applyThemesToCountries,
  buildThreadMesh,
  buildThemeNetwork,
  THEME_COLORS,
} from "./data/themeThreads.js";
import { fetchLiveSentiment } from "./data/fetchLiveSentiment.js";
import { FLAG_CODES, flagUrl } from "./data/flagCodes.js";
import { primarySentimentStripLabel } from "./data/sentimentLabels.js";
import {
  createSentimentGlobeTexture,
  EARTH_TOPOLOGY_URL,
} from "./data/stylizedGlobeTexture.js";
import {
  CAP,
  CAP_SECTION,
  CAP_SM,
  FONT,
  GUTTER,
  GUTTER_SM,
  INK,
  LABEL,
  LABEL_SOFT,
  PANEL_BODY,
  PANEL_BODY_SM,
  PANEL_MUTED,
  PANEL_READING,
  PAPER,
  SHELL,
  SHELL_DEEP,
  STACK,
  TRACK_UI,
} from "./designTokens.js";

// ── Data colours (markers / words) ──────────────────────────────────────────
const R = "#E5140A";
const B = "#0035CC";
const G = "#D4A800";
const K = "#1A1A1A";

// ── Tracking ─────────────────────────────────────────────────────────────────
const tr = (w, it = false) =>
  w >= 800 ? "-0.03em" : w >= 600 ? "0em" : w >= 400 ? "0.03em" : it ? "0.10em" : "0.08em";


/** Great-circle distance in km (for picking nearest region from a surface click). */
function greatCircleKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function nearestCountry(lat, lng, list, maxKm = 2800) {
  let best = null;
  let bestD = Infinity;
  for (const c of list) {
    const d = greatCircleKm(lat, lng, c.lat, c.lon);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return bestD <= maxKm ? best : null;
}

function isGlobeTerrainHit(hit) {
  let o = hit.object;
  while (o) {
    if (o.__globeObjType === "globe") return true;
    o = o.parent;
  }
  return false;
}

// ── Sentiment → colour ────────────────────────────────────────────────────────
function sentimentColor(valence) {
  if (valence < -0.6) return "#E5140A";
  if (valence < -0.3) return "#CC4400";
  if (valence < -0.1) return "#886600";
  if (valence <  0.1) return "#555555";
  if (valence <  0.35) return "#004488";
  if (valence <  0.6) return "#0033BB";
  return "#0025AA";
}

function sentimentHeroInk(valence) {
  if (valence < -0.1) return "#5c0f0a";
  if (valence > 0.1) return "#0a1f5c";
  return INK;
}

function hopeWordForCountry(country) {
  return (
    country?.words?.find((word) => word.isHope)?.t ??
    country?.words?.[country.words.length - 1]?.t ??
    "HOPE"
  );
}

function toSentenceCase(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function isoCodeToFlagEmoji(isoCode) {
  if (!isoCode || isoCode.length !== 2) return "🏳️";
  return isoCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function editionString(n) {
  return String(Math.max(1, Number(n) || 1)).padStart(3, "0");
}

function drawCrosshair(ctx, x, y, color = "rgba(10,10,10,0.2)") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x + 8, y);
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y + 8);
  ctx.stroke();
  ctx.restore();
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const testLine = `${line} ${words[i]}`;
    if (ctx.measureText(testLine).width <= maxWidth) line = testLine;
    else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

function drawGrainOverlay(ctx, width, height, opacity = 0.12) {
  const noiseCanvas = document.createElement("canvas");
  noiseCanvas.width = 220;
  noiseCanvas.height = 220;
  const nctx = noiseCanvas.getContext("2d");
  if (!nctx) return;
  const img = nctx.createImageData(noiseCanvas.width, noiseCanvas.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 205 + Math.floor(Math.random() * 45);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 36;
  }
  nctx.putImageData(img, 0, 0);
  const pattern = ctx.createPattern(noiseCanvas, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Micro tick colour for optional per-word valence hint (-1…+1). */
function valenceHintColor(vh) {
  if (vh == null || Number.isNaN(vh)) return null;
  if (vh < -0.25) return R;
  if (vh > 0.25) return B;
  return K;
}

/** Hope / counterweight on cream — darker gold for readable contrast (WCAG). */
const HOPE_GOLD = "#7a5a08";

/**
 * Data-driven motion spec for the full-screen paint overlay.
 * Everything is derived from the word's own metadata so each word arrives
 * in a way that reads its meaning without any bespoke per-word choreography.
 *
 *   valence → sweep origin + easing       (left/hit, bottom/rise, right/arrive, centre/emerge)
 *   arousal → sweep duration + breathing  (slower & still, or snappier with micro-hum)
 *   weight  → word entrance               (cascade / fade-scale / slow bloom)
 *   isHope  → overrides to the slowest, centre-radial, bloom entrance
 *
 * prefers-reduced-motion is handled globally (see <style> block): all animation
 * durations collapse to ~0ms, so this spec degrades to a plain cut.
 */
function paintMotion(word, regionValence = 0, regionArousal = 0.5) {
  const v = typeof word?.vh === "number" ? word.vh : regionValence;
  const a = Math.max(0, Math.min(1, regionArousal));
  const w = word?.w ?? 400;
  const isHope = !!word?.isHope;

  // ── Sweep — origin / axis / easing ──
  let sweepAnim, sweepOrigin, sweepEasing;
  if (isHope) {
    sweepAnim    = "paintSweepRadial";
    sweepOrigin  = "center";
    sweepEasing  = "cubic-bezier(0.25, 0.46, 0.45, 0.94)"; // softest, emerges
  } else if (v < -0.15) {
    sweepAnim    = "paintSweepX";
    sweepOrigin  = "left center";
    sweepEasing  = "cubic-bezier(0.7, 0, 0.2, 1)";         // ease-out, hits
  } else if (v > 0.15) {
    sweepAnim    = "paintSweepX";
    sweepOrigin  = "right center";
    sweepEasing  = "cubic-bezier(0.45, 0.05, 0.55, 0.95)"; // even, arrives
  } else {
    sweepAnim    = "paintSweepY";
    sweepOrigin  = "center bottom";
    sweepEasing  = "cubic-bezier(0.33, 1, 0.68, 1)";       // rises, settles
  }

  // Duration: low arousal = slower & more considered, high = snappier.
  // Hope is always the slowest — it is the exhale of the piece.
  const sweepDuration = isHope
    ? 900
    : Math.round(720 - a * 300); // 420–720ms

  // ── Word entrance ──
  let wordEntrance;
  if (isHope)          wordEntrance = "bloom";
  else if (w >= 600)   wordEntrance = "cascade";
  else if (w <= 300)   wordEntrance = "bloom";
  else                 wordEntrance = "fade-scale";

  // Micro-hum after settle — only for high-arousal, non-hope words.
  const breathe = a > 0.6 && !isHope;

  // ── Supports stagger ──
  // Positive / hope → breath (slower, more air).
  // Negative → pressure (supports land tight on the headline's heels).
  // Neutral → even in between.
  const base = sweepDuration / 1000 + 0.05;
  let stripDelay, phraseDelay, railDelay;
  if (isHope || v > 0.15) {
    stripDelay  = base + 0.18;
    phraseDelay = base + 0.50;
    railDelay   = base + 0.74;
  } else if (v < -0.15) {
    stripDelay  = base + 0.04;
    phraseDelay = base + 0.18;
    railDelay   = base + 0.30;
  } else {
    stripDelay  = base + 0.10;
    phraseDelay = base + 0.34;
    railDelay   = base + 0.54;
  }

  return {
    sweepAnim, sweepOrigin, sweepEasing, sweepDuration,
    wordEntrance, breathe,
    stripDelay, phraseDelay, railDelay,
  };
}

/**
 * Static, tileable grain at ~4% — keeps the flat colour field from reading as
 * a flat paint swatch. Encoded inline so it ships with no extra request.
 */
const PAINT_GRAIN_URL =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>"
  + "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='5'/>"
  + "<feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0'/></filter>"
  + "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

// ── Mood ridgeline (Unknown Pleasures aesthetic) ─────────────────────────────
/**
 * Stacked ridgeline chart. Peak position encodes valence (left=negative,
 * right=positive). Amplitude encodes arousal. Deterministically seeded so
 * the same word always produces the same waveform.
 *
 * Inspired by Joy Division's Unknown Pleasures cover — pulsar radio data
 * as a print artefact. Sentiment data as a print artefact.
 */
function MoodRidgeline({ valence = 0, arousal = 0.5, fg = "#ffffff", bg = "#000000", rows = 14 }) {
  const W = 600;
  const rowH = 13;
  const H = rows * rowH;
  const maxAmp = 14 + arousal * 46;      // 14px quiet → 60px roiling
  const extraTop = Math.ceil(maxAmp * 1.4); // headroom so peaks never clip
  const centerNorm = (valence + 1) / 2;  // 0 (left) → 1 (right)

  // Deterministic seeded pseudo-random — stable per valence+arousal combo
  const rand = (s) => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };
  const gauss = (x, mu, sig) => Math.exp(-0.5 * ((x - mu) / sig) ** 2);

  const STEPS = 100;

  const strips = Array.from({ length: rows }, (_, r) => {
    const seed = r * 137 + Math.round(valence * 80) * 31 + Math.round(arousal * 80) * 17;
    const peak1 = centerNorm + (rand(seed) - 0.5) * 0.12;
    const sig1   = 0.10 + rand(seed + 1) * 0.09;
    const amp1   = maxAmp * (0.72 + rand(seed + 2) * 0.55);
    // Secondary peak present when high arousal
    const peak2  = peak1 + (rand(seed + 3) - 0.5) * 0.36;
    const sig2   = sig1 * (0.5 + rand(seed + 4) * 0.5);
    const amp2   = arousal > 0.45 ? maxAmp * rand(seed + 5) * 0.45 : 0;

    const yBase = H - r * rowH;
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const xn = i / STEPS;
      const x  = xn * W;
      const g  = gauss(xn, peak1, sig1) * amp1 + gauss(xn, peak2, sig2) * amp2;
      const noise = (rand(seed + i * 7 + 1) - 0.5) * maxAmp * 0.07;
      pts.push([x, yBase - g - noise]);
    }
    const stroke = `M ${pts.map(p => p.join(",")).join(" L ")}`;
    const fill   = `${stroke} L ${W},${yBase} L 0,${yBase} Z`;
    return { stroke, fill };
  });

  return (
    <svg
      viewBox={`0 -${extraTop} ${W} ${H + extraTop}`}
      preserveAspectRatio="none"
      aria-hidden
      style={{ width:"100%", height: H + extraTop, display:"block" }}
    >
      {strips.map(({ stroke, fill }, i) => {
        // Front rows (low i) are brighter; back rows fade — creates depth like a printed plate
        const depthOpacity = 0.22 + (1 - i / rows) * 0.78;
        return (
          <g key={i} opacity={depthOpacity}>
            <path d={fill}   fill={bg}  stroke="none" />
            <path d={stroke} fill="none" stroke={fg} strokeWidth={i < rows * 0.3 ? 1.6 : 1.1} />
          </g>
        );
      })}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SentimentGlobe() {
  const mountRef = useRef(null);
  const sceneRef = useRef({ globe: null, globeMaterial: null, scene: null });
  const ohMomentRafRef = useRef(null);
  const captureResetTimerRef = useRef(null);
  const threadLayerRef = useRef({
    group: null,
    meshes: [],
    hoveredId: null,
    byThreadId: new Map(),
  });
  const globeTextureBootRef = useRef(false);
  const visitedCountryIdsRef = useRef(new Set());
  const ohMomentSeenRef = useRef(false);
  const ohMomentActiveRef = useRef(false);
  const themeNetworkRef = useRef(null);
  const viewModeRef = useRef("hope");
  const selectedRef = useRef(null);
  const countriesRef = useRef(applyThemesToCountries(FALLBACK_COUNTRIES));
  const [countries, setCountries] = useState(() => applyThemesToCountries(FALLBACK_COUNTRIES));
  const [liveSource, setLiveSource] = useState("loading");
  const [selected, setSelected] = useState(null);
  const [dataTimestamp, setDataTimestamp] = useState(null);
  const [captureState, setCaptureState] = useState({ status: "idle", edition: null });
  const [captureLiveMessage, setCaptureLiveMessage] = useState("");
  const [ariaGlobeMessage, setAriaGlobeMessage] = useState("");
  const [visitedHopes, setVisitedHopes] = useState([]);
  const [ohMomentActive, setOhMomentActive] = useState(false);
  const [ohMomentPhase, setOhMomentPhase] = useState("idle");
  const [ohMomentTextOpacity, setOhMomentTextOpacity] = useState(0);
  const [ohMomentWordOpacities, setOhMomentWordOpacities] = useState([0, 0, 0]);
  const [ohMomentBackdropOpacity, setOhMomentBackdropOpacity] = useState(0);
  const [selectedThemeKey, setSelectedThemeKey] = useState(null);
  const [threadTooltip, setThreadTooltip] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [paintWord, setPaintWord] = useState(null);
  const [paintIn, setPaintIn] = useState(false);
  const [globeInstance, setGlobeInstance] = useState(null);
  // "hope"    → gold altitude poles per region (default; the artistic premise of the piece)
  // "threads" → editorial blue/red arcs between regions (the original decorative reading)
  const [viewMode, setViewMode] = useState("hope");
  const themeNetwork = useMemo(() => buildThemeNetwork(countries), [countries]);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { isMuted, toggleMute, setSentiment, playHopeChime, playHoverTick } = useAudio();
  const selectedTheme = selectedThemeKey ? themeNetwork.themesByKey.get(selectedThemeKey) : null;

  countriesRef.current = countries;
  selectedRef.current = selected;
  themeNetworkRef.current = themeNetwork;
  viewModeRef.current = viewMode;
  ohMomentActiveRef.current = ohMomentActive;

  // Sound feedback on hover change (ticks when entering or moving to a different region)
  const lastHoveredIdRef = useRef(null);
  useEffect(() => {
    if (hovered && hovered !== lastHoveredIdRef.current) {
      playHoverTick();
    }
    lastHoveredIdRef.current = hovered;
  }, [hovered, playHoverTick]);

  useEffect(() => {
    let activeCountry = null;
    if (selected) {
      setAriaGlobeMessage(`Selected: ${selected.name}. Primary sentiment: ${selected.valence >= 0 ? "positive" : "negative"}. Focus word: ${hopeWordForCountry(selected)}.`);
      activeCountry = selected;
    } else if (hovered) {
      const c = countriesRef.current.find((country) => country.id === hovered);
      if (c) {
        setAriaGlobeMessage(`Hovering region: ${c.name}`);
        activeCountry = c;
      }
    } else {
      setAriaGlobeMessage("");
    }
    
    if (activeCountry) {
      setSentiment(activeCountry.valence, activeCountry.arousal);
    } else {
      setSentiment(0, 0.5);
    }
  }, [selected, hovered, setSentiment]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchLiveSentiment();
        if (cancelled) return;
        setCountries(applyThemesToCountries(applyLivePayload(data)));
        setLiveSource("live");
        if (data.timestamp) setDataTimestamp(data.timestamp);
      } catch {
        if (!cancelled) {
          setLiveSource("fallback");
          setCountries(applyThemesToCountries(FALLBACK_COUNTRIES));
          setDataTimestamp(Date.now());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const seen = sessionStorage.getItem("finding_hope_moment_seen") === "true";
    ohMomentSeenRef.current = seen;
  }, []);

  useEffect(() => {
    return () => {
      if (captureResetTimerRef.current) {
        clearTimeout(captureResetTimerRef.current);
        captureResetTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setSelected((prev) => {
      if (!prev) return null;
      return countries.find((c) => c.id === prev.id) ?? null;
    });
  }, [countries]);

  useEffect(() => {
    setCaptureState({ status: "idle", edition: null });
  }, [selected?.id]);

  const finishOhMoment = useCallback(() => {
    if (ohMomentRafRef.current) {
      cancelAnimationFrame(ohMomentRafRef.current);
      ohMomentRafRef.current = null;
    }
    setOhMomentActive(false);
    setOhMomentPhase("idle");
    setOhMomentTextOpacity(0);
    setOhMomentWordOpacities([0, 0, 0]);
    setOhMomentBackdropOpacity(0);
  }, []);

  useEffect(() => {
    if (!selected || viewMode !== "hope" || ohMomentActive || ohMomentSeenRef.current) return;
    const visited = visitedCountryIdsRef.current;
    if (visited.has(selected.id)) return;
    visited.add(selected.id);
    const hope = toSentenceCase(String(hopeWordForCountry(selected)).toLowerCase());
    setVisitedHopes((prev) => {
      if (prev.includes(hope)) return prev;
      return [...prev, hope].slice(0, 3);
    });
    if (visited.size === 3) {
      const lastThree = Array.from(visited)
        .map((id) => countriesRef.current.find((c) => c.id === id))
        .filter(Boolean)
        .slice(0, 3)
        .map((country) => toSentenceCase(String(hopeWordForCountry(country)).toLowerCase()));

      setVisitedHopes(lastThree);
      setSelected(null);
      setSelectedThemeKey(null);
      setOhMomentActive(true);
      ohMomentSeenRef.current = true;
      sessionStorage.setItem("finding_hope_moment_seen", "true");
    }
  }, [selected, viewMode, ohMomentActive]);

  useEffect(() => {
    if (!ohMomentActive) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();

    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const invLerp = (a, b, v) => clamp01((v - a) / (b - a));

    const update = (now) => {
      const t = (now - start) / 1000;

      if (reduced) {
        if (t < 0.35) {
          setOhMomentPhase("fading_out");
          const k = invLerp(0, 0.35, t);
          setOhMomentBackdropOpacity(lerp(0, 0.85, k));
          setOhMomentTextOpacity(k);
          setOhMomentWordOpacities([k, k, k]);
        } else if (t < 4.3) {
          setOhMomentPhase("hold");
          setOhMomentBackdropOpacity(0.85);
          setOhMomentTextOpacity(1);
          setOhMomentWordOpacities([0.6, 0.6, 0.6]);
        } else if (t < 5) {
          setOhMomentPhase("fading_in");
          const k = invLerp(4.3, 5, t);
          setOhMomentBackdropOpacity(lerp(0.85, 0, k));
          setOhMomentTextOpacity(lerp(1, 0, k));
          const out = lerp(0.6, 0, k);
          setOhMomentWordOpacities([out, out, out]);
        } else {
          finishOhMoment();
          return;
        }
        ohMomentRafRef.current = requestAnimationFrame(update);
        return;
      }

      const sentenceStart = 0.8;
      const sentenceEnd = 2.0;
      const wordStarts = [2.5, 3.3, 4.1];
      const holdStart = 6.5;
      const holdEnd = 8.3;
      const textOutEnd = 9.5;
      const backdropOutEnd = 9.8;

      if (t < 0.8) setOhMomentPhase("fading_out");
      else if (t < 2.5) setOhMomentPhase("sentence");
      else if (t < 3.3) setOhMomentPhase("word_1");
      else if (t < 4.1) setOhMomentPhase("word_2");
      else if (t < 6.5) setOhMomentPhase("word_3");
      else if (t < 8.3) setOhMomentPhase("hold");
      else if (t < 9.8) setOhMomentPhase("fading_in");
      else {
        finishOhMoment();
        return;
      }

      const outIn = invLerp(0, 0.6, t);
      const outOut = invLerp(8.3, backdropOutEnd, t);
      const backdrop = t < 8.3 ? lerp(0, 0.85, outIn) : lerp(0.85, 0, outOut);
      setOhMomentBackdropOpacity(backdrop);

      if (t < sentenceStart) setOhMomentTextOpacity(0);
      else if (t < sentenceEnd) setOhMomentTextOpacity(invLerp(sentenceStart, sentenceEnd, t));
      else if (t < 8.3) setOhMomentTextOpacity(1);
      else setOhMomentTextOpacity(1 - invLerp(8.3, textOutEnd, t));

      const words = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        const s = wordStarts[i];
        const next = wordStarts[i + 1];
        if (t < s) {
          words[i] = 0;
        } else if (t < s + 0.6) {
          words[i] = invLerp(s, s + 0.6, t);
        } else if (next && t < next) {
          words[i] = lerp(1, 0.25, invLerp(s + 0.6, next, t));
        } else if (t < holdStart) {
          words[i] = i === 2 ? 1 : 0.25;
        } else if (t < holdEnd) {
          words[i] = 0.6;
        } else if (t < textOutEnd) {
          words[i] = lerp(0.6, 0, invLerp(holdEnd, textOutEnd, t));
        } else {
          words[i] = 0;
        }
      }
      setOhMomentWordOpacities(words);
      ohMomentRafRef.current = requestAnimationFrame(update);
    };

    ohMomentRafRef.current = requestAnimationFrame(update);
    return () => {
      if (ohMomentRafRef.current) {
        cancelAnimationFrame(ohMomentRafRef.current);
        ohMomentRafRef.current = null;
      }
    };
  }, [finishOhMoment, ohMomentActive]);

  useEffect(() => {
    if (viewMode === "hope") {
      setSelectedThemeKey(null);
      setThreadTooltip(null);
    } else {
      setSelected(null);
      setHovered(null);
    }
  }, [viewMode]);

  useEffect(() => {
    if (selectedThemeKey && !themeNetwork.themesByKey.get(selectedThemeKey)) {
      setSelectedThemeKey(null);
    }
  }, [selectedThemeKey, themeNetwork]);

  useEffect(() => {
    const g = globeInstance || sceneRef.current.globe;
    if (!g) return;
    const pts = countries.map((c) => {
      const isInd = viewMode === "indicator";
      const heightNorm = (c.valence + 1) / 2;
      return {
        lat: c.lat,
        lng: c.lon,
        country: c,
        color: isInd ? sentimentColor(c.valence) : sentimentColor(c.valence),
        altitude: isInd ? (0.15 + heightNorm * 0.8) : 0.001,
        radius: isInd ? 0.12 : 0.8,
        arousal: c.arousal,
      };
    });
    g.pointsData(pts)
      .pointAltitude("altitude")
      .pointRadius("radius")
      .arcsData([])
      .pathsData(viewMode === "hope" ? buildGlobeHopeSpikes(countries) : []);
  }, [globeInstance, countries, viewMode]);

  useEffect(() => {
    const g = globeInstance || sceneRef.current.globe;
    if (!g) return;
    g.labelsData(buildGlobeLabels(countries, sentimentColor, hovered));
  }, [globeInstance, countries, hovered]);

  const applySelectionRings = useCallback((g) => {
    if (!g) return;
    const s = selectedRef.current;
    if (s) {
      g.ringsData([
        {
          lat: s.lat,
          lng: s.lon,
          maxR: 5,
          propagationSpeed: 2.8,
          repeatPeriod: 2200,
        },
      ]).ringColor(() => (t) => `rgba(212,168,0,${0.2 + (1 - t) * 0.75})`);
    } else {
      g.ringsData([]);
    }
  }, []);

  useEffect(() => {
    applySelectionRings(globeInstance || sceneRef.current.globe);
  }, [globeInstance, selected, applySelectionRings]);

  const rebuildThreadMeshes = useCallback(() => {
    const scene = sceneRef.current.scene;
    const globe = sceneRef.current.globe;
    if (!scene) return;

    const prevGroup = threadLayerRef.current.group;
    if (prevGroup) {
      scene.remove(prevGroup);
      prevGroup.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) node.material.dispose();
      });
    }

    threadLayerRef.current = {
      group: null,
      meshes: [],
      hoveredId: null,
      byThreadId: new Map(),
    };

    return; // Disable static thread generation based on user feedback

    const group = new THREE.Group();
    const byThreadId = new Map();
    const getCoords = (countryId) => {
      const country = themeNetwork.byId.get(countryId);
      if (!country) return null;
      const pt = globe.getCoords(country.lat, country.lon, 0.002);
      return new THREE.Vector3(pt.x, pt.y, pt.z);
    };

    themeNetwork.edges.forEach((edge) => {
      const mesh = buildThreadMesh(edge, getCoords);
      if (!mesh) return;
      group.add(mesh);
      byThreadId.set(edge.id, mesh);
    });

    scene.add(group);
    threadLayerRef.current = {
      group,
      meshes: group.children,
      hoveredId: null,
      byThreadId,
    };
  }, [themeNetwork, viewMode]);

  useEffect(() => {
    rebuildThreadMeshes();
  }, [rebuildThreadMeshes]);

  useEffect(() => {
    const mat = sceneRef.current.globeMaterial;
    if (!mat) return;
    if (!globeTextureBootRef.current) {
      globeTextureBootRef.current = true;
      return;
    }
    let cancelled = false;
    (async () => {
      const next = await createSentimentGlobeTexture(countries, sentimentColor);
      if (cancelled) {
        next.dispose();
        return;
      }
      const prev = mat.map;
      mat.map = next;
      mat.needsUpdate = true;
      if (prev && prev !== next) prev.dispose();
    })();
    return () => {
      cancelled = true;
    };
  }, [globeInstance, countries]);

  // ── Three.js + three-globe setup ──────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let Globe = null;
    let globeMat = null;
    let bumpTexture = null;
    let cleaned = false;

    const W = el.clientWidth || 800;
    const H = el.clientHeight || 600;
    const useLiteGlobe = W <= 720;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dprCap = useLiteGlobe ? 1.25 : 2;

    const renderer = new THREE.WebGLRenderer({
      antialias: !useLiteGlobe,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0); // Transparent so CSS vignette shows through
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    el.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000);
    /** Further pull-back on small viewports + default zoom — keeps UI clear of the sphere. */
    camera.position.z = useLiteGlobe ? 352 : 348;

    const scene = new THREE.Scene();
    sceneRef.current.scene = scene;
    const cameraWorldPosition = new THREE.Vector3();
    const cameraForwardVector = new THREE.Vector3();
    const labelWorldPosition = new THREE.Vector3();
    const cameraToLabelVector = new THREE.Vector3();

    const hemi = new THREE.HemisphereLight(0xffffff, 0xe5e1d8, 0.5);
    scene.add(hemi);
    const ambient = new THREE.AmbientLight(0xffffff, 0.42);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.52);
    sun.position.set(6.5, 3.5, 5.5);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xeef1f8, 0.18);
    fill.position.set(-5.5, 0.5, -4);
    scene.add(fill);

    let prevMouse = { x: 0, y: 0 };
    let rotX = 0;
    let rotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let autoRotate = !reduceMotion;
    let autoTimer = null;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const pickSurface = (ndc) => {
      if (!Globe) return null;
      mouse.set(ndc.x, ndc.y);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(Globe, true);
      const hit = hits.find(
        (h) =>
          h.object.__globeObjType !== "atmosphere" &&
          (isGlobeTerrainHit(h) || h.object.__globeObjType === "point")
      );
      if (!hit) return null;
      const local = Globe.worldToLocal(hit.point.clone());
      return Globe.toGeoCoords(local);
    };
    const pickThread = (ndc) => {
      const meshes = threadLayerRef.current.meshes;
      if (!meshes?.length) return null;
      mouse.set(ndc.x, ndc.y);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshes, false);
      return hits[0] ?? null;
    };

    const setThreadHoverState = (hit, clientX, clientY) => {
      const hoveredId = hit?.object?.userData?.threadId ?? null;
      threadLayerRef.current.hoveredId = hoveredId;
      if (!hoveredId) {
        setThreadTooltip(null);
        return;
      }
      const edge = hit.object.userData.edge;
      const themeMeta = themeNetworkRef.current?.themesByKey?.get(edge.theme);
      if (!themeMeta) {
        setThreadTooltip(null);
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      setThreadTooltip({
        x: clientX - rect.left,
        y: clientY - rect.top,
        title: themeMeta.title,
        countryCount: themeMeta.countryCount,
        exampleWord: themeMeta.exampleWord || edge.exampleWord,
      });
    };

    function getPointerNDC(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1,
      };
    }

    let pointerDown = false;
    let dragMoved = false;

    function onPointerDown(e) {
      if (!e.isPrimary) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      pointerDown = true;
      dragMoved = false;
      prevMouse = { x: e.clientX, y: e.clientY };
      autoRotate = false;
      clearTimeout(autoTimer);
    }

    function onPointerMove(e) {
      if (!e.isPrimary) return;
      const ndc = getPointerNDC(e.clientX, e.clientY);
      if (viewModeRef.current === "indicator") {
        const threadHit = pickThread(ndc);
        setThreadHoverState(threadHit, e.clientX, e.clientY);
        if (threadHit) {
          setHovered(null);
          renderer.domElement.style.cursor = "pointer";
        } else {
          renderer.domElement.style.cursor = "grab";
        }
      } else {
        setThreadTooltip(null);
      }

      const geo = pickSurface(ndc);
      const country = geo ? nearestCountry(geo.lat, geo.lng, countriesRef.current) : null;
      if (viewModeRef.current !== "indicator") {
        setHovered(country ? country.id : null);
        renderer.domElement.style.cursor = country ? "pointer" : "grab";
      }

      if (!pointerDown) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        dragMoved = true;
      }
      if (dragMoved) {
        targetRotY += dx * 0.006;
        targetRotX += dy * 0.006;
        targetRotX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, targetRotX));
        prevMouse = { x: e.clientX, y: e.clientY };
      }
    }

    function finishPointer(e) {
      if (!e.isPrimary) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (pointerDown && !dragMoved) {
        const ndc = getPointerNDC(e.clientX, e.clientY);
        if (viewModeRef.current === "indicator") {
          const threadHit = pickThread(ndc);
          if (threadHit?.object?.userData?.edge) {
            const edge = threadHit.object.userData.edge;
            const network = themeNetworkRef.current;
            const themeMeta = network?.themesByKey?.get(edge.theme);
            if (themeMeta) {
              setSelectedThemeKey(edge.theme);
              setSelected(null);
              autoRotate = false;
              clearTimeout(autoTimer);

              const centroid = new THREE.Vector3();
              const centroidPoint = new THREE.Vector3(0, 0, 1);
              themeMeta.countryIds.forEach((countryId) => {
                const country = network.byId.get(countryId);
                if (!country) return;
                const p = Globe.getCoords(country.lat, country.lon, 0);
                centroid.add(new THREE.Vector3(p.x, p.y, p.z).normalize());
              });
              if (centroid.lengthSq() > 0) {
                centroid.normalize();
                const q = new THREE.Quaternion().setFromUnitVectors(centroid, centroidPoint);
                const euler = new THREE.Euler().setFromQuaternion(q, "XYZ");
                targetRotX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x));
                targetRotY = euler.y;
              }
            }
            pointerDown = false;
            dragMoved = false;
            return;
          }
        }
        const geo = pickSurface(ndc);
        const country = geo ? nearestCountry(geo.lat, geo.lng, countriesRef.current) : null;
        if (country) {
          setSelected((prev) => (prev?.id === country.id ? null : country));
        } else {
          setSelected(null);
        }
      }
      pointerDown = false;
      dragMoved = false;
      autoTimer = setTimeout(() => {
        if (!reduceMotion) autoRotate = true;
      }, 4000);
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", finishPointer);
    renderer.domElement.addEventListener("pointercancel", finishPointer);

    const ro = new ResizeObserver(() => {
      const W2 = el.clientWidth;
      const H2 = el.clientHeight;
      renderer.setSize(W2, H2);
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      if (Globe) Globe.rendererSize(new THREE.Vector2(W2, H2));
    });
    ro.observe(el);

    let frame;
    const applyLabelOpacity = (labelObj, opacity) => {
      const visible = opacity > 0.001;
      labelObj.visible = visible;

      const dotObj = labelObj.children?.[0];
      const textObj = labelObj.children?.[1];
      const textMat = textObj?.material;
      const dotMat = dotObj?.material;

      if (textMat) {
        textMat.transparent = opacity < 0.999;
        textMat.opacity = opacity;
      }
      if (dotMat && dotMat !== textMat) {
        dotMat.transparent = opacity < 0.999;
        dotMat.opacity = opacity;
      }

      if (labelObj.element) {
        labelObj.element.style.transition = "none";
        labelObj.element.style.opacity = `${opacity}`;
        labelObj.element.style.pointerEvents = visible ? "auto" : "none";
      }
    };

    const updateLabelVisibility = () => {
      if (!Globe) return;

      camera.getWorldPosition(cameraWorldPosition);
      camera.getWorldDirection(cameraForwardVector).normalize();

      const labelEntries = [];
      Globe.traverse((obj) => {
        if (obj.__globeObjType !== "label") return;

        obj.getWorldPosition(labelWorldPosition);
        const dot = cameraToLabelVector
          .copy(labelWorldPosition)
          .sub(cameraWorldPosition)
          .normalize()
          .dot(cameraForwardVector);

        let opacity = 0;
        if (dot > 0.3) opacity = 1;
        else if (dot >= -0.1) opacity = (dot + 0.1) / 0.4;

        labelEntries.push({
          obj,
          dot,
          opacity,
          arousal: typeof obj.__data?.arousal === "number" ? obj.__data.arousal : 0,
        });
      });

      const topFrontLabels = new Set(
        labelEntries
          .filter((entry) => entry.dot > 0 && entry.opacity > 0)
          .sort((a, b) => b.arousal - a.arousal)
          .slice(0, 10)
          .map((entry) => entry.obj)
      );

      labelEntries.forEach((entry) => {
        let nextOpacity = entry.opacity;
        if (nextOpacity > 0 && entry.dot > 0 && !topFrontLabels.has(entry.obj)) {
          nextOpacity = Math.min(nextOpacity, 0.3);
        }
        applyLabelOpacity(entry.obj, nextOpacity);
      });
    };

    const updateThreadOpacity = () => {
      const meshes = threadLayerRef.current.meshes;
      if (!meshes?.length) return;
      const hoveredId = threadLayerRef.current.hoveredId;
      meshes.forEach((mesh) => {
        const edge = mesh.userData?.edge;
        if (!edge || !mesh.material) return;
        const active = hoveredId && hoveredId === edge.id;
        const target = active ? edge.maxOpacity : edge.minOpacity;
        mesh.material.opacity += (target - mesh.material.opacity) * 0.22;
      });
    };

    const updatePointOpacity = () => {
      if (!Globe) return;
      const target = viewModeRef.current === "indicator" ? 0.4 : 1;
      Globe.traverse((obj) => {
        if (obj.__globeObjType !== "point") return;
        const mat = obj.material;
        if (!mat) return;
        mat.transparent = target < 0.999;
        mat.opacity += (target - (mat.opacity ?? 1)) * 0.2;
      });
    };

    function animate() {
      frame = requestAnimationFrame(animate);
      if (autoRotate && !reduceMotion) targetRotY += 0.00045;
      rotX += (targetRotX - rotX) * 0.08;
      rotY += (targetRotY - rotY) * 0.08;
      if (Globe) {
        Globe.rotation.x = rotX;
        Globe.rotation.y = rotY;
        Globe.setPointOfView(camera);
        updateLabelVisibility();
        updatePointOpacity();
        updateThreadOpacity();
      }
      renderer.render(scene, camera);
    }
    animate();

    const bumpLoader = new THREE.TextureLoader();
    const loadBump = () =>
      new Promise((resolve) => {
        bumpLoader.load(
          EARTH_TOPOLOGY_URL,
          (tex) => {
            tex.colorSpace = THREE.NoColorSpace;
            resolve(tex);
          },
          undefined,
          () => resolve(null)
        );
      });

    (async () => {
      const [globeMap, bumpTex] = await Promise.all([
        createSentimentGlobeTexture(countriesRef.current, sentimentColor),
        loadBump(),
      ]);
      if (cleaned) {
        globeMap.dispose();
        if (bumpTex) bumpTex.dispose();
        return;
      }

      bumpTexture = bumpTex;
      globeMat = new THREE.MeshPhongMaterial({
        map: globeMap,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
        shininess: 4,
        specular: new THREE.Color(0xb8b4ae),
      });
      if (bumpTex) {
        globeMat.bumpMap = bumpTex;
        globeMat.bumpScale = 0.032;
      }

      const pointsData = countriesRef.current.map((c) => ({
        lat: c.lat,
        lng: c.lon,
        country: c,
        color: sentimentColor(c.valence),
        arousal: c.arousal,
      }));

      Globe = new ThreeGlobe({ waitForGlobeReady: false, animateIn: false })
        .globeMaterial(globeMat)
        .showGraticules(false)
        .showAtmosphere(false)
        .globeCurvatureResolution(2)
        .pointsData(pointsData)
        .pointLat("lat")
        .pointLng("lng")
        .pointColor("color")
        .pointAltitude(0.014)
        .pointRadius((d) => 0.52 + d.arousal * 0.78)
        .pointsMerge(false)
        .pointsTransitionDuration(0)
        .arcsData([])
        .arcStartLat("startLat")
        .arcStartLng("startLng")
        .arcEndLat("endLat")
        .arcEndLng("endLng")
        .arcColor(() => ["rgba(0,53,204,0.5)", "rgba(229,20,10,0.48)"])
        .arcAltitude(0.48)
        .arcStroke(0.72)
        .arcCircularResolution(useLiteGlobe ? 8 : 12)
        .arcCurveResolution(useLiteGlobe ? 24 : 48)
        .arcsTransitionDuration(1600)
        .labelsData(buildGlobeLabels(countriesRef.current, sentimentColor, null))
        .labelLat("lat")
        .labelLng("lng")
        .labelText("text")
        .labelColor("color")
        .labelAltitude("alt")
        .labelSize("size")
        .labelResolution(3)
        .labelIncludeDot(true)
        .labelDotRadius(0.2)
        .labelDotOrientation("bottom")
        .labelsTransitionDuration(400)
        .pathsData(buildGlobeHopeSpikes(countriesRef.current))
        .pathPoints("points")
        .pathColor("pathColor")
        .pathStroke(0.62)
        .pathResolution(4)
        .pathTransitionDuration(600);

      scene.add(Globe);
      Globe.rendererSize(new THREE.Vector2(el.clientWidth || 800, el.clientHeight || 600));
      sceneRef.current.globe = Globe;
      setGlobeInstance(Globe);
      sceneRef.current.globeMaterial = globeMat;
      applySelectionRings(Globe);
      rebuildThreadMeshes();
    })();

    const layoutResize = () => {
      const w = el.clientWidth || 800;
      const h = el.clientHeight || 600;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (Globe) Globe.rendererSize(new THREE.Vector2(w, h));
    };
    requestAnimationFrame(() => requestAnimationFrame(layoutResize));

    return () => {
      cleaned = true;
      cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", finishPointer);
      renderer.domElement.removeEventListener("pointercancel", finishPointer);
      ro.disconnect();
      sceneRef.current.globe = null;
      setGlobeInstance(null);
      sceneRef.current.globeMaterial = null;
      sceneRef.current.scene = null;
      globeTextureBootRef.current = false;
      if (threadLayerRef.current.group) {
        scene.remove(threadLayerRef.current.group);
        threadLayerRef.current.group.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) node.material.dispose();
        });
      }
      threadLayerRef.current = {
        group: null,
        meshes: [],
        hoveredId: null,
        byThreadId: new Map(),
      };
      if (globeMat) globeMat.dispose();
      if (Globe) Globe._destructor();
      if (bumpTexture) bumpTexture.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [applySelectionRings, isMobile]);

  const capturePoster = useCallback(async (country) => {
    if (!country) return;

    const startedAt = performance.now();
    if (captureResetTimerRef.current) {
      clearTimeout(captureResetTimerRef.current);
      captureResetTimerRef.current = null;
    }
    setCaptureState({ status: "capturing", edition: null });
    setCaptureLiveMessage("");

    try {
      await document.fonts.ready;
      await Promise.all([
        document.fonts.load('600 32px "Geist"'),
        document.fonts.load('300 italic 42px "Open Sans"'),
        document.fonts.load('800 72px "Open Sans"'),
        document.fonts.load('300 36px "Open Sans"'),
        document.fonts.load('400 14px "DM Mono"'),
      ]);

      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      const editionKey = `finding_hope_edition_${country.id}`;
      const nextEdition = Number(localStorage.getItem(editionKey) ?? "0") + 1;
      const edition = editionString(nextEdition);
      const timestamp = new Date().toISOString().toUpperCase();
      const flagEmoji = isoCodeToFlagEmoji(FLAG_CODES[country.id]);
      const dominant = country.words.find((word) => !word.isHope) ?? country.words[0];
      const hopeWord = country.words.find((word) => word.isHope);
      const secondaries = country.words.filter(
        (word) => word.t !== dominant?.t && !word.isHope
      );

      // Ground + grain
      ctx.fillStyle = "#EBE6DA";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawGrainOverlay(ctx, canvas.width, canvas.height, 0.12);

      // Header
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#1A1A1A";
      ctx.font = "600 32px 'Geist', 'Inter', sans-serif";
      ctx.fillText("Finding hope", 80, 160);
      ctx.textAlign = "right";
      ctx.font = "400 14px 'DM Mono', monospace";
      ctx.fillStyle = "rgba(10,10,10,0.55)";
      ctx.fillText(timestamp, 1120, 160);
      ctx.textAlign = "left";
      ctx.strokeStyle = "rgba(10,10,10,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 210);
      ctx.lineTo(1120, 210);
      ctx.stroke();

      // Flag + country
      ctx.font = "400 48px 'Apple Color Emoji'";
      ctx.fillStyle = "#1A1A1A";
      ctx.fillText(flagEmoji, 80, 300);
      ctx.font = "800 72px 'Open Sans', sans-serif";
      ctx.fillText(country.name.toUpperCase(), 150, 312);

      // Phrase
      ctx.font = "italic 300 42px 'Open Sans', sans-serif";
      ctx.fillStyle = "rgba(10,10,10,0.55)";
      const phraseLines = wrapCanvasText(ctx, toSentenceCase(country.phrase), canvas.width * 0.8);
      phraseLines.forEach((line, idx) => {
        ctx.fillText(line, 80, 420 + idx * Math.round(42 * 1.3));
      });

      // Keywords composition
      const scaleMin = 24;
      const scaleMax = 132;
      if (dominant) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.88, dominant.op ?? 0.9);
        ctx.font = `${dominant.it ? "italic " : ""}${dominant.w} 140px 'Open Sans', sans-serif`;
        ctx.fillStyle = dominant.c;
        ctx.fillText(dominant.t, 80, 580);
        ctx.restore();
      }

      secondaries.forEach((word, idx) => {
        const prominence = 1 - idx / Math.max(secondaries.length - 1, 1);
        const size = Math.round(scaleMin + prominence * (scaleMax - scaleMin));
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = 80 + col * 345 + (row % 2 ? 26 : 0);
        const y = 690 + row * 92 + (col === 1 ? 20 : 0);
        if (y > 1260) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0.35, word.op ?? 0.7);
        ctx.font = `${word.it ? "italic " : ""}${word.w} ${size}px 'Open Sans', sans-serif`;
        ctx.fillStyle = word.c;
        ctx.fillText(word.t, x, y);
        ctx.restore();
      });

      if (hopeWord) {
        ctx.save();
        ctx.globalAlpha = 0.96;
        ctx.font = "300 36px 'Open Sans', sans-serif";
        ctx.fillStyle = G;
        const hopeX = 1120 - ctx.measureText(hopeWord.t).width;
        ctx.fillText(hopeWord.t, hopeX, 1210);
        ctx.restore();
      }

      // Footer
      ctx.strokeStyle = "rgba(10,10,10,0.18)";
      ctx.beginPath();
      ctx.moveTo(80, 1380);
      ctx.lineTo(1120, 1380);
      ctx.stroke();
      ctx.font = "400 14px 'DM Mono', monospace";
      ctx.fillStyle = "rgba(10,10,10,0.72)";
      ctx.textBaseline = "middle";
      const metric = `val ${(country.valence >= 0 ? "+" : "") + country.valence.toFixed(2)} · arous ${country.arousal.toFixed(2)}`;
      ctx.textAlign = "left";
      ctx.fillText(`EDITION ${edition} of ∞`, 80, 1420);
      ctx.textAlign = "center";
      ctx.fillText(metric, 600, 1420);
      ctx.textAlign = "right";
      ctx.fillText("findinghope.xyz", 1120, 1420);
      ctx.textAlign = "left";

      // Registration marks
      drawCrosshair(ctx, 24, 24);
      drawCrosshair(ctx, canvas.width - 24, 24);
      drawCrosshair(ctx, 24, canvas.height - 24);
      drawCrosshair(ctx, canvas.width - 24, canvas.height - 24);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((fileBlob) => {
          if (!fileBlob) reject(new Error("Failed to encode PNG"));
          else resolve(fileBlob);
        }, "image/png");
      });

      const elapsed = performance.now() - startedAt;
      if (elapsed < 400) {
        await new Promise((resolve) => setTimeout(resolve, 400 - elapsed));
      }

      localStorage.setItem(editionKey, String(nextEdition));
      const filename = `finding-hope-${country.id}-${edition}.png`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setCaptureState({ status: "success", edition });
      setCaptureLiveMessage(`Edition ${edition} of ${country.name} downloaded`);
      captureResetTimerRef.current = setTimeout(
        () => setCaptureState({ status: "idle", edition: null }),
        2000
      );
    } catch {
      setCaptureState({ status: "error", edition: null });
      captureResetTimerRef.current = setTimeout(
        () => setCaptureState({ status: "idle", edition: null }),
        2200
      );
    }
  }, []);

  // ── Paint word overlay ────────────────────────────────────────────────────
  const openWord = useCallback((word) => {
    setPaintIn(false);
    setPaintWord(word);
    if (word.isHope) playHopeChime();
    requestAnimationFrame(() => requestAnimationFrame(() => setPaintIn(true)));
  }, [playHopeChime]);
  const closeWord = useCallback(() => {
    setPaintIn(false);
    setTimeout(() => setPaintWord(null), 480);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key !== "Escape") return;
      if (ohMomentActiveRef.current) {
        finishOhMoment();
        return;
      }
      closeWord();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [closeWord, finishOhMoment]);

  // Poster font size — word fills ~88% of viewport width as a graphic element.
  // Open Sans chars are narrower (~0.52 x em), Instrument Serif wider (~0.64 x em).
  const paintFs = (text, face = "serif") => {
    const textStr = text || "";
    const n = textStr.replace(/\s/g, "").length || 1;
    const isAllCaps = textStr === textStr.toUpperCase() && textStr !== "";
    const baseW = face === "sans" ? 0.52 : 0.64;
    const charW = isAllCaps ? baseW * 1.4 : baseW;
    const raw = 88 / (n * charW);
    const capped = Math.min(raw, face === "sans" ? 36 : 32);
    return `clamp(2rem, ${capped.toFixed(1)}vw, 30vw)`;
  };

  /**
   * Data-driven type voice for the poster headline.
   * Returns { family, weight, style, tracking, face }
   *   isHope                   → Instrument Serif roman (settled certainty)
   *   negative + high arousal  → Open Sans 800   (pressure, front-page)
   *   negative + low arousal   → Instrument Serif italic (quiet, reflective)
   *   positive                 → Open Sans 300   (open, breath)
   *   neutral                  → Instrument Serif italic (default)
   */
  const paintTypography = (word, regionValence = 0, regionArousal = 0.5) => {
    if (word?.isHope)
      return { family:"'Instrument Serif', Georgia, serif", weight:400, style:"normal", tracking:"-0.01em", face:"serif" };
    const v = typeof word?.vh === "number" ? word.vh : regionValence;
    const a = Math.max(0, Math.min(1, regionArousal));
    if (v < -0.15 && a > 0.42)
      return { family:FONT.display, weight:800, style:"normal", tracking:"-0.02em", face:"sans" };
    if (v > 0.15)
      return { family:FONT.display, weight:300, style:"normal", tracking:"0.02em", face:"sans" };
    return   { family:"'Instrument Serif', Georgia, serif", weight:400, style:"italic", tracking:"-0.01em", face:"serif" };
  };

  const overlayBg = paintWord?.c || K;
  const overlayFg = overlayBg === G ? K : "#FFFFFF";
  const overlayStrip = selected
    ? primarySentimentStripLabel(selected.valence, selected.arousal)
    : "";
  const overlayValence = selected?.valence ?? 0;
  const motion = paintMotion(paintWord, selected?.valence, selected?.arousal);
  const typo = paintTypography(paintWord, selected?.valence, selected?.arousal);

  // Coord masthead for the poster corner
  const posterCoords = selected
    ? `${Math.abs(selected.lat).toFixed(0)}°${selected.lat >= 0 ? "N" : "S"} ${Math.abs(selected.lon).toFixed(0)}°${selected.lon >= 0 ? "E" : "W"}`
    : "";
  const posterDate = new Date().toLocaleString("en-GB", { month:"short", year:"numeric" }).toUpperCase();

  const paintSweepCss = paintIn
    ? `${motion.sweepAnim} ${motion.sweepDuration}ms ${motion.sweepEasing} both`
    : "none";
  // Word entrance fires just after the sweep has settled.
  const wordStartDelay = motion.sweepDuration / 1000 - 0.02;
  const wordEntranceCss = (() => {
    if (!paintIn) return "none";
    if (motion.wordEntrance === "cascade") return "none"; // letters handle it
    if (motion.wordEntrance === "bloom")
      return `wordBloom 620ms cubic-bezier(0.22,1,0.36,1) ${wordStartDelay}s both`;
    return `wordFadeScale 480ms cubic-bezier(0.22,1,0.36,1) ${wordStartDelay}s both`;
  })();
  const wordEntranceEndsAt =
    wordStartDelay + (motion.wordEntrance === "cascade"
      ? (paintWord?.t?.length ?? 0) * 0.035 + 0.38
      : motion.wordEntrance === "bloom" ? 0.62 : 0.48);
  const wordHumCss =
    paintIn && motion.breathe
      ? `wordHum 2600ms ease-in-out ${wordEntranceEndsAt + 0.25}s infinite`
      : "none";
  const captureButtonLabel =
    captureState.status === "capturing"
      ? "Capturing…"
      : captureState.status === "success"
        ? `Edition ${captureState.edition} saved ↓`
        : captureState.status === "error"
          ? "Couldn't capture — try again"
          : "Capture ↓";
  const globeDimOpacity = ohMomentActive ? 1 - ohMomentBackdropOpacity : 1;

  return (
    <>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        * { -webkit-font-smoothing:antialiased; font-kerning:normal; }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tsDrawerIn { from{opacity:0;transform:translate3d(100%,0,0)} to{opacity:1;transform:translate3d(0,0,0)} }
        @keyframes paintSweep { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        @keyframes paintSweepX { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        @keyframes paintSweepY { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        @keyframes paintSweepRadial { from{clip-path:circle(0% at 50% 50%)} to{clip-path:circle(140% at 50% 50%)} }
        @keyframes hopeBreath { 0%,100%{opacity:.75} 50%{opacity:1} }
        @keyframes wordIn { from{opacity:0} to{opacity:1} }
        @keyframes wordFadeScale { from{opacity:0;transform:scale(0.985)} to{opacity:1;transform:scale(1)} }
        @keyframes wordBloom { from{opacity:0} to{opacity:1} }
        @keyframes wordHum { 0%,100%{transform:scale(1)} 50%{transform:scale(1.006)} }
        @keyframes letterIn { from{opacity:0;transform:translateY(0.14em)} to{opacity:1;transform:translateY(0)} }
        @media(prefers-reduced-motion:reduce){
          *,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;}
        }
        @media (prefers-reduced-motion: reduce) {
          .ts-panel { animation-name: fadeIn !important; }
        }
        .ts-panel-dismiss:hover { background: rgba(255,252,247,1) !important; border-color: rgba(30,28,26,0.28) !important; }
        .ts-panel-dismiss:active { transform: scale(0.96); }
        .ts-toggle-btn:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
        .ts-capture-btn:focus-visible { outline: 2px solid rgba(0,53,204,0.75); }
        .ts-overlay-dismiss:hover { filter: brightness(1.08); }
        .ts-overlay-dismiss:active { transform: scale(0.94); }
        .ts-globe-mount {
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        @media (max-width: 720px) {
          .ts-main { flex-direction:column !important; }
          .ts-globe-host { min-height:min(52vh, 420px) !important; flex:1 1 auto !important; }
          .ts-panel {
            width:100% !important; max-width:none !important; border-left:none !important;
            border-top:1px solid rgba(30,28,26,0.1) !important; max-height:min(46vh, 380px) !important;
            animation-name: slideUp !important;
          }
          .ts-header { flex-direction:column !important; align-items:flex-start !important; gap:10px; padding-left:20px !important; padding-right:20px !important; }
          .ts-legend { left:20px !important; right:16px !important; bottom:16px !important; gap:8px !important; }
          .ts-live-status { right:20px !important; bottom:16px !important; max-width:min(240px, 52vw) !important; }
        }
      `}</style>

      <div style={{ 
        width:"100%", 
        height:"100vh", 
        background: `radial-gradient(circle at center, ${SHELL} 10%, #a8a294 150%)`, 
        display:"flex", 
        flexDirection:"column", 
        overflow:"hidden", 
        fontFamily:FONT.display 
      }}>
        <div
          aria-live="polite"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
          }}
        >
          {captureLiveMessage} {ariaGlobeMessage}
        </div>

        {/* ── Main: full-height globe + panel; masthead floats over globe (no top bar) ── */}
        <div className="ts-main" style={{ flex:1, display:"flex", minHeight:0, position:"relative" }}>
          {isMobile ? (
            <MobileSentimentList countries={countries} onWordClick={openWord} />
          ) : (
            <>
              {/* Masthead — transparent overlay, does not reserve vertical strip */}
              <header
                className="ts-header"
                style={{
              position:"absolute",
              top:0,
              left:0,
              right:0,
              display:"flex",
              alignItems:"flex-end",
              justifyContent:"space-between",
              padding:`${STACK * 3}px ${GUTTER}px ${STACK * 2}px`,
              zIndex:10,
              background:"transparent",
              border:"none",
              pointerEvents:"none",
            }}
          >
            <div style={{ display:"flex", flexDirection:"column", gap:2, pointerEvents:"auto" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "2px",
                  pointerEvents: "auto",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Caveat', cursive",
                    fontWeight: 700,
                    fontSize: "clamp(1.5rem, 3.5vw, 2.4rem)",
                    letterSpacing: "0.02em",
                    lineHeight: 1.02,
                    color: INK,
                    textTransform:"none",
                  }}
                >
                  Finding hope
                </span>
              </div>
              <span
                style={{
                  fontFamily:FONT.display,
                  fontSize:CAP_SM,
                  letterSpacing:"0.04em",
                  textTransform:"none",
                  color:LABEL_SOFT,
                  textShadow:"0 0 14px rgba(232,228,219,0.85)",
                }}
              >
                Hard headlines, one hope each · {REGION_COUNT} regions
              </span>
              <span
                style={{
                  fontFamily:FONT.display,
                  fontSize:CAP_SM,
                  letterSpacing:"0.04em",
                  textTransform:"none",
                  color:LABEL_SOFT,
                  textShadow:"0 0 14px rgba(232,228,219,0.85)",
                  opacity: 0.65,
                }}
              >
                {liveSource === "live" || liveSource === "fallback"
                  ? dataTimestamp
                    ? `${liveSource === "live" ? "Live API" : "Simulated"} sequence · ${new Date(dataTimestamp).getHours().toString().padStart(2, '0')}:${new Date(dataTimestamp).getMinutes().toString().padStart(2, '0')}`
                    : `Feed sequence`
                  : `Connecting…`}
              </span>
            </div>
            <div style={{ display: "flex", gap: "24px", alignItems: "center", pointerEvents: "auto" }}>
              <button
                type="button"
                onClick={toggleMute}
                className="ts-icon-btn"
                title={`Sound ${isMuted ? "Off" : "On"}`}
                style={{ color: INK }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  {isMuted ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <line x1="23" y1="9" x2="17" y2="15"></line>
                      <line x1="17" y1="9" x2="23" y2="15"></line>
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </>
                  )}
                </svg>
              </button>
              <Link
                className="ts-icon-btn"
                to="/about"
                title="About this project"
                style={{ color: INK, textDecoration: "none" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </Link>
            </div>
          </header>

          {/* Globe: inner mount is canvas-only (React must not own siblings of WebGL). Status overlays map corner. */}
          <div
            className="ts-globe-host"
            style={{ flex:1, minWidth:0, position:"relative", cursor:"grab", opacity: globeDimOpacity }}
            aria-label="Finding hope. Select a region to open its word set."
          >
            <div
              ref={mountRef}
              className="ts-globe-mount"
              style={{ position:"absolute", inset:0, zIndex:0 }}
            />
            {/* User Instruction */}
            <div
              style={{
                position:"absolute",
                bottom:STACK * 4,
                left:"50%",
                transform:"translateX(-50%)",
                zIndex:5,
                pointerEvents:"none",
                textAlign:"center",
                opacity: 0.6,
                fontFamily:FONT.display,
                fontSize:CAP_SM,
                letterSpacing:"0.04em",
                color:INK,
              }}
            >
              Click and drag to rotate
            </div>
            {false && viewMode === "indicator" && threadTooltip && (
              <div
                style={{
                  position: "absolute",
                  left: Math.max(16, threadTooltip.x - 140),
                  top: Math.max(16, threadTooltip.y - 72),
                  zIndex: 12,
                  pointerEvents: "none",
                  padding: `${STACK - 1}px ${STACK + 3}px`,
                  border: "1px solid rgba(30,28,26,0.2)",
                  background: "rgba(20,18,16,0.92)",
                  color: "#fffaf0",
                  minWidth: 220,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontFamily: FONT.mono,
                    fontSize: CAP,
                    letterSpacing: TRACK_UI,
                    textTransform: "none",
                    lineHeight: 1.4,
                  }}
                >
                  {`${threadTooltip.title} · ${threadTooltip.countryCount} countries · "${toSentenceCase(String(threadTooltip.exampleWord).toLowerCase())}"`}
                </span>
              </div>
            )}
          </div>

          {/* Legend — stacked column so width stays narrow and clears the globe */}
          <div
            className="ts-legend"
            role="group"
            aria-label="Map key"
            style={{
              position:"absolute",
              bottom:STACK * 3,
              left:GUTTER,
              display:"flex",
              flexDirection:"column",
              alignItems:"stretch",
              gap:STACK - 2,
              width:"max-content",
              maxWidth:"min(280px, 70vw)",
              animation:"fadeIn 1s ease 0.6s both",
            }}
          >
            {/* View toggle — Hope (default) / Threads. Tucked at the top of the legend stack so it reads as map key. */}
            <div
              role="radiogroup"
              aria-label="Map reading"
              style={{
                display:"flex",
                alignItems:"stretch",
                padding:2,
                border:`1px solid rgba(30,28,26,0.12)`,
                background:"rgba(255,252,247,0.82)",
                pointerEvents:"auto",
              }}
            >
              {[
                { id:"hope",    label:"Hope",    title:"The gold spike represents a found hope in that region. Even in the deepest turmoil, there is a spark." },
                { id:"indicator", label:"Indicator", title:"Indicator view shows native spikes where height is based on the hope vs turmoil polarity and colour reflects sentiment." },
              ].map((opt) => {
                const active = viewMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    className="ts-toggle-btn"
                    type="button"
                    role="radio"
                    aria-checked={active}
                    title={opt.title}
                    onClick={() => setViewMode(opt.id)}
                    style={{
                      flex:"1 1 0",
                      padding:`${STACK - 2}px ${STACK + 2}px`,
                      fontFamily:FONT.display,
                      fontSize:12,
                      letterSpacing:"0.02em",
                      textTransform:"none",
                      color: active ? "#fffaf0" : LABEL,
                      background: active ? INK : "transparent",
                      border:"none",
                      cursor:"pointer",
                      lineHeight:1.2,
                      textAlign:"center",
                      transition:"background 160ms ease, color 160ms ease",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {[["#E5140A","−"],["#6B6B6B","0"],["#0035CC","+"]].map(([c, l]) => (
              <div
                key={c}
                style={{
                  display:"flex",
                  alignItems:"center",
                  gap:8,
                  padding:`${STACK - 1}px ${STACK + 3}px`,
                  border:`1px solid rgba(30,28,26,0.12)`,
                  background:"rgba(255,252,247,0.82)",
                }}
              >
                <span style={{ width:10, height:10, background:c, flexShrink:0 }} aria-hidden />
                <span style={{ fontFamily:FONT.display, fontSize:CAP, letterSpacing:"0.01em", textTransform:"none", color:LABEL }}>
                  {l === "−" ? "Negative" : l === "+" ? "Positive" : "Neutral"}
                </span>
              </div>
            ))}
            <div
              style={{
                display:"grid",
                gridTemplateAreas: '"stack"',
                alignItems:"center",
                padding:`${STACK - 1}px ${STACK + 3}px`,
                border:`1px solid rgba(30,28,26,0.1)`,
                background:"rgba(255,252,247,0.62)",
              }}
            >
              {/* Both strings always in the DOM — grid stacks them so widest dictates container width,
                  inactive one is invisible so the box never reflows on toggle. */}
              <span
                aria-hidden={viewMode !== "hope"}
                style={{
                  gridArea: "stack",
                  fontFamily:FONT.display, fontSize:CAP_SM, letterSpacing:"0.01em",
                  textTransform:"none", color:LABEL_SOFT, lineHeight:1.35,
                  visibility: viewMode === "hope" ? "visible" : "hidden",
                  whiteSpace:"nowrap",
                }}
              >
                Gold spike = A found hope
              </span>
              <span
                aria-hidden={viewMode !== "indicator"}
                style={{
                  gridArea: "stack",
                  fontFamily:FONT.display, fontSize:CAP_SM, letterSpacing:"0.01em",
                  textTransform:"none", color:LABEL_SOFT, lineHeight:1.35,
                  visibility: viewMode === "indicator" ? "visible" : "hidden",
                  whiteSpace:"nowrap",
                }}
              >
                Indicator = polarity (turmoil vs hope)
              </span>
            </div>
          </div>

          {/* Hovered country name is shown on the globe at lat/lng via labelsData (buildGlobeLabels(..., hovered)). */}

          {false && selectedTheme && viewMode === "indicator" && (
            <aside
              className="ts-panel"
              style={{
                width: "min(460px, 44vw)",
                flexShrink: 0,
                background: `linear-gradient(180deg, ${PAPER} 0%, ${SHELL} 50%, ${SHELL_DEEP} 100%)`,
                borderLeft: `1px solid rgba(30,28,26,0.14)`,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "tsDrawerIn 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
                position: "relative",
                zIndex: 30,
                boxShadow: "-16px 0 48px rgba(24,22,18,0.12), -1px 0 0 rgba(255,252,247,0.4) inset",
                color: PANEL_READING,
              }}
              aria-label={`Theme ${selectedTheme.title}`}
            >
              <div
                style={{
                  padding: `${STACK * 2}px ${GUTTER}px ${STACK + 8}px`,
                  borderBottom: "1px solid rgba(30,28,26,0.1)",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  background: "rgba(240,235,227,0.75)",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      fontFamily: FONT.title,
                      fontWeight: 900,
                      fontSize: "clamp(1.9rem, 4vw, 2.8rem)",
                      letterSpacing: "-0.02em",
                      textTransform: "none",
                      color: THEME_COLORS[selectedTheme.theme] ?? INK,
                      lineHeight: 0.9,
                      margin: 0,
                    }}
                  >
                    {selectedTheme.title}
                  </p>
                  <p
                    style={{
                      marginTop: 10,
                      fontFamily: FONT.mono,
                      fontSize: CAP_SECTION,
                      letterSpacing: TRACK_UI,
                      textTransform: "none",
                      color: PANEL_MUTED,
                    }}
                  >
                    {`${selectedTheme.countryCount} countries affected`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedThemeKey(null)}
                  aria-label="Close theme panel"
                  className="ts-panel-dismiss"
                  style={{
                    flexShrink: 0,
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid rgba(30,28,26,0.18)`,
                    borderRadius: 2,
                    background: "rgba(255,252,247,0.85)",
                    color: INK,
                    cursor: "pointer",
                    fontFamily: FONT.display,
                    fontWeight: 300,
                    fontSize: 28,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  <span aria-hidden style={{ position: "relative", top: -1 }}>×</span>
                </button>
              </div>

              <div
                style={{
                  padding: `${STACK + 8}px ${GUTTER}px`,
                  borderBottom: "1px solid rgba(30,28,26,0.1)",
                  background: "rgba(255,252,247,0.45)",
                }}
              >
                <p
                  style={{
                    margin: `0 0 ${STACK}px`,
                    fontFamily: FONT.mono,
                    fontSize: CAP_SECTION,
                    letterSpacing: TRACK_UI,
                    textTransform: "none",
                    color: PANEL_MUTED,
                  }}
                >
                  Countries in this thread
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 10px" }}>
                  {selectedTheme.countryIds.map((countryId) => {
                    const country = themeNetwork.byId.get(countryId);
                    if (!country) return null;
                    return (
                      <button
                        key={countryId}
                        type="button"
                        onClick={() => {
                          setViewMode("hope");
                          setSelectedThemeKey(null);
                          setSelected(country);
                        }}
                        style={{
                          fontFamily: FONT.mono,
                          fontSize: CAP_SM,
                          letterSpacing: TRACK_UI,
                          textTransform: "none",
                          color: INK,
                          background: "rgba(255,252,247,0.9)",
                          border: "1px solid rgba(30,28,26,0.14)",
                          padding: "6px 8px",
                          cursor: "pointer",
                        }}
                      >
                        {country.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  padding: `${STACK + 10}px ${GUTTER}px ${STACK * 3}px`,
                }}
              >
                <p
                  style={{
                    margin: `0 0 ${STACK}px`,
                    fontFamily: FONT.mono,
                    fontSize: CAP_SECTION,
                    letterSpacing: TRACK_UI,
                    textTransform: "none",
                    color: PANEL_MUTED,
                  }}
                >
                  Shared words
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selectedTheme.wordGroups.map((group) => (
                    <div
                      key={group.word}
                      style={{
                        border: "1px solid rgba(30,28,26,0.12)",
                        background: "rgba(255,252,247,0.72)",
                        padding: `${STACK}px ${STACK + 4}px`,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontFamily: FONT.mono,
                          fontSize: CAP_SECTION,
                          letterSpacing: TRACK_UI,
                          textTransform: "none",
                          color: THEME_COLORS[selectedTheme.theme] ?? INK,
                        }}
                      >
                        {group.word}
                      </p>
                      <p
                        style={{
                          marginTop: 6,
                          fontFamily: FONT.display,
                          fontSize: PANEL_BODY_SM,
                          letterSpacing: "0.02em",
                          color: PANEL_READING,
                          lineHeight: 1.4,
                        }}
                      >
                        {group.countryIds
                          .map((countryId) => themeNetwork.byId.get(countryId)?.name)
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* ── Country word panel ── */}
          {selected && (
            <aside
              className="ts-panel"
              style={{
                width:"min(440px, 42vw)",
                flexShrink:0,
                background:`linear-gradient(180deg, ${PAPER} 0%, ${SHELL} 50%, ${SHELL_DEEP} 100%)`,
                borderLeft:`1px solid rgba(30,28,26,0.14)`,
                display:"flex",
                flexDirection:"column",
                overflow:"hidden",
                animation:"tsDrawerIn 0.42s cubic-bezier(0.22, 1, 0.36, 1) both",
                position:"relative",
                zIndex:30,
                boxShadow:"-16px 0 48px rgba(24,22,18,0.12), -1px 0 0 rgba(255,252,247,0.4) inset",
                fontSize:PANEL_BODY,
                lineHeight:1.45,
                color:PANEL_READING,
              }}
              aria-label={`Region ${selected.name}`}
            >
              <div
                style={{
                  padding:`${STACK * 2}px ${GUTTER}px ${STACK + 8}px`,
                  flexShrink:0,
                  position:"relative",
                  zIndex:2,
                  display:"flex",
                  alignItems:"flex-start",
                  justifyContent:"space-between",
                  gap:14,
                  background:`linear-gradient(180deg, #f0ebe3 0%, rgba(240,235,227,0.5) 100%)`,
                  borderBottom:"1px solid rgba(30,28,26,0.1)",
                }}
              >
                <div style={{ minWidth:0, flex:1 }}>
                  {/* Flag + name row */}
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    {flagUrl(selected.id) && (
                      <img
                        src={flagUrl(selected.id)}
                        alt={`${selected.name} flag`}
                        width={28}
                        height={20}
                        style={{
                          objectFit:"cover",
                          borderRadius:2,
                          flexShrink:0,
                          boxShadow:"0 1px 4px rgba(0,0,0,0.14)",
                          display:"block",
                        }}
                      />
                    )}
                  <p
                    style={{
                      fontFamily:FONT.display,
                      fontWeight:600,
                      fontSize:"clamp(1.35rem, 2.4vw, 1.75rem)",
                      letterSpacing:"-0.03em",
                      textTransform:"none",
                      color:INK,
                      lineHeight:1.05,
                    }}
                  >
                    {selected.name}
                  </p>
                  </div>
                  <div
                    style={{
                      marginTop:10,
                      display:"flex",
                      flexWrap:"wrap",
                      alignItems:"baseline",
                      justifyContent:"flex-start",
                      gap:"8px 16px",
                    }}
                  >
                    <p
                      style={{
                        margin:0,
                        fontFamily:FONT.mono,
                        fontSize:'0.65rem',
                        fontWeight:600,
                        letterSpacing:'0.1em',
                        color:PANEL_MUTED,
                        textTransform:'uppercase',
                        marginBottom:'2px',
                      }}
                    >
                      Current Mood
                    </p>
                    <p
                      style={{
                        margin:0,
                        fontFamily:FONT.title,
                        fontSize:'1.1rem',
                        fontWeight:700,
                        letterSpacing:'-0.02em',
                        textTransform:"none",
                        color:sentimentHeroInk(selected.valence),
                      }}
                      title="Editorial interpretation of the current news data."
                    >
                      {primarySentimentStripLabel(selected.valence, selected.arousal)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close region panel"
                  className="ts-panel-dismiss"
                  style={{
                    flexShrink:0,
                    width:44,
                    height:44,
                    marginTop:-2,
                    marginRight:-2,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    border:`1px solid rgba(30,28,26,0.18)`,
                    borderRadius:2,
                    background:"rgba(255,252,247,0.85)",
                    color:INK,
                    cursor:"pointer",
                    fontFamily:FONT.display,
                    fontWeight:300,
                    fontSize:28,
                    lineHeight:1,
                    padding:0,
                    transition:"background .15s, border-color .15s, transform .15s",
                  }}
                >
                  <span aria-hidden style={{ position:"relative", top:-1 }}>×</span>
                </button>
              </div>

              <div
                style={{
                  padding:`${STACK + 8}px ${GUTTER}px ${STACK * 3}px`,
                  flexShrink:0,
                  borderBottom:"1px solid rgba(30,28,26,0.1)",
                  background:"rgba(255,252,247,0.35)",
                }}
              >
                <p
                  style={{
                    fontFamily:FONT.serif,
                    fontStyle:"italic",
                    fontWeight:400,
                    fontSize:"clamp(1.25rem, 2.8vw, 1.65rem)",
                    letterSpacing:"0.02em",
                    textTransform:"none",
                    color:PANEL_READING,
                    lineHeight:1.55,
                    margin:0,
                    maxWidth:"38rem",
                  }}
                >
                  {toSentenceCase(selected.phrase)}
                </p>
              </div>

              <div style={{ flex:1, position:"relative", minHeight:0, overflow:"auto", padding:`${STACK + 10}px ${GUTTER}px ${STACK * 3}px` }}>
                <div
                  style={{
                    position:"relative",
                    zIndex:1,
                    border:"1px solid rgba(30,28,26,0.14)",
                    borderRadius:2,
                    background:"#f7f5f0",
                    padding:`${STACK + 10}px ${STACK + 10}px ${STACK + 8}px`,
                    boxShadow:"inset 0 1px 0 rgba(255,255,255,0.85)",
                  }}
                >
                  <p
                    style={{
                      fontFamily:FONT.mono,
                      fontWeight:500,
                      fontSize:CAP_SECTION,
                      letterSpacing:TRACK_UI,
                      textTransform:"none",
                      color:PANEL_MUTED,
                      margin:`0 0 ${STACK}px`,
                    }}
                  >
                    Words in the news
                  </p>
                  <p
                    style={{
                      fontFamily:FONT.display,
                      fontWeight:400,
                      fontSize:PANEL_BODY_SM,
                      letterSpacing:"0.01em",
                      lineHeight:1.45,
                      color:PANEL_MUTED,
                      margin:`0 0 ${STACK + 6}px`,
                      maxWidth:"36rem",
                    }}
                  >
                    Bigger words mean more people are talking about them. Red means bad news, blue means good news, and black is in between.
                  </p>
                  <div
                    style={{
                      display:"flex",
                      flexWrap:"wrap",
                      alignItems:"center", // Centers items vertically on each flex line to reduce bounciness
                      alignContent: "flex-start",
                      gap:"4px 8px", // Tighter gaps
                      lineHeight: 1,
                      maxHeight:"min(50vh, 480px)",
                      overflowY:"auto",
                    }}
                  >
                    {selected.words.map((word, i) => {
                      const nW = selected.words.length;
                      // Reduced max font size from 38 to 26 so long words don't force empty lines
                      const fontSize = 14 + (1 - i / Math.max(nW - 1, 1)) * 12;
                      const hint = valenceHintColor(word.vh);
                      const ink = word.isHope ? HOPE_GOLD : word.c;
                      const useItalic = Boolean(word.it && word.w <= 400);
                      return (
                        <span
                          key={`${word.t}-${i}`}
                          style={{ display:"inline-flex", alignItems:"center", gap: hint ? 4 : 0, maxWidth:"100%" }}
                        >
                          {hint ? (
                            <span
                              title={word.vh != null ? `Word valence hint ${word.vh.toFixed(2)}` : undefined}
                              style={{
                                width:4,
                                height: Math.round(Math.max(14, fontSize * 0.7)),
                                background: hint,
                                flexShrink:0,
                                opacity:0.95,
                                borderRadius:1,
                              }}
                              aria-hidden
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openWord(word)}
                            aria-label={word.isHope ? `${word.t} — counterweight` : word.t}
                            style={{
                              fontFamily:FONT.display,
                              fontWeight:word.w,
                              fontStyle: useItalic ? "italic" : "normal",
                              fontSize,
                              letterSpacing:tr(word.w, useItalic),
                              textTransform:"none",
                              color: ink,
                              opacity: Math.max(word.op, word.isHope ? 0.98 : 0.88),
                              lineHeight:1,
                              textAlign:"left",
                              background:"transparent",
                              border:"none",
                              cursor:"pointer",
                              padding: useItalic ? "4px 6px 4px 2px" : "4px 2px",
                              margin:0,
                              transition:"opacity .15s, transform .15s",
                              animation:`wordIn .45s ease ${(i * 0.04).toFixed(2)}s both`,
                              ...(word.isHope && { animation:`wordIn .6s ease ${(i * 0.04).toFixed(2)}s both, hopeBreath 3.5s ease-in-out ${(i * 0.04 + 0.6).toFixed(2)}s infinite` }),
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = "1";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = String(Math.max(word.op, word.isHope ? 0.98 : 0.88));
                              e.currentTarget.style.transform = "none";
                            }}
                          >
                            {word.t}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {(selected.sources?.length ?? 0) > 0 ? (
                <div
                  style={{
                    padding:`${STACK * 3}px ${GUTTER}px ${STACK * 3}px`,
                    borderTop:"1px solid rgba(30,28,26,0.1)",
                    flexShrink:0,
                    position:"relative",
                    zIndex:2,
                    background:`linear-gradient(180deg, rgba(255,252,247,0.9) 0%, ${SHELL_DEEP} 100%)`,
                  }}
                >
                  <p
                    style={{
                      fontFamily:FONT.mono,
                      fontWeight:500,
                      fontSize:CAP_SECTION,
                      letterSpacing:TRACK_UI,
                      textTransform:"none",
                      color:PANEL_MUTED,
                      margin:`0 0 ${STACK}px`,
                    }}
                  >
                    Sources
                  </p>
                  <p style={{ fontFamily:FONT.mono, fontSize:14, lineHeight:1.55, color:PANEL_READING, margin:0 }}>
                    {(selected.sources ?? []).join(" · ")}
                  </p>
                </div>
              ) : null}

              {viewMode === "hope" && !ohMomentActive && (
                <button
                  className="ts-capture-btn"
                  type="button"
                  onClick={() => capturePoster(selected)}
                  disabled={captureState.status === "capturing"}
                  aria-label={`Download poster of ${selected.name}`}
                  style={{
                    position: "absolute",
                    right: GUTTER,
                    bottom: STACK * 2,
                    zIndex: 6,
                    fontFamily: FONT.mono,
                    fontSize: CAP_SECTION,
                    letterSpacing: TRACK_UI,
                    textTransform: "none",
                    color: captureState.status === "error" ? "#9f1b12" : INK,
                    border: "1px solid rgba(30,28,26,0.2)",
                    background: "rgba(255,252,247,0.9)",
                    padding: "10px 12px",
                    cursor: captureState.status === "capturing" ? "default" : "pointer",
                    borderRadius: 2,
                    outlineOffset: 2,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                  }}
                >
                  {captureButtonLabel}
                </button>
              )}
            </aside>
          )}
          </>
          )}
        </div>

        {ohMomentActive && (
          <div
            aria-live="polite"
            data-phase={ohMomentPhase}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 540,
              pointerEvents: "auto",
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: "#000000",
                opacity: ohMomentBackdropOpacity,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "45%",
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                textAlign: "center",
                padding: "0 24px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: FONT.display,
                  fontWeight: 100,
                  fontStyle: "italic",
                  fontSize: "clamp(28px, 4vw, 48px)",
                  letterSpacing: "0.04em",
                  color: `rgba(255,255,255,${(0.85 * ohMomentTextOpacity).toFixed(3)})`,
                  lineHeight: 1.15,
                }}
              >
                In every country you visited, there is a word in gold.
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  lineHeight: 1.1,
                  marginTop: 4,
                  minHeight: "calc(clamp(64px, 10vw, 140px) * 3.4)",
                  justifyContent: "center",
                }}
              >
                {visitedHopes.slice(0, 3).map((word, i) => (
                  <p
                    key={`${word}-${i}`}
                    style={{
                      margin: 0,
                      fontFamily: FONT.display,
                      fontWeight: 300,
                      fontSize: "clamp(64px, 10vw, 140px)",
                      color: THEME_COLORS.hope,
                      letterSpacing: "0.02em",
                      opacity: ohMomentWordOpacities[i] ?? 0,
                    }}
                  >
                    {word}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Paint word overlay ── */}
        {paintWord && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${paintWord.t}${paintWord.isHope ? " — a note of hope" : ""}`}
            style={{ position:"fixed", inset:0, zIndex:600, cursor:"pointer", overflow:"hidden", outline:"none" }}
            tabIndex={-1}
            onClick={closeWord}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
                e.preventDefault();
                closeWord();
              }
            }}
          >
            {/* Paint coat — sweep origin/axis/ease all come from the motion spec. */}
            <div
              style={{
                position:"absolute",
                inset:0,
                background:overlayBg,
                transformOrigin:motion.sweepOrigin,
                animation:paintSweepCss,
                pointerEvents:"none",
                willChange:"transform, clip-path",
              }}
            />
            {/* Grain — rides on top of the paint coat so the colour field stops reading as flat hex. */}
            <div
              aria-hidden
              style={{
                position:"absolute",
                inset:0,
                backgroundImage:PAINT_GRAIN_URL,
                backgroundSize:"240px 240px",
                opacity: overlayFg === K ? 0.06 : 0.05,
                mixBlendMode: overlayFg === K ? "multiply" : "overlay",
                pointerEvents:"none",
                animation: paintIn ? `fadeIn 500ms ease ${motion.sweepDuration / 1000 - 0.1}s both` : "none",
              }}
            />
            <button
              type="button"
              className="ts-overlay-dismiss"
              onClick={(e) => {
                e.stopPropagation();
                closeWord();
              }}
              aria-label="Close — return to globe"
              style={{
                position:"fixed",
                top:22,
                right:26,
                zIndex:602,
                display:"flex",
                flexDirection:"column",
                alignItems:"flex-end",
                gap:2,
                background:"none",
                border:"none",
                cursor:"pointer",
                padding:0,
                transition:"opacity .15s",
              }}
            >
              <span style={{
                fontFamily:"'DM Mono'",
                fontSize:9,
                letterSpacing:"0.26em",
                textTransform:"none",
                color: overlayFg === K ? "rgba(0,0,0,.45)" : "rgba(255,255,255,.45)",
                lineHeight:1,
              }} aria-hidden>
                Esc
              </span>
              <span style={{
                fontFamily:FONT.display,
                fontWeight:200,
                fontSize:22,
                letterSpacing:"0.12em",
                textTransform:"none",
                color: overlayFg === K ? "rgba(0,0,0,.55)" : "rgba(255,255,255,.55)",
                lineHeight:1,
              }} aria-hidden>
                Close
              </span>
            </button>
            {paintIn && (
              <div
                style={{ position:"absolute", inset:0, overflow:"hidden", cursor:"default" }}
              >
                {/* ── Top-left masthead: flag · series ID · coords · date ── */}
                <div style={{
                  position:"absolute",
                  top:28,
                  left:32,
                  display:"flex",
                  flexDirection:"column",
                  gap:6,
                  animation:`fadeIn .28s ease ${motion.stripDelay}s both`,
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {flagUrl(selected?.id) && (
                      <img
                        src={flagUrl(selected.id)}
                        alt={`${selected.name} flag`}
                        width={22}
                        height={15}
                        style={{
                          objectFit:"cover",
                          borderRadius:1,
                          flexShrink:0,
                          opacity: overlayFg === K ? 0.88 : 0.82,
                          boxShadow:"0 1px 3px rgba(0,0,0,0.22)",
                          display:"block",
                        }}
                      />
                    )}
                    <span style={{
                      fontFamily:"'DM Mono'",
                      fontSize:11,
                      letterSpacing:"0.22em",
                      textTransform:"none",
                      color:overlayFg === K ? "rgba(0,0,0,.55)" : "rgba(255,255,255,.52)",
                      lineHeight:1,
                    }}>
                      {`Finding hope · ${toSentenceCase((selected?.id ?? "").replaceAll("_", " "))} · ${posterCoords} · ${posterDate}`}
                    </span>
                  </div>
                  <span style={{
                    fontFamily:"'DM Mono'",
                    fontSize:11,
                    letterSpacing:"0.22em",
                    textTransform:"none",
                    color:overlayFg === K ? "rgba(0,0,0,.78)" : "rgba(255,255,255,.78)",
                    lineHeight:1,
                  }}>
                    {overlayStrip}
                    {paintWord?.isHope && " · A note of hope"}
                  </span>
                </div>

                {/* ── Centre stage: word + phrase fill all space above ridgeline ── */}
                {/* Flex column, vertically centered in the area above the ridgeline (80px). */}
                <div
                  style={{
                    position:"absolute",
                    top:70,        // clear the masthead
                    left:0,
                    right:0,
                    bottom:80,     // clear the ridgeline
                    display:"flex",
                    flexDirection:"column",
                    justifyContent:"center",
                    alignItems:"flex-start",
                    overflow:"hidden",
                    padding: "0 clamp(24px, 4vw, 40px)",
                  }}
                >
                  {/* Word — bleeds right intentionally */}
                  <div
                    style={{
                      lineHeight:0.9,
                      animation: wordHumCss,
                      willChange: motion.breathe ? "transform" : "auto",
                    }}
                  >
                    <p
                      aria-label={paintWord.t}
                      style={{
                        fontFamily: typo.family,
                        fontWeight: typo.weight,
                        fontStyle:  typo.style,
                        fontSize:   paintFs(paintWord.t, typo.face),
                        letterSpacing: typo.tracking,
                        textTransform:"none",
                        color: overlayFg,
                        lineHeight: 0.9,
                        userSelect:"none",
                        margin:0,
                        padding:0,
                        whiteSpace:"normal",
                        wordBreak:"break-word",
                        maxWidth:"100%",
                        animation: wordEntranceCss,
                        // Premium type rendering
                        textRendering:"optimizeLegibility",
                        fontKerning:"normal",
                        fontFeatureSettings:'"kern" 1, "liga" 1, "calt" 1',
                        WebkitFontSmoothing:"antialiased",
                        MozOsxFontSmoothing:"grayscale",
                      }}
                    >
                      {motion.wordEntrance === "cascade"
                        ? [...paintWord.t].map((ch, i, arr) => (
                            <span
                              key={i}
                              aria-hidden
                              style={{
                                display:"inline-block",
                                whiteSpace: ch === " " ? "pre" : "normal",
                                // Last char: zero out trailing letterSpacing so the word doesn't
                                // end with a phantom gap — CSS spec adds spacing after each glyph.
                                letterSpacing: i === arr.length - 1 ? 0 : undefined,
                                animation:`letterIn 380ms cubic-bezier(0.22,1,0.36,1) ${wordStartDelay + i * 0.025}s both`,
                                willChange:"transform, opacity",
                              }}
                            >
                              {ch}
                            </span>
                          ))
                        : paintWord.t}
                    </p>
                  </div>

                  {/* Phrase — sits directly beneath the word with a clear gap */}
                  <p style={{
                    margin:"clamp(16px, 2.4vh, 32px) 0 0 0",
                    maxWidth:"min(640px, 75vw)",
                    fontFamily:"'Instrument Serif', Georgia, serif",
                    fontStyle:"italic",
                    fontSize:"clamp(15px, 1.7vw, 21px)",
                    letterSpacing:"0.01em",
                    color: overlayFg === K ? "rgba(0,0,0,.75)" : "rgba(255,255,255,.82)",
                    lineHeight:1.42,
                    textRendering:"optimizeLegibility",
                    fontKerning:"normal",
                    WebkitFontSmoothing:"antialiased",
                    animation:`fadeIn .36s ease ${motion.phraseDelay}s both`,
                  }}>
                    {paintWord.context 
                      ? `“${toSentenceCase(paintWord.t)}” — ${paintWord.context.toLowerCase()}`
                      : selected?.phrase 
                        ? `“${toSentenceCase(paintWord.t)}” — ${selected.phrase.toLowerCase()}` 
                        : ""}
                  </p>
                </div>

                {/* ── Ridgeline footer strip — 8 rows, ~80px ── */}
                <div style={{
                  position:"absolute",
                  bottom:0,
                  left:0,
                  right:0,
                  animation:`fadeIn .5s ease ${motion.railDelay}s both`,
                  pointerEvents:"none",
                }}>
                  <div style={{
                    position: "absolute",
                    bottom: "100%",
                    right: "32px",
                    marginBottom: "16px",
                    fontFamily: FONT.mono,
                    fontSize: 14,
                    letterSpacing: "0.1em",
                    color: overlayFg === K ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)",
                    textAlign: "right",
                  }}>
                    <span style={{ fontSize: 28, fontWeight: 300, color: overlayFg === K ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.85)" }}>
                      {(overlayValence > 0 ? "+" : "")}{overlayValence.toFixed(2)}
                    </span>
                    <br/>
                    <span 
                      title="Mood score indicates the overall civic valence from -1 (very negative) to +1 (very positive)."
                      style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}
                    >
                      Mood Score
                    </span>
                  </div>
                  <MoodRidgeline
                    valence={overlayValence}
                    arousal={selected?.arousal ?? 0.5}
                    fg={overlayFg === K ? "rgba(0,0,0,0.62)" : "rgba(255,255,255,0.58)"}
                    bg={overlayBg}
                    rows={8}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
