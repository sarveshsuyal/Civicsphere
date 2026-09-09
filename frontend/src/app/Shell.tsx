import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Map,
  TriangleAlert,
  ScanLine,
  Database,
  ClipboardList,
  ShieldCheck,
  ChartNoAxesCombined,
  FileText,
  Bell,
  Settings,
  HelpCircle,
  Search,
  ChevronDown,
  Menu,
  ArrowUpRight,
  LogOut,
  Clock3,
  UserCheck,
} from 'lucide-react';
import { Logo, Language, Modal } from '../components/ui';
import { useAuth } from '../features/auth/Auth';
import { authStore } from '../features/auth/authStore';
import { demoIssues } from '../services/demo';
import { permitted, adminRoles } from '../types/domain';

const groups: { label: string; items: [string, typeof LayoutDashboard][] }[] = [
  {
    label: 'workspace',
    items: [
      ['dashboard', LayoutDashboard],
      ['map', Map],
      ['issues', TriangleAlert],
      ['reviews', ScanLine],
      ['datasets', Database],
      ['jobs', Clock3],
      ['tasks', ClipboardList],
      ['audit', ShieldCheck],
    ],
  },
  {
    label: 'intelligence',
    items: [
      ['risk', ShieldCheck],
      ['analytics', ChartNoAxesCombined],
      ['reports', FileText],
      ['alerts', Bell],
    ],
  },
];

