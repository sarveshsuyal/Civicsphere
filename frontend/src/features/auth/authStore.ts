import type { Role, Profile } from '../../types/domain';
export type { Role, Profile };

export type Permission =
  | 'ACCESS_ADMIN'
  | 'MANAGE_USERS'
  | 'MANAGE_DEPARTMENTS'
  | 'REVIEW_ISSUES'
  | 'DISPATCH_TASKS'
  | 'UPLOAD_DATASETS'
  | 'EXECUTE_JOBS'
  | 'VIEW_AUDIT_LOGS'
  | 'MANAGE_SETTINGS'
  | 'VIEW_MAP'
  | 'VIEW_ISSUES';

export interface ManagedUser {
  id: string;
  email: string;
  password?: string;
  display_name: string;
  role: Role;
  department_id: string | null;
  department_name: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string;
  avatar_initials: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  head_name: string;
  head_email: string;
  staff_count: number;
  open_issues: number;
  sla_target_hours: number;
  sla_compliance_rate: number;
  is_active: boolean;
}

export interface AdminAuditEntry {
  id: string;
  timestamp: string;
  actor_name: string;
  actor_email: string;
  actor_role: Role;
  action: string;
  category: 'AUTH' | 'RBAC' | 'DEPARTMENT' | 'ISSUE' | 'SYSTEM' | 'DATASET';
  target: string;
  details: string;
  ip_address: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface SystemSettings {
  cityName: string;
  stateName: string;
  latitude: number;
  longitude: number;
  slaCriticalHours: number;
  slaHighHours: number;
  slaMediumHours: number;
  slaLowHours: number;
  autoDispatchEnabled: boolean;
  aiConfidenceThreshold: number;
  requireHumanReview: boolean;
  sessionTimeoutMinutes: number;
  mfaEnforced: boolean;
  tamperAuditEnabled: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'ACCESS_ADMIN',
    'MANAGE_USERS',
    'MANAGE_DEPARTMENTS',
    'REVIEW_ISSUES',
    'DISPATCH_TASKS',
    'UPLOAD_DATASETS',
    'EXECUTE_JOBS',
    'VIEW_AUDIT_LOGS',
    'MANAGE_SETTINGS',
    'VIEW_MAP',
    'VIEW_ISSUES',
  ],
  ADMIN: [
    'ACCESS_ADMIN',
    'MANAGE_USERS',
    'MANAGE_DEPARTMENTS',
    'REVIEW_ISSUES',
    'DISPATCH_TASKS',
    'UPLOAD_DATASETS',
    'EXECUTE_JOBS',
    'VIEW_AUDIT_LOGS',
    'VIEW_MAP',
    'VIEW_ISSUES',
  ],
  CITY_OFFICER: [
    'REVIEW_ISSUES',
    'DISPATCH_TASKS',
    'VIEW_AUDIT_LOGS',
    'VIEW_MAP',
    'VIEW_ISSUES',
  ],
  DEPARTMENT_MANAGER: [
    'REVIEW_ISSUES',
    'DISPATCH_TASKS',
    'VIEW_MAP',
    'VIEW_ISSUES',
  ],
  GIS_ANALYST: [
    'UPLOAD_DATASETS',
    'EXECUTE_JOBS',
    'VIEW_MAP',
    'VIEW_ISSUES',
  ],
  FIELD_OFFICER: [
    'VIEW_MAP',
    'VIEW_ISSUES',
  ],
  REVIEWER: [
    'REVIEW_ISSUES',
    'VIEW_AUDIT_LOGS',
    'VIEW_MAP',
    'VIEW_ISSUES',
  ],
  DATA_MANAGER: [
    'UPLOAD_DATASETS',
    'EXECUTE_JOBS',
    'VIEW_MAP',
    'VIEW_ISSUES',
  ],
  REPORT_ANALYST: [
    'VIEW_AUDIT_LOGS',
    'VIEW_MAP',
    'VIEW_ISSUES',
  ],
  VIEWER: [
    'VIEW_MAP',
    'VIEW_ISSUES',
  ],
  PUBLIC_USER: [
    'VIEW_MAP',
  ],
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: 'Complete executive authority, master policy control, and security configuration.',
  ADMIN: 'City-level administrative authority, user provisioning, and department oversight.',
  CITY_OFFICER: 'Cross-department operations coordination and high-priority issue dispatch.',
  DEPARTMENT_MANAGER: 'Departmental triage, team assignments, and SLA fulfillment oversight.',
  GIS_ANALYST: 'Spatial layers, CRS transformations, raster/vector ingestion, and map verification.',
  FIELD_OFFICER: 'On-the-ground inspection, mobile evidence capture, and completion verification.',
  REVIEWER: 'Accountable evaluation and sign-off on AI-detected anomalies and citizen signals.',
  DATA_MANAGER: 'Geospatial database synchronization, external catalog ingestion, and data pipelines.',
  REPORT_ANALYST: 'Statistical reporting, municipal trend analysis, and performance tracking.',
  VIEWER: 'Read-only observer access to municipal dashboards and public incident summaries.',
  PUBLIC_USER: 'Citizen portal view with limited public safety broadcasts and map boundaries.',
};

