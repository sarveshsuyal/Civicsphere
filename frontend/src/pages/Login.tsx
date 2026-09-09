import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ArrowRight, Lock, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { Logo, Language } from '../components/ui';
import { useAuth } from '../features/auth/Auth';
import { supabase } from '../services/client';

export default function Login() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const forgot = pathname === '/forgot-password';
  const reset = pathname === '/reset-password';

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fillCredentials = (userEmail: string, pass: string) => {
    setEmail(userEmail);
    setPassword(pass);
    setError('');
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);

    try {
      if (forgot) {
        z.string().email().parse(email);
        if (supabase) {
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
          });
          if (resetErr) throw resetErr;
        }
        setMessage('If an account exists for this address, a password reset link has been dispatched.');
        return;
      }

      if (reset) {
        z.string().min(8).max(128).parse(password);
        if (supabase) {
          const { error: updErr } = await supabase.auth.updateUser({ password });
          if (updErr) throw updErr;
        }
        setMessage('Password updated successfully. You can return to your workspace.');
        return;
      }

      // Validate inputs
      z.string().email().parse(email);
      z.string().min(6).parse(password);

      // Authenticate
      const prof = await signIn(email, password);

      // Navigate based on role
      if (prof.role === 'SUPER_ADMIN' || prof.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page animate-fade-in">
      <header>
        <Logo />
        <div className="header-actions">
          <Language />
        </div>
      </header>

      <div className="login-layout">
        <aside className="animate-slide-left">
          <div className="eyebrow">
            <span className="dot-pulse"></span>
            CONNECTED CITY OPERATIONS
          </div>
          <h1>
            Better visibility.
            <br />
            Clearer decisions.
            <br />
            <span>Stronger cities.</span>
          </h1>
          <p>{t('heroText')}</p>

          <div className="login-principle interactive-card">
            <ShieldCheck size={24} />
            <div>
              <strong>{t('accountable')}</strong>
              <p>{t('accountableText')}</p>
            </div>
          </div>
        </aside>

        <section className="login-form animate-slide-up">
          <h2>{t(forgot ? 'forgot' : reset ? 'resetPassword' : 'loginTitle')}</h2>
          <p>{t('loginText')}</p>

          <form onSubmit={(e) => void submit(e)}>
            {!reset && (
              <label>
                {t('email')}
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@city.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="interactive-input"
                />
              </label>
            )}

            {!forgot && (
              <label>
                {t('password')}
                <input
                  name="password"
                  type="password"
                  minLength={6}
                  maxLength={128}
                  required
                  autoComplete={reset ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="interactive-input"
                />
              </label>
            )}

            {!forgot && !reset && (
              <Link to="/forgot-password" style={{ alignSelf: 'flex-end', fontSize: '12px', color: 'var(--primary)' }}>
                {t('forgot')}
              </Link>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}
            {message && <p role="status" style={{ color: 'var(--green)', fontSize: '13px' }}>{message}</p>}

            <button className="primary" type="submit" disabled={busy}>
              {busy ? (
                t('loading')
              ) : (
                <>
                  {t(forgot ? 'sendReset' : reset ? 'resetPassword' : 'signIn')}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {!forgot && !reset && (
            <div className="demo-credentials-box animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <KeyRound size={13} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>
                  Test Credentials (Click to fill):
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="chip-btn"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => fillCredentials('admin@civicsphere.gov.in', 'Password123!')}
                >
                  <Lock size={11} />
                  Admin Account
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => fillCredentials('manager.transport@civicsphere.gov.in', 'Password123!')}
                >
                  Department Manager
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => fillCredentials('field.officer@civicsphere.gov.in', 'Password123!')}
                >
                  Field Officer
                </button>
              </div>
            </div>
          )}

          <div className="login-divider">CIVICSPHERE PREVIEW</div>
          <Link className="button" to="/demo/dashboard">
            {t('demoEntry')}
            <ArrowRight size={16} />
          </Link>
          <small>
            <ShieldCheck size={14} />
            {t('secure')}
          </small>
        </section>
      </div>
    </div>
  );
}
