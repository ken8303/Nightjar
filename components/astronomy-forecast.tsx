'use client';
import {useEffect,useRef,useState} from 'react';
import {parseAstronomyResponse,seeingRanges,transparencyRanges,type AstronomyForecast} from '@/lib/astronomy-forecast';
import {isAstronomicalNight,type Place} from '@/lib/sky';
import {forecastHourLabel} from '@/lib/weather-planning';
import {languageLocale} from '@/lib/language';
import {useLanguage} from '@/components/language-provider';
import {usePlanningClock} from '@/hooks/use-planning-clock';

type Result={key:string;kind:'loading'|'error'|'unconfigured'|'ready';data?:AstronomyForecast;fetchedAt?:number};
export default function AstronomyForecastPanel({place,date,onSelect}:{place:Place;date:Date;onSelect:(date:Date)=>void}){
 const {language,t}=useLanguage(),now=usePlanningClock();
 const key=JSON.stringify([place.latitude,place.longitude]);
 const [result,setResult]=useState<Result|null>(null),pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null},[key]);
 const active=result?.key===key?result:null;
 const dark=isAstronomicalNight(date,place);
 async function load(){
  if(!dark)return;
  pending.current?.abort();const controller=new AbortController();pending.current=controller;
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort()},15000);
  setResult({key,kind:'loading'});
  try{
   const params=new URLSearchParams({lat:String(place.latitude),lon:String(place.longitude)});
   const response=await fetch(`/api/astronomy-forecast?${params}`,{signal:controller.signal,cache:'no-store'});
   if(response.status===503){if(pending.current===controller&&!controller.signal.aborted)setResult({key,kind:'unconfigured'});return}
   if(!response.ok)throw Error('Unavailable');
   const data=parseAstronomyResponse(await response.json());
   if(pending.current===controller&&!controller.signal.aborted)setResult({key,kind:'ready',data,fetchedAt:Date.now()});
  }catch{if(pending.current===controller&&(!controller.signal.aborted||timedOut))setResult({key,kind:'error'})}
  finally{clearTimeout(timer);if(pending.current===controller)pending.current=null}
 }
 if(!dark)return null;
 const data=active?.kind==='ready'?active.data:undefined;
 const samples=data?.samples.filter(sample=>isAstronomicalNight(new Date(sample.time),place))??[];
 const nearest=samples.reduce<(typeof samples)[number]|null>((best,sample)=>Math.abs(sample.time-+date)<=5400000&&(!best||Math.abs(sample.time-+date)<Math.abs(best.time-+date))?sample:best,null);
 const tz=place.timezone||'UTC',format=(time:number)=>forecastHourLabel(new Date(time),tz,languageLocale(language)).full;
 const seeing=(value:number|null)=>value===null?t('astroForecast.unavailable'):`${seeingRanges[value-1]}″`;
 const transparency=(value:number|null)=>value===null?t('astroForecast.unavailable'):`${transparencyRanges[value-1]} ${t('astroForecast.extinctionUnit')}`;
 return <section className="panel astronomy-forecast" aria-labelledby="astronomy-forecast-title"><h2 id="astronomy-forecast-title">{t('astroForecast.title')}</h2><p className="muted">{t('astroForecast.intro')}</p><button className="button" type="button" onClick={load} disabled={active?.kind==='loading'}>{active?.kind==='loading'?t('astroForecast.loading'):active?t('astroForecast.retry'):t('astroForecast.load')}</button>{active?.kind==='unconfigured'&&<p role="status">{t('astroForecast.notConfigured')}</p>}{active?.kind==='error'&&<p role="status">{t('astroForecast.error')}</p>}{data&&<div role="status"><p>{t('astroForecast.issued')} <time dateTime={new Date(data.issuedAt).toISOString()}>{format(data.issuedAt)}</time> · {tz}</p>{(now-data.issuedAt>12*3600000||data.issuedAt-now>3600000)&&<p className="notice">{t('astroForecast.stale')}</p>}{nearest?<><p>{t('astroForecast.sample')} <time dateTime={new Date(nearest.time).toISOString()}>{format(nearest.time)}</time> · {tz}</p><dl className="astronomy-forecast-values"><div><dt>{t('astroForecast.seeing')}</dt><dd>{seeing(nearest.seeing)}</dd></div><div><dt>{t('astroForecast.transparency')}</dt><dd>{transparency(nearest.transparency)}</dd></div></dl></>:<p>{t('astroForecast.noSample')}</p>}{samples.length>0&&<><p>{t('astroForecast.timeline')}</p><div className="astronomy-forecast-timeline">{samples.map(sample=><button type="button" key={sample.time} className="astronomy-forecast-sample" onClick={()=>onSelect(new Date(sample.time))}><time dateTime={new Date(sample.time).toISOString()}>{format(sample.time)}</time><span>{t('astroForecast.seeing')}: {seeing(sample.seeing)}</span><span>{t('astroForecast.transparency')}: {transparency(sample.transparency)}</span></button>)}</div></>}</div>}<p className="footnote">{t('astroForecast.explanation')} <a href="https://github.com/Yeqzids/7timer-issues/wiki/Wiki" target="_blank" rel="noreferrer">7Timer! ↗</a></p></section>;
}
