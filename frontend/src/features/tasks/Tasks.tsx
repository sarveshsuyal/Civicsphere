import {Link,useLocation} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {tasks} from '../../services/operations';
import {Badge,Loading,ErrorState} from '../../components/ui';
import Sla from './Sla';
export default function Tasks(){const {t}=useTranslation(),demo=useLocation().pathname.startsWith('/demo');const query=useQuery({queryKey:['tasks',demo],queryFn:()=>tasks(demo)});return <><div className="page-heading"><div><h1>{t('tasks')}</h1><p>{t('taskIntro')}</p></div></div><section className="panel">{query.isLoading?<Loading/>:query.error?<ErrorState message={t('operationFailed')} retry={()=>void query.refetch()}/>:!query.data?.length?<div className="state"><h2>{t('noTasks')}</h2>{demo&&<p>{t('noLiveDemo')}</p>}</div>:<div className="table-scroll"><table><thead><tr>{['task','status','issue','sla'].map(k=><th key={k}>{t(k)}</th>)}</tr></thead><tbody>{query.data.map(task=><tr key={task.id}><td><strong>{task.task_id}</strong></td><td><Badge value={task.status}/></td><td><Link to={`/issues/${task.issue_id}`}>{t('issue')} →</Link></td><td><Sla started={task.assigned_at} deadline={task.deadline}/></td></tr>)}</tbody></table></div>}</section></>;}
