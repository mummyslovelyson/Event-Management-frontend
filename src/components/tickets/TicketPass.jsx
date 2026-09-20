import React, { useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, ShieldCheck, MapPin, Calendar, Clock, Ticket as TicketIcon, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Generate a complete, self-contained SVG string with xmlns for a QR code
 */
export const generateQrSvgString = (value, size = 300) => {
  try {
    let svgString = ReactDOMServer.renderToStaticMarkup(
      React.createElement(QRCodeSVG, {
        value: String(value),
        size,
        level: 'H',
        includeMargin: false,
        xmlns: 'http://www.w3.org/2000/svg',
      })
    );
    if (!svgString.includes('xmlns=')) {
      svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    }
    return svgString;
  } catch (err) {
    console.error('[generateQrSvgString] Error generating QR SVG:', err);
    return null;
  }
};

/**
 * Draw the QR code onto a 2D canvas at (x, y) with dimension (size x size)
 * Uses Path2D for instant, synchronous, vector rendering.
 * Falls back to Image SVG data URL if Path2D is not available.
 */
export const drawQrCodeToCanvas = async (ctx, qrValue, x, y, size) => {
  const svgString = generateQrSvgString(qrValue, size);
  if (!svgString) return false;

  // 1. Primary approach: Synchronous Path2D vector drawing
  try {
    const viewBoxMatch = svgString.match(/viewBox="0 0 (\d+) (\d+)"/);
    const numCells = viewBoxMatch ? parseInt(viewBoxMatch[1], 10) : 41;
    const fgPathMatch = svgString.match(/fill="#000000" d="([^"]+)"/);

    if (typeof Path2D !== 'undefined' && fgPathMatch && fgPathMatch[1]) {
      const d = fgPathMatch[1];
      const scale = size / numCells;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#000000';
      ctx.fill(new Path2D(d));
      ctx.restore();
      return true;
    }
  } catch (err) {
    console.warn('[drawQrCodeToCanvas] Path2D failed, falling back to Image loader', err);
  }

  // 2. Fallback: Image loader with SVG Data URL
  try {
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, x, y, size, size);
        resolve();
      };
      img.onerror = (e) => {
        console.error('[drawQrCodeToCanvas] Image fallback failed', e);
        resolve();
      };
      img.src = dataUrl;
    });
    return true;
  } catch (err) {
    console.error('[drawQrCodeToCanvas] All methods failed', err);
    return false;
  }
};

/**
 * Format tier price accurately: Single ticket displays Single price, Double ticket displays Double price
 */
export const formatTicketTierPrice = (ticket) => {
  if (!ticket) return 'VALID PASS';
  const rawPrice = ticket.unitPrice ?? ticket.unit_price ?? ticket.ticket_price ?? ticket.ticketPrice ?? ticket.price;
  if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '') {
    const num = Number(rawPrice);
    if (!isNaN(num)) {
      if (num <= 0) return 'FREE PASS';
      return `GHS ${num.toFixed(2).replace(/\.00$/, '')}`;
    }
  }
  if (ticket.amount && (ticket.quantity === 1 || !ticket.quantity)) {
    const num = Number(ticket.amount);
    if (!isNaN(num) && num > 0) {
      return `GHS ${num.toFixed(2).replace(/\.00$/, '')}`;
    }
  }
  return 'VALID PASS';
};

/**
 * Extract clean tier/ticket type name (e.g. Single, Double, VIP)
 */
export const getTicketTierName = (ticket) => {
  if (!ticket) return 'STANDARD ADMISSION';
  return (
    ticket.ticketType ||
    ticket.ticket_type_name ||
    ticket.ticketTypeName ||
    ticket.type ||
    ticket.name ||
    'STANDARD ADMISSION'
  ).toString().toUpperCase();
};

/**
 * Extract ticket number with TC prefix fallback
 */
export const getTicketCode = (ticket) => {
  if (!ticket) return 'TC-00000000';
  return (
    ticket.ticketNumber ||
    ticket.ticket_number ||
    ticket.ticketCode ||
    ticket.ticket_code ||
    (ticket.id ? `TC-${ticket.id}` : 'TC-00000000')
  ).toString().toUpperCase();
};

/**
 * Extract attendee name cleanly
 */
