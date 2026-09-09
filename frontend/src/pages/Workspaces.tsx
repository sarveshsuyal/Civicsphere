import { lazy } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ArrowUpRight, BookOpen, Layers3 } from 'lucide-react';
import AdminPanel from '../features/admin/AdminPanel';

export function Admin() {
  return <AdminPanel />;
}

export function Help() {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-in">
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPERATIONAL ASSISTANCE</div>
          <h1>{t('help')}</h1>
          <p>Find your way around CivicSphere municipal workflows and spatial intelligence.</p>
        </div>
        <BookOpen />
      </div>
      <div className="capability-grid">
        {[
          [
            'Explore the Geospatial Map',
            'Pan or zoom to load infrastructure signals in the current viewport. Select an active marker to open its telemetry and issue record.',
          ],
          [
            'Review AI Detections & Evidence',
            'Open the review queue, inspect photographic evidence and confidence ratings, and record an authorized reason for verification or rejection.',
          ],
          [
            'Role-Based Authorization & Governance',
            'Use the Administration console to provision municipal accounts, manage departments, inspect audit logs, and test RBAC policies.',
          ],
          [
            'Keyboard & Command Shortcuts',
            'Use Ctrl / Command + K to open the global command palette and jump instantly across workspaces, datasets, and civic signals.',
          ],
        ].map(([a, b]) => (
          <article key={a} className="interactive-card">
            <h2>{a}</h2>
            <p>{b}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function Planned() {
  const { t } = useTranslation();
  const path = useLocation().pathname;
  const name = path.split('/').pop() || '';
  return (
    <div className="animate-fade-in">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CIVICSPHERE ROADMAP</div>
          <h1>{t(name)}</h1>
          <p>This workspace is part of the next implementation milestones.</p>
        </div>
        <Layers3 />
      </div>
      <section className="panel">
        <div className="state">
          <ShieldCheck size={34} />
          <h2>Operational integration pending</h2>
          <p>This module will become available after the required backend workflow is deployed and verified.</p>
          <Link className="button" to={`${path.startsWith('/demo') ? '/demo' : ''}/dashboard`}>
            {t('dashboard')}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
