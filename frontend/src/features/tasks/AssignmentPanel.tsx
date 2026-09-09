import {useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useAuth} from '../auth/Auth';
import {permitted} from '../../types/domain';
import {assignmentSchema} from '../../types/operations';
import {assignmentOptions,assignIssue,tasks} from '../../services/operations';
import {Modal,Loading,ErrorState} from '../../components/ui';
import Sla from './Sla';
export default function AssignmentPanel({issueId,status,demo}:{issueId:string;status:string;demo:boolean}){
 const {t}=useTranslation(),{profile}=useAuth(),cache=useQueryClient();
 const allowed=!demo&&permitted(profile,['SUPER_ADMIN','ADMIN','CITY_OFFICER','DEPARTMENT_MANAGER']);
 const [open,setOpen]=useState(false),[department,setDepartment]=useState(''),[officer,setOfficer]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const request=useRef(crypto.randomUUID());
 const options=useQuery({queryKey:['assignment-options'],queryFn:assignmentOptions,enabled:allowed&&open});
 const assigned=useQuery({queryKey:['issue-tasks',issueId,demo],queryFn:()=>tasks(demo,issueId)});
 async function submit(){if(busy)return;setError('');const parsed=assignmentSchema.safeParse({department,officer,reason});if(!parsed.success){setError(t('validationFailed'));return;}setBusy(true);try{await assignIssue(issueId,parsed.data,request.current);await cache.invalidateQueries();setOpen(false);}catch{setError(t('operationFailed'));}finally{setBusy(false);}}
 return <section className="panel detail-panel"><h2>{t('sla')}</h2>{assigned.data?.map(task=><div className="assignment-summary" key={task.id}><strong>{task.task_id}</strong><Sla started={task.assigned_at} deadline={task.deadline}/></div>)}{assigned.error&&<ErrorState message={t('operationFailed')}/>}<p>{t('slaIntro')}</p>{status==='VERIFIED'&&allowed&&<button className="primary wide" onClick={()=>setOpen(true)}>{t('assign')}</button>}{!assigned.data?.length&&status!=='VERIFIED'&&<p className="muted">{t('assignmentRequired')}</p>}<Modal open={open} onClose={()=>!busy&&setOpen(false)} title={t('assign')}><p>{t('assignmentIntro')}</p>{options.isLoading?<Loading/>:options.error?<ErrorState message={t('operationFailed')} retry={()=>void options.refetch()}/>:<div className="operations-form"><label>{t('department')}<select value={department} disabled={busy} onChange={e=>{setDepartment(e.target.value);setOfficer('');}}><option value="">{t('selectDepartment')}</option>{options.data?.departments.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label><label>{t('officer')}<select value={officer} disabled={busy||!department} onChange={e=>setOfficer(e.target.value)}><option value="">{t('selectOfficer')}</option>{options.data?.officers.filter(o=>o.department_id===department).map(o=><option key={o.id} value={o.id}>{o.display_name}</option>)}</select></label><label>{t('assignmentReason')}<textarea value={reason} disabled={busy} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={2000}/></label>{error&&<p role="alert" className="form-error">{error}</p>}<button className="primary" disabled={busy||!department||!officer||reason.trim().length<10} onClick={()=>void submit()}>{t('assignAction')}</button></div>}</Modal></section>;
}
