'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {bestNightWindow, sevenNightOutlook} from '@/lib/night-outlook';
import {usePlanningClock} from '@/hooks/use-planning-clock';
import {useForecastRefresh} from '@/hooks/use-forecast-refresh';
import {parseWeatherForecast,forecastHourIndex} from '@/lib/weather-hours';
import {storeSiteForecast,siteForecastState,type SiteForecast} from '@/lib/site-forecasts';
import { A, bodyPosition, moonInfo, Place, scoreAt, timeLabel } from '@/lib/sky';

const key = (p: Place) => `${p.latitude},${p.longitude}`;
const metric = (value: unknown, unit: string) => typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}${unit}` : 'Unavailable';

export default function PlaceComparison({ places, current, date, onChoose, onPlan }: { places: Place[]; current: Place; date: Date; onChoose: (p: Place) => void; onPlan:(p:Place,date:Date)=>void }) {
 const options = useMemo(()=>[current, ...places].filter((p,i,a)=>a.findIndex(v=>key(v)===key(p))===i),[current,places]);
 const [selection,setSelection] = useState<string[]|null>(null);
 const selected = useMemo(()=>(selection ?? options.slice(0,4).map(key)).filter(id=>options.some(p=>key(p)===id)),[selection,options]);
 const selectedKey = selected.join('|');
 const [results,setResults] = useState<Record<string,SiteForecast>>({});
 const {revision:retry,refresh}=useForecastRefresh();
 const requestKey = `${selectedKey}:${retry}`;
 useEffect(()=>{
  const controller = new AbortController(); let stopped = false;
  const timeout=setTimeout(()=>controller.abort(),20000);
  const active=selectedKey.split('|').filter(Boolean);
  for(const id of active){
   const [lat,lon] = id.split(',');
   fetch(`/api/weather?lat=${lat}&lon=${lon}`,{signal:controller.signal,cache:'no-cache'}).then(async response=>{
    const raw:unknown = await response.json();
    if(!response.ok) throw new Error('Forecast unavailable. Try refreshing.');
    const data=parseWeatherForecast(raw);
    if(!stopped)setResults(old=>storeSiteForecast(old,id,{data,requestKey,fetchedAt:Date.now()},active));
   }).catch(()=>{if(!stopped)setResults(old=>storeSiteForecast(old,id,{error:'Forecast unavailable. Try refreshing.',requestKey},active));});
  }
  return()=>{stopped=true;clearTimeout(timeout);controller.abort()};
 },[selectedKey,requestKey]);
 const now=usePlanningClock();
 const instant = date.getTime()/1000;
 const rows = useMemo(()=>selected.map(id=>{
  const place=options.find(p=>key(p)===id)!; const result=results[id],state=siteForecastState(result,requestKey,now);
  const h=result?.data?.hourly; const i=forecastHourIndex(h?.time,new Date(instant*1000));
  const at=new Date(instant*1000),cloud=i>=0?h?.cloud_cover?.[i]:null;
  const score=typeof cloud==='number'&&Number.isFinite(cloud)&&cloud>=0&&cloud<=100?scoreAt(cloud,at,place):null;
  const timezone=result?.data?.timezone||place.timezone||'UTC';
  const opportunity=h?bestNightWindow(sevenNightOutlook(h,{...place,timezone},new Date(now))):null;
  return {id,place,result,...state,h,i,at,score,cloud,timezone,opportunity,moon:moonInfo(at,place),sun:bodyPosition(A.Body.Sun,at,place).altitude};
 }),[selected,options,results,instant,requestKey,now]);
 const complete=rows.length>1&&rows.every(r=>r.score!==null&&!r.loading&&!r.error&&!r.stale);
 const best=complete?Math.max(...rows.map(r=>r.score!)):null;
 return <section className="panel place-comparison" aria-labelledby="comparison-heading">
  <div className="comparison-heading"><div><h2 id="comparison-heading">Compare your observing sites</h2><p className="muted">Choose up to four places. Every site is evaluated at {new Date(instant*1000).toISOString().slice(0,16).replace('T',' ')} UTC, using the hourly forecast covering that time.</p></div><button className="text-button" onClick={refresh} disabled={!selected.length||rows.some(row=>row.loading)}><RefreshCw size={16}/>{rows.some(row=>row.loading)?'Refreshing forecasts…':rows.some(row=>row.error)?'Retry forecasts':'Refresh forecasts'}</button></div>
  <div className="comparison-picker">{options.map((p,i)=><label key={key(p)} htmlFor={`compare-${i}`}><Checkbox id={`compare-${i}`} checked={selected.includes(key(p))} disabled={!selected.includes(key(p))&&selected.length>=4} onCheckedChange={checked=>setSelection(checked?[...selected,key(p)]:selected.filter(id=>id!==key(p)))}/><span>{p.name}<small>{p.latitude.toFixed(2)}°, {p.longitude.toFixed(2)}°{p.bortle?` · Bortle ${p.bortle}`:''}</small></span></label>)}</div>
  {options.length<2&&<p className="muted">Save another place above to compare conditions before choosing where to go.</p>}
  {!selected.length&&<p className="muted">Select a place to see its forecast.</p>}
  <div className="comparison-grid">{rows.map(r=><article className="comparison-card" key={r.id}>
   <h3>{r.place.name}</h3><p className="comparison-local">{timeLabel(r.at,r.timezone)} · {r.timezone}</p>
   <p className="comparison-darkness">{r.place.bortle?`Your sky rating: Bortle ${r.place.bortle} / 9`:'Sky darkness: not rated'}</p>
   {(r.loading||r.error||r.stale)&&<p className={r.error?'error':'muted'} role="status">{r.loading?r.result?.data?'Refreshing; previous forecast shown.':'Loading forecast…':r.error?r.result?.data?'Refresh failed; previous forecast shown. Retry forecasts to update it.':r.error:'This forecast was fetched over 30 minutes ago. Refresh before relying on it.'}</p>}
   {r.result?.data&&r.result.fetchedAt!==undefined&&<p className="comparison-local">Last successful update: {new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:r.timezone,timeZoneName:'shortOffset'}).format(new Date(r.result.fetchedAt))}</p>}
   {r.result?.data&&(r.i<0?<p className="muted">This hour is outside the available forecast. Choose a time within the next seven days.</p>:<>
    <div className="comparison-score"><strong>{r.score??'—'}</strong><span>/ 100<br/>planning score</span></div>
    <p className="comparison-best">{best!==null&&r.score===best&&best>0?'Highest score among selected sites':r.sun>-6?'Daylight or civil twilight':r.sun>-18?'Twilight at this hour':'Astronomical darkness'}</p>
    <dl><div><dt>Cloud cover</dt><dd>{metric(r.cloud,'%')}</dd></div><div><dt>Temperature</dt><dd>{metric(r.h?.temperature_2m?.[r.i],' °C')}</dd></div><div><dt>Wind</dt><dd>{metric(r.h?.wind_speed_10m?.[r.i],' km/h')}</dd></div><div><dt>Humidity</dt><dd>{metric(r.h?.relative_humidity_2m?.[r.i],'%')}</dd></div><div><dt>Moon</dt><dd>{Math.round(r.moon.illumination*100)}% · {r.moon.altitude>0?'above':'below'} horizon</dd></div></dl>
   </>)}
   {r.opportunity?.best?<div className="comparison-window"><small>BEST UPCOMING DARK WINDOW</small><strong>{r.opportunity.best.score}/100 · {new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:r.timezone,timeZoneName:'shortOffset'}).format(r.opportunity.best.date)}</strong><span>{r.opportunity.best.hours} {r.opportunity.best.hours===1?'hour':'hours'} · {r.opportunity.best.cloud}% cloud · {r.opportunity.forecastHours}/{r.opportunity.darkHours} dark hours scored</span><button className="text-button" onClick={()=>onPlan({...r.place,timezone:r.timezone},r.opportunity!.best!.date)}>Plan this window <ArrowUpRight size={16}/></button></div>:r.result?.data?<p className="comparison-no-window">No scored dark window in the remaining forecast.</p>:null}
   <button className="text-button" onClick={()=>onChoose({...r.place,timezone:r.timezone})}>Plan here at selected time <ArrowUpRight size={16}/></button>
  </article>)}</div>
  <p className="footnote">Same-hour scores and best upcoming windows use cloud cover, Sun altitude and moonlight. The best window is the highest-scoring available dark one- or two-hour forecast window after now; it may be on a different night for each site. User-entered Bortle ratings are separate and are not map measurements. Scores do not measure seeing, transparency or light pollution. Weather: Open-Meteo. Missing data is never scored as clear skies.</p>
 </section>;
}
