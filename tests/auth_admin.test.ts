import { describe, it, expect } from 'vitest';
import { authStore, ROLE_PERMISSIONS } from '../frontend/src/features/auth/authStore';
import type { Role } from '../frontend/src/types/domain';

describe('RBAC Authorization Matrix', () => {
  it('grants administrative authority only to SUPER_ADMIN and ADMIN', () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain('ACCESS_ADMIN');
    expect(ROLE_PERMISSIONS.ADMIN).toContain('ACCESS_ADMIN');
    expect(ROLE_PERMISSIONS.DEPARTMENT_MANAGER).not.toContain('ACCESS_ADMIN');
    expect(ROLE_PERMISSIONS.GIS_ANALYST).not.toContain('ACCESS_ADMIN');
    expect(ROLE_PERMISSIONS.FIELD_OFFICER).not.toContain('ACCESS_ADMIN');
    expect(ROLE_PERMISSIONS.VIEWER).not.toContain('ACCESS_ADMIN');
    expect(ROLE_PERMISSIONS.PUBLIC_USER).not.toContain('ACCESS_ADMIN');
  });

  it('restricts user and department management to administrators', () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain('MANAGE_USERS');
    expect(ROLE_PERMISSIONS.ADMIN).toContain('MANAGE_USERS');
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain('MANAGE_DEPARTMENTS');
    expect(ROLE_PERMISSIONS.ADMIN).toContain('MANAGE_DEPARTMENTS');
    expect(ROLE_PERMISSIONS.FIELD_OFFICER).not.toContain('MANAGE_USERS');
  });

  it('grants review permissions to reviewers and managers', () => {
    expect(ROLE_PERMISSIONS.REVIEWER).toContain('REVIEW_ISSUES');
    expect(ROLE_PERMISSIONS.DEPARTMENT_MANAGER).toContain('REVIEW_ISSUES');
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain('REVIEW_ISSUES');
    expect(ROLE_PERMISSIONS.FIELD_OFFICER).not.toContain('REVIEW_ISSUES');
  });
});

describe('Municipal Personnel Management (Admin Panel)', () => {
  it('returns seeded municipal personnel', () => {
    const users = authStore.getUsers();
    expect(users.length).toBeGreaterThanOrEqual(6);
    expect(users.some((u) => u.role === 'SUPER_ADMIN')).toBe(true);
  });

  it('creates new municipal personnel with department assignment', () => {
    const email = `test.officer.${Date.now()}@civicsphere.gov.in`;
    const newUser = authStore.addUser({
      display_name: 'Test Officer',
      email,
      role: 'FIELD_OFFICER',
      department_id: 'dept-roads',
    });

    expect(newUser.email).toBe(email);
    expect(newUser.role).toBe('FIELD_OFFICER');
    expect(newUser.is_active).toBe(true);
    expect(newUser.avatar_initials).toBe('TO');
  });

  it('rejects duplicate user emails', () => {
    const users = authStore.getUsers();
    const existing = users[0];
    expect(() =>
      authStore.addUser({
        display_name: 'Duplicate',
        email: existing.email,
        role: 'VIEWER',
        department_id: null,
      })
    ).toThrow();
  });

  it('updates role and toggles account status', () => {
    const email = `toggle.test.${Date.now()}@civicsphere.gov.in`;
    const user = authStore.addUser({
      display_name: 'Toggle User',
      email,
      role: 'VIEWER',
      department_id: null,
    });

    const updated = authStore.updateUserRole(user.id, 'GIS_ANALYST');
    expect(updated.role).toBe('GIS_ANALYST');

    const suspended = authStore.toggleUserStatus(user.id);
    expect(suspended.is_active).toBe(false);

    const reactivated = authStore.toggleUserStatus(user.id);
    expect(reactivated.is_active).toBe(true);
  });
});

describe('Municipal Departments & Governance', () => {
  it('returns departments with SLA metrics', () => {
    const depts = authStore.getDepartments();
    expect(depts.length).toBeGreaterThanOrEqual(5);
    expect(depts.every((d) => d.sla_target_hours > 0)).toBe(true);
    expect(depts.every((d) => d.sla_compliance_rate >= 90)).toBe(true);
  });

  it('creates new departments and logs audit', () => {
    const code = `DEPT-TEST-${Date.now().toString(36).toUpperCase()}`;
    const newDept = authStore.addDepartment({
      name: 'Waste to Energy',
      code,
      head_name: 'Dr. Suresh Sen',
      head_email: 'suresh.sen@civicsphere.gov.in',
      sla_target_hours: 24,
    });

    expect(newDept.code).toBe(code);
    expect(newDept.head_name).toBe('Dr. Suresh Sen');

    const audits = authStore.getAuditLogs();
    expect(audits[0].action).toBe('DEPT_CREATE');
  });
});
