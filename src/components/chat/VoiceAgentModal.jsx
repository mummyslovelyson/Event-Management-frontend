import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Volume2, VolumeX, X, MessageSquare,
  Sparkles, ArrowRight, Loader2, Play
} from 'lucide-react';
import ChatEventCard from './ChatEventCard';
import ChatTicketCard from './ChatTicketCard';

export default function VoiceAgentModal({
  isOpen,
  onClose,
  onSwitchToChat,
  onSendMessage,
  activeContext = {},
}) {
  const [agentState, setAgentState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused'
  const [transcript, setTranscript] = useState('');
  const [lastAgentReply, setLastAgentReply] = useState(
    "Hey! I'm listening. Ask me anything about upcoming concerts, parties, or your tickets!"
  );
  const [lastEvents, setLastEvents] = useState([]);
  const [lastTickets, setLastTickets] = useState([]);
  const [lastActions, setLastActions] = useState([]);
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis || null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const hasWelcomedRef = useRef(false);

  // Web Audio API refs for real microphone frequency reactivity
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const audioDataArrayRef = useRef(null);

  // Synthesize gentle procedural audio chimes using Web Audio API oscillators
  const playChime = useCallback((type = 'wake') => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'wake') {
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(820, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'think') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(580, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, [isMuted]);

  // Setup real microphone audio analyser
  const setupAudioStream = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      analyserRef.current = analyser;
      audioDataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (err) {
      console.warn('[VoiceAgent AudioStream]', err.message);
    }
  }, []);

  const releaseAudioStream = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  // Stop speech synthesis safely
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  }, []);

  // Start speech recognition
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setAgentState('listening');
    } catch {
      // Already running
    }
  }, []);

  // Stop speech recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  // Text-to-speech speaker
  const speakResponse = useCallback((text) => {
    if (!synthRef.current || isMuted) {
      setAgentState('listening');
      startListening();
      return;
    }

    stopSpeaking();
    setAgentState('speaking');

    // Strip markdown formatting before speaking
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .slice(0, 350);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = synthRef.current.getVoices();
    const englishVoice = voices.find(
      (v) => (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Karen')) && v.lang.startsWith('en')
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onend = () => {
      setAgentState('listening');
      startListening();
    };

    utterance.onerror = () => {
      setAgentState('listening');
      startListening();
    };

    synthRef.current.speak(utterance);
  }, [isMuted, stopSpeaking, startListening]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        if (event.results[0].isFinal) {
          handleVoiceSubmit(currentTranscript);
        }
      };

      recognition.onerror = (e) => {
        if (e.error !== 'no-speech') {
          console.warn('[VoiceAgent Recognition Error]', e.error);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      stopSpeaking();
      stopListening();
      releaseAudioStream();
    };
  }, [stopSpeaking, stopListening, releaseAudioStream]);

  // Handle incoming final speech query
  const handleVoiceSubmit = async (spokenText) => {
    const query = (spokenText || transcript).trim();
    if (!query) {
      startListening();
      return;
    }

    stopSpeaking();
    stopListening();
    setAgentState('thinking');
    playChime('think');

    try {
      const res = await onSendMessage(query);
      if (res) {
        setLastAgentReply(res.reply || 'Here is what I found for you:');
        setLastEvents(res.events || []);
        setLastTickets(res.tickets || []);
        setLastActions(res.actions || []);
        speakResponse(res.reply);
      } else {
        speakResponse("I found some details for you.");
      }
    } catch (err) {
      console.error('[VoiceAgent Submit]', err);
      speakResponse("I ran into a hiccup fetching that. Try asking again.");
    }
  };

  // Toggle listening / paused
  const toggleListening = () => {
    if (agentState === 'speaking') {
      stopSpeaking();
      startListening();
      return;
    }
    if (agentState === 'listening') {
      stopListening();
      setAgentState('paused');
    } else {
      startListening();
    }
  };

  // Welcome user aloud and start on open
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      playChime('wake');
      setupAudioStream();

      if (!hasWelcomedRef.current) {
        hasWelcomedRef.current = true;
        const firstName = activeContext?.user?.name ? activeContext.user.name.split(' ')[0] : '';
        const welcomeText = firstName
          ? `Hello ${firstName}! Welcome to Tribes and Cliqs. What events or tickets can I help you with today?`
          : `Hello! Welcome to Tribes and Cliqs. What events or tickets can I help you with today?`;

        setLastAgentReply(welcomeText);
        setAgentState('speaking');

        const timer = setTimeout(() => {
          speakResponse(welcomeText);
        }, 350);

        return () => clearTimeout(timer);
      }
    } else {
      hasWelcomedRef.current = false;
      stopSpeaking();
      stopListening();
      releaseAudioStream();
      setAgentState('idle');
    }
  }, [isOpen, activeContext?.user?.name, playChime, setupAudioStream, speakResponse, stopSpeaking, stopListening, releaseAudioStream]);

  // Real Audio Frequency Reactive Visualizer
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let step = 0;
    const render = () => {
      step += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Extract real audio frequency volume if available
      let audioVolume = 0;
      if (analyserRef.current && audioDataArrayRef.current && agentState === 'listening') {
        analyserRef.current.getByteFrequencyData(audioDataArrayRef.current);
        const sum = audioDataArrayRef.current.reduce((a, b) => a + b, 0);
        audioVolume = sum / (audioDataArrayRef.current.length * 255);
      }

      const isSpeaking = agentState === 'speaking';
      const isListening = agentState === 'listening';
      const isThinking = agentState === 'thinking';

      const baseAmplitude = isSpeaking ? 32 : isListening ? (18 + audioVolume * 45) : isThinking ? 15 : 6;
      const numWaves = 4;

      for (let i = 0; i < numWaves; i++) {
        ctx.beginPath();
        const radius = 55 + i * 16 + Math.sin(step + i * 1.2) * baseAmplitude;

        ctx.arc(centerX, centerY, Math.max(12, radius), 0, Math.PI * 2);
        ctx.strokeStyle = isSpeaking
          ? `rgba(16, 185, 129, ${0.45 - i * 0.09})`
          : isThinking
          ? `rgba(168, 85, 247, ${0.45 - i * 0.09})`
          : isListening
          ? `rgba(45, 212, 191, ${0.45 - i * 0.09})`
          : `rgba(75, 85, 99, 0.15)`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, agentState]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="w-full max-w-lg bg-[#14181C] border border-[#2E363E] rounded-3xl p-6 shadow-2xl shadow-black relative flex flex-col items-center text-center overflow-hidden max-h-[90vh]"
      >
        {/* Background dynamic ambient glow */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl opacity-35 pointer-events-none transition-colors duration-700 ${
            agentState === 'speaking'
              ? 'bg-emerald-500'
              : agentState === 'thinking'
              ? 'bg-purple-500'
              : agentState === 'listening'
              ? 'bg-teal-400'
              : 'bg-gray-600'
          }`}
        />

        {/* Top bar controls */}
        <div className="w-full flex items-center justify-between z-10 mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voice Agent Mode</span>
            </span>
            <span className="text-[11px] text-[#949599]">Real-Time Audio</span>
          </div>

          <div className="flex items-center gap-1 text-[#949599]">
            <button
              type="button"
              onClick={() => setIsMuted((v) => !v)}
              title={isMuted ? 'Unmute voice audio' : 'Mute voice audio'}
              className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={onSwitchToChat}
              title="Switch to chat view"
              className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close voice agent"
              className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Neural Voice Frequency Visualizer */}
        <div className="relative my-4 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={270}
            height={270}
            className="rounded-full cursor-pointer select-none"
            onClick={toggleListening}
          />

          {/* Central Touch Orb */}
          <button
            type="button"
            onClick={toggleListening}
            className={`absolute w-24 h-24 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 ${
              agentState === 'speaking'
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 scale-105 shadow-emerald-500/50'
                : agentState === 'thinking'
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-400 scale-100 animate-pulse shadow-purple-500/50'
                : agentState === 'listening'
                ? 'bg-gradient-to-tr from-teal-500 to-emerald-400 scale-105 shadow-teal-500/50'
                : 'bg-gray-800 scale-95 opacity-80'
            }`}
          >
            {agentState === 'thinking' ? (
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            ) : agentState === 'speaking' ? (
              <Volume2 className="w-8 h-8 animate-bounce text-white" />
            ) : agentState === 'listening' ? (
              <Mic className="w-8 h-8 animate-pulse text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>
        </div>

        {/* Dynamic Status Label */}
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            {agentState === 'listening' && 'Listening to you...'}
            {agentState === 'thinking' && 'Analyzing events & vibes...'}
            {agentState === 'speaking' && 'Speaking (Tap orb to interrupt)'}
            {agentState === 'paused' && 'Paused (Tap orb to speak)'}
          </p>
          <p className="text-[11px] text-[#949599] mt-0.5">
            {agentState === 'listening' ? 'Speak naturally into your microphone' : agentState === 'speaking' ? 'Welcoming you · Tap orb to speak immediately' : 'Ask about concerts, tickets, or transfers'}
          </p>
        </div>

        {/* Live speech transcription */}
        {transcript && (
          <div className="w-full max-w-sm px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/90 italic truncate mb-2">
            "{transcript}"
          </div>
        )}

        {/* Agent Answer Transcript Box */}
        <div className="w-full overflow-y-auto max-h-40 px-4 py-3 rounded-2xl bg-[#1C232B] border border-[#2E363E] text-left text-xs text-[#EFEFF1] leading-relaxed mb-3">
          <p className="font-semibold text-emerald-300 text-[11px] mb-1">Cliq Concierge</p>
          <p>{lastAgentReply}</p>
        </div>

        {/* Action chips if agent suggested actions */}
        {lastActions && lastActions.length > 0 && (
          <div className="w-full flex items-center justify-center flex-wrap gap-1.5 mb-2">
            {lastActions.map((act, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (act.path) {
                    window.location.href = act.path;
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black text-xs font-bold transition border border-emerald-500/30 shadow"
              >
                <span>{act.label || 'View'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {/* Compact matching Event Cards */}
        {lastEvents && lastEvents.length > 0 && (
          <div className="w-full overflow-y-auto max-h-44 space-y-2 mt-1 pr-1">
            {lastEvents.slice(0, 2).map((ev) => (
              <ChatEventCard
                key={ev.id}
                event={ev}
                onNavigate={onClose}
              />
            ))}
          </div>
        )}

        {/* Compact matching Tickets */}
        {lastTickets && lastTickets.length > 0 && (
          <div className="w-full overflow-y-auto max-h-44 space-y-2 mt-1 pr-1">
            {lastTickets.slice(0, 2).map((t) => (
              <ChatTicketCard
                key={t.id}
                ticket={t}
                onNavigate={onClose}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
