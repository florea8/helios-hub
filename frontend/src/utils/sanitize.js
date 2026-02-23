import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} dirty - Untrusted HTML string
 * @param {object} config - DOMPurify configuration options
 * @returns {string} - Sanitized HTML string
 */
export const sanitizeHtml = (dirty, config = {}) => {
  const defaultConfig = {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 
      'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'span', 'div', 'img'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    ...config
  };

  return DOMPurify.sanitize(dirty, defaultConfig);
};

/**
 * Sanitize plain text (strip all HTML)
 * @param {string} dirty - Untrusted text
 * @returns {string} - Plain text without HTML
 */
export const sanitizeText = (dirty) => {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize user input for safe display (allows basic formatting)
 * @param {string} dirty - User input
 * @returns {string} - Sanitized HTML with basic formatting
 */
export const sanitizeUserContent = (dirty) => {
  return sanitizeHtml(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitize markdown content
 * @param {string} dirty - Markdown content
 * @returns {string} - Sanitized HTML
 */
export const sanitizeMarkdown = (dirty) => {
  return sanitizeHtml(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
      'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};

/**
 * Escape special characters for safe display in HTML attributes
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize URL to prevent javascript: and data: URIs
 * @param {string} url - URL to sanitize
 * @returns {string} - Safe URL or empty string
 */
export const sanitizeUrl = (url) => {
  if (!url) return '';
  
  const sanitized = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (
    sanitized.startsWith('javascript:') ||
    sanitized.startsWith('data:') ||
    sanitized.startsWith('vbscript:')
  ) {
    return '';
  }
  
  return url;
};
