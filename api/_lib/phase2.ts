import {z} from 'zod';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {RequestLike} from './handler.js';
const reserve=z.object({name:z.string().trim().min(3).max(120),kind:z.enum(['ROAD_NETWORK','BUILDING','DRAINAGE','WATER','OTHER']),extension:z.enum(['geojson','json','zip']),bytes:z.number().int().min(1).max(20971520),checksum:z.string().regex(/^[a-f0-9]{64}$/),request_id:z.uuid()});
const assignment=z.object({department:z.uuid(),officer:z.uuid(),reason:z.string().trim().min(10).max(2000),request_id:z.uuid()});
/** Small command adapters; expensive file inspection remains in the GIS worker. */
export async function phase2(client:SupabaseClient,req:RequestLike,path:string[],url:URL):Promise<{success:true;data:unknown}|null>{
 if(req.method==='POST'&&path.join('/')==='datasets/reserve'){
  const v=reserve.parse(req.body);const {data,error}=await client.rpc('reserve_dataset',{dataset_name:v.name,kind:v.kind,extension:v.extension,bytes:v.bytes,sha256:v.checksum,request_id:v.request_id});if(error)throw error;return {success:true,data};
 }
 if(req.method==='POST'&&path[0]==='datasets'&&path[2]==='process'){
  const id=z.uuid().parse(path[1]),v=z.object({crs_code:z.number().int().min(1).max(999999).optional()}).parse(req.body??{});
  const {data,error}=await client.rpc('queue_dataset',{target_id:id,crs_code:v.crs_code??null});if(error)throw error;return {success:true,data:{job_id:data}};
 }
 if(req.method==='POST'&&path[0]==='issues'&&path[2]==='assign'){
  const id=z.uuid().parse(path[1]),v=assignment.parse(req.body);const {data,error}=await client.rpc('assign_issue',{target_id:id,department:v.department,officer:v.officer,assignment_reason:v.reason,request_id:v.request_id});if(error)throw error;return {success:true,data};
 }
 if(req.method==='GET'&&['datasets','jobs','tasks','audit'].includes(path[0])&&path.length<=2){
  const table=path[0]==='audit'?'audit_logs':path[0];
  const page=z.coerce.number().int().min(0).max(100000).parse(url.searchParams.get('page')??0);
  let q=client.from(table).select('*',{count:'exact'}).order('created_at',{ascending:false}).range(page*25,page*25+24);
  if(path[1])q=q.eq('id',z.uuid().parse(path[1]));const {data,error,count}=await q;if(error)throw error;return {success:true,data:{items:data,total:count,page,limit:25}};
 }
 return null;
}
