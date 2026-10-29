'use client';
import {useRef,useState,useMemo,useEffect} from 'react';
import {observingTimeEditLabel} from '@/lib/observing-time-actions';
import {usePendingEditReporter} from '@/hooks/use-pending-edits';
import {useLanguage} from '@/components/language-provider';
import {languageLocale} from '@/lib/language';
import {CalendarDays,RefreshCw,ChevronLeft,ChevronRight,Moon} from 'lucide-react';
import {observingTimeCandidates,observingTimeValue,observingTimeZone,shiftObservingHour} from '@/lib/observing-time';

export default function ObservingTimeControl({date,timezone,onDate,onDarkness,contextRevision=0}:{date:Date;timezone?:string;onDate:(date:Date)=>void;onDarkness?:()=>void;contextRevision?:number}){
 const {language,t}=useLanguage();
 const timeInput=useRef<HTMLInputElement>(null);
 const reportPending=usePendingEditReporter('observing-time',observingTimeEditLabel,true,true);
 const cancel=()=>{clearDraft();timeInput.current?.focus({preventScroll:true})};
 const [mode,setMode]=useState<'UTC'|'local'>('UTC');
 const siteZone=useMemo(()=>observingTimeZone(timezone),[timezone]);
 const localValue=useMemo(()=>siteZone.known?observingTimeValue(date,siteZone.zone):'',[date,siteZone]);
 const canEnterLocal=siteZone.known&&Boolean(localValue),localRangeUnavailable=siteZone.known&&!localValue;
 if(!canEnterLocal&&mode==='local')setMode('UTC');
 const effectiveMode=canEnterLocal?mode:'UTC',zone=effectiveMode==='UTC'?'UTC':siteZone.zone;
 const [draft,setDraft]=useState<{instant:number;revision:number;zone:string;value:string;choices:Date[]}|null>(null);
 // An accepted context/time change retires its old draft permanently. Keeping
 // it dormant would revive discarded input when returning to the old instant.
 if(draft&&(draft.instant!==+date||draft.revision!==contextRevision))setDraft(null);
 const pending=draft?.instant===+date&&draft.revision===contextRevision?draft:null;
 const inputZone=pending?.zone??zone,zoneChanged=Boolean(pending&&inputZone!==zone);
 useEffect(()=>reportPending(Boolean(pending)),[pending,reportPending]);
 function clearDraft(){setDraft(null);reportPending(false)}
 function change(value:string){
  const choices=observingTimeCandidates(value,inputZone);
  if(choices.length===1){clearDraft();onDate(choices[0])}
  else{setDraft({instant:+date,revision:contextRevision,zone:inputZone,value,choices});reportPending(true)}
 }
 const previousHour=shiftObservingHour(date,-1),nextHour=shiftObservingHour(date,1);
 const previousDay=shiftObservingHour(date,-1,24),nextDay=shiftObservingHour(date,1,24);
 const hasFineTime=date.getUTCSeconds()!==0||date.getUTCMilliseconds()!==0;
 const localParts=new Intl.DateTimeFormat(languageLocale(language),{timeZone:siteZone.zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'}).formatToParts(date);
 const localLabel=localParts.map(part=>part.value).join(''),localOffset=localParts.find(part=>part.type==='timeZoneName')?.value||t('time.offsetUnavailable');
 return <section className="time-entry" aria-label={t('time.controls')}><div className="time-entry-mode" role="group" aria-label={t('time.entryZone')} aria-describedby={pending?'observing-time-zone-lock':undefined}><span>{t('time.enterZone')}</span><button type="button" disabled={Boolean(pending)} aria-pressed={effectiveMode==='UTC'} onClick={()=>{if(pending)return;setMode('UTC');clearDraft()}}>UTC</button><button type="button" disabled={!canEnterLocal||Boolean(pending)} aria-pressed={effectiveMode==='local'} onClick={()=>{if(pending)return;setMode('local');clearDraft()}}>{t('time.localTime')}</button></div><div className="control-bar"><div><CalendarDays size={17}/><label htmlFor="observing-time">{t('time.observingTime')}</label><input ref={timeInput} id="observing-time" aria-label={t('time.observingTime')} type="datetime-local" min="0001-01-01T00:00" max="9999-12-31T23:59" value={pending?.value??observingTimeValue(date,zone)} onInput={event=>change(event.currentTarget.value)} onChange={event=>change(event.target.value)} aria-describedby={['observing-time-zone',hasFineTime&&!pending?'observing-time-precision':'',!siteZone.known&&!zoneChanged?'observing-time-zone-warning':'',localRangeUnavailable&&!zoneChanged?'observing-time-range-warning':'',zoneChanged?'observing-time-zone-change':'',pending?'observing-time-issue observing-time-kept-instant':''].filter(Boolean).join(' ')} aria-invalid={Boolean(pending)}/><span id="observing-time-zone" className="muted">{zoneChanged?t('time.zoneDraft',{zone:inputZone}):!siteZone.known?t('time.zoneUnavailable'):localRangeUnavailable?t('time.zoneOutOfRange'):effectiveMode==='UTC'?t('time.localAtSite',{local:localLabel}):`${siteZone.zone} · ${localOffset}`}</span></div><button className="text-button" onClick={()=>{clearDraft();onDate(new Date())}}>{t('time.now')} <RefreshCw size={14}/></button></div><span className="sr-only" role="status" aria-atomic="true">{t('time.selectedPrefix')}{date.toISOString().replace('T',' ').replace('Z',' UTC')}{siteZone.known?t('time.siteSuffix',{local:localLabel}):t('time.siteUnavailableSuffix')}{t('time.period')}</span><div className="time-shortcuts" role="group" aria-label={t('time.shortcuts')}><button type="button" className="button" disabled={!previousDay} onClick={()=>{if(previousDay)onDate(previousDay)}} aria-label={t('time.back24')}><ChevronLeft size={16}/>−24h</button><button type="button" className="button" disabled={!previousHour} onClick={()=>{if(previousHour)onDate(previousHour)}} aria-label={t('time.previousHour')}><ChevronLeft size={16}/>−1h</button><button type="button" className="button" disabled={!nextHour} onClick={()=>{if(nextHour)onDate(nextHour)}} aria-label={t('time.nextHour')}>+1h<ChevronRight size={16}/></button><button type="button" className="button" disabled={!nextDay} onClick={()=>{if(nextDay)onDate(nextDay)}} aria-label={t('time.forward24')}>+24h<ChevronRight size={16}/></button>{onDarkness&&<button type="button" className="button" onClick={onDarkness} aria-describedby="darkness-shortcut-help"><Moon size={16}/>{t('time.nextDarkness')}</button>}<span id="darkness-shortcut-help" className="footnote">{onDarkness?t('time.darknessHelp'):''}{t('time.elapsedHelp')}</span></div>{!siteZone.known&&!zoneChanged&&<p id="observing-time-zone-warning" className="footnote" role="status">{t('time.zoneWarning')}</p>}{localRangeUnavailable&&!zoneChanged&&<p id="observing-time-range-warning" className="footnote time-entry-precision" role="status">{t('time.rangeWarning',{zone:siteZone.zone})}</p>}{zoneChanged&&<p id="observing-time-zone-change" className="footnote time-entry-precision" role="status">{t('time.zoneChanged',{original:inputZone,current:siteZone.known?siteZone.zone:t('time.zoneUnavailableNew'),range:localRangeUnavailable?t('time.rangeNewUtc'):''})}</p>}{hasFineTime&&!pending&&<p id="observing-time-precision" className="footnote time-entry-precision">{t('time.selectedUtc')}{date.toISOString().replace('T',' ').replace('Z',' UTC')}{t('time.minutePrecision')}</p>}{pending&&<div className="time-entry-warning" role="status">{pending.choices.length>1?<><p id="observing-time-issue">{t('time.ambiguous')}</p><div>{pending.choices.map(choice=><button className="button" key={+choice} onClick={()=>{clearDraft();onDate(choice)}}>{new Intl.DateTimeFormat(languageLocale(language),{timeZone:inputZone,hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(choice)} · {choice.toISOString().slice(11,19)} UTC</button>)}</div></>:<p id="observing-time-issue">{pending.value?t('time.invalid'):t('time.incomplete')} {t('time.previousSelected')}</p>}<p id="observing-time-zone-lock">{t('time.zoneLock')}</p><p id="observing-time-kept-instant">{t('time.selectedUtc')}{date.toISOString().replace('T',' ').replace('Z',' UTC')}{t('time.period')}</p><button className="button" onClick={cancel}>{t('time.cancel')}</button></div>}</section>;
}
