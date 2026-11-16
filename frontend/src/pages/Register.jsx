import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import AuthLayout from '../components/AuthLayout';
import PasswordInput from '../components/PasswordInput';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/auth/register', { username, email, password });
      navigate('/login', { state: { registered: true, email } });
    } catch (err) {
      setError(errorMessage(err, 'Could not create your account. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      label="helios / new account"
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account? <Link to="/login" className="link">Sign in</Link>
        </>
      }
    >
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="label">Username</span>
          <input
            className="field-input"
            type="text"
            autoComplete="username"
            placeholder="How others will see you"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_.\-]+"
            title="Letters, numbers, dots, hyphens and underscores"
            required
            autoFocus
          />
          <span className="field-hint">3 to 30 characters: letters, numbers, dots, hyphens, underscores.</span>
        </label>
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
          />
        </label>
        <label className="field">
          <span className="label">Password</span>
          <PasswordInput
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            maxLength={100}
            required
          />
        </label>
        <button type="submit" className="button button-primary button-block" disabled={submitting}>
          {submitting && <span className="button-spinner" aria-hidden="true" />}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
