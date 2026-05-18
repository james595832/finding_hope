import React, { useState, useEffect } from 'react';
import { useAudio } from './context/AudioContext.jsx';
import { FONT, INK, SHELL } from './designTokens.js';

export default function IntroScreen({ onEnter }) {
  const { unmute } = useAudio();
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isFading, setIsFading] = useState(false);

  // Simulate a highly deliberate, easing load progression (like data parsing)
  useEffect(() => {
    let current = 0;
    const duration = 2500; // 2.5 seconds total load time
    const interval = 30;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      current += step * (Math.random() * 1.5); // Add slight organic randomness
      if (current >= 100) {
        current = 100;
        setIsReady(true);
        clearInterval(timer);
      }
      setProgress(Math.floor(current));
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const handleEnterClick = () => {
    if (!isReady || isFading) return;
    
    // 1. Kickstart the generative audio engine
    unmute();
    
    // 2. Trigger the cinematic fade-out
    setIsFading(true);
    
    // 3. Wait for the fade to complete before unmounting this overlay
    setTimeout(() => {
      onEnter();
    }, 1200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: `radial-gradient(circle at center, ${SHELL} 10%, #a8a294 150%)`, // Matches main globe
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFading ? 0 : 1,
        transition: 'opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
        pointerEvents: isFading ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: isFading ? 'scale(1.1) translateY(-20px)' : 'scale(1) translateY(0)',
          transition: 'transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: FONT.title,
            fontWeight: 800,
            fontSize: 'clamp(3rem, 7vw, 5rem)',
            letterSpacing: '-0.04em',
            color: INK,
            textShadow: '0 0 40px rgba(232,228,219,0.9)',
          }}
        >
          Finding hope
        </h1>

        <div
          style={{
            marginTop: '3rem',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!isReady ? (
            <span
              style={{
                fontFamily: FONT.mono,
                fontSize: '0.85rem',
                letterSpacing: '0.1em',
                color: 'rgba(30,28,26,0.5)',
              }}
            >
              [ {progress.toString().padStart(3, '0')} % ]
            </span>
          ) : (
            <button
              onClick={handleEnterClick}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '10px 20px',
                cursor: 'pointer',
                fontFamily: FONT.mono,
                fontSize: '0.85rem',
                letterSpacing: '0.1em',
                color: INK,
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#E5140A';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = INK;
              }}
            >
              [ BEGIN ]
            </button>
          )}
        </div>
      </div>
      
      <p
        style={{
          position: 'absolute',
          bottom: '2rem',
          fontFamily: FONT.display,
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
          color: 'rgba(30,28,26,0.4)',
          textTransform: 'uppercase',
          opacity: isFading ? 0 : 1,
          transition: 'opacity 0.8s ease',
        }}
      >
        Audio required for generative soundscape
      </p>
    </div>
  );
}
