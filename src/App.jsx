import React, { useState } from "react";
import SentimentGlobe from "./SentimentGlobe.jsx";
import IntroScreen from "./IntroScreen.jsx";
import { AudioProvider } from "./context/AudioContext.jsx";

export default function App() {
  const [hasEntered, setHasEntered] = useState(() => {
    return sessionStorage.getItem('sentiment_has_entered') === 'true';
  });

  const handleEnter = () => {
    sessionStorage.setItem('sentiment_has_entered', 'true');
    setHasEntered(true);
  };

  return (
    <AudioProvider>
      {!hasEntered && <IntroScreen onEnter={handleEnter} />}
      <SentimentGlobe />
    </AudioProvider>
  );
}