const DEFAULT_PASSWORD = 'Password123!';

const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-roads',
    code: 'DEPT-ROADS',
    name: 'Roads & Infrastructure',
    head_name: 'Priya Patel',
    head_email: 'priya.patel@civicsphere.gov.in',
    staff_count: 42,
    open_issues: 38,
    sla_target_hours: 24,
    sla_compliance_rate: 96.2,
    is_active: true,
  },
  {
    id: 'dept-health',
    code: 'DEPT-HEALTH',
    name: 'Public Health & Sanitation',
    head_name: 'Dr. Rajesh Verma',
    head_email: 'rajesh.verma@civicsphere.gov.in',
    staff_count: 68,
    open_issues: 54,
    sla_target_hours: 12,
    sla_compliance_rate: 94.8,
    is_active: true,
  },
  {
    id: 'dept-water',
    code: 'DEPT-WATER',
    name: 'Water Supply & Sewerage',
    head_name: 'Amitabh Joshi',
    head_email: 'amitabh.joshi@civicsphere.gov.in',
    staff_count: 35,
    open_issues: 22,
    sla_target_hours: 18,
    sla_compliance_rate: 98.1,
    is_active: true,
  },
  {
    id: 'dept-elec',
    code: 'DEPT-ELEC',
    name: 'Electrical & Street Lighting',
    head_name: 'Sunita Rao',
    head_email: 'sunita.rao@civicsphere.gov.in',
    staff_count: 28,
    open_issues: 17,
    sla_target_hours: 8,
    sla_compliance_rate: 97.4,
    is_active: true,
  },
  {
    id: 'dept-plan',
    code: 'DEPT-PLAN',
    name: 'Urban Planning & Zoning',
    head_name: 'Farooq Mansuri',
    head_email: 'farooq.mansuri@civicsphere.gov.in',
    staff_count: 19,
    open_issues: 9,
    sla_target_hours: 72,
    sla_compliance_rate: 99.0,
    is_active: true,
  },
  {
    id: 'dept-disaster',
    code: 'DEPT-DISASTER',
    name: 'Disaster & Emergency Response',
    head_name: 'Col. Sanjeev Nair',
    head_email: 'emergency@civicsphere.gov.in',
    staff_count: 55,
    open_issues: 4,
    sla_target_hours: 2,
    sla_compliance_rate: 99.8,
    is_active: true,
  },
];

