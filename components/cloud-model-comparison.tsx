'use client';
import {useEffect,useRef,useState} from 'react';
import {cloudModelsAt,parseCloudModelResponse,type CloudModels} from '@/lib/cloud-models';
import {isAstronomicalNight,type Place} from '@/lib/sky';

type Result={key:string;kind:'loading'|'error'|'ready';data?:CloudModels;fetchedAt?:string};
export default function CloudModelComparison({place,date}:{place:Place;date:Date}){
 const key=JSON.stringify([place.latitude,place.longitude,+date]);
 const [result,setResult]=useState<Result|null>(null),pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null},[key]);
 // Retire the previous snapshot permanently when the site or instant changes.
 if(result&&result.key!==key)setResult(null);
 const active=result?.key===key?result:null;
 const dark=isAstronomicalNight(date,place);
 async function compare(){
  if(!dark)return;
  pending.current?.abort();const controller=new AbortController();pending.current=controller;
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort()},15000);
  setResult({key,kind:'loading'});
  try{
   const params=new URLSearchParams({lat:String(place.latitude),lon:String(place.longitude)});
   const response=await fetch(`/api/cloud-models?${params}`,{signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw Error('Unavailable');
   const data=parseCloudModelResponse(await response.json());
   if(!controller.signal.aborted&&pending.current===controller)setResult({key,kind:'ready',data,fetchedAt:new Date().toISOString()});
  }catch{if(pending.current===controller&&(!controller.signal.aborted||timedOut))setResult({key,kind:'error'})}
  finally{clearTimeout(timer);if(pending.current===controller)pending.current=null}
 }
 if(!dark)return null;
 const values=active?.kind==='ready'&&active.data?cloudModelsAt(active.data,date):null;
 const label=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?`${Math.round(value)}%`:'Unavailable';
 return <section className="panel cloud-model-comparison" aria-labelledby="cloud-model-heading"><h2 id="cloud-model-heading">Compare cloud forecasts</h2><p className="muted">Check two global model estimates for {place.name} at your selected fully dark time. The comparison is requested only when you choose it.</p><button className="button" type="button" onClick={compare} disabled={active?.kind==='loading'}>{active?.kind==='loading'?'Checking cloud models…':active?'Refresh cloud models':'Compare cloud models'}</button>{active?.kind==='error'&&<p role="status">Cloud model comparison is unavailable. Try again.</p>}{active?.kind==='ready'&&<div role="status"><p>Selected time: <time dateTime={date.toISOString()}>{date.toISOString()}</time> · retrieved {active.fetchedAt}</p>{values?<dl><div><dt>NOAA GFS global</dt><dd>{label(values.gfs)}</dd></div><div><dt>DWD ICON global</dt><dd>{label(values.icon)}</dd></div></dl>:<p>No model forecast covers this selected time.</p>}</div>}<p className="footnote">Total cloud cover from Open-Meteo; each model is an estimate for the forecast hour covering the selected time. Differences do not measure confidence or astronomical seeing. Cloud forecasts do not include local obstructions; check current conditions before observing.</p></section>;
}
