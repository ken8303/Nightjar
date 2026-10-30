'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import SavedListControls,{savedListPageSize} from '@/components/saved-list-controls';
import ListFocusRecovery from '@/components/list-focus-recovery';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {observingWindowLabel} from '@/lib/observing-window-label';
import {bestNightWindow, sevenNightOutlook} from '@/lib/night-outlook';
import {usePlanningClock} from '@/hooks/use-planning-clock';
import {useForecastRefresh} from '@/hooks/use-forecast-refresh';
import {forecastHourIndex} from '@/lib/weather-hours';
import {readForecastResponse,forecastFailureMessage} from '@/lib/forecast-response';
import {storeSiteForecast,siteForecastState,siteForecastContext,compareSiteScores,siteForecastKey as key,type SiteForecast} from '@/lib/site-forecasts';
import { moonInfo, Place, scoreAt, timeLabel, sunAltitude} from '@/lib/sky';
import {useLanguage} from '@/components/language-provider';
import {weatherFeedback} from '@/lib/weather-feedback-language';
import {languageLocale} from '@/lib/language';

// Planning actions must check the real clock at the moment the user taps.
const actionTime=()=>Date.now();
const metric = (value: unknown, unit: string, unavailable:string) => typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}${unit}` : unavailable;

export default function PlaceComparison({ places, current, date, onChoose, onPlan, selection, onSelectionChange:setSelection }: { places: Place[]; current: Place; date: Date; onChoose: (p: Place,comparisonFetchedAt?:number[]) => void; onPlan:(p:Place,date:Date,forecastFetchedAt?:number)=>void;selection:string[]|null;onSelectionChange:(selection:string[])=>void }) {
 const {language,t}=useLanguage();
 const options = useMemo(()=>{const seen=new Set<string>();return [current,...places].filter(place=>{const id=key(place);if(seen.has(id))return false;seen.add(id);return true})},[current,places]);
 const [optionsShown,setOptionsShown]=useState(savedListPageSize);
 const heading=useRef<HTMLHeadingElement>(null),picker=useRef<HTMLDivElement>(null);
 function recoverSiteControl(owner:Element){
  const id=owner.closest<HTMLElement>('[data-comparison-card]')?.dataset.comparisonCard;
  const control=Array.from(picker.current?.querySelectorAll<HTMLElement>('[data-comparison-site]')??[]).find(node=>node.dataset.comparisonSite===id);
  return control&&!control.matches(':disabled')?control:null;
 }
 const selected = useMemo(()=>(selection ?? options.slice(0,4).map(key)).filter(id=>options.some(p=>key(p)===id)),[selection,options]);
 const selectedKey = selected.join('|');
 const [results,setResults] = useState<Record<string,SiteForecast>>({});
 const {revision:retry,refresh,recordAttempt}=useForecastRefresh();
 const requestKey = `${selectedKey}:${retry}`;
 useEffect(()=>{
  const controller = new AbortController(); let stopped = false;
  const timeout=setTimeout(()=>controller.abort(),20000);
  const active=selectedKey.split('|').filter(Boolean);
  if(active.length)recordAttempt();
  for(const id of active){
   const [lat,lon] = id.split(',');
   fetch(`/api/weather?lat=${lat}&lon=${lon}`,{signal:controller.signal,cache:'no-cache'}).then(async response=>{
    const data=await readForecastResponse(response);
    if(!stopped)setResults(old=>storeSiteForecast(old,id,{data,requestKey,fetchedAt:Date.now()},active));
   }).catch(error=>{if(!stopped)setResults(old=>storeSiteForecast(old,id,{error:forecastFailureMessage(error),requestKey},active));});
  }
  return()=>{stopped=true;clearTimeout(timeout);controller.abort()};
 },[selectedKey,requestKey,recordAttempt]);
 const now=usePlanningClock();
 const instant = date.getTime()/1000;
 const rows = useMemo(()=>selected.map(id=>{
  const place=options.find(p=>key(p)===id)!; const result=results[id],state=siteForecastState(result,requestKey,now);
  const h=result?.data?.hourly; const i=forecastHourIndex(h?.time,new Date(instant*1000));
  const at=new Date(instant*1000),cloud=i>=0?h?.cloud_cover?.[i]:null;
  const score=sunAltitude(at,place)<-18&&typeof cloud==='number'&&Number.isFinite(cloud)&&cloud>=0&&cloud<=100?scoreAt(cloud,at,place):null;
  const {timezone,timezoneKnown,planningPlace}=siteForecastContext(place,result?.data);
  const opportunity=h?bestNightWindow(sevenNightOutlook(h,{...place,timezone},new Date(now))):null;
  return {id,place,result,...state,h,i,at,score,cloud,timezone,timezoneKnown,planningPlace,opportunity,moon:moonInfo(at,place),sun:sunAltitude(at,place)};
 }),[selected,options,results,instant,requestKey,now]);
 const {best,leadingIds}=compareSiteScores(rows);
 const leaders=rows.filter(row=>leadingIds.includes(row.id));
 const [planningIssue,setPlanningIssue]=useState<{context:string;kind:'windowStale'|'windowStarted'|'leaderStale'}|null>(null);
 const planningContext=JSON.stringify([requestKey,+date,rows.map(row=>[row.id,row.planningPlace.name,row.planningPlace.timezone,row.result?.fetchedAt,row.score])]);
 const planningStatus=planningIssue?.context===planningContext?t(planningIssue.kind==='windowStale'?'comparison.windowStale':planningIssue.kind==='windowStarted'?'comparison.windowStarted':'comparison.leaderStale'):'';
 function reportWindowIssue(kind:'windowStale'|'windowStarted'){
  setPlanningIssue({context:planningContext,kind});
  deferFocusAndScroll(()=>document.getElementById('comparison-planning-status'));
 }
 function chooseUpcomingWindow(id:string){
  const instant=actionTime(),row=rows.find(row=>row.id===id),window=row?.opportunity?.best;
  if(!row||!window)return;
  const state=siteForecastState(row.result,requestKey,instant),fetchedAt=row.result?.fetchedAt;
  if(state.loading||state.error||state.stale||state.clockChanged||typeof fetchedAt!=='number'||!Number.isFinite(fetchedAt)){
   reportWindowIssue('windowStale');return;
  }
  if(+window.date<instant){
   reportWindowIssue('windowStarted');return;
  }
  onPlan(row.planningPlace,window.date,fetchedAt);
 }
 function chooseFreshLeader(id:string){
  const instant=actionTime(),currentRanking=compareSiteScores(rows.map(row=>({...row,...siteForecastState(row.result,requestKey,instant)})));
  const leader=rows.find(row=>row.id===id);
  if(!leader||currentRanking.leadingIds.length!==1||currentRanking.leadingIds[0]!==id){
   setPlanningIssue({context:planningContext,kind:'leaderStale'});return;
  }
  onChoose(leader.planningPlace,rows.map(row=>row.result!.fetchedAt!));
 }

 function failure(error:string){
  if(language==='en')return error;
  const translated=weatherFeedback(error,t);return translated===error?t('comparison.forecastDetail',{detail:error}):translated;
 }
 return <section className="panel place-comparison" aria-labelledby="comparison-heading">
  <div className="comparison-heading"><div><h2 id="comparison-heading" ref={heading} tabIndex={-1}>{t('comparison.heading')}</h2><p className="muted">{t('comparison.intro')}</p></div><button className="text-button" onClick={refresh} disabled={!selected.length||rows.some(row=>row.loading)}><RefreshCw size={16}/>{t(rows.some(row=>row.loading)?'comparison.refreshing':rows.some(row=>row.error)?'comparison.retry':'comparison.refresh')}</button></div>
  <div ref={picker} id="comparison-site-list" className="comparison-picker">{options.slice(0,optionsShown).map((p,i)=><label key={key(p)} htmlFor={`compare-${i}`}><Checkbox data-comparison-site={key(p)} id={`compare-${i}`} checked={selected.includes(key(p))} disabled={!selected.includes(key(p))&&selected.length>=4} onCheckedChange={checked=>setSelection(checked?[...selected,key(p)]:selected.filter(id=>id!==key(p)))}/><span>{p.name}<small>{p.latitude.toFixed(2)}°, {p.longitude.toFixed(2)}°{p.bortle?` · Bortle ${p.bortle}`:''}</small></span></label>)}</div><SavedListControls count={options.length} shown={optionsShown} onChange={setOptionsShown} label="comparison sites" listId="comparison-site-list"/>
  {options.length<2&&<p className="muted">{t('comparison.saveAnother')}</p>}
  {!selected.length&&<p className="muted">{t('comparison.select')}</p>}
  {!planningStatus&&leaders.length>0&&<div className="comparison-recommendation" role="status"><div><h3>{leaders.length===1?t('comparison.leads',{place:leaders[0].place.name}):t('comparison.tied',{count:leaders.length})}</h3><p className="muted">{t('comparison.scoreTime',{score:best??'—'})} {leaders.length===1?t('comparison.allFresh'):t('comparison.tieDetail',{places:leaders.map(row=>row.place.name).join(', ')})}</p></div>{leaders.length===1&&<button type="button" className="button" onClick={()=>chooseFreshLeader(leaders[0].id)}>{t('comparison.planAt',{place:leaders[0].place.name})}<ArrowUpRight size={16}/></button>}</div>}
  {planningStatus&&<div className="notice comparison-window-recovery"><p id="comparison-planning-status" tabIndex={-1} role="status">{planningStatus}</p><button type="button" className="button" onClick={refresh} disabled={!selected.length||rows.some(row=>row.loading)}>{t('comparison.refreshReview')}</button></div>}
  <ListFocusRecovery listId="comparison-card-list" fallback={heading} resolve={recoverSiteControl}><div id="comparison-card-list" className="comparison-grid">{rows.map(r=><article className="comparison-card" data-comparison-card={r.id} key={r.id}>
   <h3>{r.place.name}</h3><button className="text-button" onClick={()=>setSelection(selected.filter(id=>id!==r.id))} aria-label={t('comparison.stopLabel',{place:r.place.name})}>{t('comparison.stop')}</button>{r.sun<-18&&<p className="comparison-local">{timeLabel(r.at,r.timezone)} · {r.timezone}{!r.timezoneKnown?t('comparison.zoneMissing'):''}</p>}
   <p className="comparison-darkness">{r.place.bortle?t('comparison.rating',{rating:r.place.bortle}):t('comparison.unrated')}</p>
   {(r.loading||r.error||r.stale)&&<p className={r.error?'error':'muted'} role="status">{r.loading?r.result?.data?t('comparison.refreshPrevious'):t('comparison.loading'):r.error?r.result?.data?t('comparison.failedPrevious'):failure(r.error):t('comparison.stale')}</p>}
   {r.clockChanged&&<p className="notice" role="status">{t('comparison.clock')}</p>}
   {r.result?.data&&r.result.fetchedAt!==undefined&&<p className="comparison-local">{t('comparison.updated',{time:new Intl.DateTimeFormat(languageLocale(language),{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:r.timezone,timeZoneName:'shortOffset'}).format(new Date(r.result.fetchedAt))})}</p>}
   {r.sun>=-18&&<p className="muted">{t('comparison.outside')}</p>}{r.sun<-18&&r.result?.data&&(r.i<0?<p className="muted">{t('comparison.outsideForecast')}</p>:<>
    <div className="comparison-score"><strong>{r.score??'—'}</strong><span>/ 100<br/>{t('comparison.score')}</span></div>
    <p className="comparison-best">{t(best!==null&&r.score===best&&best>0?'comparison.highest':r.sun>-6?'comparison.daylight':r.sun>-18?'comparison.twilight':'comparison.dark')}</p>
    <dl><div><dt>{t('comparison.cloud')}</dt><dd>{metric(r.cloud,'%',t('comparison.unavailable'))}</dd></div><div><dt>{t('comparison.temperature')}</dt><dd>{metric(r.h?.temperature_2m?.[r.i],' °C',t('comparison.unavailable'))}</dd></div><div><dt>{t('comparison.wind')}</dt><dd>{metric(r.h?.wind_speed_10m?.[r.i],' km/h',t('comparison.unavailable'))}</dd></div><div><dt>{t('comparison.humidity')}</dt><dd>{metric(r.h?.relative_humidity_2m?.[r.i],'%',t('comparison.unavailable'))}</dd></div><div><dt>{t('comparison.moon')}</dt><dd>{Math.round(r.moon.illumination*100)}% · {t(r.moon.altitude>0?'comparison.above':'comparison.below')}</dd></div></dl>
   </>)}
   {r.opportunity?.best?<div className="comparison-window"><small>{t('comparison.bestWindow')}</small><strong>{r.opportunity.best.score}/100 · {observingWindowLabel(r.opportunity.best.date,r.opportunity.best.hours,r.timezone,languageLocale(language))}</strong><span>{t(r.opportunity.best.hours===1?'comparison.windowOne':'comparison.windowMany',{hours:r.opportunity.best.hours,cloud:r.opportunity.best.cloud,scored:r.opportunity.forecastHours,dark:r.opportunity.darkHours})}</span><button className="text-button" onClick={()=>chooseUpcomingWindow(r.id)}>{t('comparison.planWindow')} <ArrowUpRight size={16}/></button></div>:r.result?.data?<p className="comparison-no-window">{t('comparison.noWindow')}</p>:null}
   <button className="text-button" onClick={()=>onChoose(r.planningPlace)}>{t(r.sun<-18?'comparison.planSelected':'comparison.chooseSite')} <ArrowUpRight size={16}/></button>
  </article>)}</div></ListFocusRecovery>
  <p className="footnote">{t('comparison.note')}</p>
 </section>;
}
