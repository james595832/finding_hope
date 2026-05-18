import { useState, useMemo } from "react";
import { flagUrl } from "./data/flagCodes.js";
import { primarySentimentStripLabel } from "./data/sentimentLabels.js";
import {
  FONT,
  INK,
  PAPER,
  SHELL,
  SHELL_DEEP,
  PANEL_READING,
  PANEL_MUTED,
  TRACK_UI,
  CAP_SECTION,
  PANEL_BODY_SM,
  STACK,
  GUTTER,
} from "./designTokens.js";

const R = "#E5140A";
const B = "#0035CC";
const K = "#1A1A1A";
const HOPE_GOLD = "#7a5a08";

function valenceHintColor(vh) {
  if (vh == null || Number.isNaN(vh)) return null;
  if (vh < -0.25) return R;
  if (vh > 0.25) return B;
  return K;
}

function sentimentHeroInk(valence) {
  if (valence < -0.1) return "#5c0f0a";
  if (valence > 0.1) return "#0a1f5c";
  return INK;
}

function toSentenceCase(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const tr = (w, it = false) =>
  w >= 800 ? "-0.03em" : w >= 600 ? "0em" : w >= 400 ? "0.03em" : it ? "0.10em" : "0.08em";

export default function MobileSentimentList({ countries, onWordClick }) {
  const [expandedId, setExpandedId] = useState(null);

  // Sort countries by valence descending (most positive/hopeful first)
  const sortedCountries = useMemo(() => {
    return [...(countries || [])].sort((a, b) => (b.valence || 0) - (a.valence || 0));
  }, [countries]);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${PAPER} 0%, ${SHELL} 50%, ${SHELL_DEEP} 100%)`,
        overflowY: "auto",
        paddingTop: "60px", // leave space for potential top nav or just breathing room
        paddingBottom: "80px",
      }}
    >
      <div style={{ padding: `0 ${GUTTER}px ${STACK * 2}px` }}>
        <h1
          style={{
            fontFamily: FONT.display,
            fontWeight: 400,
            fontSize: "clamp(2rem, 8vw, 3rem)",
            color: INK,
            marginBottom: "8px",
            lineHeight: 1.1,
          }}
        >
          Finding hope
        </h1>
        <p
          style={{
            fontFamily: FONT.mono,
            fontSize: PANEL_BODY_SM,
            color: PANEL_MUTED,
            letterSpacing: TRACK_UI,
            textTransform: "uppercase",
            marginBottom: "32px",
          }}
        >
          Regions ordered from hope to negativity
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {sortedCountries.map((country) => {
          const isExpanded = expandedId === country.id;

          return (
            <div
              key={country.id}
              style={{
                borderBottom: "1px solid rgba(30,28,26,0.1)",
                background: isExpanded ? "rgba(255,252,247,0.6)" : "transparent",
                transition: "background 0.2s ease",
              }}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : country.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: `${STACK * 1.5}px ${GUTTER}px`,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <div style={{ minWidth: 0, flex: 1, paddingRight: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {flagUrl(country.id) && (
                      <img
                        src={flagUrl(country.id)}
                        alt={`${country.name} flag`}
                        width={24}
                        height={16}
                        style={{
                          objectFit: "cover",
                          borderRadius: 2,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                          display: "block",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <h2
                      style={{
                        fontFamily: FONT.display,
                        fontWeight: 500,
                        fontSize: "1.5rem",
                        color: INK,
                        margin: 0,
                        lineHeight: 1.1,
                      }}
                    >
                      {country.name}
                    </h2>
                  </div>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: FONT.mono,
                        fontSize: CAP_SECTION,
                        fontWeight: 600,
                        letterSpacing: TRACK_UI,
                        color: sentimentHeroInk(country.valence),
                      }}
                    >
                      {primarySentimentStripLabel(country.valence, country.arousal)}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT.mono,
                        fontSize: CAP_SECTION,
                        color: PANEL_MUTED,
                      }}
                    >
                      {(country.valence >= 0 ? "+" : "")}
                      {country.valence.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 24,
                    color: PANEL_MUTED,
                    transform: isExpanded ? "rotate(45deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    lineHeight: 1,
                  }}
                  aria-hidden="true"
                >
                  +
                </div>
              </button>

              {isExpanded && (
                <div
                  style={{
                    padding: `0 ${GUTTER}px ${STACK * 2}px`,
                    animation: "slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
                  }}
                >
                  <p
                    style={{
                      fontFamily: FONT.serif,
                      fontStyle: "italic",
                      fontSize: "1.1rem",
                      color: PANEL_READING,
                      lineHeight: 1.5,
                      marginBottom: "20px",
                    }}
                  >
                    {toSentenceCase(country.phrase)}
                  </p>

                  <div
                    style={{
                      background: "#f7f5f0",
                      border: "1px solid rgba(30,28,26,0.1)",
                      borderRadius: 4,
                      padding: "16px",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: FONT.mono,
                        fontSize: CAP_SECTION,
                        letterSpacing: TRACK_UI,
                        color: PANEL_MUTED,
                        marginBottom: "12px",
                      }}
                    >
                      Keywords in this read
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "baseline",
                        gap: "6px 10px",
                        rowGap: 10,
                      }}
                    >
                      {country.words.map((word, i) => {
                        const nW = country.words.length;
                        const fontSize = 16 + (1 - i / Math.max(nW - 1, 1)) * 16; // slightly smaller spread for mobile
                        const hint = valenceHintColor(word.vh);
                        const ink = word.isHope ? HOPE_GOLD : word.c;
                        const useItalic = Boolean(word.it && word.w <= 400);

                        return (
                          <span
                            key={`${word.t}-${i}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "baseline",
                              gap: hint ? 6 : 0,
                            }}
                          >
                            {hint ? (
                              <span
                                style={{
                                  width: 4,
                                  minHeight: Math.round(Math.max(16, fontSize * 0.65)),
                                  background: hint,
                                  flexShrink: 0,
                                  marginTop: 2,
                                  borderRadius: 1,
                                }}
                                aria-hidden
                              />
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                // Add region context to word if missing (same logic as openWord in SentimentGlobe)
                                onWordClick({ ...word, _regionId: country.id });
                              }}
                              style={{
                                fontFamily: FONT.display,
                                fontWeight: word.w,
                                fontStyle: useItalic ? "italic" : "normal",
                                fontSize,
                                letterSpacing: tr(word.w, useItalic),
                                color: ink,
                                opacity: Math.max(word.op, word.isHope ? 0.98 : 0.88),
                                lineHeight: 1.1,
                                textAlign: "left",
                                background: "transparent",
                                border: "none",
                                padding: useItalic ? "4px 8px 4px 4px" : "4px 6px",
                                margin: 0,
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
