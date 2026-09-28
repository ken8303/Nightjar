'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { A, bodyPosition, moonInfo, Place, scoreAt, timeLabel } from '@/lib/sky';

type Forecast = { timezone?: string; hourly: { time: number[]; cloud_cover: (number|null)[]; temperature_2m: (number|null)[]; relative_humidity_2m: (number|null)[]; wind_speed_10m: (number|null)[] } };
type Result = { data?: Forecast; error?: string };
const key = (p: Place) => `${p.latitude},${p.longitude}`;
const metric = (value: unknown, unit: string) => typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}${unit}` : 'Unavailable';

export default function PlaceComparison({ places, current, date, onChoose }: { places: Place[]; current: Place; date: Date; onChoose: (p: Place) => void }) {
 const options = [current, ...places].filter((p,i,a)=>a.findIndex(v=>key(v)===key(p))===i);
 const [selection,setSelection] = useState<string[]|null>(null);
 const selected = (selection ?? options.slice(0,4).map(key)).filter(id=>options.some(p=>key(p)===id));
 const selectedKey = selected.join('|');
 const [results,setResults] = useState<Record<string,Result>>({});
 const [retry,setRetry] = useState(0);
 useEffect(()=>{
  const controller = new AbortController(); let stopped = false;
  setResults({});
  for(const id of selectedKey.split('|').filter(Boolean)){
   const [lat,lon] = id.split(',');
   fetch(`/api/weather?lat=${lat}&lon=${lon}`,{signal:controller.signal}).then(async response=>{
    const data = await response.json() as Forecast;
    if(!response.ok || !Array.isArray(data.hourly?.time)) throw new Error('Forecast unavailable. Try refreshing.');
    if(!stopped)setResults(old=>({...old,[id]:{data}}));
   }).catch(error=>{if(!stopped&&error.name!=='AbortError')setResults(old=>({...old,[id]:{error:'Forecast unavailable. Try refreshing.'}}));});
  }
  return()=>{stopped=true;controller.abort()};
 },[selectedKey,retry]);
 const instant = Math.floor(date.getTime()/3600000)*3600;
 const rows = useMemo(()=>selected.map(id=>{
  const place=options.find(p=>key(p)===id)!; const result=results[id];
  const h=result?.data?.hourly; const i=h?.time.indexOf(instant) ?? -1;
  const at=new Date(instant*1000),cloud=i>=0?h?.cloud_cover?.[i]:null;
  const score=typeof cloud==='number'&&Number.isFinite(cloud)&&cloud>=0&&cloud<=100?scoreAt(cloud,at,place):null;
  return {id,place,result,h,i,at,score,cloud,moon:moonInfo(at,place),sun:bodyPosition(A.Body.Sun,at,place).altitude};
 }),[selectedKey,results,instant,places,current]);
 const complete=rows.length>1&&rows.every(r=>r.score!==null);
 const best=complete?Math.max(...rows.map(r=>r.score!)):null;
 return <section className="panel place-comparison" aria-labelledby="comparison-heading">
  <div className="comparison-heading"><div><h2 id="comparison-heading">Compare your observing sites</h2><p className="muted">Choose up to four places. Every forecast uses the same hour: {new Date(instant*1000).toISOString().slice(0,16).replace('T',' ')} UTC.</p></div><button className="text-button" onClick={()=>setRetry(v=>v+1)} disabled={!selected.length}><RefreshCw size={16}/>Refresh forecasts</button></div>
  <div className="comparison-picker">{options.map((p,i)=><label key={key(p)} htmlFor={`compare-${i}`}><Checkbox id={`compare-${i}`} checked={selected.includes(key(p))} disabled={!selected.includes(key(p))&&selected.length>=4} onCheckedChange={checked=>setSelection(checked?[...selected,key(p)]:selected.filter(id=>id!==key(p)))}/><span>{p.name}<small>{p.latitude.toFixed(2)}°, {p.longitude.toFixed(2)}°</small></span></label>)}</div>
  {options.length<2&&<p className="muted">Save another place above to compare conditions before choosing where to go.</p>}
  {!selected.length&&<p className="muted">Select a place to see its forecast.</p>}
  <div className="comparison-grid">{rows.map(r=><article className="comparison-card" key={r.id}>
   <h3>{r.place.name}</h3><p className="comparison-local">{timeLabel(r.at,r.result?.data?.timezone||r.place.timezone)} · {r.result?.data?.timezone||r.place.timezone||'UTC'}</p>
   {!r.result?<p role="status">Loading forecast…</p>:r.result.error?<p className="error" role="status">{r.result.error}</p>:r.i<0?<p className="muted">This hour is outside the available forecast. Choose a time within the next seven days.</p>:<>
    <div className="comparison-score"><strong>{r.score??'—'}</strong><span>/ 100<br/>planning score</span></div>
    <p className="comparison-best">{best!==null&&r.score===best&&best>0?'Highest score among selected sites':r.sun>-6?'Daylight or civil twilight':r.sun>-18?'Twilight at this hour':'Astronomical darkness'}</p>
    <dl><div><dt>Cloud cover</dt><dd>{metric(r.cloud,'%')}</dd></div><div><dt>Temperature</dt><dd>{metric(r.h?.temperature_2m?.[r.i],' °C')}</dd></div><div><dt>Wind</dt><dd>{metric(r.h?.wind_speed_10m?.[r.i],' km/h')}</dd></div><div><dt>Humidity</dt><dd>{metric(r.h?.relative_humidity_2m?.[r.i],'%')}</dd></div><div><dt>Moon</dt><dd>{Math.round(r.moon.illumination*100)}% · {r.moon.altitude>0?'above':'below'} horizon</dd></div></dl>
   </>}
   <button className="text-button" onClick={()=>onChoose({...r.place,timezone:r.result?.data?.timezone||r.place.timezone})}>Plan here <ArrowUpRight size={16}/></button>
  </article>)}</div>
  <p className="footnote">The score combines cloud cover, Sun altitude and moonlight. It does not measure seeing, transparency or light pollution. Weather: Open-Meteo. Missing data is never scored as clear skies.</p>
 </section>;
}
