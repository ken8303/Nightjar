'use client';
import {useEffect,useRef,useState} from 'react';
import type {Map as LeafletMap} from 'leaflet';
import {auroraTimingIssue,validateAuroraFeed,type AuroraFeed} from '@/lib/aurora';
import {isAstronomicalNight} from '@/lib/sky';
import {auroraCellIsFullyDark} from '@/lib/aurora-map';
import {useLanguage} from '@/components/language-provider';
import {usePlanningClock} from '@/hooks/use-planning-clock';

export default function MapAuroraLayer({map}:{map:LeafletMap}){
 const {tr,language}=useLanguage(),now=usePlanningClock();
 const [enabled,setEnabled]=useState(false),[feed,setFeed]=useState<AuroraFeed|null>(null),[status,setStatus]=useState<'idle'|'loading'|'error'>('idle');
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null},[]);
 async function load(){
  pending.current?.abort();const controller=new AbortController();pending.current=controller;let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort()},15000);setStatus('loading');
  try{const response=await fetch('/api/aurora',{signal:controller.signal,cache:'no-store'});if(!response.ok)throw Error('Unavailable');const value=validateAuroraFeed(await response.json());if(!controller.signal.aborted&&pending.current===controller){setFeed(value);setStatus('idle')}}
  catch{if(pending.current===controller&&(!controller.signal.aborted||timedOut))setStatus('error')}
  finally{clearTimeout(timer);if(pending.current===controller)pending.current=null}
 }
 const stale=feed?auroraTimingIssue(feed,now)!==null:true;
 useEffect(()=>{
  if(!enabled||!feed||stale)return;
  let disposed=false,layer:import('leaflet').LayerGroup|null=null;
  import('leaflet').then(L=>{
   if(disposed)return;
   layer=L.layerGroup().addTo(map);
   const draw=()=>{
    if(!layer)return;layer.clearLayers();const bounds=map.getBounds(),date=new Date(feed.forecastAt);
    const detailed=map.getZoom()>=6;
    for(const [longitude,latitude,value] of feed.cells){
     if(value<5||(!detailed&&(latitude%4!==0||longitude%4!==0)))continue;
     const lon=longitude>180?longitude-360:longitude,site={name:'',latitude,longitude:lon};
     const color=value>=60?'#f15c95':value>=30?'#eac557':'#64e9b4';
     if(detailed){
      if(!auroraCellIsFullyDark(date,latitude,lon))continue;
      for(const centre of lon===180?[180,-180]:[lon]){
       const cell:L.LatLngBoundsExpression=[[Math.max(-85,latitude-.5),centre-.5],[Math.min(85,latitude+.5),centre+.5]];
       if(bounds.intersects(L.latLngBounds(cell)))L.rectangle(cell,{stroke:false,fillColor:color,fillOpacity:.45,interactive:false,className:'aurora-forecast-cell'}).addTo(layer);
      }
     }else{
      if(!bounds.contains([latitude,lon])||!isAstronomicalNight(date,site))continue;
      L.circleMarker([latitude,lon],{radius:5,stroke:false,fillColor:color,fillOpacity:.75,interactive:false,className:'aurora-forecast-sample'}).addTo(layer);
     }
    }
   };
   draw();map.on('moveend zoomend',draw);
   if(disposed){map.off('moveend zoomend',draw);layer.remove();layer=null;return}
   cleanup=()=>{map.off('moveend zoomend',draw);layer?.remove();layer=null};
  }).catch(()=>{if(!disposed)setStatus('error')});
  let cleanup:(()=>void)|undefined;
  return()=>{disposed=true;cleanup?.();layer?.remove()};
 },[enabled,feed,stale,map]);
 return <div className="map-aurora-layer"><label><input type="checkbox" checked={enabled} onChange={event=>{const checked=event.target.checked;setEnabled(checked);if(checked&&!feed&&status!=='loading')void load();if(!checked){pending.current?.abort();pending.current=null;setStatus('idle')}}}/> {tr('Show NOAA aurora forecast','顯示 NOAA 極光預報')}</label>{enabled&&<><p className="footnote">{tr('At close zoom, shaded one-degree NOAA cells are shown with a darkness safety margin; at wider zoom, dots sample the model. Green: 5–29%, yellow: 30–59%, pink: 60–100%. Values below 5% are hidden. The model does not guarantee visibility.','放大時顯示具有黑夜安全邊界的 NOAA 一度資料格；縮小時以圓點取樣模型。綠色：5–29%；黃色：30–59%；粉紅色：60–100%；低於 5% 的數值不顯示。模型不保證能看見極光。')}</p>{status==='loading'&&<p role="status">{tr('Loading aurora forecast…','正在載入極光預報…')}</p>}{status==='error'&&<p role="status">{tr('Aurora data is unavailable.','無法取得極光資料。')}</p>}{feed&&<p className="footnote">{tr('NOAA forecast time: ','NOAA 預報時間：')}<time dateTime={feed.forecastAt}>{new Intl.DateTimeFormat(language==='zh-Hant'?'zh-Hant':'en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(feed.forecastAt))} UTC</time>{stale?tr(' · Data is stale or the clock is incorrect; dots are hidden.',' · 資料已過時或裝置時鐘不正確；圓點已隱藏。'):''}</p>}<button type="button" className="button" disabled={status==='loading'} onClick={load}>{tr('Refresh aurora','更新極光預報')}</button></>}</div>;
}
