'use client';
import {useState} from 'react';
import {CalendarDays,RefreshCw} from 'lucide-react';
import {observingTimeCandidates,observingTimeValue} from '@/lib/observing-time';

export default function ObservingTimeControl({date,timezone,onDate}:{date:Date;timezone:string;onDate:(date:Date)=>void}){
 const [mode,setMode]=useState<'UTC'|'local'>('UTC');
 const zone=mode==='UTC'?'UTC':timezone,basis=`${+date}:${zone}`;
 const [draft,setDraft]=useState<{basis:string;value:string;choices:Date[]}|null>(null);
 const pending=draft?.basis===basis?draft:null;
 function change(value:string){
  const choices=observingTimeCandidates(value,zone);
  if(choices.length===1){setDraft(null);onDate(choices[0])}
  else setDraft({basis,value,choices});
 }
 const localLabel=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(date);
 return <section className="time-entry" aria-label="Observing time controls"><div className="time-entry-mode" role="group" aria-label="Time entry zone"><span>Enter time in</span><button type="button" aria-pressed={mode==='UTC'} onClick={()=>{setMode('UTC');setDraft(null)}}>UTC</button><button type="button" aria-pressed={mode==='local'} onClick={()=>{setMode('local');setDraft(null)}}>Site local time</button></div><div className="control-bar"><div><CalendarDays size={17}/><label htmlFor="observing-time">Observing time</label><input id="observing-time" type="datetime-local" value={pending?.value??observingTimeValue(date,zone)} onInput={event=>change(event.currentTarget.value)} onChange={event=>change(event.target.value)} aria-describedby="observing-time-zone" aria-invalid={Boolean(pending)}/><span id="observing-time-zone" className="muted">{mode==='UTC'?`UTC · ${localLabel} at site`:timezone}</span></div><button className="text-button" onClick={()=>{setDraft(null);onDate(new Date())}}>Now <RefreshCw size={14}/></button></div>{pending&&<div className="time-entry-warning" role="status">{pending.choices.length>1?<><p>This local time occurs twice when the clocks go back. Choose which occurrence to use.</p><div>{pending.choices.map(choice=><button className="button" key={+choice} onClick={()=>{setDraft(null);onDate(choice)}}>{new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(choice)} · {choice.toISOString().slice(11,16)} UTC</button>)}</div></>:<p>{pending.value?'This time does not exist in the selected zone, or is incomplete. Choose another time.':'Enter a complete observing date and time.'} Your previous observing time remains selected.</p>}</div>}</section>;
}
