import {useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {Upload,Database,ArrowUpRight} from 'lucide-react';
import {datasets} from '../../services/datasets';
import {Badge,Loading,ErrorState} from '../../components/ui';
import {useAuth} from '../auth/Auth';
import {permitted} from '../../types/domain';
export default function DatasetList(){
 const {t,i18n}=useTranslation(),{profile}=useAuth();
 const demo=useLocation().pathname.startsWith('/demo'),base=demo?'/demo':'';
 const [page,setPage]=useState(0);
 const query=useQuery({queryKey:['datasets',demo,page],queryFn:({signal})=>datasets(demo,page,signal),refetchInterval:demo?false:10000});
 const canUpload=!demo&&permitted(profile,['SUPER_ADMIN','ADMIN','GIS_ANALYST','DATA_MANAGER']);
 return <><div className="page-heading"><div><div className="eyebrow">{t('datasets')}</div><h1>{t('datasetTitle')}</h1><p>{t('datasetText')}</p></div><Link className="button primary" to={base+'/datasets/upload'}><Upload size={16}/>{t('uploadDataset')}</Link></div>
 <div className="notice phase2-notice">{t(demo?'demoDataset':'importPending')}{!demo&&!canUpload&&<p>{t('uploadBlocked')}</p>}</div>
 <section className="panel">{query.isLoading?<Loading/>:query.error?<ErrorState message={t('operationFailed')} retry={()=>void query.refetch()}/>:query.data?.rows.length?<div className="table-scroll"><table><thead><tr>{['name','type','status','featureCount','sourceCrs'].map(x=><th key={x}>{t(x)}</th>)}<th/></tr></thead><tbody>{query.data.rows.map(d=><tr key={d.id}><td><Link to={base+'/datasets/'+d.id}><strong>{d.name}</strong><small>{new Date(d.created_at).toLocaleDateString(i18n.language)}</small></Link></td><td>{d.dataset_type.replaceAll('_',' ')}</td><td><Badge value={d.status}/></td><td>{d.feature_count?.toLocaleString(i18n.language)??'—'}</td><td>{d.original_crs??'—'}</td><td><Link aria-label={t('viewDataset')} to={base+'/datasets/'+d.id}><ArrowUpRight size={17}/></Link></td></tr>)}</tbody></table></div>:<div className="state"><Database/><p>{t('noDatasets')}</p></div>}
 <div className="table-bottom"><span>{query.data?.count??0} {t('datasets')}</span><div><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>{t('previous')}</button><span>{page+1}</span><button disabled={(page+1)*25>=(query.data?.count??0)} onClick={()=>setPage(p=>p+1)}>{t('next')}</button></div></div></section></>;
}
