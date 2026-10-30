"use client";
import {useEffect,useRef,useState} from 'react';
import type {SatelliteFeed} from '@/lib/satellite-elements';
import type {Place} from '@/lib/sky';
import {fullDarknessPasses} from '@/lib/satellite-night';
import type {SatellitePassResult} from '@/lib/satellite-passes';
import PassWorker from '@/lib/satellite-pass.worker?worker';
import {satelliteViewingAltitude,satelliteViewingSunAltitude,satelliteViewingMinimumMs} from '@/lib/satellite-viewing-rules';
import {satellitePassSummary} from '@/lib/satellite-pass-summary';
import SatelliteWindowActions from './satellite-window-actions';
import SatelliteWindowWeather from './satellite-window-weather';
import type {SatelliteWeather} from '@/lib/satellite-weather';
import {satelliteFreshnessIssue,type SatelliteFreshness} from '@/lib/satellite-validity';
import {useLanguage} from '@/components/language-provider';
import {satelliteStatusLabel} from '@/lib/satellite-language';

const utc=(time:number)=>new Date(time).toISOString().replace('T',' ').replace(/\.\d{3}Z$/,' UTC');
type State={loading:boolean;result:SatellitePassResult|null;message:string};
export default function SatellitePasses({feed,start,place,onDate,weather,now}:{feed:SatelliteFeed;start:number;place:Place;onDate:(date:Date,freshness:SatelliteFreshness)=>void;weather:SatelliteWeather;now:number}){
 const {language,t}=useLanguage();
 const elements=feed.elements,{latitude,longitude}=place;
 const freshness={fetchedAt:feed.fetchedAt,epoch:elements.EPOCH};
 const active=useRef<{worker:Worker;timer:ReturnType<typeof setTimeout>}|null>(null);
 const [state,setState]=useState<State>({loading:false,result:null,message:''});
 const stop=()=>{const current=active.current;if(current){clearTimeout(current.timer);current.worker.terminate();active.current=null}};
 useEffect(()=>()=>{const current=active.current;if(current){clearTimeout(current.timer);current.worker.terminate();active.current=null}},[]);
 const search=()=>{
  if(active.current){stop();setState(previous=>({...previous,loading:false,message:'Pass search cancelled.'}));return}
  const issue=satelliteFreshnessIssue(freshness,new Date(start),Date.now());
  if(issue){setState(previous=>({...previous,loading:false,result:null,message:issue}));return}
  setState(previous=>({...previous,loading:true,message:''}));
  try{
   const worker=new PassWorker();
   const fail=(message:string)=>{if(active.current?.worker!==worker)return;stop();setState(previous=>({...previous,loading:false,message}))};
   const timer=setTimeout(()=>fail('The pass search timed out. Try again, or use selected-time directions.'),15000);
   active.current={worker,timer};
   worker.onmessage=({data}:{data:{result?:SatellitePassResult;error?:string}})=>{
    if(active.current?.worker!==worker)return;
    if(!data.result){fail(data.error||'Pass calculations are unavailable.');return}
    const issue=satelliteFreshnessIssue(freshness,new Date(start),Date.now());
    if(issue){fail(issue);return}
    const result=fullDarknessPasses(data.result,place);
    stop();setState({loading:false,result,message:satellitePassSummary(result)});
   };
   worker.onerror=event=>{event.preventDefault();fail('The background pass calculator could not load. Reconnect and try again; selected-time directions remain available.')};
   worker.onmessageerror=()=>fail('The background calculator returned an unreadable result. Try again.');
   worker.postMessage({elements,start,latitude,longitude});
  }catch{stop();setState(previous=>({...previous,loading:false,message:'Background calculations are unavailable in this browser. Selected-time directions remain available.'}))}
 };
 const resultSummary=()=>{if(!state.result||language==='en'||state.message!==satellitePassSummary(state.result))return satelliteStatusLabel(state.message,language,t);const passes=state.result.passes.length,windows=state.result.passes.reduce((sum,pass)=>sum+(pass.viewing?.length??0),0),unavailable=state.result.passes.filter(pass=>pass.viewing===null).length;return t('iss.passSummary',{passes,windows})+(unavailable?t('iss.passSummaryUnavailable',{count:unavailable}):'')};
 return <section className="satellite-passes" aria-label={t('iss.passesLabel')}>
  <h3>{t('iss.passesTitle')}</h3><p className="muted">{t('iss.passesIntro')}</p>
  <button className="button" type="button" onClick={search}>{t(state.loading?'iss.cancelPasses':state.result?'iss.recalculate':'iss.findPasses')}</button>
  <p role="status" aria-atomic="true">{state.loading?t('iss.calculating'):resultSummary()}</p>
  {state.result&&<>
   {state.result.epochLimited&&<p className="footnote">{t('iss.epochLimited')}</p>}
   <p className="footnote">{t('iss.windowCriteria',{altitude:satelliteViewingAltitude,seconds:satelliteViewingMinimumMs/1000,sun:satelliteViewingSunAltitude})}</p>
   {state.result.passes.length===0?<p>{t('iss.noPasses')}</p>:<ol className="satellite-pass-list">{state.result.passes.map(pass=><li key={pass.peak}>
    <div className="satellite-pass-heading"><strong>{t('iss.highest',{altitude:pass.maximumAltitude.toFixed(1)})}</strong><span>{t(pass.alreadyUp?'iss.alreadyUp':'iss.rise')} · {utc(pass.rise)}</span></div>
    <dl><div><dt>{t(pass.alreadyUp?'iss.bearingStart':'iss.riseBearing')}</dt><dd>{pass.riseAzimuth.toFixed(1)}°</dd></div><div><dt>{t('iss.highestWindow')}</dt><dd>{t('iss.bearingValue',{time:utc(pass.peak),bearing:pass.peakAzimuth.toFixed(1)})}</dd></div><div><dt>{t(pass.continues?'iss.stillAbove':'iss.set')}</dt><dd>{t('iss.bearingValue',{time:utc(pass.set),bearing:pass.setAzimuth.toFixed(1)})}</dd></div></dl>
    {pass.lighting?<dl className="satellite-pass-lighting"><div><dt>{t('iss.peakLighting')}</dt><dd>{pass.lighting.sunlight==='sunlit'?t('iss.sunlit'):pass.lighting.sunlight==='earth-shadow'?t('iss.shadow'):t('iss.partialShadow',{percent:Math.round(pass.lighting.shadow*100)})}</dd></div><div><dt>{t('iss.sunPeak')}</dt><dd>{t('iss.altitudeValue',{altitude:pass.lighting.sunAltitude.toFixed(1)})}</dd></div></dl>:<p className="footnote">{t('iss.noLighting')}</p>}
    <div className={`satellite-viewing-windows${pass.viewing?.length?' has-window':''}`}><strong>{t('iss.sunlitWindows',{altitude:satelliteViewingAltitude})}</strong>{pass.viewing===null?<p>{t('iss.windowUnavailable')}</p>:pass.viewing.length?<><p>{t('iss.midpointHelp')}</p><ul>{pass.viewing.map(window=><li key={window.start}>{utc(window.start)} – {utc(window.end)}{window.startsAtBoundary?t('iss.startBoundary'):''}{window.endsAtBoundary?t('iss.endBoundary'):''}<SatelliteWindowWeather start={window.start} end={window.end} weather={weather} now={now}/><SatelliteWindowActions window={window} feed={feed} place={place} onDate={onDate}/></li>)}</ul></>:<p>{t('iss.noWindow')}</p>}</div>
    <button type="button" className="button satellite-peak-time" aria-label={t('iss.setPeakLabel',{time:utc(pass.peak)})} onClick={()=>onDate(new Date(pass.peak),freshness)}>{t('iss.setPeak')}</button>
   </li>)}</ol>}
   {state.result.passes.some(pass=>pass.viewing?.length)&&<p className="footnote">{t('iss.calendarNote')}</p>}
   <p className="footnote">{t('iss.modelNote',{altitude:satelliteViewingAltitude,sun:satelliteViewingSunAltitude,seconds:satelliteViewingMinimumMs/1000})}</p>
   <p className="footnote">{t('iss.models')} <a href="https://shashwatak.github.io/satellite-js/docs/sun-and-shadow" target="_blank" rel="noreferrer">{t('iss.shadowLink')}<span className="sr-only">{t('iss.newTab')}</span></a> · <a href="https://aa.usno.navy.mil/faq/RST_defs" target="_blank" rel="noreferrer">{t('iss.twilightLink')}<span className="sr-only">{t('iss.newTab')}</span></a>.</p>
  </>}
 </section>;
}
