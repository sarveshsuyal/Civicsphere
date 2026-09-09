import type {FeatureCollection} from 'geojson';
import {requireClient} from './client';
import {sampleDatasets,sampleLayers,sampleJobs} from './operations-demo';
import {datasetSchema,uploadExtension,validSignature} from '../types/operations';
import type {Dataset,Job} from '../types/operations';
export async function datasets(demo:boolean,page=0,signal?:AbortSignal){
 if(demo)return {rows:sampleDatasets,count:sampleDatasets.length};
 let q=requireClient().from('datasets').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(page*25,page*25+24);
 if(signal)q=q.abortSignal(signal);
 const {data,error,count}=await q;if(error)throw error;
 return {rows:(data??[]) as Dataset[],count:count??0};
}
export async function dataset(demo:boolean,id:string):Promise<Dataset|null>{
 if(demo)return sampleDatasets.find(d=>d.id===id)??null;
 const {data,error}=await requireClient().from('datasets').select('*').eq('id',id).single();if(error)throw error;return data;
}
export async function jobs(demo:boolean,id?:string):Promise<Job[]>{
 if(demo)return sampleJobs;
 let q=requireClient().from('jobs').select('*').order('created_at',{ascending:false}).limit(100);
 if(id)q=q.eq('dataset_id',id);const {data,error}=await q;if(error)throw error;return data??[];
}
export async function queueDataset(id:string,crs?:number){
 const {data,error}=await requireClient().rpc('queue_dataset',{target_id:id,crs_code:crs??null});if(error)throw error;return data as string;
}
/** Reserve an immutable path, upload with user RLS, and queue only after storage succeeds. */
export async function uploadDataset(file:File,values:unknown,requestId:string,onStage:(stage:string)=>void){
 const input=datasetSchema.parse(values),extension=uploadExtension(file.name,file.size);
 const content=new Uint8Array(await file.arrayBuffer());
 if(!validSignature(extension,content.slice(0,4096)))throw new Error('INVALID_FILE_SIGNATURE');
 const digest=await crypto.subtle.digest('SHA-256',content);
 const checksum=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 const client=requireClient();onStage('reserving');
 const {data,error}=await client.rpc('reserve_dataset',{dataset_name:input.name,kind:input.kind,extension,bytes:file.size,sha256:checksum,request_id:requestId});
 if(error)throw error;
 const reservation=data as {id:string;storage_path:string;mime_type:string};
 onStage('uploading');
 const upload=await client.storage.from('datasets').upload(reservation.storage_path,file,{contentType:reservation.mime_type,upsert:false});
 if(upload.error&&upload.error.message!=='The resource already exists')throw upload.error;
 onStage('queueing');
 // Return the reserved record even if queueing fails: the detail view offers a
 // safe retry without uploading a second immutable object.
 try{await queueDataset(reservation.id);}catch(error){return {id:reservation.id,queueError:error instanceof Error?error.message:'QUEUE_FAILED'};}
 return {id:reservation.id,queueError:null};
}
export async function sourceUrl(path:string){const {data,error}=await requireClient().storage.from('datasets').createSignedUrl(path,60);if(error)throw error;return data.signedUrl;}
export async function layerFeatures(demo:boolean,id:string,bounds:number[],signal:AbortSignal):Promise<FeatureCollection>{
 if(demo)return sampleLayers;
 const {data,error}=await requireClient().rpc('features_in_view',{target_dataset:id,west:bounds[0],south:bounds[1],east:bounds[2],north:bounds[3]}).abortSignal(signal);if(error)throw error;return data;
}
