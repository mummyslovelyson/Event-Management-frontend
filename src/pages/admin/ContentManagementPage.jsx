import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Image as ImageIcon, HelpCircle, Megaphone, Plus, Pencil,
  Trash2, Eye, EyeOff, PenSquare, User as UserIcon, CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getContentPages, createContentPage, updateContentPage, deleteContentPage,
} from '@/api/admin';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import PageHeader from '@/components/common/PageHeader';

const tabs = [
  { key: 'banners', label: 'Banners', icon: ImageIcon },
  { key: 'faqs', label: 'FAQs', icon: HelpCircle },
  { key: 'blog', label: 'Blog', icon: FileText },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
];

const itemLabels = { banners: 'banner', faqs: 'FAQ', blog: 'blog post', announcements: 'announcement' };
const itemLabelsPlural = { banners: 'banners', faqs: 'FAQs', blog: 'blog posts', announcements: 'announcements' };

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function ContentManagementPage() {
  const [tab, setTab] = useState('banners');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getContentPages({ type: tab });
      const d = res.data;
      setItems(Array.isArray(d) ? d : d.items || d.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
    setEditing(null);
    setForm(initialForm(tab));
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm(item);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateContentPage(editing.id, { ...form, type: tab });
        toast.success('Content updated');
      } else {
        await createContentPage({ ...form, type: tab });
        toast.success('Content created');
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContentPage(deleteTarget.id);
      toast.success('Content deleted');
      setDeleteTarget(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (item) => {
    try {
      await updateContentPage(item.id, { ...item, isActive: !item.isActive, type: tab });
      toast.success(item.isActive ? 'Deactivated' : 'Activated');
      fetchItems();
    } catch {
      toast.error('Failed to update');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        accent="violet"
        title="Content"
        subtitle="What people see on the public site — banners, FAQs, blog posts, and announcements."
        count={items.length || undefined}
        actions={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition"
          >
            <Plus className="w-4 h-4" /> Add {itemLabels[tab]}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === key ? 'bg-[#D4AF37] text-[#1E252B]' : 'text-[#7D8387] hover:text-[#F2F4F5] hover:bg-[#242B32]'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading content..." className="py-16" />
        ) : items.length === 0 ? (
          <EmptyState icon={FileText} title={`No ${itemLabelsPlural[tab]} yet`} description={`Create your first ${itemLabels[tab]} to get started.`} action={openAdd} actionLabel={`Add ${itemLabels[tab]}`} className="py-16" />
        ) : tab === 'banners' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {items.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl bg-[#1D2124] border border-[#262B2F] overflow-hidden hover:border-[#D4AF37]/40 transition-all">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 bg-[#494F55]/20 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-[#494F55]" /></div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-[#F2F4F5] truncate">{item.title}</h3>
                  {item.link && <p className="text-xs text-[#D4AF37] mt-1 truncate">{item.link}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant={item.isActive === false ? 'neutral' : 'success'} size="sm" dot>{item.isActive === false ? 'Inactive' : 'Active'}</Badge>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleActive(item)} className="p-1.5 rounded-md text-[#7D8387] hover:text-[#D4AF37] hover:bg-[#494F55]/30 transition" title={item.isActive === false ? 'Activate' : 'Deactivate'}>
                        {item.isActive === false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-md text-[#7D8387] hover:text-[#D4AF37] hover:bg-[#494F55]/30 transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-md text-[#7D8387] hover:text-red-400 hover:bg-red-500/15 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : tab === 'faqs' ? (
          <div className="divide-y divide-[#262B2F]/70">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-5 hover:bg-[#1D2124] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0"><HelpCircle className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-[#F2F4F5]">{item.question}</h3>
                    {item.category && <Badge variant="neutral" size="sm">{item.category}</Badge>}
                  </div>
                  <p className="text-sm text-[#7D8387] mt-1 line-clamp-2">{item.answer}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-md text-[#7D8387] hover:text-[#D4AF37] hover:bg-[#494F55]/30 transition"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-md text-[#7D8387] hover:text-red-400 hover:bg-red-500/15 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'blog' ? (
          <div className="divide-y divide-[#262B2F]/70">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-5 hover:bg-[#1D2124] transition-colors">
                {item.image ? <img src={item.image} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" /> : <div className="w-14 h-14 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0"><FileText className="w-6 h-6" /></div>}
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-[#F2F4F5] truncate">{item.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#7D8387]">
                    <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {item.author || '—'}</span>
                    <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {fmtDate(item.createdAt)}</span>
                  </div>
                </div>
                <Badge variant={item.status === 'published' ? 'success' : 'pending'} size="sm" dot>{item.status || 'draft'}</Badge>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-md text-[#7D8387] hover:text-[#D4AF37] hover:bg-[#494F55]/30 transition"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-md text-[#7D8387] hover:text-red-400 hover:bg-red-500/15 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-[#262B2F]/70">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-5 hover:bg-[#1D2124] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center shrink-0"><Megaphone className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-[#F2F4F5]">{item.title}</h3>
                  <p className="text-sm text-[#7D8387] mt-1 line-clamp-2">{item.message || item.content}</p>
                  <p className="text-xs text-[#494F55] mt-1">{fmtDate(item.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-md text-[#7D8387] hover:text-[#D4AF37] hover:bg-[#494F55]/30 transition"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-md text-[#7D8387] hover:text-red-400 hover:bg-red-500/15 transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Edit ${itemLabels[tab]}` : `Add ${itemLabels[tab]}`}
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#7D8387] hover:text-[#F2F4F5] transition">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <ContentForm tab={tab} form={form} setForm={setForm} />
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Content"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#7D8387] hover:text-[#F2F4F5] transition">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-sm text-[#F2F4F5]">Are you sure you want to delete this content? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

function initialForm(tab) {
  if (tab === 'banners') return { title: '', link: '', image: '', isActive: true };
  if (tab === 'faqs') return { question: '', answer: '', category: 'general' };
  if (tab === 'blog') return { title: '', author: '', content: '', status: 'draft', image: '' };
  return { title: '', message: '' };
}

function ContentForm({ tab, form, setForm }) {
  const input = 'w-full px-3 py-2 rounded-lg bg-[#1E252B] border border-[#494F55]/40 text-sm text-[#F2F4F5] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 transition';
  const label = 'block text-xs font-semibold uppercase tracking-wider text-[#7D8387] mb-1.5';

  if (tab === 'banners') {
    return (
      <div className="space-y-4">
        <div><label className={label}>Title</label><input className={input} value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Banner title" /></div>
        <div><label className={label}>Image URL</label><input className={input} value={form.image || ''} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." /></div>
        <div><label className={label}>Link</label><input className={input} value={form.link || ''} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." /></div>
        <label className="flex items-center gap-3 cursor-pointer">
          <button onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-[#D4AF37]' : 'bg-[#494F55]/40'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
          </button>
          <span className="text-sm text-[#F2F4F5]">Active</span>
        </label>
      </div>
    );
  }
  if (tab === 'faqs') {
    return (
      <div className="space-y-4">
        <div><label className={label}>Question</label><input className={input} value={form.question || ''} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Question" /></div>
        <div><label className={label}>Answer</label><textarea className={`${input} resize-none`} rows={4} value={form.answer || ''} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Answer" /></div>
        <div><label className={label}>Category</label>
          <select className={input} value={form.category || 'general'} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="general">General</option><option value="payments">Payments</option><option value="events">Events</option><option value="account">Account</option>
          </select>
        </div>
      </div>
    );
  }
  if (tab === 'blog') {
    return (
      <div className="space-y-4">
        <div><label className={label}>Title</label><input className={input} value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Blog post title" /></div>
        <div><label className={label}>Author</label><input className={input} value={form.author || ''} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Author name" /></div>
        <div><label className={label}>Cover Image URL</label><input className={input} value={form.image || ''} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." /></div>
        <div><label className={label}>Content</label><textarea className={`${input} resize-none`} rows={6} value={form.content || ''} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your blog post..." /></div>
        <div><label className={label}>Status</label>
          <select className={input} value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="draft">Draft</option><option value="published">Published</option>
          </select>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div><label className={label}>Title</label><input className={input} value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" /></div>
      <div><label className={label}>Message</label><textarea className={`${input} resize-none`} rows={4} value={form.message || ''} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Announcement message" /></div>
    </div>
  );
}
