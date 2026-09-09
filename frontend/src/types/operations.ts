import {z} from 'zod';
export const datasetKinds = ['ROAD_NETWORK','BUILDING','DRAINAGE','WATER','OTHER'] as const;
export const datasetSchema = z.object({name:z.string().trim().min(3).max(120),kind:z.enum(datasetKinds)});
export type Dataset = {
 id:string;name:string;dataset_type:string;status:string;file_size:number;file_extension:string;
 storage_path:string;original_crs:string|null;target_crs:string;feature_count:number|null;
 geometry_type:string|null;processing_error:string|null;created_at:string;
 metadata:{quality?:Record<string,string|number>;bounds?:unknown};
};
export type Job = {id:string;dataset_id:string;status:string;progress:number;attempts:number;error:string|null;created_at:string;completed_at:string|null;metadata:{outcome?:string}};
export type Task = {id:string;task_id:string;issue_id:string;department_id:string;officer_id:string;status:string;assigned_at:string;deadline:string|null};
export type AuditEntry = {id:string;action:string;object_type:string;object_id:string;reason:string|null;created_at:string;new_values:Record<string,unknown>|null};
export type AssignmentOptions = {departments:{id:string;name:string}[];officers:{id:string;display_name:string;department_id:string}[]};
export const assignmentSchema=z.object({department:z.uuid(),officer:z.uuid(),reason:z.string().trim().min(10).max(2000)});
export function slaState(start:string,deadline:string|null,now:number=Date.now()){
 if(!deadline)return {state:'unrestricted',percent:0,remainingMs:null};
 const from=Date.parse(start),to=Date.parse(deadline);
 if(!Number.isFinite(from)||!Number.isFinite(to)||!Number.isFinite(now)||to<=from)throw new Error('INVALID_SLA_TIME');
 const percent=Math.max(0,(now-from)/(to-from)*100);
 return {state:percent>=100?'breached':percent>=90?'managerWarning':percent>=75?'warning':'onTrack',percent,remainingMs:to-now};
}
export const MAX_UPLOAD=20*1024*1024;
export function uploadExtension(name:string,size:number){
 const extension=name.split('.').pop()?.toLowerCase();
 if(!extension||!['geojson','json','zip'].includes(extension))throw new Error('UNSUPPORTED_EXTENSION');
 if(!Number.isFinite(size)||size<=0||size>MAX_UPLOAD)throw new Error('FILE_SIZE_LIMIT');
 return extension;
}
export function validSignature(extension:string,bytes:Uint8Array){
 if(extension==='zip')return bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===3&&bytes[3]===4;
 return new TextDecoder().decode(bytes).trimStart().startsWith('{');
}
