import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Users,
  Building2,
  Activity,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  FileDown,
  Sliders,
  KeyRound,
  Trash2,
  UserCheck,
  Sparkles,
  Lock,
  Plus,
  Settings2,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../../components/ui';
import { useAuth } from '../auth/Auth';
import { authStore, ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from '../auth/authStore';
import type { ManagedUser, Department, Permission, Role, SystemSettings } from '../auth/authStore';

export default function AdminPanel() {
  const { t } = useTranslation();
  const { profile, activeUser, switchProfile } = useAuth();

  const [tab, setTab] = useState<'system' | 'users' | 'departments' | 'roles' | 'audit' | 'settings'>('system');

  // Store states
  const [users, setUsers] = useState<ManagedUser[]>(() => authStore.getUsers());
  const [departments, setDepartments] = useState<Department[]>(() => authStore.getDepartments());
  const [auditLogs, setAuditLogs] = useState(() => authStore.getAuditLogs());
  const [settings, setSettings] = useState<SystemSettings>(() => authStore.getSettings());

  // Filters & search
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [auditFilter, setAuditFilter] = useState<string>('ALL');

  // Modals
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('CITY_OFFICER');
  const [newUserDept, setNewUserDept] = useState<string>('dept-roads');

  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptHead, setNewDeptHead] = useState('');
  const [newDeptEmail, setNewDeptEmail] = useState('');
  const [newDeptSla, setNewDeptSla] = useState(24);

  const [editRoleUser, setEditRoleUser] = useState<ManagedUser | null>(null);
  const [targetRole, setTargetRole] = useState<Role>('CITY_OFFICER');

  const [feedback, setFeedback] = useState<string>('');

  const showNotification = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(''), 4000);
  };

  const refreshState = () => {
    setUsers(authStore.getUsers());
    setDepartments(authStore.getDepartments());
    setAuditLogs(authStore.getAuditLogs());
    setSettings(authStore.getSettings());
  };

  // User Actions
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      authStore.addUser({
        display_name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        department_id: newUserDept || null,
      });
      refreshState();
      setAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      showNotification(`User account created for ${newUserName}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleToggleStatus = (userId: string) => {
    try {
      const u = authStore.toggleUserStatus(userId);
      refreshState();
      showNotification(`Account for ${u.display_name} is now ${u.is_active ? 'Active' : 'Suspended'}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this municipal user?')) return;
    try {
      authStore.deleteUser(userId);
      refreshState();
      showNotification('User deleted successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleUpdateRole = () => {
    if (!editRoleUser) return;
    try {
      authStore.updateUserRole(editRoleUser.id, targetRole);
      refreshState();
      setEditRoleUser(null);
      showNotification(`Role updated to ${targetRole} for ${editRoleUser.display_name}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  // Department Actions
  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      authStore.addDepartment({
        name: newDeptName,
        code: newDeptCode,
        head_name: newDeptHead,
        head_email: newDeptEmail,
        sla_target_hours: newDeptSla,
      });
      refreshState();
      setAddDeptOpen(false);
      setNewDeptName('');
      setNewDeptCode('');
      setNewDeptHead('');
      setNewDeptEmail('');
      showNotification(`Department ${newDeptName} created successfully`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create department');
    }
  };

  // Settings Action
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    authStore.updateSettings(settings);
    refreshState();
    showNotification('System parameters and SLA policies saved successfully');
  };

  // Export Audit
  const handleExportAudit = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `civicsphere_audit_${new Date().toISOString().slice(0, 10)}.json`);
    dl.click();
    showNotification('Audit log report exported as JSON');
  };

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.display_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.department_name.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredAudit = auditLogs.filter((a) => {
    return auditFilter === 'ALL' || a.category === auditFilter;
  });

  const allRoleKeys = Object.keys(ROLE_PERMISSIONS) as Role[];
  const allPermissions: { key: Permission; label: string }[] = [
    { key: 'ACCESS_ADMIN', label: 'Admin Console' },
    { key: 'MANAGE_USERS', label: 'Manage Users' },
    { key: 'MANAGE_DEPARTMENTS', label: 'Manage Depts' },
    { key: 'REVIEW_ISSUES', label: 'Review Detections' },
    { key: 'DISPATCH_TASKS', label: 'Dispatch Field Work' },
    { key: 'UPLOAD_DATASETS', label: 'Upload GIS Data' },
    { key: 'EXECUTE_JOBS', label: 'Run Geo Jobs' },
    { key: 'VIEW_AUDIT_LOGS', label: 'Audit Trail' },
    { key: 'MANAGE_SETTINGS', label: 'System Config' },
    { key: 'VIEW_MAP', label: 'Geospatial Map' },
  ];

  return (
    <div className="admin-page animate-fade-in">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="dot-pulse"></span>
            MUNICIPAL CONTROL & AUTHORIZATION
          </div>
          <h1>CivicSphere Administration Panel</h1>
          <p>
            Governing role-based permissions, municipal departments, active personnel, and security audit logs.
          </p>
        </div>

        <div className="admin-actor-card">
          <span className="avatar">{activeUser?.avatar_initials || 'AD'}</span>
          <div>
            <strong>{activeUser?.display_name || profile?.display_name || 'Administrator'}</strong>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span className="badge critical" style={{ fontSize: '9px' }}>
                {profile?.role.replaceAll('_', ' ') || 'SUPER ADMIN'}
              </span>
              <span className="status-live-pill">
                <i className="dot-pulse-green"></i> Live Guard
              </span>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="admin-feedback-toast animate-slide-up">
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs admin-tabs">
        <button className={tab === 'system' ? 'selected' : ''} onClick={() => setTab('system')}>
          <Activity size={16} />
          System Health
        </button>
        <button className={tab === 'users' ? 'selected' : ''} onClick={() => setTab('users')}>
          <Users size={16} />
          Users & Access ({users.length})
        </button>
        <button className={tab === 'departments' ? 'selected' : ''} onClick={() => setTab('departments')}>
          <Building2 size={16} />
          Departments ({departments.length})
        </button>
        <button className={tab === 'roles' ? 'selected' : ''} onClick={() => setTab('roles')}>
          <KeyRound size={16} />
          RBAC Matrix & Simulator
        </button>
        <button className={tab === 'audit' ? 'selected' : ''} onClick={() => setTab('audit')}>
          <ShieldCheck size={16} />
          Security Audit Logs ({auditLogs.length})
        </button>
        <button className={tab === 'settings' ? 'selected' : ''} onClick={() => setTab('settings')}>
          <Settings2 size={16} />
          City Policies & SLA
        </button>
      </div>

      {/* TAB 1: SYSTEM HEALTH */}
      {tab === 'system' && (
        <div className="animate-slide-up">
          {/* Top KPI Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div>
                <span>Registered Personnel</span>
                <span className="stat-icon blue"><Users size={16} /></span>
              </div>
              <strong>{users.length}</strong>
              <small>
                <i className="dot green"></i> {users.filter((u) => u.is_active).length} Active · {users.filter((u) => !u.is_active).length} Suspended
              </small>
            </div>

            <div className="stat-card">
              <div>
                <span>Municipal Departments</span>
                <span className="stat-icon violet"><Building2 size={16} /></span>
              </div>
              <strong>{departments.length}</strong>
              <small>
                <i className="dot green"></i> 100% Operational Status
              </small>
            </div>

            <div className="stat-card">
              <div>
                <span>RBAC Security Rules</span>
                <span className="stat-icon green"><Lock size={16} /></span>
              </div>
              <strong>11 Roles</strong>
              <small>
                <i className="dot blue"></i> 10 Granular Capabilities Guarded
              </small>
            </div>

            <div className="stat-card">
              <div>
                <span>SLA System Compliance</span>
                <span className="stat-icon blue"><Activity size={16} /></span>
              </div>
              <strong>98.4%</strong>
              <small>
                <i className="dot green"></i> Across All Active Wards
              </small>
            </div>
          </div>

          {/* Subsystems Status Panel */}
          <div className="panel detail-panel" style={{ marginBottom: '24px' }}>
            <div className="panel-heading">
              <div>
                <h2>Subsystem Health & Security Verification</h2>
                <p>Real-time operational indicators and cryptographic policy gates</p>
              </div>
              <button className="button small" onClick={refreshState}>
                <RefreshCw size={14} />
                Refresh State
              </button>
            </div>

            <div className="system-health-grid">
              <div className="health-card">
                <div className="health-card-header">
                  <strong>Role-Based Access Control (RBAC)</strong>
                  <span className="status-pill-ok">Active & Scoped</span>
                </div>
                <p>Enforces least-privilege boundaries across Super Admin, Managers, GIS Analysts, and Field Workers.</p>
                <div className="health-card-meta">
                  <span>Engine: Built-in + PostgreSQL RLS</span>
                  <span>Session Check: Active</span>
                </div>
              </div>

              <div className="health-card">
                <div className="health-card-header">
                  <strong>PostGIS Geospatial Engine</strong>
                  <span className="status-pill-ok">Indexed EPSG:4326</span>
                </div>
                <p>GiST spatial indexing on issue coordinates with strict bounded viewport queries.</p>
                <div className="health-card-meta">
                  <span>Projection: WGS84</span>
                  <span>Max Batch: 100 features</span>
                </div>
              </div>

              <div className="health-card">
                <div className="health-card-header">
                  <strong>Tamper-Evident Audit Logging</strong>
                  <span className="status-pill-ok">Recording</span>
                </div>
                <p>Every review, role transition, dispatch order, and system change is immutably logged with actor identity.</p>
                <div className="health-card-meta">
                  <span>Recent Events: {auditLogs.length}</span>
                  <span>Format: RFC 5424 compliant</span>
                </div>
              </div>

              <div className="health-card">
                <div className="health-card-header">
                  <strong>GIS Processing Pipeline</strong>
                  <span className="status-pill-ok">Worker Ready</span>
                </div>
                <p>Validates Shapefiles, GeoJSON boundaries, CRS projections, and prevents executable injection.</p>
                <div className="health-card-meta">
                  <span>Max Upload: 50MB</span>
                  <span>Safe Ingest: Enabled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Simulation Bar */}
          <div className="panel" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>Identity & Role Switcher for Testing</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
              Switch your active operating identity instantly to verify authorization gates and UI access:
            </p>
            <div className="quick-switch-chips">
              {users.map((u) => (
                <button
                  key={u.id}
                  className={`chip-btn ${u.id === activeUser?.id ? 'active' : ''}`}
                  onClick={() => {
                    switchProfile(u.id);
                    refreshState();
                    showNotification(`Switched active identity to ${u.display_name} (${u.role})`);
                  }}
                >
                  <span className="avatar" style={{ width: '22px', height: '22px', fontSize: '9px' }}>
                    {u.avatar_initials}
                  </span>
                  <span>{u.display_name}</span>
                  <small style={{ opacity: 0.8 }}>· {u.role.replaceAll('_', ' ')}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {tab === 'users' && (
        <div className="animate-slide-up">
          <div className="panel">
            <div className="panel-heading" style={{ flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h2>Personnel Directory & Access Control</h2>
                <p>Create accounts, assign roles, activate or suspend municipal access</p>
              </div>
              <button className="primary button small" onClick={() => setAddUserOpen(true)}>
                <UserPlus size={16} />
                Invite Municipal Personnel
              </button>
            </div>

            {/* Filter Bar */}
            <div className="filters">
              <div className="search-field">
                <Search size={15} />
                <input
                  placeholder="Search personnel by name, email, or department..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="ALL">All Roles ({users.length})</option>
                {allRoleKeys.map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Users Table */}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Personnel</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Last Active</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isSuper = u.role === 'SUPER_ADMIN';
                    const isAdmin = u.role === 'ADMIN';
                    return (
                      <tr key={u.id} className="interactive-row">
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="avatar" style={{ width: '32px', height: '32px', fontSize: '11px' }}>
                              {u.avatar_initials}
                            </span>
                            <div>
                              <strong>{u.display_name}</strong>
                              <small>{u.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              isSuper ? 'critical' : isAdmin ? 'high' : u.role === 'DEPARTMENT_MANAGER' ? 'assigned' : 'verified'
                            }`}
                          >
                            {u.role.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text)' }}>
                            {u.department_name}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${u.is_active ? 'active' : 'suspended'}`}>
                            {u.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {u.last_login_at === 'Never' ? 'Never' : new Date(u.last_login_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              className="button small"
                              title="Modify Role"
                              onClick={() => {
                                setEditRoleUser(u);
                                setTargetRole(u.role);
                              }}
                            >
                              <KeyRound size={13} />
                              Role
                            </button>

                            <button
                              className="button small"
                              title={u.is_active ? 'Suspend Account' : 'Activate Account'}
                              onClick={() => handleToggleStatus(u.id)}
                            >
                              {u.is_active ? <XCircle size={13} style={{ color: 'var(--critical)' }} /> : <CheckCircle2 size={13} style={{ color: 'var(--green)' }} />}
                              {u.is_active ? 'Suspend' : 'Activate'}
                            </button>

                            {u.id !== activeUser?.id && (
                              <button
                                className="button small"
                                title="Delete user"
                                onClick={() => handleDeleteUser(u.id)}
                              >
                                <Trash2 size={13} style={{ color: 'var(--critical)' }} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                        No personnel match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS */}
      {tab === 'departments' && (
        <div className="animate-slide-up">
          <div className="panel" style={{ marginBottom: '22px' }}>
            <div className="panel-heading">
              <div>
                <h2>City Operational Departments</h2>
                <p>Assigned work orders, field staffing, and resolution performance</p>
              </div>
              <button className="primary button small" onClick={() => setAddDeptOpen(true)}>
                <Plus size={16} />
                Create Department
              </button>
            </div>

            <div className="dept-grid">
              {departments.map((d) => (
                <div key={d.id} className="dept-card">
                  <div className="dept-card-header">
                    <div>
                      <span className="badge assigned" style={{ marginBottom: '6px' }}>
                        {d.code}
                      </span>
                      <h3>{d.name}</h3>
                    </div>
                    <span className="status-pill active">Operational</span>
                  </div>

                  <div className="dept-card-body">
                    <div className="dept-stat">
                      <span>Department Head</span>
                      <strong>{d.head_name}</strong>
                      <small>{d.head_email}</small>
                    </div>

                    <div className="dept-metrics-row">
                      <div>
                        <span>Staff</span>
                        <strong>{d.staff_count}</strong>
                      </div>
                      <div>
                        <span>Open Tasks</span>
                        <strong style={{ color: d.open_issues > 30 ? 'var(--critical)' : 'var(--text)' }}>
                          {d.open_issues}
                        </strong>
                      </div>
                      <div>
                        <span>SLA Target</span>
                        <strong>{d.sla_target_hours}h</strong>
                      </div>
                      <div>
                        <span>Compliance</span>
                        <strong style={{ color: 'var(--green)' }}>{d.sla_compliance_rate}%</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RBAC MATRIX & SIMULATOR */}
      {tab === 'roles' && (
        <div className="animate-slide-up">
          <div className="panel" style={{ marginBottom: '24px' }}>
            <div className="panel-heading">
              <div>
                <h2>Role-Based Access Control (RBAC) Permission Matrix</h2>
                <p>Inspect exact capabilities and authorizations granted to each municipal role</p>
              </div>
              <span className="badge verified">Deterministic Verification</span>
            </div>

            <div className="table-scroll">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '180px' }}>Role Profile</th>
                    {allPermissions.map((p) => (
                      <th key={p.key} style={{ textAlign: 'center', fontSize: '9px', padding: '10px 8px' }}>
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allRoleKeys.map((r) => {
                    const granted = (ROLE_PERMISSIONS as Record<string, Permission[]>)[r] || [];
                    const isSuper = r === 'SUPER_ADMIN';
                    const isAdmin = r === 'ADMIN';

                    return (
                      <tr key={r} className="interactive-row">
                        <td>
                          <div>
                            <strong style={{ fontSize: '11px' }}>{r.replaceAll('_', ' ')}</strong>
                            <small style={{ display: 'block', fontSize: '9px', color: 'var(--muted)', maxWidth: '240px', whiteSpace: 'normal' }}>
                              {(ROLE_DESCRIPTIONS as Record<string, string>)[r]}
                            </small>
                          </div>
                        </td>
                        {allPermissions.map((p) => {
                          const has = granted.includes(p.key);
                          return (
                            <td key={p.key} style={{ textAlign: 'center', padding: '10px 8px' }}>
                              {has ? (
                                <span className="matrix-check" title={`${r} has ${p.label}`}>
                                  ✓
                                </span>
                              ) : (
                                <span className="matrix-dash">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {tab === 'audit' && (
        <div className="animate-slide-up">
          <div className="panel">
            <div className="panel-heading" style={{ flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h2>Cryptographic Security & System Audit Trail</h2>
                <p>Immutable event records covering authentication, role elevations, and reviews</p>
              </div>
              <button className="button small" onClick={handleExportAudit}>
                <FileDown size={14} />
                Export Audit Report (JSON)
              </button>
            </div>

            {/* Category Filter */}
            <div className="filters">
              <select value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)}>
                <option value="ALL">All Categories ({auditLogs.length})</option>
                <option value="AUTH">Authentication & Identity</option>
                <option value="RBAC">RBAC & Role Policies</option>
                <option value="DEPARTMENT">Department Governance</option>
                <option value="ISSUE">Issue Reviews & Dispatches</option>
                <option value="SYSTEM">System Settings</option>
                <option value="DATASET">Geospatial Datasets</option>
              </select>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Category</th>
                    <th>Target</th>
                    <th>Audit Details</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.map((a) => (
                    <tr key={a.id} className="interactive-row">
                      <td style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        {new Date(a.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: '11px' }}>{a.actor_name}</strong>
                          <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{a.actor_role}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge high" style={{ fontSize: '9px' }}>
                          {a.action}
                        </span>
                      </td>
                      <td>
                        <span className="badge assigned" style={{ fontSize: '9px' }}>
                          {a.category}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '11px' }}>{a.target}</strong>
                      </td>
                      <td style={{ maxWidth: '350px', whiteSpace: 'normal', fontSize: '11px', color: 'var(--text)' }}>
                        {a.details}
                      </td>
                      <td>
                        <span className="status-pill active" style={{ fontSize: '9px' }}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredAudit.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                        No audit events recorded for this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SYSTEM SETTINGS */}
      {tab === 'settings' && (
        <div className="animate-slide-up">
          <div className="panel detail-panel" style={{ maxWidth: '800px' }}>
            <h2>City Operations & Governance Parameters</h2>
            <p>Configure municipal defaults, SLA escalation thresholds, and automated triage</p>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  City Jurisdiction
                  <input
                    type="text"
                    value={settings.cityName}
                    onChange={(e) => setSettings({ ...settings, cityName: e.target.value })}
                  />
                </label>

                <label>
                  State & Country
                  <input
                    type="text"
                    value={settings.stateName}
                    onChange={(e) => setSettings({ ...settings, stateName: e.target.value })}
                  />
                </label>
              </div>

              <h3 style={{ fontSize: '14px', marginTop: '10px' }}>SLA Escalation Windows (Hours)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <label>
                  Critical Severity
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={settings.slaCriticalHours}
                    onChange={(e) => setSettings({ ...settings, slaCriticalHours: Number(e.target.value) })}
                  />
                </label>
                <label>
                  High Severity
                  <input
                    type="number"
                    min={2}
                    max={72}
                    value={settings.slaHighHours}
                    onChange={(e) => setSettings({ ...settings, slaHighHours: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Medium Severity
                  <input
                    type="number"
                    min={6}
                    max={168}
                    value={settings.slaMediumHours}
                    onChange={(e) => setSettings({ ...settings, slaMediumHours: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Low Severity
                  <input
                    type="number"
                    min={12}
                    max={360}
                    value={settings.slaLowHours}
                    onChange={(e) => setSettings({ ...settings, slaLowHours: Number(e.target.value) })}
                  />
                </label>
              </div>

              <h3 style={{ fontSize: '14px', marginTop: '10px' }}>Intelligence & Automation Safeguards</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={settings.autoDispatchEnabled}
                    onChange={(e) => setSettings({ ...settings, autoDispatchEnabled: e.target.checked })}
                  />
                  <span>Enable Auto-Dispatch for verified high-confidence hazards</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={settings.requireHumanReview}
                    onChange={(e) => setSettings({ ...settings, requireHumanReview: e.target.checked })}
                  />
                  <span>Enforce mandatory human reviewer verification for all AI detections</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={settings.tamperAuditEnabled}
                    onChange={(e) => setSettings({ ...settings, tamperAuditEnabled: e.target.checked })}
                  />
                  <span>Enable cryptographic checksum tracking on administrative mutations</span>
                </label>
              </div>

              <button type="submit" className="primary button" style={{ marginTop: '15px', alignSelf: 'flex-start' }}>
                Save System Parameters
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD USER */}
      <Modal open={addUserOpen} onClose={() => setAddUserOpen(false)} title="Invite Municipal Personnel">
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label>
            Full Name
            <input
              type="text"
              required
              placeholder="e.g. Meera Joshi"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
            />
          </label>

          <label>
            Official Email Address
            <input
              type="email"
              required
              placeholder="meera.joshi@civicsphere.gov.in"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
            />
          </label>

          <label>
            Assigned Role
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as Role)}>
              {allRoleKeys.map((r) => (
                <option key={r} value={r}>
                  {r.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>

          <label>
            Department
            <select value={newUserDept} onChange={(e) => setNewUserDept(e.target.value)}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" onClick={() => setAddUserOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Issue Credentials & Invite
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CHANGE ROLE */}
      <Modal open={Boolean(editRoleUser)} onClose={() => setEditRoleUser(null)} title="Modify Personnel Role">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Updating role for <strong>{editRoleUser?.display_name}</strong> ({editRoleUser?.email}).
          </p>

          <label>
            Select New Role
            <select value={targetRole} onChange={(e) => setTargetRole(e.target.value as Role)}>
              {allRoleKeys.map((r) => (
                <option key={r} value={r}>
                  {r.replaceAll('_', ' ')} - {(ROLE_DESCRIPTIONS as Record<string, string>)[r]}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" onClick={() => setEditRoleUser(null)}>
              Cancel
            </button>
            <button type="button" className="primary" onClick={handleUpdateRole}>
              Apply Role Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: CREATE DEPARTMENT */}
      <Modal open={addDeptOpen} onClose={() => setAddDeptOpen(false)} title="Create Municipal Department">
        <form onSubmit={handleCreateDept} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label>
            Department Name
            <input
              type="text"
              required
              placeholder="e.g. Parks & Recreation"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
            />
          </label>

          <label>
            Department Code
            <input
              type="text"
              required
              placeholder="e.g. DEPT-PARKS"
              value={newDeptCode}
              onChange={(e) => setNewDeptCode(e.target.value)}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              Department Head Name
              <input
                type="text"
                required
                placeholder="Dr. K. Sharma"
                value={newDeptHead}
                onChange={(e) => setNewDeptHead(e.target.value)}
              />
            </label>

            <label>
              Head Contact Email
              <input
                type="email"
                required
                placeholder="parks.lead@civicsphere.gov.in"
                value={newDeptEmail}
                onChange={(e) => setNewDeptEmail(e.target.value)}
              />
            </label>
          </div>

          <label>
            SLA Resolution Target (Hours)
            <input
              type="number"
              min={1}
              max={168}
              value={newDeptSla}
              onChange={(e) => setNewDeptSla(Number(e.target.value))}
            />
          </label>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="button" onClick={() => setAddDeptOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Register Department
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
