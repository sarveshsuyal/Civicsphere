import {useEffect,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {slaState} from '../../types/operations';
export default function Sla({started,deadline}:{started:string;deadline:string|null}){
 const {t,i18n}=useTranslation(),[now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
 let sla;try{sla=slaState(started,deadline,now);}catch{return <span>—</span>;}
 return <div className={`sla-state ${sla.state}`}><strong>{t(sla.state)}</strong>{deadline&&<><time dateTime={deadline}>{new Date(deadline).toLocaleString(i18n.language)}</time><progress max={100} value={Math.min(100,sla.percent)} aria-label={t('elapsed')}/><span>{Math.round(sla.percent)}% · {sla.remainingMs!==null&&`${(Math.max(0,sla.remainingMs)/3600000).toLocaleString(i18n.language,{maximumFractionDigits:1})} ${t('hours')}`}</span></>}</div>;
}
