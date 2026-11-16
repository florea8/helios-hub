import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      await login(res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'That email and password do not match. Check them and try again.'
          : errorMessage(err, 'Could not sign you in. Please try again.')
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      label="helios / sign in"
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          New to Helios? <Link to="/register" className="link">Create an account</Link>
        </>
      }
    >
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      {!error && state?.registered && (
        <div className="notice notice-success" role="status">
          Your account is ready. Sign in to get started.
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="label">Email</span>
          <input
            className="field-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus={!state?.email}
          />
        </label>
        <label className="field">
          <span className="label">Password</span>
          <PasswordInput
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus={Boolean(state?.email)}
          />
        </label>
        <button type="submit" className="button button-primary button-block" disabled={submitting}>
          {submitting && <span className="button-spinner" aria-hidden="true" />}
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
