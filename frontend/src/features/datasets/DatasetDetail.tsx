import {useState} from 'react';
import {Link,useParams,useLocation} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {ArrowLeft,MapPinned,Download} from 'lucide-react';
import {dataset,jobs,queueDataset,sourceUrl} from '../../services/datasets';
import {Badge,Loading,ErrorState} from '../../components/ui';
import {useAuth} from '../auth/Auth';
import {permitted} from '../../types/domain';
import JobTable from '../jobs/JobTable';
export default function DatasetDetail(){
 const {t,i18n}=useTranslation(),{id=''}=useParams(),location=useLocation(),{profile}=useAuth(),cache=useQueryClient();
 const demo=location.pathname.startsWith('/demo'),base=demo?'/demo':'';
 const allowed=!demo&&permitted(profile,['SUPER_ADMIN','ADMIN','GIS_ANALYST','DATA_MANAGER']);
 const query=useQuery({queryKey:['dataset',demo,id],queryFn:()=>dataset(demo,id),refetchInterval:q=>['VALIDATING','PROCESSING'].includes(q.state.data?.status??'')?3000:false});
 const history=useQuery({queryKey:['dataset-jobs',demo,id],queryFn:()=>jobs(demo,id),refetchInterval:demo?false:5000});
 const [crs,setCrs]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function process(){setBusy(true);setError('');try{const code=query.data?.status==='NEEDS_CRS'?Number(crs):undefined;if(code!==undefined&&(!Number.isInteger(code)||code<1||code>999999))throw new Error('INVALID_CRS');await queueDataset(id,code);await cache.invalidateQueries();}catch{setError(t('operationFailed'));}finally{setBusy(false);}}
 async function download(){if(!query.data)return;try{const url=await sourceUrl(query.data.storage_path);window.location.assign(url);}catch{setError(t('sourceUnavailable'));}}
 if(query.isLoading)return <Loading/>;if(query.error)return <ErrorState message={t('operationFailed')} retry={()=>void query.refetch()}/>;const d=query.data;if(!d)return <ErrorState message={t('missingDataset')}/>;
 const quality=d.metadata.quality??{};
 return <><Link className="back-link" to={base+'/datasets'}><ArrowLeft size={16}/>{t('backDatasets')}</Link><div className="page-heading"><div><div className="eyebrow">{t('datasets')}</div><h1>{d.name}</h1><p>{t(demo?'demoDataset':'importPending')}</p></div><Badge value={d.status}/></div>{location.state?.queueError&&<div role="alert" className="notice">{t('queueFailed')}</div>}<div className="detail-grid"><div><section className="panel detail-panel"><h2>{t('quality')}</h2><div className="quality-grid">{[['qualityValidity','geometry_validity_percent','%'],['qualityDuplicates','duplicate_feature_percent','%'],['qualityMissing','missing_properties_percent','%'],['qualityRepairs','repaired_count','']].map(([label,key,suffix])=><div key={key}><span>{t(label)}</span><strong>{quality[key]===undefined?'—':`${quality[key]}${suffix}`}</strong></div>)}</div>{d.processing_error&&<p className="form-error" role="alert">{d.processing_error}</p>}{d.status==='READY'&&<Link className="button primary" to={base+'/map?dataset='+d.id}><MapPinned size={17}/>{t('showLayer')}</Link>}</section><section className="panel"><div className="panel-heading"><h2>{t('processingHistory')}</h2></div>{history.isLoading?<Loading/>:history.error?<ErrorState message={t('operationFailed')}/>:<JobTable rows={history.data??[]} demo={demo}/>}</section></div><aside><section className="panel detail-panel">{[['type',d.dataset_type],['sourceCrs',d.original_crs??'—'],['targetCrs',d.target_crs],['featureCount',d.feature_count?.toLocaleString(i18n.language)??'—'],['geometryType',d.geometry_type??'—'],['fileSize',`${(d.file_size/1024).toLocaleString(i18n.language,{maximumFractionDigits:1})} KB`]].map(([k,v])=><div className="detail-property" key={k}><span>{t(k)}</span><strong>{v}</strong></div>)}{!demo&&d.status==='READY'&&<button className="wide" onClick={()=>void download()}><Download size={15}/>{t('originalFile')}</button>}</section>{allowed&&['UPLOADED','FAILED','NEEDS_CRS'].includes(d.status)&&<section className="panel detail-panel"><h2>{t(d.status==='NEEDS_CRS'?'crsRequired':'process')}</h2>{d.status==='NEEDS_CRS'&&<><p>{t('crsHelp')}</p><label>{t('epsgCode')}<input type="number" min={1} max={999999} value={crs} onChange={e=>setCrs(e.target.value)}/></label></>}<button className="primary wide" disabled={busy||(d.status==='NEEDS_CRS'&&!crs)} onClick={()=>void process()}>{t(d.status==='NEEDS_CRS'?'confirmCrs':d.status==='FAILED'?'retryProcess':'process')}</button></section>}{error&&<p className="form-error" role="alert">{error}</p>}</aside></div></>;
}
