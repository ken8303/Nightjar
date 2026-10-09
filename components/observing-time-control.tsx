'use client';
import {useRef,useState,useMemo} from 'react';
import {CalendarDays,RefreshCw} from 'lucide-react';
import {observingTimeCandidates,observingTimeValue,observingTimeZone} from '@/lib/observing-time';

export default function ObservingTimeControl({date,timezone,onDate}:{date:Date;timezone?:string;onDate:(date:Date)=>void}){
 const timeInput=useRef<HTMLInputElement>(null);
 const cancel=()=>{setDraft(null);timeInput.current?.focus({preventScroll:true})};
 const [mode,setMode]=useState<'UTC'|'local'>('UTC');
 const siteZone=useMemo(()=>observingTimeZone(timezone),[timezone]);
 if(!siteZone.known&&mode==='local')setMode('UTC');
 const effectiveMode=siteZone.known?mode:'UTC',zone=effectiveMode==='UTC'?'UTC':siteZone.zone,basis=`${+date}:${zone}`;
 const [draft,setDraft]=useState<{basis:string;value:string;choices:Date[]}|null>(null);
 const pending=draft?.basis===basis?draft:null;
 function change(value:string){
  const choices=observingTimeCandidates(value,zone);
  if(choices.length===1){setDraft(null);onDate(choices[0])}
  else setDraft({basis,value,choices});
 }
 const hasFineTime=date.getUTCSeconds()!==0||date.getUTCMilliseconds()!==0;
 const localLabel=new Intl.DateTimeFormat('en-GB',{timeZone:siteZone.zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(date);
 return <section className="time-entry" aria-label="Observing time controls"><div className="time-entry-mode" role="group" aria-label="Time entry zone"><span>Enter time in</span><button type="button" aria-pressed={effectiveMode==='UTC'} onClick={()=>{setMode('UTC');setDraft(null)}}>UTC</button><button type="button" disabled={!siteZone.known} aria-pressed={effectiveMode==='local'} onClick={()=>{setMode('local');setDraft(null)}}>Site local time</button></div><div className="control-bar"><div><CalendarDays size={17}/><label htmlFor="observing-time">Observing time</label><input ref={timeInput} id="observing-time" type="datetime-local" min="0001-01-01T00:00" max="9999-12-31T23:59" value={pending?.value??observingTimeValue(date,zone)} onInput={event=>change(event.currentTarget.value)} onChange={event=>change(event.target.value)} aria-describedby={['observing-time-zone',hasFineTime&&!pending?'observing-time-precision':'',!siteZone.known?'observing-time-zone-warning':''].filter(Boolean).join(' ')} aria-invalid={Boolean(pending)}/><span id="observing-time-zone" className="muted">{!siteZone.known?'UTC · site time zone unavailable':effectiveMode==='UTC'?`UTC · ${localLabel} at site`:siteZone.zone}</span></div><button className="text-button" onClick={()=>{setDraft(null);onDate(new Date())}}>Now <RefreshCw size={14}/></button></div>{!siteZone.known&&<p id="observing-time-zone-warning" className="footnote" role="status">The site’s time zone is unavailable. Enter times in UTC; local-time entry becomes available when a zone is known.</p>}{hasFineTime&&!pending&&<p id="observing-time-precision" className="footnote time-entry-precision">Selected UTC instant: {date.toISOString().replace('T',' ').replace('Z',' UTC')}. Entering a new time uses minute precision.</p>}{pending&&<div className="time-entry-warning" role="status">{pending.choices.length>1?<><p>This local time occurs twice when the clocks go back. Choose which occurrence to use.</p><div>{pending.choices.map(choice=><button className="button" key={+choice} onClick={()=>{setDraft(null);onDate(choice)}}>{new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(choice)} · {choice.toISOString().slice(11,19)} UTC</button>)}</div></>:<p>{pending.value?'This time is incomplete, outside supported UTC years 1–9999, or does not exist in the selected zone. Choose another time.':'Enter a complete observing date and time.'} Your previous observing time remains selected.</p>}<p>Selected UTC instant: {date.toISOString().replace('T',' ').replace('Z',' UTC')}.</p><button className="button" onClick={cancel}>Cancel time edit</button></div>}</section>;
}
