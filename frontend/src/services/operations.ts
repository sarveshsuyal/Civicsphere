import {requireClient} from './client';
import {assignmentSchema} from '../types/operations';
import type {Task,AuditEntry,AssignmentOptions} from '../types/operations';
import {sampleTasks,sampleAudit} from './operations-demo';
export async function assignmentOptions():Promise<AssignmentOptions>{const {data,error}=await requireClient().rpc('assignment_options');if(error)throw error;return data;}
export async function assignIssue(id:string,input:unknown,requestId:string){const v=assignmentSchema.parse(input);const {data,error}=await requireClient().rpc('assign_issue',{target_id:id,department:v.department,officer:v.officer,assignment_reason:v.reason,request_id:requestId});if(error)throw error;return data as {task_id:string;deadline:string|null};}
export async function tasks(demo:boolean,issueId?:string):Promise<Task[]>{if(demo)return sampleTasks;let q=requireClient().from('tasks').select('*').order('created_at',{ascending:false}).limit(100);if(issueId)q=q.eq('issue_id',issueId);const {data,error}=await q;if(error)throw error;return data??[];}
export async function auditEntries(demo:boolean,page:number):Promise<{rows:AuditEntry[];count:number}>{if(demo)return {rows:sampleAudit,count:0};const {data,error,count}=await requireClient().from('audit_logs').select('id,action,object_type,object_id,reason,created_at,new_values',{count:'exact'}).order('created_at',{ascending:false}).range(page*25,page*25+24);if(error)throw error;return {rows:data??[],count:count??0};}
