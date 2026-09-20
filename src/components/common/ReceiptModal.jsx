import { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer, Download, CheckCircle2, Calendar, MapPin, Ticket as TicketIcon,
  CreditCard, ShieldCheck, Mail, Phone, User, Receipt, X, Loader2, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/common/Modal';
import Badge from '@/components/common/Badge';
import { useCurrency } from '@/context/CurrencyContext';
import { getOrder, getOrderInvoice } from '@/api/orders';

export default function ReceiptModal({ open, onClose, order, ticket }) {
  const { format } = useCurrency();
  const printableRef = useRef(null);
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

  const activeData = fetchedOrder || order || (ticket ? {
    ...ticket,
    id: ticket.orderId || ticket.order_id || ticket.id,
    reference: ticket.paymentRef || ticket.payment_reference || ticket.ticketNumber,
    totalAmount: ticket.orderTotal ?? ticket.price,
    customerName: ticket.attendeeName,
    customerEmail: ticket.attendeeEmail,
    customerPhone: ticket.attendeePhone,
    createdAt: ticket.orderCreatedAt || ticket.created_at,
    event: ticket.event,
    ticketFileUrl: ticket.ticketFileUrl || ticket.ticket_file_url || null,
    ticketFileName: ticket.ticketFileName || ticket.ticket_file_name || null,
    items: [{
      ticketType: ticket.ticketType || ticket.ticket_type_name || 'Event Pass',
      quantity: 1,
      unit_price: ticket.unitPrice ?? ticket.price,
      subtotal: ticket.unitPrice ?? ticket.price,
      ticket_file_url: ticket.ticketFileUrl || ticket.ticket_file_url || null,
      ticket_file_name: ticket.ticketFileName || ticket.ticket_file_name || null,
    }],
  } : null);

  if (!activeData) return null;

  const event = activeData.event || {};
  const eventTitle = event.title || activeData.eventTitle || activeData.event_title || activeData.eventName || 'Event';
  const eventDate = event.startDate || event.start_date || activeData.eventDate || activeData.event_date || activeData.startDate;
  const eventVenue = event.venue || activeData.venue || activeData.eventVenue || activeData.event_venue || 'Venue TBA';
  const customerName = activeData.customerName || activeData.buyer_name || activeData.user?.name || activeData.userName || 'Attendee';
  const customerEmail = activeData.customerEmail || activeData.buyer_email || activeData.user?.email || activeData.userEmail || '—';
  const customerPhone = activeData.customerPhone || activeData.buyer_phone || activeData.user?.phone || activeData.phone || '—';
  const orderRef = activeData.reference || activeData.payment_reference || activeData.orderId || String(activeData.id ?? '').slice(-8).toUpperCase();
  const orderDate = activeData.createdAt || activeData.created_at ? new Date(activeData.createdAt || activeData.created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—';
  const totalAmount = Number(activeData.totalAmount ?? activeData.total_amount ?? activeData.total ?? activeData.amount ?? 0);
  const discountAmount = Number(activeData.discountAmount ?? activeData.discount_amount ?? activeData.discount ?? 0);
  const couponCode = activeData.couponCode || activeData.coupon_code || null;

  const rawItems = Array.isArray(activeData.items) && activeData.items.length > 0 ? activeData.items : null;
  const items = rawItems ? rawItems.map((it) => {
    const qty = Number(it.quantity || 1);
    const unit = Number(it.unit_price ?? it.price ?? it.ticketPrice ?? 0);
    const sub = it.subtotal !== undefined && it.subtotal !== null ? Number(it.subtotal) : unit * qty;
    return {
      name: it.ticket_type_name || it.ticketType || it.name || 'Event Pass',
      quantity: qty,
      unitPrice: unit,
      subtotal: sub,
    };
  }) : [
    {
      name: activeData.ticketType || activeData.ticket_type_name || 'General Admission',
      quantity: activeData.quantity || activeData.ticketCount || 1,
      unitPrice: Number(activeData.unitPrice ?? activeData.ticketPrice ?? (totalAmount / (activeData.quantity || activeData.ticketCount || 1))),
      subtotal: totalAmount,
    },
  ];

  const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0);

  const qrData = JSON.stringify({
    ref: orderRef,
    orderId: activeData.id,
    event: eventTitle,
    amount: totalAmount,
    status: activeData.paymentStatus || activeData.status || 'paid',
  });

  const handlePrint = () => {
    const printContent = printableRef.current;
    if (!printContent) return;

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
              <p style="color: #4B5563; margin: 0 0 2px 0;">Date: ${eventDate ? new Date(eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA'}</p>
              <p style="color: #4B5563; margin: 0;">Venue: ${eventVenue}</p>
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
                  <td><strong>${it.name}</strong></td>
                  <td class="text-right">${it.quantity}</td>
                  <td class="text-right">${format(it.unitPrice)}</td>
                  <td class="text-right font-medium">${format(it.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              ${qrSvg ? `<div style="padding: 6px; border: 1px solid #E5E7EB; border-radius: 8px; background: #fff; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center;">${qrSvg}</div>` : ''}
              <div>
                <p style="font-size: 11px; font-weight: 700; color: #111827; margin: 0 0 2px 0;">Official Verification QR</p>
                <p style="font-size: 10px; color: #6B7280; margin: 0;">Scan at event gate or verify online</p>
                <p style="font-size: 10px; color: #6B7280; font-family: monospace; margin: 2px 0 0 0;">Ref: #${orderRef}</p>
              </div>
            </div>
            <div class="totals" style="margin: 0; width: 280px;">
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
                    {it.name}
                  </td>
                  <td className="px-4 py-3 text-center text-[#949599]">{it.quantity}</td>
                  <td className="px-4 py-3 text-right text-[#949599]">{format(it.unitPrice)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#EFEFF1]">
                    {format(it.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Attached Ticket Pass File Notification */}
          {(activeData.ticketFileUrl || (activeData.items && activeData.items[0]?.ticket_file_url)) && (
            <div className="p-3 bg-amber-400/10 border-t border-[#262B2F] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Official Attached Ticket: <strong className="text-white">{activeData.ticketFileName || activeData.items?.[0]?.ticket_file_name || 'Ticket Pass'}</strong>
                </span>
              </div>
              <a
                href={activeData.ticketFileUrl || activeData.items?.[0]?.ticket_file_url}
                target="_blank"
                rel="noopener noreferrer"
                download={activeData.ticketFileName || activeData.items?.[0]?.ticket_file_name || 'Official-Ticket'}
                className="px-2.5 py-1 rounded bg-amber-400 text-black font-bold hover:bg-amber-300 transition"
              >
                Download File
              </a>
            </div>
          )}

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
                  <span>Discount {couponCode ? `(${couponCode})` : ''}</span>
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
