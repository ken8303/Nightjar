"use client";

import {downloadFile} from '@/lib/download';
import {useMemo, useState, type CSSProperties} from 'react';
import {ArrowUpRight, CalendarDays, Download, Moon} from 'lucide-react';
import {observingWindowLabel} from '@/lib/observing-window-label';
import {observingWindowCalendar} from '@/lib/calendar';
import {sevenNightOutlook} from '@/lib/night-outlook';
import {Place} from '@/lib/sky';
import {usePlanningClock} from '@/hooks/use-planning-clock';

type Hourly={time:number[];cloud_cover:(number|null)[]};
export default function SevenNightOutlook({hourly,place,loading,selectedDate,onDate}:{hourly?:Hourly;place:Place;loading:boolean;selectedDate:Date|null;onDate:(date:Date)=>void}){
 const now=usePlanningClock();
 const nights=useMemo(()=>hourly?.time?.length?sevenNightOutlook(hourly,place,new Date(now)):[],[hourly,place,now]);
 const [downloadResult,setDownloadResult]=useState<{context:string;text:string}|null>(null);
 const downloadContext=JSON.stringify([place.name,place.latitude,place.longitude,place.timezone]);
 const downloadStatus=downloadResult?.context===downloadContext?downloadResult.text:'';
 const setDownloadStatus=(text:string)=>setDownloadResult({context:downloadContext,text});
 const timezone=place.timezone||'UTC';
 const dateLabel=(key:string)=>new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${key}T12:00:00Z`));
 const windowLabel=(start:Date,hours:number)=>observingWindowLabel(start,hours,timezone);
 function download(night:typeof nights[number]){
  if(!night.best)return;
  try{
   const best=night.best;
   const data=observingWindowCalendar({start:best.date,hours:best.hours,place:place.name,latitude:place.latitude,longitude:place.longitude,timezone,score:best.score,cloud:best.cloud,moonAbove:best.moonAbove,moonIllumination:best.moonIllumination});
   downloadFile(new Blob([data],{type:'text/calendar;charset=utf-8'}),`nightjar-${night.key}.ics`);
   setDownloadStatus(`${dateLabel(night.key)} calendar file ready. Open it in your calendar app to add the window.`);
  }catch{setDownloadStatus('The calendar file could not be created. Please try again.')}
 }
 return <section className="panel seven-night-outlook" aria-labelledby="seven-night-title">
  <div className="section-label"><span id="seven-night-title">THE NEXT SEVEN NIGHTS</span><CalendarDays size={18}/></div>
  <p className="muted">Compare forecast hours when the Sun is at least 18° below your horizon in {place.name}. Choose a card to set your observing time.</p>
  {nights.length?<div className="night-outlook-grid">{nights.map(night=>night.best?<div className={`night-outlook-card${selectedDate&&+selectedDate===+night.best.date?' selected':''}`} key={night.key}><button type="button" className="night-outlook-select" onClick={()=>onDate(night.best!.date)} aria-pressed={Boolean(selectedDate&&+selectedDate===+night.best.date)} aria-label={`${dateLabel(night.key)}: planning score ${night.best.score} out of 100; select ${windowLabel(night.best.date,night.best.hours)}`}>
   <span className="night-date">{dateLabel(night.key)} <ArrowUpRight size={15}/></span>
   <span className="night-score" style={{'--night-score':`${night.best.score}%`} as CSSProperties}><strong>{night.best.score}<small>/100</small></strong></span>
   <span>Best {night.best.hours===2?'2-hour window':'forecast hour'} · {windowLabel(night.best.date,night.best.hours)}</span>
   <span>{night.best.cloud}% cloud · {night.forecastHours}/{night.darkHours} dark hours scored</span>
   <span className="night-moon"><Moon size={14}/>{night.best.moonAbove?`${Math.round(night.best.moonIllumination*100)}% lit Moon up at start`:'Moon below horizon at start'}</span>
  </button><button type="button" className="night-outlook-download" onClick={()=>download(night)} aria-label={`Download calendar event for ${dateLabel(night.key)}`}><Download size={14}/> Add to calendar</button></div>:<div className="night-outlook-card unavailable" key={night.key}><span className="night-date">{dateLabel(night.key)}</span><strong>—</strong><span>{night.forecastHours?'No complete dark hour remains in this forecast.':`${night.darkHours} dark samples; cloud forecast unavailable.`}</span></div>)}</div>:<p className="empty-text">{loading?'Loading the seven-night forecast…':hourly?'No fully dark hours in the available forecast for this location.':'Seven-night weather is unavailable. Try refreshing the forecast.'}</p>}
  {downloadStatus&&<p className="night-download-status" role="status">{downloadStatus}</p>}
  <p className="footnote">Window endpoints include dates and UTC offsets. The card date names the observing night; a window after midnight can fall on the next calendar day. Scores use hourly cloud cover, astronomical darkness and Moon illumination. Darkness is checked through each window at 15-minute intervals, including its end. Moon status is at the start. The best available pair of consecutive dark forecast hours is shown; a single hour is used when no pair has complete coverage. Scores are estimates, not astronomical seeing or transparency. Forecast length and coverage vary by location.</p>
 </section>;
}
