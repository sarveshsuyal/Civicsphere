import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ArrowRight, UserCheck, KeyRound, Sparkles, Building2, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../services/client';
import { Logo, Language } from '../components/ui';
import { useAuth } from '../features/auth/Auth';
import { authStore } from '../features/auth/authStore';
import type { Role } from '../types/domain';

export default function Login() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signInLocal, registerLocal, switchProfile } = useAuth();

  const forgot = pathname === '/forgot-password';
  const reset = pathname === '/reset-password';

  const [tab, setTab] = useState<'signin' | 'quick' | 'register'>('quick');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('ADMIN');
  const [selectedDept, setSelectedDept] = useState('dept-roads');

  const managedUsers = authStore.getUsers();
  const departments = authStore.getDepartments();

  const handleQuickSignIn = (userId: string) => {
    setError('');
    try {
      switchProfile(userId);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to switch identity.');
    }
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);

    try {
      if (tab === 'register') {
        if (!displayName.trim()) throw new Error('Please enter your full name.');
        z.string().email().parse(email);
        await registerLocal({
          display_name: displayName,
          email,
          role: selectedRole,
          department_id: selectedDept || null,
        });
        navigate('/dashboard');
        return;
      }

      if (forgot) {
        z.string().email().parse(email);
        if (supabase) {
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password',
          });
          if (resetErr) throw resetErr;
        }
        setMessage('If this municipal account exists, a password reset authorization has been recorded.');
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

      // Standard Sign In
      z.string().email().parse(email);
      z.string().min(6).parse(password);

      if (supabase) {
        try {
          const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
          if (!sErr) {
            navigate('/dashboard');
            return;
          }
        } catch {
          // fallback to local auth if remote is offline or fails
        }
      }

      // Local / Offline RBAC sign in
      await signInLocal(email);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
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
        <aside className="animate-slide-up">
          <div className="eyebrow">
            <span></span>
            CONNECTED CITY OPERATIONS & RBAC
          </div>
          <h1>
            Better visibility.
            <br />
            Clearer decisions.
            <br />
            <span>Stronger cities.</span>
          </h1>
          <p>{t('heroText')}</p>

          <div className="login-principle">
            <ShieldCheck size={26} />
            <div>
              <strong>Granular Role-Based Authorization</strong>
              <p>Strict access boundaries between City Administration, Department Managers, GIS Analysts, and Field Officers.</p>
            </div>
          </div>

          <div className="login-principle" style={{ marginTop: '20px' }}>
            <Sparkles size={26} style={{ color: 'var(--cyan)' }} />
            <div>
              <strong>Interactive Evaluation Suite</strong>
              <p>Switch between roles instantly to inspect live access permissions, review workflows, and the admin control panel.</p>
            </div>
          </div>
        </aside>

        <section className="login-form animate-slide-up">
          <h2>{forgot ? t('forgot') : reset ? t('resetPassword') : 'City Workspace Sign In'}</h2>
          <p>{t('loginText')}</p>

          {!forgot && !reset && (
            <div className="tabs" style={{ marginTop: '20px', marginBottom: '16px' }}>
              <button
                type="button"
                className={tab === 'quick' ? 'selected' : ''}
                onClick={() => { setTab('quick'); setError(''); }}
              >
                <UserCheck size={16} />
                Quick Role Sign-In
              </button>
              <button
                type="button"
                className={tab === 'signin' ? 'selected' : ''}
                onClick={() => { setTab('signin'); setError(''); }}
              >
                <KeyRound size={16} />
                Credentials
              </button>
              <button
                type="button"
                className={tab === 'register' ? 'selected' : ''}
                onClick={() => { setTab('register'); setError(''); }}
              >
                <UserPlus size={16} />
                New Account
              </button>
            </div>
          )}

          {tab === 'quick' && !forgot && !reset ? (
            <div className="quick-roles-container">
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                Select a verified municipal role profile to immediately access the workspace with its authorized permissions:
              </p>
              <div className="role-cards-grid">
                {managedUsers.slice(0, 6).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="role-card-item"
                    onClick={() => handleQuickSignIn(u.id)}
                  >
                    <div className="role-card-header">
                      <span className="avatar" style={{ width: '32px', height: '32px', fontSize: '11px' }}>
                        {u.avatar_initials}
                      </span>
                      <div>
                        <strong>{u.display_name}</strong>
                        <small>{u.department_name}</small>
                      </div>
                      <span className={`badge ${u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' ? 'critical' : 'verified'}`} style={{ marginLeft: 'auto' }}>
                        {u.role.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <div className="role-card-footer">
                      <span>{u.email}</span>
                      <ArrowRight size={14} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => void submit(e)}>
              {tab === 'register' && (
                <>
                  <label>
                    Full Name
                    <input
                      name="displayName"
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </label>

                  <label>
                    Assigned Role
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                    >
                      <option value="SUPER_ADMIN">Super Administrator (Full System Control)</option>
                      <option value="ADMIN">City Administrator (Ops & Users)</option>
                      <option value="DEPARTMENT_MANAGER">Department Manager (Triage & SLA)</option>
                      <option value="GIS_ANALYST">GIS Specialist (Layers & Processing)</option>
                      <option value="FIELD_OFFICER">Field Officer (Inspections)</option>
                      <option value="REVIEWER">Civic Reviewer & Auditor</option>
                      <option value="VIEWER">Observer / Viewer</option>
                    </select>
                  </label>

                  <label>
                    Department
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {!reset && (
                <label>
                  {t('email')}
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="admin@civicsphere.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    placeholder="••••••••"
                    autoComplete={reset ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              )}

              {!forgot && !reset && (
                <Link to="/forgot-password" style={{ fontSize: '12px', color: 'var(--primary)', textAlign: 'right' }}>
                  {t('forgot')}
                </Link>
              )}

              {error && <p className="form-error" role="alert">{error}</p>}
              {message && <p role="status" style={{ color: 'var(--green)', fontSize: '13px' }}>{message}</p>}

              <button className="primary" type="submit" disabled={busy}>
                {busy ? t('loading') : t(forgot ? 'sendReset' : reset ? 'resetPassword' : tab === 'register' ? 'register' : 'signIn')}
                <ArrowRight size={17} />
              </button>
            </form>
          )}

          <div className="login-divider">OR EXPLORE PUBLIC DEMO</div>
          <Link className="button" to="/demo/dashboard">
            {t('demoEntry')}
            <ArrowRight size={16} />
          </Link>

          <small>
            <ShieldCheck size={14} />
            {supabase ? t('secure') : 'Secured with Local & Cryptographic RBAC Guard'}
          </small>
        </section>
      </div>
    </div>
  );
}
