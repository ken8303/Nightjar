"use client";

import {downloadFile} from '@/lib/download';
import {useMemo} from 'react';
import {ArrowUpRight, Download, Moon, Star} from 'lucide-react';
import {meteorCalendar} from '@/lib/calendar';
import {meteorCloudSummary, meteorConditions, meteorEvents, upcomingMeteorOccurrences} from '@/lib/meteor-planning';
import {Place} from '@/lib/sky';
import {deepSkyTimestampFormatter as planningTimestampFormatter} from '@/lib/deep-sky-time';
import {useLanguage} from '@/components/language-provider';
import {languageLocale} from '@/lib/language';
import {eventMessages} from '@/lib/meteor-language';
import {englishMessages} from '@/lib/messages/en';

type Hourly={time:number[];cloud_cover:(number|null)[]};
export default function MeteorPlanner({date,place,hourly,onExplore,onNotice}:{date:Date;place:Place;hourly?:Hourly;onExplore:(date:Date)=>void;onNotice:(message:string)=>void}){
 const {language,t}=useLanguage();
 const plans=useMemo(()=>upcomingMeteorOccurrences(date,place.timezone||'UTC').map(occurrence=>({
  ...occurrence,conditions:meteorConditions(occurrence.event,occurrence.year,place,hourly,date),
 })),[date,place,hourly]);
 const omitted=meteorEvents.length-plans.length;
 const timezone=place.timezone||'UTC';
 const format=planningTimestampFormatter(date,timezone,languageLocale(language)).format;
 function download(name:string,year:number,month:number,day:number){
  try{
   downloadFile(new Blob([meteorCalendar(name,year,month,day,language)],{type:'text/calendar;charset=utf-8'}),`${name.toLowerCase().replaceAll(' ','-')}-${year}.ics`);
   onNotice(englishMessages['meteor.downloaded']);
  }catch{onNotice(englishMessages['meteor.downloadFailed'])}
 }
 function clouds(conditions:ReturnType<typeof meteorConditions>){
  if(language==='en')return meteorCloudSummary(conditions);
  const {cloudCover,cloudForecastHours,cloudSampleHours,cloudUsesMoonFreeHours}=conditions;
  if(cloudSampleHours===0)return t('meteor.cloudNone');
  const kind=t(cloudUsesMoonFreeHours?'meteor.cloudMoonFree':'meteor.cloudDark');
  if(cloudCover===null)return t(cloudSampleHours===1?'meteor.cloudMissingOne':'meteor.cloudMissingMany',{hours:cloudSampleHours,kind});
  return t(cloudSampleHours===1?'meteor.cloudAverageOne':'meteor.cloudAverageMany',{cloud:cloudCover,covered:cloudForecastHours,hours:cloudSampleHours,kind})+(cloudForecastHours<cloudSampleHours?t('meteor.cloudPartial'):'');
 }
 return <><div className="section-intro"><h3>{t('meteor.heading')}</h3><p className="muted">{t('meteor.intro',{place:place.name,timezone})}</p></div>{omitted>0&&<p role="status" className="muted">{plans.length?t(omitted===1?'meteor.omittedOne':'meteor.omittedMany',{count:omitted}):t('meteor.noneSupported')}</p>}<div className="event-grid">{plans.map(({event,year,conditions})=>{
  const {darkHours,moonFreeHours,window,moonIllumination,moonIlluminationTime}=conditions;
  const [name,dateLabel,rate,note]=eventMessages[event.name];
  return <section className="panel event-card" key={event.name}>
   <div className="section-label"><span>{language==='en'?t(dateLabel).toUpperCase():t(dateLabel)} · {year}</span><Star size={18}/></div>
   <h2>{t(name)}</h2><p className="muted">{t(note)}</p>
   <div className="event-stats"><span><strong>{t(rate)}</strong><small>{t('meteor.rateIdeal')}</small></span><span><strong>{moonIllumination===null?t('meteor.unavailable'):`${Math.round(moonIllumination*100)}%`}</strong><small>{moonIlluminationTime?t('meteor.moonAt',{time:format(moonIlluminationTime)}):t('meteor.noDarkHour')}</small></span></div>
   <div className="meteor-conditions"><div><Moon size={16}/><span>{darkHours?t(darkHours===1?'meteor.hoursOne':'meteor.hoursMany',{dark:darkHours,moonFree:moonFreeHours}):t('meteor.noComplete')}</span></div>{window?<p>{t('meteor.longest')} <strong>{format(window.start)} – {format(window.end)}</strong></p>:<p>{t(darkHours?'meteor.noMoonFree':'meteor.tryAnother')}</p>}<p>{clouds(conditions)}</p></div>
   <div className="meteor-actions"><button className="text-button" disabled={!window} onClick={()=>{if(window)onExplore(window.start)}}>{t(window?'meteor.explore':'meteor.exploreUnavailable')} <ArrowUpRight size={16}/></button><button className="text-button calendar-download" onClick={()=>download(event.name,year,event.month,event.day)}><Download size={16}/>{t('meteor.calendar')}</button></div>
  </section>})}</div><p className="footnote">{t('meteor.note')} <a href="https://www.imo.net/resources/calendar/" target="_blank" rel="noreferrer">{t('meteor.imo')}</a>. {t('meteor.bulletin')}</p></>;
}
