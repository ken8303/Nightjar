'use client';

import {RefreshCw} from 'lucide-react';

type Props={hasForecast:boolean;fetchedAt?:number;timezone:string;loading:boolean;error:string;stale:boolean;onRefresh:()=>void};

export default function WeatherFreshness({hasForecast,fetchedAt,timezone,loading,error,stale,onRefresh}:Props){
 const stamp=hasForecast&&fetchedAt!==undefined?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:timezone,timeZoneName:'shortOffset'}).format(new Date(fetchedAt)):'';
 const message=loading?hasForecast?'Refreshing weather; previous forecast shown.':'Fetching weather…':error?hasForecast?'Refresh failed; previous forecast shown. Retry to update it.':error:stamp?`Weather fetched ${stamp}${stale?' · over 30 minutes ago':''}.`:'';
 return <>
  <div className="forecast-freshness"><p className={error?'error':'muted'} role="status">{message}{stamp&&(loading||error)?` Last successful update: ${stamp}.`:''}</p><button className="text-button" disabled={loading} onClick={onRefresh}><RefreshCw size={16}/>{loading?'Refreshing…':error?'Retry forecast':'Refresh weather'}</button></div>
  {stale&&<p className="notice" role="status">This weather was fetched over 30 minutes ago. Refresh before relying on its planning scores or cloud averages.</p>}
 </>;
}
