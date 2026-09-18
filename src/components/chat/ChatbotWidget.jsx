import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Trash2, Minimize2, Maximize2, Loader2,
  Mic, MicOff, Volume2, VolumeX, ArrowRight, Sparkles, Compass, Ticket,
  Radio, ChevronRight, MessageSquare
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { sendChatMessage } from '@/api/chat';
import ChatEventCard from './ChatEventCard';
import ChatTicketCard from './ChatTicketCard';
import VoiceAgentModal from './VoiceAgentModal';
import toast from 'react-hot-toast';

const DEFAULT_SUGGESTIONS = [
  'What’s happening this weekend?',
  'Concerts and live shows in Accra',
  'Show my active tickets',
  'How do I transfer a ticket?',
  'How does resale work?',
];

export default function ChatbotWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Derive route context
  const isEventPage = location.pathname.startsWith('/events/');
  const isTicketsPage = location.pathname.startsWith('/attendee/tickets');
  const isOrganizerPage = location.pathname.startsWith('/organizer');
  const isExplorePage = location.pathname.startsWith('/explore');

  // Dynamic context-aware starter suggestions
  const contextualSuggestions = useMemo(() => {
    if (isEventPage) {
      return [
        'What time does this event start?',
        'Ticket tiers & pricing',
        'Where is the venue located?',
        'Is there a dress code?',
        'Can I get a refund?',
      ];
    }
    if (isTicketsPage) {
      return [
        'Show my active tickets',
        'How do I transfer a ticket?',
        'How does resale work?',
        'Download my ticket PDF receipt',
      ];
    }
    if (isOrganizerPage) {
      return [
        'How are my ticket sales?',
        'Open check-in scanner',
        'Create a promo code',
        'View attendee list',
      ];
    }
    if (isExplorePage) {
      return [
        'What’s happening this weekend?',
        'Concerts and live music',
        'Free events in Accra',
        'Show my tickets',
      ];
    }
    if (user) {
      return [
        'Show my active tickets',
        'What’s happening this weekend?',
        'Concerts and live shows',
        'How do I transfer a ticket?',
      ];
    }
    return DEFAULT_SUGGESTIONS;
  }, [isEventPage, isTicketsPage, isOrganizerPage, isExplorePage, user]);

  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome-1',
      sender: 'bot',
      text: user
        ? `Hey **${user.name || 'there'}**! I'm your **Cliq Agent**. Need help finding live events, checking your tickets, or managing your passes today?`
        : `Hey! I'm your **Cliq Agent**. Whether you're hunting for live concerts, club nights, or need a hand with tickets and bookings, I'm here to help.`,
      suggestions: contextualSuggestions,
      timestamp: new Date().toISOString(),
    },
  ]);

  // Read a specific message aloud using Text-to-Speech
  const speakMessage = (text) => {
    if (!window.speechSynthesis) {
      toast.error('Voice synthesis is not supported on this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`~]/g, '').slice(0, 350);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  // Initialize Web Speech API for inline voice input
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = (e) => {
        console.warn('[SpeechRecognition]', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn(err);
        setIsListening(false);
      }
    }
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, messages, loading]);

  // Hide widget on admin dashboard routes to prevent overlap
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  // Voice Agent execution handler for VoiceAgentModal
  const handleVoiceAgentQuery = async (queryText) => {
    const historyPayload = messages.slice(-4).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    const res = await sendChatMessage(queryText, historyPayload, {
      currentPath: location.pathname,
      userRole: user?.role || 'guest',
    });

    const data = res.data;
    // Also save turn to text conversation history
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toISOString(),
    };
    const botMsg = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: data.reply,
      intent: data.intent,
      events: data.events || null,
      tickets: data.tickets || null,
      actions: data.actions || null,
      suggestions: data.suggestions || contextualSuggestions,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);

    return data;
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await sendChatMessage(text, historyPayload, {
        currentPath: location.pathname,
        userRole: user?.role || 'guest',
      });

      const data = res.data;
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'Here is what I found for you:',
        intent: data.intent || 'GENERAL',
        events: data.events || null,
        tickets: data.tickets || null,
        actions: data.actions || null,
        suggestions: data.suggestions || contextualSuggestions,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('[ChatbotWidget]', err);
      const errorMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: 'I ran into a quick connection hiccup. Please ask again or explore upcoming events!',
        actions: [{ type: 'NAVIGATE', label: '🔍 Explore Events', path: '/explore' }],
        suggestions: contextualSuggestions,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = (action) => {
    if (!action) return;
    if (action.type === 'NAVIGATE' && action.path) {
      navigate(action.path);
      // Auto-collapse on small screens
      if (window.innerWidth < 640) {
        setIsOpen(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: `Chat cleared! What can I help you discover or accomplish next?`,
        suggestions: contextualSuggestions,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // Helper to format basic markdown (bolding, code, links)
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
      return (
        <p key={lineIdx} className={lineIdx > 0 ? 'mt-1.5' : ''}>
          {parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={partIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return (
                <code key={partIdx} className="px-1 py-0.5 rounded bg-black/40 text-[11px] font-mono text-emerald-300">
                  {part.slice(1, -1)}
                </code>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <>
      {/* Interactive Hands-Free Voice Agent Modal */}
      <VoiceAgentModal
        isOpen={isVoiceModeOpen}
        onClose={() => setIsVoiceModeOpen(false)}
        onSwitchToChat={() => {
          setIsVoiceModeOpen(false);
          setIsOpen(true);
        }}
        onSendMessage={handleVoiceAgentQuery}
        activeContext={{ currentPath: location.pathname, user }}
      />

      <aside aria-label="Cliq Concierge AI Agent" className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-auto select-none">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.94 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                width: isExpanded ? 'min(94vw, 700px)' : 'min(92vw, 410px)',
                height: isExpanded ? 'min(86vh, 720px)' : 'min(76vh, 580px)',
              }}
              exit={{ opacity: 0, y: 30, scale: 0.94 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="rounded-2xl bg-[#14181C]/95 backdrop-blur-xl border border-[#2E363E] shadow-2xl shadow-black/80 flex flex-col overflow-hidden mb-3 text-left"
            >
              {/* Header */}
              <div className="p-3.5 px-4 bg-[#1A2127] border-b border-[#2E363E] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <img
                      src="/assets/images/Logo.jpeg"
                      alt="Cliq Concierge"
                      className="w-9 h-9 rounded-xl object-cover ring-1 ring-[#3A4045] shadow-md"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#1A2127]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white tracking-tight">Cliq Concierge</h3>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {isEventPage ? 'Event Guide' : isOrganizerPage ? 'Organizer Agent' : 'AI Agent'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#949599]">
                      {isEventPage ? 'Ask questions about this event' : 'Tribes & Cliqs Smart Assistant'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[#949599]">
                  {/* Voice Agent Launcher Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setIsVoiceModeOpen(true);
                    }}
                    title="Switch to Hands-Free Voice Agent"
                    className="p-1.5 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-black transition border border-emerald-500/30 flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">Voice Agent</span>
                  </button>

                  <button
                    type="button"
                    onClick={clearChat}
                    title="Clear conversation"
                    className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpanded((v) => !v)}
                    title={isExpanded ? 'Restore size' : 'Expand window'}
                    className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition hidden sm:inline-flex"
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Close chat"
                    className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Interactive Vibe & Mood Discovery Carousel */}
              <div className="px-3.5 py-2 bg-[#171E24] border-b border-[#2E363E] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-[#949599] shrink-0 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Vibes:</span>
                </span>
                {[
                  { label: '🔥 Afrobeats', query: 'Afrobeats and Amapiano raves this weekend' },
                  { label: '🎷 Chill & Jazz', query: 'Chill rooftop jazz lounges' },
                  { label: '🍸 Nightlife', query: 'Best club nights in Accra' },
                  { label: '🍕 Food & Arts', query: 'Food fairs and art exhibitions' },
                  { label: '🔮 Surprise Me!', query: 'Surprise me with an amazing event' },
                ].map((vibe, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(vibe.query)}
                    className="px-2.5 py-0.5 rounded-full bg-[#1C232B] hover:bg-emerald-500 hover:text-black border border-[#2E363E] hover:border-transparent text-[11px] font-medium text-[#EFEFF1] whitespace-nowrap transition shadow-sm shrink-0"
                  >
                    {vibe.label}
                  </button>
                ))}
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text no-scrollbar">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col group/msg ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[90%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isUser && (
                          <img
                            src="/assets/images/Logo.jpeg"
                            alt="Concierge"
                            className="w-6 h-6 rounded-lg object-cover ring-1 ring-white/10 shrink-0 mt-0.5 shadow-sm"
                          />
                        )}

                        <div
                          className={`p-3 rounded-2xl leading-relaxed text-[#EFEFF1] shadow-sm relative ${
                            isUser
                              ? 'bg-white text-[#1C232B] font-medium rounded-tr-none'
                              : 'bg-[#1C232B] border border-[#2E363E] rounded-tl-none'
                          }`}
                        >
                          {/* Text-to-Speech Read Aloud Button for Bot Messages */}
                          {!isUser && (
                            <button
                              type="button"
                              onClick={() => speakMessage(msg.text)}
                              title="Read response aloud"
                              className="absolute top-2 right-2 p-1 rounded-md text-[#949599] hover:text-emerald-400 hover:bg-white/5 transition opacity-60 hover:opacity-100"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          )}

                          {renderFormattedText(msg.text)}

                          {/* Interactive Agent Action Chips */}
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-white/10">
                              {msg.actions.map((action, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleExecuteAction(action)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-black font-bold text-xs transition border border-emerald-500/30 hover:border-transparent shadow-sm"
                                >
                                  <span>{action.label || 'View'}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Embedded Digital Ticket Cards */}
                          {msg.tickets && msg.tickets.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.tickets.map((t) => (
                                <ChatTicketCard
                                  key={t.id}
                                  ticket={t}
                                  onNavigate={() => setIsOpen(false)}
                                />
                              ))}
                            </div>
                          )}

                          {/* Embedded Event Cards */}
                          {msg.events && msg.events.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.events.map((ev) => (
                                <ChatEventCard
                                  key={ev.id}
                                  event={ev}
                                  onNavigate={() => setIsOpen(false)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Follow-up Suggestions */}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[95%]">
                          {msg.suggestions.map((sug, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSendMessage(sug)}
                              className="px-2.5 py-1 rounded-lg bg-[#1A2127] border border-[#2E363E] hover:border-emerald-400 hover:text-emerald-300 text-[11px] text-[#949599] transition-colors shadow-sm"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing Indicator */}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-[#949599]">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <div className="p-3 rounded-2xl rounded-tl-none bg-[#1C232B] border border-[#2E363E] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-[#1A2127] border-t border-[#2E363E]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isListening
                          ? 'Listening... speak now'
                          : isEventPage
                          ? 'Ask about ticket prices, start times, venue...'
                          : 'Ask about events, tickets, VIP sections...'
                      }
                      className={`w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-[#14181C] border text-xs text-[#EFEFF1] placeholder-[#494F55] focus:outline-none transition ${
                        isListening
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-[#2E363E] focus:border-white/50'
                      }`}
                    />
                    {/* Voice input button */}
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      title={isListening ? 'Stop listening' : 'Voice input'}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition ${
                        isListening
                          ? 'bg-emerald-500 text-black animate-pulse'
                          : 'text-[#949599] hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || loading}
                    className="p-2.5 rounded-xl bg-white text-[#1C232B] hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 font-bold shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="flex items-center justify-between text-[10px] text-[#949599] mt-1.5 px-1">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Tribes &amp; Cliqs ML Agent</span>
                  </span>
                  <span>Press Enter ↵ to send</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive Mode Selector Pop-Up */}
        <AnimatePresence>
          {isSelectorOpen && !isOpen && !isVoiceModeOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.94 }}
              transition={{ duration: 0.2 }}
              className="w-80 rounded-2xl bg-[#14181C]/95 backdrop-blur-xl border border-[#2E363E] shadow-2xl shadow-black/90 p-4 mb-3 text-left overflow-hidden relative"
            >
              {/* Subtle top glow */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-500/20 blur-2xl rounded-full pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b border-[#2E363E]">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <img
                      src="/assets/images/Logo.jpeg"
                      alt="Cliq Concierge"
                      className="w-7 h-7 rounded-lg object-cover ring-1 ring-white/10"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#14181C]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Cliq Concierge</h4>
                    <p className="text-[10px] text-[#949599]">Choose your preferred agent</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSelectorOpen(false)}
                  className="p-1 rounded-lg text-[#949599] hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Option Cards */}
              <div className="space-y-2 mt-3">
                {/* 1. Chat Assistant */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectorOpen(false);
                    setIsOpen(true);
                  }}
                  className="w-full p-3 rounded-xl bg-[#1C232B] hover:bg-[#232C35] border border-[#2E363E] hover:border-emerald-500/50 transition-all text-left group flex items-start gap-3 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        Chat Assistant
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-white/10 text-white/80">
                        Interactive
                      </span>
                    </div>
                    <p className="text-[11px] text-[#949599] mt-0.5 line-clamp-2">
                      Browse events, view QR tickets, filter categories &amp; get instant guidance.
                    </p>
                  </div>
                </button>

                {/* 2. Hands-Free Voice Agent */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectorOpen(false);
                    setIsVoiceModeOpen(true);
                  }}
                  className="w-full p-3 rounded-xl bg-[#1C232B] hover:bg-[#232C35] border border-[#2E363E] hover:border-teal-500/50 transition-all text-left group flex items-start gap-3 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                        Voice Agent
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        Hands-Free
                      </span>
                    </div>
                    <p className="text-[11px] text-[#949599] mt-0.5 line-clamp-2">
                      Speak naturally with neural audio waveforms and two-way voice replies.
                    </p>
                  </div>
                </button>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-[#949599]">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Trained on Tribes &amp; Cliqs</span>
                </span>
                <span>Powered by AI</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contextual Time-of-Day Floating Greeting Bubble */}
        {!isOpen && !isVoiceModeOpen && !isSelectorOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1, duration: 0.3 }}
            onClick={() => setIsSelectorOpen(true)}
            className="mb-2.5 p-2.5 px-3.5 rounded-2xl bg-[#14181C]/95 backdrop-blur-xl border border-emerald-500/40 shadow-xl shadow-black/80 flex items-center gap-2 text-xs text-white max-w-xs cursor-pointer group hover:border-emerald-400 transition select-none"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-medium text-[11px] text-[#EFEFF1] group-hover:text-white transition-colors">
              {new Date().getHours() < 12
                ? 'Good morning! Finding events today? ✦'
                : new Date().getHours() < 17
                ? 'Good afternoon! Ready for weekend vibes? ✦'
                : "Good evening! Ready for tonight's Accra vibes? ✦"}
            </span>
          </motion.div>
        )}

        {/* Unified Floating Launcher Button */}
        <motion.button
          type="button"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else if (isVoiceModeOpen) {
              setIsVoiceModeOpen(false);
            } else {
              setIsSelectorOpen((v) => !v);
            }
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="relative group p-1 rounded-2xl bg-[#171A1D] shadow-2xl shadow-black/80 border border-[#2E363E] hover:border-emerald-500/60 flex items-center justify-center transition-all"
          title="Open Cliq Concierge"
        >
          <div className="w-12 h-12 rounded-xl overflow-hidden relative flex items-center justify-center bg-[#1C232B] shadow-inner">
            <img
              src="/assets/images/Logo.jpeg"
              alt="Cliq Concierge Agent"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>

          {/* Unread / Attention Ring */}
          {hasUnread && !isOpen && !isVoiceModeOpen && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#14181C]" />
            </span>
          )}

          {/* Hover Tooltip */}
          {!isOpen && !isVoiceModeOpen && !isSelectorOpen && (
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#14181C] border border-[#2E363E] text-white text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cliq Concierge</span>
            </span>
          )}
        </motion.button>
      </aside>
    </>
  );
}
