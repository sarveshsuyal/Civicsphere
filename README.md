# CivicSphere

Urban intelligence, geospatial context, and accountable city operations.

## Phase 2 update

Phase 2 source implementation is now included. See [phase 2 scope and release gates](docs/phase2.md) and the [GIS worker setup](workers/README.md). New flows cover private uploads, validated imports, CRS correction, map layers, assignment/SLA start, jobs and audit. Live end-to-end verification remains blocked. The status below describes the original milestone 1 baseline.

## Delivery status

This repository is a **milestone 1 implementation in progress**, not a completed production platform. The public website and isolated read-only demo run without credentials. Live routes require real Supabase authentication and a provisioned active profile. Missing configuration fails closed.

Implemented: React/TypeScript/Vite application, public pages, English/Hindi core navigation, Supabase password sign-in/reset integration, session restoration, guarded workspace/admin routes, issue list and details, filters/pagination, Leaflet map and viewport requests, demo dashboard, command palette, department/dataset/admin read surfaces, PostGIS migration, scoped RLS policies, aggregate statistics, transactional review RPC, audit records, authenticated Vercel API adapters, deployment configuration and critical unit tests.

Not yet complete: provisioning UI, comprehensive localization, complete public marketing sections, MFA/SSO, full role management, secure ingestion/storage pipeline, background workers, AI inference, assignment/tasks/field workflow, SLA, risk/hotspots, alerts/realtime, reports, full analytics, end-to-end tests, and live RLS verification. Future modules have explicit roadmap states and do not simulate operational success.

The current UI uses custom CSS tokens and Radix dialogs. Tailwind/shadcn component adoption, React Hook Form, and the remaining recommended libraries are pending; they are not claimed as implemented.

## Local setup

Node 22 or newer is recommended.

```sh
npm ci
cp .env.example frontend/.env.local
# Set only VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local.
npm run dev
npm run build
npm test
```

The default entry is the public homepage. `/demo/dashboard` uses explicitly synthetic Ahmedabad fixtures. `/dashboard` and `/admin` never accept a demo identity. No real passwords are committed or prefilled.

## Supabase setup

Use a dedicated approved Supabase project. Do not apply the migration to an unrelated existing project. The connected account's discovered database returned an authentication error during implementation, so no remote schema was changed and no live credentials are embedded.

1. Install Docker for local Supabase and start with the pinned CLI (`npx supabase start`).
2. Apply migrations locally (`npx supabase db reset`). This command resets only the local development database; do not target production.
3. Run `npx supabase test db`. Add multi-organization fixtures and end-to-end policy tests before rollout; current pgTAP assertions cover policy/grant structure.
4. Review Supabase advisors and the migration before applying it to the approved project through the normal release pipeline.
5. Configure Auth email provider, verification policy, site URL, and allowed `/reset-password` redirect URLs. Disable public sign-up for the internal workspace.
6. Create the first organization and departments through a trusted operator. Invite the first administrator through Supabase Auth, then insert the corresponding `profiles` row with the matching `auth.users.id`, organization and role. Never derive role from user metadata.
7. Set publishable frontend environment variables, server `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, and rebuild.

Profile lookup checks both `is_active` and the JWT's session against `auth.sessions`. Session revocation and suspension therefore affect database access without waiting for a role claim refresh. No client has write privileges to profiles or audit records.

The migration assumes PostGIS is installed in `extensions`. An existing PostGIS extension in another schema must be reviewed and adapted before applying this migration; do not drop an existing extension to force compatibility.

## Architecture

- `frontend/src/features`: independently loaded feature surfaces.
- `frontend/src/services`: Supabase client, queries, review commands, isolated demo fixtures.
- `frontend/src/types`: roles, domain models, pure scoring functions.
- `api`: lightweight Vercel handlers, with server authentication and user-JWT forwarding for RLS.
- `supabase/migrations`: organization, department, profile, dataset, issue and audit schema; access policies; viewport, statistics and review RPCs.
- `workers`: independently deployable future heavy processing boundary, not an implemented service.

Read RPCs use security invoker rights. Narrow private security-definer commands explicitly check current identity, organization and role before writes. Review locks the issue, checks transitions, records the audit event in the same transaction, and handles repeated idempotency keys. Direct REST updates are not granted.

## API

- `GET /api/issues?page=0&limit=25`: RLS-scoped list, maximum 100.
- `GET /api/issues/:uuid`: RLS-scoped issue lookup.
- `GET /api/issues/geojson?bbox=west,south,east,north&severity=CRITICAL`: validated bounding box and maximum 100 features.
- `POST /api/issues/:uuid/review`: `{decision, reason, request_id}`; `VERIFIED` or `REJECTED`; authorized reviewers only.

Every API request requires a bearer token. The frontend uses the equivalent Supabase read APIs and review RPC directly; database security is mandatory on both paths. Service-role credentials are not required by these endpoints.

## GIS correctness

Display geometry uses EPSG:4326 with GiST indexes. Viewport results are bounded and ordered. Requests are cancelled through TanStack Query/AbortSignal. No metric area/distance calculation is performed on raw latitude/longitude. Dateline-crossing bounds currently fail validation; split them before supporting global map views. The 100-feature cap is a first milestone limit; clustering/tiles and a truncation indicator are required for dense production datasets.

Basemap tiles use CARTO/OpenStreetMap with attribution. Internet access and production-appropriate provider policies are required. The address-based issue table remains available when the map is unavailable.

## Vercel

Deploy the repository root, using `vercel.json`. Build command: `npm run build`. Output: `frontend/dist`. Vercel functions remain under root `api/`. SPA rewrites exclude `/api/`. Security headers restrict scripts, embedding, framing, fonts, and provider connections.

Add frontend publishable values and server environment variables through Vercel project settings, then redeploy. Supabase's allowed redirect origins must match the final Vercel URL. No credential belongs in a `VITE_` variable unless it is explicitly publishable.

The private Sites preview is a static frontend preview only. It does not deploy the Vercel API or apply database migrations. Vercel remains the intended production origin.

## Validation and production gates

TypeScript and the Vite bundle were checked locally. Unit tests cover permission helpers, input boundaries, demo filters/viewport and API failure handling. Browser QA could not run because the preview service was unavailable. Live sign-in, RLS isolation, PostGIS, review/audit integration and deployment compatibility must be tested against the approved backend before production approval.

Required release checks include cross-organization access attempts, viewer/field/department role restrictions, suspended/revoked sessions, concurrent and repeated review commands, source evidence authorization, dense viewport behavior, mobile/keyboard flows, dependency scanning, email recovery, and the complete staged end-to-end workflow.

## Roadmap

1. Finish live milestone 1 verification, provisioning, localization, and Vercel deployment.
2. Secure dataset uploads, signed storage paths, CRS/geometry validation, job queue, assignment and SLA.
3. Independently deployed GIS/AI workers, provider abstractions, lineage and reviewed recommendations.
4. Risk, hotspots, weather/routing, field evidence, realtime and incident operations.
5. Reports, advanced analytics, imagery/tiles, observability, offline readiness and production hardening.

Do not move to the next milestone until the current milestone's security and integration gates pass.
