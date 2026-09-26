import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { followUser, unfollowUser, checkUserFollow } from '@/api/users';

export default function FollowUserButton({
  userId,
  initialFollowing = null,
  onFollowChange,
  size = 'sm',
  className = '',
}) {
  const { isAuthenticated, user: currentUser } = useAuth();
  const [following, setFollowing] = useState(!!initialFollowing);
  const [loading, setLoading] = useState(false);

  // If user is viewing themselves, do not show button
  const isSelf = currentUser?.id && Number(currentUser.id) === Number(userId);

  useEffect(() => {
    if (initialFollowing !== null && initialFollowing !== undefined) {
      setFollowing(!!initialFollowing);
      return;
    }

    if (isAuthenticated && userId && !isSelf) {
      let cancelled = false;
      checkUserFollow(userId)
        .then((res) => {
          if (!cancelled && res.data) {
            setFollowing(res.data.isFollowing ?? res.data.following ?? false);
          }
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
  }, [userId, isAuthenticated, initialFollowing, isSelf]);

  if (isSelf || !userId) return null;

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please sign in to follow friends and join tribes');
      return;
    }

    setLoading(true);
    try {
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
        toast.success('Unfollowed friend');
        onFollowChange?.(false);
      } else {
        await followUser(userId);
        setFollowing(true);
        toast.success('Connected! Friend added to your Tribe 🎉');
        onFollowChange?.(true);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Action failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const isSmall = size === 'sm';

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all disabled:opacity-50 ${
        isSmall ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'
      } ${
        following
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
          : 'bg-white/10 text-white border border-white/20 hover:bg-white hover:text-[#1C232B]'
      } ${className}`}
      title={following ? 'Unfollow friend' : 'Follow friend'}
    >
      {loading ? (
        <Loader2 className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} animate-spin`} />
      ) : following ? (
        <>
          <UserCheck className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>Tribe Member</span>
        </>
      ) : (
        <>
          <UserPlus className={isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>Connect</span>
        </>
      )}
    </motion.button>
  );
}
