import {useEffect,useState} from 'react';
import {MapContainer,TileLayer,CircleMarker,Popup,useMap,useMapEvents,GeoJSON} from 'react-leaflet';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {Layers,LocateFixed} from 'lucide-react';
import {viewport} from '../../services/issues';
import {layerFeatures} from '../../services/datasets';
import {Badge} from '../../components/ui';
import 'leaflet/dist/leaflet.css';
function boundsOf(map:ReturnType<typeof useMap>){const b=map.getBounds();return [Math.max(-180,b.getWest()),Math.max(-90,b.getSouth()),Math.min(180,b.getEast()),Math.min(90,b.getNorth())];}
function Features({demo,severity,status,type,datasetId}:{demo:boolean;severity:string;status:string;type:string;datasetId:string}){
 const {t}=useTranslation(),map=useMap(),[bounds,setBounds]=useState<number[]>(()=>boundsOf(map));
 useMapEvents({moveend(){setBounds(boundsOf(map));}});
 const issues=useQuery({queryKey:['viewport',demo,bounds,severity,status,type],queryFn:({signal})=>viewport(demo,bounds,severity,signal,status,type),staleTime:15000});
 const layer=useQuery({queryKey:['map-layer',demo,datasetId,bounds],queryFn:({signal})=>layerFeatures(demo,datasetId,bounds,signal),enabled:!!datasetId,staleTime:15000});
 return <>{(issues.error||layer.error)&&<div className="map-error" role="alert">{t('operationFailed')}</div>}{layer.data&&datasetId&&<GeoJSON key={datasetId+JSON.stringify(bounds)} data={layer.data} style={{color:'var(--violet)',weight:4,opacity:.8,fillOpacity:.12}}/>}{layer.data&&layer.data.features.length>=500&&<div className="layer-cap">{t('layerLimit')}</div>}{issues.data?.map(i=><CircleMarker key={i.id} center={[i.latitude,i.longitude]} radius={i.severity==='CRITICAL'?8:6} pathOptions={{color:'white',weight:2,fillColor:i.severity==='CRITICAL'?'var(--critical)':i.severity==='HIGH'?'var(--warning)':'var(--primary)',fillOpacity:.95}}><Popup><strong>{i.title}</strong><p>{i.issue_id} · {i.ward}</p><Badge value={i.severity}/><p><Link to={`${demo?'/demo':''}/issues/${i.id}`}>{t('issue')} →</Link></p></Popup></CircleMarker>)}</>;
}
function Resize(){const map=useMap();useEffect(()=>{const ro=new ResizeObserver(()=>map.invalidateSize());ro.observe(map.getContainer());return()=>ro.disconnect();},[map]);return null;}
function Recenter(){const map=useMap(),{t}=useTranslation();return <button className="map-recenter" aria-label={t('city')} onClick={()=>map.setView([23.030,72.573],13)}><LocateFixed size={19}/></button>;}
export default function CityMap({demo=true,severity='',compact=false,status='',type='',datasetId=''}:{demo?:boolean;severity?:string;compact?:boolean;status?:string;type?:string;datasetId?:string}){
 const {t}=useTranslation(),[basemap,setBasemap]=useState(false);
 return <div className={`city-map ${compact?'compact':''}`}><MapContainer center={[23.030,72.573]} zoom={13} minZoom={3} maxBounds={[[-85,-180],[85,180]]} scrollWheelZoom={!compact} zoomControl={!compact}><TileLayer key={String(basemap)} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO' url={basemap?'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png':'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}/><Features demo={demo} severity={severity} status={status} type={type} datasetId={datasetId}/><Resize/><Recenter/></MapContainer><div className="map-legend"><span><i className="dot red"/>{t('critical')}</span><span><i className="dot amber"/>{t('highSeverity')}</span><span><i className="dot blue"/>{t('issues')}</span></div><button className="map-layer" aria-label={t('layer')} onClick={()=>setBasemap(v=>!v)}><Layers size={17}/></button><span className="map-coordinate">23.0300° N &nbsp; 72.5730° E</span></div>;
}
