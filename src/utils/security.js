/**
 * Security & Sanitization Utilities for Frontend Client
 */

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Validates and sanitizes a URL before opening or rendering in <a href="...">
 * Prevents javascript: or data: XSS vectors.
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed; // Relative links are safe
  }
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (SAFE_PROTOCOLS.has(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    // Malformed URL
  }
  return '#';
}

/**
 * HTML entity encoder to neutralize raw user strings before insertion
 */
export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
