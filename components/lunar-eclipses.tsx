'use client';
import {isFullDarknessInterval} from '@/lib/darkness-remaining';
import {downloadFile} from '@/lib/download';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Moon, Download } from 'lucide-react';
import { lunarEclipseCalendar } from '@/lib/calendar';
import { A, Place, bodyPosition, isAstronomicalNight } from '@/lib/sky';
import {lunarEclipseContacts,nextLunarEclipses} from '@/lib/lunar-events';
import {validObservingDate} from '@/lib/observing-time';
import {deepSkyTimestampFormatter as planningTimestampFormatter} from '@/lib/deep-sky-time';
import {useLanguage} from '@/components/language-provider';
import {languageLocale} from '@/lib/language';
// Match the displayed peak minute across recalculated search windows.
const peakKey=(date:Date)=>date.toISOString().slice(0,16);

export default function LunarEclipses({date,place,onDate}:{date:Date;place:Place;onDate:(date:Date)=>void}) {
 const {language,t}=useLanguage();
 const kindLabel=(kind:A.EclipseKind)=>kind===A.EclipseKind.Penumbral?t('eclipse.kindPenumbral'):kind===A.EclipseKind.Partial?t('eclipse.kindPartial'):kind===A.EclipseKind.Total?t('eclipse.kindTotal'):kind===A.EclipseKind.Annular?t('eclipse.kindAnnular'):String(kind);
 const contactKeys={'Penumbral begins':'eclipse.penumbralBegins','Partial begins':'eclipse.partialBegins','Totality begins':'eclipse.totalBegins','Greatest eclipse':'eclipse.greatest','Totality ends':'eclipse.totalEnds','Partial ends':'eclipse.partialEnds','Penumbral ends':'eclipse.penumbralEnds'} as const;
 const contactLabel=(label:string)=>Object.prototype.hasOwnProperty.call(contactKeys,label)?t(contactKeys[label as keyof typeof contactKeys]):label;
 const events=useMemo(()=>nextLunarEclipses(date).map(event=>{const contacts=lunarEclipseContacts(event),darkContacts=contacts.filter(contact=>isAstronomicalNight(contact.time,place)),upcomingDarkContacts=darkContacts.filter(contact=>+contact.time>=+date-60000);const peakDark=isAstronomicalNight(event.peak.date,place);return {event,contacts,upcomingDarkContacts,peakDark,peakUpcoming:peakDark&&+event.peak.date>=+date-60000}}).filter(item=>item.upcomingDarkContacts.length>0),[date,place]);
 const [selectedPeak,setSelectedPeak]=useState<string|null>(null),[downloadResult,setDownloadResult]=useState<{context:string;status:'ready'|'failed'|''}|null>(null);
 const chosen=events.find(item=>peakKey(item.event.peak.date)===selectedPeak)||events[0];
 if(!chosen)return <section className="panel eclipse-panel" aria-labelledby="eclipse-heading"><div className="section-label"><span id="eclipse-heading">{t('eclipse.heading')}</span><Moon size={18}/></div><p className="muted">{t('eclipse.none')}</p></section>;
 const eclipse=chosen.event;
 const downloadContext=JSON.stringify([eclipse.peak.date.toISOString(),place.name,place.latitude,place.longitude,place.timezone]);
 const downloadStatus=downloadResult?.context===downloadContext?downloadResult.status:'';
 const setDownloadStatus=(status:'ready'|'failed'|'')=>setDownloadResult({context:downloadContext,status});
 const contacts=chosen.contacts.map(contact=>({...contact,altitude:validObservingDate(contact.time)?bodyPosition(A.Body.Moon,contact.time,place).altitude:NaN}));
 const calendarDark=contacts.every(c=>isAstronomicalNight(c.time,place))&&isFullDarknessInterval(new Date(Math.floor(+contacts[0].time/1000)*1000),new Date(Math.ceil(+contacts.at(-1)!.time/1000)*1000),place);
 const format=planningTimestampFormatter(date,place.timezone||'UTC',languageLocale(language)).format;
 return <section className="panel eclipse-panel" aria-labelledby="eclipse-heading"><div className="section-label"><span id="eclipse-heading">{t('eclipse.heading')}</span><Moon size={18}/></div><p className="muted">{t('eclipse.intro',{place:place.name})}</p>{events.length<3&&<p className="muted">{t('eclipse.omitted')}</p>}<div className="eclipse-picker">{events.map(item=><button className={chosen===item?'active':''} key={item.event.peak.date.toISOString()} aria-pressed={chosen===item} onClick={()=>{setSelectedPeak(peakKey(item.event.peak.date));setDownloadStatus('')}}><strong>{t('eclipse.option',{kind:kindLabel(item.event.kind)})}</strong><span>{item.peakUpcoming?t('eclipse.peak'):contactLabel(item.upcomingDarkContacts[0].label)} · {format(item.peakUpcoming?item.event.peak.date:item.upcomingDarkContacts[0].time)}</span></button>)}</div><div className="eclipse-summary"><div><h3>{t('eclipse.title',{kind:kindLabel(eclipse.kind)})}</h3><p className="muted">{chosen.peakDark?t('eclipse.obscuration',{percent:Math.round(eclipse.obscuration*100)}):t('eclipse.brightPeak')}{eclipse.kind===A.EclipseKind.Penumbral?t('eclipse.penumbralNotice'):''}</p></div><button className="text-button" onClick={()=>onDate(chosen.peakUpcoming?eclipse.peak.date:chosen.upcomingDarkContacts[0].time)}>{chosen.peakUpcoming?t('eclipse.planPeak'):t('eclipse.planContact',{contact:contactLabel(chosen.upcomingDarkContacts[0].label)})} <ArrowUpRight size={16}/></button></div><div className="eclipse-download"><button disabled={!calendarDark} className="button" onClick={()=>{try{const data=lunarEclipseCalendar({kind:eclipse.kind,peak:eclipse.peak.date,place:place.name,latitude:place.latitude,longitude:place.longitude,timezone:place.timezone,contacts,nightOnly:true});downloadFile(new Blob([data],{type:'text/calendar;charset=utf-8'}),`lunar-eclipse-${eclipse.peak.date.toISOString().slice(0,10)}.ics`);setDownloadStatus('ready')}catch{setDownloadStatus('failed')}}}><Download size={16}/>{t('eclipse.download')}</button><p className="muted">{t('eclipse.calendarHelp')}</p>{downloadStatus&&<p role="status">{downloadStatus==='ready'?t('eclipse.calendarReady'):t('eclipse.calendarFailed')}</p>}</div><p className="eclipse-zone">{t('eclipse.zone',{zone:place.timezone||t('eclipse.timezoneUnavailable'),place:place.name})}</p><ol className="eclipse-contacts">{contacts.filter(c=>isAstronomicalNight(c.time,place)).map(c=><li key={c.label}><span>{contactLabel(c.label)}</span><time dateTime={c.time.toISOString()}>{format(c.time)}</time><strong className={c.altitude>0?'above':'below'}>{c.altitude.toFixed(1)}° · {c.altitude>0?t('eclipse.aboveHorizon'):t('eclipse.belowHorizon')}</strong></li>)}</ol><p className="footnote">{t('eclipse.notes')}</p></section>;
}
