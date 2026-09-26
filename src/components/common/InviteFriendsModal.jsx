import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Check, Send, Link2, Copy, CheckCheck,
  Share2, MessageCircle, Send as TelegramIcon, X, Loader2, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/common/Modal';
import { getFriendsList, searchFriends } from '@/api/users';
import { inviteFriendsToEvent } from '@/api/meetups';

export default function InviteFriendsModal({
  isOpen,
  onClose,
  event,
  meetup = null,
  onOpenSocialShare,
}) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState(new Set());
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getFriendsList()
        .then((res) => {
          if (res.data) {
            // Users followed by current user or mutual friends
            const list = res.data.following || [];
            setFriends(list);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setSelectedFriendIds(new Set());
      setNote('');
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      getFriendsList().then((res) => {
        if (res.data) setFriends(res.data.following || []);
      });
      return;
    }

    try {
      const res = await searchFriends(query.trim());
      if (res.data?.users) {
        setFriends(res.data.users);
      }
    } catch {
      // fallback
    }
  };

  const toggleSelectFriend = (id) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedFriendIds.size === friends.length) {
      setSelectedFriendIds(new Set());
    } else {
      setSelectedFriendIds(new Set(friends.map((f) => f.id)));
    }
  };

  const handleSendInvites = async () => {
    if (selectedFriendIds.size === 0) {
      toast.error('Please select at least one friend to invite');
      return;
    }

    setSending(true);
    try {
      const recipientIds = Array.from(selectedFriendIds);
      const res = await inviteFriendsToEvent(event.id, {
        recipientIds,
        meetupId: meetup?.id || null,
        note: note.trim() || undefined,
      });

      toast.success(res.data?.message || `Invitations sent to ${recipientIds.length} friends!`);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send invitations';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const eventUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/events/${event?.id}${meetup ? `?meetup=${meetup.id}` : ''}`
    : '';

  const handleCopyLink = () => {
    if (!eventUrl) return;
    navigator.clipboard.writeText(eventUrl);
    setCopiedLink(true);
    toast.success('Event link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (!event) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Friends to Event"
      subtitle={meetup ? `Invite friends to join "${meetup.title}"` : `Bring your Tribe along to "${event.title}"`}
    >
      <div className="space-y-4">
        {/* Quick Link Share Ribbon */}
        <div className="p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
              <Link2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#EFEFF1] truncate">Share Event Link</p>
              <p className="text-[11px] text-[#949599] truncate">{eventUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition flex items-center gap-1"
            >
              {copiedLink ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
            {onOpenSocialShare && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSocialShare();
                }}
                className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                title="Share to WhatsApp, Telegram & socials"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Tribe Members */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#949599]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search friends by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14171A] border border-[#262B2F] text-xs text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/40"
          />
        </div>

        {/* Friend List Header */}
        <div className="flex items-center justify-between text-xs text-[#949599] pt-1">
          <span>Your Tribe Connections ({friends.length})</span>
          {friends.length > 0 && (
            <button
              type="button"
              onClick={selectAll}
              className="text-white hover:underline font-semibold"
            >
              {selectedFriendIds.size === friends.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {/* Friends Selectable Scroll Area */}
        <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 border border-[#262B2F] rounded-xl p-2 bg-[#14171A]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#949599]">
              {searchQuery ? 'No matching users found.' : 'You haven’t connected with friends yet. Search above to find users or share the direct link!'}
            </div>
          ) : (
            friends.map((friend) => {
              const selected = selectedFriendIds.has(friend.id);
              return (
                <div
                  key={friend.id}
                  onClick={() => toggleSelectFriend(friend.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition ${
                    selected ? 'bg-white/10 border border-white/20' : 'bg-[#1C232B] hover:bg-[#242B32] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#242B32] border border-white/10 text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        friend.name?.[0] || 'U'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#EFEFF1] truncate">{friend.name}</p>
                      <p className="text-[10px] text-[#949599] truncate">{friend.email}</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                    selected ? 'bg-white border-white text-black' : 'border-[#494F55] bg-transparent'
                  }`}>
                    {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Personal Note */}
        <div>
          <label className="block text-xs font-semibold text-[#EFEFF1] mb-1.5">
            Personal Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Pull up with the squad! Meeting at the main gate."
            maxLength={160}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#14171A] border border-[#262B2F] text-xs text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/40"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#262B2F] flex items-center justify-between gap-3">
          <span className="text-xs text-[#949599]">
            {selectedFriendIds.size} friend{selectedFriendIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#949599] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendInvites}
              disabled={sending || selectedFriendIds.size === 0}
              className="px-5 py-2 rounded-xl bg-white text-[#1C232B] text-xs font-black hover:bg-[#CBD5E1] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{sending ? 'Sending...' : 'Send Invitations'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
