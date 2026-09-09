import hashlib
import stat
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch
from workers.gis.security import (IngestionError,extract_shapefile,verify_file,load_json,scan_file)

class SecurityTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
    def tearDown(self):
        self.temp.cleanup()
    def archive(self,entries,compression=zipfile.ZIP_STORED):
        path=self.root/'source.zip'
        with zipfile.ZipFile(path,'w',compression=compression) as z:
            for name,data in entries:
                z.writestr(name,data)
        dest=self.root/'output';dest.mkdir()
        return path,dest
    def test_traversal(self):
        path,dest=self.archive([('../escape.shp',b'x')])
        with self.assertRaisesRegex(IngestionError,'UNSAFE_ARCHIVE_PATH'):extract_shapefile(path,dest)
        self.assertFalse((self.root/'escape.shp').exists())
    def test_symlink(self):
        info=zipfile.ZipInfo('link.shp');info.create_system=3;info.external_attr=(stat.S_IFLNK|0o777)<<16
        path,dest=self.archive([(info,b'/etc/passwd')])
        with self.assertRaisesRegex(IngestionError,'UNSAFE_ARCHIVE_PATH'):extract_shapefile(path,dest)
    def test_nested_archive(self):
        path,dest=self.archive([('nested.zip',b'PK')])
        with self.assertRaisesRegex(IngestionError,'UNSUPPORTED_ARCHIVE_ENTRY'):extract_shapefile(path,dest)
    def test_ratio_bomb(self):
        path,dest=self.archive([('roads.dbf',b'0'*1000000)],zipfile.ZIP_DEFLATED)
        with self.assertRaisesRegex(IngestionError,'ARCHIVE_RATIO_LIMIT'):extract_shapefile(path,dest)
    def test_missing_components(self):
        path,dest=self.archive([('roads.shp',b'\x00\x00\x27\x0a')])
        with self.assertRaisesRegex(IngestionError,'SHAPEFILE_COMPONENTS_MISSING'):extract_shapefile(path,dest)
    def test_valid_component_extraction(self):
        path,dest=self.archive([('roads.shp',b'\x00\x00\x27\x0a'),('roads.shx',b'x'),('roads.dbf',b'x')])
        self.assertEqual(extract_shapefile(path,dest),dest/'roads.shp')
    def test_checksum_and_size(self):
        path=self.root/'source.geojson';data=b'{"type":"FeatureCollection","features":[]}';path.write_bytes(data)
        verify_file(path,'geojson',len(data),hashlib.sha256(data).hexdigest())
        with self.assertRaisesRegex(IngestionError,'CHECKSUM_MISMATCH'):verify_file(path,'geojson',len(data),'0'*64)
        with self.assertRaisesRegex(IngestionError,'FILE_SIZE_MISMATCH'):verify_file(path,'geojson',len(data)+1,hashlib.sha256(data).hexdigest())
    def test_nonfinite_json(self):
        path=self.root/'source.json';path.write_text('{"type":"FeatureCollection","features":[NaN]}')
        with self.assertRaisesRegex(IngestionError,'NON_FINITE_COORDINATE'):load_json(path)
    def test_empty_dataset(self):
        path=self.root/'source.json';path.write_text('{"type":"FeatureCollection","features":[]}')
        with self.assertRaisesRegex(IngestionError,'FEATURE_LIMIT'):load_json(path)
    @patch('workers.gis.security.subprocess.run',side_effect=FileNotFoundError)
    def test_scanner_fails_closed(self,_run):
        with self.assertRaisesRegex(IngestionError,'MALWARE_SCANNER_UNAVAILABLE'):scan_file(self.root/'source.zip')
    @patch('workers.gis.security.subprocess.run')
    def test_infected_file_rejected(self,run):
        run.return_value.returncode=1
        with self.assertRaisesRegex(IngestionError,'MALWARE_DETECTED'):scan_file(self.root/'source.zip')

if __name__=='__main__':unittest.main()
