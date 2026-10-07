"use client";

import {useMemo} from 'react';
import {Compass, Moon, ArrowUpRight} from 'lucide-react';
import {Place, milkyWayPlanning, timeLabel} from '@/lib/sky';

const compassDirection=(degrees:number)=>['N','NE','E','SE','S','SW','W','NW'][Math.round(degrees/45)%8];

export default function MilkyWayPlanner({date,place,onDate}:{date:Date;place:Place;onDate:(date:Date)=>void}){
 const plan=useMemo(()=>milkyWayPlanning(date,place),[date,place]);
 const timezone=place.timezone||'UTC';
 const stamp=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:timezone,timeZoneName:'shortOffset'});
 const moonFree=plan.best&&plan.best.moonAltitude<0;
 return <section className="panel milky-way-planner" aria-labelledby="milky-way-title">
  <div className="section-label"><span>MILKY WAY PLANNER</span><Compass size={18}/></div>
  <div className="milky-way-heading"><div><h2 id="milky-way-title">Find the galactic core direction.</h2><p className="muted">A guide to the bright Sagittarius region, based on your place and observing time.</p></div><span className="milky-way-badge">DIRECTION ONLY</span></div>
  <div className="milky-way-facts">
   <div><small>At selected time</small><strong>{plan.current.altitude>0?`${Math.round(plan.current.altitude)}° up`:'Below horizon'}</strong><span>{compassDirection(plan.current.azimuth)} · {Math.round(plan.current.azimuth)}° azimuth</span></div>
   <div><small>Highest dark window in next 24 hours</small><strong>{plan.best?(+plan.first!.date===+plan.last!.date?`${timeLabel(plan.first!.date,timezone)} sample`:`${timeLabel(plan.first!.date,timezone)}–${timeLabel(plan.last!.date,timezone)}`):'None in 24 hours'}</strong>{plan.best?<><span>{stamp.format(plan.first!.date)}{+plan.first!.date!==+plan.last!.date&&<> → {stamp.format(plan.last!.date)}</>}</span><span>Sun at or below −18° · core at or above 10°</span></>:<span>Try another date or location</span>}</div>
   <div><small>Highest in that window</small><strong>{plan.best?`${Math.round(plan.best.altitude)}° at ${timeLabel(plan.best.date,timezone)}`:'—'}</strong><span>{plan.best?`${stamp.format(plan.best.date)} · Moon ${moonFree?'below horizon':`${Math.round(plan.best.moonIllumination*100)}% lit and above horizon`}`:'No fully dark sample at or above 10°'}</span></div>
  </div>
  {plan.best&&<button type="button" className="button milky-way-action" onClick={()=>onDate(plan.best!.date)}>Set observing time to highest point <ArrowUpRight size={16}/></button>}
  <p className="footnote"><Moon size={14} aria-hidden="true"/> Windows are sampled every 15 minutes and ranked by core altitude; Moon glare does not affect the ranking. Dates and UTC offsets identify both ends of the window. The marker shows a sightline, not a visible object or a map of the Milky Way. Dark skies and a low Moon help; clouds, light pollution and local terrain are not included. <a href="https://science.nasa.gov/asset/hubble/compass-and-scale-image-for-milky-way-center/" target="_blank" rel="noreferrer">Position source: NASA</a>.</p>
 </section>;
}
