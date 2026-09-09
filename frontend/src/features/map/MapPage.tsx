import {useState,Suspense} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {datasets} from '../../services/datasets';
import CityMap from './CityMap';
import {Loading} from '../../components/ui';
export default function MapPage(){
 const {t}=useTranslation(),demo=useLocation().pathname.startsWith('/demo');
 const [params,setParams]=useSearchParams();
 const [severity,setSeverity]=useState(''),[status,setStatus]=useState(''),[type,setType]=useState('');
 const layer=params.get('dataset')??'';
 const available=useQuery({queryKey:['datasets-map',demo],queryFn:({signal})=>datasets(demo,0,signal)});
 return <><div className="page-heading"><div><div className="eyebrow">{t('spatial')}</div><h1>{t('map')}</h1><p>{t('cityMapSub')}</p></div></div><div className="map-filters"><label>{t('severity')}<select value={severity} onChange={e=>setSeverity(e.target.value)}><option value="">{t('allSeverities')}</option>{['CRITICAL','HIGH','MEDIUM','LOW','INFO'].map(s=><option key={s}>{s}</option>)}</select></label><label>{t('statusFilter')}<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">{t('allStatuses')}</option>{['PENDING_REVIEW','VERIFIED','ASSIGNED','IN_PROGRESS','RESOLVED'].map(s=><option key={s}>{s}</option>)}</select></label><label>{t('typeFilter')}<select value={type} onChange={e=>setType(e.target.value)}><option value="">{t('allCategories')}</option>{['POTHOLE','ROAD_DAMAGE','WATER_LOGGING','DRAINAGE_BLOCKAGE','STREETLIGHT_FAILURE','GARBAGE_ACCUMULATION','WATER_LEAKAGE','OPEN_MANHOLE'].map(s=><option key={s}>{s}</option>)}</select></label><label>{t('layer')}<select value={layer} onChange={e=>setParams(e.target.value?{dataset:e.target.value}:{})}><option value="">{t('noLayer')}</option>{available.data?.rows.filter(d=>d.status==='READY').map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label></div>{available.error&&<p role="alert">{t('operationFailed')}</p>}<section className="panel fullscreen-map"><Suspense fallback={<Loading/>}><CityMap demo={demo} severity={severity} status={status} type={type} datasetId={layer}/></Suspense></section><p className="muted">{demo&&t('demoNotice')} <Link to={`${demo?'/demo':''}/issues`}>{t('allIssues')} →</Link></p></>;
}
