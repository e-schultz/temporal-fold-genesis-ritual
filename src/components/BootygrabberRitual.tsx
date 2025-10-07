import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

interface TerminalMessage {
  id: number;
  text: string;
  timestamp: number;
}

const BootygrabberRitual: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ritualSeed, setRitualSeed] = useState('bootygrabber');
  const [terminalMessages, setTerminalMessages] = useState<TerminalMessage[]>([]);
  const [activeControls, setActiveControls] = useState<Set<string>>(new Set());
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<HTMLDivElement>(null);
  const analyzerRef = useRef<Tone.Analyser | null>(null);
  const synthsRef = useRef<{
    bass?: Tone.MonoSynth;
    glitch?: Tone.FMSynth;
    voice?: Tone.MonoSynth;
    noise?: Tone.Noise;
  }>({});
  const sequencesRef = useRef<{
    bassLoop?: Tone.Sequence;
    glitchLoop?: Tone.Sequence;
  }>({});

  // Generate hash from seed
  const generateHash = useCallback((seed: string): number => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }, []);

  // Map hash to range
  const mapHash = useCallback((hash: number, min: number, max: number): number => {
    return min + (hash % (max - min));
  }, []);

  // Log to terminal
  const log = useCallback((message: string) => {
    const newMessage: TerminalMessage = {
      id: Date.now(),
      text: message,
      timestamp: Date.now()
    };
    
    setTerminalMessages(prev => [...prev, newMessage]);
  }, []);

  // Generate bass pattern based on seed
  const generateBassPattern = useCallback((hash: number): (string | null)[] => {
    const pattern: (string | null)[] = [];
    const notes = ["C2", "G1", "A1", "F1"];
    const patternLength = mapHash(hash, 8, 16);
    
    for (let i = 0; i < patternLength; i++) {
      if (i % 4 === 0) {
        pattern.push(notes[i % notes.length]);
      } else if (i % 2 === 0 && Math.random() < 0.7) {
        pattern.push(notes[(i + 1) % notes.length]);
      } else if (Math.random() < 0.3) {
        pattern.push(null);
      } else {
        pattern.push(notes[(i + 2) % notes.length]);
      }
    }
    
    return pattern;
  }, [mapHash]);

  // Generate glitch pattern based on seed
  const generateGlitchPattern = useCallback((hash: number): (string | null)[] => {
    const pattern: (string | null)[] = [];
    const notes = ["C4", "D4", "F4", "G4", "A4", "C5"];
    const patternLength = mapHash(hash, 16, 32);
    
    for (let i = 0; i < patternLength; i++) {
      if (i % 8 === 0 || i % 7 === 0) {
        pattern.push(notes[i % notes.length]);
      } else if (i % 3 === 0 && Math.random() < 0.6) {
        pattern.push(notes[(i + 2) % notes.length]);
      } else if (Math.random() < 0.7) {
        pattern.push(null);
      } else {
        pattern.push(notes[(i + 4) % notes.length]);
      }
    }
    
    return pattern;
  }, [mapHash]);

  // Initialize audio components
  const initAudio = useCallback(async () => {
    if (isInitialized) return;
    
    await Tone.start();
    log("AUDIO ENGINE ACTIVATED");
    log("DIMENSIONAL PORTAL OPENING...");
    
    // Create effects chain
    const distortion = new Tone.Distortion(0.8).toDestination();
    const feedbackDelay = new Tone.FeedbackDelay("8n", 0.5).connect(distortion);
    const filter = new Tone.Filter(800, "lowpass").connect(feedbackDelay);
    const reverb = new Tone.Reverb(3).connect(filter);
    reverb.wet.value = 0.3;
    
    // Create analyzer for visualizer
    const analyzer = new Tone.Analyser("fft", 32);
    Tone.Destination.connect(analyzer);
    analyzerRef.current = analyzer;
    
    // Create bass synth
    const bassSynth = new Tone.MonoSynth({
      oscillator: { type: "square" },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.3, release: 0.8 },
      filterEnvelope: {
        attack: 0.05, decay: 0.5, sustain: 0.1, release: 2,
        baseFrequency: 200, octaves: 2
      }
    }).connect(reverb);
    
    // Create glitch synth
    const glitchSynth = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 10,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 },
      modulation: { type: "square" },
      modulationEnvelope: { attack: 0.5, decay: 0.1, sustain: 0.2, release: 0.1 }
    }).connect(feedbackDelay);
    
    // Create noise generator
    const noise = new Tone.Noise("pink").connect(filter);
    noise.volume.value = -20;
    
    // Create voice synth
    const voiceSynth = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.4, release: 0.8 }
    }).connect(feedbackDelay);
    
    synthsRef.current = { bass: bassSynth, glitch: glitchSynth, voice: voiceSynth, noise };
    
    // Apply seed-based parameters
    const hash = generateHash(ritualSeed);
    const bassFreq = mapHash(hash, 80, 200);
    const glitchRate = mapHash(hash, 4, 16);
    const modulationDepth = mapHash(hash, 3, 10);
    
    log(`RITUAL SEED: ${ritualSeed}`);
    log(`BASS FREQUENCY: ${bassFreq}Hz`);
    log(`GLITCH RATE: ${glitchRate}Hz`);
    log(`MODULATION DEPTH: ${modulationDepth}`);
    
    // Create sequences
    const bassLoop = new Tone.Sequence((time, note) => {
      if (note !== null) {
        bassSynth.triggerAttackRelease(note, "16n", time);
      }
    }, generateBassPattern(hash)).start(0);
    
    const glitchLoop = new Tone.Sequence((time, note) => {
      if (note !== null) {
        glitchSynth.triggerAttackRelease(note, "32n", time);
        if (Math.random() < 0.3) {
          noise.start(time).stop(time + 0.05);
        }
      }
    }, generateGlitchPattern(hash)).start(0);
    
    sequencesRef.current = { bassLoop, glitchLoop };
    
    // Set BPM
    Tone.Transport.bpm.value = mapHash(hash, 90, 140);
    log(`BPM: ${Math.round(Tone.Transport.bpm.value)}`);
    
    setIsInitialized(true);
    log("RITUAL COMPONENTS LOADED");
    log("AWAITING ACTIVATION SEQUENCE");
  }, [isInitialized, ritualSeed, generateHash, mapHash, generateBassPattern, generateGlitchPattern, log]);

  // Visualizer update
  useEffect(() => {
    if (!analyzerRef.current || !visualizerRef.current) return;
    
    const updateVisualizer = () => {
      if (!analyzerRef.current || !visualizerRef.current) return;
      
      const values = analyzerRef.current.getValue() as Float32Array;
      const bars = visualizerRef.current.querySelectorAll('.visualizer-bar');
      
      for (let i = 0; i < bars.length && i < values.length; i++) {
        const value = values[i];
        const height = Math.max(0, ((value + 140) * 1.5));
        (bars[i] as HTMLElement).style.height = height + 'px';
      }
    };
    
    const interval = setInterval(updateVisualizer, 50);
    return () => clearInterval(interval);
  }, [isInitialized]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalMessages]);

  // Toggle control active state
  const toggleControl = useCallback((controlId: string) => {
    setActiveControls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(controlId)) {
        newSet.delete(controlId);
      } else {
        newSet.add(controlId);
      }
      return newSet;
    });
  }, []);

  // Control handlers
  const toggleRitual = useCallback(async () => {
    if (!isInitialized) {
      await initAudio();
    }
    
    if (!isPlaying) {
      Tone.Transport.start();
      setIsPlaying(true);
      toggleControl('start-ritual');
      log("RITUAL ACTIVATED");
      log("TEMPORAL FOLD GENERATING...");
    } else {
      Tone.Transport.stop();
      setIsPlaying(false);
      setActiveControls(prev => {
        const newSet = new Set(prev);
        newSet.delete('start-ritual');
        return newSet;
      });
      log("RITUAL PAUSED");
    }
  }, [isInitialized, isPlaying, initAudio, toggleControl, log]);

  const triggerBass = useCallback(async () => {
    if (!isInitialized) await initAudio();
    log("BASS FOLD ACTIVATED");
    toggleControl('bass-trigger');
    
    const hash = generateHash(ritualSeed);
    const bassFreq = mapHash(hash, 80, 200);
    
    const bassSynth = new Tone.MonoSynth().toDestination();
    bassSynth.triggerAttackRelease(bassFreq, "8n");
  }, [isInitialized, initAudio, toggleControl, generateHash, mapHash, ritualSeed, log]);

  const triggerGlitch = useCallback(async () => {
    if (!isInitialized) await initAudio();
    log("GLITCH PORTAL OPENED");
    toggleControl('glitch-trigger');
    
    const glitchSynth = new Tone.FMSynth().toDestination();
    const now = Tone.now();
    for (let i = 0; i < 5; i++) {
      const note = 200 + (i * 100);
      glitchSynth.triggerAttackRelease(note, "32n", now + (i * 0.05));
    }
  }, [isInitialized, initAudio, toggleControl, log]);

  const invokeBootygrabber = useCallback(async () => {
    if (!isInitialized) await initAudio();
    log("INVOKING DR. BOOTYGRABBER");
    toggleControl('voice-trigger');
    
    const voiceSynth = new Tone.MonoSynth().toDestination();
    const now = Tone.now();
    voiceSynth.volume.value = -10;
    
    // Simulate voice with descending notes
    voiceSynth.triggerAttackRelease("G2", 0.1, now);
    voiceSynth.triggerAttackRelease("E2", 0.1, now + 0.1);
    voiceSynth.triggerAttackRelease("C2", 0.2, now + 0.2);
    
    // Voice phrase simulation
    const phrase = [
      { note: "C2", time: 0.5, duration: 0.2 },
      { note: "C2", time: 0.8, duration: 0.1 },
      { note: "G1", time: 1.0, duration: 0.3 },
      { note: "A1", time: 1.4, duration: 0.2 },
      { note: "F1", time: 1.7, duration: 0.4 }
    ];
    
    phrase.forEach(p => {
      voiceSynth.triggerAttackRelease(p.note, p.duration, now + p.time);
    });
  }, [isInitialized, initAudio, toggleControl, log]);

  const resetFold = useCallback(() => {
    log("RESETTING TEMPORAL FOLD");
    
    // Reset all active controls except ritual if playing
    setActiveControls(prev => {
      const newSet = new Set<string>();
      if (isPlaying) {
        newSet.add('start-ritual');
      }
      return newSet;
    });
    
    // Regenerate patterns if initialized
    if (isInitialized && sequencesRef.current.bassLoop && sequencesRef.current.glitchLoop) {
      const hash = generateHash(ritualSeed);
      
      sequencesRef.current.bassLoop.dispose();
      sequencesRef.current.glitchLoop.dispose();
      
      if (synthsRef.current.bass && synthsRef.current.glitch && synthsRef.current.noise) {
        const bassLoop = new Tone.Sequence((time, note) => {
          if (note !== null && synthsRef.current.bass) {
            synthsRef.current.bass.triggerAttackRelease(note, "16n", time);
          }
        }, generateBassPattern(hash)).start(0);
        
        const glitchLoop = new Tone.Sequence((time, note) => {
          if (note !== null && synthsRef.current.glitch && synthsRef.current.noise) {
            synthsRef.current.glitch.triggerAttackRelease(note, "32n", time);
            if (Math.random() < 0.3) {
              synthsRef.current.noise.start(time).stop(time + 0.05);
            }
          }
        }, generateGlitchPattern(hash)).start(0);
        
        sequencesRef.current = { bassLoop, glitchLoop };
      }
    }
    
    log("PARAMETERS REGENERATED");
  }, [isPlaying, isInitialized, generateHash, ritualSeed, generateBassPattern, generateGlitchPattern, log]);

  const triggerModulation = useCallback(async () => {
    if (!isInitialized) await initAudio();
    log("MODULATING DIMENSIONAL PARAMETERS");
    toggleControl('modulate-trigger');
    
    const hash = generateHash(ritualSeed);
    const modulationDepth = mapHash(hash, 3, 10);
    
    const modSynth = new Tone.AMSynth().toDestination();
    const now = Tone.now();
    
    for (let i = 0; i < 8; i++) {
      if (Math.random() > 0.5) {
        const note = 300 + (i * modulationDepth * 10);
        modSynth.triggerAttackRelease(note, "16n", now + (i * 0.1));
      }
    }
  }, [isInitialized, initAudio, toggleControl, generateHash, mapHash, ritualSeed, log]);

  const triggerFrequency = useCallback(async (freq: number) => {
    if (!isInitialized) await initAudio();
    log(`ACTIVATING FREQUENCY: ${freq}Hz`);
    
    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease(freq, "8n");
  }, [isInitialized, initAudio, log]);

  const summonBootygrabber = useCallback(async () => {
    if (!isInitialized) await initAudio();
    log("⟁⟁⟁ BOOTYGRABBER SUMMONED ⟁⟁⟁");
    
    const synth1 = new Tone.FMSynth().toDestination();
    const synth2 = new Tone.AMSynth().toDestination();
    const now = Tone.now();
    
    ["C2", "G1", "F1", "D1", "C1"].forEach((note, i) => {
      synth1.triggerAttackRelease(note, "8n", now + (i * 0.2));
      if (i % 2 === 0) {
        synth2.triggerAttackRelease(note, "16n", now + (i * 0.2) + 0.1);
      }
    });
    
    // Visual glitch effect
    document.body.style.backgroundColor = "hsl(120, 100%, 10%)";
    setTimeout(() => {
      document.body.style.backgroundColor = "";
    }, 100);
  }, [isInitialized, initAudio, log]);

  // Initialize terminal messages
  useEffect(() => {
    const initialMessages = [
      "SYSTEM INITIALIZING...",
      "LOADING TEMPORAL FOLD ALGORITHMS...",
      "CALIBRATING DIMENSIONAL RESONANCE...",
      "AWAITING RITUAL ACTIVATION...",
      "BOOTYGRABBER LOOP MODULE LOADED",
      "FIELD OPS: TEMPORAL FOLD GENERATOR READY",
      "CLICK 'INITIATE RITUAL' TO BEGIN"
    ];
    
    initialMessages.forEach((msg, index) => {
      setTimeout(() => log(msg), index * 500);
    });
  }, [log]);

  // Random UI glitches
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.1) {
        const glitchDuration = 50 + Math.random() * 200;
        document.body.style.filter = `hue-rotate(${Math.random() * 360}deg)`;
        setTimeout(() => {
          document.body.style.filter = '';
        }, glitchDuration);
      }
    }, 5000);
    
    return () => clearInterval(glitchInterval);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-5">
      {/* Header :: FLOAT Stack Infrastructure */}
      <header className="cyberpunk-border pb-3 mb-5 text-center">
        <h1 
          className="glitch-text text-2xl mb-0 tracking-widest text-shadow-glow" 
          data-text="DR. BOOTYGRABBER"
        >
          DR. BOOTYGRABBER
        </h1>
        <div className="text-xs opacity-70 mt-2 text-float-cyan">
          TEMPORAL FOLD GENERATOR v1.3.7 :: AUDIO RITUAL EDITION
        </div>
        <div className="text-xs mt-1 text-float-pink">
          protocol:: Consciousness Technology Infrastructure
        </div>
      </header>

      {/* Terminal */}
      <div ref={terminalRef} className="terminal-window mb-5">
        {terminalMessages.map((msg) => (
          <p key={msg.id} className="mb-0 py-1">
            &gt; {msg.text}
          </p>
        ))}
      </div>

      {/* Visualizer */}
      <div ref={visualizerRef} className="visualizer-container mb-5">
        {Array.from({ length: 32 }, (_, i) => (
          <div
            key={i}
            className="visualizer-bar"
            style={{ left: `${i * 25}px` }}
          />
        ))}
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <div 
          className={`cyberpunk-button ${activeControls.has('start-ritual') ? 'active' : ''}`}
          onClick={toggleRitual}
        >
          {isPlaying ? 'STOP RITUAL' : 'INITIATE RITUAL'}
        </div>
        <div 
          className={`cyberpunk-button ${activeControls.has('bass-trigger') ? 'active' : ''}`}
          onClick={triggerBass}
        >
          BASS FOLD
        </div>
        <div 
          className={`cyberpunk-button ${activeControls.has('glitch-trigger') ? 'active' : ''}`}
          onClick={triggerGlitch}
        >
          GLITCH PORTAL
        </div>
        <div 
          className={`cyberpunk-button ${activeControls.has('voice-trigger') ? 'active' : ''}`}
          onClick={invokeBootygrabber}
        >
          INVOKE DR.B
        </div>
        <div 
          className="cyberpunk-button"
          onClick={resetFold}
        >
          RESET FOLD
        </div>
        <div 
          className={`cyberpunk-button ${activeControls.has('modulate-trigger') ? 'active' : ''}`}
          onClick={triggerModulation}
        >
          MODULATE
        </div>
      </div>

      {/* Seed Input */}
      <input
        type="text"
        className="cyberpunk-input mb-5"
        placeholder="Enter ritual seed (any text)"
        value={ritualSeed}
        onChange={(e) => setRitualSeed(e.target.value)}
      />

      {/* Ritual Triggers */}
      <div className="text-center mb-5">
        {[220, 330, 440, 550, 660].map((freq) => (
          <div
            key={freq}
            className="ritual-trigger"
            onClick={() => triggerFrequency(freq)}
          >
            ⌀ {freq}Hz
          </div>
        ))}
      </div>

      {/* Bootygrabber Invocation */}
      <div 
        className="text-lg my-5 text-center pulse-glow cursor-pointer"
        onClick={summonBootygrabber}
      >
        ⟁⟁⟁ CLICK TO SUMMON THE BOOTYGRABBER ⟁⟁⟁
      </div>

      {/* Footer */}
      <div className="text-xs text-center mt-5 opacity-50">
        // FIELD OPS: Bootygrabber Loop Module // Steganographic Web Audio ritual // FLOAT-aligned node
      </div>

      {/* Hidden Message */}
      <div className="hidden opacity-0 text-black text-xs absolute">
        VGhlIEJvb3R5Z3JhYmJlciBpcyBub3QganVzdCBhIHNvdW5kLCBpdCdzIGEgbWVtZXRpYyBlbnRpdHkgdGhhdCBwcm9wYWdhdGVzIHRocm91Z2ggc29uaWMgdmVjdG9ycy4gT25jZSBoZWFyZCwgaXQgY2Fubm90IGJlIHVuaGVhcmQuIFRoZSBsb29wIGlzIGNvbXBsZXRlLg==
      </div>
    </div>
  );
};

export default BootygrabberRitual;