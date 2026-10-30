"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {parseSatelliteFeed,type SatelliteFeed} from '@/lib/satellite-elements';
import {satelliteDataIssue,satelliteHorizontal} from '@/lib/satellite-position';
import type {Place} from '@/lib/sky';
import SatellitePasses from './satellite-passes';
import type {SatelliteWeather} from '@/lib/satellite-weather';
import type {SatelliteFreshness} from '@/lib/satellite-validity';
import {useLanguage} from '@/components/language-provider';
import {languageLocale} from '@/lib/language';
import {satelliteStatusLabel} from '@/lib/satellite-language';

type State={status:'idle'|'loading'|'error'|'ready';feed:SatelliteFeed|null;error:string};
export default function SatelliteReading({date,place,onDate,weather,onRefreshWeather}:{date:Date;place:Place;onDate:(date:Date,freshness:SatelliteFreshness)=>void;weather:SatelliteWeather;onRefreshWeather:()=>void}){
 const {language,t}=useLanguage();
 const localizeStatus=(value:string)=>satelliteStatusLabel(value,language,t);
 const request=useRef<AbortController|null>(null);
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const sync=()=>{if(!document.hidden)setNow(Date.now())};const timer=setInterval(sync,60000);document.addEventListener('visibilitychange',sync);window.addEventListener('pageshow',sync);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',sync);window.removeEventListener('pageshow',sync)}},[]);
 const [attempt,setAttempt]=useState(0),[state,setState]=useState<State>({status:'loading',feed:null,error:''});
 useEffect(()=>{
  const controller=new AbortController();request.current=controller;let retired=false;
  const timeout=setTimeout(()=>controller.abort(),15000);
  fetch('/api/satellite?object=25544',{signal:controller.signal,cache:'no-store'}).then(async response=>{
   const raw:unknown=await response.json();if(!response.ok)throw Error(raw&&typeof raw==='object'&&'error' in raw&&typeof raw.error==='string'?raw.error:'Satellite data is unavailable.');
   const feed=parseSatelliteFeed(raw);if(!retired)setState({status:'ready',feed,error:''});
  }).catch(error=>{if(!retired)setState(previous=>controller.signal.reason==='user-cancel'?{status:previous.feed?'ready':'idle',feed:previous.feed,error:'This browser request was cancelled.'}:({status:'error',feed:previous.feed,error:controller.signal.aborted?'The satellite request timed out. Try again when your connection improves.':error instanceof Error?error.message:'Satellite data is unavailable.'}))}).finally(()=>{clearTimeout(timeout);if(request.current===controller)request.current=null});
  return()=>{retired=true;clearTimeout(timeout);controller.abort();if(request.current===controller)request.current=null};
 },[attempt]);
 const issue=state.feed?satelliteDataIssue(state.feed,date,now):'';
 const position=useMemo(()=>state.feed&&!issue?satelliteHorizontal(state.feed.elements,date,place.latitude,place.longitude):null,[state.feed,issue,date,place.latitude,place.longitude]);
 return <div className="satellite-reading">
  <button type="button" className="button" onClick={()=>{if(state.status==='loading'){request.current?.abort('user-cancel');return}setNow(Date.now());setState(previous=>({...previous,status:'loading',error:''}));setAttempt(value=>value+1)}}>{t(state.status==='loading'?'iss.cancel':state.status==='error'?'iss.retry':state.status==='idle'?'iss.load':'iss.refresh')}</button>
  <div role="status" aria-atomic="true">
   {state.status==='loading'&&<p>{t('iss.loading')}</p>}
   {state.error&&<p className={state.status==='error'?'error':'footnote'}>{localizeStatus(state.error)} {state.status==='error'?t('iss.emptyCaution'):''}</p>}
   {state.feed&&<>
    {state.feed.issue&&<p className="notice">{localizeStatus(state.feed.issue)} {t('iss.cached')}</p>}
    {issue?<p className="notice">{localizeStatus(issue)}</p>:position?<><dl className="satellite-facts"><div><dt>{t('iss.altitude')}</dt><dd>{position.altitude.toFixed(1)}°</dd></div><div><dt>{t('iss.bearing')}</dt><dd>{position.azimuth.toFixed(1)}°</dd></div><div><dt>{t('iss.range')}</dt><dd>{Math.round(position.rangeKm).toLocaleString(languageLocale(language))} km</dd></div></dl><p>{t(position.altitude>0?'iss.above':'iss.below')}</p></>:<p className="notice">{t('iss.propagationFailed')}</p>}
    <p className="footnote">{t('iss.stamps',{epoch:parseOrbitalEpochLabel(state.feed.elements.EPOCH),retrieved:state.feed.fetchedAt.replace('T',' ').replace('.000Z',' UTC').replace('Z',' UTC'),refresh:state.feed.refreshPaused?t('iss.paused'):t('iss.next',{time:state.feed.nextRefreshAt.replace('T',' ').replace('.000Z',' UTC').replace('Z',' UTC')})})}</p>
   </>}
  </div>
  {state.feed&&!issue&&position&&<SatellitePasses key={`${state.feed.fetchedAt}:${JSON.stringify(state.feed.elements)}:${+date}:${place.latitude}:${place.longitude}`} feed={state.feed} start={+date} place={place} onDate={onDate} weather={weather} now={now}/>}
  <button type="button" className="button" disabled={weather.loading} onClick={onRefreshWeather}>{t(weather.loading?'iss.refreshingWeather':'iss.refreshWeather')}</button>
  <p className="footnote">{t('iss.cloudNote')}</p>
  <p className="footnote">{t('iss.directionNote')}</p>
 </div>;
}
function parseOrbitalEpochLabel(value:string){return value.replace('T',' ').replace(/Z?$/,' UTC')}
