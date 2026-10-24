"use client";
import {useEffect,useRef,useState} from 'react';
import type {SatelliteFeed} from '@/lib/satellite-elements';
import {isAstronomicalNight,type Place} from '@/lib/sky';
import type {SatellitePassResult} from '@/lib/satellite-passes';
import PassWorker from '@/lib/satellite-pass.worker?worker';
import {satelliteViewingAltitude,satelliteViewingSunAltitude,satelliteViewingMinimumMs} from '@/lib/satellite-viewing-rules';
import {satellitePassSummary} from '@/lib/satellite-pass-summary';
import SatelliteWindowActions from './satellite-window-actions';
import SatelliteWindowWeather from './satellite-window-weather';
import type {SatelliteWeather} from '@/lib/satellite-weather';

const utc=(time:number)=>new Date(time).toISOString().replace('T',' ').replace(/\.\d{3}Z$/,' UTC');
type State={loading:boolean;result:SatellitePassResult|null;message:string};
export default function SatellitePasses({feed,start,place,onDate,weather,now}:{feed:SatelliteFeed;start:number;place:Place;onDate:(date:Date)=>void;weather:SatelliteWeather;now:number}){
 const elements=feed.elements,{latitude,longitude}=place;
 const active=useRef<{worker:Worker;timer:ReturnType<typeof setTimeout>}|null>(null);
 const [state,setState]=useState<State>({loading:false,result:null,message:''});
 const stop=()=>{const current=active.current;if(current){clearTimeout(current.timer);current.worker.terminate();active.current=null}};
 useEffect(()=>()=>{const current=active.current;if(current){clearTimeout(current.timer);current.worker.terminate();active.current=null}},[]);
 const search=()=>{
  if(active.current){stop();setState(previous=>({...previous,loading:false,message:'Pass search cancelled.'}));return}
  setState(previous=>({...previous,loading:true,message:''}));
  try{
   const worker=new PassWorker();
   const fail=(message:string)=>{if(active.current?.worker!==worker)return;stop();setState(previous=>({...previous,loading:false,message}))};
   const timer=setTimeout(()=>fail('The pass search timed out. Try again, or use selected-time directions.'),15000);
   active.current={worker,timer};
   worker.onmessage=({data}:{data:{result?:SatellitePassResult;error?:string}})=>{
    if(active.current?.worker!==worker)return;
    if(!data.result){fail(data.error||'Pass calculations are unavailable.');return}
    const result={...data.result,passes:data.result.passes.filter(pass=>{
     const times=[pass.rise,pass.peak,pass.set];
     for(let time=pass.rise;time<pass.set;time+=30000)times.push(time);
     return times.every(time=>isAstronomicalNight(new Date(time),place));
    })};
    stop();setState({loading:false,result,message:satellitePassSummary(result)});
   };
   worker.onerror=event=>{event.preventDefault();fail('The background pass calculator could not load. Reconnect and try again; selected-time directions remain available.')};
   worker.onmessageerror=()=>fail('The background calculator returned an unreadable result. Try again.');
   worker.postMessage({elements,start,latitude,longitude});
  }catch{stop();setState(previous=>({...previous,loading:false,message:'Background calculations are unavailable in this browser. Selected-time directions remain available.'}))}
 };
 return <section className="satellite-passes" aria-label="Upcoming ISS passes">
  <h3>Upcoming horizon passes</h3><p className="muted">Search the 24 hours after your selected instant, using the orbital data already loaded. Only passes with full darkness at every 30-second sample and at rise, peak and set are shown. All times below are UTC.</p>
  <button className="button" type="button" onClick={search}>{state.loading?'Cancel pass search':state.result?'Recalculate ISS passes':'Find next 24 hours of ISS passes'}</button>
  <p role="status" aria-atomic="true">{state.loading?'Calculating horizon crossings in the background…':state.message}</p>
  {state.result&&<>
   <p className="footnote">Window: {utc(state.result.start)} to {utc(state.result.end)}.{state.result.epochLimited?' This search stops at the supported three-day orbital limit.':''}</p>
   <p className="footnote">Window criteria: above {satelliteViewingAltitude}°, fully sunlit, Sun below {satelliteViewingSunAltitude}°, lasting at least {satelliteViewingMinimumMs/1000} seconds. These criteria do not filter for weather or object brightness.</p>
   {state.result.passes.length===0?<p>No full-darkness horizon pass was found for this site in this window. This says nothing about other dates or sites.</p>:<ol className="satellite-pass-list">{state.result.passes.map(pass=><li key={pass.peak}>
    <div className="satellite-pass-heading"><strong>{pass.maximumAltitude.toFixed(1)}° highest altitude</strong><span>{pass.alreadyUp?'Already above horizon at start':'Horizon rise'} · {utc(pass.rise)}</span></div>
    <dl><div><dt>{pass.alreadyUp?'Bearing at start':'Rise bearing'}</dt><dd>{pass.riseAzimuth.toFixed(1)}°</dd></div><div><dt>Highest in window</dt><dd>{utc(pass.peak)} · {pass.peakAzimuth.toFixed(1)}° bearing</dd></div><div><dt>{pass.continues?'Still above horizon at end':'Horizon set'}</dt><dd>{utc(pass.set)} · {pass.setAzimuth.toFixed(1)}° bearing</dd></div></dl>
    {pass.lighting?<dl className="satellite-pass-lighting"><div><dt>ISS lighting at highest point</dt><dd>{pass.lighting.sunlight==='sunlit'?'Sunlit':pass.lighting.sunlight==='earth-shadow'?'In Earth’s shadow':`Partly shadowed · ${Math.round(pass.lighting.shadow*100)}% of Sun obscured`}</dd></div><div><dt>Sun centre at highest point</dt><dd>{pass.lighting.sunAltitude.toFixed(1)}° altitude</dd></div></dl>:<p className="footnote">Lighting at the highest point is unavailable. The horizon times above remain geometric.</p>}
    <div className={`satellite-viewing-windows${pass.viewing?.length?' has-window':''}`}><strong>Sunlit windows above {satelliteViewingAltitude}° · Sun below {satelliteViewingSunAltitude}°</strong>{pass.viewing===null?<p>Window calculation unavailable. Horizon times and available peak facts remain usable.</p>:pass.viewing.length?<><p>Select a window’s midpoint to plan within its modelled conditions.</p><ul>{pass.viewing.map(window=><li key={window.start}>{utc(window.start)} – {utc(window.end)}{window.startsAtBoundary?' · begins at search boundary':''}{window.endsAtBoundary?' · ends at search boundary':''}<SatelliteWindowWeather start={window.start} end={window.end} weather={weather} now={now}/><SatelliteWindowActions window={window} feed={feed} place={place} onDate={onDate}/></li>)}</ul></>:<p>No window meeting these criteria in this pass.</p>}</div>
    <button type="button" className="button satellite-peak-time" aria-label={`Set observing time to ISS peak at ${utc(pass.peak)}`} onClick={()=>onDate(new Date(pass.peak))}>Set observing time to this peak</button>
   </li>)}</ol>}
   {state.result.passes.some(pass=>pass.viewing?.length)&&<p className="footnote">Calendar files include this site’s name and coordinates, the orbital epoch and retrieval time. Import them into your calendar app to keep a fixed snapshot. Calendar apps display UTC events in their own time zone; recheck Nightjar before observing.</p>}
   <p className="footnote">Modelled windows require ISS above {satelliteViewingAltitude}°, its whole solar disc clear of Earth’s shadow and the Sun centre below {satelliteViewingSunAltitude}°. Only overlaps lasting at least {satelliteViewingMinimumMs/1000} seconds are shown. The model uses a spherical Earth shadow and an approximate Sun position. Weather, brightness, obstructions, source uncertainty and manoeuvres still affect whether and when you can see ISS.</p>
   <p className="footnote">Models: <a href="https://shashwatak.github.io/satellite-js/docs/sun-and-shadow" target="_blank" rel="noreferrer">satellite.js Sun and shadow<span className="sr-only"> (opens in a new tab)</span></a> · <a href="https://aa.usno.navy.mil/faq/RST_defs" target="_blank" rel="noreferrer">USNO twilight definitions<span className="sr-only"> (opens in a new tab)</span></a>.</p>
  </>}
 </section>;
}
