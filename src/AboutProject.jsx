import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FONT,
  GUTTER,
  GUTTER_SM,
  INK,
  LABEL,
  PANEL_READING,
  SHELL,
  SHELL_DEEP,
  STACK,
} from "./designTokens.js";

const H2 = {
  margin: `${STACK * 6}px 0 ${STACK * 2}px`,
  fontFamily: FONT.title,
  fontWeight: 600,
  fontSize: "clamp(1.2rem, 2vw, 1.45rem)",
  letterSpacing: "-0.02em",
  lineHeight: 1.2,
  color: INK,
};

/** One stack for body: Barlow only — avoids thin italic serif “mud” on low-DPI screens */
const body = {
  fontFamily: FONT.display,
  fontSize: "clamp(1.02rem, 1.45vw, 1.18rem)",
  fontWeight: 400,
  lineHeight: 1.72,
  letterSpacing: "0.005em",
  color: PANEL_READING,
};

export default function AboutProject() {
  const [scrollRot, setScrollRot] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
      const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
      // Map 0 -> 1 progress to 0 -> 360 degrees
      setScrollRot(progress * 360);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initialize on mount
    handleScroll();
    // Re-calc on resize since maxScroll might change
    window.addEventListener("resize", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100%",
        background: `radial-gradient(circle at top, ${SHELL} 0%, #d4cdbd 150%)`,
        color: INK,
        fontFamily: FONT.display,
        WebkitFontSmoothing: "antialiased",
        position: "relative",
        overflow: "hidden", // Contain the watermark
      }}
    >
      {/* Editorial Watermark */}
      <div 
        style={{
          position: 'fixed',
          top: '-10vh',
          left: '-20vw',
          width: '140vw',
          height: '140vw', // keep it a perfect square so it rotates cleanly
          backgroundImage: "url('/curved-globe.svg')",
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          opacity: 0.06, 
          pointerEvents: 'none',
          zIndex: 0,
          mixBlendMode: 'multiply',
          transform: `rotate(${scrollRot}deg)`, 
          transformOrigin: 'center center', 
          transition: 'transform 0.1s ease-out', 
        }}
      />

      <main
        className="about-main"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1400px",
          margin: "0 auto",
          padding: `${STACK * 8}px ${GUTTER * 2}px ${STACK * 20}px`,
        }}
      >
        {/* Top Nav / Close */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: STACK * 16 }}>
          <Link
            to="/"
            style={{
              fontFamily: FONT.mono,
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: INK,
              textDecoration: "none",
              padding: "8px 16px",
              border: `1px solid ${INK}`,
              borderRadius: "40px",
            }}
          >
            Close &rarr;
          </Link>
        </div>

        {/* Section 1: Intro */}
        <div className="editorial-grid">
          {/* Left Column: Heading */}
          <div className="col-left">
            <div
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: "clamp(3.5rem, 7vw, 5.5rem)",
                fontWeight: 700,
                color: INK,
                marginTop: "-8px",
                letterSpacing: "0.02em"
              }}
            >
              Finding hope
            </div>
          </div>
          
          {/* Right Column: Lede */}
          <div className="col-right">
            <p
              style={{
                fontFamily: FONT.title,
                fontWeight: 500,
                fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
                lineHeight: 1.5,
                letterSpacing: "-0.01em",
                color: INK,
                margin: 0
              }}
            >
              This is a provocative piece based on the mood of the world, expressed through data visualization and typography. 
              The goal is to map the emotional temperature of global news—the good, the bad, and the heavy—and display it in a way you can instantly feel at a glance.
            </p>
          </div>
        </div>

        {/* Horizontal Divider */}
        <div style={{ width: "100%", height: "1px", background: "rgba(30,28,26,0.15)", marginBottom: STACK * 16 }} />

        {/* Section 2: Concept */}
        <div className="editorial-grid">
          {/* Left Column */}
          <div className="col-left">
            <h2 style={{ margin: 0, ...H2, marginTop: 0 }}>The Concept</h2>
          </div>
          
          {/* Right Column */}
          <div className="col-right">
            <p style={{ ...body, marginBottom: STACK * 3 }}>
              This is my idea, my design, and my concept. I used an AI agent to help me build the vision, not to be the creator. 
              I believe this is the best possible partnership for modern designers: my AI collaborator (Antigravity by Google DeepMind) didn't do the work for me; it simply helped me build exactly what I, the creator, wanted to build.
            </p>
            <p style={{ ...body, margin: 0 }}>
              The vision was always to create a provocative piece based on the mood of the world through visualization and type. 
              (Albeit, the typography could be better executed in future iterations, with more varied fonts used to convey the specific messages and tone of each word).
            </p>
          </div>
        </div>

        {/* Horizontal Divider */}
        <div style={{ width: "100%", height: "1px", background: "rgba(30,28,26,0.15)", marginBottom: STACK * 16 }} />

        {/* Section 3: Data */}
        <div className="editorial-grid">
          {/* Left Column */}
          <div className="col-left">
            <h2 style={{ margin: 0, ...H2, marginTop: 0 }}>What you are seeing</h2>
          </div>
          
          {/* Right Column */}
          <div className="col-right">
            <p style={{ ...body, marginBottom: STACK * 3 }}>
              We use a feed of global news to power the globe. The AI reads those news stories, extracts the most important topics, and assigns them an emotional "mood" score (from negative to positive). 
            </p>
            <p style={{ ...body, margin: 0 }}>
              The higher the spike on the globe, the more hope there is in that region. The deeper the red, the more turmoil. The words you see are the actual topics driving those emotions in real time.
            </p>
          </div>
        </div>

        {/* Huge Footer CTA */}
        <div style={{ marginTop: STACK * 16, borderTop: "2px solid rgba(30,28,26,0.9)", paddingTop: STACK * 8 }}>
          <Link
            to="/"
            style={{
              fontFamily: FONT.title,
              fontSize: "clamp(3rem, 7vw, 6rem)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              color: INK,
              textDecoration: "none",
              display: "block",
              lineHeight: 1,
            }}
          >
            Return to the world <span style={{ marginLeft: 8, fontWeight: 400 }}>&rarr;</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