export const getTicketAttendeeName = (ticket) => {
  if (!ticket) return 'ATTENDEE';
  return (
    ticket.attendeeName ||
    ticket.attendee_name ||
    ticket.userName ||
    ticket.user_name ||
    ticket.user?.name ||
    'ATTENDEE'
  ).toString().toUpperCase();
};

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
 * Supports organizer custom uploaded ticket artwork or fallback to default concert stub
 */
export const downloadTicketPassAsImage = async (ticket) => {
  try {
    const event = ticket.event || {};
    const title = (event.title || ticket.eventName || 'LIVE CONCERT EVENT').toUpperCase();
    const dateStr = formatTicketDate(event.startDate || ticket.startDate || ticket.eventDate);
    const timeStr = (event.startTime || ticket.startTime || '7:00 PM - 11:00 PM').toUpperCase();
    const venueStr = (event.venue || ticket.venue || 'ACCRA, GHANA').toUpperCase();
    const cityStr = (event.city || ticket.city || 'ACCRA').toUpperCase();
    const tierName = getTicketTierName(ticket);
    const priceStr = formatTicketTierPrice(ticket);
    const ticketNo = getTicketCode(ticket);
    const seatNumber = ticket.seat || ticket.seatNumber || 'GA';
    const rowNumber = ticket.row || (seatNumber.includes('-') ? seatNumber.split('-')[0] : 'AAA');
    const attendeeName = getTicketAttendeeName(ticket);
    const customTemplateUrl = ticket.ticketTemplate || event.ticketTemplate || ticket.ticket_template || event.ticket_template;
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://tribesandcliqs.com';
    const qrValue = ticket.qrCode || ticket.qr_code || `${origin}/verify/${encodeURIComponent(ticketNo)}`;

    // High resolution canvas (1600 x 680)
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 680;
    const ctx = canvas.getContext('2d');

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

    // Load custom template if organizer uploaded one
    let customImg = null;
    if (customTemplateUrl) {
      try {
        customImg = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = customTemplateUrl;
        });
      } catch {
        customImg = null;
      }
    }

    ctx.save();
    drawRoundedRect(ticketX, ticketY, ticketW, ticketH, radius);
    ctx.clip();

    if (customImg) {
      // -------------------------------------------------------------
      // A. ORGANIZER'S CUSTOM UPLOADED TICKET ARTWORK
      // -------------------------------------------------------------
      // Draw background artwork
      ctx.drawImage(customImg, ticketX, ticketY, ticketW, ticketH);

      // Subtle atmospheric overlay on left and right stubs for legibility
      const overlayGrad = ctx.createLinearGradient(ticketX, ticketY, ticketX + ticketW, ticketY);
      overlayGrad.addColorStop(0, 'rgba(15, 18, 21, 0.92)');
      overlayGrad.addColorStop(0.24, 'rgba(15, 18, 21, 0.75)');
      overlayGrad.addColorStop(0.32, 'rgba(15, 18, 21, 0.2)');
      overlayGrad.addColorStop(0.70, 'rgba(15, 18, 21, 0.2)');
      overlayGrad.addColorStop(0.78, 'rgba(15, 18, 21, 0.75)');
      overlayGrad.addColorStop(1, 'rgba(15, 18, 21, 0.95)');
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(ticketX, ticketY, ticketW, ticketH);

      // Perforation line on right stub
      const rightStubW = 380;
      const rightStubX = ticketX + ticketW - rightStubW;
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rightStubX, ticketY);
      ctx.lineTo(rightStubX, ticketY + ticketH);
      ctx.stroke();

      // Left dashed divider
      const leftStubW = 340;
      const leftStubX = ticketX + leftStubW;
      ctx.beginPath();
      ctx.moveTo(leftStubX, ticketY);
      ctx.lineTo(leftStubX, ticketY + ticketH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Notches
      ctx.fillStyle = '#0F1215';
      ctx.beginPath();
      ctx.arc(rightStubX, ticketY, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightStubX, ticketY + ticketH, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ticketX, ticketY + ticketH / 2, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ticketX + ticketW, ticketY + ticketH / 2, 24, 0, Math.PI * 2);
      ctx.fill();

      // Left Stub (QR Code + Seat)
      const qrBoxX = ticketX + 45;
      const qrBoxY = ticketY + 45;
      const qrBoxSize = 250;
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
      ctx.fill();

      // Draw vector QR code directly onto canvas
      await drawQrCodeToCanvas(ctx, qrValue, qrBoxX + 15, qrBoxY + 15, qrBoxSize - 30);

      // Row & Seat
      ctx.textAlign = 'left';
      ctx.fillStyle = '#E5A93C';
      ctx.font = 'bold 18px "Inter", Arial, sans-serif';
      ctx.fillText('ROW', ticketX + 85, ticketY + 345);
      ctx.fillText('SEAT', ticketX + 215, ticketY + 345);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 38px "Inter", Arial, sans-serif';
      ctx.fillText(rowNumber, ticketX + 85, ticketY + 395);
      ctx.fillText(seatNumber, ticketX + 215, ticketY + 395);

      ctx.font = 'bold 16px "Inter", Arial, monospace';
      ctx.fillStyle = '#F5C862';
      ctx.fillText(`#${ticketNo}`, ticketX + 75, ticketY + 460);

      ctx.font = 'bold 15px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#EFEFF1';
      ctx.fillText(attendeeName, ticketX + 75, ticketY + 490);

      // Center Banner Info
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#F5C862';
      ctx.fillText('🌐 WWW.TRIBESANDCLIQS.COM', leftStubX + (rightStubX - leftStubX) / 2, ticketY + 55);

      // Event Title
      ctx.font = '900 50px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      const maxTitleW = rightStubX - leftStubX - 80;
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

      // Category / Tier pill
      ctx.fillStyle = '#E5A93C';
      const badgeW = 280;
      const badgeH = 44;
      const badgeX = leftStubX + (rightStubX - leftStubX) / 2 - badgeW / 2;
      const badgeY = titleY + 25;
      drawRoundedRect(badgeX, badgeY, badgeW, badgeH, 22);
      ctx.fill();

      ctx.font = '900 20px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#160F06';
      ctx.fillText(`✦ ${tierName} ✦`, leftStubX + (rightStubX - leftStubX) / 2, badgeY + 29);

      // Date, Time, Venue block
      const metaStartY = badgeY + 75;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#F5C862';
      ctx.font = 'bold 22px "Inter", Arial, sans-serif';
      ctx.fillText('📅 ' + dateStr, leftStubX + 60, metaStartY);

      ctx.fillStyle = '#EFEFF1';
      ctx.font = 'bold 20px "Inter", Arial, sans-serif';
      ctx.fillText('⏰ ' + timeStr, leftStubX + 60, metaStartY + 38);
      ctx.fillText('📍 ' + venueStr + (cityStr ? `, ${cityStr}` : ''), leftStubX + 60, metaStartY + 76);

      // Right Stub (Pricing)
      ctx.textAlign = 'center';
      const rightCenter = rightStubX + rightStubW / 2;

      ctx.font = '900 22px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#F5C862';
      ctx.fillText('★ ADMISSION PASS ★', rightCenter, ticketY + 80);

      ctx.font = 'bold 18px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#E5A93C';
      ctx.fillText('TIER & PRICING', rightCenter, ticketY + 160);

      ctx.font = '900 32px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(tierName.slice(0, 16), rightCenter, ticketY + 220);

      ctx.font = '900 54px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#F5C862';
      ctx.fillText(priceStr, rightCenter, ticketY + 290);

      ctx.font = 'bold 16px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('OFFICIAL DIGITAL PASS', rightCenter, ticketY + 390);

      ctx.font = 'bold 14px "Inter", Arial, monospace';
      ctx.fillStyle = '#F5C862';
      ctx.fillText(ticketNo, rightCenter, ticketY + 425);

      const bcStartY = ticketY + 460;
      ctx.fillStyle = '#FFFFFF';
      const barWidths = [4, 8, 3, 12, 4, 16, 6, 8, 4, 14, 8, 4, 10, 6, 12, 4, 8, 14, 4];
      let curBx = rightStubX + 50;
      for (const bw of barWidths) {
        ctx.fillRect(curBx, bcStartY, bw, 45);
        curBx += bw + 8;
      }
    } else {
      // -------------------------------------------------------------
      // B. DEFAULT GOLDEN & BURGUNDY CONCERT STUB PASS
      // -------------------------------------------------------------
      const goldGrad = ctx.createLinearGradient(ticketX, ticketY, ticketX + ticketW * 0.75, ticketY + ticketH);
      goldGrad.addColorStop(0, '#E5A93C');
      goldGrad.addColorStop(0.35, '#F5C862');
      goldGrad.addColorStop(0.7, '#E5A93C');
      goldGrad.addColorStop(1, '#C98B28');

      ctx.fillStyle = goldGrad;
      ctx.fill();

      // Radial lighting glow
      const radialGlow = ctx.createRadialGradient(800, 280, 50, 800, 280, 550);
      radialGlow.addColorStop(0, 'rgba(255, 245, 200, 0.45)');
      radialGlow.addColorStop(0.5, 'rgba(255, 215, 120, 0.15)');
      radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(ticketX, ticketY, ticketW, ticketH);

      // Vinyl rings
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

      // Right stub burgundy
      const rightStubW = 380;
      const rightStubX = ticketX + ticketW - rightStubW;
      const wineGrad = ctx.createLinearGradient(rightStubX, ticketY, rightStubX + rightStubW, ticketY + ticketH);
      wineGrad.addColorStop(0, '#6B0F24');
      wineGrad.addColorStop(0.5, '#7F132C');
      wineGrad.addColorStop(1, '#500B1B');

      ctx.fillStyle = wineGrad;
      ctx.fillRect(rightStubX, ticketY, rightStubW, ticketH);

      // Perforation line
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rightStubX, ticketY);
      ctx.lineTo(rightStubX, ticketY + ticketH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Circular notch cutouts
      ctx.fillStyle = '#0F1215';
      ctx.beginPath();
      ctx.arc(rightStubX, ticketY, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightStubX, ticketY + ticketH, 26, 0, Math.PI * 2);
      ctx.fill();

      const leftStubW = 340;
      const leftStubX = ticketX + leftStubW;
      ctx.beginPath();
      ctx.arc(ticketX, ticketY + ticketH / 2, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ticketX + ticketW, ticketY + ticketH / 2, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = 'rgba(80, 40, 10, 0.35)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(leftStubX, ticketY + 20);
      ctx.lineTo(leftStubX, ticketY + ticketH - 20);
      ctx.stroke();
      ctx.setLineDash([]);

      // Left Stub QR
      const qrBoxX = ticketX + 45;
      const qrBoxY = ticketY + 45;
      const qrBoxSize = 250;

      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
      ctx.fill();

      // Draw vector QR code directly onto canvas
      await drawQrCodeToCanvas(ctx, qrValue, qrBoxX + 15, qrBoxY + 15, qrBoxSize - 30);

      // Row & Seat
      ctx.font = 'bold 18px "Inter", Arial, sans-serif';
      ctx.fillText('ROW', ticketX + 85, ticketY + 345);
      ctx.fillText('SEAT', ticketX + 215, ticketY + 345);

      ctx.font = '900 38px "Inter", Arial, sans-serif';
      ctx.fillText(rowNumber, ticketX + 85, ticketY + 395);
      ctx.fillText(seatNumber, ticketX + 215, ticketY + 395);

      ctx.font = 'bold 16px "Inter", Arial, monospace';
      ctx.fillStyle = '#3D2A0F';
      ctx.fillText(`#${ticketNo}`, ticketX + 75, ticketY + 460);

      ctx.font = 'bold 15px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#1A1208';
      ctx.fillText(attendeeName, ticketX + 75, ticketY + 490);

      // Center body
      ctx.font = 'bold 16px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#1C150A';
      ctx.textAlign = 'center';
      ctx.fillText('🌐 WWW.TRIBESANDCLIQS.COM', leftStubX + (rightStubX - leftStubX) / 2, ticketY + 55);

      ctx.font = '900 52px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#160F06';
      const maxTitleW = rightStubX - leftStubX - 80;
      const words = title.split(' ');
      let line = '';
      let titleY = ticketY + 140;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTitleW && n > 0) {
          ctx.fillText(line, leftStubX + (rightStubX - leftStubX) / 2, titleY);
          line = words[n] + ' ';
          titleY += 56;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, leftStubX + (rightStubX - leftStubX) / 2, titleY);

      // Slogan & Meta under Title
      const metaY = titleY + 50;
      ctx.font = 'bold 18px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#6B0F24';
      ctx.fillText(`🗓 ${dateStr}`, leftStubX + (rightStubX - leftStubX) / 2, metaY);

      ctx.font = 'bold 17px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#4A2A08';
      ctx.fillText(`⏰ ${timeStr}`, leftStubX + (rightStubX - leftStubX) / 2, metaY + 34);

      ctx.font = 'bold 17px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#301A04';
      ctx.fillText(`📍 ${venueStr}${cityStr ? `, ${cityStr}` : ''}`, leftStubX + (rightStubX - leftStubX) / 2, metaY + 68);

      // Center Tier Badge Pill
      const badgeW = 220;
      const badgeH = 44;
      const badgeX = leftStubX + (rightStubX - leftStubX - badgeW) / 2;
      const badgeY = metaY - 110;
      ctx.fillStyle = '#6B0F24';
      drawRoundedRect(badgeX, badgeY, badgeW, badgeH, 22);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 18px "Inter", Arial, sans-serif';
      ctx.fillText(`✦ ${tierName} ✦`, leftStubX + (rightStubX - leftStubX) / 2, badgeY + 29);

      // Right Stub (Burgundy)
      const rightCenter = rightStubX + rightStubW / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#F5C862';
      ctx.font = '900 18px "Inter", Arial, sans-serif';
      ctx.fillText('★ ADMISSION PASS ★', rightCenter, ticketY + 70);

      ctx.font = 'bold 12px "Inter", Arial, sans-serif';
      ctx.fillStyle = 'rgba(255, 235, 200, 0.85)';
      ctx.fillText('TIER & PRICING', rightCenter, ticketY + 140);

      ctx.font = '900 24px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(tierName, rightCenter, ticketY + 180);

      ctx.font = '900 46px "Inter", Arial, sans-serif';
      ctx.fillStyle = '#F5C862';
      ctx.fillText(priceStr, rightCenter, ticketY + 260);

      ctx.font = '900 14px "Inter", Arial, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText('OFFICIAL DIGITAL PASS', rightCenter, ticketY + 390);

      ctx.font = 'bold 14px "Inter", Arial, monospace';
      ctx.fillStyle = '#F5C862';
      ctx.fillText(ticketNo, rightCenter, ticketY + 425);

      const bcStartY = ticketY + 460;
      ctx.fillStyle = '#FFFFFF';
      const barWidths = [4, 8, 3, 12, 4, 16, 6, 8, 4, 14, 8, 4, 10, 6, 12, 4, 8, 14, 4];
      let curBx = rightStubX + 50;
      for (const bw of barWidths) {
        ctx.fillRect(curBx, bcStartY, bw, 45);
        curBx += bw + 8;
      }
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

/**
 * Open a dedicated print window with styled ticket pass and guaranteed high-res QR code
 */
export const printTicketPass = (ticket) => {
  if (typeof window === 'undefined') return;

  const event = ticket.event || {};
  const title = (event.title || ticket.eventName || 'Live Concert Event').toUpperCase();
  const dateStr = formatTicketDate(event.startDate || ticket.startDate || ticket.eventDate);
  const timeStr = (event.startTime || ticket.startTime || '7:00 PM - 11:00 PM').toUpperCase();
  const venueStr = (event.venue || ticket.venue || 'Accra, Ghana').toUpperCase();
  const cityStr = (event.city || ticket.city || 'Accra').toUpperCase();
  const tierName = getTicketTierName(ticket);
  const priceStr = formatTicketTierPrice(ticket);
  const ticketNo = getTicketCode(ticket);
  const seatNumber = ticket.seat || ticket.seatNumber || 'GA';
  const rowNumber = ticket.row || (seatNumber.includes('-') ? seatNumber.split('-')[0] : 'AAA');
  const attendeeName = getTicketAttendeeName(ticket);

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://tribesandcliqs.com';
  const qrValue = ticket.qrCode || ticket.qr_code || `${origin}/verify/${encodeURIComponent(ticketNo)}`;
  const qrSvg = generateQrSvgString(qrValue, 200);

  const printWindow = window.open('', '_blank', 'width=920,height=720');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Ticket Pass #${ticketNo.slice(-8)} - ${title}</title>
        <style>
          @page {
            size: landscape;
            margin: 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            margin: 0;
            padding: 24px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .ticket-wrapper {
            width: 100%;
            max-width: 860px;
            border-radius: 20px;
            background: #0F1215;
            padding: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .ticket-card {
            display: flex;
            border-radius: 16px;
            overflow: hidden;
            background: linear-gradient(135deg, #D49A32, #F3C760, #D49A32);
            color: #171007;
          }
          .stub-left {
            width: 250px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            border-right: 2px dashed rgba(80,40,10,0.4);
            background: rgba(232, 175, 62, 0.35);
          }
          .qr-box {
            width: 170px;
            height: 170px;
            background: #ffffff;
            border-radius: 12px;
            padding: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .qr-box svg {
            width: 100%;
            height: 100%;
          }
          .seat-box {
            display: flex;
            width: 100%;
            justify-content: space-around;
            text-align: center;
            background: rgba(0,0,0,0.1);
            border-radius: 10px;
            padding: 8px 4px;
            margin-top: 12px;
          }
          .seat-col p { margin: 0; }
          .seat-label { font-size: 10px; font-weight: 800; color: #6B0F24; text-transform: uppercase; }
          .seat-val { font-size: 18px; font-weight: 900; color: #1A1208; }
          .serial { font-family: monospace; font-size: 11px; font-weight: bold; margin-top: 8px; color: #3D2A0F; }
          .attendee { font-size: 12px; font-weight: bold; color: #1A1208; }
          .center-body {
            flex: 1;
            padding: 24px 28px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .domain { font-size: 11px; font-weight: 900; letter-spacing: 1.5px; color: #1C150A; }
          .badge {
            background: #6B0F24;
            color: #ffffff;
            font-size: 10px;
            font-weight: 900;
            padding: 4px 12px;
            border-radius: 9999px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .event-title {
            font-size: 26px;
            font-weight: 900;
            margin: 14px 0;
            color: #160F06;
            line-height: 1.2;
          }
          .meta-row { font-size: 13px; font-weight: 800; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
          .meta-date { color: #6B0F24; }
          .meta-other { color: #502A0B; }
          .stub-right {
            width: 220px;
            padding: 20px;
            background: linear-gradient(135deg, #6B0F24, #7F132C, #500B1B);
            color: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            border-left: 2px dashed rgba(255,255,255,0.3);
            text-align: center;
          }
          .pass-tag { font-size: 11px; font-weight: 900; letter-spacing: 1.5px; color: #F5C862; }
          .price-large { font-size: 24px; font-weight: 900; color: #F5C862; margin: 10px 0 4px; }
          .barcode { display: flex; justify-content: center; gap: 3px; margin-top: 10px; opacity: 0.85; }
          .bar { background: #ffffff; height: 32px; border-radius: 1px; }
          .bottom-slogan {
            text-align: center;
            font-size: 10px;
            font-weight: 800;
            color: #E5A93C;
            margin-top: 8px;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="ticket-wrapper">
          <div class="ticket-card">
            <!-- Left QR Stub -->
            <div class="stub-left">
              <div class="qr-box">
                ${qrSvg || ''}
              </div>
              <div class="seat-box">
                <div class="seat-col">
                  <p class="seat-label">Row</p>
                  <p class="seat-val">${rowNumber}</p>
                </div>
                <div class="seat-col">
                  <p class="seat-label">Seat</p>
                  <p class="seat-val">${seatNumber}</p>
                </div>
              </div>
              <div class="serial">#${ticketNo.slice(-8)}</div>
              <div class="attendee">${attendeeName}</div>
            </div>

            <!-- Center Stage Details -->
            <div class="center-body">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="domain">WWW.TRIBESANDCLIQS.COM</span>
                <span class="badge">${tierName}</span>
              </div>
              <div class="event-title">${title}</div>
              <div>
                <div class="meta-row meta-date">📅 ${dateStr}</div>
                <div class="meta-row meta-other">⏰ ${timeStr}</div>
                <div class="meta-row meta-other">📍 ${venueStr}${cityStr ? ', ' + cityStr : ''}</div>
              </div>
            </div>

            <!-- Right Stub -->
            <div class="stub-right">
              <div>
                <div class="pass-tag">★ ADMISSION PASS ★</div>
                <div style="font-size: 10px; opacity: 0.7; margin-top: 4px; text-transform: uppercase;">Tier &amp; Pricing</div>
                <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">${tierName}</div>
              </div>
              <div>
                <div class="price-large">${priceStr}</div>
                <div style="font-size: 10px; font-family: monospace; opacity: 0.8;">#${ticketNo.slice(-8)}</div>
              </div>
              <div class="barcode">
                <div class="bar" style="width: 4px;"></div>
                <div class="bar" style="width: 8px;"></div>
                <div class="bar" style="width: 3px;"></div>
                <div class="bar" style="width: 10px;"></div>
                <div class="bar" style="width: 4px;"></div>
                <div class="bar" style="width: 12px;"></div>
                <div class="bar" style="width: 6px;"></div>
                <div class="bar" style="width: 8px;"></div>
                <div class="bar" style="width: 4px;"></div>
                <div class="bar" style="width: 14px;"></div>
                <div class="bar" style="width: 8px;"></div>
              </div>
            </div>
          </div>
          <div class="bottom-slogan">
            ✔ SECURE YOUR SEAT &nbsp;|&nbsp; NON-REFUNDABLE &nbsp;|&nbsp; ★ GOOD MUSIC • GOOD VIBES • GOOD PEOPLE
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export default function TicketPass({ ticket, onDownload, onPrint }) {
  const event = ticket.event || {};
  const title = event.title || ticket.eventName || 'Live Concert Event';
  const dateStr = formatTicketDate(event.startDate || ticket.startDate || ticket.eventDate);
  const timeStr = event.startTime || ticket.startTime || '7:00 PM - 11:00 PM';
  const venueStr = event.venue || ticket.venue || 'Accra, Ghana';
  const cityStr = event.city || ticket.city || 'Accra';
  const tierName = getTicketTierName(ticket);
  const priceStr = formatTicketTierPrice(ticket);
  const ticketNo = getTicketCode(ticket);
  const seatNumber = ticket.seat || ticket.seatNumber || 'GA';
  const rowNumber = ticket.row || (seatNumber.includes('-') ? seatNumber.split('-')[0] : 'AAA');
  const attendeeName = getTicketAttendeeName(ticket);
  const customTemplateUrl = ticket.ticketTemplate || event.ticketTemplate || ticket.ticket_template || event.ticket_template;
  const ticketFileUrl = ticket.ticket_file_url || ticket.ticketFileUrl;
  const ticketFileName = ticket.ticket_file_name || ticket.ticketFileName;

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://tribesandcliqs.com';
  const qrValue = ticket.qrCode || ticket.qr_code || `${origin}/verify/${encodeURIComponent(ticketNo)}`;

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
      printTicketPass(ticket);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Hidden QR Code element used for canvas rendering */}
      <div className="hidden">
        <QRCodeSVG id={`ticket-qr-${ticket.id || 'export'}`} value={qrValue} size={256} level="H" includeMargin={false} />
      </div>

      {/* Main Ticket Pass Container */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-amber-500/30 bg-[#0F1215] p-3 select-none">
        
        {customTemplateUrl ? (
          /* ========================================================================= */
          /* ORGANIZER CUSTOM UPLOADED TICKET PASS DESIGN                             */
          /* ========================================================================= */
          <div className="relative rounded-2xl overflow-hidden min-h-[360px] md:min-h-[420px] flex flex-col md:flex-row bg-[#161D22] border border-amber-500/20 shadow-2xl">
            {/* Background Artwork */}
            <div className="absolute inset-0 z-0">
              <img
                src={customTemplateUrl}
                alt="Event Ticket Artwork"
                className="w-full h-full object-cover object-center filter brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0F1215]/95 via-[#0F1215]/60 to-[#0F1215]/95 md:from-[#0F1215]/90 md:via-[#0F1215]/30 md:to-[#0F1215]/95" />
            </div>

            {/* Left QR Stub with Glassmorphism */}
            <div className="relative z-10 md:w-72 p-6 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r-2 border-dashed border-white/20 bg-black/60 backdrop-blur-md">
              <div className="w-44 h-44 rounded-2xl bg-white p-3.5 shadow-2xl flex items-center justify-center border-2 border-amber-400/40">
                <QRCodeSVG value={qrValue} size={150} level="H" includeMargin={false} />
              </div>

              {/* Row & Seat */}
              <div className="mt-4 w-full flex items-center justify-around text-center py-2 px-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Row</p>
                  <p className="text-xl font-black text-white">{rowNumber}</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Seat</p>
                  <p className="text-xl font-black text-white">{seatNumber}</p>
                </div>
              </div>

              {/* Serial & Attendee */}
              <div className="mt-3 text-center">
                <p className="text-[11px] font-mono font-bold tracking-wider text-amber-300">#{ticketNo.slice(-8)}</p>
                <p className="text-xs font-bold text-white truncate max-w-[180px]">{attendeeName}</p>
              </div>
            </div>

            {/* Center Stage Event Details Over Custom Artwork */}
            <div className="relative z-10 flex-1 p-6 md:p-8 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 drop-shadow">
                  WWW.TRIBESANDCLIQS.COM
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black shadow-lg">
                  {tierName}
                </span>
              </div>

              <div className="my-6">
                <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white drop-shadow-lg leading-tight">
                  {title}
                </h2>
              </div>

              {/* Event Metadata */}
              <div className="space-y-2 text-xs md:text-sm font-bold text-white/90 drop-shadow">
                <div className="flex items-center gap-2 text-amber-300">
                  <Calendar className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="font-extrabold">{dateStr}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-white/70" />
                  <span>{timeStr}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0 text-white/70" />
                  <span className="truncate">{venueStr}{cityStr ? `, ${cityStr}` : ''}</span>
                </div>
              </div>
            </div>

            {/* Right Stub: Pricing & Security */}
            <div className="relative z-10 md:w-64 p-6 bg-black/75 backdrop-blur-md text-white flex flex-col items-center justify-between border-t md:border-t-0 md:border-l-2 border-dashed border-white/20">
              <div className="text-center">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                  ★ ADMISSION PASS ★
                </p>
                <div className="w-12 h-0.5 bg-amber-400/40 mx-auto my-2" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Tier &amp; Price</p>
                <p className="text-sm font-bold text-white mt-0.5 truncate max-w-[180px]">{tierName}</p>
              </div>

              <div className="my-4 text-center">
                <p className="text-2xl md:text-3xl font-black text-amber-400 tracking-tight">
                  {priceStr}
                </p>
                <p className="text-[10px] font-mono text-white/70 mt-1">#{ticketNo.slice(-8)}</p>
              </div>

              {/* Barcode */}
              <div className="w-full flex justify-center items-center gap-1 opacity-80 pt-2 border-t border-white/20">
                {[4, 8, 3, 10, 4, 12, 6, 8, 4, 14, 8, 4, 10, 4, 8, 12].map((w, idx) => (
                  <div key={idx} className="bg-white h-7 rounded-sm" style={{ width: `${w}px` }} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* DEFAULT CONCERT STUB DESIGN (GOLDEN & BURGUNDY)                           */
          /* ========================================================================= */
          <div className="relative rounded-2xl overflow-hidden flex flex-col md:flex-row bg-gradient-to-r from-[#D49A32] via-[#F3C760] to-[#D49A32] shadow-inner text-[#171007]">
            {/* Left Stub (QR + Seat + Serial) */}
            <div className="relative md:w-72 p-6 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r-2 border-dashed border-[#78450F]/40 bg-[#E8AF3E]/30 backdrop-blur-sm">
              <div className="hidden md:block absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0F1215] border border-amber-500/20" />

              <div className="w-44 h-44 rounded-2xl bg-white p-3.5 shadow-xl flex items-center justify-center border border-amber-900/10">
                <QRCodeSVG value={qrValue} size={150} level="H" includeMargin={false} />
              </div>

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

              <div className="mt-3 text-center">
                <p className="text-[11px] font-mono font-bold tracking-wider text-[#3D2A0F]">#{ticketNo.slice(-8)}</p>
                <p className="text-xs font-bold text-[#1A1208] truncate max-w-[180px]">{attendeeName}</p>
              </div>
            </div>

            {/* Center Main Stage */}
            <div className="relative flex-1 p-6 md:p-8 flex flex-col justify-between overflow-hidden">
              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-[12px] border-[#78280A]/10 pointer-events-none" />
              <div className="absolute right-14 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-[6px] border-[#78280A]/10 pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#1C150A]">
                  WWW.TRIBESANDCLIQS.COM
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#6B0F24] text-white shadow">
                  {tierName}
                </span>
              </div>

              <div className="my-5">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#160F06] leading-tight">
                  {title}
                </h2>
              </div>

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

            {/* Right Stub (Burgundy) */}
            <div className="relative md:w-64 p-6 bg-gradient-to-br from-[#6B0F24] via-[#7F132C] to-[#500B1B] text-white flex flex-col items-center justify-between border-t md:border-t-0 md:border-l-2 border-dashed border-white/30">
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

              <div className="w-full flex justify-center items-center gap-1 opacity-80 pt-2 border-t border-white/20">
                {[4, 8, 3, 10, 4, 12, 6, 8, 4, 14, 8, 4, 10, 4, 8, 12].map((w, idx) => (
                  <div key={idx} className="bg-white h-7 rounded-sm" style={{ width: `${w}px` }} />
                ))}
              </div>
            </div>
          </div>
        )}

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
        {ticketFileUrl && (
          <a
            href={ticketFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={ticketFileName || 'Official-Ticket-Pass'}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black text-sm font-extrabold hover:brightness-110 transition shadow-lg shadow-amber-500/20"
          >
            <FileText className="w-4 h-4" /> Download Official File ({ticketFileName?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Pass'})
          </a>
        )}
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
