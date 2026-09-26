import { useState, useEffect } from 'react';
import { Tag, Check, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { followCategory, unfollowCategory, checkCategoryFollowStatus } from '@/api/users';

export default function FollowCategoryButton({
  categoryName,
  size = 'sm',
  className = '',
  onFollowChange,
}) {
  const { isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!categoryName || !isAuthenticated) return;
    let active = true;
    checkCategoryFollowStatus(categoryName)
      .then((res) => {
        if (active) setIsFollowing(!!(res.data?.following || res.data?.isFollowing));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [categoryName, isAuthenticated]);

  if (!categoryName) return null;

  const handleToggle = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please log in to follow categories');
      return;
    }

    setLoading(true);
    const prev = isFollowing;
    try {
      if (prev) {
        await unfollowCategory(categoryName);
        setIsFollowing(false);
        onFollowChange?.(false, categoryName);
        toast.success(`Unfollowed ${categoryName}`);
      } else {
        await followCategory(categoryName);
        setIsFollowing(true);
        onFollowChange?.(true, categoryName);
        toast.success(`Following ${categoryName}! We'll notify you when new ${categoryName} events are announced.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update category follow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold transition select-none disabled:opacity-50 ${
        size === 'xs' ? 'px-2 py-0.5' : 'px-3 py-1.5'
      } ${
        isFollowing
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
          : 'bg-[#1C232B] text-[#949599] border border-[#2E353B] hover:text-white hover:border-white/30'
      } ${className}`}
    >
      <Tag className="w-3 h-3 text-amber-400" />
      <span>{categoryName}</span>
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin ml-0.5" />
      ) : isFollowing ? (
        <Check className="w-3 h-3 text-amber-400 ml-0.5" />
      ) : (
        <Plus className="w-3 h-3 opacity-60 ml-0.5" />
      )}
    </button>
  );
}
