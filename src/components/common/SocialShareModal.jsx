import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2, MessageCircle, Send as TelegramIcon, Twitter, Facebook,
  Linkedin, MessageSquare, Link2, Copy, Check, Download,
  Users, MapPin, Calendar, QrCode, X, Search, UserCheck, Loader2, Sparkles, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { getFriendsList, searchFriends } from '@/api/users';
import { inviteFriendsToEvent } from '@/api/meetups';

export default function SocialShareModal({
  open,
  onClose,
  event,
  ticket = null,
  meetup = null,
}) {
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'platforms' | 'squad'
  
  // In-app Friends State
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [selectedFriends, setSelectedFriends] = useState(new Set());
  const [inviteNote, setInviteNote] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingFriends(true);
      getFriendsList()
        .then((res) => {
          if (res.data) {
            const list = res.data.following || res.data.friends || [];
            setFriends(Array.isArray(list) ? list : []);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingFriends(false));
    } else {
      setSelectedFriends(new Set());
      setFriendSearch('');
      setInviteNote('');
    }
  }, [open]);

  const handleFriendSearch = async (q) => {
    setFriendSearch(q);
    if (!q.trim()) {
      getFriendsList().then((res) => {
        if (res.data) setFriends(res.data.following || res.data.friends || []);
      });
      return;
    }
    try {
      const res = await searchFriends(q.trim());
      if (res.data?.users) {
        setFriends(res.data.users);
      }
    } catch {}
  };

  const toggleSelectFriend = (id) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendInAppInvites = async () => {
    if (selectedFriends.size === 0) {
      toast.error('Select at least one friend to invite');
      return;
    }
    setSendingInvites(true);
    try {
      const recipientIds = Array.from(selectedFriends);
      await inviteFriendsToEvent(event.id, {
        recipientIds,
        meetupId: meetup?.id || null,
        note: inviteNote.trim() || undefined,
      });
      toast.success(`Invitation sent to ${recipientIds.length} friend${recipientIds.length > 1 ? 's' : ''}! 🎉`);
      setSelectedFriends(new Set());
      setInviteNote('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send event invites');
    } finally {
      setSendingInvites(false);
    }
  };

  if (!event) return null;

  const url = typeof window !== 'undefined'
    ? (meetup ? `${window.location.origin}/events/${event.id}?meetup=${meetup.id}` : `${window.location.origin}/events/${event.id}`)
    : '';

  const eventTitle = event.title || event.name || 'Event';
  const eventDate = event.startDate || event.start_date
    ? new Date(event.startDate || event.start_date).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    })
    : 'TBA';
  const eventVenue = event.venue || event.location || 'Venue TBA';

  // Customizable Squad Message
  const squadMessage = meetup
    ? `Hey! I'm organizing a group outing "${meetup.title}" for ${eventTitle} on ${eventDate} at ${eventVenue}!\n\nJoin our squad here: ${url}`
    : ticket
      ? `I just got my ticket for ${eventTitle} happening ${eventDate} at ${eventVenue}! Who's coming with me?\n\nGrab your ticket here: ${url}`
      : `Hey! Check out ${eventTitle} happening on ${eventDate} at ${eventVenue}!\n\nGet your tickets or join the squad on Tribes & Cliqs: ${url}`;

  const shareChannels = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Squad',
      description: 'Share to WhatsApp groups & friends',
      icon: MessageCircle,
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30',
      action: () => {
        const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(squadMessage)}`;
        window.open(shareUrl, '_blank');
      },
    },
    {
      id: 'telegram',
      name: 'Telegram',
      description: 'Share in Telegram channels & chats',
      icon: TelegramIcon,
      color: 'bg-sky-500/20 text-sky-400 border-sky-500/30 hover:bg-sky-500/30',
      action: () => {
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Join me at ${eventTitle}!`)}`;
        window.open(shareUrl, '_blank');
      },
    },
    {
      id: 'twitter',
      name: 'Twitter / X',
      description: 'Tweet your excitement to followers',
      icon: Twitter,
      color: 'bg-white/10 text-white border-white/20 hover:bg-white/20',
      action: () => {
        const tweetText = ticket
          ? `Just secured my ticket for ${eventTitle} on @TribesAndCliqs! Who's pulling up?`
          : `Can't wait for ${eventTitle}! Check it out on @TribesAndCliqs`;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;
        window.open(shareUrl, '_blank');
      },
    },
    {
      id: 'facebook',
      name: 'Facebook',
      description: 'Share on Facebook feed & groups',
      icon: Facebook,
      color: 'bg-blue-600/20 text-blue-400 border-blue-600/30 hover:bg-blue-600/30',
      action: () => {
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(shareUrl, '_blank');
      },
    },
    {
      id: 'sms',
      name: 'SMS / iMessage',
      description: 'Text your squad directly',
      icon: MessageSquare,
      color: 'bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30',
      action: () => {
        window.location.href = `sms:?&body=${encodeURIComponent(squadMessage)}`;
      },
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      description: 'Share professional conferences & summits',
      icon: Linkedin,
      color: 'bg-blue-700/20 text-blue-300 border-blue-700/30 hover:bg-blue-700/30',
      action: () => {
        const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        window.open(shareUrl, '_blank');
      },
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleCopySquadMsg = async () => {
    try {
      await navigator.clipboard.writeText(squadMessage);
      setCopiedMsg(true);
      toast.success('Squad invite message copied!');
      setTimeout(() => setCopiedMsg(false), 2500);
    } catch {
      toast.error('Could not copy message');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: squadMessage,
          url,
        });
      } catch {
        // user cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite Friends to Event"
      size="md"
    >
      <div className="space-y-5">
        {/* Event Preview Card */}
        <div className="rounded-xl bg-[#161D22] border border-[#262B2F] p-4 flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#242B32] shrink-0 border border-white/10">
            {event.banner_image || event.bannerImage || event.image ? (
              <img
                src={event.banner_image || event.bannerImage || event.image}
                alt={eventTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                TC
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              {event.category || 'Tribes & Cliqs Event'}
            </span>
            <h4 className="text-sm font-bold text-[#EFEFF1] truncate">{eventTitle}</h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#949599]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#494F55]" /> {eventDate}
              </span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-[#494F55]" /> {eventVenue}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-lg bg-[#161D22] p-1 border border-[#262B2F]">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'friends'
                ? 'bg-white text-[#1C232B] shadow-sm'
                : 'text-[#949599] hover:text-[#EFEFF1]'
            }`}
          >
            Tribes &amp; Friends
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('platforms')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'platforms'
                ? 'bg-white text-[#1C232B] shadow-sm'
                : 'text-[#949599] hover:text-[#EFEFF1]'
            }`}
          >
            WhatsApp &amp; Social
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('squad')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'squad'
                ? 'bg-white text-[#1C232B] shadow-sm'
                : 'text-[#949599] hover:text-[#EFEFF1]'
            }`}
          >
            Invite Message
          </button>
        </div>

        {/* Tab 1: In-App Friends Invitation */}
        {activeTab === 'friends' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949599]" />
              <input
                type="text"
                value={friendSearch}
                onChange={(e) => handleFriendSearch(e.target.value)}
                placeholder="Search friends by name or username..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#161D22] border border-[#262B2F] text-xs text-white placeholder-[#949599] focus:outline-none focus:border-amber-400/50"
              />
            </div>

            {/* Friends list */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {loadingFriends ? (
                <div className="py-8 text-center text-xs text-[#949599] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Loading friends...</span>
                </div>
              ) : friends.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#949599] bg-[#161D22] rounded-xl border border-[#262B2F] p-4">
                  <p className="text-[#EFEFF1] font-semibold">No friends found</p>
                  <p className="mt-1">Follow other attendees on Tribes &amp; Cliqs or share the event link below.</p>
                </div>
              ) : (
                friends.map((f) => {
                  const isSelected = selectedFriends.has(f.id);
                  const initials = (f.name || f.username || 'F').slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleSelectFriend(f.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/40 text-white'
                          : 'bg-[#161D22] border-[#262B2F] text-[#CBD5E1] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white/10 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {f.avatar ? (
                            <img src={f.avatar} alt={f.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div className="truncate text-left">
                          <p className="text-xs font-bold text-white truncate">{f.name || f.username}</p>
                          <p className="text-[10px] text-[#949599] truncate">@{f.username || 'attendee'}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          isSelected
                            ? 'bg-amber-400 border-amber-400 text-black'
                            : 'border-[#494F55] bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Optional invite note */}
            {selectedFriends.size > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#262B2F]">
                <input
                  type="text"
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  placeholder="Add an optional note (e.g. Come with me!)..."
                  className="w-full px-3 py-2 rounded-xl bg-[#161D22] border border-[#262B2F] text-xs text-white placeholder-[#949599] focus:outline-none focus:border-amber-400/50"
                />
                <button
                  type="button"
                  onClick={handleSendInAppInvites}
                  disabled={sendingInvites}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendingInvites ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send In-App Invite to ({selectedFriends.size}) Friend{selectedFriends.size > 1 ? 's' : ''}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Direct Social Channels */}
        {activeTab === 'platforms' && (
          <div className="grid grid-cols-2 gap-2.5">
            {shareChannels.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={c.action}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${c.color}`}
              >
                <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                  <c.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#EFEFF1] truncate">{c.name}</p>
                  <p className="text-[10px] text-[#949599] truncate">{c.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Tab 3: Squad Invite Message */}
        {activeTab === 'squad' && (
          <div className="space-y-3">
            <div className="rounded-xl bg-[#161D22] border border-[#262B2F] p-3.5">
              <p className="text-xs text-[#EFEFF1] whitespace-pre-line leading-relaxed font-mono">
                {squadMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopySquadMsg}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white hover:text-[#1C232B] transition"
            >
              {copiedMsg ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copiedMsg ? 'Copied to Clipboard!' : 'Copy Pre-Written Squad Message'}
            </button>
          </div>
        )}

        {/* Quick Link Copy Bar */}
        <div className="pt-2 border-t border-[#262B2F] space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#949599] flex items-center justify-between">
            <span>Direct Event Link</span>
            {navigator.share && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="text-white hover:underline flex items-center gap-1 lowercase font-normal"
              >
                <Share2 className="w-3 h-3" /> native share sheet
              </button>
            )}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-xl bg-[#161D22] border border-[#262B2F] text-xs font-mono text-[#949599] truncate">
              {url}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition shrink-0 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
