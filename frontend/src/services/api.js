import axios from 'axios';

const api = axios.create({
  // Fallback to local backend if env var missing so buttons like "Create Room" keep working
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Picks the most specific message the API sent: a validation detail, then
// the error text, then whatever plain-text body a rate limiter returned.
export const errorMessage = (err, fallback) => {
  const data = err.response?.data;
  if (!data) return 'Could not reach the server. Check your connection and try again.';
  if (typeof data === 'string') return data;
  const detail = Array.isArray(data.details) ? data.details[0]?.message : null;
  return detail || data.error || data.message || fallback;
};

export default api;