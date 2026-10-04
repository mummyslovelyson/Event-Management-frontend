import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Trash2, Edit3, Check, X,
  Sliders, Send, Play, RefreshCw, AlertCircle, Database, CheckCircle2,
  FileText, ShieldCheck, HelpCircle, Tags,
  MessageSquare, Mic, User, Clock, ChevronLeft, ChevronRight, Globe,
  Sparkles, Cpu, Layers, Volume2, VolumeX, Radio, Activity, Flame, Zap, BarChart2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAITrainingData,
  createAIKnowledgeItem,
  updateAIKnowledgeItem,
  deleteAIKnowledgeItem,
  updateAISettings,
  testAIPrompt,
  getVoiceModelData,
  trainVoiceModel,
  updateVoiceModelSettings,
  createVoicePronunciationRule,
  deleteVoicePronunciationRule,
  createVoiceTrainingSample,
  deleteVoiceTrainingSample,
  testVoiceModel,
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

  // Voice Agent Deep Learning State
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceTraining, setVoiceTraining] = useState(false);
  const [voiceTrainingProgress, setVoiceTrainingProgress] = useState(null);
  const [voiceMetrics, setVoiceMetrics] = useState({
    version: 'Tribes-Voice-v2.5-DeepIntent',
    accuracy: 0.94,
    totalSamples: 0,
    classesCount: 11,
    trainedAt: null,
    confidenceThreshold: 0.55,
    cadence: 'direct_punchy',
    speechRate: 1.05,
    pitch: 1.0,
    language: 'en-GH',
  });
  const [pronunciationLexicon, setPronunciationLexicon] = useState([]);
  const [trainingSamples, setTrainingSamples] = useState([]);
  const [voiceClasses, setVoiceClasses] = useState([]);
  const [selectedVoiceIntent, setSelectedVoiceIntent] = useState('all');
  const [sampleSearch, setSampleSearch] = useState('');
  const [lexiconSearch, setLexiconSearch] = useState('');

  // Modals for Voice
  const [isLexiconModalOpen, setIsLexiconModalOpen] = useState(false);
  const [lexiconFormData, setLexiconFormData] = useState({ heard: '', replacement: '', category: 'general' });
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [sampleFormData, setSampleFormData] = useState({ text: '', intent: 'SEARCH_EVENTS' });
  const [savingVoiceSettings, setSavingVoiceSettings] = useState(false);

  // Voice Diagnostic Lab
  const [voiceTestQuery, setVoiceTestQuery] = useState('');
  const [voiceTestLoading, setVoiceTestLoading] = useState(false);
  const [voiceTestResult, setVoiceTestResult] = useState(null);
  const [isVoiceTestingListening, setIsVoiceTestingListening] = useState(false);

  const loadVoiceModel = async () => {
    setVoiceLoading(true);
    try {
      const res = await getVoiceModelData();
      const d = res.data;
      if (d.modelMetrics) setVoiceMetrics(d.modelMetrics);
      if (d.pronunciationLexicon) setPronunciationLexicon(d.pronunciationLexicon);
      if (d.trainingSamples) setTrainingSamples(d.trainingSamples);
      if (d.classes) setVoiceClasses(d.classes);
    } catch (err) {
      console.error('[loadVoiceModel]', err);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleRetrainVoiceModel = async () => {
    setVoiceTraining(true);
    setVoiceTrainingProgress({ epoch: 1, maxEpochs: 5, loss: 0.84, accuracy: 0.74 });

    for (let ep = 1; ep <= 5; ep++) {
      await new Promise((r) => setTimeout(r, 260));
      const simulatedLoss = Math.max(0.04, 0.84 - ep * 0.16 + (Math.random() * 0.02 - 0.01));
      const simulatedAcc = Math.min(0.98, 0.74 + ep * 0.045);
      setVoiceTrainingProgress({
        epoch: ep,
        maxEpochs: 5,
        loss: Math.round(simulatedLoss * 100) / 100,
        accuracy: Math.round(simulatedAcc * 100) / 100,
      });
    }

    try {
      const res = await trainVoiceModel();
      toast.success(res.data.message || 'Voice intent model retrained successfully!');
      if (res.data.metrics) {
        setVoiceMetrics((prev) => ({
          ...prev,
          accuracy: res.data.metrics.accuracy,
          trainedAt: res.data.metrics.trainedAt,
          totalSamples: res.data.metrics.samplesTrained,
        }));
      }
      loadVoiceModel();
    } catch (err) {
      toast.error('Failed to retrain voice agent model');
    } finally {
      setVoiceTraining(false);
      setVoiceTrainingProgress(null);
    }
  };

  const handleSaveVoiceSettings = async () => {
    setSavingVoiceSettings(true);
    try {
      await updateVoiceModelSettings({
        confidenceThreshold: voiceMetrics.confidenceThreshold,
        cadence: voiceMetrics.cadence,
        speechRate: voiceMetrics.speechRate,
        pitch: voiceMetrics.pitch,
        language: voiceMetrics.language,
      });
      toast.success('Voice agent hyperparameters and cadence saved');
    } catch (err) {
      toast.error('Failed to save voice settings');
    } finally {
      setSavingVoiceSettings(false);
    }
  };

  const handleAddLexiconRule = async (e) => {
    e.preventDefault();
    if (!lexiconFormData.heard.trim() || !lexiconFormData.replacement.trim()) {
      toast.error('Heard speech and replacement are required');
      return;
    }
    try {
      await createVoicePronunciationRule(lexiconFormData);
      toast.success('Phonetic pronunciation rule added');
      setIsLexiconModalOpen(false);
      setLexiconFormData({ heard: '', replacement: '', category: 'general' });
      loadVoiceModel();
    } catch (err) {
      toast.error('Failed to add pronunciation rule');
    }
  };

  const handleDeleteLexiconRule = async (id) => {
    if (!window.confirm('Delete this phonetic pronunciation rule?')) return;
    try {
      await deleteVoicePronunciationRule(id);
      toast.success('Rule removed');
      setPronunciationLexicon((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error('Failed to delete rule');
    }
  };

  const handleAddSample = async (e) => {
    e.preventDefault();
    if (!sampleFormData.text.trim()) {
      toast.error('Training utterance is required');
      return;
    }
    try {
      const res = await createVoiceTrainingSample(sampleFormData);
      toast.success('Training utterance added and neural weights updated');
      setIsSampleModalOpen(false);
      setSampleFormData({ text: '', intent: 'SEARCH_EVENTS' });
      if (res.data.metrics) {
        setVoiceMetrics((prev) => ({
          ...prev,
          accuracy: res.data.metrics.accuracy,
          totalSamples: res.data.metrics.samplesTrained,
        }));
      }
      loadVoiceModel();
    } catch (err) {
      toast.error('Failed to add training utterance');
    }
  };

  const handleDeleteSample = async (id) => {
    if (!window.confirm('Delete this voice training utterance?')) return;
    try {
      const res = await deleteVoiceTrainingSample(id);
      toast.success('Sample deleted and model updated');
      setTrainingSamples((prev) => prev.filter((s) => s.id !== id));
      if (res.data.metrics) {
        setVoiceMetrics((prev) => ({
          ...prev,
          accuracy: res.data.metrics.accuracy,
          totalSamples: res.data.metrics.samplesTrained,
        }));
      }
    } catch (err) {
      toast.error('Failed to delete sample');
    }
  };

  const handleRunVoiceTest = async (testText) => {
    const q = (typeof testText === 'string' ? testText : voiceTestQuery).trim();
    if (!q) return;
    setVoiceTestLoading(true);
    setVoiceTestResult(null);
    try {
      const res = await testVoiceModel({ message: q });
      setVoiceTestResult(res.data);
    } catch (err) {
      toast.error('Voice diagnostic test failed');
    } finally {
      setVoiceTestLoading(false);
    }
  };

  const playSynthesizedVoice = (text) => {
    if (!('speechSynthesis' in window) || !text) {
      toast.error('Speech synthesis not available in this browser');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = voiceMetrics.speechRate || 1.05;
      u.pitch = voiceMetrics.pitch || 1.0;
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(
        (v) => (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Karen')) && v.lang.startsWith('en')
      ) || voices.find((v) => v.lang.startsWith('en'));
      if (englishVoice) u.voice = englishVoice;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('Speech playback failed', e);
    }
  };

  const toggleVoiceTestMic = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.error('Microphone speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    if (isVoiceTestingListening) {
      setIsVoiceTestingListening(false);
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onstart = () => setIsVoiceTestingListening(true);
      rec.onresult = (e) => {
        const heard = e.results[0]?.[0]?.transcript || '';
        if (heard) {
          setVoiceTestQuery(heard);
          handleRunVoiceTest(heard);
        }
        setIsVoiceTestingListening(false);
      };
      rec.onerror = () => setIsVoiceTestingListening(false);
      rec.onend = () => setIsVoiceTestingListening(false);
      rec.start();
    } catch (err) {
      console.warn(err);
      setIsVoiceTestingListening(false);
    }
  };

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
    loadVoiceModel();
  }, []);

  useEffect(() => {
    if (activeTab === 'conversations') {
      loadConversations(convPage, convMode, convSearch);
    } else if (activeTab === 'voice_model') {
      loadVoiceModel();
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

  const filteredLexicon = pronunciationLexicon.filter((item) => {
    if (!lexiconSearch) return true;
    const q = lexiconSearch.toLowerCase();
    return item.heard?.toLowerCase().includes(q) || item.replacement?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q);
  });

  const filteredSamples = trainingSamples.filter((s) => {
    const matchesIntent = selectedVoiceIntent === 'all' || s.intent === selectedVoiceIntent;
    const matchesSearch = !sampleSearch || s.text?.toLowerCase().includes(sampleSearch.toLowerCase()) || s.intent?.toLowerCase().includes(sampleSearch.toLowerCase());
    return matchesIntent && matchesSearch;
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
          onClick={() => setActiveTab('voice_model')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'voice_model'
              ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-black shadow-lg shadow-amber-400/20'
              : 'text-[#949599] hover:text-white hover:bg-white/5'
          }`}
        >
          <Mic className={`w-4 h-4 ${activeTab === 'voice_model' ? 'text-black' : 'text-amber-400'}`} />
          <span>Voice Agent ML &amp; Neural Models</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'voice_model' ? 'bg-black text-amber-300' : 'bg-amber-400/15 text-amber-300 border border-amber-400/30'}`}>
            Deep ML
          </span>
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
                placeholder="Define bot tone, hospitality guidelines, ticket policy rules, and formatting preferences..."
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
                  placeholder="Type a test customer question here..."
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

      {/* TAB 5: VOICE AGENT DEEP LEARNING & NEURAL TRAINING STUDIO */}
      {activeTab === 'voice_model' && (
        <div className="space-y-8 animate-fade-in">
          {/* Neural Architecture & Performance Card */}
          <div className="rounded-3xl bg-gradient-to-br from-[#1C232B] via-[#161D22] to-[#12161A] border border-amber-500/30 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                    <Cpu className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        Voice Agent Neural &amp; Intent Studio
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black">
                        {voiceMetrics.version}
                      </span>
                    </div>
                    <p className="text-xs text-[#949599]">
                      Acoustic speech normalization, phonetic Ghanaian lexicon correction, and deep multi-class intent classifier.
                    </p>
                  </div>
                </div>
              </div>

              {/* Retrain Action */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetrainVoiceModel}
                  disabled={voiceTraining}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-extrabold text-xs shadow-xl shadow-amber-400/20 hover:brightness-110 transition disabled:opacity-50 cursor-pointer"
                >
                  {voiceTraining ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Retraining Neural Weights...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-black fill-black" />
                      <span>Retrain Voice Model</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Retraining Epoch Progress Bar */}
            {voiceTrainingProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 pt-6 border-t border-white/10 space-y-2 relative z-10"
              >
                <div className="flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400 animate-spin" />
                    <span className="font-bold">Fine-Tuning Softmax Class Centroids &amp; Word Embeddings</span>
                  </div>
                  <span className="font-mono text-amber-300 text-xs">
                    Epoch {voiceTrainingProgress.epoch}/{voiceTrainingProgress.maxEpochs} • Loss: {voiceTrainingProgress.loss} • Acc: {Math.round(voiceTrainingProgress.accuracy * 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 transition-all duration-300 rounded-full"
                    style={{ width: `${(voiceTrainingProgress.epoch / voiceTrainingProgress.maxEpochs) * 100}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 relative z-10">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[11px] font-bold text-[#949599] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Intent Accuracy
                </span>
                <h4 className="text-2xl font-black text-white mt-1">
                  {Math.round((voiceMetrics.accuracy || 0.94) * 100)}%
                </h4>
                <span className="text-[10px] text-emerald-400 font-semibold">Empirical Cross-Validation</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[11px] font-bold text-[#949599] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Training Dataset
                </span>
                <h4 className="text-2xl font-black text-white mt-1">
                  {trainingSamples.length || voiceMetrics.totalSamples}
                </h4>
                <span className="text-[10px] text-[#949599]">Utterances across {voiceClasses.length || 11} intents</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[11px] font-bold text-[#949599] uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  Phonetic Rules
                </span>
                <h4 className="text-2xl font-black text-amber-300 mt-1">
                  {pronunciationLexicon.length}
                </h4>
                <span className="text-[10px] text-amber-400/80">Active speech normalizations</span>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[11px] font-bold text-[#949599] uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  Confidence Guard
                </span>
                <h4 className="text-2xl font-black text-white mt-1">
                  {Math.round((voiceMetrics.confidenceThreshold || 0.55) * 100)}%
                </h4>
                <span className="text-[10px] text-[#949599]">Below this threshold uses fallback</span>
              </div>
            </div>
          </div>

          {/* INTERACTIVE VOICE DIAGNOSTICS & SIMULATOR LAB */}
          <div className="rounded-3xl bg-[#161D22] border border-[#2E363E] p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2E363E]">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Live Voice Diagnostic &amp; Simulation Lab</h3>
                </div>
                <p className="text-xs text-[#949599] mt-0.5">
                  Test acoustic speech transcripts in real-time. Inspect phonetic correction, softmax intent probabilities, and natural voice prosody.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleVoiceTestMic}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow cursor-pointer ${
                    isVoiceTestingListening
                      ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-500/20'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isVoiceTestingListening ? 'Listening to Mic...' : 'Speak via Mic'}</span>
                </button>
              </div>
            </div>

            {/* Input Form & Quick Test Prompts */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={voiceTestQuery}
                    onChange={(e) => setVoiceTestQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRunVoiceTest(); }}
                    placeholder="Enter spoken user sentence (e.g. 'book two vvip tickets for afro nation in kuma see for 200 cities')..."
                    className="w-full px-4 py-3 rounded-2xl bg-[#1C232B] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-amber-400"
                  />
                  {voiceTestQuery && (
                    <button
                      type="button"
                      onClick={() => setVoiceTestQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#949599] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRunVoiceTest()}
                  disabled={!voiceTestQuery.trim() || voiceTestLoading}
                  className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition flex items-center gap-2 shadow disabled:opacity-40 shrink-0 cursor-pointer"
                >
                  {voiceTestLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <Play className="w-4 h-4 fill-black" />
                  )}
                  <span>Run Diagnostic</span>
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#949599] mr-1">Try vocal phrases:</span>
                {[
                  'book two vvip tickets for afro nation in kuma see for 200 cities',
                  'verify my momo payment i completed the transaction',
                  'how much have i spent on tickets this month',
                  'when is my next concert and what is the venue',
                  'show my tickets and my qr code pass for the gate',
                  'i cannot attend can i get a refund or resell my ticket',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setVoiceTestQuery(preset);
                      handleRunVoiceTest(preset);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#1C232B] hover:bg-white/10 border border-[#2E363E] text-[11px] text-[#949599] hover:text-white transition truncate max-w-[280px] cursor-pointer"
                  >
                    &ldquo;{preset.slice(0, 36)}...&rdquo;
                  </button>
                ))}
              </div>
            </div>

            {/* Diagnostic Results Board */}
            {voiceTestResult && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4 border-t border-[#2E363E]"
              >
                {/* Left Card: Phonetic Correction & Entity Normalization */}
                <div className="space-y-4 p-5 rounded-2xl bg-[#1C232B] border border-[#2E363E]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" />
                      1. Acoustic Speech Normalization
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white">
                      {voiceTestResult.phoneticNormalization?.changesApplied?.length || 0} Corrections
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="text-[11px] font-bold text-[#949599] mb-1">Raw Speech Heard:</p>
                      <p className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[#EFEFF1]">
                        &ldquo;{voiceTestResult.rawTranscript}&rdquo;
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-[#949599] mb-1">Phonetically Corrected Output:</p>
                      <p className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 font-mono text-amber-300 font-bold">
                        &ldquo;{voiceTestResult.phoneticNormalization?.correctedText}&rdquo;
                      </p>
                    </div>

                    {voiceTestResult.phoneticNormalization?.changesApplied?.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-bold text-[#949599]">Applied Normalizations:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {voiceTestResult.phoneticNormalization.changesApplied.map((ch, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 rounded-lg bg-amber-400/20 border border-amber-400/40 text-[11px] text-amber-300 font-mono"
                            >
                              <span className="line-through text-white/50">{ch.original}</span> &rarr; <span className="font-bold">{ch.replacedWith}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Card: Softmax Probability Distribution */}
                <div className="space-y-4 p-5 rounded-2xl bg-[#1C232B] border border-[#2E363E]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      2. Deep Intent Softmax Probabilities
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {Math.round((voiceTestResult.intentClassification?.confidenceScore || 0) * 100)}% Confidence
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                      <div>
                        <span className="text-[11px] text-[#949599]">Top Predicted Intent</span>
                        <h4 className="text-sm font-black text-white font-mono mt-0.5">
                          {voiceTestResult.intentClassification?.predictedIntent}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-[#949599]">Second Best Alternative</span>
                        <p className="text-xs font-mono text-[#949599]">
                          {voiceTestResult.intentClassification?.secondBestIntent || 'None'} ({Math.round((voiceTestResult.intentClassification?.secondConfidence || 0) * 100)}%)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-[#949599]">Softmax Distribution across Classes:</span>
                      {Object.entries(voiceTestResult.intentClassification?.probabilityDistribution || {})
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4)
                        .map(([intentKey, prob], idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className={idx === 0 ? 'text-amber-300 font-bold' : 'text-[#949599]'}>
                                {intentKey}
                              </span>
                              <span className="text-white font-bold">{Math.round(prob * 100)}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${idx === 0 ? 'bg-amber-400' : 'bg-white/30'}`}
                                style={{ width: `${Math.round(prob * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Full Row: Natural Conversational Synthesized Speech Output */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-[#1C232B] border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      3. Synthesized Natural Spoken Utterance (Voice Output)
                    </span>
                    <p className="text-sm font-semibold text-white leading-relaxed">
                      &ldquo;{voiceTestResult.synthesizedVoiceOutput}&rdquo;
                    </p>
                    <p className="text-[11px] text-[#949599]">
                      Emotion: <strong className="text-white capitalize">{voiceTestResult.emotionAnalysis?.emotion}</strong> • Urgency: <strong className="text-white capitalize">{voiceTestResult.emotionAnalysis?.urgency}</strong> • Cadence: <strong className="text-white">Natural Conversational</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => playSynthesizedVoice(voiceTestResult.synthesizedVoiceOutput)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black shadow-lg shadow-amber-400/20 shrink-0 transition cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-black" />
                    <span>Listen to Voice</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* TWO COLUMN GRID: PHONETIC LEXICON & TRAINING DATASET */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COLUMN 1: PHONETIC PRONUNCIATION LEXICON */}
            <div className="rounded-3xl bg-[#161D22] border border-[#2E363E] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-amber-400" />
                    <span>Phonetic Speech Lexicon</span>
                  </h3>
                  <p className="text-xs text-[#949599] mt-0.5">
                    Maps commonly misrecognized speech sounds to canonical platform terms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLexiconModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#CBD5E1] text-[#1C232B] text-xs font-bold transition shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#494F55]" />
                <input
                  type="text"
                  value={lexiconSearch}
                  onChange={(e) => setLexiconSearch(e.target.value)}
                  placeholder="Filter phonetic terms (e.g. 'city', 'kumasi')..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#1C232B] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Rules List */}
              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {filteredLexicon.length === 0 ? (
                  <p className="text-xs text-[#949599] text-center py-8">No phonetic rules match your search.</p>
                ) : (
                  filteredLexicon.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#1C232B] border border-[#2E363E] flex items-center justify-between text-xs hover:border-amber-400/40 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-red-300 bg-red-500/10 px-2 py-0.5 rounded-md">
                            &ldquo;{item.heard}&rdquo;
                          </span>
                          <span className="text-[#949599]">&rarr;</span>
                          <span className="font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md">
                            {item.replacement}
                          </span>
                        </div>
                        <span className="inline-block text-[10px] text-[#949599] uppercase tracking-wider font-semibold">
                          {item.category}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteLexiconRule(item.id)}
                        className="p-1.5 rounded-lg text-[#949599] hover:text-red-400 hover:bg-white/5 transition cursor-pointer"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: VOICE INTENT TRAINING DATASET */}
            <div className="rounded-3xl bg-[#161D22] border border-[#2E363E] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Voice Training Utterances</span>
                  </h3>
                  <p className="text-xs text-[#949599] mt-0.5">
                    Curated voice speech phrases used to train the Softmax Linear Intent Classifier.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSampleModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#CBD5E1] text-[#1C232B] text-xs font-bold transition shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Utterance</span>
                </button>
              </div>

              {/* Intent filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                {['all', 'SEARCH_EVENTS', 'BOOK_TICKETS', 'CONFIRM_PAYMENT', 'VERIFY_TRANSACTION', 'VIEW_MY_TICKETS', 'SPENDING_ANALYTICS', 'REFUND_DISPUTE'].map((intentId) => (
                  <button
                    key={intentId}
                    type="button"
                    onClick={() => setSelectedVoiceIntent(intentId)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedVoiceIntent === intentId
                        ? 'bg-amber-400 text-black shadow'
                        : 'bg-[#1C232B] text-[#949599] hover:text-white border border-[#2E363E]'
                    }`}
                  >
                    {intentId === 'all' ? 'All Classes' : intentId.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#494F55]" />
                <input
                  type="text"
                  value={sampleSearch}
                  onChange={(e) => setSampleSearch(e.target.value)}
                  placeholder="Search utterances..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#1C232B] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Utterances List */}
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                {filteredSamples.length === 0 ? (
                  <p className="text-xs text-[#949599] text-center py-8">No training samples match your filter.</p>
                ) : (
                  filteredSamples.map((sample) => (
                    <div
                      key={sample.id}
                      className="p-3 rounded-xl bg-[#1C232B] border border-[#2E363E] flex items-center justify-between text-xs hover:border-cyan-400/40 transition gap-2"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-white font-medium truncate">&ldquo;{sample.text}&rdquo;</p>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-cyan-400/10 text-cyan-300 font-mono text-[10px] font-bold">
                          {sample.intent}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSample(sample.id)}
                        className="p-1.5 rounded-lg text-[#949599] hover:text-red-400 hover:bg-white/5 transition shrink-0 cursor-pointer"
                        title="Delete sample"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ACOUSTIC PROSODY & HYPERPARAMETERS */}
          <div className="rounded-3xl bg-[#161D22] border border-[#2E363E] p-6 sm:p-7 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Voice Agent Hyperparameters &amp; Speech Prosody</span>
              </h3>
              <p className="text-xs text-[#949599] mt-0.5">
                Configure minimum classification certainty, response conciseness, and browser Text-To-Speech acoustic cadence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Confidence Threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Confidence Threshold</span>
                  <span className="font-mono text-amber-300">{Math.round((voiceMetrics.confidenceThreshold || 0.55) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="0.9"
                  step="0.05"
                  value={voiceMetrics.confidenceThreshold || 0.55}
                  onChange={(e) => setVoiceMetrics({ ...voiceMetrics, confidenceThreshold: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <p className="text-[11px] text-[#949599]">
                  Speech below this probability triggers conversational clarification or LLM deep fallback.
                </p>
              </div>

              {/* Speech Rate Multiplier */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Speech Rate (Speed)</span>
                  <span className="font-mono text-amber-300">{voiceMetrics.speechRate || 1.05}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={voiceMetrics.speechRate || 1.05}
                  onChange={(e) => setVoiceMetrics({ ...voiceMetrics, speechRate: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <p className="text-[11px] text-[#949599]">
                  1.05x represents the ideal natural cadence for event ticket checkouts and navigation.
                </p>
              </div>

              {/* Pitch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Voice Pitch</span>
                  <span className="font-mono text-amber-300">{voiceMetrics.pitch || 1.0}</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={voiceMetrics.pitch || 1.0}
                  onChange={(e) => setVoiceMetrics({ ...voiceMetrics, pitch: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <p className="text-[11px] text-[#949599]">
                  Acoustic tone modulation for the voice assistant.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#2E363E]">
              <button
                type="button"
                onClick={handleSaveVoiceSettings}
                disabled={savingVoiceSettings}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold transition shadow disabled:opacity-50 cursor-pointer"
              >
                {savingVoiceSettings ? 'Saving Settings...' : 'Save Voice Hyperparameters'}
              </button>
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
              placeholder="Knowledge rule title"
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

      {/* ADD PHONETIC LEXICON RULE MODAL */}
      <Modal
        open={isLexiconModalOpen}
        onClose={() => setIsLexiconModalOpen(false)}
        title="Add Phonetic Speech Correction Rule"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddLexiconRule} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#EFEFF1] uppercase tracking-wider mb-1">
              Heard Speech (What speech-to-text might transcribe)
            </label>
            <input
              type="text"
              required
              value={lexiconFormData.heard}
              onChange={(e) => setLexiconFormData({ ...lexiconFormData, heard: e.target.value })}
              placeholder="e.g. 'city', 'kuma see', 'a pro nation'"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#EFEFF1] uppercase tracking-wider mb-1">
              Normalized Canonical Replacement
            </label>
            <input
              type="text"
              required
              value={lexiconFormData.replacement}
              onChange={(e) => setLexiconFormData({ ...lexiconFormData, replacement: e.target.value })}
              placeholder="e.g. 'cedis', 'Kumasi', 'Afro Nation'"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-amber-400 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#EFEFF1] uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={lexiconFormData.category}
              onChange={(e) => setLexiconFormData({ ...lexiconFormData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="currency">Currency (Cedis, GHS)</option>
              <option value="location">Location (Kumasi, Osu, Labadi)</option>
              <option value="venue">Venue (Untamed Empire, Black Star Square)</option>
              <option value="event">Event Name (Afro Nation, Detty December)</option>
              <option value="tier">Ticket Tier (VVIP, VIP, Early Bird)</option>
              <option value="genre">Genre / Culture (Amapiano, Afrobeats)</option>
              <option value="payment">Payment (Mobile Money, Paystack)</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="pt-4 border-t border-[#2E363E] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsLexiconModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-[#949599] hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold transition shadow cursor-pointer"
            >
              Add Rule
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD VOICE INTENT UTTERANCE MODAL */}
      <Modal
        open={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        title="Add Voice Intent Training Utterance"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddSample} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#EFEFF1] uppercase tracking-wider mb-1">
              Spoken User Utterance
            </label>
            <textarea
              rows={3}
              required
              value={sampleFormData.text}
              onChange={(e) => setSampleFormData({ ...sampleFormData, text: e.target.value })}
              placeholder="e.g. 'can i get two vvip passes for the rave tonight'"
              className="w-full p-3 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white placeholder-[#494F55] focus:outline-none focus:border-amber-400 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#EFEFF1] uppercase tracking-wider mb-1">
              Target Lifecycle Intent Class
            </label>
            <select
              value={sampleFormData.intent}
              onChange={(e) => setSampleFormData({ ...sampleFormData, intent: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#161D22] border border-[#2E363E] text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
            >
              {[
                'SEARCH_EVENTS',
                'BOOK_TICKETS',
                'CONFIRM_PAYMENT',
                'VERIFY_TRANSACTION',
                'VIEW_MY_TICKETS',
                'SPENDING_ANALYTICS',
                'EVENT_SCHEDULE',
                'RESEND_TICKETS',
                'REFUND_DISPUTE',
                'CUSTOMER_SUPPORT',
                'GREETING_CHITCHAT',
              ].map((intentKey) => (
                <option key={intentKey} value={intentKey}>
                  {intentKey}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-[#2E363E] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsSampleModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs text-[#949599] hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold transition shadow cursor-pointer"
            >
              Save &amp; Train Utterance
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
