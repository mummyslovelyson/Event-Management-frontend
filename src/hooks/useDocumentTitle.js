import { useEffect } from 'react';

/**
 * Custom React hook for dynamic document title and meta description updates.
 *
 * @param {string} title - Page title to display in browser tab
 * @param {string} [description] - Optional meta description for SEO
 */
export function useDocumentTitle(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    const baseTitle = 'Tribes & Cliqs';

    if (title) {
      document.title = title.includes(baseTitle) ? title : `${title} | ${baseTitle}`;
    }

    let metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute('content') : '';

    if (description) {
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }

    return () => {
      document.title = prevTitle;
      if (metaDesc && prevDesc) {
        metaDesc.setAttribute('content', prevDesc);
      }
    };
  }, [title, description]);
}

export default useDocumentTitle;
