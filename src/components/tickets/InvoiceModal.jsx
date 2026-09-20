import { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer, Download, ShieldCheck, CheckCircle2,
  Calendar, MapPin, Ticket, User, Mail, Phone, QrCode, Sparkles, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/common/Modal';
import { useCurrency } from '@/context/CurrencyContext';
import { getOrder, getOrderInvoice } from '@/api/orders';

export default function InvoiceModal({
  open,
  onClose,
  order,
  ticket,
}) {
  const { format } = useCurrency();
  const printableRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [fetchedOrder, setFetchedOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const orderId = order?.id || ticket?.orderId || ticket?.order_id || null;

  useEffect(() => {
    let active = true;
    if (open && orderId && (!order?.items || order.items.length === 0)) {
      setLoadingOrder(true);
      getOrder(orderId)
        .then((res) => {
          if (active && res.data?.order) {
            setFetchedOrder(res.data.order);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoadingOrder(false);
        });
    } else {
      setFetchedOrder(null);
    }
    return () => {
      active = false;
    };
  }, [open, orderId, order?.items]);

  if (!open) return null;

  const activeOrder = fetchedOrder || order;

  const invoiceNumber = activeOrder?.invoiceNumber || activeOrder?.invoice_number || ticket?.invoiceNumber || (orderId ? `INV-${new Date().getFullYear()}-${String(orderId).padStart(6, '0')}` : `INV-${(ticket?.id || Date.now()).toString().slice(-6)}`);
  const paymentRef = activeOrder?.paymentRef || activeOrder?.reference || activeOrder?.payment_reference || ticket?.paymentRef || ticket?.ticketNumber || (ticket?.id ? `TC-TKT-${ticket.id}` : `TC-PAY-${Date.now().toString().slice(-6)}`);
  const paymentMethod = activeOrder?.paymentMethod || activeOrder?.payment_method || ticket?.paymentMethod || 'Paystack (Card / MoMo)';
  const paymentStatus = (activeOrder?.paymentStatus || activeOrder?.status || ticket?.paymentStatus || 'paid').toLowerCase();

  const orderDate = activeOrder?.createdAt || activeOrder?.created_at || ticket?.orderCreatedAt || ticket?.purchaseDate || ticket?.created_at || new Date().toISOString();
  const formattedDate = new Date(orderDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const eventTitle = activeOrder?.eventTitle || activeOrder?.event_title || activeOrder?.event?.title || ticket?.event?.title || ticket?.eventTitle || 'Tribes & Cliqs Event';
  const rawEventDate = activeOrder?.eventDate || activeOrder?.event_date || activeOrder?.event?.startDate || ticket?.event?.startDate || ticket?.eventDate || ticket?.startDate;
  const eventDate = rawEventDate ? new Date(rawEventDate).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  }) : '';
  const eventVenue = activeOrder?.eventVenue || activeOrder?.event_venue || activeOrder?.event?.venue || ticket?.event?.venue || ticket?.eventVenue || ticket?.venue || 'Venue Announced Soon';

  const attendeeName = activeOrder?.customerName || activeOrder?.buyer_name || activeOrder?.user?.name || ticket?.attendeeName || 'Event Attendee';
  const attendeeEmail = activeOrder?.customerEmail || activeOrder?.buyer_email || activeOrder?.user?.email || ticket?.attendeeEmail || '—';
  const attendeePhone = activeOrder?.customerPhone || activeOrder?.buyer_phone || activeOrder?.user?.phone || ticket?.attendeePhone || '';

  // Extract purchased items with accurate pricing
  const rawItems = Array.isArray(activeOrder?.items) && activeOrder.items.length > 0 ? activeOrder.items : null;
  const items = rawItems
    ? rawItems.map((it) => {
        const qty = Number(it.quantity || 1);
        const unit = Number(it.unit_price ?? it.price ?? it.ticket_price ?? 0);
        const sub = it.subtotal !== undefined && it.subtotal !== null ? Number(it.subtotal) : unit * qty;
        return {
          name: it.ticket_type_name || it.ticketType || it.name || 'Event Pass',
          quantity: qty,
          unitPrice: unit,
          subtotal: sub,
        };
      })
    : [
        {
          name: ticket?.ticketType || ticket?.ticketTypeName || activeOrder?.ticketTypeName || 'Admission Pass',
          quantity: activeOrder?.quantity || 1,
          unitPrice: Number(ticket?.unitPrice ?? ticket?.price ?? activeOrder?.unitPrice ?? activeOrder?.total ?? 0),
          subtotal: Number(ticket?.unitPrice ?? ticket?.price ?? activeOrder?.unitPrice ?? activeOrder?.total ?? 0) * (activeOrder?.quantity || 1),
        },
      ];

  const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0);
  const discount = Number(activeOrder?.discount || activeOrder?.discountAmount || activeOrder?.discount_amount || ticket?.orderDiscount || 0);
  const couponCode = activeOrder?.couponCode || activeOrder?.coupon_code || null;
  const totalAmount = Number(activeOrder?.totalAmount ?? activeOrder?.total_amount ?? activeOrder?.total ?? (ticket?.orderTotal !== null && ticket?.orderTotal !== undefined ? ticket.orderTotal : Math.max(0, subtotal - discount)));

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://tribesandcliqs.com';
  const qrUrl = ticket?.ticketNumber
    ? `${origin}/verify/${encodeURIComponent(ticket.ticketNumber)}`
    : `${origin}/verify/${encodeURIComponent(paymentRef)}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=840,height=960');
    if (!printWindow) {
      window.print();
      return;
    }

    const qrSvg = printableRef.current?.querySelector('svg')?.outerHTML || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - #${invoiceNumber} - Tribes & Cliqs</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 18mm; }
            * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background: #ffffff; color: #111827; margin: 0; padding: 24px; font-size: 13px; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 24px; }
            .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #111827; }
            .brand span { color: #6366F1; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #DEF7EC; color: #03543F; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
            .card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; }
            .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6B7280; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 24px 0; }
            th { text-align: left; padding: 10px 12px; background: #F3F4F6; font-size: 11px; text-transform: uppercase; color: #4B5563; font-weight: 600; border-bottom: 1px solid #E5E7EB; }
            td { padding: 12px; border-bottom: 1px solid #E5E7EB; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals-container { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 10px; padding-top: 10px; }
            .totals { width: 280px; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
            .totals-row.grand { border-top: 2px solid #111827; font-size: 16px; font-weight: 900; padding-top: 10px; margin-top: 6px; }
            .qr-section { display: flex; align-items: center; gap: 14px; }
            .qr-box { padding: 6px; border: 1px solid #E5E7EB; border-radius: 8px; background: #fff; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">TRIBES &amp; CLIQS</div>
              <p style="color: #6B7280; margin: 4px 0 0 0; font-size: 12px;">Official Transaction Receipt &amp; Tax Invoice</p>
            </div>
            <div style="text-align: right;">
              <span class="badge">PAID IN FULL &amp; VERIFIED</span>
              <p style="font-family: monospace; font-size: 13px; font-weight: 800; margin: 6px 0 0 0;">${invoiceNumber}</p>
              <p style="color: #6B7280; font-size: 11px; margin: 2px 0 0 0;">${formattedDate}</p>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Billed To (Attendee)</div>
              <p style="font-weight: 700; margin: 0 0 4px 0; font-size: 14px;">${attendeeName}</p>
              <p style="color: #4B5563; margin: 0 0 2px 0;">Email: ${attendeeEmail}</p>
              ${attendeePhone ? `<p style="color: #4B5563; margin: 0 0 2px 0;">Phone: ${attendeePhone}</p>` : ''}
              <p style="font-family: monospace; font-size: 11px; color: #6B7280; margin-top: 6px;">Ref: ${paymentRef}</p>
            </div>
            <div class="card">
              <div class="card-title">Event Information</div>
              <p style="font-weight: 700; margin: 0 0 4px 0; font-size: 14px;">${eventTitle}</p>
              <p style="color: #4B5563; margin: 0 0 2px 0;">Date: ${eventDate || 'Announced Soon'}</p>
              <p style="color: #4B5563; margin: 0;">Venue: ${eventVenue}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description / Ticket Tier</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it) => `
                <tr>
                  <td>
                    <strong>${it.name}</strong>
                    <div style="font-size: 11px; color: #6B7280;">Admission pass for ${eventTitle}</div>
                  </td>
                  <td class="text-center">${it.quantity}</td>
                  <td class="text-right">${format(it.unitPrice)}</td>
                  <td class="text-right font-medium">${format(it.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="qr-section">
              ${qrSvg ? `<div class="qr-box">${qrSvg}</div>` : ''}
              <div>
                <p style="font-size: 11px; font-weight: 700; color: #111827; margin: 0 0 2px 0;">Digital Verification QR</p>
                <p style="font-size: 10px; color: #6B7280; margin: 0;">Scan at gate or visit tribesandcliqs.com/verify</p>
                <p style="font-size: 10px; color: #6B7280; font-family: monospace; margin: 2px 0 0 0;">Ref: ${paymentRef}</p>
              </div>
            </div>

            <div class="totals">
              <div class="totals-row">
                <span style="color: #6B7280;">Subtotal</span>
                <span>${format(subtotal)}</span>
              </div>
              ${discount > 0 ? `
                <div class="totals-row" style="color: #059669;">
                  <span>Promo Discount</span>
                  <span>-${format(discount)}</span>
                </div>
              ` : ''}
              <div class="totals-row">
                <span style="color: #6B7280;">Taxes &amp; Processing</span>
                <span>Included (0.00)</span>
              </div>
              <div class="totals-row grand">
                <span>Total Paid</span>
                <span>${format(totalAmount)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for booking with Tribes &amp; Cliqs. This official receipt confirms your payment and admission fulfillment.</p>
            <p>Support inquiries: support@tribesandcliqs.com | Tribes &amp; Cliqs Event Infrastructure</p>
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
    if (!orderId) {
      // Fallback directly to printable receipt if no orderId
      handlePrint();
      return;
    }

    setDownloading(true);
    try {
      const res = await getOrderInvoice(orderId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Official receipt PDF downloaded');
    } catch {
      toast.error('Could not download PDF file. Opening printable receipt view instead.');
      handlePrint();
    } finally {
      setDownloading(false);
    }
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
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> Verified Payment &amp; Ticket Fulfillment
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
              className="px-4 py-2 rounded-lg bg-[#242B32] border border-[#494F55]/50 text-xs font-semibold text-[#EFEFF1] hover:bg-[#2C343D] hover:border-white/40 transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-[#949599]" /> Print Receipt
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-4 py-2 rounded-lg bg-white text-[#1C232B] text-xs font-bold hover:bg-[#CBD5E1] transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>
      }
    >
      <div ref={printableRef} className="space-y-6 text-[#EFEFF1] p-1 sm:p-2">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#262B2F]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">TRIBES &amp; CLIQS</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                PAID IN FULL
              </span>
            </div>
            <p className="text-xs text-[#949599] mt-1">Official Event Ticketing &amp; Experience Receipt</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase font-bold tracking-wider text-[#949599]">Invoice No.</p>
            <p className="text-base font-black text-white font-mono">{invoiceNumber}</p>
            <p className="text-xs text-[#494F55] mt-0.5">{formattedDate}</p>
          </div>
        </div>

        {/* Billed To & Event Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#171C21] border border-[#262B2F]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#949599] mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-white" /> Billed To (Attendee)
            </p>
            <p className="text-sm font-bold text-white">{attendeeName}</p>
            <p className="text-xs text-[#949599] mt-0.5 flex items-center gap-1">
              <Mail className="w-3 h-3 text-[#494F55]" /> {attendeeEmail}
            </p>
            {attendeePhone && (
              <p className="text-xs text-[#949599] mt-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#494F55]" /> {attendeePhone}
              </p>
            )}
            <p className="text-xs text-[#494F55] mt-1.5 font-mono">Ref: {paymentRef}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#949599] mb-2 flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-white" /> Event Details
            </p>
            <p className="text-sm font-bold text-white line-clamp-1">{eventTitle}</p>
            {eventDate && (
              <p className="text-xs text-[#949599] mt-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#494F55]" /> {eventDate}
              </p>
            )}
            <p className="text-xs text-[#949599] mt-0.5 flex items-center gap-1 line-clamp-1">
              <MapPin className="w-3 h-3 text-[#494F55] shrink-0" /> {eventVenue}
            </p>
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="overflow-hidden rounded-xl border border-[#262B2F]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1C232B] text-[#949599] uppercase font-bold tracking-wider border-b border-[#262B2F]">
              <tr>
                <th className="p-3.5">Description / Ticket Tier</th>
                <th className="p-3.5 text-center">Qty</th>
                <th className="p-3.5 text-right">Unit Price</th>
                <th className="p-3.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262B2F] bg-[#14181C]">
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td className="p-3.5">
                    <p className="font-bold text-white">{it.name}</p>
                    <p className="text-[11px] text-[#949599]">Verified Entry Pass for {eventTitle}</p>
                  </td>
                  <td className="p-3.5 text-center font-semibold">{it.quantity}</td>
                  <td className="p-3.5 text-right font-mono">{format(it.unitPrice)}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-white">
                    {format(it.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loadingOrder && (
          <div className="flex items-center justify-center gap-2 text-xs text-[#949599] py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>Loading full order breakdown...</span>
          </div>
        )}

        {/* Summary Totals & Digital Verification QR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
          {/* Verification QR section */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#171C21] border border-[#262B2F] w-full sm:w-auto">
            <div className="w-16 h-16 rounded-lg bg-white p-1.5 flex items-center justify-center shrink-0 shadow-sm">
              <QRCodeSVG value={qrUrl} size={54} level="M" />
            </div>
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-white flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Digital Verification QR
              </p>
              <p className="text-[11px] text-[#949599]">Scan to verify authenticity &amp; entry</p>
              <p className="text-[10px] text-[#494F55] font-mono">Ref: {paymentRef}</p>
            </div>
          </div>

          <div className="w-full sm:w-64 space-y-2 p-3.5 rounded-xl bg-[#171C21] border border-[#262B2F] text-xs">
            <div className="flex justify-between text-[#949599]">
              <span>Subtotal:</span>
              <span className="font-mono text-white">{format(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Promo Discount {couponCode ? `(${couponCode})` : ''}:</span>
                <span className="font-mono">-{format(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#949599]">
              <span>Tax &amp; Processing:</span>
              <span className="font-mono text-white">Included (0.00)</span>
            </div>
            <div className="pt-2 border-t border-[#262B2F] flex justify-between text-sm font-bold">
              <span className="text-white">Total Paid:</span>
              <span className="text-base font-black text-white font-mono">{format(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Gateway info badge */}
        <div className="p-3 rounded-lg bg-[#14181C] border border-[#262B2F] flex flex-wrap items-center justify-between gap-2 text-xs text-[#949599]">
          <div className="flex items-center gap-2">
            <span>Payment Method: <strong className="text-white font-medium">{paymentMethod}</strong></span>
            <span>•</span>
            <span>Status: <strong className="text-emerald-400 font-medium capitalize">{paymentStatus}</strong></span>
          </div>
          <span className="text-[11px] font-mono text-[#494F55]">Secured by Paystack Gateway</span>
        </div>
      </div>
    </Modal>
  );
}
