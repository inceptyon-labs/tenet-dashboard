import { useState, type FormEvent } from 'react';
import { login } from '../lib/api';
import { colors, fontFamily } from '../lib/theme';
import { TenetWordmark } from '../components/TenetWordmark';

interface LoginProps {
  onAuthenticated: () => void;
}

export function Login({ onAuthenticated }: LoginProps) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(password);
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.base,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: fontFamily.sans,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 360,
          backgroundColor: colors.card,
          border: colors.cardBorder,
          borderRadius: 12,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <TenetWordmark />
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ color: colors.textMuted, fontSize: 12, letterSpacing: 0.4 }}>
            Password
          </span>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            style={{
              backgroundColor: colors.inputBg,
              border: colors.inputBorder,
              borderRadius: 8,
              padding: '10px 12px',
              color: colors.textPrimary,
              fontSize: 14,
              fontFamily: fontFamily.sans,
              outline: 'none',
            }}
          />
        </label>
        {error && (
          <div style={{ color: '#F09595', fontSize: 12 }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={!password || submitting}
          style={{
            backgroundColor: '#378ADD',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 14,
            fontFamily: fontFamily.sans,
            fontWeight: 600,
            cursor: submitting || !password ? 'not-allowed' : 'pointer',
            opacity: submitting || !password ? 0.6 : 1,
          }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
