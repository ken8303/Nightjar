"use client";
import {lazy,useState} from 'react';
import DeferredView from '@/components/deferred-view';
import type {Place} from '@/lib/sky';
import type {SatelliteWeather} from '@/lib/satellite-weather';
import type {SatelliteFreshness} from '@/lib/satellite-validity';
const SatelliteReading=lazy(()=>import('./satellite-reading'));
export default function SatelliteTracker({date,place,onDate,weather,onRefreshWeather}:{date:Date;place:Place;onDate:(date:Date,freshness:SatelliteFreshness)=>void;weather:SatelliteWeather;onRefreshWeather:()=>void}){
 const [opened,setOpened]=useState(false);
 return <section className="panel satellite-tracker"><div className="section-label">SATELLITE DIRECTIONS · ISS</div><h2>A moving point in the sky.</h2><p className="muted">Calculate the International Space Station’s direction at your observing time. Nightjar shares one orbital-data cache across observers; your site and time are used locally for orbital calculations.</p><button className="button" type="button" aria-expanded={opened} onClick={()=>setOpened(value=>!value)}>{opened?'Close ISS directions':'Load ISS directions'}</button>{opened&&<DeferredView name="ISS directions"><SatelliteReading date={date} place={place} onDate={onDate} weather={weather} onRefreshWeather={onRefreshWeather}/></DeferredView>}<p className="footnote">Orbit source: <a href="https://celestrak.org/NORAD/documentation/gp-data-formats.php" target="_blank" rel="noreferrer">CelesTrak GP data<span className="sr-only"> (opens in a new tab)</span></a> · SGP4 calculations: <a href="https://github.com/shashwatak/satellite-js" target="_blank" rel="noreferrer">satellite.js<span className="sr-only"> (opens in a new tab)</span></a> · <a href="/licenses/satellite-js.txt" target="_blank" rel="noreferrer">licence<span className="sr-only"> (opens in a new tab)</span></a>. Online data is required; opening this panel keeps your plan unchanged.</p></section>;
}
