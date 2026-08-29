export function formatCurrency(amount, currency = 'GHS') {
  const num = Number(amount) || 0;
  try {
    if (currency === 'GHS') {
      return `₵${num.toFixed(2)}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(num);
  } catch {
    return `₵${num.toFixed(2)}`;
  }
}

export function formatDate(dateString, options = {}) {
  if (!dateString) return 'TBA';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'TBA';
  return date.toLocaleDateString('en-US', {
    weekday: options.weekday ?? 'short',
    month: options.month ?? 'short',
    day: options.day ?? 'numeric',
    year: options.year ?? 'numeric',
    ...options,
  });
}

export function formatTime(timeString) {
  if (!timeString) return '';
  return timeString;
}

export default { formatCurrency, formatDate, formatTime };
