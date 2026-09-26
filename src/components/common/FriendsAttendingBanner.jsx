import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Sparkles, ChevronRight, X, UserCheck, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getFriendsAttending } from '@/api/meetups';
import Modal from '@/components/common/Modal';

export default function FriendsAttendingBanner({
  eventId,
  onInviteClick,
  onShareClick,
  className = '',
}) {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState({ count: 0, friends: [], headline: '' });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (eventId && isAuthenticated) {
      setLoading(true);
      getFriendsAttending(eventId)
        .then((res) => {
          if (!cancelled && res.data) {
            setData(res.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [eventId, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className={`p-4 rounded-2xl bg-gradient-to-r from-blue-900/20 via-[#161D22] to-indigo-950/20 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>See which friends are attending</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">Tribes</span>
            </h4>
            <p className="text-xs text-[#949599] mt-0.5">
              Sign in to see how many of your friends already have tickets.
            </p>
          </div>
        </div>
        <Link
          to="/login"
          className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold hover:bg-blue-500/30 transition shrink-0"
        >
          Sign In to Check &rarr;
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`p-4 rounded-2xl bg-[#161D22] border border-[#262B2F] animate-pulse flex items-center gap-3 ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-[#242B32]" />
        <div className="space-y-1.5 flex-1">
          <div className="w-1/3 h-3.5 bg-[#242B32] rounded" />
          <div className="w-1/2 h-3 bg-[#242B32] rounded" />
        </div>
      </div>
    );
  }

  const { count, friends } = data;

  if (count > 0) {
    const friendNames = friends.slice(0, 2).map((f) => f.name).join(', ');
    const remainingCount = count - 2;

    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#161D22] to-teal-950/30 border border-emerald-500/30 shadow-lg shadow-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar Stack */}
            <div className="flex items-center -space-x-3 shrink-0">
              {friends.slice(0, 4).map((friend, idx) => (
                <div
                  key={friend.id}
                  title={friend.name}
                  style={{ zIndex: 10 - idx }}
                  className="w-10 h-10 rounded-full border-2 border-[#161D22] bg-[#242B32] text-xs font-bold text-white flex items-center justify-center overflow-hidden ring-2 ring-emerald-500/40 shadow"
                >
                  {friend.avatar ? (
                    <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                  ) : (
                    friend.name?.[0] || 'F'
                  )}
                </div>
              ))}
              {friends.length > 4 && (
                <div
                  style={{ zIndex: 5 }}
                  className="w-10 h-10 rounded-full border-2 border-[#161D22] bg-emerald-600 text-[11px] font-black text-white flex items-center justify-center shadow"
                >
                  +{friends.length - 4}
                </div>
              )}
            </div>

            {/* Headline and Friend Names */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <h4 className="text-sm font-black text-white truncate">
                  {count === 1
                    ? `${friends[0].name} is attending this event!`
                    : `${count} of your friends are attending this event`}
                </h4>
              </div>
              <p className="text-xs text-[#CBD5E1] mt-0.5 truncate">
                {count === 1
                  ? 'Your friend already has their ticket. Join them!'
                  : remainingCount > 0
                    ? `${friendNames} and ${remainingCount} other friend${remainingCount === 1 ? '' : 's'} are going.`
                    : `${friendNames} are going.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition flex items-center gap-1.5"
            >
              <span>See Friends ({count})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {onInviteClick && (
              <button
                type="button"
                onClick={onInviteClick}
                className="px-3.5 py-2 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition flex items-center gap-1.5 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite More</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Modal: List of Attending Friends */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Friends Attending This Event"
          subtitle={`${count} friend${count === 1 ? '' : 's'} from your Tribe have confirmed tickets`}
        >
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#1C232B] border border-[#262B2F]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#242B32] border border-white/10 text-white font-bold flex items-center justify-center overflow-hidden shrink-0">
                    {friend.avatar ? (
                      <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                    ) : (
                      friend.name?.[0] || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-sm font-bold text-[#EFEFF1] truncate">{friend.name}</h5>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                      <UserCheck className="w-3 h-3" /> Confirmed Ticket Holder
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                    Attending
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-[#262B2F] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#949599]">
              Coordinate a squad outing or carpool in the <strong>Squads</strong> tab!
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onInviteClick && (
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    onInviteClick();
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Invite More Friends
                </button>
              )}
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // 0 friends attending
  return (
    <div className={`p-4 rounded-2xl bg-[#161D22] border border-[#262B2F] flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
            <span>None of your friends have tickets yet</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </h4>
          <p className="text-xs text-[#949599] mt-0.5">
            Be the first to gather your tribe! Invite your friends to pull up with you.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
        {onShareClick && (
          <button
            type="button"
            onClick={onShareClick}
            className="px-3 py-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition text-xs font-semibold flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        )}
        {onInviteClick && (
          <button
            type="button"
            onClick={onInviteClick}
            className="px-3.5 py-1.5 rounded-xl bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" /> Invite Friends
          </button>
        )}
      </div>
    </div>
  );
}
