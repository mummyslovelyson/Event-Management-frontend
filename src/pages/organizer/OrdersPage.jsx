import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, ShoppingBag, DollarSign, Clock, RotateCcw,
  ChevronDown, ChevronUp, CreditCard, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrders } from '@/api/orders';
import { getDashboard } from '@/api/organizer';
import { useCurrency } from '@/context/CurrencyContext';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import Pagination from '@/components/common/Pagination';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import StatCard from '@/components/common/StatCard';
import PageHeader from '@/components/common/PageHeader';

const statusVariant = (s) => {
  const map = { completed: 'success', paid: 'success', pending: 'pending', failed: 'error', refunded: 'warning', cancelled: 'neutral' };
  return map[(s || '').toLowerCase()] || 'neutral';
};

const STATUS_TABS = ['All', 'Completed', 'Pending', 'Failed', 'Refunded'];

export default function OrdersPage() {
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusTab !== 'All') params.status = statusTab.toLowerCase();
      if (search) params.search = search;
      const res = await getOrders(params);
      const payload = res.data;
      setOrders(Array.isArray(payload) ? payload : payload.orders || payload.data || []);
      setTotalPages(payload.totalPages || payload.pages || Math.ceil((payload.total || 0) / 10) || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusTab, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [statusTab, search]);

  useEffect(() => {
    getDashboard().then((res) => setSummary(res.data?.metrics || {})).catch(() => {});
  }, []);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === orders.length) setSelected(new Set());
    else setSelected(new Set(orders.map((o) => o.id)));
  };

  const exportCSV = (rows) => {
    const list = rows || orders;
    if (!list.length) { toast.error('No orders to export'); return; }
    const headers = ['Order ID', 'Customer', 'Email', 'Event', 'Ticket Type', 'Qty', 'Amount', 'Payment Method', 'Status', 'Date'];
    const lines = list.map((o) => [
      o.reference || o.id, o.customerName || o.user?.name || '', o.customerEmail || o.user?.email || '',
      o.eventTitle || o.event?.title || '', o.ticketType || o.ticket?.type || '', o.quantity || o.ticketCount || 0,
      o.amount || o.total || '', o.paymentMethod || '', o.status || '',
      o.createdAt ? new Date(o.createdAt).toISOString() : '',
    ]);
    const csv = [headers, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${list.length} orders`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShoppingBag}
        accent="blue"
        title="Orders"
        subtitle="Track and manage all ticket orders."
        actions={
          <>
            {selected.size > 0 && (
              <button onClick={() => exportCSV(orders.filter((o) => selected.has(o.id)))} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 transition">
                <Download className="w-4 h-4" /> Export Selected ({selected.size})
              </button>
            )}
            <button onClick={() => exportCSV()} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#D4AF37] text-[#1E252B] text-sm font-semibold hover:bg-[#c4a030] transition">
              <Download className="w-4 h-4" /> Export All
            </button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Total Orders" value={summary.totalOrders ?? 0} />
        <StatCard icon={DollarSign} label="Revenue" value={format(summary.totalRevenue ?? 0)} accent />
        <StatCard icon={Clock} label="Pending Payments" value={summary.pendingOrders ?? 0} />
        <StatCard icon={RotateCcw} label="Refunds" value={summary.refunds ?? 0} />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#494F55]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order ID, customer, email..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#171A1D] border border-[#494F55]/40 text-sm text-[#EDF0F1] placeholder-[#494F55] focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40 transition" />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#262B2F]">
        {STATUS_TABS.map((t) => (
          <button key={t} onClick={() => setStatusTab(t)} className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${statusTab === t ? 'text-[#D4AF37]' : 'text-[#8A9196] hover:text-[#EDF0F1]'}`}>
            {t}
            {statusTab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#D4AF37]" />}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner label="Loading orders..." className="py-20" />
      ) : orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders found" description="Orders will appear here once customers start purchasing tickets." className="py-16" />
      ) : (
        <div className="rounded-xl bg-[#171A1D] border border-[#262B2F] overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-xs font-medium text-[#6B7278] border-b border-[#262B2F]">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.size === orders.length && orders.length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-[#D4AF37] cursor-pointer" />
                </th>
                <th className="px-4 py-3 font-medium">Order ID</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Ticket Type</th>
                <th className="px-4 py-3 font-medium text-center">Qty</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262B2F]/70">
              {orders.map((o) => {
                const isOpen = expandedId === o.id;
                return (
                  <>
                    <tr key={o.id} className="hover:bg-[#1D2124] transition-colors cursor-pointer" onClick={() => setDetailOrder(o)}>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} className="w-4 h-4 rounded accent-[#D4AF37] cursor-pointer" />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#EDF0F1]">#{o.reference || o.id?.slice(-6)}</td>
                      <td className="px-4 py-3">
                        <p className="text-[#EDF0F1] font-medium">{o.customerName || o.user?.name || '—'}</p>
                        <p className="text-xs text-[#8A9196]">{o.customerEmail || o.user?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-[#8A9196] max-w-[160px] truncate">{o.eventTitle || o.event?.title || '—'}</td>
                      <td className="px-4 py-3 text-[#8A9196]">{o.ticketType || o.ticket?.type || '—'}</td>
                      <td className="px-4 py-3 text-center text-[#8A9196]">{o.quantity || o.ticketCount || 0}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#EDF0F1]">{format(o.amount || o.total)}</td>
                      <td className="px-4 py-3 text-[#8A9196] capitalize">{o.paymentMethod || '—'}</td>
                      <td className="px-4 py-3"><Badge variant={statusVariant(o.status)} size="sm">{o.status}</Badge></td>
                      <td className="px-4 py-3 text-xs text-[#8A9196]">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && orders.length > 0 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}

      {/* Detail Modal */}
      <Modal open={!!detailOrder} onClose={() => setDetailOrder(null)} title={`Order #${detailOrder?.reference || detailOrder?.id?.slice(-6)}`} size="lg">
        {detailOrder && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <Badge variant={statusVariant(detailOrder.status)} dot>{detailOrder.status}</Badge>
              <span className="text-xs text-[#8A9196]">{detailOrder.createdAt ? new Date(detailOrder.createdAt).toLocaleString('en-GB') : '—'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-[#1E252B] border border-[#262B2F] p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-[#8A9196]">Customer</p>
                <p className="text-sm font-medium text-[#EDF0F1]">{detailOrder.customerName || detailOrder.user?.name || '—'}</p>
                <p className="text-sm text-[#8A9196]">{detailOrder.customerEmail || detailOrder.user?.email || ''}</p>
                <p className="text-sm text-[#8A9196]">{detailOrder.customerPhone || ''}</p>
              </div>
              <div className="rounded-lg bg-[#1E252B] border border-[#262B2F] p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-[#8A9196]">Payment</p>
                <p className="text-sm text-[#EDF0F1] flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#8A9196]" /> {detailOrder.paymentMethod || '—'}</p>
                <p className="text-sm text-[#8A9196]">Transaction: {detailOrder.transactionId || '—'}</p>
              </div>
            </div>
            <div className="rounded-lg bg-[#1E252B] border border-[#262B2F] p-4">
              <p className="text-xs uppercase tracking-wider text-[#8A9196] mb-3">Items</p>
              <div className="space-y-2">
                {(detailOrder.items || [{ name: detailOrder.ticketType || detailOrder.eventTitle, quantity: detailOrder.quantity, price: detailOrder.amount }]).map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-[#EDF0F1]">{it.quantity || 1}× {it.name || it.ticketType || 'Ticket'}</span>
                    <span className="text-[#8A9196]">{format(it.price || (it.quantity || 1) * (it.unitPrice || 0))}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#262B2F] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#EDF0F1]">Total</span>
                <span className="text-lg font-bold text-[#D4AF37]">{format(detailOrder.amount || detailOrder.total)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
