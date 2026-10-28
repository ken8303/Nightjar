"use client";

import {downloadFile} from '@/lib/download';
import {useMemo} from 'react';
import {ArrowUpRight, Download, Moon, Star} from 'lucide-react';
import {meteorCalendar} from '@/lib/calendar';
import {meteorCloudSummary, meteorConditions, meteorEvents, upcomingMeteorOccurrences} from '@/lib/meteor-planning';
import {Place} from '@/lib/sky';
import {deepSkyTimestampFormatter as planningTimestampFormatter} from '@/lib/deep-sky-time';

type Hourly={time:number[];cloud_cover:(number|null)[]};
export default function MeteorPlanner({date,place,hourly,onExplore,onNotice}:{date:Date;place:Place;hourly?:Hourly;onExplore:(date:Date)=>void;onNotice:(message:string)=>void}){
 const plans=useMemo(()=>upcomingMeteorOccurrences(date,place.timezone||'UTC').map(occurrence=>({
  ...occurrence,conditions:meteorConditions(occurrence.event,occurrence.year,place,hourly,date),
 })),[date,place,hourly]);
 const omitted=meteorEvents.length-plans.length;
 const timezone=place.timezone||'UTC';
 const format=planningTimestampFormatter(date,timezone).format;
 function download(name:string,year:number,month:number,day:number){
  try{
   downloadFile(new Blob([meteorCalendar(name,year,month,day)],{type:'text/calendar;charset=utf-8'}),`${name.toLowerCase().replaceAll(' ','-')}-${year}.ics`);
   onNotice('Typical peak-date reference prepared as an all-day calendar file. Check the current IMO bulletin and the dark observing window before planning your session.');
  }catch{onNotice('The calendar file could not be created. Please try again.')}
 }
 return <><div className="section-intro"><h3>The next meteor showers</h3><p className="muted">Upcoming or ongoing typical peak nights. Only complete hours after your selected observing time are sampled for {place.name} in {timezone}; they are not predictions of meteor counts.</p></div>{omitted>0&&<p role="status" className="muted">{plans.length?`${omitted} upcoming typical peak ${omitted===1?'night falls':'nights fall'} beyond supported UTC years 1–9999. Only supported occurrences are shown.`:'No further typical meteor peak nights within supported UTC years 1–9999. Choose an earlier observing time.'}</p>}<div className="event-grid">{plans.map(({event,year,conditions})=>{
  const {darkHours,moonFreeHours,window,moonIllumination,moonIlluminationTime}=conditions;
  return <section className="panel event-card" key={event.name}>
   <div className="section-label"><span>{event.date.toUpperCase()} · {year}</span><Star size={18}/></div>
   <h2>{event.name}</h2><p className="muted">{event.note}</p>
   <div className="event-stats"><span><strong>{event.rate}</strong><small>meteors / hour, ideal</small></span><span><strong>{moonIllumination===null?'Unavailable':`${Math.round(moonIllumination*100)}%`}</strong><small>{moonIlluminationTime?`Moon lit at ${format(moonIlluminationTime)}`:'No remaining dark hour'}</small></span></div>
   <div className="meteor-conditions"><div><Moon size={16}/><span>{darkHours?`${darkHours} remaining dark ${darkHours===1?'hour':'hours'} · ${moonFreeHours} with Moon down`:'No complete dark hour remains on these local dates'}</span></div>{window?<p>Longest remaining Moon-free window: <strong>{format(window.start)} – {format(window.end)}</strong></p>:<p>{darkHours?'No complete Moon-free dark hour remains.':'Try another location or another shower.'}</p>}<p>{meteorCloudSummary(conditions)}</p></div>
   <div className="meteor-actions"><button className="text-button" disabled={!window} onClick={()=>{if(window)onExplore(window.start)}}>Explore {window?'window':'window unavailable'} <ArrowUpRight size={16}/></button><button className="text-button calendar-download" onClick={()=>download(event.name,year,event.month,event.day)}><Download size={16}/>Download peak-date reference</button></div>
  </section>})}</div><p className="footnote">Complete dark hours require the geometric Sun centre below −18° throughout the hour. Moon-free hours also require the apparent Moon centre below the ideal horizon; terrain and weather can change the view. Calendar downloads contain typical peak dates as all-day references. Use the dark-window times above to plan your observing session. Moon illumination is calculated at the start of the recommended Moon-free window, or the first remaining dark hour if there is no Moon-free window. A shower’s radiant height and the exact yearly peak are not modelled. Annual date reference: <a href="https://www.imo.net/resources/calendar/" target="_blank" rel="noreferrer">International Meteor Organization calendars ↗</a>. Check the current year’s bulletin before planning a trip.</p></>;
}
