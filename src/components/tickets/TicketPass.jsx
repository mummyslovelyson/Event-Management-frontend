import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, ShieldCheck, MapPin, Calendar, Clock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Format date nicely for ticket stubs
 */
const formatTicketDate = (d) => {
  if (!d) return 'DATE TBA';
  try {
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
  } catch {
    return String(d).toUpperCase();
  }
};

/**
 * Render and export the ticket pass as a high-resolution PNG image
 */
export const downloadTicketPassAsImage = async (ticket) => {
  try {
    const event = ticket.event || {};
    const title = (event.title || ticket.eventName || 'LIVE CONCERT EVENT').toUpperCase();
    const dateStr = formatTicketDate(event.startDate || ticket.startDate || ticket.eventDate);
    const timeStr = (event.startTime || ticket.startTime || '7:00 PM - 11:00 PM').toUpperCase();
    const venueStr = (event.venue || ticket.venue || 'ACCRA, GHANA').toUpperCase();
    const cityStr = (event.city || ticket.city || 'ACCRA').toUpperCase();
    const tierName = (ticket.ticketType || ticket.type || 'STANDARD ADMISSION').toUpperCase();
    const priceStr = ticket.price ? `GHS ${ticket.price}` : (ticket.amount ? `GHS ${ticket.amount}` : 'VALID PASS');
    const ticketNo = (ticket.ticketNumber || ticket.id || 'TC-00000000').toString().toUpperCase();
    const seatNumber = ticket.seat || ticket.seatNumber || 'GA';
    const rowNumber = ticket.row || (seatNumber.includes('-') ? seatNumber.split('-')[0] : 'AAA');
    const attendeeName = (ticket.attendeeName || ticket.name || ticket.user?.name || 'ATTENDEE').toUpperCase();

    // High resolution canvas (1600 x 680)
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 680;
    const ctx = canvas.getContext('2d');

    // Enable smooth antialiasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Dark outer background
    ctx.fillStyle = '#0F1215';
    ctx.fillRect(0, 0, 1600, 680);

    const ticketX = 30;
    const ticketY = 30;
    const ticketW = 1540;
    const ticketH = 580;
    const radius = 24;

    // Helper for rounded rect
    const drawRoundedRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // 2. Base Ticket Golden/Amber Gradient
    const goldGrad = ctx.createLinearGradient(ticketX, ticketY, ticketX + ticketW * 0.75, ticketY + ticketH);
    goldGrad.addColorStop(0, '#E5A93C');
    goldGrad.addColorStop(0.35, '#F5C862');
    goldGrad.addColorStop(0.7, '#E5A93C');
    goldGrad.addColorStop(1, '#C98B28');

    ctx.save();
    drawRoundedRect(ticketX, ticketY, ticketW, ticketH, radius);
    ctx.fillStyle = goldGrad;
    ctx.fill();
    ctx.clip();

    // Radial lighting glow in center
    const radialGlow = ctx.createRadialGradient(800, 280, 50, 800, 280, 550);
    radialGlow.addColorStop(0, 'rgba(255, 245, 200, 0.45)');
    radialGlow.addColorStop(0.5, 'rgba(255, 215, 120, 0.15)');
    radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(ticketX, ticketY, ticketW, ticketH);

    // Decorative vinyl rings in center background
    ctx.strokeStyle = 'rgba(120, 40, 10, 0.18)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(520, 260, 190, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(520, 260, 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(520, 260, 80, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Right Stub: Deep Burgundy / Wine Red
    const rightStubW = 380;
    const rightStubX = ticketX + ticketW - rightStubW;
    const wineGrad = ctx.createLinearGradient(rightStubX, ticketY, rightStubX + rightStubW, ticketY + ticketH);
    wineGrad.addColorStop(0, '#6B0F24');
    wineGrad.addColorStop(0.5, '#7F132C');
    wineGrad.addColorStop(1, '#500B1B');

    ctx.fillStyle = wineGrad;
    ctx.fillRect(rightStubX, ticketY, rightStubW, ticketH);

    // Perforation line dividing center and right stub
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rightStubX, ticketY);
    ctx.lineTo(rightStubX, ticketY + ticketH);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Circular notch cutouts between main body and right stub (top & bottom)
    ctx.fillStyle = '#0F1215';
    ctx.beginPath();
    ctx.arc(rightStubX, ticketY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightStubX, ticketY + ticketH, 26, 0, Math.PI * 2);
    ctx.fill();

    // Circular notch cutouts on far left separation
    const leftStubW = 340;
    const leftStubX = ticketX + leftStubW;
    ctx.beginPath();
    ctx.arc(ticketX, ticketY + ticketH / 2, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ticketX + ticketW, ticketY + ticketH / 2, 26, 0, Math.PI * 2);
    ctx.fill();

    // Left dashed divider
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(80, 40, 10, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(leftStubX, ticketY + 20);
    ctx.lineTo(leftStubX, ticketY + ticketH - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. LEFT STUB CONTENT (QR Code + Row/Seat + Ticket #)
    // Draw white QR container
    const qrBoxX = ticketX + 45;
    const qrBoxY = ticketY + 45;
    const qrBoxSize = 250;

    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
    ctx.fill();

    // Generate QR code SVG into image for canvas
    const qrSvg = document.getElementById(`ticket-qr-${ticket.id || 'export'}`);
    if (qrSvg) {
      const svgData = new XMLSerializer().serializeToString(qrSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);
      const qrImg = new Image();
      await new Promise((resolve) => {
        qrImg.onload = () => {
          ctx.drawImage(qrImg, qrBoxX + 15, qrBoxY + 15, qrBoxSize - 30, qrBoxSize - 30);
          DOMURL.revokeObjectURL(url);
          resolve();
        };
        qrImg.onerror = resolve;
        qrImg.src = url;
      });
    }

    // Row & Seat Info on Left Stub
    ctx.fillStyle = '#1A1208';
    ctx.font = 'bold 18px "Inter", Arial, sans-serif';
    ctx.fillText('ROW', ticketX + 85, ticketY + 345);
    ctx.fillText('SEAT', ticketX + 215, ticketY + 345);

    ctx.font = '900 38px "Inter", Arial, sans-serif';
    ctx.fillText(rowNumber, ticketX + 85, ticketY + 395);
    ctx.fillText(seatNumber, ticketX + 215, ticketY + 395);

    // Divider line between row and seat
    ctx.strokeStyle = 'rgba(26, 18, 8, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ticketX + 170, ticketY + 330);
    ctx.lineTo(ticketX + 170, ticketY + 410);
    ctx.stroke();

    // Ticket Number
    ctx.font = 'bold 16px "Inter", Arial, monospace';
    ctx.fillStyle = '#3D2A0F';
    ctx.fillText(`#${ticketNo}`, ticketX + 75, ticketY + 460);

    // Attendee badge
    ctx.font = 'bold 15px "Inter", Arial, sans-serif';
    ctx.fillStyle = '#1A1208';
    ctx.fillText(attendeeName, ticketX + 75, ticketY + 490);

    // 5. CENTER MAIN BODY CONTENT
    // Web address badge at top
    ctx.font = 'bold 16px "Inter", Arial, sans-serif';
    ctx.fillStyle = '#1C150A';
    ctx.textAlign = 'center';
    ctx.fillText('🌐 WWW.TRIBESANDCLIQS.COM', leftStubX + (rightStubX - leftStubX) / 2, ticketY + 55);

    // Big Bold Event Title
    ctx.font = '900 52px "Inter", Arial, sans-serif';
    ctx.fillStyle = '#160F06';
    const maxTitleW = rightStubX - leftStubX - 80;

    // Word wrap event title if needed
    const words = title.split(' ');
    let line = '';
    let titleY = ticketY + 140;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTitleW && n > 0) {
        ctx.fillText(line, leftStubX + (rightStubX - leftStubX) / 2, titleY);
        line = words[n] + ' ';
        titleY += 58;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, leftStubX + (rightStubX - leftStubX) / 2, titleY);

    // Category / Tour subtitle pill
    ctx.fillStyle = '#6B0F24';
    const badgeW = 280;
    const badgeH = 44;
    const badgeX = leftStubX + (rightStubX - leftStubX) / 2 - badgeW / 2;
    const badgeY = titleY + 25;
    drawRoundedRect(badgeX, badgeY, badgeW, badgeH, 22);
    ctx.fill();

    ctx.font = '900 20px "Inter", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`✦ ${tierName} ✦`, leftStubX + (rightStubX - leftStubX) / 2, badgeY + 29);

    // Date, Time, Venue block
    const metaStartY = badgeY + 80;
    ctx.textAlign = 'left';

    // Date
    ctx.fillStyle = '#6B0F24';
    ctx.font = 'bold 22px "Inter", Arial, sans-serif';
    ctx.fillText('📅 ' + dateStr, leftStubX + 60, metaStartY);

    // Time
    ctx.fillStyle = '#1C150A';
    ctx.font = 'bold 20px "Inter", Arial, sans-serif';
    ctx.fillText('⏰ ' + timeStr, leftStubX + 60, metaStartY + 38);

    // Venue & City
    ctx.font = 'bold 20px "Inter", Arial, sans-serif';
    ctx.fillStyle = '#160F06';
    ctx.fillText('📍 ' + venueStr + (cityStr ? `, ${cityStr}` : ''), leftStubX + 60, metaStartY + 76);

    // 6. RIGHT STUB CONTENT (Burgundy / Pricing Section)
    ctx.textAlign = 'center';
    const rightCenter = rightStubX + rightStubW / 2;

    // Header Stars
    ctx.font = '900 22px "Inter", Arial, sans-serif';
    ctx.fillStyle = '#F5C862';
    ctx.fillText('★ ADMISSION PASS ★', rightCenter, ticketY + 80);

    // Pricing Header
    ctx.font = 'bold 18px "Inter", Arial, sans-serif';
    ctx.fillStyle = '#E5A93C';
    ctx.fillText('TIER & PRICING', rightCenter, ticketY + 160);

    // Tier Name
    ctx.font = '900 32px "Inter", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(tierName.slice(0, 16), rightCenter, ticketY + 220);

    // Big Price
    ctx.font = '900 54px "Inter", Arial, sans-serif';
    ctx.fillStyle = '#F5C862';
    ctx.fillText(priceStr, rightCenter, ticketY + 290);

    // Dashed divider inside right stub
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(245, 200, 98, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rightStubX + 40, ticketY + 340);
    ctx.lineTo(rightStubX + rightStubW - 40, ticketY + 340);
    ctx.stroke();
    ctx.setLineDash([]);

    // Verified badge
    ctx.font = 'bold 16px "Inter", Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('OFFICIAL DIGITAL PASS', rightCenter, ticketY + 390);

    ctx.font = 'bold 14px "Inter", Arial, monospace';
    ctx.fillStyle = '#F5C862';
    ctx.fillText(ticketNo, rightCenter, ticketY + 425);

    // Barcode lines decoration on right stub bottom
    const bcStartY = ticketY + 460;
    ctx.fillStyle = '#FFFFFF';
    const barWidths = [4, 8, 3, 12, 4, 16, 6, 8, 4, 14, 8, 4, 10, 6, 12, 4, 8, 14, 4];
    let curBx = rightStubX + 50;
    for (const bw of barWidths) {
      ctx.fillRect(curBx, bcStartY, bw, 45);
      curBx += bw + 8;
    }

    ctx.restore();

    // 7. BOTTOM GUARANTEE & SLOGAN BAR
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Inter", Arial, sans-serif';
    ctx.fillStyle = '#E5A93C';
    ctx.fillText(
      '✔ SECURE YOUR SEAT   |   NON-REFUNDABLE   |   ★ GOOD MUSIC • GOOD VIBES • GOOD PEOPLE',
      800,
      645
    );

    // Convert canvas to downloadable PNG
    canvas.toBlob((blob) => {
      if (!blob) throw new Error('Canvas export failed');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ticketNo.slice(-8)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Ticket downloaded successfully!');
    }, 'image/png');
  } catch (err) {
    console.error('[downloadTicketPassAsImage]', err);
    toast.error('Could not generate ticket image. Opening print view.');
  }
};

export default function TicketPass({ ticket, onDownload, onPrint }) {
  const event = ticket.event || {};
  const title = event.title || ticket.eventName || 'Live Concert Event';
  const dateStr = formatTicketDate(event.startDate || ticket.startDate || ticket.eventDate);
  const timeStr = event.startTime || ticket.startTime || '7:00 PM - 11:00 PM';
  const venueStr = event.venue || ticket.venue || 'Accra, Ghana';
  const cityStr = event.city || ticket.city || 'Accra';
  const tierName = ticket.ticketType || ticket.type || 'Standard Admission';
  const priceStr = ticket.price ? `GHS ${ticket.price}` : (ticket.amount ? `GHS ${ticket.amount}` : 'Valid Pass');
  const ticketNo = (ticket.ticketNumber || ticket.id || 'TC-00000000').toString().toUpperCase();
  const seatNumber = ticket.seat || ticket.seatNumber || 'GA';
  const rowNumber = ticket.row || (seatNumber.includes('-') ? seatNumber.split('-')[0] : 'AAA');
  const attendeeName = ticket.attendeeName || ticket.name || ticket.user?.name || 'Attendee';

  const qrValue = JSON.stringify({
    ticketId: ticket.id,
    ticketNumber: ticketNo,
    event: title,
    type: tierName,
  });

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload();
    } else {
      downloadTicketPassAsImage(ticket);
    }
  };

  const handlePrintClick = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Hidden QR Code element used for canvas rendering */}
      <div className="hidden">
        <QRCodeSVG id={`ticket-qr-${ticket.id || 'export'}`} value={qrValue} size={256} level="H" includeMargin={false} />
      </div>

      {/* Main Ticket Stub Component */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-amber-500/30 bg-[#0F1215] p-3 select-none">
        <div className="relative rounded-2xl overflow-hidden flex flex-col md:flex-row bg-gradient-to-r from-[#D49A32] via-[#F3C760] to-[#D49A32] shadow-inner text-[#171007]">
          
          {/* Left Stub (QR + Seat + Serial) */}
          <div className="relative md:w-72 p-6 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r-2 border-dashed border-[#78450F]/40 bg-[#E8AF3E]/30 backdrop-blur-sm">
            {/* Top & Bottom Perforation Notches on mobile / Left Notch */}
            <div className="hidden md:block absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0F1215] border border-amber-500/20" />

            {/* QR Code Container */}
            <div className="w-44 h-44 rounded-2xl bg-white p-3.5 shadow-xl flex items-center justify-center border border-amber-900/10">
              <QRCodeSVG value={qrValue} size={150} level="H" includeMargin={false} />
            </div>

            {/* Row & Seat */}
            <div className="mt-5 w-full flex items-center justify-around text-center py-2 px-3 rounded-xl bg-black/10 border border-black/5">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B0F24]">Row</p>
                <p className="text-xl font-black text-[#1A1208]">{rowNumber}</p>
              </div>
              <div className="w-px h-8 bg-[#6B0F24]/30" />
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B0F24]">Seat</p>
                <p className="text-xl font-black text-[#1A1208]">{seatNumber}</p>
              </div>
            </div>

            {/* Serial & Attendee */}
            <div className="mt-3 text-center">
              <p className="text-[11px] font-mono font-bold tracking-wider text-[#3D2A0F]">#{ticketNo.slice(-8)}</p>
              <p className="text-xs font-bold text-[#1A1208] truncate max-w-[180px]">{attendeeName}</p>
            </div>
          </div>

          {/* Center Main Stage / Concert Section */}
          <div className="relative flex-1 p-6 md:p-8 flex flex-col justify-between overflow-hidden">
            {/* Background Decorative Rings & Vinyl Graphic */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-[12px] border-[#78280A]/10 pointer-events-none" />
            <div className="absolute right-14 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-[6px] border-[#78280A]/10 pointer-events-none" />

            {/* Top Web Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#1C150A]">
                WWW.TRIBESANDCLIQS.COM
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#6B0F24] text-white shadow">
                {tierName}
              </span>
            </div>

            {/* Event Title */}
            <div className="my-5">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#160F06] leading-tight">
                {title}
              </h2>
            </div>

            {/* Metadata (Date, Time, Location) */}
            <div className="space-y-2 text-xs md:text-sm font-bold text-[#2C1E0A]">
              <div className="flex items-center gap-2 text-[#6B0F24]">
                <Calendar className="w-4 h-4 shrink-0 text-[#6B0F24]" />
                <span className="font-extrabold">{dateStr}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0 text-[#78450F]" />
                <span>{timeStr}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-[#78450F]" />
                <span className="truncate">{venueStr}{cityStr ? `, ${cityStr}` : ''}</span>
              </div>
            </div>
          </div>

          {/* Right Stub: Deep Burgundy / Wine Red Admission Section */}
          <div className="relative md:w-64 p-6 bg-gradient-to-br from-[#6B0F24] via-[#7F132C] to-[#500B1B] text-white flex flex-col items-center justify-between border-t md:border-t-0 md:border-l-2 border-dashed border-white/30">
            {/* Top & Bottom Notches */}
            <div className="hidden md:block absolute -left-3.5 -top-3.5 w-7 h-7 rounded-full bg-[#0F1215]" />
            <div className="hidden md:block absolute -left-3.5 -bottom-3.5 w-7 h-7 rounded-full bg-[#0F1215]" />
            <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#0F1215]" />

            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#F5C862]">
                ★ ADMISSION PASS ★
              </p>
              <div className="w-12 h-0.5 bg-[#F5C862]/40 mx-auto my-2" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">Tier &amp; Price</p>
              <p className="text-sm font-bold text-white mt-0.5 truncate max-w-[180px]">{tierName}</p>
            </div>

            <div className="my-4 text-center">
              <p className="text-2xl md:text-3xl font-black text-[#F5C862] tracking-tight">
                {priceStr}
              </p>
              <p className="text-[10px] font-mono text-amber-200/70 mt-1">#{ticketNo.slice(-8)}</p>
            </div>

            {/* Decorative Barcode */}
            <div className="w-full flex justify-center items-center gap-1 opacity-80 pt-2 border-t border-white/20">
              {[4, 8, 3, 10, 4, 12, 6, 8, 4, 14, 8, 4, 10, 4, 8, 12].map((w, idx) => (
                <div key={idx} className="bg-white h-7 rounded-sm" style={{ width: `${w}px` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Slogan Bar */}
        <div className="mt-3 py-1.5 px-4 text-center flex flex-wrap items-center justify-center gap-3 text-[11px] font-bold text-[#E5A93C] uppercase tracking-wider">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> SECURE YOUR SEAT
          </span>
          <span className="text-[#494F55]">•</span>
          <span>NON-REFUNDABLE</span>
          <span className="text-[#494F55]">•</span>
          <span className="text-amber-300">★ GOOD MUSIC • GOOD VIBES • GOOD PEOPLE</span>
        </div>
      </div>

      {/* Download & Print Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          onClick={handlePrintClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1C232B] border border-[#494F55]/40 text-sm font-semibold text-[#EFEFF1] hover:bg-[#242B32] hover:border-white/40 transition shadow-md"
        >
          <Printer className="w-4 h-4" /> Print Pass
        </button>
        <button
          onClick={handleDownloadClick}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-[#1C232B] text-sm font-bold hover:bg-[#CBD5E1] transition shadow-lg shadow-black/40"
        >
          <Download className="w-4 h-4" /> Download Ticket (PNG)
        </button>
      </div>
    </div>
  );
}
