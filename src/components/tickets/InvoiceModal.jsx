import { motion } from 'framer-motion';
import {
  Printer, Download, ShieldCheck, CheckCircle2,
  Calendar, MapPin, Ticket, Building2, User, Mail, X,
} from 'lucide-react';
import Modal from '@/components/common/Modal';
import { formatCurrency } from '@/utils/formatters';

export default function InvoiceModal({
  open,
  onClose,
  order,
  ticket,
}) {
  if (!open) return null;

  const invoiceNumber = order?.invoiceNumber || order?.invoice_number || `INV-${(order?.id || ticket?.id || Date.now()).toString().slice(-6)}`;
  const orderDate = order?.createdAt || order?.created_at || ticket?.purchaseDate || new Date().toISOString();
  const formattedDate = new Date(orderDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const eventTitle = order?.eventTitle || ticket?.eventTitle || 'Tribes & Cliqs Event';
  const eventDate = ticket?.eventDate ? new Date(ticket.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const eventVenue = ticket?.eventVenue || 'Venue Announced Soon';
  const attendeeName = order?.customerName || order?.user?.name || ticket?.attendeeName || 'Event Attendee';
  const attendeeEmail = order?.customerEmail || order?.user?.email || ticket?.attendeeEmail || 'attendee@tribesandcliqs.com';
  const ticketTierName = ticket?.ticketTypeName || order?.ticketTypeName || 'General Admission';
  const quantity = order?.quantity || 1;
  const unitPrice = Number(ticket?.price || order?.unitPrice || order?.total || 0) / quantity;
  const totalAmount = Number(order?.totalAmount || order?.total || ticket?.price || 0);
  const discount = Number(order?.discount || 0);
  const paymentMethod = order?.paymentMethod || 'Paystack (Card / MoMo)';
  const paymentRef = order?.paymentRef || order?.reference || `TC-PAY-${(order?.id || ticket?.id || 1000).toString().padStart(6, '0')}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Official Tax Invoice & Order Receipt"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-xs text-[#949599] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified Payment & Ticket Fulfillment
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#494F55]/40 text-xs font-semibold text-[#949599] hover:text-white transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
          </div>
        </div>
      }
    >
      <div id="printable-invoice" className="space-y-6 text-[#EFEFF1] p-2 sm:p-4">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#262B2F]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">TRIBES & CLIQS</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                PAID IN FULL ✓
              </span>
            </div>
            <p className="text-xs text-[#949599] mt-1">Official Event Ticketing & Experience Receipt</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase font-bold tracking-wider text-[#949599]">Invoice No.</p>
            <p className="text-base font-black text-white font-mono">{invoiceNumber}</p>
            <p className="text-xs text-[#494F55] mt-0.5">{formattedDate}</p>
          </div>
        </div>

        {/* Billed To & Event Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-[#171C21] border border-[#262B2F]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#949599] mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-white" /> Billed To (Attendee)
            </p>
            <p className="text-sm font-bold text-white">{attendeeName}</p>
            <p className="text-xs text-[#949599] mt-0.5">{attendeeEmail}</p>
            <p className="text-xs text-[#494F55] mt-1 font-mono">Ref: {paymentRef}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#949599] mb-2 flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-white" /> Event Details
            </p>
            <p className="text-sm font-bold text-white line-clamp-1">{eventTitle}</p>
            {eventDate && <p className="text-xs text-[#949599] mt-0.5">{eventDate}</p>}
            <p className="text-xs text-[#949599] mt-0.5 line-clamp-1">{eventVenue}</p>
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="overflow-hidden rounded-xl border border-[#262B2F]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1C232B] text-[#949599] uppercase font-bold tracking-wider border-b border-[#262B2F]">
              <tr>
                <th className="p-3.5">Description / Ticket Tier</th>
                <th className="p-3.5 text-center">Qty</th>
                <th className="p-3.5 text-right">Price</th>
                <th className="p-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262B2F] bg-[#14181C]">
              <tr>
                <td className="p-3.5">
                  <p className="font-bold text-white">{ticketTierName}</p>
                  <p className="text-[11px] text-[#949599]">Admission Pass for {eventTitle}</p>
                </td>
                <td className="p-3.5 text-center font-semibold">{quantity}</td>
                <td className="p-3.5 text-right font-mono">{formatCurrency(unitPrice)}</td>
                <td className="p-3.5 text-right font-mono font-bold text-white">
                  {formatCurrency(unitPrice * quantity)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Totals */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
          <div className="text-xs text-[#949599] space-y-1">
            <p><strong>Payment Gateway:</strong> {paymentMethod}</p>
            <p><strong>Transaction Ref:</strong> <span className="font-mono text-white">{paymentRef}</span></p>
            <p><strong>Status:</strong> <span className="text-emerald-400 font-semibold">Completed & Verified</span></p>
          </div>

          <div className="w-full sm:w-64 space-y-2 p-3.5 rounded-xl bg-[#171C21] border border-[#262B2F] text-xs">
            <div className="flex justify-between text-[#949599]">
              <span>Subtotal:</span>
              <span className="font-mono text-white">{formatCurrency(unitPrice * quantity)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Promo Discount:</span>
                <span className="font-mono">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#949599]">
              <span>Tax & Processing:</span>
              <span className="font-mono text-white">₵0.00 (Included)</span>
            </div>
            <div className="pt-2 border-t border-[#262B2F] flex justify-between text-sm font-bold">
              <span className="text-white">Total Paid:</span>
              <span className="text-base font-black text-white font-mono">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
