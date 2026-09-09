import importlib.util
import unittest
AVAILABLE=all(importlib.util.find_spec(x) for x in ['shapely','pyproj','fiona'])
@unittest.skipUnless(AVAILABLE,'GIS dependencies unavailable')
class GeometryTests(unittest.TestCase):
    def test_axis_order(self):
        from workers.gis.processor import normalize,epsg
        record={'type':'Feature','geometry':{'type':'Point','coordinates':[72.57,23.03]},'properties':{}}
        result,quality=normalize([record],epsg(4326))
        self.assertAlmostEqual(result[0]['geometry']['coordinates'][0],72.57)
        self.assertEqual(quality['feature_count'],1)
    def test_projected_transform(self):
        from workers.gis.processor import normalize,epsg
        from pyproj import Transformer
        xy=Transformer.from_crs(4326,32643,always_xy=True).transform(72.57,23.03)
        result,_=normalize([{'type':'Feature','geometry':{'type':'Point','coordinates':xy},'properties':{}}],epsg(32643))
        self.assertAlmostEqual(result[0]['geometry']['coordinates'][1],23.03,places=5)
    def test_invalid_world_bounds(self):
        from workers.gis.processor import normalize,epsg
        from workers.gis.security import IngestionError
        with self.assertRaises(IngestionError):normalize([{'type':'Feature','geometry':{'type':'Point','coordinates':[400,200]},'properties':{}}],epsg(4326))
    def test_rejects_dimension_changing_repair(self):
        from workers.gis.processor import normalize,epsg
        from workers.gis.security import IngestionError
        polygon={'type':'Feature','geometry':{'type':'Polygon','coordinates':[[[0,0],[1,1],[1,0],[0,1],[0,0]]]},'properties':{}}
        with self.assertRaisesRegex(IngestionError,'UNSAFE_GEOMETRY_REPAIR'):normalize([polygon],epsg(4326))
    def test_requires_explicit_legacy_crs(self):
        from workers.gis.processor import epsg
        from workers.gis.security import IngestionError
        with self.assertRaises(IngestionError):epsg('/vsicurl/https://external.example/crs')
if __name__=='__main__':unittest.main()
