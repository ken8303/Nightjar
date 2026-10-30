'use client';
import {useEffect,useRef,useState} from 'react';
import {modelConditionsAt,parseCloudModelResponse,type CloudModels} from '@/lib/cloud-models';
import {isAstronomicalNight,type Place} from '@/lib/sky';
import {forecastHourLabel} from '@/lib/weather-planning';
import {languageLocale} from '@/lib/language';
import {useLanguage} from '@/components/language-provider';
import {forecastFreshness} from '@/lib/forecast-freshness';
import {usePlanningClock} from '@/hooks/use-planning-clock';

type Result={key:string;kind:'loading'|'error'|'ready';data?:CloudModels;fetchedAt?:string};
function CloudModelRow({name,cloud,temperature,humidity}:{name:string;cloud:number|null;temperature:number|null;humidity:number|null}){
 const {language,t}=useLanguage();
 const amount=cloud===null?null:Math.round(cloud),temp=temperature===null?null:new Intl.NumberFormat(languageLocale(language),{maximumFractionDigits:1}).format(temperature);
 return <div><dt>{name}</dt><dd><span className="cloud-model-value-label">{t('models.cloud')}</span> <strong>{amount===null?t('models.unavailable'):`${amount}%`}</strong><span className={`cloud-model-bar${amount===null?' unavailable':''}`} aria-hidden="true">{amount!==null&&<span style={{width:`${amount}%`}}/>}</span><span className="cloud-model-conditions"><span>{t('models.temperature')}<strong>{temp===null?t('models.unavailable'):`${temp} °C`}</strong></span><span>{t('models.humidity')}<strong>{humidity===null?t('models.unavailable'):`${Math.round(humidity)}%`}</strong></span></span></dd></div>;
}
export default function CloudModelComparison({place,date}:{place:Place;date:Date}){
 const {language,t}=useLanguage();
 const now=usePlanningClock();
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
 const values=active?.kind==='ready'&&active.data?modelConditionsAt(active.data,date):null;
 const {stale,clockChanged}=forecastFreshness(active?.kind==='ready'&&active.fetchedAt?Date.parse(active.fetchedAt):undefined,now);
 return <section className="panel cloud-model-comparison" aria-labelledby="cloud-model-heading"><h2 id="cloud-model-heading">{t('models.title')}</h2><p className="muted">{t('models.intro',{place:place.name})}</p><button className="button" type="button" onClick={compare} disabled={active?.kind==='loading'}>{active?.kind==='loading'?t('models.checking'):active?t('models.refresh'):t('models.compare')}</button>{active?.kind==='error'&&<p role="status">{t('models.error')}</p>}{active?.kind==='ready'&&<div role="status"><p className="cloud-model-stamps">{t('models.selected')}<time dateTime={date.toISOString()}>{forecastHourLabel(date,place.timezone||'UTC',languageLocale(language)).full}</time>{place.timezone?'':t('models.noZone')}<br/>{t('models.retrieved')}{active.fetchedAt&&<time dateTime={active.fetchedAt}>{forecastHourLabel(new Date(active.fetchedAt),place.timezone||'UTC',languageLocale(language)).full}</time>}</p>{stale&&<p className="notice">{t('models.staleNotice')}</p>}{clockChanged&&<p className="notice">{t('models.clockNotice')}</p>}{values?<dl><CloudModelRow name="ECMWF IFS 0.25°" cloud={values.cloud.ecmwf} temperature={values.temperature.ecmwf} humidity={values.humidity.ecmwf}/><CloudModelRow name="DWD ICON global" cloud={values.cloud.icon} temperature={values.temperature.icon} humidity={values.humidity.icon}/><CloudModelRow name="NOAA GFS global" cloud={values.cloud.gfs} temperature={values.temperature.gfs} humidity={values.humidity.gfs}/></dl>:<p>{t('models.noCoverage')}</p>}</div>}<p className="footnote">{t('models.notes')}</p></section>;
}