const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'usr-sarvesh',
    email: 'admin@civicsphere.gov.in',
    password: DEFAULT_PASSWORD,
    display_name: 'Sarvesh Suyal',
    role: 'SUPER_ADMIN',
    department_id: null,
    department_name: 'Executive City Directorate',
    organization_id: 'org-ahmedabad',
    is_active: true,
    created_at: '2026-08-01T09:00:00Z',
    last_login_at: '2026-09-09T02:00:00Z',
    avatar_initials: 'SS',
  },
  {
    id: 'usr-aarav',
    email: 'operations@civicsphere.gov.in',
    password: DEFAULT_PASSWORD,
    display_name: 'Aarav Sharma',
    role: 'ADMIN',
    department_id: null,
    department_name: 'Municipal Operations Control',
    organization_id: 'org-ahmedabad',
    is_active: true,
    created_at: '2026-08-05T10:30:00Z',
    last_login_at: '2026-09-08T18:45:00Z',
    avatar_initials: 'AS',
  },
  {
    id: 'usr-priya',
    email: 'manager.transport@civicsphere.gov.in',
    password: DEFAULT_PASSWORD,
    display_name: 'Priya Patel',
    role: 'DEPARTMENT_MANAGER',
    department_id: 'dept-roads',
    department_name: 'Roads & Infrastructure',
    organization_id: 'org-ahmedabad',
    is_active: true,
    created_at: '2026-08-10T11:15:00Z',
    last_login_at: '2026-09-08T22:10:00Z',
    avatar_initials: 'PP',
  },
  {
    id: 'usr-vikram',
    email: 'gis@civicsphere.gov.in',
    password: DEFAULT_PASSWORD,
    display_name: 'Dr. Vikram Mehta',
    role: 'GIS_ANALYST',
    department_id: 'dept-plan',
    department_name: 'Urban Planning & Zoning',
    organization_id: 'org-ahmedabad',
    is_active: true,
    created_at: '2026-08-12T14:20:00Z',
    last_login_at: '2026-09-08T16:05:00Z',
    avatar_initials: 'VM',
  },
  {
    id: 'usr-ramesh',
    email: 'field.officer@civicsphere.gov.in',
    password: DEFAULT_PASSWORD,
    display_name: 'Ramesh Kumar',
    role: 'FIELD_OFFICER',
    department_id: 'dept-roads',
    department_name: 'Roads & Infrastructure',
    organization_id: 'org-ahmedabad',
    is_active: true,
    created_at: '2026-08-15T08:00:00Z',
    last_login_at: '2026-09-09T01:30:00Z',
    avatar_initials: 'RK',
  },
  {
    id: 'usr-ananya',
    email: 'auditor@civicsphere.gov.in',
    password: DEFAULT_PASSWORD,
    display_name: 'Ananya Desai',
    role: 'REVIEWER',
    department_id: null,
    department_name: 'Civic Accountability Bureau',
    organization_id: 'org-ahmedabad',
    is_active: true,
    created_at: '2026-08-18T13:45:00Z',
    last_login_at: '2026-09-08T19:20:00Z',
    avatar_initials: 'AD',
  },
  {
    id: 'usr-neha',
    email: 'neha.shah@civicsphere.gov.in',
    password: DEFAULT_PASSWORD,
    display_name: 'Neha Shah',
    role: 'DATA_MANAGER',
    department_id: 'dept-water',
    department_name: 'Water Supply & Sewerage',
    organization_id: 'org-ahmedabad',
    is_active: true,
    created_at: '2026-08-20T10:00:00Z',
    last_login_at: '2026-09-07T12:00:00Z',
    avatar_initials: 'NS',
  },
  {
    id: 'usr-alok',
    email: 'alok.gupta@civicsphere.gov.in',
    password: DEFAULT_PASSWORD,
    display_name: 'Alok Gupta',
    role: 'VIEWER',
    department_id: null,
    department_name: 'City Council Observer',
    organization_id: 'org-ahmedabad',
    is_active: true,
    created_at: '2026-08-25T15:30:00Z',
    last_login_at: '2026-09-06T09:15:00Z',
    avatar_initials: 'AG',
  },
];

