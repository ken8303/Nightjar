"use client";

import {useEffect,useRef,useState} from 'react';
import {fetchLightPollutionSample,type LightPollutionCell,type LightPollutionSample} from '@/lib/light-pollution-sample';
import {lightPollutionAtlas} from '@/lib/light-pollution';

type Result={state:'idle'}|{state:'loading'}|{state:'error';message:string}|{state:'ready';sample:LightPollutionSample};
// Parent keys this component by grid cell; changing point retires its request.
export default function LightPollutionReading({cell,disabled}:{cell:LightPollutionCell;disabled:boolean}){
 const [result,setResult]=useState<Result>({state:'idle'});
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>{request.current?.abort();request.current=null},[]);
 const read=async()=>{
  request.current?.abort();const controller=new AbortController();request.current=controller;setResult({state:'loading'});
  try{const sample=await fetchLightPollutionSample(cell,{signal:controller.signal});if(request.current===controller)setResult({state:'ready',sample})}
  catch(error){if(request.current===controller&&!controller.signal.aborted)setResult({state:'error',message:error instanceof Error?error.message:'Brightness data is unavailable. Try again later.'})}
  finally{if(request.current===controller)request.current=null}
 };
 const cancel=()=>{request.current?.abort();request.current=null;setResult({state:'idle'})};
 return <div className="light-pollution-reading">
  <h4>Brightness at the map centre</h4>
  <p className="footnote">Loads one {lightPollutionAtlas.year} model tile directly from David Lorenz. The request identifies a 5° area, without sending your exact coordinates. Internet access is required.</p>
  <button type="button" className="button" disabled={disabled&&result.state!=='loading'} onClick={result.state==='loading'?cancel:read}>{result.state==='loading'?'Cancel brightness reading':result.state==='error'?'Retry brightness reading':result.state==='ready'?'Refresh brightness reading':'Read model brightness'}</button>
  <div role="status" aria-atomic="true">
   {result.state==='loading'&&<p>Loading brightness estimate… Moving to another grid cell cancels this reading.</p>}
   {result.state==='error'&&<p className="error">{result.message} Missing data is not a darkness estimate.</p>}
   {result.state==='ready'&&<>
    <dl className="light-pollution-values"><div><dt>Total model brightness</dt><dd>{result.sample.magnitude.toFixed(2)} mag/arcsec²</dd></div><div><dt>Artificial / natural light</dt><dd>{result.sample.ratio.toFixed(result.sample.ratio<.1?3:result.sample.ratio<3?2:1)} ×</dd></div><div><dt>Provider colour zone</dt><dd>{result.sample.zone}</dd></div></dl>
    <p className="footnote">Sampled cell centre {result.sample.latitude.toFixed(4)}°, {result.sample.longitude.toFixed(4)}° · grid spacing 1/120° (about 0.93 km north–south). No interpolation. Higher magnitude means darker sky.</p>
   </>}
  </div>
  <p className="footnote">Annual artificial zenith model, with assumed natural brightness of 22.0 mag/arcsec². Not a measurement, live forecast or Bortle rating. <a href={lightPollutionAtlas.legend} target="_blank" rel="noreferrer">Model assumptions<span className="sr-only"> (opens in a new tab)</span></a>.</p>
 </div>;
}
