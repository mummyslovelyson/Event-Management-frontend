/**
 * Robust media URL helper
 * Normalizes uploaded image, pass, and banner URLs across localhost, production,
 * and relative upload paths.
 */
export function getMediaUrl(url, fallback = '') {
  if (!url) return fallback;
  if (typeof url !== 'string') return fallback;

  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // Data URLs or blob URLs from local file pickers
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // If already absolute URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it points to an old offline render backend URL, route to current backend/uploads
    if (trimmed.includes('trip-and-cliqs-backend.onrender.com/uploads/')) {
      const filename = trimmed.split('/uploads/').pop();
      const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
      return `${backendBase}/uploads/${filename}`;
    }
    return trimmed;
  }

  // Static frontend assets (e.g. /assets/images/...)
  if (trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  // Relative path (e.g. /uploads/xyz.png or uploads/xyz.png)
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${backendBase}${cleanPath}`;
}
