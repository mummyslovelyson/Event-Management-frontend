import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer, Download, CheckCircle2, Calendar, MapPin, Ticket as TicketIcon,
  CreditCard, ShieldCheck, Mail, Phone, User, Receipt, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/common/Modal';
import Badge from '@/components/common/Badge';
import { useCurrency } from '@/context/CurrencyContext';
import { getOrderInvoice } from '@/api/orders';

export default function ReceiptModal({ open, onClose, order }) {
  const { format } = useCurrency();
  const printableRef = useRef(null);

  if (!order) return null;

  const event = order.event || {};
  const eventTitle = event.title || order.eventTitle || order.eventName || 'Event';
  const eventDate = event.startDate || event.start_date || order.eventDate || order.startDate;
  const eventVenue = event.venue || order.venue || 'Venue TBA';
  const customerName = order.customerName || order.user?.name || order.userName || 'Attendee';
  const customerEmail = order.customerEmail || order.user?.email || order.userEmail || '—';
  const customerPhone = order.customerPhone || order.user?.phone || order.phone || '—';
  const orderRef = order.reference || order.orderId || String(order.id ?? '').slice(-8).toUpperCase();
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—';
  const totalAmount = Number(order.totalAmount ?? order.total ?? order.amount ?? 0);
  const discountAmount = Number(order.discountAmount ?? order.discount ?? 0);
  const subtotal = totalAmount + discountAmount;
  const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [
    {
      name: order.ticketType || order.ticket_type_name || 'General Admission',
      quantity: order.quantity || order.ticketCount || 1,
      price: order.ticketPrice || (totalAmount / (order.quantity || 1)),
    },
  ];

  const qrData = JSON.stringify({
    ref: orderRef,
    orderId: order.id,
    event: eventTitle,
    amount: totalAmount,
    status: order.paymentStatus || order.status || 'paid',
  });

  const handlePrint = () => {
    const printContent = printableRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - #${orderRef} - Tribes & Cliqs</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 20mm; }
            * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background: #ffffff; color: #111827; margin: 0; padding: 24px; font-size: 13px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 24px; }
            .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #111827; }
            .brand span { color: #4F46E5; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #DEF7EC; color: #03543F; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
            .card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; }
            .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6B7280; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 24px 0; }
            th { text-align: left; padding: 10px 12px; background: #F3F4F6; font-size: 11px; text-transform: uppercase; color: #4B5563; font-weight: 600; border-bottom: 1px solid #E5E7EB; }
            td { padding: 12px; border-bottom: 1px solid #E5E7EB; }
            .text-right { text-align: right; }
            .totals { margin-left: auto; width: 280px; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
            .totals-row.grand { border-top: 2px solid #111827; font-size: 16px; font-weight: 800; padding-top: 10px; margin-top: 6px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 11px; }
            .qr-box { text-align: center; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">TRIBES &amp; CLIQS</div>
              <p style="color: #6B7280; margin: 4px 0 0 0; font-size: 12px;">Official Transaction Receipt &amp; Proof of Purchase</p>
            </div>
            <div style="text-align: right;">
              <span class="badge">PAID &amp; CONFIRMED</span>
              <p style="font-family: monospace; font-size: 13px; font-weight: 700; margin: 6px 0 0 0;">#${orderRef}</p>
              <p style="color: #6B7280; font-size: 11px; margin: 2px 0 0 0;">${orderDate}</p>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Billed To</div>
              <p style="font-weight: 700; margin: 0 0 4px 0;">${customerName}</p>
              <p style="color: #4B5563; margin: 0 0 2px 0;">${customerEmail}</p>
              <p style="color: #4B5563; margin: 0;">${customerPhone}</p>
            </div>
            <div class="card">
              <div class="card-title">Event Information</div>
              <p style="font-weight: 700; margin: 0 0 4px 0;">${eventTitle}</p>
              <p style="color: #4B5563; margin: 0 0 2px 0;">📅 ${eventDate ? new Date(eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA'}</p>
              <p style="color: #4B5563; margin: 0;">📍 ${eventVenue}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item / Ticket Tier</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Price</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it) => `
                <tr>
                  <td><strong>${it.ticketType || it.name || 'Ticket'}</strong></td>
                  <td class="text-right">${it.quantity || 1}</td>
                  <td class="text-right">${format(Number(it.price || 0))}</td>
                  <td class="text-right font-medium">${format(Number(it.price || 0) * (it.quantity || 1))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span style="color: #6B7280;">Subtotal</span>
              <span>${format(subtotal)}</span>
            </div>
            ${discountAmount > 0 ? `
              <div class="totals-row" style="color: #059669;">
                <span>Discount Applied</span>
                <span>-${format(discountAmount)}</span>
              </div>
            ` : ''}
            <div class="totals-row grand">
              <span>Total Paid</span>
              <span>${format(totalAmount)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for booking with Tribes &amp; Cliqs. Please show this receipt or your ticket QR code at the event gate for entry.</p>
            <p>For questions or support, contact support@tribesandcliqs.com</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await getOrderInvoice(order.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${orderRef}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Receipt PDF downloaded');
    } catch {
      // Fallback: trigger print dialog to Save as PDF
      handlePrint();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Official Receipt"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-xs font-medium text-[#949599] hover:text-[#EFEFF1] transition"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#242B32] border border-[#494F55]/50 text-sm font-semibold text-[#EFEFF1] hover:bg-[#2C343D] hover:border-white/40 transition shadow-sm"
            >
              <Printer className="w-4 h-4 text-[#949599]" /> Print Receipt
            </button>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white text-[#1C232B] text-sm font-semibold hover:bg-[#CBD5E1] transition shadow-md"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>
      }
    >
      <div ref={printableRef} className="space-y-5">
        {/* Receipt Header Card */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-[#1C232B] to-[#171A1D] border border-[#262B2F]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#262B2F]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-white">Tribes &amp; Cliqs</span>
                <Badge variant="success" size="sm" dot>Payment Completed</Badge>
              </div>
              <h2 className="text-lg font-bold text-[#EFEFF1] mt-1">Payment Receipt</h2>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-[#949599]">Order Reference</p>
              <p className="font-mono font-bold text-sm text-[#EFEFF1]">#{orderRef}</p>
              <p className="text-[11px] text-[#6B7278]">{orderDate}</p>
            </div>
          </div>

          {/* Event & Customer Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#949599]">Customer Details</p>
              <p className="font-semibold text-sm text-[#EFEFF1] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#6B7278]" /> {customerName}
              </p>
              <p className="text-[#949599] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#6B7278]" /> {customerEmail}
              </p>
              {customerPhone !== '—' && (
                <p className="text-[#949599] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#6B7278]" /> {customerPhone}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#949599]">Event Details</p>
              <p className="font-semibold text-sm text-[#EFEFF1] truncate">{eventTitle}</p>
              <p className="text-[#949599] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#6B7278] shrink-0" />
                {eventDate ? new Date(eventDate).toLocaleDateString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                }) : 'TBA'}
              </p>
              <p className="text-[#949599] flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#6B7278] shrink-0" /> {eventVenue}
              </p>
            </div>
          </div>
        </div>

        {/* Itemized Breakdown Table */}
        <div className="rounded-xl bg-[#1C232B]/60 border border-[#262B2F] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#171A1D] text-[#949599] border-b border-[#262B2F]">
                <th className="text-left px-4 py-3 font-semibold uppercase">Ticket Tier / Item</th>
                <th className="text-center px-4 py-3 font-semibold uppercase">Qty</th>
                <th className="text-right px-4 py-3 font-semibold uppercase">Unit Price</th>
                <th className="text-right px-4 py-3 font-semibold uppercase">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262B2F]">
              {items.map((it, idx) => (
                <tr key={idx} className="hover:bg-[#1D2124]/40">
                  <td className="px-4 py-3 font-medium text-[#EFEFF1]">
                    {it.ticketType || it.name || 'General Admission'}
                  </td>
                  <td className="px-4 py-3 text-center text-[#949599]">{it.quantity || 1}</td>
                  <td className="px-4 py-3 text-right text-[#949599]">{format(Number(it.price || 0))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#EFEFF1]">
                    {format(Number(it.price || 0) * (it.quantity || 1))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary Section */}
          <div className="p-4 bg-[#171A1D]/80 border-t border-[#262B2F] flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* QR Code Verification */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                <QRCodeSVG value={qrData} size={52} level="M" />
              </div>
              <div className="text-[11px] text-[#949599]">
                <p className="font-semibold text-[#EFEFF1]">Digital Verification QR</p>
                <p className="text-[#6B7278]">Scan at event entry</p>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="w-full sm:w-60 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#949599]">
                <span>Subtotal</span>
                <span>{format(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span>-{format(discountAmount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#262B2F] flex justify-between items-baseline font-bold text-sm text-[#EFEFF1]">
                <span>Total Paid</span>
                <span className="text-base text-white">{format(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Support Footer Notice */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#1D2124] border border-[#262B2F] text-[11px] text-[#949599]">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>This is an official receipt issued by Tribes &amp; Cliqs. All payments are encrypted and secured.</span>
        </div>
      </div>
    </Modal>
  );
}
