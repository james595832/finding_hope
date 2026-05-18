export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.droneOscillators = [];
    this.masterGain = null;
    this.filter = null;
    this.lfo = null;
    this.lfoGain = null;
    this.reverb = null;
    this.isInitialized = false;
    this.isMuted = false;
    
    // Target values for smooth transitions
    this.targetFilterFreq = 200;
    this.targetLfoRate = 0.5;
    this.targetDetune = 0;
  }

  async init() {
    if (this.isInitialized || this._isInitializing) return;
    this._isInitializing = true;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    
    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.25; // much quieter default volume
    this.masterGain.connect(this.ctx.destination);

    // Filter - classic analog style lowpass for the sawtooths
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 400; // Deep, moody baseline
    this.filter.Q.value = 1.2; // Slight resonance for that CS-80 sweep character

    // Reverb (Convolver) - generate a massive space
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this._createImpulseResponse(5.0, 3.5);
    this.reverb.connect(this.masterGain);
    
    // Dry signal
    const dryGain = this.ctx.createGain();
    dryGain.gain.value = 0.3; // Low in the mix
    this.filter.connect(dryGain);
    dryGain.connect(this.masterGain);

    // Wet signal goes to reverb
    const wetGain = this.ctx.createGain();
    wetGain.gain.value = 0.8; // Huge ambient tail
    this.filter.connect(wetGain);
    wetGain.connect(this.reverb);

    // LFO for very slow, breathing filter sweeps (Blade Runner brass swell)
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.05; // 20 second cycle
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = 150; // Deep sweep
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);
    this.lfo.start();

    // Initial Chord (Cm9)
    const baseFreqs = [130.81, 196.00, 293.66, 311.13]; 
    const detunes = [0, 5, -5, 2]; // Heavy chorus/analog drift
    
    baseFreqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      // Sawtooth waves for that classic Vangelis synth brass richness
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detunes[i];
      
      const gain = this.ctx.createGain();
      gain.gain.value = 0.015; // Sawtooth is very loud, keep this extremely low
      
      osc.connect(gain);
      gain.connect(this.filter);
      osc.start();
      
      this.droneOscillators.push(osc);
    });

    this._lastChordStep = -1;
    this.isInitialized = true;
    this._isInitializing = false;
    
    // Start animation loop for smooth transitions
    this._animationLoop();
  }

  _createImpulseResponse(duration, decay) {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = (length - i) / length;
      left[i] = (Math.random() * 2 - 1) * Math.pow(n, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(n, decay);
    }
    return impulse;
  }

  _animationLoop = () => {
    if (!this.isInitialized) return;

    const now = this.ctx.currentTime;

    // Cinematic Chord Progression (Blade Runner style)
    const progression = [
      [130.81, 196.00, 293.66, 311.13], // Cm9     (Dark, moody)
      [103.83, 155.56, 261.63, 392.00], // Abmaj7  (Expansive, hopeful)
      [87.31,  130.81, 196.00, 311.13], // Fm9     (Deep, unresolved)
      [116.54, 174.61, 293.66, 440.00]  // Bbmaj7  (Floating, cinematic)
    ];
    
    // Evolve the chord every 12 seconds
    const cycleTime = 12.0;
    const currentStep = Math.floor(now / cycleTime) % progression.length;
    
    if (this._lastChordStep !== currentStep) {
      this._lastChordStep = currentStep;
      const nextChord = progression[currentStep];
      this.droneOscillators.forEach((osc, i) => {
        // Massive 3.0 second analog portamento glide between chords
        osc.frequency.setTargetAtTime(nextChord[i], now, 3.0);
      });
    }

    // Smoothly approach target values
    if (this.filter) {
      this.filter.frequency.value += (this.targetFilterFreq - this.filter.frequency.value) * 0.05;
    }
    if (this.lfo) {
      this.lfo.frequency.value += (this.targetLfoRate - this.lfo.frequency.value) * 0.05;
    }
    this.droneOscillators.forEach(osc => {
      osc.detune.value += (this.targetDetune - osc.detune.value) * 0.05;
    });

    requestAnimationFrame(this._animationLoop);
  }

  setMute(mute) {
    this.isMuted = mute;
    
    // If the browser suspended the audio context, unmuting should attempt to resume it.
    if (this.ctx && this.ctx.state === 'suspended' && !mute) {
      this.ctx.resume();
    }

    if (this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.25, now, 0.05);
    }
  }

  // Maps sentiment to drone parameters
  setSentiment(valence = 0, arousal = 0.5) {
    if (!this.isInitialized) return;

    // valence: -1 (negative) to 1 (positive)
    // arousal: 0 (calm) to 1 (active/intense)

    // Filter frequency: brighter for positive, darker for negative
    // Base 250Hz, ranges from ~150Hz to 850Hz (classic analog sweet spot)
    const mappedValence = (valence + 1) / 2; // 0 to 1
    this.targetFilterFreq = 250 + (mappedValence * 600) + (arousal * 300);

    // Detune: negative + high arousal = very subtle dissonance
    if (valence < -0.1) {
      this.targetDetune = (Math.abs(valence) * arousal) * -8; // very gentle detuning
      this.lfoGain.gain.setTargetAtTime(40 + (arousal * 60), this.ctx.currentTime, 0.5);
    } else {
      this.targetDetune = 0;
      this.lfoGain.gain.setTargetAtTime(30, this.ctx.currentTime, 0.5);
    }

    // LFO rate: very slow ambient shifting
    this.targetLfoRate = 0.05 + (arousal * 0.15);
  }

  // Triggered when a "Hope" word is clicked
  playHopeChime() {
    if (!this.isInitialized || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // A nice bright, harmonic frequency (e.g., C5 or G5)
    // Add slight randomness for organic feel
    const freqs = [523.25, 783.99, 1046.50]; // C5, G5, C6
    osc.frequency.value = freqs[Math.floor(Math.random() * freqs.length)];

    osc.connect(gain);
    // Connect to reverb for space
    gain.connect(this.reverb);
    // Also connect to dry gain
    gain.connect(this.masterGain);

    const now = this.ctx.currentTime;
    
    // Envelope: Sharp attack, long beautiful decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 4.0);

    osc.start(now);
    osc.stop(now + 4.0);
  }
}
