import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { AudioEngine } from '../audio/AudioEngine.js';

const AudioContext = createContext(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider = ({ children }) => {
  const engineRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Initialize lazily so we don't block main thread until user intent
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    return engineRef.current;
  }, []);

  const initAudio = useCallback(async () => {
    const engine = getEngine();
    await engine.init();
    setIsInitialized(true);
  }, [getEngine]);

  const toggleMute = useCallback(async () => {
    if (!isInitialized) {
      await initAudio();
    }
    setIsMuted((prevMute) => {
      const newMute = !prevMute;
      const engine = getEngine();
      engine.setMute(newMute);
      return newMute;
    });
  }, [getEngine, isInitialized, initAudio]);

  const unmute = useCallback(async () => {
    if (!isInitialized) {
      await initAudio();
    }
    setIsMuted(false);
    getEngine().setMute(false);
  }, [getEngine, isInitialized, initAudio]);

  const setSentiment = useCallback((valence, arousal) => {
    if (isInitialized) {
      getEngine().setSentiment(valence, arousal);
    }
  }, [getEngine, isInitialized]);

  const playHopeChime = useCallback(() => {
    if (isInitialized) {
      getEngine().playHopeChime();
    }
  }, [getEngine, isInitialized]);

  const value = {
    isInitialized,
    isMuted,
    initAudio,
    toggleMute,
    unmute,
    setSentiment,
    playHopeChime
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};