const INITIAL_AUDIT_LOGS: AdminAuditEntry[] = [
  {
    id: 'aud-101',
    timestamp: '2026-09-09T01:45:12Z',
    actor_name: 'Sarvesh Suyal',
    actor_email: 'admin@civicsphere.gov.in',
    actor_role: 'SUPER_ADMIN',
    action: 'POLICY_ENFORCE',
    category: 'RBAC',
    target: 'Global RBAC Matrix',
    details: 'Verified strict role constraints and active privilege boundaries.',
    ip_address: '10.24.4.1',
    status: 'SUCCESS',
  },
  {
    id: 'aud-102',
    timestamp: '2026-09-08T23:14:30Z',
    actor_name: 'Priya Patel',
    actor_email: 'manager.transport@civicsphere.gov.in',
    actor_role: 'DEPARTMENT_MANAGER',
    action: 'DISPATCH_WORKORDER',
    category: 'ISSUE',
    target: 'CS-01042 (Pothole Cluster)',
    details: 'Dispatched emergency road crew #4 for Ellis Bridge asphalt sealing.',
    ip_address: '10.24.8.45',
    status: 'SUCCESS',
  },
  {
    id: 'aud-103',
    timestamp: '2026-09-08T21:05:18Z',
    actor_name: 'Dr. Vikram Mehta',
    actor_email: 'gis@civicsphere.gov.in',
    actor_role: 'GIS_ANALYST',
    action: 'DATASET_INGEST',
    category: 'DATASET',
    target: 'Ahmedabad_Wards_2026_EPSG4326.geojson',
    details: 'Uploaded municipal boundary polygons and verified EPSG:4326 projection.',
    ip_address: '10.24.12.19',
    status: 'SUCCESS',
  },
  {
    id: 'aud-104',
    timestamp: '2026-09-08T19:50:00Z',
    actor_name: 'Ananya Desai',
    actor_email: 'auditor@civicsphere.gov.in',
    actor_role: 'REVIEWER',
    action: 'VERIFY_DETECTION',
    category: 'ISSUE',
    target: 'CS-01045 (Exposed Wire Hazard)',
    details: 'Reviewed camera evidence, confirmed danger score 92, approved urgent dispatch.',
    ip_address: '10.24.16.88',
    status: 'SUCCESS',
  },
  {
    id: 'aud-105',
    timestamp: '2026-09-08T18:22:15Z',
    actor_name: 'Aarav Sharma',
    actor_email: 'operations@civicsphere.gov.in',
    actor_role: 'ADMIN',
    action: 'USER_ROLE_CHANGE',
    category: 'RBAC',
    target: 'Ramesh Kumar (field.officer@civicsphere.gov.in)',
    details: 'Promoted from VIEWER to FIELD_OFFICER upon field certification completion.',
    ip_address: '10.24.4.18',
    status: 'SUCCESS',
  },
];

const INITIAL_SETTINGS: SystemSettings = {
  cityName: 'Ahmedabad',
  stateName: 'Gujarat, India',
  latitude: 23.0225,
  longitude: 72.5714,
  slaCriticalHours: 2,
  slaHighHours: 8,
  slaMediumHours: 24,
  slaLowHours: 72,
  autoDispatchEnabled: true,
  aiConfidenceThreshold: 85,
  requireHumanReview: true,
  sessionTimeoutMinutes: 60,
  mfaEnforced: false,
  tamperAuditEnabled: true,
};

const STORAGE_KEYS = {
  USERS: 'civicsphere_users_v3',
  DEPARTMENTS: 'civicsphere_departments_v3',
  AUDIT: 'civicsphere_audit_v3',
  SETTINGS: 'civicsphere_settings_v3',
  SESSION_TOKEN: 'civicsphere_session_token_v3',
  CURRENT_USER_ID: 'civicsphere_session_user_v3',
};

const memStorage = new Map<string, string>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined' && localStorage?.getItem) {
      return localStorage.getItem(key);
    }
  } catch {
    // fallback
  }
  return memStorage.get(key) ?? null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage?.setItem) {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    // fallback
  }
  memStorage.set(key, value);
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage?.removeItem) {
      localStorage.removeItem(key);
      return;
    }
  } catch {
    // fallback
  }
  memStorage.delete(key);
}

class AuthStoreService {
  private users: ManagedUser[];
  private departments: Department[];
  private auditLogs: AdminAuditEntry[];
  private settings: SystemSettings;
  private activeUserId: string | null = null;
  private sessionToken: string | null = null;

