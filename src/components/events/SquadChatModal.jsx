import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Users, MapPin, CalendarClock,
  Loader2, X, AlertCircle, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/common/Modal';
import { getMeetupMessages, postMeetupMessage } from '@/api/meetups';
import { useAuth } from '@/context/AuthContext';

export default function SquadChatModal({
  isOpen,
  onClose,
  meetup,
  event,
}) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let timer;
    if (isOpen && meetup?.id) {
      setLoading(true);
      fetchMessages();

      // Poll every 5 seconds while chat modal is open
      timer = setInterval(() => {
        fetchMessages(true);
      }, 5000);
    } else {
      setMessages([]);
      setText('');
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, meetup?.id]);

  const fetchMessages = async (isPolling = false) => {
    if (!meetup?.id) return;
    try {
      const res = await getMeetupMessages(meetup.id);
      if (res.data?.messages) {
        setMessages(res.data.messages);
        if (!isPolling) {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      }
    } catch {
      // silent on polling error
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending || !meetup?.id) return;

    if (!isAuthenticated) {
      toast.error('Please sign in to send messages');
      return;
    }

    const outgoing = text.trim();
    setText('');
    setSending(true);

    try {
      const res = await postMeetupMessage(meetup.id, outgoing);
      if (res.data?.messageItem) {
        setMessages((prev) => [...prev, res.data.messageItem]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
      setText(outgoing); // restore unsent text
    } finally {
      setSending(false);
    }
  };

  if (!meetup) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={meetup.title}
      subtitle={`Squad Outing • ${meetup.memberCount || 0} members`}
    >
      <div className="flex flex-col h-[520px] max-h-[75vh]">
        {/* Meetup Details Header Bar */}
        <div className="p-3 mb-3 rounded-xl bg-[#1C232B] border border-[#262B2F] flex flex-wrap items-center justify-between gap-2 text-xs text-[#949599]">
          <div className="flex items-center gap-3">
            {meetup.meetingSpot && (
              <span className="flex items-center gap-1 text-[#CBD5E1]">
                <MapPin className="w-3.5 h-3.5 text-[#949599]" /> {meetup.meetingSpot}
              </span>
            )}
            {meetup.meetAt && (
              <span className="flex items-center gap-1 text-[#CBD5E1]">
                <CalendarClock className="w-3.5 h-3.5 text-[#949599]" />
                {new Date(meetup.meetAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-white">
            {meetup.type || 'Squad'}
          </span>
        </div>

        {/* Message Thread Scroll View */}
        <div className="flex-1 overflow-y-auto space-y-3 p-2 border border-[#262B2F] rounded-xl bg-[#14171A]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#EFEFF1]">No messages in this squad yet</h4>
              <p className="text-xs text-[#949599] max-w-xs">
                Introduce yourself, coordinate rides, or discuss VIP bottle service!
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = currentUser?.id && Number(currentUser.id) === Number(m.userId);
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#242B32] border border-white/10 text-white text-[11px] font-bold flex items-center justify-center shrink-0 overflow-hidden">
                    {m.userAvatar ? (
                      <img src={m.userAvatar} alt={m.userName} className="w-full h-full object-cover" />
                    ) : (
                      m.userName?.[0] || 'U'
                    )}
                  </div>

                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-white text-[#1C232B] font-medium rounded-tr-none'
                      : 'bg-[#1C232B] text-[#EFEFF1] border border-[#262B2F] rounded-tl-none'
                  }`}>
                    {!isMe && (
                      <p className="text-[10px] font-bold text-[#949599] mb-0.5">
                        {m.userName || 'Member'}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                    <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-black/60' : 'text-[#949599]'}`}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isAuthenticated ? "Message the squad..." : "Sign in to chat"}
            disabled={!isAuthenticated || sending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#14171A] border border-[#262B2F] text-xs text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending || !isAuthenticated}
            className="p-2.5 rounded-xl bg-white text-[#1C232B] hover:bg-[#CBD5E1] transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </Modal>
  );
}
