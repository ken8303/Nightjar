"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {parseSatelliteFeed,type SatelliteFeed} from '@/lib/satellite-elements';
import {satelliteDataIssue,satelliteHorizontal} from '@/lib/satellite-position';
import type {Place} from '@/lib/sky';
import SatellitePasses from './satellite-passes';

type State={status:'idle'|'loading'|'error'|'ready';feed:SatelliteFeed|null;error:string};
export default function SatelliteReading({date,place}:{date:Date;place:Place}){
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
  <button type="button" className="button" onClick={()=>{if(state.status==='loading'){request.current?.abort('user-cancel');return}setNow(Date.now());setState(previous=>({...previous,status:'loading',error:''}));setAttempt(value=>value+1)}}>{state.status==='loading'?'Cancel satellite request':state.status==='error'?'Retry satellite service':state.status==='idle'?'Load orbital data':'Refresh satellite data'}</button>
  <div role="status" aria-atomic="true">
   {state.status==='loading'&&<p>Loading shared ISS orbital data…</p>}
   {state.error&&<p className={state.status==='error'?'error':'footnote'}>{state.error} {state.status==='error'?'Unavailable data does not mean the sky is empty.':''}</p>}
   {state.feed&&<>
    {state.feed.issue&&<p className="notice">{state.feed.issue} These are the last successfully cached elements.</p>}
    {issue?<p className="notice">{issue}</p>:position?<><dl className="satellite-facts"><div><dt>Geometric altitude</dt><dd>{position.altitude.toFixed(1)}°</dd></div><div><dt>Compass bearing</dt><dd>{position.azimuth.toFixed(1)}°</dd></div><div><dt>Range</dt><dd>{Math.round(position.rangeKm).toLocaleString('en-GB')} km</dd></div></dl><p>{position.altitude>0?'ISS is above the geometric horizon at your selected time.':'ISS is below the geometric horizon at your selected time.'}</p></>:<p className="notice">The orbit could not be propagated at this instant. No direction is shown.</p>}
    <p className="footnote">Orbital epoch: {parseOrbitalEpochLabel(state.feed.elements.EPOCH)}. Source retrieved: {state.feed.fetchedAt.replace('T',' ').replace('.000Z',' UTC').replace('Z',' UTC')}. Refresh {state.feed.refreshPaused?'is paused for server investigation':`is eligible after ${state.feed.nextRefreshAt.replace('T',' ').replace('.000Z',' UTC').replace('Z',' UTC')}`}.</p>
   </>}
  </div>
  {state.feed&&!issue&&position&&<SatellitePasses key={`${state.feed.fetchedAt}:${JSON.stringify(state.feed.elements)}:${+date}:${place.latitude}:${place.longitude}`} elements={state.feed.elements} start={+date} latitude={place.latitude} longitude={place.longitude}/>}
  <p className="footnote">Directions use your selected site and UTC instant, with a sea-level observer and no refraction. Above the horizon does not establish visibility. Pass cards estimate sunlight and Sun altitude at their highest point; weather, terrain, ISS brightness and manoeuvres remain unmodelled. Current elements are limited to a three-day epoch window. Directions follow the selected instant; live animation is not enabled.</p>
 </div>;
}
function parseOrbitalEpochLabel(value:string){return value.replace('T',' ').replace(/Z?$/,' UTC')}
