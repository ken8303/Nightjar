"use client";

import {downloadFile} from '@/lib/download';
import {useMemo} from 'react';
import {ArrowUpRight, Download, Moon, Star} from 'lucide-react';
import {meteorCalendar} from '@/lib/calendar';
import {meteorConditions, meteorEvents, nextMeteorYear} from '@/lib/meteor-planning';
import {Place} from '@/lib/sky';

type Hourly={time:number[];cloud_cover:(number|null)[]};
export default function MeteorPlanner({date,place,hourly,onExplore,onNotice}:{date:Date;place:Place;hourly?:Hourly;onExplore:(date:Date)=>void;onNotice:(message:string)=>void}){
 const plans=useMemo(()=>meteorEvents.map(event=>{
  const year=nextMeteorYear(event,date);
  return {event,year,conditions:meteorConditions(event,year,place,hourly),peak:new Date(Date.UTC(year,event.month,event.day))};
 }).sort((a,b)=>+a.peak-+b.peak),[date,place,hourly]);
 const timezone=place.timezone||'UTC';
 const format=(value:Date)=>new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:timezone}).format(value);
 function download(name:string,year:number,month:number,day:number){
  try{
   downloadFile(new Blob([meteorCalendar(name,year,month,day)],{type:'text/calendar;charset=utf-8'}),`${name.toLowerCase().replaceAll(' ','-')}-${year}.ics`);
   onNotice('Calendar file prepared for download. Import it into your calendar app.');
  }catch{onNotice('The calendar file could not be created. Please try again.')}
 }
 return <><div className="section-intro"><h3>The next meteor showers</h3><p className="muted">Annual typical peak dates after your selected observing time. Dark and Moon-free hours are sampled for {place.name} in {timezone}; they are not predictions of meteor counts.</p></div><div className="event-grid">{plans.map(({event,year,conditions,peak})=>{
  const {darkHours,moonFreeHours,window,moonIllumination,cloudCover}=conditions;
  return <section className="panel event-card" key={event.name}>
   <div className="section-label"><span>{event.date.toUpperCase()} · {year}</span><Star size={18}/></div>
   <h2>{event.name}</h2><p className="muted">{event.note}</p>
   <div className="event-stats"><span><strong>{event.rate}</strong><small>meteors / hour, ideal</small></span><span><strong>{Math.round(moonIllumination*100)}%</strong><small>Moon lit near peak</small></span></div>
   <div className="meteor-conditions"><div><Moon size={16}/><span>{darkHours?`${darkHours} sampled dark hours · ${moonFreeHours} with Moon down`:'No complete dark hour on these local dates'}</span></div>{window?<p>Longest Moon-free window: <strong>{format(window.start)} – {format(window.end)}</strong></p>:<p>{darkHours?'No complete Moon-free dark hour was found.':'Try another location or another shower.'}</p>}<p>{cloudCover===null?'Cloud forecast unavailable for this peak window.':`Forecast cloud cover during sampled dark hours: about ${cloudCover}% average.`}</p></div>
   <div className="meteor-actions"><button className="text-button" onClick={()=>onExplore(window?.start||peak)}>Explore {window?'window':'peak dates'} <ArrowUpRight size={16}/></button><button className="text-button calendar-download" onClick={()=>download(event.name,year,event.month,event.day)}><Download size={16}/>Download calendar event</button></div>
  </section>})}</div><p className="footnote">Complete hours are checked every 15 minutes, including their end, with Sun altitude below −18° and Moon below the horizon; terrain and weather can change the view. A shower’s radiant height and the exact yearly peak are not modelled. Annual date reference: <a href="https://www.imo.net/resources/calendar/" target="_blank" rel="noreferrer">International Meteor Organization calendars ↗</a>. Check the current year’s bulletin before planning a trip.</p></>;
}
