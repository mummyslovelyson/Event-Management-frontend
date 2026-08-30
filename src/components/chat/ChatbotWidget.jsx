import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Send, Sparkles, Bot, User, Trash2,
  Minimize2, Maximize2, Loader2, ArrowDownCircle, ChevronRight,
} from 'lucide-react';
import { sendChatMessage } from '@/api/chat';
import ChatEventCard from './ChatEventCard';

const DEFAULT_SUGGESTIONS = [
  'What’s happening this weekend?',
  'Concerts and live shows',
  'How do I transfer a ticket?',
  'How does resale work?',
  'Accepted payment methods',
];

export default function ChatbotWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() => {
    return [
      {
        id: 'welcome-1',
        sender: 'bot',
        text: `Hey! What's the plan today? Whether you're hunting for live concerts, club nights, or need a quick hand with tickets and transfers, I'm here to help.`,
        suggestions: DEFAULT_SUGGESTIONS,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of conversation
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

  // Hide widget on admin dashboard routes to avoid UI clutter
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
      });

      const data = res.data;
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: data.reply || 'Here is what I found for you:',
        events: data.events || null,
        suggestions: data.suggestions || null,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('[ChatbotWidget]', err);
      const errorMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '⚠️ I encountered an issue retrieving event details. Please try asking again in a moment!',
        suggestions: DEFAULT_SUGGESTIONS,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
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
        text: `✨ Chat cleared! What can I help you discover next?`,
        suggestions: DEFAULT_SUGGESTIONS,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // Helper to format basic markdown (bolding and linebreaks)
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, lineIdx) => {
      // Parse **bold** and `code`
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
    <aside aria-label="Cliq Concierge Support" className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-auto select-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              width: isExpanded ? 'min(92vw, 680px)' : 'min(92vw, 390px)',
              height: isExpanded ? 'min(85vh, 700px)' : 'min(75vh, 560px)',
            }}
            exit={{ opacity: 0, y: 30, scale: 0.94 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="rounded-2xl bg-[#14181C]/95 backdrop-blur-xl border border-[#2E363E] shadow-2xl shadow-black/70 flex flex-col overflow-hidden mb-3 text-left"
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
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Live Support
                    </span>
                  </div>
                  <p className="text-[11px] text-[#949599]">Tribes &amp; Cliqs Event Guide</p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[#949599]">
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

            {/* Chat Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text no-scrollbar">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isUser && (
                        <img
                          src="/assets/images/Logo.jpeg"
                          alt="Concierge"
                          className="w-6 h-6 rounded-lg object-cover ring-1 ring-white/10 shrink-0 mt-0.5 shadow-sm"
                        />
                      )}

                      <div
                        className={`p-3 rounded-2xl leading-relaxed text-[#EFEFF1] shadow-sm ${
                          isUser
                            ? 'bg-white text-[#1C232B] font-medium rounded-tr-none'
                            : 'bg-[#1C232B] border border-[#2E363E] rounded-tl-none'
                        }`}
                      >
                        {renderFormattedText(msg.text)}

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
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about events, tickets, VIP sections..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#14181C] border border-[#2E363E] text-xs text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/50 transition"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || loading}
                  className="p-2.5 rounded-xl bg-white text-[#1C232B] hover:bg-[#CBD5E1] transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 font-bold shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              <div className="flex items-center justify-between text-[10px] text-[#949599] mt-1.5 px-1">
                <span>Tribes &amp; Cliqs Concierge</span>
                <span>Press Enter ↵ to send</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Launcher Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative group p-1 rounded-2xl bg-[#171A1D] shadow-2xl shadow-black/80 border border-[#2E363E] hover:border-white/40 flex items-center justify-center transition-all"
        title="Open Cliq Concierge"
      >
        <div className="w-12 h-12 rounded-xl overflow-hidden relative flex items-center justify-center bg-[#1C232B] shadow-inner">
          <img
            src="/assets/images/Logo.jpeg"
            alt="Cliq Concierge"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>

        {/* Unread / Attention Ring */}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#14181C]" />
          </span>
        )}

        {/* Hover Tooltip */}
        {!isOpen && (
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#14181C] border border-[#2E363E] text-white text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition pointer-events-none">
            Cliq Concierge
          </span>
        )}
      </motion.button>
    </aside>
  );
}
