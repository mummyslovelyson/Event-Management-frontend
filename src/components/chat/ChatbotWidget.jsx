import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Trash2, Loader2, ArrowRight, MessageSquare, Mic, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { sendChatMessage } from '@/api/chat';
import ChatEventCard from './ChatEventCard';
import ChatTicketCard from './ChatTicketCard';
import VoiceAgentModal from './VoiceAgentModal';

const DEFAULT_SUGGESTIONS = [
  'What’s happening this weekend?',
  'Concerts and live shows in Accra',
  'Show my active tickets',
  'How do I transfer a ticket?',
  'How does resale work?',
];

const stripEmojis = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{200D}\u{FE0F}]/gu, '').trim();
};

export default function ChatbotWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth() || {};

  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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
        ? `Hey **${user.name || 'there'}**! I'm **Cliqs Bot**. Need help finding live events, checking your tickets, or managing your passes today?`
        : `Hey! I'm **Cliqs Bot**. Whether you're hunting for live concerts, club nights, or need a hand with tickets and bookings, I'm here to help.`,
      suggestions: contextualSuggestions,
      timestamp: new Date().toISOString(),
    },
  ]);

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

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

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
        pathname: location.pathname,
        userRole: user?.role || 'guest',
        isEventPage,
        isTicketsPage,
        isOrganizerPage,
        userId: user?.id,
        mode: 'chat',
      });

      const data = res.data;
      const cleanReply = stripEmojis(data.reply || 'Here is what I found for you:');
      const cleanActions = data.actions
        ? data.actions.map((act) => ({ ...act, label: stripEmojis(act.label) }))
        : null;
      const cleanSuggestions = (data.suggestions || contextualSuggestions).map(stripEmojis);

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: cleanReply,
        intent: data.intent || 'GENERAL',
        events: data.events || null,
        tickets: data.tickets || null,
        actions: cleanActions,
        suggestions: cleanSuggestions,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('[ChatbotWidget]', err);
      const errorMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: 'I ran into a quick connection hiccup. Please ask again or explore upcoming events!',
        actions: [{ type: 'NAVIGATE', label: 'Explore Events', path: '/explore' }],
        suggestions: contextualSuggestions.map(stripEmojis),
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

  const handleVoiceMessage = async (text) => {
    try {
      const res = await sendChatMessage(
        text,
        messages.slice(-8).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
        {
          currentPath: location.pathname,
          pathname: location.pathname,
          isEventPage,
          isTicketsPage,
          isOrganizerPage,
          userId: user?.id,
          mode: 'voice',
        }
      );
      const data = res?.data || res;
      setMessages((prev) => [
        ...prev,
        {
          id: `voice-u-${Date.now()}`,
          sender: 'user',
          text,
          timestamp: new Date().toISOString(),
        },
        {
          id: `voice-b-${Date.now() + 1}`,
          sender: 'bot',
          text: data?.reply || 'Here is what I found for you:',
          events: data?.events || [],
          tickets: data?.tickets || [],
          actions: data?.actions || [],
          timestamp: new Date().toISOString(),
        },
      ]);
      return data;
    } catch (err) {
      console.error('[handleVoiceMessage]', err);
      throw err;
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
                <code key={partIdx} className="px-1 py-0.5 rounded bg-black/40 text-[11px] font-mono text-[#EFEFF1]">
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
      {/* Backdrop for Assistant Selector */}
      {isSelectorOpen && !isOpen && !isVoiceOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity"
          onClick={() => setIsSelectorOpen(false)}
        />
      )}

      <aside aria-label="Cliqs Bot" className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-auto select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              width: 'min(92vw, 410px)',
              height: 'min(76vh, 580px)',
            }}
            exit={{ opacity: 0, y: 30, scale: 0.94 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="rounded-2xl bg-[#14181C]/95 backdrop-blur-xl border border-[#2E363E] shadow-2xl shadow-black/80 flex flex-col overflow-hidden mb-3 text-left"
          >
            {/* Header */}
            <div className="p-3 px-4 bg-[#1A2127] border-b border-[#2E363E] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src="/assets/images/Logo.jpeg"
                    alt="Cliqs Bot"
                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-[#3A4045] shadow-md"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#EFEFF1] border-2 border-[#1A2127]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white tracking-tight leading-tight">Cliqs Bot</h3>
                  <p className="text-[11px] text-[#949599] truncate mt-0.5">
                    {isEventPage ? 'Ask about this event' : 'Tribes & Cliqs Assistant'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[#949599] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsVoiceOpen(true);
                  }}
                  title="Switch to Voice Agent"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white text-white hover:text-[#1C232B] text-xs font-semibold transition cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Voice Agent</span>
                </button>
                <button
                  type="button"
                  onClick={clearChat}
                  title="Clear conversation"
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
                          alt="Cliqs Bot"
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
                        {renderFormattedText(msg.text)}

                        {/* Interactive Action Chips */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-white/10">
                            {msg.actions.map((action, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleExecuteAction(action)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#CBD5E1] text-[#1C232B] font-bold text-xs transition border border-transparent shadow-sm"
                              >
                                <span>{stripEmojis(action.label) || 'View'}</span>
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
                            className="px-2.5 py-1 rounded-lg bg-[#1A2127] border border-[#2E363E] hover:border-white/40 hover:text-white text-[11px] text-[#949599] transition-colors shadow-sm"
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
                  <div className="w-6 h-6 rounded-lg bg-[#242B32] border border-[#494F55]/40 text-[#EFEFF1] flex items-center justify-center shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-none bg-[#1C232B] border border-[#2E363E] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#949599] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#949599] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#949599] animate-bounce [animation-delay:0.4s]" />
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
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isEventPage
                      ? 'Ask about ticket prices, start times, venue...'
                      : 'Ask about events, tickets, VIP sections...'
                  }
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#14181C] border border-[#2E363E] focus:border-white/50 text-xs text-[#EFEFF1] placeholder-[#494F55] focus:outline-none transition"
                />

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsVoiceOpen(true);
                  }}
                  title="Switch to Voice Agent"
                  className="p-2.5 rounded-xl bg-[#242B32] hover:bg-[#2E363E] text-[#EFEFF1] border border-[#2E363E] transition shrink-0 cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || loading}
                  className="p-2.5 rounded-xl bg-white text-[#1C232B] hover:bg-[#CBD5E1] transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 font-bold shadow cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              <div className="flex items-center justify-end text-[10px] text-[#949599] mt-1.5 px-1">
                <span>Press Enter to send</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assistant Selection Popover */}
      <AnimatePresence>
        {isSelectorOpen && !isOpen && !isVoiceOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-72 sm:w-80 rounded-2xl bg-[#14181C] border border-[#2E363E] shadow-2xl shadow-black/90 p-4 mb-3 flex flex-col gap-2.5 text-left"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#242B32]">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#b21414]">Assistant Concierge</span>
                <h4 className="text-xs font-bold text-white">How can we help you?</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectorOpen(false)}
                className="p-1 rounded-lg text-[#949599] hover:text-white hover:bg-[#1C232B] transition cursor-pointer"
                title="Close selector"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-[#949599] leading-tight">
              Select your preferred assistant mode to get started:
            </p>

            <button
              type="button"
              onClick={() => {
                setIsSelectorOpen(false);
                setIsOpen(true);
              }}
              className="w-full text-left p-3 rounded-xl bg-[#171A1D] border border-[#2E363E] hover:border-white/50 hover:bg-[#1C232B] transition-all flex items-center gap-3 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1C232B] border border-[#2E363E] group-hover:border-white/40 flex items-center justify-center flex-shrink-0 transition-colors">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white group-hover:text-white">Cliqs Bot</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#242B32] text-[#EFEFF1] font-semibold">Text Chat</span>
                </div>
                <p className="text-[11px] text-[#949599] line-clamp-1 mt-0.5">Interactive event search &amp; ticketing answers</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#949599] group-hover:text-white group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSelectorOpen(false);
                setIsVoiceOpen(true);
              }}
              className="w-full text-left p-3 rounded-xl bg-[#171A1D] border border-[#2E363E] hover:border-[#b21414] hover:bg-[#1C232B] transition-all flex items-center gap-3 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2E1414] border border-[#b21414]/50 group-hover:border-[#b21414] flex items-center justify-center flex-shrink-0 transition-colors">
                <Mic className="w-5 h-5 text-[#b21414]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white group-hover:text-white">Voice Agent</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#b21414]/20 text-[#b21414] font-semibold">Hands-Free</span>
                </div>
                <p className="text-[11px] text-[#949599] line-clamp-1 mt-0.5">Live voice conversation with speech reply</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#949599] group-hover:text-white group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Launcher Button */}
      <div className="flex items-center justify-end">
        <motion.button
          type="button"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else if (isVoiceOpen) {
              setIsVoiceOpen(false);
            } else {
              setIsSelectorOpen((prev) => !prev);
            }
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="relative group p-1 rounded-2xl bg-[#171A1D] shadow-2xl shadow-black/80 border border-[#2E363E] hover:border-white/40 flex items-center justify-center transition-all cursor-pointer"
          title={isOpen || isSelectorOpen || isVoiceOpen ? 'Close Assistant' : 'Open Assistant Concierge'}
        >
          <div className="w-12 h-12 rounded-xl overflow-hidden relative flex items-center justify-center bg-[#1C232B] shadow-inner">
            {isOpen || isSelectorOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <img
                src="/assets/images/Logo.jpeg"
                alt="Tribes & Cliqs Concierge"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            )}
          </div>

          {hasUnread && !isOpen && !isVoiceOpen && !isSelectorOpen && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b21414] opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#b21414] border-2 border-[#14181C]" />
            </span>
          )}

          {!isOpen && !isSelectorOpen && !isVoiceOpen && (
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#14181C] border border-[#2E363E] text-white text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#949599]" />
              <span>Cliqs Assistant</span>
            </span>
          )}
        </motion.button>
      </div>

      {/* Voice Agent Modal */}
      <VoiceAgentModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSwitchToChat={() => {
          setIsVoiceOpen(false);
          setIsOpen(true);
        }}
        onSendMessage={handleVoiceMessage}
        activeContext={{
          isEventPage,
          isTicketsPage,
          isOrganizerPage,
          isExplorePage,
          user,
        }}
      />
    </aside>
    </>
  );
}
