import {useLocation} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {jobs} from '../../services/datasets';
import {Loading,ErrorState} from '../../components/ui';
import JobTable from './JobTable';
export default function Jobs(){const {t}=useTranslation(),demo=useLocation().pathname.startsWith('/demo');const query=useQuery({queryKey:['jobs',demo],queryFn:()=>jobs(demo),refetchInterval:demo?false:5000});return <><div className="page-heading"><div><h1>{t('jobsTitle')}</h1><p>{t('jobsIntro')}</p></div></div><section className="panel">{query.isLoading?<Loading/>:query.error?<ErrorState message={t('operationFailed')} retry={()=>void query.refetch()}/>:<JobTable rows={query.data??[]} demo={demo}/>}</section></>;}
