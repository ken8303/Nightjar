'use client';
import {useEffect,useRef,useState} from 'react';
import {validLocalHorizon} from '@/lib/local-horizon';
import {useLanguage} from '@/components/language-provider';

type Profile={latitude:number;longitude:number;heights:number[];calculatedAt:string};
function valid(value:unknown,latitude:number,longitude:number):value is Profile{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 return v.latitude===latitude&&v.longitude===longitude&&Array.isArray(v.heights)&&validLocalHorizon(v.heights)&&typeof v.calculatedAt==='string'&&Number.isFinite(Date.parse(v.calculatedAt));
}
export default function TerrainHorizon({latitude,longitude,onApply}:{latitude:number;longitude:number;onApply:(heights:number[])=>void}){
 const {tr}=useLanguage(),key=`nightjar-terrain-v1:${latitude}:${longitude}`;
 const [profile,setProfile]=useState<Profile|null>(()=>{try{if(typeof window==='undefined')return null;const value=JSON.parse(localStorage.getItem(key)||'null');return valid(value,latitude,longitude)?value:null}catch{return null}}),[status,setStatus]=useState<'idle'|'loading'|'error'|'storage'>('idle');
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null},[]);
 async function calculate(){
  pending.current?.abort();const controller=new AbortController();pending.current=controller;let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort()},15000);setStatus('loading');
  try{
   const params=new URLSearchParams({lat:String(latitude),lon:String(longitude)}),response=await fetch(`/api/terrain-horizon?${params}`,{signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw Error('Unavailable');const value:unknown=await response.json();if(!valid(value,latitude,longitude))throw Error('Invalid terrain');
   if(controller.signal.aborted||pending.current!==controller)return;
   setProfile(value);try{localStorage.setItem(key,JSON.stringify(value));setStatus('idle')}catch{setStatus('storage')}
  }catch{if(pending.current===controller&&(!controller.signal.aborted||timedOut))setStatus('error')}
  finally{clearTimeout(timer);if(pending.current===controller)pending.current=null}
 }
 function remove(){pending.current?.abort();pending.current=null;try{localStorage.removeItem(key);setProfile(null);setStatus('idle')}catch{setStatus('storage')}}
 return <div className="terrain-horizon"><h4>{tr('Automatic terrain estimate','自動地形估算')}</h4><p className="footnote">{tr('Open-Meteo elevation samples estimate the horizon in eight directions out to 40 km. Narrow ridges, buildings and trees can be missed; check the actual view. Coordinates are sent to Open-Meteo.','使用 Open-Meteo 高程資料估算八個方向、最遠 40 公里的地平線。狹窄山脊、建築物及樹木可能未計入，請檢查實際視野。座標會傳送至 Open-Meteo。')} {Math.abs(latitude)===90&&tr('At the pole, directions use this site’s selected longitude as their reference.','在極點，方向以此地點所選的經度為參考。')}</p><button type="button" className="button" disabled={status==='loading'} onClick={calculate}>{status==='loading'?tr('Calculating…','正在計算…'):profile?tr('Refresh terrain estimate','重新計算地形估算'):tr('Calculate terrain estimate','計算地形估算')}</button>{status==='error'&&<p role="status">{tr('Terrain data is unavailable or incomplete. Retry; the current horizon was not changed.','地形資料無法取得或不完整。請重試；目前的地平線沒有變更。')}</p>}{status==='storage'&&<p role="status">{tr('Device storage is unavailable. The estimate may not be saved.','無法使用裝置儲存空間，估算結果可能不會儲存。')}</p>}{profile&&<><p className="footnote">{tr('Estimated heights N → NW: ','由北至西北的估算高度：')}{profile.heights.map(height=>`${height}°`).join(' · ')} <time dateTime={profile.calculatedAt}>{new Date(profile.calculatedAt).toLocaleDateString()}</time></p><button className="button" type="button" onClick={()=>onApply(profile.heights)}>{tr('Use terrain estimate in comparison','在比較中使用地形估算')}</button> <button className="button" type="button" onClick={remove}>{tr('Remove saved estimate','移除已儲存的估算')}</button></>}</div>;
}
