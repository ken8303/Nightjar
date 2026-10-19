"use client";
import {lazy,useRef,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import DeferredView from '@/components/deferred-view';
import {hasLightPollutionCoverage,lightPollutionAtlas,lightPollutionZones} from '@/lib/light-pollution';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
const LightPollutionMap=lazy(()=>import('@/components/light-pollution-map'));

export default function LightPollutionReference({latitude,longitude,name}:{latitude:number;longitude:number;name:string}){
 const [opened,setOpened]=useState(false),loadButton=useRef<HTMLButtonElement>(null);
 const covered=hasLightPollutionCoverage(latitude,longitude);
 return <div className="light-pollution-reference"><h3>Explore a darker site</h3><p className="muted">David Lorenz’s 2025 atlas models artificial sky brightness at the zenith, directly overhead. It uses annual satellite observations and atmospheric modelling; it is separate from your personal Bortle rating.</p>
  {covered?<><p className="footnote">Loading shares the viewed map area with the atlas provider and OpenStreetMap. Internet access is required; map tiles are not downloaded for offline use.</p><button ref={loadButton} type="button" className="button" aria-expanded={opened} onClick={event=>{const owner=event.currentTarget;setOpened(value=>!value);if(opened)deferFocusAndScroll(()=>loadButton.current,{owner})}}>{opened?'Close light-pollution map':'Load light-pollution map'}</button>{opened&&<DeferredView name="Light-pollution map"><LightPollutionMap latitude={latitude} longitude={longitude} name={name}/></DeferredView>}</>:<p className="footnote">This site is outside the model’s latitude coverage (65°S up to, but not including, 75°N). Your observing site and sky calculations still use its exact coordinates.</p>}
  <details className="light-pollution-legend"><summary>2025 model legend and limitations</summary><p className="footnote">Each value is artificial brightness divided by an assumed natural zenith brightness of 22.0 mag/arcsec². Smaller ratios mean less modelled artificial light. These zones are not Bortle classes.</p><ul>{lightPollutionZones.map((entry,index)=><li key={entry.zone}><span aria-hidden="true" style={{background:entry.color}}/><span>Zone {entry.zone}</span><strong>{Number.isFinite(entry.below)?`${index===0?'0':lightPollutionZones[index-1].below} – < ${entry.below}`:'≥ 46.77'}</strong></li>)}</ul><p className="footnote">The world model covers 65°S–75°N. Natural brightness varies, and clouds, terrain, local glare and atmospheric conditions can change the sky you see. Missing tiles and areas outside coverage are unavailable, never a zero-light reading. This map does not change your weather score or saved sky rating.</p></details>
  <a className="button" href="https://djlorenz.github.io/astronomy/lp/overlay/dark.html" target="_blank" rel="noreferrer">Open source atlas <ArrowUpRight size={16}/><span className="sr-only"> (opens in a new tab)</span></a><p className="footnote">Source: <a href={lightPollutionAtlas.source} target="_blank" rel="noreferrer">David Lorenz Light Pollution Atlas<span className="sr-only"> (opens in a new tab)</span></a> · <a href={lightPollutionAtlas.legend} target="_blank" rel="noreferrer">colour definitions<span className="sr-only"> (opens in a new tab)</span></a>. Dataset year stays 2025 when you change your observing date.</p>
 </div>;
}
