"""Normalize bounded vector datasets to EPSG:4326 with metric repair checks."""
from __future__ import annotations
import json
import math
import re
from pathlib import Path
from tempfile import TemporaryDirectory
import fiona
from fiona.model import to_dict
from pyproj import CRS, Transformer, network
from shapely import make_valid
from shapely.geometry import shape, mapping
from shapely.ops import transform
from .security import (IngestionError, NeedsCRS, MAX_FEATURES, MAX_COORDINATES,
                       extract_shapefile, load_json, verify_file, scan_file)
network.set_network_enabled(False)

def epsg(value: str | int) -> CRS:
    text = str(value)
    if not re.fullmatch(r'(EPSG:)?[0-9]{1,6}', text, re.IGNORECASE):
        raise IngestionError('UNSUPPORTED_CRS')
    try:
        return CRS.from_epsg(int(text.split(':')[-1]))
    except Exception as exc:
        raise IngestionError('UNSUPPORTED_CRS') from exc

def coordinate_count(geometry: dict) -> int:
    if geometry.get('type') not in {'Point','MultiPoint','LineString','MultiLineString','Polygon','MultiPolygon'}:
        raise IngestionError('UNSUPPORTED_GEOMETRY')
    stack = [(geometry.get('coordinates'), 0)]
    count = 0
    while stack:
        item, depth = stack.pop()
        if depth > 6 or not isinstance(item, (list, tuple)) or not item:
            raise IngestionError('INVALID_COORDINATES')
        if isinstance(item[0], (int, float)):
            if len(item) != 2 or any(isinstance(v, bool) or not isinstance(v, (int,float)) or not math.isfinite(v) for v in item):
                raise IngestionError('NON_FINITE_OR_3D_COORDINATE')
            count += 1
        else:
            stack.extend((child, depth+1) for child in item)
        if count + len(stack) > MAX_COORDINATES:
            raise IngestionError('COORDINATE_LIMIT')
    return count

def normalize(features: list, source: CRS) -> tuple[list, dict]:
    if not 1 <= len(features) <= MAX_FEATURES:
        raise IngestionError('FEATURE_LIMIT')
    transformer = Transformer.from_crs(source, 'EPSG:4326', always_xy=True, allow_ballpark=False)
    output, repaired, coordinates, missing, types = [], 0, 0, 0, set()
    signatures: set[str] = set()
    duplicates = 0
    for record in features:
        if not isinstance(record, dict) or record.get('type') != 'Feature' or not isinstance(record.get('geometry'), dict):
            raise IngestionError('INVALID_FEATURE')
        coordinates += coordinate_count(record['geometry'])
        if coordinates > MAX_COORDINATES:
            raise IngestionError('COORDINATE_LIMIT')
        try:
            geom = transform(transformer.transform, shape(record['geometry']))
        except Exception as exc:
            raise IngestionError('TRANSFORM_FAILED') from exc
        if geom.is_empty or any(not math.isfinite(v) for v in geom.bounds):
            raise IngestionError('EMPTY_OR_NON_FINITE_GEOMETRY')
        x0,y0,x1,y1 = geom.bounds
        if x0 < -180 or x1 > 180 or y0 < -90 or y1 > 90:
            raise IngestionError('OUT_OF_WORLD_BOUNDS')
        if not geom.is_valid:
            fixed = make_valid(geom)
            # Only permit shape-preserving polygon repairs whose local projected
            # area differs by <=1%; ambiguous/dimension-changing repairs fail.
            if geom.geom_type not in {'Polygon','MultiPolygon'} or fixed.geom_type != geom.geom_type or fixed.is_empty:
                raise IngestionError('UNSAFE_GEOMETRY_REPAIR')
            center = geom.centroid
            if not -80 <= center.y <= 84 or x1-x0 > 6:
                raise IngestionError('UNSAFE_GEOMETRY_REPAIR')
            zone = min(60, max(1, int((center.x+180)//6)+1))
            metric = Transformer.from_crs('EPSG:4326', (32600 if center.y>=0 else 32700)+zone, always_xy=True)
            old_area = transform(metric.transform, geom).area
            new_area = transform(metric.transform, fixed).area
            if old_area <= 0 or abs(new_area-old_area)/old_area > .01 or not fixed.is_valid:
                raise IngestionError('UNSAFE_GEOMETRY_REPAIR')
            geom, repaired = fixed, repaired+1
        props = record.get('properties') or {}
        if not isinstance(props, dict) or len(json.dumps(props, allow_nan=False).encode()) > 16384:
            raise IngestionError('PROPERTY_LIMIT')
        missing += int(not props)
        signature = geom.wkb_hex + json.dumps(props,sort_keys=True)
        duplicates += int(signature in signatures)
        signatures.add(signature)
        types.add(geom.geom_type)
        output.append({'type':'Feature','geometry':mapping(geom),'properties':props})
    count = len(output)
    quality = {'feature_count':count,'geometry_validity_percent':100,
               'original_validity_percent':round((count-repaired)/count*100,2),
               'repaired_count':repaired,'missing_properties_percent':round(missing/count*100,2),
               'duplicate_feature_percent':round(duplicates/count*100,2),
               'geometry_type':','.join(sorted(types)),'crs':source.to_string(),
               'target_crs':'EPSG:4326','coordinate_count':coordinates}
    return output, quality

def process(path: Path, dataset: dict) -> tuple[list,dict,str]:
    """Run only in the worker; malware scanning is mandatory, including components."""
    verify_file(path,dataset['file_extension'],dataset['file_size'],dataset['checksum'])
    override = dataset.get('source_crs_override')
    with TemporaryDirectory(prefix='civic-gis-') as temporary:
        if dataset['file_extension'] == 'zip':
            shp = extract_shapefile(path,Path(temporary))
            scan_file(path)
            for component in Path(temporary).rglob('*'):
                if component.is_file():
                    scan_file(component)
            with fiona.Env(CPL_VSIL_CURL_ALLOWED_EXTENSIONS=''):
                with fiona.open(shp,enabled_drivers=['ESRI Shapefile']) as collection:
                    if len(collection)>MAX_FEATURES:
                        raise IngestionError('FEATURE_LIMIT')
                    if not override and not collection.crs:
                        raise NeedsCRS('CRS_REQUIRED')
                    source = epsg(override) if override else CRS(collection.crs)
                    features = [to_dict(f) for f in collection]
        else:
            scan_file(path)
            geojson = load_json(path)
            declared = geojson.get('crs')
            if override:
                source = epsg(override)
            elif declared:
                try:
                    source = epsg(declared['properties']['name'])
                except (KeyError, TypeError, IngestionError) as exc:
                    raise NeedsCRS('CRS_REQUIRED') from exc
            else:
                source = epsg(4326)  # RFC 7946 default, not an inferred projection.
            features = geojson['features']
        normalized, quality = normalize(features,source)
        quality['crs_source'] = 'operator_override' if override else 'file_or_geojson_standard'
        return normalized, quality, source.to_string()
