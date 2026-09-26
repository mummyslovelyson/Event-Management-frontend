import { useState, useEffect } from 'react';
import { UserCheck, UserPlus, Loader2, Music } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { followArtist, unfollowArtist, checkArtistFollowStatus } from '@/api/users';

export default function FollowArtistButton({
  artistName,
  size = 'sm',
  variant = 'button',
  className = '',
  onFollowChange,
}) {
  const { isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!artistName || !isAuthenticated) return;
    let active = true;
    setChecking(true);
    checkArtistFollowStatus(artistName)
      .then((res) => {
        if (active) setIsFollowing(!!(res.data?.following || res.data?.isFollowing));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [artistName, isAuthenticated]);

  if (!artistName) return null;

  const handleToggle = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please log in to follow artists');
      return;
    }

    setLoading(true);
    const prev = isFollowing;
    try {
      if (prev) {
        await unfollowArtist(artistName);
        setIsFollowing(false);
        onFollowChange?.(false, artistName);
        toast.success(`Unfollowed ${artistName}`);
      } else {
        await followArtist(artistName);
        setIsFollowing(true);
        onFollowChange?.(true, artistName);
        toast.success(`Following ${artistName}! We'll notify you when new events are created.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update follow status');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'chip') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading || checking}
        title={isFollowing ? `Unfollow ${artistName}` : `Follow ${artistName}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition select-none disabled:opacity-50 ${
          isFollowing
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
            : 'bg-[#1C232B] text-[#CBD5E1] border border-[#2E353B] hover:border-white/40 hover:text-white'
        } ${className}`}
      >
        <Music className="w-3 h-3 text-amber-400" />
        <span>{artistName}</span>
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin ml-0.5" />
        ) : isFollowing ? (
          <UserCheck className="w-3 h-3 ml-0.5" />
        ) : (
          <UserPlus className="w-3 h-3 ml-0.5 opacity-60 hover:opacity-100" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading || checking}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition select-none disabled:opacity-50 ${
        size === 'xs'
          ? 'px-2 py-1 text-xs'
          : size === 'sm'
          ? 'px-3 py-1.5 text-xs'
          : 'px-4 py-2 text-sm'
      } ${
        isFollowing
          ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
          : 'bg-white text-[#1C232B] hover:bg-[#CBD5E1]'
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="w-3.5 h-3.5 text-amber-400" /> Following
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" /> Follow
        </>
      )}
    </button>
  );
}
