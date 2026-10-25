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

const metric = (value: unknown, unit: string) => typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}${unit}` : 'Unavailable';

export default function PlaceComparison({ places, current, date, onChoose, onPlan, selection, onSelectionChange:setSelection }: { places: Place[]; current: Place; date: Date; onChoose: (p: Place,comparisonFetchedAt?:number[]) => void; onPlan:(p:Place,date:Date,forecastFetchedAt?:number)=>void;selection:string[]|null;onSelectionChange:(selection:string[])=>void }) {
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
 const [planningIssue,setPlanningIssue]=useState<{context:string;text:string}|null>(null);
 const planningContext=JSON.stringify([requestKey,+date,rows.map(row=>[row.id,row.planningPlace.name,row.planningPlace.timezone,row.result?.fetchedAt,row.score])]);
 const planningStatus=planningIssue?.context===planningContext?planningIssue.text:'';
 function reportWindowIssue(text:string){
  setPlanningIssue({context:planningContext,text});
  deferFocusAndScroll(()=>document.getElementById('comparison-planning-status'));
 }
 function chooseUpcomingWindow(id:string,instant:number){
  const row=rows.find(row=>row.id===id),window=row?.opportunity?.best;
  if(!row||!window)return;
  const state=siteForecastState(row.result,requestKey,instant),fetchedAt=row.result?.fetchedAt;
  if(state.loading||state.error||state.stale||state.clockChanged||typeof fetchedAt!=='number'||!Number.isFinite(fetchedAt)){
   reportWindowIssue('This window’s forecast is no longer fresh enough. Your site and observing time were kept. Refresh forecasts before planning this window.');return;
  }
  if(+window.date<instant){
   reportWindowIssue('This observing window has already started. Your site and observing time were kept. Refresh forecasts and choose a later window.');return;
  }
  onPlan(row.planningPlace,window.date,fetchedAt);
 }
 function chooseFreshLeader(id:string,instant:number){
  const currentRanking=compareSiteScores(rows.map(row=>({...row,...siteForecastState(row.result,requestKey,instant)})));
  const leader=rows.find(row=>row.id===id);
  if(!leader||currentRanking.leadingIds.length!==1||currentRanking.leadingIds[0]!==id){
   setPlanningIssue({context:planningContext,text:'The comparison forecasts are no longer fresh enough for this recommendation. Your site and observing time were kept. Refresh forecasts before planning the recommended site.'});return;
  }
  onChoose(leader.planningPlace,rows.map(row=>row.result!.fetchedAt!));
 }

 return <section className="panel place-comparison" aria-labelledby="comparison-heading">
  <div className="comparison-heading"><div><h2 id="comparison-heading" ref={heading} tabIndex={-1}>Compare your observing sites</h2><p className="muted">Choose up to four places. Every site is evaluated at {new Date(instant*1000).toISOString().slice(0,16).replace('T',' ')} UTC, using the hourly forecast covering that time.</p></div><button className="text-button" onClick={refresh} disabled={!selected.length||rows.some(row=>row.loading)}><RefreshCw size={16}/>{rows.some(row=>row.loading)?'Refreshing forecasts…':rows.some(row=>row.error)?'Retry forecasts':'Refresh forecasts'}</button></div>
  <div ref={picker} id="comparison-site-list" className="comparison-picker">{options.slice(0,optionsShown).map((p,i)=><label key={key(p)} htmlFor={`compare-${i}`}><Checkbox data-comparison-site={key(p)} id={`compare-${i}`} checked={selected.includes(key(p))} disabled={!selected.includes(key(p))&&selected.length>=4} onCheckedChange={checked=>setSelection(checked?[...selected,key(p)]:selected.filter(id=>id!==key(p)))}/><span>{p.name}<small>{p.latitude.toFixed(2)}°, {p.longitude.toFixed(2)}°{p.bortle?` · Bortle ${p.bortle}`:''}</small></span></label>)}</div><SavedListControls count={options.length} shown={optionsShown} onChange={setOptionsShown} label="comparison sites" listId="comparison-site-list"/>
  {options.length<2&&<p className="muted">Save another place above to compare conditions before choosing where to go.</p>}
  {!selected.length&&<p className="muted">Select a place to see its forecast.</p>}
  {!planningStatus&&leaders.length>0&&<div className="comparison-recommendation" role="status"><div><h3>{leaders.length===1?`${leaders[0].place.name} leads this comparison`:`${leaders.length} sites share the highest score`}</h3><p className="muted">{best}/100 at your selected observing time. {leaders.length===1?'All selected sites have fresh forecasts.':`${leaders.map(row=>row.place.name).join(', ')}. Choose a site below; the tied score does not identify a single best location.`}</p></div>{leaders.length===1&&<button type="button" className="button" onClick={()=>chooseFreshLeader(leaders[0].id,Date.now())}>Plan at {leaders[0].place.name}<ArrowUpRight size={16}/></button>}</div>}
  {planningStatus&&<div className="notice comparison-window-recovery"><p id="comparison-planning-status" tabIndex={-1} role="status">{planningStatus}</p><button type="button" className="button" onClick={refresh} disabled={!selected.length||rows.some(row=>row.loading)}>Refresh and review dark windows</button></div>}
  <ListFocusRecovery listId="comparison-card-list" fallback={heading} resolve={recoverSiteControl}><div id="comparison-card-list" className="comparison-grid">{rows.map(r=><article className="comparison-card" data-comparison-card={r.id} key={r.id}>
   <h3>{r.place.name}</h3><button className="text-button" onClick={()=>setSelection(selected.filter(id=>id!==r.id))} aria-label={`Stop comparing ${r.place.name}`}>Stop comparing this site</button><p className="comparison-local">{timeLabel(r.at,r.timezone)} · {r.timezone}{!r.timezoneKnown?' · site time zone unavailable':''}</p>
   <p className="comparison-darkness">{r.place.bortle?`Your sky rating: Bortle ${r.place.bortle} / 9`:'Sky darkness: not rated'}</p>
   {(r.loading||r.error||r.stale)&&<p className={r.error?'error':'muted'} role="status">{r.loading?r.result?.data?'Refreshing; previous forecast shown.':'Loading forecast…':r.error?r.result?.data?'Refresh failed; previous forecast shown. Retry forecasts to update it.':r.error:'This forecast was fetched over 30 minutes ago. Refresh before relying on it.'}</p>}
   {r.clockChanged&&<p className="notice" role="status">The weather update time is ahead of your device clock. Its age cannot be confirmed; check your clock and refresh before relying on this forecast.</p>}
   {r.result?.data&&r.result.fetchedAt!==undefined&&<p className="comparison-local">Last successful update: {new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:r.timezone,timeZoneName:'shortOffset'}).format(new Date(r.result.fetchedAt))}</p>}
   {r.sun>=-18&&<p className="muted">Outside full astronomical darkness at this site. Selected-time conditions are hidden; choose a dark window below.</p>}{r.sun<-18&&r.result?.data&&(r.i<0?<p className="muted">This hour is outside the available forecast. Choose a time within the next seven days.</p>:<>
    <div className="comparison-score"><strong>{r.score??'—'}</strong><span>/ 100<br/>planning score</span></div>
    <p className="comparison-best">{best!==null&&r.score===best&&best>0?'Highest score among selected sites':r.sun>-6?'Daylight or civil twilight':r.sun>-18?'Twilight at this hour':'Astronomical darkness'}</p>
    <dl><div><dt>Cloud cover</dt><dd>{metric(r.cloud,'%')}</dd></div><div><dt>Temperature</dt><dd>{metric(r.h?.temperature_2m?.[r.i],' °C')}</dd></div><div><dt>Wind</dt><dd>{metric(r.h?.wind_speed_10m?.[r.i],' km/h')}</dd></div><div><dt>Humidity</dt><dd>{metric(r.h?.relative_humidity_2m?.[r.i],'%')}</dd></div><div><dt>Moon</dt><dd>{Math.round(r.moon.illumination*100)}% · {r.moon.altitude>0?'above':'below'} horizon</dd></div></dl>
   </>)}
   {r.opportunity?.best?<div className="comparison-window"><small>BEST UPCOMING DARK WINDOW</small><strong>{r.opportunity.best.score}/100 · {observingWindowLabel(r.opportunity.best.date,r.opportunity.best.hours,r.timezone)}</strong><span>{r.opportunity.best.hours} {r.opportunity.best.hours===1?'hour':'hours'} · {r.opportunity.best.cloud}% cloud · {r.opportunity.forecastHours}/{r.opportunity.darkHours} dark samples scored</span><button className="text-button" onClick={()=>chooseUpcomingWindow(r.id,Date.now())}>Plan this window <ArrowUpRight size={16}/></button></div>:r.result?.data?<p className="comparison-no-window">No scored dark window in the remaining forecast.</p>:null}
   <button className="text-button" onClick={()=>onChoose(r.planningPlace)}>Plan here at selected time <ArrowUpRight size={16}/></button>
  </article>)}</div></ListFocusRecovery>
  <p className="footnote">Same-hour scores and best upcoming windows use cloud cover, Sun altitude and moonlight. Each night prefers a complete two-hour window; a single hour is used when no pair is available. The best upcoming window is the highest-scoring of those nightly choices after now, with longer windows winning tied scores. It may be on a different night for each site. User-entered Bortle ratings are separate and are not map measurements. Scores do not measure seeing, transparency or light pollution. Weather: Open-Meteo. Missing data is never scored as clear skies.</p>
 </section>;
}
