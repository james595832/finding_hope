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
  return (
    <div
      style={{
        minHeight: "100%",
        background: `radial-gradient(circle at center, ${SHELL} 10%, #a8a294 150%)`,
        color: INK,
        fontFamily: FONT.display,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <main
        className="about-main"
        style={{
          maxWidth: "min(42rem, calc(100% - 48px))",
          margin: "0 auto",
          padding: `${STACK * 6}px ${GUTTER_SM}px ${STACK * 14}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: STACK * 3,
            flexWrap: "wrap",
            marginBottom: STACK * 5,
            paddingBottom: STACK * 3,
            borderBottom: "1px solid rgba(30,28,26,0.12)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontFamily: FONT.title,
                fontWeight: 600,
                fontSize: "clamp(1.8rem, 3.4vw, 2.55rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              About this project
            </span>
            <span
              style={{
                fontFamily: FONT.display,
                fontSize: "clamp(0.95rem, 1.45vw, 1.15rem)",
                fontWeight: 500,
                letterSpacing: "0.01em",
                color: LABEL,
              }}
            >
              Finding hope
            </span>
          </div>
          <Link
            className="ts-textlink"
            to="/"
            style={{
              fontFamily: FONT.title,
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "0.01em",
              color: INK,
              textDecoration: "none",
              alignSelf: "center",
            }}
          >
            Return to the data <span style={{ marginLeft: 2 }}>&rarr;</span>
          </Link>
        </div>

        <p
          style={{
            ...body,
            fontSize: "clamp(1.18rem, 2.4vw, 1.5rem)",
            lineHeight: 1.56,
            marginBottom: STACK * 5,
          }}
        >
          <span
            style={{
              fontFamily: FONT.title,
              fontStyle: "normal",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: INK,
            }}
          >
            Finding hope
          </span>{" "}
          is a provocative piece based on the mood of the world, expressed through data visualization and typography. 
          The goal is to map the emotional temperature of global news—the good, the bad, and the heavy—and display it in a way you can instantly feel at a glance.
        </p>

        <h2
          style={{
            ...H2,
          }}
        >
          The Concept & AI Partnership
        </h2>
        <p style={{ ...body, marginBottom: STACK * 2 }}>
          This is my idea, my design, and my concept. I used an AI agent to help me build the vision, not to be the creator. 
          I believe this is the best possible partnership for modern designers: my AI collaborator (Antigravity by Google DeepMind) didn't do the work for me; it simply helped me build exactly what I, the creator, wanted to build.
        </p>
        <p style={{ ...body, marginBottom: STACK * 4 }}>
          The vision was always to create a provocative piece based on the mood of the world through visualization and type. 
          (Albeit, the typography could be better executed in future iterations, with more varied fonts used to convey the specific messages and tone of each word).
        </p>

        <h2
          style={{
            ...H2,
          }}
        >
          What you are seeing
        </h2>
        <p style={{ ...body, marginBottom: STACK * 2 }}>
          We use a feed of global news to power the globe. The AI reads those news stories, extracts the most important topics, and assigns them an emotional "mood" score (from negative to positive). 
        </p>
        <p style={{ ...body, marginBottom: STACK * 2 }}>
          The higher the spike on the globe, the more hope there is in that region. The deeper the red, the more turmoil. The words you see are the actual topics driving those emotions in real time.
        </p>

        <div style={{ marginTop: STACK * 8, textAlign: "center" }}>
          <Link
            className="ts-textlink"
            to="/"
            style={{
              fontFamily: FONT.title,
              fontSize: "clamp(1.2rem, 2vw, 1.45rem)",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: INK,
              textDecoration: "none",
            }}
          >
            Return to the world <span style={{ marginLeft: 4 }}>&rarr;</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
