// SQLite's CURRENT_TIMESTAMP and datetime('now') give UTC without saying so ("2026-11-17 14:05:00").
// A browser reads that as local time, which puts every timestamp off by the time-zone offset.
export const parseTime = (value) => {
  if (typeof value !== 'string') return new Date(value);
  // A bare date such as a task's due date is a calendar day, not an instant.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) return new Date(value.replace(' ', 'T') + 'Z');
  return new Date(value);
};

export const formatDate = (value, options = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  parseTime(value).toLocaleDateString('en-US', options);

export const formatDateTime = (value) =>
  parseTime(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const timeAgo = (value) => {
  const seconds = Math.max(0, Math.floor((Date.now() - parseTime(value)) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(value);
};

export const lastSeen = (value) => (value ? `seen ${timeAgo(value)}` : 'offline');

// Today's date in the reader's own time zone, as YYYY-MM-DD.
export const today = () => {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
};
