import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Trash2, Edit3, Check, X,
  Sliders, Send, Play, RefreshCw, AlertCircle, Database, CheckCircle2,
  FileText, ShieldCheck, HelpCircle, Tags,
  MessageSquare, Mic, User, Clock, ChevronLeft, ChevronRight, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAITrainingData,
  createAIKnowledgeItem,
  updateAIKnowledgeItem,
  deleteAIKnowledgeItem,
  updateAISettings,
  testAIPrompt,
  getBotConversations,
  deleteBotConversation,
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

  // Bot & Voice Agent Conversations Logs State
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const [convMode, setConvMode] = useState('all'); // 'all' | 'chat' | 'voice'
  const [convPage, setConvPage] = useState(1);
  const [convPagination, setConvPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [convStats, setConvStats] = useState({ totalConversations: 0, todayCount: 0, chatCount: 0, voiceCount: 0 });

  const loadConversations = async (page = 1, mode = convMode, search = convSearch) => {
    setConvLoading(true);
    try {
      const res = await getBotConversations({ page, limit: 15, mode, search });
      setConversations(res.data.conversations || []);
      setConvPagination(res.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      setConvStats(res.data.stats || { totalConversations: 0, todayCount: 0, chatCount: 0, voiceCount: 0 });
    } catch (err) {
      console.error('[loadConversations]', err);
    } finally {
      setConvLoading(false);
    }
  };

  const handleDeleteConversation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this conversation record?')) return;
    try {
      await deleteBotConversation(id);
      toast.success('Conversation log deleted');
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setConvStats((prev) => ({
        ...prev,
        totalConversations: Math.max(0, prev.totalConversations - 1),
      }));
    } catch (err) {
      toast.error('Failed to delete conversation record');
    }
  };

  const handleConvSearchSubmit = (e) => {
    e?.preventDefault();
    setConvPage(1);
    loadConversations(1, convMode, convSearch);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAITrainingData();
      const data = res.data;
      setKnowledgeList(data.knowledge || []);
      setCustomInstructions(data.customInstructions || '');
      setTemperature(data.temperature || 0.7);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load Cliqs Bot data');
    } finally {
      setLoading(false);
    }
    loadConversations(1, 'all', '');
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'conversations') {
      loadConversations(convPage, convMode, convSearch);
    }
  }, [activeTab, convPage, convMode]);

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
        toast.success('Knowledge rule added to Cliqs Bot');
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
      toast.success('Cliqs Bot voice guidelines and settings updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update Cliqs Bot settings');
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
              Cliqs Bot Knowledge &amp; Training Studio
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/10 text-[#EFEFF1] border border-white/20">
              Live Assistant
            </span>
          </div>
          <p className="text-sm text-[#949599] mt-1">
            Manage custom business rules, venue policies, and Cliqs Bot guidelines in real time.
          </p>
        </div>

        {/* Global Action Stats */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[#1C232B] border border-[#2E363E] flex items-center gap-2 text-xs text-[#949599]">
            <Database className="w-4 h-4 text-[#EFEFF1]" />
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
          onClick={() => setActiveTab('conversations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'conversations'
              ? 'bg-white text-[#1C232B] shadow'
              : 'text-[#949599] hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>User Questions &amp; Bot Logs ({convStats.totalConversations})</span>
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
                        <span className="text-[#EFEFF1] flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Live in Cliqs Bot
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
            <h2 className="text-lg font-bold text-white">Cliqs Bot Persona &amp; Voice Guidelines</h2>
            <p className="text-xs text-[#949599] mt-1">
              These guidelines define Cliqs Bot&apos;s communication style, customer service tone, and platform policies.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#EFEFF1] uppercase tracking-wider mb-2">
                Cliqs Bot Voice &amp; Guidelines
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
              <HelpCircle className="w-4 h-4 text-[#EFEFF1]" />
              <span>Test Question</span>
            </div>
            <p className="text-xs text-[#949599]">
              Ask a question to preview how Cliqs Bot responds using live event data and your knowledge rules.
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
                  <CheckCircle2 className="w-4 h-4 text-[#EFEFF1]" />
                  <span>Cliqs Bot Response Preview</span>
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
                    <p>Generating Cliqs Bot response...</p>
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
              <span>Assistant: Tribes &amp; Cliqs Bot</span>
              <span>Flexibility: {temperature}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LIVE USER CONVERSATIONS & LOGS */}
      {activeTab === 'conversations' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#161D22] border border-[#2E363E] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#949599] uppercase tracking-wider">Total Exchanges</span>
                <h4 className="text-2xl font-black text-white mt-1">{convStats.totalConversations}</h4>
                <span className="text-[11px] text-[#949599]">All logged user exchanges</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1C232B] border border-[#2E363E] flex items-center justify-center text-white">
                <Database className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#161D22] border border-[#2E363E] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#949599] uppercase tracking-wider">Today&apos;s Questions</span>
                <h4 className="text-2xl font-black text-white mt-1">{convStats.todayCount}</h4>
                <span className="text-[11px] text-[#949599]">Activity past 24 hours</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1C232B] border border-[#2E363E] flex items-center justify-center text-white">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#161D22] border border-[#2E363E] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#949599] uppercase tracking-wider">Text Chat (Cliqs Bot)</span>
                <h4 className="text-2xl font-black text-white mt-1">{convStats.chatCount}</h4>
                <span className="text-[11px] text-[#949599]">Text widget interactions</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1C232B] border border-[#2E363E] flex items-center justify-center text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#161D22] border border-[#2E363E] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#949599] uppercase tracking-wider">Voice Agent (Speech)</span>
                <h4 className="text-2xl font-black text-white mt-1">{convStats.voiceCount}</h4>
                <span className="text-[11px] text-[#949599]">Hands-free speech dialogues</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2E1414] border border-[#b21414]/40 flex items-center justify-center text-[#b21414]">
                <Mic className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filters, Mode Tabs & Search */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <form onSubmit={handleConvSearchSubmit} className="relative w-full md:w-96 flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-[#494F55]" />
              <input
                type="text"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Search question, answer, user name or email..."
                className="w-full pl-9 pr-20 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-white/40"
              />
              <button
                type="submit"
                className="absolute right-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white hover:text-[#1C232B] text-white text-[11px] font-bold transition cursor-pointer"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#161D22] border border-[#2E363E]">
                {[
                  { id: 'all', label: 'All Modes' },
                  { id: 'chat', label: 'Text Chat' },
                  { id: 'voice', label: 'Voice Agent' },
                ].map((modeItem) => (
                  <button
                    key={modeItem.id}
                    onClick={() => {
                      setConvMode(modeItem.id);
                      setConvPage(1);
                      loadConversations(1, modeItem.id, convSearch);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      convMode === modeItem.id
                        ? 'bg-white text-[#1C232B]'
                        : 'text-[#949599] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {modeItem.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => loadConversations(convPage, convMode, convSearch)}
                disabled={convLoading}
                className="p-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-[#949599] hover:text-white hover:border-white/30 transition cursor-pointer"
                title="Refresh logs"
              >
                <RefreshCw className={`w-4 h-4 ${convLoading ? 'animate-spin text-white' : ''}`} />
              </button>
            </div>
          </div>

          {/* Conversations List */}
          {convLoading ? (
            <div className="rounded-2xl bg-[#161D22] border border-[#2E363E] p-12 flex flex-col items-center justify-center">
              <LoadingSpinner size="lg" />
              <p className="text-xs text-[#949599] mt-3">Loading conversation logs...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-2xl bg-[#161D22] border border-[#2E363E] p-12 text-center text-sm text-[#949599]">
              <MessageSquare className="w-8 h-8 text-[#494F55] mx-auto mb-3" />
              <p className="font-bold text-white">No conversation logs found</p>
              <p className="text-xs mt-1">
                {convSearch ? 'Try a different search query or mode filter.' : 'When users ask questions to Cliqs Bot or the Voice Agent, every question and answer is recorded here in real-time.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[#161D22] border border-[#2E363E] p-5 space-y-4 hover:border-white/30 transition-all"
                >
                  {/* Item Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#242B32]">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Mode Badge */}
                      {item.mode === 'voice' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2E1414] border border-[#b21414]/50 text-[#b21414] text-[11px] font-bold">
                          <Mic className="w-3.5 h-3.5" />
                          <span>Voice Agent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C232B] border border-[#2E363E] text-[#EFEFF1] text-[11px] font-bold">
                          <MessageSquare className="w-3.5 h-3.5 text-[#949599]" />
                          <span>Cliqs Bot</span>
                        </span>
                      )}

                      {/* User Info */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#14181C] border border-[#242B32] text-white text-[11px] font-medium">
                        <User className="w-3.5 h-3.5 text-[#949599]" />
                        <span>{item.user_name || 'Guest Visitor'}</span>
                        {item.user_email && (
                          <span className="text-[#949599] font-normal">({item.user_email})</span>
                        )}
                      </span>

                      {/* Intent Badge */}
                      {item.intent && (
                        <span className="px-2 py-0.5 rounded bg-[#1C232B] text-[10px] uppercase font-semibold text-[#949599] border border-[#242B32]">
                          {item.intent}
                        </span>
                      )}

                      {/* Page Location */}
                      {item.page_path && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#14181C] text-[10px] text-[#949599] border border-[#242B32] font-mono">
                          <Globe className="w-3 h-3" />
                          <span>{item.page_path}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#949599]">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-[#494F55]" />
                        <span>{new Date(item.created_at).toLocaleString()}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteConversation(item.id)}
                        className="p-1.5 rounded-lg text-[#949599] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete log entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question & Answer Exchange */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* User Question */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#949599] uppercase tracking-wider">
                        <User className="w-3.5 h-3.5" />
                        <span>User Question / Voice Query:</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#14181C] border border-[#242B32] text-xs text-white leading-relaxed font-medium">
                        &quot;{item.question}&quot;
                      </div>
                    </div>

                    {/* Bot / Voice Agent Answer */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#EFEFF1] uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Agent Response Delivered:</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#1C232B] border border-[#2E363E] text-xs text-[#EFEFF1] leading-relaxed whitespace-pre-wrap font-normal">
                        {item.answer}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {convPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[#2E363E]">
                  <span className="text-xs text-[#949599]">
                    Showing Page {convPagination.page} of {convPagination.totalPages} ({convPagination.total} total exchanges)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={convPagination.page <= 1 || convLoading}
                      onClick={() => {
                        const newPage = convPagination.page - 1;
                        setConvPage(newPage);
                        loadConversations(newPage, convMode, convSearch);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161D22] border border-[#2E363E] text-xs text-white hover:bg-white/10 disabled:opacity-40 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    <button
                      type="button"
                      disabled={convPagination.page >= convPagination.totalPages || convLoading}
                      onClick={() => {
                        const newPage = convPagination.page + 1;
                        setConvPage(newPage);
                        loadConversations(newPage, convMode, convSearch);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161D22] border border-[#2E363E] text-xs text-white hover:bg-white/10 disabled:opacity-40 transition cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
              placeholder="Provide the exact information or guidance Cliqs Bot should use when answering questions about this topic..."
              className="w-full p-3.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-white/40 leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded accent-[#b21414] cursor-pointer"
            />
            <label htmlFor="is_active" className="text-xs text-[#EFEFF1] cursor-pointer">
              Enable this rule for Cliqs Bot responses immediately
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
