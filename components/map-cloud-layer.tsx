'use client';
import {useEffect,useRef,useState} from 'react';
import type {Map as LeafletMap} from 'leaflet';
import {isAstronomicalNight} from '@/lib/sky';
import {useLanguage} from '@/components/language-provider';
import {usePlanningClock} from '@/hooks/use-planning-clock';
type Sample={latitude:number;longitude:number;cloud:number|null};
type Data={time:number;fetchedAt:number;sites:Sample[]};
function parse(value:unknown,time:number):Data{
 if(!value||typeof value!=='object')throw Error('Invalid forecast');
 const data=value as Record<string,unknown>;
 if(data.time!==time||typeof data.fetchedAt!=='number'||!Number.isFinite(data.fetchedAt)||!Array.isArray(data.sites)||data.sites.length>25)throw Error('Invalid forecast');
 const sites=data.sites.map((entry:unknown)=>{
  if(!entry||typeof entry!=='object')throw Error('Invalid forecast');const s=entry as Record<string,unknown>;
  if(typeof s.latitude!=='number'||!Number.isFinite(s.latitude)||Math.abs(s.latitude)>85||typeof s.longitude!=='number'||!Number.isFinite(s.longitude)||Math.abs(s.longitude)>180||!(s.cloud===null||typeof s.cloud==='number'&&Number.isFinite(s.cloud)&&s.cloud>=0&&s.cloud<=100)||!isAstronomicalNight(new Date(time),{name:'',latitude:s.latitude,longitude:s.longitude}))throw Error('Invalid forecast');
  return {latitude:s.latitude,longitude:s.longitude,cloud:s.cloud as number|null};
 });return {time,fetchedAt:data.fetchedAt,sites};
}
export default function MapCloudLayer({map,date}:{map:LeafletMap;date:Date}){
 const {tr}=useLanguage(),now=usePlanningClock(),time=+date;
 const [enabled,setEnabled]=useState(false),[data,setData]=useState<Data|null>(null),[status,setStatus]=useState<'idle'|'loading'|'error'>('idle'),[moved,setMoved]=useState(false);
 const pending=useRef<AbortController|null>(null);
 const previousTime=useRef(time);
 useEffect(()=>{const move=()=>{pending.current?.abort();pending.current=null;setData(null);setStatus('idle');setMoved(true)};map.on('moveend zoomend',move);return()=>{map.off('moveend zoomend',move);pending.current?.abort();pending.current=null}},[map,time]);
 useEffect(()=>{if(previousTime.current===time)return;previousTime.current=time;pending.current?.abort();pending.current=null;setData(null);setStatus('idle');setMoved(true)},[time]);
 async function load(){
  pending.current?.abort();const controller=new AbortController();pending.current=controller;let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort()},15000);setData(null);setStatus('loading');setMoved(false);
  try{const bounds=map.getBounds(),south=Math.max(-85,bounds.getSouth()),north=Math.min(85,bounds.getNorth()),west=Math.max(-180,bounds.getWest()),east=Math.min(180,bounds.getEast());const params=new URLSearchParams({south:String(south),north:String(north),west:String(west),east:String(east),time:String(time)});const response=await fetch(`/api/map-clouds?${params}`,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error('Unavailable');const next=parse(await response.json(),time);if(pending.current===controller&&!controller.signal.aborted){setData(next);setStatus('idle')}}
  catch{if(pending.current===controller&&(!controller.signal.aborted||timedOut))setStatus('error')}
  finally{clearTimeout(timer);if(pending.current===controller)pending.current=null}
 }
 const current=data?.time===time?data:null,stale=!current||now-current.fetchedAt>=30*60000||current.fetchedAt-now>60000;
 useEffect(()=>{
  if(!enabled||!current||stale)return;let disposed=false,layer:import('leaflet').LayerGroup|null=null;
  import('leaflet').then(L=>{if(disposed)return;layer=L.layerGroup().addTo(map);for(const s of current.sites){if(s.cloud===null)continue;L.circleMarker([s.latitude,s.longitude],{radius:8,stroke:true,color:'#17242b',weight:1,fillColor:s.cloud<30?'#54d3bd':s.cloud<70?'#f3cc70':'#e9edf2',fillOpacity:.9,interactive:false}).addTo(layer)}}).catch(()=>{if(!disposed)setStatus('error')});
  return()=>{disposed=true;layer?.remove()};
 },[map,current,enabled,stale]);
 return <div className="map-cloud-layer"><label><input type="checkbox" checked={enabled} onChange={event=>{const next=event.target.checked;setEnabled(next);if(next)void load();else{pending.current?.abort();pending.current=null;setStatus('idle');setData(null)}}}/> {tr('Show cloud forecast samples','顯示雲量預報樣本')}</label>{enabled&&<><p className="footnote">{tr('Up to 25 Open-Meteo samples for the selected time, only where the Sun is below −18°. Green: under 30%, yellow: 30–69%, white: 70–100%. Dots are samples, not a continuous cloud map.','所選時間最多顯示 25 個 Open-Meteo 樣本，僅限太陽低於 −18° 的區域。綠色：低於 30%；黃色：30–69%；白色：70–100%。圓點只是樣本，並非連續雲圖。')}</p>{status==='loading'&&<p role="status">{tr('Loading cloud samples…','正在載入雲量樣本…')}</p>}{status==='error'&&<p role="status">{tr('Cloud samples are unavailable.','無法取得雲量樣本。')}</p>}{moved&&<p role="status">{tr('Map area or time changed. Refresh samples.','地圖範圍或時間已變更，請更新樣本。')}</p>}{current&&<p className="footnote">{tr('Selected forecast time: ','所選預報時間：')}<time dateTime={new Date(time).toISOString()}>{new Date(time).toISOString()}</time> · {tr('Open-Meteo, hourly cloud cover','Open-Meteo 每小時雲量')}</p>}{current&&current.sites.length>0&&current.sites.every(site=>site.cloud===null)&&<p role="status">{tr('No cloud estimates are available for this time.','此時段沒有可用的雲量估算。')}</p>}{current&&!current.sites.length&&<p role="status">{tr('No fully dark sample locations in this map area.','此地圖範圍沒有處於全天文黑夜的樣本地點。')}</p>}{current&&stale&&<p role="status">{tr('Cloud samples are stale or the device clock changed. Refresh them.','雲量樣本已過時或裝置時鐘已變更，請重新取得。')}</p>}<button className="button" type="button" disabled={status==='loading'} onClick={load}>{tr('Refresh cloud samples','更新雲量樣本')}</button></>}</div>;
}
