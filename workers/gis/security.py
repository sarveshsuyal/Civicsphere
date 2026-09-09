"""Bounded upload inspection. Untrusted archives never use extractall()."""
from __future__ import annotations
import hashlib
import json
import re
import stat
import subprocess
import zipfile
from pathlib import Path, PurePosixPath

MAX_UPLOAD = 20 * 1024 * 1024
MAX_EXPANDED = 100 * 1024 * 1024
MAX_FEATURES = 10_000
MAX_COORDINATES = 200_000
ALLOWED_COMPONENTS = {'.shp', '.shx', '.dbf', '.prj', '.cpg'}

class IngestionError(ValueError):
    """Stable, non-sensitive error code persisted with the processing job."""

class NeedsCRS(IngestionError):
    pass

def verify_file(path: Path, extension: str, expected_size: int, checksum: str) -> None:
    size = path.stat().st_size
    if not 0 < size <= MAX_UPLOAD or size != expected_size:
        raise IngestionError('FILE_SIZE_MISMATCH')
    if extension not in {'geojson', 'json', 'zip'}:
        raise IngestionError('UNSUPPORTED_EXTENSION')
    if hashlib.sha256(path.read_bytes()).hexdigest() != checksum:
        raise IngestionError('CHECKSUM_MISMATCH')
    with path.open('rb') as stream:
        head = stream.read(4096)
    if extension == 'zip':
        if not head.startswith(b'PK\x03\x04'):
            raise IngestionError('INVALID_ZIP_SIGNATURE')
    elif not head.lstrip(b' \t\r\n').startswith(b'{'):
        raise IngestionError('INVALID_JSON_SIGNATURE')

def scan_file(path: Path) -> None:
    """Require a working ClamAV scanner; scanner errors fail closed."""
    try:
        result = subprocess.run(['clamdscan', '--fdpass', '--no-summary', str(path)],
                                capture_output=True, timeout=60, check=False)
    except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
        raise IngestionError('MALWARE_SCANNER_UNAVAILABLE') from exc
    if result.returncode != 0:
        raise IngestionError('MALWARE_DETECTED' if result.returncode == 1 else 'MALWARE_SCAN_FAILED')

def extract_shapefile(path: Path, destination: Path) -> Path:
    """Validate every archive entry and actual decompressed bytes before GIS access."""
    total = 0
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if not 1 <= len(entries) <= 64:
            raise IngestionError('ARCHIVE_ENTRY_LIMIT')
        seen: set[str] = set()
        for entry in entries:
            name = PurePosixPath(entry.filename)
            mode = entry.external_attr >> 16
            if (name.is_absolute() or '..' in name.parts or '\\' in entry.filename
                    or not re.fullmatch(r'[A-Za-z0-9_./ -]+', entry.filename)
                    or len(name.parts) > 3 or stat.S_ISLNK(mode)
                    or (stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR))):
                raise IngestionError('UNSAFE_ARCHIVE_PATH')
            canonical = str(name).casefold()
            if canonical in seen:
                raise IngestionError('DUPLICATE_ARCHIVE_ENTRY')
            seen.add(canonical)
            if entry.flag_bits & 1:
                raise IngestionError('ENCRYPTED_ARCHIVE')
            if entry.is_dir():
                continue
            if name.suffix.lower() not in ALLOWED_COMPONENTS:
                raise IngestionError('UNSUPPORTED_ARCHIVE_ENTRY')
            total += entry.file_size
            if total > MAX_EXPANDED or entry.file_size > MAX_EXPANDED:
                raise IngestionError('ARCHIVE_SIZE_LIMIT')
            if entry.file_size / max(entry.compress_size, 1) > 100:
                raise IngestionError('ARCHIVE_RATIO_LIMIT')
        total = 0
        for entry in entries:
            target = destination.joinpath(*PurePosixPath(entry.filename).parts)
            if entry.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            written = 0
            with archive.open(entry) as source, target.open('xb') as output:
                while chunk := source.read(65536):
                    total += len(chunk)
                    written += len(chunk)
                    if total > MAX_EXPANDED or written > entry.file_size:
                        raise IngestionError('ARCHIVE_SIZE_LIMIT')
                    output.write(chunk)
    shapes = [f for f in destination.rglob('*') if f.suffix.lower() == '.shp']
    if len(shapes) != 1:
        raise IngestionError('ONE_SHAPEFILE_REQUIRED')
    shp = shapes[0]
    siblings = {f.suffix.lower(): f for f in shp.parent.iterdir() if f.stem == shp.stem}
    if not {'.shp', '.shx', '.dbf'} <= siblings.keys():
        raise IngestionError('SHAPEFILE_COMPONENTS_MISSING')
    # Standard shapefile header: file code 9994, big endian.
    with shp.open('rb') as stream:
        header = stream.read(4)
    if header != b'\x00\x00\x27\x0a':
        raise IngestionError('INVALID_SHAPEFILE_SIGNATURE')
    return shp

def load_json(path: Path) -> dict:
    def invalid_constant(value: str):
        raise IngestionError('NON_FINITE_COORDINATE')
    try:
        value = json.loads(path.read_text(encoding='utf-8'), parse_constant=invalid_constant)
    except (UnicodeError, json.JSONDecodeError, RecursionError) as exc:
        raise IngestionError('INVALID_GEOJSON') from exc
    if not isinstance(value, dict) or value.get('type') != 'FeatureCollection':
        raise IngestionError('FEATURE_COLLECTION_REQUIRED')
    features = value.get('features')
    if not isinstance(features, list) or not 1 <= len(features) <= MAX_FEATURES:
        raise IngestionError('FEATURE_LIMIT')
    return value
