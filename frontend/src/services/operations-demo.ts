import type {FeatureCollection} from 'geojson';
import type {Dataset,Task,Job,AuditEntry} from '../types/operations';
// Explicit read-only fixtures. Never inserted into a live organization.
export const sampleLayers:FeatureCollection={type:'FeatureCollection',features:[
 {type:'Feature',properties:{name:'Synthetic road segment A'},geometry:{type:'LineString',coordinates:[[72.563,23.033],[72.57,23.031],[72.582,23.027]]}},
 {type:'Feature',properties:{name:'Synthetic road segment B'},geometry:{type:'LineString',coordinates:[[72.57,23.042],[72.571,23.03],[72.573,23.019]]}}
]};
export const sampleDatasets:Dataset[]=[{id:'demo-roads',name:'Central wards · sample road network',dataset_type:'ROAD_NETWORK',status:'READY',file_size:1420,file_extension:'geojson',storage_path:'',original_crs:'EPSG:4326',target_crs:'EPSG:4326',feature_count:2,geometry_type:'LineString',processing_error:null,created_at:'2026-09-08T08:00:00Z',metadata:{quality:{geometry_validity_percent:100,duplicate_feature_percent:0,missing_properties_percent:0,repaired_count:0}}}];
export const sampleJobs:Job[]=[];
export const sampleTasks:Task[]=[];
export const sampleAudit:AuditEntry[]=[];
