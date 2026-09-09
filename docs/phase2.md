# Phase 2 implementation and release gates

## Implemented in code

- Private, immutable dataset upload reservations and JWT/RLS-protected storage (20 MB).
- GeoJSON and zipped Shapefile background processing, checksum/signature checks, archive defenses and fail-closed malware scanning.
- Leased jobs with bounded crash retries, explicit failure codes, missing-CRS handling and atomic publication.
- CRS normalization, bounded geometry validation and conservative metric-area repair.
- Dataset list/upload/detail, quality metrics, processing history, CRS correction and requeue controls.
- Authorized source downloads through 60-second signed URLs after validation.
- Imported GeoJSON map layers loaded by viewport, plus issue severity/status/category filters.
- Review-to-assignment command, active same-department field-officer validation, transactional task creation and audited SLA start.
- SLA deadline and 75%/90%/100% display states using stored assignment/deadline times.
- Scoped task lists and read-only paginated audit views.
- English and Hindi text for new phase 2 surfaces.
- Auth query-cache clearing on account changes to prevent cached data from crossing accounts.
- Vercel API adapters for dataset reservation/processing, assignment and paginated jobs/tasks/audit reads.

## Explicit limitations

Phase 2 is implemented locally but is **not certified end-to-end**. The existing Supabase connector still fails database authentication; no remote migrations were applied. No project was created or unrelated database changed. Browser preview infrastructure remains unavailable. GIS dependency installation failed, so five geospatial tests are present but skipped here.

The existing public demo remains read-only. One synthetic road layer demonstrates map rendering; it is not a processed municipal file and creates no operational jobs/audit events. Source uploads, queueing and assignment require real authorized accounts.

SLA indicators are computed on read. Scheduled warning deliveries, escalation jobs, pause/resume accounting and field resolution are later operational work. This phase starts the SLA and records deadlines; it does not claim an automated escalation service. Heavy AI inference remains phase 3.

Dataset lists show 25 rows/page; the map layer picker shows the first 25 visible datasets, and a direct dataset map link also works. Layer responses are capped at 500 features, issue responses at 100. Vector tiles/clustering and global dateline handling remain future work.

## Rollout sequence

1. Restore database access and designate the dedicated CivicSphere project.
2. Apply phase 1 then phase 2 migrations in staging, run Supabase advisors and both pgTAP files, and review all existing Storage policies (this migration adds scoped policies; it cannot neutralize unrelated permissive policies on a reused project).
3. Provision organization, departments, authorized profiles and test identities. Test viewer, field officer, department manager, reviewer, GIS analyst and administrator access across at least two organizations.
4. Configure frontend publishable values and Vercel server environment. No service key belongs in frontend variables.
5. Deploy the GIS worker with resource limits and a healthy ClamAV service. Confirm correct project secrets and egress boundaries.
6. Test a real upload → queue → claim → validate → READY → viewport flow. Repeat for missing .prj, unsafe ZIP, wrong checksum, invalid geometry, scanner outage, worker crash/reclaim and a stale lease token.
7. Verify detection → human review → assignment → one task → deadline → audit, including repeated request IDs and concurrent assignment attempts.
8. Run mobile/keyboard/browser tests and the full authenticated integration suite before any operational rollout.

Department SLA overrides are trusted `default_sla_policy` JSON entries mapping severity to hours, e.g. `{"HIGH":12}`. Values must be from 0.25 to 8760 hours. No client can directly edit this policy. Department managers may assign only issues already routed to their department; city officers/admins handle initial cross-department routing.

## Available checks

- Frontend and API strict TypeScript compilation: passed.
- Vite production build: passed.
- Six phase 2 TypeScript tests: passed.
- Eleven Python security tests: passed.
- Five GIS tests: skipped (dependencies unavailable).
- Database/Storage/RLS integration and browser QA: blocked by environment, not claimed passed.
