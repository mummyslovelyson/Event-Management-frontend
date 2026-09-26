import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, Mail, Check, X, Calendar, MapPin, Search,
  ExternalLink, Loader2, Sparkles, UserPlus, UserCheck, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getFriendsList, searchFriends } from '@/api/users';
import { getMyEventInvites, respondToEventInvite } from '@/api/meetups';
import FollowUserButton from '@/components/common/FollowUserButton';

export default function TribesAndInvitesTab() {
  const [subSection, setSubSection] = useState('invites'); // 'invites' | 'friends'
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  const [friendsData, setFriendsData] = useState({ following: [], followers: [], counts: { following: 0, followers: 0 } });
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchInvites();
    fetchFriends();
  }, []);

  const fetchInvites = async () => {
    setInvitesLoading(true);
    try {
      const res = await getMyEventInvites();
      if (res.data?.invites) {
        setInvites(res.data.invites);
      }
    } catch {
      // silent
    } finally {
      setInvitesLoading(false);
    }
  };

  const fetchFriends = async () => {
    setFriendsLoading(true);
    try {
      const res = await getFriendsList();
      if (res.data) {
        setFriendsData(res.data);
      }
    } catch {
      // silent
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleRespond = async (inviteId, status) => {
    setRespondingId(inviteId);
    try {
      await respondToEventInvite(inviteId, status);
      toast.success(status === 'accepted' ? 'Invitation accepted! 🎉' : 'Invitation declined');
      setInvites((prev) =>
        prev.map((inv) => (inv.id === inviteId ? { ...inv, status } : inv))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update invitation');
    } finally {
      setRespondingId(null);
    }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await searchFriends(q.trim());
      setSearchResults(res.data?.users || []);
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  };

  const pendingInvitesCount = invites.filter((i) => i.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Navigation Pills */}
      <div className="flex items-center gap-2 border-b border-[#262B2F] pb-3">
        <button
          type="button"
          onClick={() => setSubSection('invites')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            subSection === 'invites'
              ? 'bg-white text-[#1C232B] shadow-sm'
              : 'bg-[#1C232B] text-[#949599] hover:text-white'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Event Invitations</span>
          {pendingInvitesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500 text-black">
              {pendingInvitesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubSection('friends')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            subSection === 'friends'
              ? 'bg-white text-[#1C232B] shadow-sm'
              : 'bg-[#1C232B] text-[#949599] hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>My Tribe & Friends</span>
          <span className="text-[11px] opacity-75">
            ({friendsData.counts?.following || 0})
          </span>
        </button>
      </div>

      {/* SUB-SECTION 1: EVENT INVITATIONS */}
      {subSection === 'invites' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#EFEFF1]">Event Invitations</h3>
              <p className="text-xs text-[#949599]">Invitations from friends to pull up to events and squads.</p>
            </div>
            <span className="text-xs text-[#949599]">
              {invites.length} invitation{invites.length !== 1 ? 's' : ''}
            </span>
          </div>

          {invitesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          ) : invites.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#161D22] border border-[#262B2F] text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#EFEFF1]">No invitations yet</h4>
              <p className="text-xs text-[#949599] max-w-sm mx-auto">
                When friends invite you to concerts, festivals, or group outings, they will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((inv) => {
                const isPending = inv.status === 'pending';
                const isAccepted = inv.status === 'accepted';
                const isDeclined = inv.status === 'declined';

                return (
                  <motion.div
                    key={inv.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#161D22] border border-[#262B2F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Sender Avatar */}
                      <div className="w-11 h-11 rounded-full bg-[#242B32] border border-white/10 text-white font-bold flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                        {inv.sender?.avatar ? (
                          <img src={inv.sender.avatar} alt={inv.sender.name} className="w-full h-full object-cover" />
                        ) : (
                          inv.sender?.name?.[0] || 'F'
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#EFEFF1]">
                            {inv.sender?.name || 'A friend'}
                          </span>
                          <span className="text-xs text-[#949599]">invited you to</span>
                          <Link
                            to={`/events/${inv.eventId}`}
                            className="text-xs font-bold text-white hover:underline truncate"
                          >
                            {inv.event?.title || 'Event'}
                          </Link>
                        </div>

                        {inv.meetupTitle && (
                          <p className="text-[11px] text-purple-400 mt-0.5 font-medium flex items-center gap-1">
                            <span>Squad Outing:</span>
                            <strong>"{inv.meetupTitle}"</strong>
                          </p>
                        )}

                        {inv.note && (
                          <div className="mt-2 p-2.5 rounded-lg bg-[#1C232B] border border-[#262B2F] text-xs text-[#CBD5E1] italic">
                            "{inv.note}"
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#949599]">
                          {inv.event?.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#494F55]" /> {inv.event.venue}
                            </span>
                          )}
                          {inv.event?.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#494F55]" />
                              {new Date(inv.event.start_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions / Status */}
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#262B2F]">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRespond(inv.id, 'declined')}
                            disabled={respondingId === inv.id}
                            className="px-3.5 py-2 rounded-xl bg-[#1C232B] hover:bg-[#262B2F] text-xs font-semibold text-[#949599] hover:text-white transition disabled:opacity-50"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespond(inv.id, 'accepted')}
                            disabled={respondingId === inv.id}
                            className="px-4 py-2 rounded-xl bg-white text-[#1C232B] text-xs font-black hover:bg-[#CBD5E1] transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                          >
                            {respondingId === inv.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Accept</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            isAccepted
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}>
                            {isAccepted ? 'Accepted' : 'Declined'}
                          </span>
                          <Link
                            to={`/events/${inv.eventId}`}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition flex items-center gap-1"
                          >
                            <span>View Event</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-SECTION 2: MY TRIBE & FRIENDS */}
      {subSection === 'friends' && (
        <div className="space-y-6">
          {/* Search New Friends */}
          <div className="p-5 rounded-2xl bg-[#161D22] border border-[#262B2F] space-y-3">
            <h4 className="text-sm font-bold text-[#EFEFF1] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Discover & Follow Friends</span>
            </h4>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#949599]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search users by name or email address to add them to your Tribe..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14171A] border border-[#262B2F] text-xs text-[#EFEFF1] placeholder-[#494F55] focus:outline-none focus:border-white/40"
              />
            </div>

            {/* Live Search Results */}
            {searching && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}

            {searchResults && !searching && (
              <div className="pt-2 border-t border-[#262B2F] space-y-2">
                <p className="text-xs text-[#949599]">Search Results ({searchResults.length})</p>
                {searchResults.length === 0 ? (
                  <p className="text-xs text-[#494F55] py-2">No matching users found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 rounded-xl bg-[#1C232B] border border-[#262B2F] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#242B32] border border-white/10 text-white text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              u.name?.[0] || 'U'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#EFEFF1] truncate">{u.name}</p>
                            <p className="text-[10px] text-[#949599] truncate">{u.email}</p>
                          </div>
                        </div>
                        <FollowUserButton
                          userId={u.id}
                          initialFollowing={u.is_following}
                          onFollowChange={() => fetchFriends()}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Following List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#EFEFF1]">Friends You Follow</h4>
                <p className="text-xs text-[#949599]">You will see when these friends are attending events.</p>
              </div>
              <span className="text-xs text-[#949599]">
                {friendsData.following?.length || 0} friends
              </span>
            </div>

            {friendsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            ) : (friendsData.following?.length || 0) === 0 ? (
              <div className="p-6 rounded-2xl bg-[#161D22] border border-[#262B2F] text-center text-xs text-[#949599]">
                You aren't following any friends yet. Search above to start growing your Tribe!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {friendsData.following.map((friend) => (
                  <div
                    key={friend.id}
                    className="p-4 rounded-xl bg-[#161D22] border border-[#262B2F] flex items-center justify-between gap-3 hover:border-white/30 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#242B32] border border-white/10 text-white font-bold flex items-center justify-center shrink-0 overflow-hidden">
                        {friend.avatar ? (
                          <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                        ) : (
                          friend.name?.[0] || 'U'
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#EFEFF1] truncate">{friend.name}</p>
                        <p className="text-[10px] text-[#949599] truncate">{friend.email}</p>
                      </div>
                    </div>
                    <FollowUserButton
                      userId={friend.id}
                      initialFollowing={true}
                      onFollowChange={() => fetchFriends()}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
