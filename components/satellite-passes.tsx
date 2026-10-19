"use client";
import {useEffect,useRef,useState} from 'react';
import type {OrbitElements} from '@/lib/satellite-elements';
import type {SatellitePassResult} from '@/lib/satellite-passes';
import PassWorker from '@/lib/satellite-pass.worker?worker';

const utc=(time:number)=>new Date(time).toISOString().replace('T',' ').replace(/\.\d{3}Z$/,' UTC');
type State={loading:boolean;result:SatellitePassResult|null;message:string};
export default function SatellitePasses({elements,start,latitude,longitude}:{elements:OrbitElements;start:number;latitude:number;longitude:number}){
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
    stop();setState({loading:false,result:data.result,message:`${data.result.passes.length} geometric ${data.result.passes.length===1?'pass':'passes'} found in this search window.`});
   };
   worker.onerror=event=>{event.preventDefault();fail('The background pass calculator could not load. Reconnect and try again; selected-time directions remain available.')};
   worker.onmessageerror=()=>fail('The background calculator returned an unreadable result. Try again.');
   worker.postMessage({elements,start,latitude,longitude});
  }catch{stop();setState(previous=>({...previous,loading:false,message:'Background calculations are unavailable in this browser. Selected-time directions remain available.'}))}
 };
 return <section className="satellite-passes" aria-label="Upcoming ISS passes">
  <h3>Upcoming horizon passes</h3><p className="muted">Search the 24 hours after your selected instant, using the orbital data already loaded. All times below are UTC.</p>
  <button className="button" type="button" onClick={search}>{state.loading?'Cancel pass search':state.result?'Recalculate ISS passes':'Find next 24 hours of ISS passes'}</button>
  <p role="status" aria-atomic="true">{state.loading?'Calculating horizon crossings in the background…':state.message}</p>
  {state.result&&<>
   <p className="footnote">Window: {utc(state.result.start)} to {utc(state.result.end)}.{state.result.epochLimited?' This search stops at the supported three-day orbital limit.':''}</p>
   {state.result.passes.length===0?<p>No geometric horizon pass was found for this site in this window. This says nothing about other dates or sites.</p>:<ol className="satellite-pass-list">{state.result.passes.map(pass=><li key={pass.peak}>
    <div className="satellite-pass-heading"><strong>{pass.maximumAltitude.toFixed(1)}° highest altitude</strong><span>{pass.alreadyUp?'Already above horizon at start':'Horizon rise'} · {utc(pass.rise)}</span></div>
    <dl><div><dt>{pass.alreadyUp?'Bearing at start':'Rise bearing'}</dt><dd>{pass.riseAzimuth.toFixed(1)}°</dd></div><div><dt>Highest in window</dt><dd>{utc(pass.peak)} · {pass.peakAzimuth.toFixed(1)}° bearing</dd></div><div><dt>{pass.continues?'Still above horizon at end':'Horizon set'}</dt><dd>{utc(pass.set)} · {pass.setAzimuth.toFixed(1)}° bearing</dd></div></dl>
   </li>)}</ol>}
   <p className="footnote">Geometric passes may occur in daylight or while ISS is in Earth’s shadow. These are not visible-pass predictions. Crossings and peaks are numerically refined, but source uncertainty, manoeuvres and local obstructions can shift actual times.</p>
  </>}
 </section>;
}
