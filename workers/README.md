# CivicSphere GIS worker — phase 2

This is an independently deployable Python consumer, not a Vercel request handler. It processes private GeoJSON and zipped Shapefile inputs and publishes normalized EPSG:4326 geometry only after validation.

## Runtime

- Python 3.12+, pinned packages in `requirements.txt` (Fiona bundles GDAL in supported wheels).
- A running, updated ClamAV daemon accessible to `clamdscan --fdpass` through a local Unix socket. Both the archive and extracted components are scanned. Missing/unavailable/infected scanner results fail closed.
- `SUPABASE_URL`: HTTPS origin of the designated project.
- `WORKER_SUPABASE_SERVICE_ROLE_KEY`: server-side secret, **not** a browser key.
- Apply both Supabase migrations before starting the worker.

```sh
python -m pip install -r workers/requirements.txt
python -m workers.gis.runner
```

A Dockerfile is provided. Build from repository root:

```sh
docker build -f workers/Dockerfile -t civicsphere-gis .
```

The image contains the scanner client; it does not start an unconfigured daemon. Mount a read-only ClamAV configuration and accessible local Unix socket from a managed scanner service. Do not enable uploads until scanner readiness and definitions have been checked. Run the worker with a read-only root filesystem, a bounded writable `/tmp` (at least 256 MiB), memory/CPU limits, no inbound public ports, and egress restricted to Supabase. Store secrets in the deployment platform's secret manager. The worker runs as UID 10001; socket permissions must allow this account to connect.

## Job contract

1. An authenticated data operator reserves an immutable, random path (20 MB maximum, 10 reservations/hour/operator).
2. Supabase Storage checks the exact reserved path, caller, role, expiry and bucket size/MIME restrictions. Upsert and client replacement are not allowed.
3. `queue_dataset` checks object existence and actual recorded size and atomically creates one active job per dataset.
4. `claim_gis_job` uses `FOR UPDATE SKIP LOCKED` and a 10-minute lease with a fresh token. A crashed attempt can be reclaimed up to three times. At most three manual jobs can be created for a dataset.
5. The worker bounds download size, verifies SHA-256 and format signature, requires malware scanning, checks archive paths/symlinks/encryption/ratios/entry limits, and validates geometries and CRS.
6. `finish_gis_job` checks the current lease token and deadline. Geometry insertion, dataset publication, job completion and the worker audit event commit atomically. A late worker cannot overwrite another attempt.

A failed transport leaves the lease to expire. Processing beyond ten minutes fails the lease check and never publishes partial results. Tune limits and lease duration together before enabling larger imports; phase 2 deliberately caps imports at 10,000 features and 200,000 coordinate pairs.

## CRS and geometry

GeoJSON without a legacy CRS declaration follows RFC 7946 (EPSG:4326). Shapefiles need an embedded CRS or a human-supplied EPSG code; otherwise the dataset becomes NEEDS_CRS. Explicit CRS overrides are validated as EPSG identifiers and audited when queued. PROJ networking is disabled. Axis order is explicitly longitude/latitude (`always_xy=True`).

2D Point, MultiPoint, LineString, MultiLineString, Polygon and MultiPolygon are supported. Empty, non-finite, out-of-world, over-budget and unsupported geometries fail. Safe repair is limited to same-type valid polygon results with <=1% area change measured in a suitable local projected UTM CRS. Ambiguous repairs, dimension-changing repairs and unsuitable wide/polar repairs fail for operator review. No measurement uses raw degree area.

ZIP inputs must contain exactly one Shapefile with .shp/.shx/.dbf; .prj and .cpg are allowed. Executables, nested archives, encrypted entries, duplicate paths and links are rejected. All extraction occurs in a fresh temporary directory, without `extractall`.

## Verification

```sh
python -m unittest discover -s workers/tests -v
```

Security tests use standard Python. GIS tests require the pinned geospatial packages and explicitly skip if unavailable. Tests never disable production malware scanning; scanner behaviors are patched only inside unit tests. Local unit tests are not substitutes for a real Supabase + Storage + ClamAV integration run.
