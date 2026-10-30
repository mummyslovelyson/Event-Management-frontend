import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Printer, Download, Share2, CheckCircle2, Clock, ArrowLeft,
  Ticket, MapPin, Calendar, User, Mail, Phone, ShieldCheck,
  CreditCard, Copy, Check, ExternalLink, FileText, AlertCircle,
  Loader2, QrCode, Sparkles, Building2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import Logo from '@/components/common/Logo';
import Badge from '@/components/common/Badge';
import { useCurrency } from '@/context/CurrencyContext';
import { getReceipt, getOrder, getOrderInvoice } from '@/api/orders';
import { generateQrSvgString } from '@/components/tickets/TicketPass';

export default function ReceiptPage() {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('reference') || searchParams.get('ref') || searchParams.get('orderId') || searchParams.get('id');
  const identifier = routeId || queryParam;

  const location = useLocation();
  const navigate = useNavigate();
  const { format } = useCurrency();

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order && !!identifier);
  const [error, setError] = useState(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [searchCodeInput, setSearchCodeInput] = useState('');
  const fetchedTargetRef = useRef(null);

  const printableRef = useRef(null);

  const fetchReceipt = useCallback(async (targetId) => {
    if (!targetId) {
      setLoading(false);
      return;
    }

    // Only show full loading spinner if we don't already have order data
    setLoading((prev) => (order ? false : true));
    setError(null);

    try {
      // First try dedicated public receipt endpoint
      const res = await getReceipt(targetId);
      if (res.data?.order) {
        setOrder(res.data.order);
        setError(null);
        setLoading(false);
        return;
      }
    } catch {
      // Fallback to getOrder endpoint
      try {
        const orderRes = await getOrder(targetId);
        if (orderRes.data?.order) {
          setOrder(orderRes.data.order);
          setError(null);
          setLoading(false);
          return;
        }
      } catch (fallbackErr) {
        console.error('[ReceiptPage] Could not retrieve order:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }

    setOrder((current) => {
      if (!current) {
        setError('We could not find an official receipt matching this reference or order number.');
      }
      return current;
    });
  }, [order]);

  useEffect(() => {
    if (identifier) {
      if (fetchedTargetRef.current !== identifier) {
        fetchedTargetRef.current = identifier;
        fetchReceipt(identifier);
      }
    } else if (!order) {
      setLoading(false);
    }
  }, [identifier, fetchReceipt]);

  // Derived order attributes
  const event = order?.event || {};
  const eventTitle = order?.event_title || event.title || order?.eventTitle || order?.eventName || 'Live Event';
  const eventDate = order?.event_date || event.startDate || order?.startDate || order?.start_date;
  const eventTime = order?.event_time || event.startTime || order?.startTime || order?.start_time;
  const eventVenue = order?.event_venue || event.venue || order?.venue || 'Venue TBA';
  const eventLocation = order?.event_location || event.location || order?.event_city || event.city || '';
  const organizerName = order?.organizer_name || event.organizer_name || 'Event Organizer';

  const buyerName = order?.buyer_name || order?.customerName || order?.customer_name || order?.user?.name || 'Valued Attendee';
  const buyerEmail = order?.buyer_email || order?.customerEmail || order?.customer_email || order?.user?.email || '—';
  const buyerPhone = order?.buyer_phone || order?.customerPhone || order?.customer_phone || order?.user?.phone || '';

  const orderRef = order?.payment_reference || order?.reference || order?.orderId || (order?.id ? `TC-ORD-${order.id}` : (identifier || 'RECEIPT'));
  const invoiceNumber = order?.invoice_number || order?.invoiceNumber || (order?.id ? `INV-${new Date().getFullYear()}-${String(order.id).padStart(6, '0')}` : `#${orderRef}`);

  const orderDateStr = order?.created_at || order?.createdAt;
  const formattedOrderDate = (() => {
    if (!orderDateStr) return 'Recently';
    try {
      const d = new Date(orderDateStr);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  })();

  const formattedEventDate = (() => {
    if (!eventDate) return 'Date TBA';
    try {
      const d = new Date(eventDate);
      if (isNaN(d.getTime())) return String(eventDate);
      return d.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch {
      return String(eventDate);
    }
  })();

  const paymentStatus = String(order?.payment_status || order?.status || 'completed').toLowerCase();
  const isPaid = ['completed', 'paid', 'success', 'successful'].includes(paymentStatus);
  const paymentMethod = order?.payment_method || order?.paymentMethod || 'Paystack (Card / MoMo)';

  // Items calculation
  const rawItems = Array.isArray(order?.items) && order.items.length > 0 ? order.items : null;
  const rawTickets = Array.isArray(order?.tickets) && order.tickets.length > 0 ? order.tickets : null;
  const totalAmount = Number(order?.total_amount ?? order?.totalAmount ?? order?.total ?? 0);
  const discountAmount = Number(order?.discount_amount ?? order?.discountAmount ?? order?.discount ?? 0);
  const couponCode = order?.coupon_code || order?.couponCode || null;

  const items = rawItems ? rawItems.map((it) => {
    const qty = Number(it.quantity || 1);
    const unit = Number(it.unit_price ?? it.price ?? 0);
    const sub = it.subtotal !== undefined && it.subtotal !== null ? Number(it.subtotal) : unit * qty;
    return {
      name: it.ticket_type_name || it.ticketType || it.name || 'Event Pass',
      quantity: qty,
      unitPrice: unit,
      subtotal: sub,
      ticket_file_url: it.ticket_file_url || null,
      ticket_file_name: it.ticket_file_name || null,
    };
  }) : rawTickets ? rawTickets.map((t) => ({
    name: t.ticket_type_name || t.ticketType || 'Admission Pass',
    quantity: 1,
    unitPrice: Number(t.unit_price ?? t.price ?? (totalAmount / rawTickets.length)),
    subtotal: Number(t.unit_price ?? t.price ?? (totalAmount / rawTickets.length)),
    ticket_file_url: t.ticket_file_url || t.ticketFileUrl || null,
    ticket_file_name: t.ticket_file_name || t.ticketFileName || null,
  })) : [
    {
      name: order?.ticketType || order?.ticket_type_name || 'Admission Pass',
      quantity: order?.quantity || 1,
      unitPrice: totalAmount,
      subtotal: totalAmount,
      ticket_file_url: null,
      ticket_file_name: null,
    },
  ];

  const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0);

  // Verification URL encoded in QR Code
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://tribesandcliqs.com';
  const verifyUrl = `${origin}/verify/${encodeURIComponent(orderRef)}`;

  // Copy reference code
  const handleCopyRef = () => {
    try {
      navigator.clipboard.writeText(orderRef);
      setCopiedRef(true);
      toast.success('Order reference copied to clipboard!');
      setTimeout(() => setCopiedRef(false), 2500);
    } catch {
      toast.error('Failed to copy reference');
    }
  };

  // Share or copy receipt link
  const handleShareReceipt = async () => {
    const shareUrl = `${origin}/receipt/${encodeURIComponent(orderRef)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt for ${eventTitle} - Tribes & Cliqs`,
          text: `Official transaction receipt #${orderRef} for ${eventTitle}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[handleShareReceipt] Web Share failed, falling back to copy:', err);
        }
      }
    }

    try {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success('Receipt link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Could not copy link');
    }
  };

  // High-fidelity Print window containing Logo and vector QR Code
  const handlePrint = () => {
    const qrSvg = generateQrSvgString(verifyUrl, 180) || '';
    const logoUrl = `${origin}/assets/images/Logo.jpeg`;

    const printWindow = window.open('', '_blank', 'width=880,height=960');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - #${invoiceNumber} - Tribes & Cliqs</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page { size: A4 portrait; margin: 16mm 20mm; }
            * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            body { background: #ffffff; color: #111827; margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 24px; }
            .brand-lockup { display: flex; align-items: center; gap: 14px; }
            .logo-img { width: 52px; height: 52px; border-radius: 10px; object-fit: cover; border: 1px solid #E5E7EB; }
            .brand-name { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #111827; margin: 0; }
            .brand-sub { font-size: 10px; font-weight: 700; color: #D97706; text-transform: uppercase; letter-spacing: 2px; margin: 2px 0 0 0; }
            .receipt-badge { display: inline-block; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: #DEF7EC; color: #03543F; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
            .info-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; }
            .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6B7280; margin-bottom: 8px; }
            .primary-text { font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px 0; }
            .secondary-text { font-size: 12px; color: #4B5563; margin: 0 0 3px 0; }
            table { width: 100%; border-collapse: collapse; margin: 24px 0; }
            th { text-align: left; padding: 10px 14px; background: #F3F4F6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #4B5563; font-weight: 700; border-bottom: 1px solid #E5E7EB; }
            td { padding: 12px 14px; border-bottom: 1px solid #E5E7EB; font-size: 13px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .bottom-section { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 20px; border-top: 1px solid #E5E7EB; }
            .qr-wrapper { display: flex; align-items: center; gap: 16px; }
            .qr-frame { width: 92px; height: 92px; padding: 6px; border: 1px solid #D1D5DB; border-radius: 10px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; }
            .qr-meta { font-size: 11px; color: #4B5563; }
            .totals-box { width: 290px; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #4B5563; }
            .total-row.grand { border-top: 2px solid #111827; font-size: 16px; font-weight: 800; color: #111827; padding-top: 10px; margin-top: 6px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px dashed #D1D5DB; text-align: center; color: #6B7280; font-size: 11px; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand-lockup">
              <img src="${logoUrl}" alt="Tribes & Cliqs Logo" class="logo-img" />
              <div>
                <h1 class="brand-name">TRIBES &amp; CLIQS</h1>
                <p class="brand-sub">LIVING THE MOMENT</p>
              </div>
            </div>
            <div style="text-align: right;">
              <span class="receipt-badge">${isPaid ? 'PAID &amp; CONFIRMED' : paymentStatus.toUpperCase()}</span>
              <p style="font-family: monospace; font-size: 14px; font-weight: 800; margin: 8px 0 0 0;">${invoiceNumber}</p>
              <p style="color: #6B7280; font-size: 11px; margin: 2px 0 0 0;">${formattedOrderDate}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-card">
              <div class="card-title">Billed To (Customer)</div>
              <p class="primary-text">${buyerName}</p>
              <p class="secondary-text">Email: ${buyerEmail}</p>
              ${buyerPhone ? `<p class="secondary-text">Phone: ${buyerPhone}</p>` : ''}
              <p class="secondary-text" style="font-family: monospace; margin-top: 6px;">Ref: ${orderRef}</p>
              <p class="secondary-text">Method: ${paymentMethod}</p>
            </div>
            <div class="info-card">
              <div class="card-title">Event &amp; Admission Info</div>
              <p class="primary-text">${eventTitle}</p>
              <p class="secondary-text">Date: ${formattedEventDate}${eventTime ? ` at ${eventTime}` : ''}</p>
              <p class="secondary-text">Venue: ${eventVenue}${eventLocation ? ` • ${eventLocation}` : ''}</p>
              <p class="secondary-text">Host: ${organizerName}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item / Ticket Tier</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it) => `
                <tr>
                  <td>
                    <strong>${it.name}</strong>
                    <div style="font-size: 11px; color: #6B7280;">Official Entry Pass</div>
                  </td>
                  <td class="text-center">${it.quantity}</td>
                  <td class="text-right">${format(it.unitPrice)}</td>
                  <td class="text-right font-medium">${format(it.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="bottom-section">
            <div class="qr-wrapper">
              <div class="qr-frame">
                ${qrSvg}
              </div>
              <div class="qr-meta">
                <p style="font-weight: 700; color: #111827; margin: 0 0 2px 0; font-size: 12px;">Official Verification QR</p>
                <p style="margin: 0 0 2px 0;">Scan at event gate or verify online:</p>
                <p style="margin: 0; font-family: monospace; font-size: 10px; color: #6B7280;">${verifyUrl}</p>
                <p style="margin: 4px 0 0 0; font-size: 10px; color: #059669; font-weight: 600;">Security Hash: ${orderRef.slice(-10)}</p>
              </div>
            </div>

            <div class="totals-box">
              <div class="total-row">
                <span>Subtotal</span>
                <span>${format(subtotal)}</span>
              </div>
              ${discountAmount > 0 ? `
                <div class="total-row" style="color: #059669; font-weight: 600;">
                  <span>Promo Discount ${couponCode ? `(${couponCode})` : ''}</span>
                  <span>-${format(discountAmount)}</span>
                </div>
              ` : ''}
              <div class="total-row">
                <span>Taxes &amp; Processing Fees</span>
                <span>Included (0.00)</span>
              </div>
              <div class="total-row grand">
                <span>Total Paid</span>
                <span>${format(totalAmount)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 4px 0; font-weight: 600;">Thank you for booking with Tribes &amp; Cliqs.</p>
            <p style="margin: 0 0 4px 0;">This official digital receipt serves as proof of payment and admission fulfillment.</p>
            <p style="margin: 0;">For inquiries or support, please visit tribesandcliqs.com/contact or email support@tribesandcliqs.com</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!order?.id) {
      handlePrint();
      return;
    }

    setDownloadingPdf(true);
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
      toast.success('Official receipt PDF downloaded');
    } catch {
      // Fallback: trigger print dialog to Save as PDF
      handlePrint();
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Manual search submit if no reference was given
  const handleManualSearch = (e) => {
    e.preventDefault();
    if (searchCodeInput.trim()) {
      navigate(`/receipt/${encodeURIComponent(searchCodeInput.trim())}`);
      fetchReceipt(searchCodeInput.trim());
    }
  };

  return (
    <div className="min-h-screen bg-[#141A1F] text-[#EFEFF1] py-8 sm:py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[650px] rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb & Back bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
            className="inline-flex items-center gap-2 text-sm text-[#949599] hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <Link
              to="/attendee/tickets"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242B32] border border-[#494F55]/50 text-xs font-semibold text-[#EFEFF1] hover:bg-[#2C343D] transition shadow-sm"
            >
              <Ticket className="w-3.5 h-3.5 text-amber-400" /> My Tickets
            </Link>
          </div>
        </div>

        {/* ── STATE 1: LOADING ── */}
        {loading && (
          <div className="bg-[#1C232B] border border-[#494F55]/40 rounded-3xl p-12 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white">Loading Official Receipt...</h2>
            <p className="text-sm text-[#949599]">Retrieving order verification details, items, and QR codes.</p>
          </div>
        )}

        {/* ── STATE 2: ERROR / NOT FOUND ── */}
        {!loading && (error || !order) && (
          <div className="bg-[#1C232B] border border-rose-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Receipt Not Found</h2>
              <p className="text-sm text-[#949599] mt-1.5 max-w-md mx-auto">
                {error || 'Please enter an order reference or invoice number to look up your official purchase receipt.'}
              </p>
            </div>

            {/* Quick search input */}
            <form onSubmit={handleManualSearch} className="max-w-md mx-auto flex gap-2">
              <input
                type="text"
                placeholder="e.g. TC-PAY-XXXX or Order #"
                value={searchCodeInput}
                onChange={(e) => setSearchCodeInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#141A1F] border border-[#494F55]/60 text-sm text-white placeholder-[#949599] focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-bold hover:bg-amber-300 transition"
              >
                Search
              </button>
            </form>

            <div className="pt-4 border-t border-[#494F55]/30">
              <Link to="/explore" className="text-sm text-amber-400 hover:underline">
                Explore Upcoming Events &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* ── STATE 3: RECEIPT CERTIFICATE CARD ── */}
        {!loading && order && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Quick Action Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1C232B]/80 backdrop-blur-md border border-[#494F55]/40 p-4 rounded-2xl shadow-xl">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Verified Transaction
                  </span>
                  <p className="text-xs text-[#949599]">Tribes &amp; Cliqs Official Proof of Purchase</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareReceipt}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#242B32] border border-[#494F55]/60 text-xs font-semibold text-[#EFEFF1] hover:bg-[#2C343D] transition shadow-sm"
                  title="Share receipt link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-[#949599]" />}
                  {copiedLink ? 'Link Copied' : 'Share'}
                </button>

                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#242B32] border border-[#494F55]/60 text-xs font-semibold text-[#EFEFF1] hover:bg-[#2C343D] transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" /> Print
                </button>

                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#141A1F] text-xs font-bold hover:bg-[#CBD5E1] transition shadow-md disabled:opacity-50"
                >
                  {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Download PDF
                </button>
              </div>
            </div>

            {/* The Main Printable Receipt Container */}
            <div
              ref={printableRef}
              className="bg-[#1C232B] border border-[#494F55]/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-500" />

              {/* Header with Official Logo & Receipt Details */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-[#494F55]/40">
                {/* Official Logo Brand Lockup */}
                <div className="flex items-center gap-4">
                  <Logo size="lg" showText={false} asLink={false} />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                      TRIBES<span className="text-amber-400">&amp;</span>CLIQS
                    </h1>
                    <p className="text-[10px] font-bold tracking-[0.25em] text-[#949599] uppercase">
                      LIVING THE MOMENT
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                        OFFICIAL RECEIPT
                      </span>
                      {isPaid && (
                        <Badge variant="success" size="sm" dot>
                          Paid &amp; Confirmed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Receipt Number & Date */}
                <div className="text-left sm:text-right space-y-1">
                  <p className="text-xs text-[#949599]">Receipt / Tax Invoice</p>
                  <p className="font-mono text-base font-bold text-white tracking-wide">
                    {invoiceNumber}
                  </p>
                  <div className="flex items-center gap-1.5 sm:justify-end text-xs text-[#949599]">
                    <Clock className="w-3.5 h-3.5 text-[#6B7278]" />
                    <span>{formattedOrderDate}</span>
                  </div>
                  <div className="pt-1 flex items-center gap-1.5 sm:justify-end text-xs">
                    <span className="text-[#949599]">Ref:</span>
                    <button
                      onClick={handleCopyRef}
                      className="font-mono text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                      title="Click to copy reference"
                    >
                      <span>#{orderRef}</span>
                      {copiedRef ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Information Cards (Billed To & Event Details) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Billed To Card */}
                <div className="bg-[#161D22] border border-[#494F55]/30 rounded-2xl p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#949599]">
                    <span>Billed To</span>
                    <User className="w-3.5 h-3.5 text-[#6B7278]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{buyerName}</h3>
                    <p className="text-xs text-[#949599] flex items-center gap-1.5 mt-1">
                      <Mail className="w-3.5 h-3.5 text-[#6B7278]" /> {buyerEmail}
                    </p>
                    {buyerPhone && (
                      <p className="text-xs text-[#949599] flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-[#6B7278]" /> {buyerPhone}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-[#494F55]/20 flex items-center justify-between text-xs text-[#949599]">
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-[#6B7278]" /> Payment:
                    </span>
                    <span className="font-medium text-white">{paymentMethod}</span>
                  </div>
                </div>

                {/* Event Information Card */}
                <div className="bg-[#161D22] border border-[#494F55]/30 rounded-2xl p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#949599]">
                    <span>Event Details</span>
                    <Ticket className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white line-clamp-1">{eventTitle}</h3>
                    <p className="text-xs text-[#949599] flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>
                        {formattedEventDate}{eventTime ? ` at ${eventTime}` : ''}
                      </span>
                    </p>
                    <p className="text-xs text-[#949599] flex items-center gap-1.5 mt-0.5 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{eventVenue}{eventLocation ? `, ${eventLocation}` : ''}</span>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#494F55]/20 flex items-center justify-between text-xs text-[#949599]">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#6B7278]" /> Host:
                    </span>
                    <span className="font-medium text-white truncate max-w-[180px]">{organizerName}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="rounded-2xl bg-[#161D22] border border-[#494F55]/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#1A2229] border-b border-[#494F55]/40 text-[#949599]">
                        <th className="px-4 py-3 uppercase tracking-wider font-bold">Ticket Tier / Description</th>
                        <th className="px-4 py-3 uppercase tracking-wider font-bold text-center">Qty</th>
                        <th className="px-4 py-3 uppercase tracking-wider font-bold text-right">Unit Price</th>
                        <th className="px-4 py-3 uppercase tracking-wider font-bold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#494F55]/20 text-[#EFEFF1]">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#1E252C]/60 transition">
                          <td className="px-4 py-3.5">
                            <strong className="text-sm text-white block">{item.name}</strong>
                            <span className="text-[11px] text-[#949599]">Official Event Admission Pass</span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-[#949599] font-medium">{item.quantity}</td>
                          <td className="px-4 py-3.5 text-right text-[#949599] font-mono">{format(item.unitPrice)}</td>
                          <td className="px-4 py-3.5 text-right font-bold font-mono text-white">{format(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Attached File Download notice if organizer supplied custom files */}
                {Array.isArray(order?.tickets) && order.tickets.some((t) => t.ticket_file_url) && (
                  <div className="p-3 bg-amber-400/10 border-t border-[#494F55]/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-300">
                      <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Custom digital admission tickets attached with this booking.</span>
                    </div>
                    <Link
                      to="/attendee/tickets"
                      className="px-2.5 py-1 rounded-lg bg-amber-400 text-black font-bold hover:bg-amber-300 transition"
                    >
                      View Passes
                    </Link>
                  </div>
                )}
              </div>

              {/* Totals & High-Contrast Verification QR Code Section */}
              <div className="bg-gradient-to-br from-[#161D22] to-[#141A1F] border border-[#494F55]/40 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* QR Code Container with sharp contrast */}
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="bg-white p-3 rounded-2xl shrink-0 shadow-2xl border-2 border-white ring-2 ring-amber-400/30">
                    <QRCodeSVG
                      value={verifyUrl}
                      size={140}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-white font-bold text-sm">
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <span>Official Verification QR</span>
                    </div>
                    <p className="text-xs text-[#949599] max-w-xs">
                      Scan with any smartphone camera or gate scanner to instantly verify authenticity and ticket validity.
                    </p>
                    <a
                      href={verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold transition pt-1"
                    >
                      Verify Online <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Calculation Breakdown */}
                <div className="w-full md:w-64 space-y-2 text-xs border-t md:border-t-0 md:border-l border-[#494F55]/30 pt-4 md:pt-0 md:pl-6">
                  <div className="flex justify-between text-[#949599]">
                    <span>Subtotal</span>
                    <span className="font-mono text-white">{format(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Discount {couponCode ? `(${couponCode})` : ''}</span>
                      <span className="font-mono">-{format(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#949599]">
                    <span>Taxes &amp; Processing</span>
                    <span>Included (0.00)</span>
                  </div>
                  <div className="pt-3 border-t border-[#494F55]/40 flex justify-between items-baseline font-black text-sm text-white">
                    <span>Total Amount Paid</span>
                    <span className="text-xl text-amber-400 font-mono">{format(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Security & Authenticity Footnote */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#949599]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Issued by Tribes &amp; Cliqs. End-to-end encrypted ticket infrastructure.</span>
                </div>
                <div className="text-[11px] text-[#6B7278]">
                  ID: #{String(order.id || orderRef).slice(-12).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Bottom Actions Card */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-[#1C232B] border border-[#494F55]/40 shadow-xl">
              <div className="flex items-center gap-3 text-sm text-[#949599]">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Need admission passes or barcode badges for your group?</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  to="/attendee/tickets"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#141A1F] text-sm font-bold hover:bg-[#CBD5E1] transition shadow-md"
                >
                  <Ticket className="w-4 h-4" /> Go to My Tickets
                </Link>
                <Link
                  to="/explore"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#242B32] border border-[#494F55]/50 text-sm font-medium hover:bg-[#2C343D] transition text-white"
                >
                  Explore More
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