  constructor() {
    this.users = this.loadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.departments = this.loadFromStorage(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
    this.auditLogs = this.loadFromStorage(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
    this.settings = this.loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);

    // Only restore session if both token AND active user exist
    const savedToken = safeGetItem(STORAGE_KEYS.SESSION_TOKEN);
    const savedUserId = safeGetItem(STORAGE_KEYS.CURRENT_USER_ID);

    if (savedToken && savedUserId && this.users.some(u => u.id === savedUserId && u.is_active)) {
      this.sessionToken = savedToken;
      this.activeUserId = savedUserId;
    } else {
      // Unauthenticated by default!
      this.sessionToken = null;
      this.activeUserId = null;
      safeRemoveItem(STORAGE_KEYS.SESSION_TOKEN);
      safeRemoveItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  }

  private loadFromStorage<T>(key: string, fallback: T): T {
    try {
      const raw = safeGetItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // ignore
    }
    return fallback;
  }

  private persist(key: string, data: unknown): void {
    try {
      safeSetItem(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  public isAuthenticated(): boolean {
    return Boolean(this.activeUserId && this.sessionToken);
  }

  public getCurrentUser(): ManagedUser | null {
    if (!this.activeUserId || !this.sessionToken) return null;
    return this.users.find(u => u.id === this.activeUserId && u.is_active) ?? null;
  }

  public getCurrentProfile(): Profile | null {
    const u = this.getCurrentUser();
    if (!u) return null;
    return {
      id: u.id,
      organization_id: u.organization_id,
      department_id: u.department_id,
      role: u.role,
      display_name: u.display_name,
      is_active: u.is_active,
    };
  }

  public authenticate(email: string, password: string): ManagedUser {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }
    if (!user.is_active) {
      throw new Error('This municipal account has been suspended by an administrator.');
    }

    const expectedPassword = user.password || DEFAULT_PASSWORD;
    if (password !== expectedPassword) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }

    const token = 'civic_token_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    this.sessionToken = token;
    this.activeUserId = user.id;
    safeSetItem(STORAGE_KEYS.SESSION_TOKEN, token);
    safeSetItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);

    user.last_login_at = new Date().toISOString();
    this.persist(STORAGE_KEYS.USERS, this.users);

    this.addAudit('AUTH_LOGIN', 'AUTH', user.email, `User ${user.display_name} signed in successfully.`);

    return user;
  }

  public logout(): void {
    const user = this.getCurrentUser();
    if (user) {
      this.addAudit('AUTH_LOGOUT', 'AUTH', user.email, `User ${user.display_name} signed out.`);
    }
    this.sessionToken = null;
    this.activeUserId = null;
    safeRemoveItem(STORAGE_KEYS.SESSION_TOKEN);
    safeRemoveItem(STORAGE_KEYS.CURRENT_USER_ID);
  }

  public switchActiveUser(userId: string): ManagedUser {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    const token = 'civic_token_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    this.sessionToken = token;
    this.activeUserId = user.id;
    safeSetItem(STORAGE_KEYS.SESSION_TOKEN, token);
    safeSetItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    this.addAudit(
      'AUTH_SWITCH',
      'AUTH',
      user.email,
      `Switched active role identity to ${user.display_name} (${user.role})`
    );
    return user;
  }

  public getUsers(): ManagedUser[] {
    return [...this.users];
  }

  public addUser(input: {
    display_name: string;
    email: string;
    role: Role;
    department_id: string | null;
    password?: string;
  }): ManagedUser {
    const existing = this.users.find(u => u.email.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      throw new Error(`A user with email "${input.email}" already exists.`);
    }

    const dept = this.departments.find(d => d.id === input.department_id);
    const initials = input.display_name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'CU';

    const newUser: ManagedUser = {
      id: 'usr-' + Date.now().toString(36),
      email: input.email.trim(),
      password: input.password || DEFAULT_PASSWORD,
      display_name: input.display_name.trim(),
      role: input.role,
      department_id: input.department_id,
      department_name: dept ? dept.name : 'Unassigned',
      organization_id: 'org-ahmedabad',
      is_active: true,
      created_at: new Date().toISOString(),
      last_login_at: 'Never',
      avatar_initials: initials,
    };

    this.users.unshift(newUser);
    this.persist(STORAGE_KEYS.USERS, this.users);

    this.addAudit(
      'USER_CREATE',
      'RBAC',
      newUser.email,
      `Created user ${newUser.display_name} with role ${newUser.role} in ${newUser.department_name}`
    );

    return newUser;
  }

  public updateUserRole(userId: string, role: Role): ManagedUser {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    const oldRole = user.role;
    user.role = role;
    this.persist(STORAGE_KEYS.USERS, this.users);

    this.addAudit(
      'ROLE_UPDATE',
      'RBAC',
      user.email,
      `Updated role for ${user.display_name} from ${oldRole} to ${role}`
    );

    return user;
  }

  public toggleUserStatus(userId: string): ManagedUser {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    user.is_active = !user.is_active;
    this.persist(STORAGE_KEYS.USERS, this.users);

    this.addAudit(
      user.is_active ? 'USER_ACTIVATE' : 'USER_SUSPEND',
      'RBAC',
      user.email,
      `Account ${user.is_active ? 'activated' : 'suspended'} for ${user.display_name}`
    );

    return user;
  }

  public deleteUser(userId: string): void {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    const user = this.users[idx];
    if (user.id === this.activeUserId) {
      throw new Error('You cannot delete the currently active user account.');
    }

    this.users.splice(idx, 1);
    this.persist(STORAGE_KEYS.USERS, this.users);

    this.addAudit(
      'USER_DELETE',
      'RBAC',
      user.email,
      `Deleted account for ${user.display_name} (${user.email})`
    );
  }

  public getDepartments(): Department[] {
    return [...this.departments];
  }

  public addDepartment(input: {
    name: string;
    code: string;
    head_name: string;
    head_email: string;
    sla_target_hours: number;
  }): Department {
    const dept: Department = {
      id: 'dept-' + Date.now().toString(36),
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      head_name: input.head_name.trim(),
      head_email: input.head_email.trim(),
      staff_count: 1,
      open_issues: 0,
      sla_target_hours: Number(input.sla_target_hours) || 24,
      sla_compliance_rate: 100.0,
      is_active: true,
    };

    this.departments.push(dept);
    this.persist(STORAGE_KEYS.DEPARTMENTS, this.departments);

    this.addAudit(
      'DEPT_CREATE',
      'DEPARTMENT',
      dept.name,
      `Created municipal department ${dept.name} (${dept.code}) under ${dept.head_name}`
    );

    return dept;
  }

  public getAuditLogs(): AdminAuditEntry[] {
    return [...this.auditLogs];
  }

  public addAudit(
    action: string,
    category: AdminAuditEntry['category'],
    target: string,
    details: string,
    status: AdminAuditEntry['status'] = 'SUCCESS'
  ): void {
    const active = this.getCurrentUser();
    const entry: AdminAuditEntry = {
      id: 'aud-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      timestamp: new Date().toISOString(),
      actor_name: active?.display_name || 'System / Unauthenticated',
      actor_email: active?.email || 'system@civicsphere.gov.in',
      actor_role: active?.role || 'PUBLIC_USER',
      action,
      category,
      target,
      details,
      ip_address: '10.24.4.1',
      status,
    };

    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 200) {
      this.auditLogs = this.auditLogs.slice(0, 200);
    }
    this.persist(STORAGE_KEYS.AUDIT, this.auditLogs);
  }

  public getSettings(): SystemSettings {
    return { ...this.settings };
  }

  public updateSettings(next: Partial<SystemSettings>): SystemSettings {
    this.settings = { ...this.settings, ...next };
    this.persist(STORAGE_KEYS.SETTINGS, this.settings);
    this.addAudit(
      'SETTINGS_UPDATE',
      'SYSTEM',
      'System Settings',
      'Updated municipal system configurations and SLA parameters.'
    );
    return { ...this.settings };
  }

  public hasPermission(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  }
}

export const authStore = new AuthStoreService();
