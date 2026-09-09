import {useRef,useState} from 'react';
import type {FormEvent} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {Upload,ShieldCheck,ArrowLeft} from 'lucide-react';
import {datasetKinds,datasetSchema,uploadExtension} from '../../types/operations';
import {uploadDataset} from '../../services/datasets';
import {useAuth} from '../auth/Auth';
import {permitted} from '../../types/domain';
export default function DatasetUpload(){
 const {t}=useTranslation(),{profile}=useAuth(),navigate=useNavigate();
 const demo=useLocation().pathname.startsWith('/demo'),base=demo?'/demo':'';
 const allowed=!demo&&permitted(profile,['SUPER_ADMIN','ADMIN','GIS_ANALYST','DATA_MANAGER']);
 const [error,setError]=useState(''),[stage,setStage]=useState(''),[busy,setBusy]=useState(false);
 const requestId=useRef(crypto.randomUUID());
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!allowed||busy)return;setError('');
  const values=new FormData(event.currentTarget),file=values.get('file');
  try{
   const input=datasetSchema.parse({name:values.get('name'),kind:values.get('kind')});
   if(!(file instanceof File))throw new Error('FILE_REQUIRED');uploadExtension(file.name,file.size);
   setBusy(true);const result=await uploadDataset(file,input,requestId.current,setStage);
   navigate(base+'/datasets/'+result.id,{state:{queueError:result.queueError}});
  }catch{setError(t('validationFailed')+' '+t('operationFailed'));}finally{setBusy(false);setStage('');}
 }
 return <><Link className="back-link" to={base+'/datasets'}><ArrowLeft size={16}/>{t('backDatasets')}</Link><div className="page-heading"><div><h1>{t('uploadDataset')}</h1><p>{t('uploadIntro')}</p></div><Upload/></div><div className="upload-grid"><section className="panel detail-panel"><form className="operations-form" onSubmit={event=>void submit(event)}><label>{t('datasetName')}<input name="name" required minLength={3} maxLength={120} disabled={!allowed||busy}/></label><label>{t('datasetKind')}<select name="kind" disabled={!allowed||busy}>{datasetKinds.map(kind=><option key={kind} value={kind}>{kind.replaceAll('_',' ')}</option>)}</select></label><label className="upload-drop"><Upload size={28}/><strong>{t('file')}</strong><input name="file" type="file" accept=".geojson,.json,.zip" required disabled={!allowed||busy}/><span>{t('fileHelp')}</span></label>{error&&<p role="alert" className="form-error">{error}</p>}{stage&&<p role="status">{t(stage)}</p>}<button className="primary" disabled={!allowed||busy}>{t('uploadAction')}</button></form></section><aside className="panel detail-panel"><ShieldCheck className="feature-icon"/><h2>{t('security')}</h2><p>{t('fileSecurity')}</p><p>{t('workerRequired')}</p>{!allowed&&<div className="notice">{t('uploadBlocked')}</div>}</aside></div></>;
}