export default function Shell() {
  const { t } = useTranslation();
  const location = useLocation();
  const demo = location.pathname.startsWith('/demo');
  const base = demo ? '/demo' : '';
  const { profile, activeUser, switchProfile, signOut } = useAuth();
  const [command, setCommand] = useState(false);
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const navigate = useNavigate();

  const allUsers = authStore.getUsers();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommand((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => setMenu(false), [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="app-shell animate-fade-in">
      <aside className={`sidebar ${menu ? 'mobile-open' : ''}`}>
        <Logo />
        <button className="city-switch" onClick={() => navigate(base + '/map')}>
          <span className="city-avatar">A</span>
          <span>
            <strong>{t('city')}</strong>
            <small>{t('citySub')}</small>
          </span>
          <ChevronDown size={15} />
        </button>

        {groups.map((g) => (
          <div className="nav-group" key={g.label}>
            <div className="nav-label">{t(g.label)}</div>
            {g.items.map(([name, Icon]) => (
              <NavLink to={`${base}/${name}`} key={name} className="nav-link">
                <Icon size={18} />
                <span>{t(name)}</span>
                {demo && name === 'reviews' && <b>3</b>}
                {demo && name === 'alerts' && <i className="dot red dot-pulse" />}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="nav-group">
          <div className="nav-label">{t('management')}</div>
          {(demo || permitted(profile, adminRoles)) && (
            <NavLink to={`${base}/admin`} className="nav-link">
              <Settings size={18} />
              <span>{t('admin')}</span>
              <span className="badge high" style={{ marginLeft: 'auto', fontSize: '8px', padding: '2px 5px' }}>
                RBAC
              </span>
            </NavLink>
          )}
          <NavLink to={`${base}/help`} className="nav-link">
            <HelpCircle size={18} />
            <span>{t('help')}</span>
          </NavLink>
        </div>

        <div className="sidebar-bottom">
          <div className="workspace-status">
            <ShieldCheck size={17} />
            <span>{demo ? t('readOnly') : `Auth: ${profile?.role.replaceAll('_', ' ') || 'Live'}`}</span>
          </div>

          <button
            type="button"
            className="user-profile interactive-card"
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => setRoleModalOpen(true)}
            title="Click to switch active role or inspect permissions"
          >
            <span className="avatar">
              {activeUser?.avatar_initials || (demo ? 'CV' : profile?.display_name?.slice(0, 2).toUpperCase() || 'CS')}
            </span>
            <span>
              <strong>{activeUser?.display_name || (demo ? 'City explorer' : profile?.display_name)}</strong>
              <small>{demo ? 'Demo access' : profile?.role.replaceAll('_', ' ')}</small>
            </span>
            <UserCheck size={15} style={{ color: 'var(--primary)' }} />
          </button>
        </div>
      </aside>

      {menu && <button className="mobile-overlay" aria-label={t('close')} onClick={() => setMenu(false)} />}

      <div className="main-shell">
        <header className="app-header">
          <button className="mobile-menu icon-button" aria-label={t('navigation')} onClick={() => setMenu((v) => !v)}>
            <Menu />
          </button>

          <div className="breadcrumb">
            {t('city')}
            <span>/</span>
            <strong>{t(location.pathname.split('/').filter(Boolean)[demo ? 1 : 0] || 'dashboard')}</strong>
          </div>

          <div className="header-actions">
            {/* Active Role Quick Indicator */}
            <button
              className="role-selector-pill"
              onClick={() => setRoleModalOpen(true)}
              title="Click to switch role"
            >
              <span className="dot-pulse-green"></span>
              <span className="role-pill-text">{profile?.role.replaceAll('_', ' ') || 'GUEST'}</span>
              <ChevronDown size={13} />
            </button>

            <button className="search-trigger" onClick={() => setCommand(true)}>
              <Search size={16} />
              <span>{t('search')}</span>
              <kbd>⌘ K</kbd>
            </button>

            <Language />

            <Link to={`${base}/alerts`} className="icon-button" aria-label={t('alerts')}>
              <Bell size={18} />
            </Link>

            <button className="icon-button" aria-label={t('logout')} onClick={handleLogout} title={t('logout')}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {demo && (
          <div className="demo-banner">
            <span>
              <i className="dot blue dot-pulse" />
              {t('demoLabel')}
            </span>
            <Link to="/login">
              {t('signIn')}
              <ArrowUpRight size={13} />
            </Link>
          </div>
        )}

        <main className="workspace animate-fade-in">
          <Outlet />
        </main>

        <div className="workspace-footer">
          <span>CivicSphere · {t('footer')}</span>
          <span>Human-led. Evidence-backed. Deterministic RBAC.</span>
        </div>
      </div>

      {/* Command Palette */}
      <Modal open={command} onClose={() => setCommand(false)} title={t('commandTitle')}>
        <input
          autoFocus
          placeholder={t('search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="command-results">
          {groups
            .flatMap((g) => g.items)
            .filter(([name]) => t(name).toLowerCase().includes(query.toLowerCase()))
            .map(([name, Icon]) => (
              <button
                key={name}
                onClick={() => {
                  navigate(`${base}/${name}`);
                  setCommand(false);
                }}
              >
                <Icon size={17} />
                {t(name)}
                <ArrowUpRight size={15} />
              </button>
            ))}
          {demo &&
            query &&
            demoIssues
              .filter((i) => `${i.title} ${i.issue_id} ${i.ward}`.toLowerCase().includes(query.toLowerCase()))
              .map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    navigate(`/demo/issues/${i.id}`);
                    setCommand(false);
                  }}
                >
                  {i.issue_id} · {i.title}
                </button>
              ))}
        </div>
        <p className="muted">{t('commandHelp')}</p>
      </Modal>

      {/* Role Switcher & Identity Modal */}
      <Modal open={roleModalOpen} onClose={() => setRoleModalOpen(false)} title="Active Role & Identity Switcher">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Switch your active personnel profile to test role authorization, permission gating, and municipal views in real-time:
          </p>

          <div className="role-switcher-grid">
            {allUsers.map((u) => {
              const isCurrent = u.id === activeUser?.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  className={`role-switcher-option ${isCurrent ? 'selected' : ''}`}
                  onClick={() => {
                    switchProfile(u.id);
                    setRoleModalOpen(false);
                  }}
                >
                  <span className="avatar" style={{ width: '30px', height: '30px', fontSize: '11px' }}>
                    {u.avatar_initials}
                  </span>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '12px' }}>{u.display_name}</strong>
                    <span style={{ display: 'block', fontSize: '10px', color: 'var(--muted)' }}>
                      {u.department_name}
                    </span>
                  </div>
                  <span
                    className={`badge ${
                      u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' ? 'critical' : 'verified'
                    }`}
                    style={{ fontSize: '9px' }}
                  >
                    {u.role.replaceAll('_', ' ')}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" onClick={() => setRoleModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
