'use client';
import {useRef,useState,useMemo,useEffect} from 'react';
import {observingTimeEditLabel} from '@/lib/observing-time-actions';
import {usePendingEditReporter} from '@/hooks/use-pending-edits';
import {CalendarDays,RefreshCw} from 'lucide-react';
import {observingTimeCandidates,observingTimeValue,observingTimeZone} from '@/lib/observing-time';

export default function ObservingTimeControl({date,timezone,onDate,contextRevision=0}:{date:Date;timezone?:string;onDate:(date:Date)=>void;contextRevision?:number}){
 const timeInput=useRef<HTMLInputElement>(null);
 const reportPending=usePendingEditReporter('observing-time',observingTimeEditLabel,true,true);
 const cancel=()=>{clearDraft();timeInput.current?.focus({preventScroll:true})};
 const [mode,setMode]=useState<'UTC'|'local'>('UTC');
 const siteZone=useMemo(()=>observingTimeZone(timezone),[timezone]);
 if(!siteZone.known&&mode==='local')setMode('UTC');
 const effectiveMode=siteZone.known?mode:'UTC',zone=effectiveMode==='UTC'?'UTC':siteZone.zone;
 const [draft,setDraft]=useState<{instant:number;revision:number;zone:string;value:string;choices:Date[]}|null>(null);
 const pending=draft?.instant===+date&&draft.revision===contextRevision?draft:null;
 const inputZone=pending?.zone??zone,zoneChanged=Boolean(pending&&inputZone!==zone);
 useEffect(()=>reportPending(Boolean(pending)),[pending,reportPending]);
 function clearDraft(){setDraft(null);reportPending(false)}
 function change(value:string){
  const choices=observingTimeCandidates(value,inputZone);
  if(choices.length===1){clearDraft();onDate(choices[0])}
  else{setDraft({instant:+date,revision:contextRevision,zone:inputZone,value,choices});reportPending(true)}
 }
 const hasFineTime=date.getUTCSeconds()!==0||date.getUTCMilliseconds()!==0;
 const localLabel=new Intl.DateTimeFormat('en-GB',{timeZone:siteZone.zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(date);
 return <section className="time-entry" aria-label="Observing time controls"><div className="time-entry-mode" role="group" aria-label="Time entry zone"><span>Enter time in</span><button type="button" aria-pressed={effectiveMode==='UTC'} onClick={()=>{setMode('UTC');clearDraft()}}>UTC</button><button type="button" disabled={!siteZone.known} aria-pressed={effectiveMode==='local'} onClick={()=>{setMode('local');clearDraft()}}>Site local time</button></div><div className="control-bar"><div><CalendarDays size={17}/><label htmlFor="observing-time">Observing time</label><input ref={timeInput} id="observing-time" type="datetime-local" min="0001-01-01T00:00" max="9999-12-31T23:59" value={pending?.value??observingTimeValue(date,zone)} onInput={event=>change(event.currentTarget.value)} onChange={event=>change(event.target.value)} aria-describedby={['observing-time-zone',hasFineTime&&!pending?'observing-time-precision':'',!siteZone.known&&!zoneChanged?'observing-time-zone-warning':'',zoneChanged?'observing-time-zone-change':'',pending?'observing-time-issue observing-time-kept-instant':''].filter(Boolean).join(' ')} aria-invalid={Boolean(pending)}/><span id="observing-time-zone" className="muted">{zoneChanged?`${inputZone} · unfinished edit`:!siteZone.known?'UTC · site time zone unavailable':effectiveMode==='UTC'?`UTC · ${localLabel} at site`:siteZone.zone}</span></div><button className="text-button" onClick={()=>{clearDraft();onDate(new Date())}}>Now <RefreshCw size={14}/></button></div>{!siteZone.known&&!zoneChanged&&<p id="observing-time-zone-warning" className="footnote" role="status">The site’s time zone is unavailable. Enter times in UTC; local-time entry becomes available when a zone is known.</p>}{zoneChanged&&<p id="observing-time-zone-change" className="footnote time-entry-precision" role="status">This unfinished edit still uses {inputZone}. The site’s time zone is now {siteZone.known?siteZone.zone:'unavailable; new entries use UTC'}. Finish the edit in its original zone, or cancel it to use the current setting. Your selected instant is unchanged.</p>}{hasFineTime&&!pending&&<p id="observing-time-precision" className="footnote time-entry-precision">Selected UTC instant: {date.toISOString().replace('T',' ').replace('Z',' UTC')}. Entering a new time uses minute precision.</p>}{pending&&<div className="time-entry-warning" role="status">{pending.choices.length>1?<><p id="observing-time-issue">This local time occurs twice when the clocks go back. Choose which occurrence to use.</p><div>{pending.choices.map(choice=><button className="button" key={+choice} onClick={()=>{clearDraft();onDate(choice)}}>{new Intl.DateTimeFormat('en-GB',{timeZone:inputZone,hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(choice)} · {choice.toISOString().slice(11,19)} UTC</button>)}</div></>:<p id="observing-time-issue">{pending.value?'This time is incomplete, outside supported UTC years 1–9999, or does not exist in the selected zone. Choose another time.':'Enter a complete observing date and time.'} Your previous observing time remains selected.</p>}<p id="observing-time-kept-instant">Selected UTC instant: {date.toISOString().replace('T',' ').replace('Z',' UTC')}.</p><button className="button" onClick={cancel}>Cancel time edit</button></div>}</section>;
}
