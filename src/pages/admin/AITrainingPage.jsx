import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Plus, Search, Trash2, Edit3, Check, X,
  Sliders, Send, Play, RefreshCw, AlertCircle, Database, CheckCircle2,
  FileText, ShieldCheck, HelpCircle, Tags, Cpu
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAITrainingData,
  createAIKnowledgeItem,
  updateAIKnowledgeItem,
  deleteAIKnowledgeItem,
  updateAISettings,
  testAIPrompt,
} from '@/api/admin';
import Modal from '@/components/common/Modal';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const CATEGORIES = [
  { id: 'all', label: 'All Knowledge' },
  { id: 'faq', label: 'General FAQs' },
  { id: 'ticketing', label: 'Ticketing & Resale' },
  { id: 'venue_policy', label: 'Venue & Seating' },
  { id: 'payments', label: 'Payments & Checkout' },
  { id: 'organizer', label: 'Organizer Guides' },
  { id: 'promotion', label: 'Promotions & Special' },
  { id: 'custom', label: 'Custom Instructions' },
];

export default function AITrainingPage() {
  const [activeTab, setActiveTab] = useState('knowledge'); // 'knowledge' | 'prompt' | 'playground'
  const [loading, setLoading] = useState(true);
  const [knowledgeList, setKnowledgeList] = useState([]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [savingSettings, setSavingSettings] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'faq',
    keywords: '',
    instruction_or_answer: '',
    is_active: true,
  });
  const [formLoading, setFormLoading] = useState(false);

  // Playground Simulator State
  const [testQuery, setTestQuery] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAITrainingData();
      const data = res.data;
      setKnowledgeList(data.knowledge || []);
      setCustomInstructions(data.customInstructions || '');
      setTemperature(data.temperature || 0.7);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load concierge data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      category: 'faq',
      keywords: '',
      instruction_or_answer: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      category: item.category || 'faq',
      keywords: item.keywords || '',
      instruction_or_answer: item.instruction_or_answer || '',
      is_active: Boolean(item.is_active),
    });
    setIsModalOpen(true);
  };

  const handleSaveKnowledge = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.instruction_or_answer.trim()) {
      toast.error('Title and response guidance are required');
      return;
    }

    setFormLoading(true);
    try {
      if (editingItem) {
        await updateAIKnowledgeItem(editingItem.id, formData);
        toast.success('Knowledge item updated');
      } else {
        await createAIKnowledgeItem(formData);
        toast.success('Knowledge rule added to concierge');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save knowledge item');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const updatedStatus = !item.is_active;
      await updateAIKnowledgeItem(item.id, { is_active: updatedStatus });
      setKnowledgeList((prev) =>
        prev.map((k) => (k.id === item.id ? { ...k, is_active: updatedStatus } : k))
      );
      toast.success(updatedStatus ? 'Rule enabled' : 'Rule paused');
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this knowledge rule?')) return;
    try {
      await deleteAIKnowledgeItem(id);
      setKnowledgeList((prev) => prev.filter((k) => k.id !== id));
      toast.success('Knowledge rule deleted');
    } catch (err) {
      toast.error('Failed to delete knowledge rule');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateAISettings({ customInstructions, temperature });
      toast.success('Concierge voice guidelines and settings updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update concierge settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRunTest = async (e) => {
    e?.preventDefault();
    if (!testQuery.trim()) return;

    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await testAIPrompt({
        message: testQuery,
        customInstructions,
        temperature,
      });
      setTestResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Response test failed');
    } finally {
      setTestLoading(false);
    }
  };

  const filteredKnowledge = knowledgeList.filter((item) => {
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSearch =
      !search ||
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.instruction_or_answer?.toLowerCase().includes(search.toLowerCase()) ||
      item.keywords?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeCount = knowledgeList.filter((k) => k.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#EFEFF1] tracking-tight">
              Concierge Knowledge &amp; Training Studio
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Live Assistant
            </span>
          </div>
          <p className="text-sm text-[#949599] mt-1">
            Manage custom business rules, venue policies, and concierge guidelines in real time.
          </p>
        </div>

        {/* Global Action Stats */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[#1C232B] border border-[#2E363E] flex items-center gap-2 text-xs text-[#949599]">
            <Database className="w-4 h-4 text-emerald-400" />
            <span><strong className="text-white font-bold">{activeCount}</strong> Active Rules</span>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-[#1C232B] hover:bg-[#CBD5E1] text-xs font-bold transition shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Knowledge Rule</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#2E363E] pb-3">
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'knowledge'
              ? 'bg-white text-[#1C232B] shadow'
              : 'text-[#949599] hover:text-white hover:bg-white/5'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Knowledge Base &amp; Rules ({knowledgeList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('prompt')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'prompt'
              ? 'bg-white text-[#1C232B] shadow'
              : 'text-[#949599] hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Assistant Persona &amp; Voice</span>
        </button>

        <button
          onClick={() => setActiveTab('playground')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'playground'
              ? 'bg-white text-[#1C232B] shadow'
              : 'text-[#949599] hover:text-white hover:bg-white/5'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Response Preview &amp; Testing</span>
        </button>
      </div>

      {/* TAB 1: KNOWLEDGE BASE */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#494F55]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search knowledge base, keywords..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-white/40"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    categoryFilter === cat.id
                      ? 'bg-white text-[#1C232B] font-bold'
                      : 'bg-[#1C232B] text-[#949599] hover:text-white hover:bg-[#242B32]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredKnowledge.length === 0 ? (
            <div className="rounded-2xl bg-[#161D22] border border-[#2E363E] p-12 text-center text-sm text-[#949599]">
              <AlertCircle className="w-8 h-8 text-[#494F55] mx-auto mb-3" />
              <p className="font-bold text-white">No knowledge base items found</p>
              <p className="text-xs mt-1">Click &quot;Add Knowledge Rule&quot; above to add custom answers and policies.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredKnowledge.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                    item.is_active
                      ? 'bg-[#161D22] border-[#2E363E] hover:border-white/30'
                      : 'bg-[#14181C] border-[#242B32] opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-[#EFEFF1]">{item.title}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#242B32] text-[#949599] border border-white/5">
                            {item.category}
                          </span>
                        </div>
                        {item.keywords && (
                          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[#494F55]">
                            <Tags className="w-3 h-3 shrink-0" />
                            <span className="line-clamp-1">{item.keywords}</span>
                          </div>
                        )}
                      </div>

                      {/* Active Toggle */}
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          item.is_active ? 'bg-emerald-500' : 'bg-[#2E363E]'
                        }`}
                        title={item.is_active ? 'Pause rule' : 'Activate rule'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            item.is_active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="mt-3 p-3 rounded-xl bg-[#1C232B] border border-[#242B32] text-xs text-[#CBD5E1] leading-relaxed">
                      {item.instruction_or_answer}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#242B32] flex items-center justify-between text-xs text-[#949599]">
                    <span className="text-[11px]">
                      {item.is_active ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Live in Concierge
                        </span>
                      ) : (
                        <span>Paused</span>
                      )}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-[#949599] hover:text-white transition"
                        title="Edit knowledge item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-[#949599] hover:text-rose-400 transition"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SYSTEM PERSONA & PROMPT */}
      {activeTab === 'prompt' && (
        <div className="rounded-2xl bg-[#161D22] border border-[#2E363E] p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Concierge Persona &amp; Voice Guidelines</h2>
            <p className="text-xs text-[#949599] mt-1">
              These guidelines define the concierge&apos;s communication style, customer service tone, and platform policies.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#EFEFF1] uppercase tracking-wider mb-2">
                Concierge Voice &amp; Guidelines
              </label>
              <textarea
                rows={6}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Tone: Energetic, friendly, luxury hospitality guide. Provide concise answers with clear next steps. Always mention that doors open 1 hour before showtime..."
                className="w-full p-4 rounded-xl bg-[#1C232B] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-white/40 leading-relaxed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#EFEFF1] mb-2">
                <span>Response Flexibility (Direct vs. Detailed: {temperature})</span>
                <span className="text-[#949599] font-normal text-[11px]">
                  {temperature < 0.4 ? 'Concise & Direct' : temperature > 0.8 ? 'Detailed & Conversational' : 'Balanced & Helpful'}
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#2E363E] flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-xl bg-white text-[#1C232B] hover:bg-[#CBD5E1] text-xs font-bold transition shadow disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE SIMULATOR PLAYGROUND */}
      {activeTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Input Form */}
          <div className="rounded-2xl bg-[#161D22] border border-[#2E363E] p-6 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Test Question</span>
            </div>
            <p className="text-xs text-[#949599]">
              Ask a question to preview how the concierge responds using live event data and your knowledge rules.
            </p>

            <form onSubmit={handleRunTest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#949599] mb-1">Test Message</label>
                <textarea
                  rows={3}
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="e.g. Can I resell my ticket if I cannot make it?"
                  className="w-full p-3 rounded-xl bg-[#1C232B] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-white/40"
                />
              </div>

              <div className="flex items-center gap-2">
                {[
                  'How do I transfer a ticket?',
                  'What are the payment options?',
                  'Can I resell my ticket?',
                  'What events are happening?',
                ].map((quick, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTestQuery(quick)}
                    className="px-2.5 py-1 rounded-lg bg-[#1C232B] hover:bg-[#242B32] border border-[#2E363E] text-[11px] text-[#949599] hover:text-white transition whitespace-nowrap"
                  >
                    {quick}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!testQuery.trim() || testLoading}
                className="w-full py-2.5 rounded-xl bg-white text-[#1C232B] hover:bg-[#CBD5E1] text-xs font-bold transition flex items-center justify-center gap-2 shadow disabled:opacity-50"
              >
                {testLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Preview...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Test Response</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Test Output Panel */}
          <div className="rounded-2xl bg-[#161D22] border border-[#2E363E] p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-white font-bold text-sm">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <span>Concierge Response Preview</span>
                </div>
                {testResult && (
                  <span className="text-[10px] text-[#949599] font-normal">
                    {testResult.contextUsed?.knowledgeCount} rules • {testResult.contextUsed?.eventsCount} events loaded
                  </span>
                )}
              </div>

              <div className="mt-4 min-h-[160px] p-4 rounded-xl bg-[#1C232B] border border-[#2E363E] flex flex-col justify-center">
                {testLoading ? (
                  <div className="text-center text-xs text-[#949599] space-y-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-white mx-auto" />
                    <p>Generating concierge response...</p>
                  </div>
                ) : testResult ? (
                  <div className="text-xs text-[#EFEFF1] leading-relaxed">
                    <p className="whitespace-pre-wrap">{testResult.reply}</p>
                  </div>
                ) : (
                  <div className="text-center text-xs text-[#494F55]">
                    Preview response will appear here after clicking &quot;Test Response&quot;.
                  </div>
                )}
              </div>
            </div>

            <div className="text-[11px] text-[#949599] pt-3 border-t border-[#2E363E] flex items-center justify-between">
              <span>Assistant: Tribes &amp; Cliqs Concierge</span>
              <span>Flexibility: {temperature}</span>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Knowledge Rule' : 'Add Knowledge Rule'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveKnowledge} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#EFEFF1] uppercase tracking-wider mb-1">
              Rule Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. VIP Lounge Parking & Valet"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-white/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#EFEFF1] uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white focus:outline-none focus:border-white/40"
              >
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#EFEFF1] uppercase tracking-wider mb-1">
                Trigger Keywords (comma separated)
              </label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="e.g. parking, valet, car, drive"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#EFEFF1] uppercase tracking-wider mb-1">
              Knowledge Content or Response Guidance
            </label>
            <textarea
              rows={4}
              required
              value={formData.instruction_or_answer}
              onChange={(e) => setFormData({ ...formData, instruction_or_answer: e.target.value })}
              placeholder="Provide the exact information or guidance the concierge should use when answering questions about this topic..."
              className="w-full p-3.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-white/40 leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
            />
            <label htmlFor="is_active" className="text-xs text-[#EFEFF1] cursor-pointer">
              Enable this rule for concierge responses immediately
            </label>
          </div>

          <div className="pt-4 border-t border-[#2E363E] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-[#949599] hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 rounded-xl bg-white text-[#1C232B] hover:bg-[#CBD5E1] text-xs font-bold transition shadow disabled:opacity-50"
            >
              {formLoading ? 'Saving...' : editingItem ? 'Update Rule' : 'Save Rule'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
