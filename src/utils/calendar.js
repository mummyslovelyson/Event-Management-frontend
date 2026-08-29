/**
 * Calendar link generator & .ics file exporter for Tribes & Cliqs events.
 */

function formatIsoForCalendar(dateStr, timeStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  if (timeStr) {
    const [hours, minutes] = timeStr.split(':');
    if (hours !== undefined && minutes !== undefined) {
      d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }
  }
  return d.toISOString().replace(/-|:|\.\d+/g, '');
}

function getEndIsoForCalendar(dateStr, timeStr, endDateStr, endTimeStr) {
  if (endDateStr) {
    return formatIsoForCalendar(endDateStr, endTimeStr || timeStr);
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':');
    if (hours !== undefined && minutes !== undefined) {
      d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    }
  }
  // Default duration: 3 hours
  d.setHours(d.getHours() + 3);
  return d.toISOString().replace(/-|:|\.\d+/g, '');
}

export function getGoogleCalendarUrl(event) {
  const start = formatIsoForCalendar(event.startDate || event.start_date, event.startTime || event.start_time);
  const end = getEndIsoForCalendar(event.startDate || event.start_date, event.startTime || event.start_time, event.endDate || event.end_date, event.endTime || event.end_time);
  const title = encodeURIComponent(event.title || 'Event');
  const details = encodeURIComponent(`${event.description || ''}\n\nBooked on Tribes & Cliqs: ${window.location.origin}/events/${event.id}`);
  const location = encodeURIComponent(`${event.venue || ''}, ${event.city || ''}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

export function getOutlookCalendarUrl(event) {
  const start = formatIsoForCalendar(event.startDate || event.start_date, event.startTime || event.start_time);
  const end = getEndIsoForCalendar(event.startDate || event.start_date, event.startTime || event.start_time, event.endDate || event.end_date, event.endTime || event.end_time);
  const title = encodeURIComponent(event.title || 'Event');
  const details = encodeURIComponent(`${event.description || ''}\n\nBooked on Tribes & Cliqs`);
  const location = encodeURIComponent(`${event.venue || ''}, ${event.city || ''}`);

  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&startdt=${start}&enddt=${end}&body=${details}&location=${location}`;
}

export function downloadIcsFile(event) {
  const start = formatIsoForCalendar(event.startDate || event.start_date, event.startTime || event.start_time);
  const end = getEndIsoForCalendar(event.startDate || event.start_date, event.startTime || event.start_time, event.endDate || event.end_date, event.endTime || event.end_time);
  const title = (event.title || 'Event').replace(/,/g, '\\,');
  const description = (event.description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,');
  const location = `${event.venue || ''}, ${event.city || ''}`.replace(/,/g, '\\,');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tribes and Cliqs//Event Ticketing//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id || Date.now()}@tribesandcliqs.com`,
    `DTSTAMP:${formatIsoForCalendar(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `URL:${window.location.origin}/events/${event.id}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${(event.title || 'event').toLowerCase().replace(/\s+/g, '-')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
