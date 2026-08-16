import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Layers, Plus, Music, Trophy, Code2, Briefcase, Palette,
  Dumbbell, Utensils, Camera, BookOpen, MoreVertical, Pencil, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
} from '@/api/admin';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import PageHeader from '@/components/common/PageHeader';

const iconOptions = [
  { key: 'Music', icon: Music }, { key: 'Trophy', icon: Trophy },
  { key: 'Code2', icon: Code2 }, { key: 'Briefcase', icon: Briefcase },
  { key: 'Palette', icon: Palette }, { key: 'Dumbbell', icon: Dumbbell },
  { key: 'Utensils', icon: Utensils }, { key: 'Camera', icon: Camera },
  { key: 'BookOpen', icon: BookOpen }, { key: 'Layers', icon: Layers },
];

const getIcon = (name) => iconOptions.find((o) => o.key === name)?.icon || Layers;

const slugify = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', icon: 'Layers', active: true });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCategories();
      const d = res.data;
      setCategories(Array.isArray(d) ? d : d.categories || d.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', slug: '', icon: 'Layers', active: true });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon || 'Layers', active: cat.isActive ?? true });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Category name is required');
    setSaving(true);
    try {
      const payload = { ...form, slug: form.slug || slugify(form.name) };
      if (editing) {
        await updateCategory(editing.id, payload);
        toast.success('Category updated');
      } else {
        await createCategory(payload);
        toast.success('Category created');
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      toast.success('Category deleted');
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (cat) => {
    try {
      await updateCategory(cat.id, { isActive: !cat.isActive });
      toast.success(cat.isActive ? 'Category deactivated' : 'Category activated');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Layers}
        accent="teal"
        title="Categories"
        subtitle="The buckets organizers choose from when listing an event."
        count={categories.length || undefined}
        actions={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        }
      />

      {/* Grid */}
      {loading ? (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]">
          <LoadingSpinner label="Loading categories..." className="py-16" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F]">
          <EmptyState
            icon={Layers}
            title="No categories yet"
            description="Nothing here yet — add the first category."
            action={openAdd}
            actionLabel="Add Category"
            className="py-16"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat, i) => {
            const Icon = getIcon(cat.icon);
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl bg-[#171A1D] border border-[#262B2F] p-5 hover:border-[#D4AF37]/40 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/12 text-[#D4AF37] flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(cat)} className="p-1.5 rounded-md text-[#7D8387] hover:text-[#D4AF37] hover:bg-[#494F55]/30 transition" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(cat)} className="p-1.5 rounded-md text-[#7D8387] hover:text-red-400 hover:bg-red-500/15 transition" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-[#F2F4F5]">{cat.name}</h3>
                <p className="text-xs text-[#7D8387] mt-0.5 font-mono">/{cat.slug}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="neutral" size="sm">{cat.eventCount ?? cat.events ?? 0} events</Badge>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-[#7D8387]">{cat.isActive === false ? 'Inactive' : 'Active'}</span>
                    <button
                      onClick={() => toggleActive(cat)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${cat.isActive === false ? 'bg-[#494F55]/40' : 'bg-[#D4AF37]'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cat.isActive === false ? 'translate-x-0' : 'translate-x-5'}`} />
                    </button>
                  </label>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#7D8387] hover:text-[#F2F4F5] transition">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7D8387] mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
              placeholder="e.g. Music & Concerts"
              className="w-full px-3 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7D8387] mb-1.5">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="auto-generated"
              className="w-full px-3 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] placeholder-[#494F55] font-mono focus:outline-none focus:border-[#D4AF37]/60 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7D8387] mb-2">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {iconOptions.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setForm((f) => ({ ...f, icon: key }))}
                  className={`aspect-square rounded-lg flex items-center justify-center border transition ${
                    form.icon === key
                      ? 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/50'
                      : 'bg-[#1E252B]/50 text-[#7D8387] border-[#494F55]/30 hover:border-[#494F55]/60'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.active ? 'bg-[#D4AF37]' : 'bg-[#494F55]/40'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm text-[#F2F4F5]">Active</span>
          </label>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Category"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#7D8387] hover:text-[#F2F4F5] transition">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-[#F2F4F5]">Delete category <span className="font-semibold">{deleteTarget?.name}</span>?</p>
            <p className="text-xs text-[#7D8387] mt-1">Events in this category will become uncategorized.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
