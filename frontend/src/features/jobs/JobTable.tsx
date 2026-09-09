import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import type {Job} from '../../types/operations';
import {Badge} from '../../components/ui';
export default function JobTable({rows,demo=false}:{rows:Job[];demo?:boolean}){
 const {t,i18n}=useTranslation();
 if(!rows.length)return <div className="state"><p>{t('noJobs')}</p></div>;
 return <div className="table-scroll"><table><thead><tr>{['timestamp','status','progress','attempts','datasetName'].map(k=><th key={k}>{t(k)}</th>)}</tr></thead><tbody>{rows.map(j=><tr key={j.id}><td>{new Date(j.created_at).toLocaleString(i18n.language)}</td><td><Badge value={j.status}/>{j.error&&<small className="form-error">{j.error}</small>}</td><td><progress value={j.progress} max={100} aria-label={t('progress')}/><small>{j.progress}%</small></td><td>{j.attempts}</td><td><Link to={`${demo?'/demo':''}/datasets/${j.dataset_id}`}>{t('viewDataset')} →</Link></td></tr>)}</tbody></table></div>;
}
