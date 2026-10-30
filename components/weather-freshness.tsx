'use client';

import {RefreshCw} from 'lucide-react';
import {useLanguage} from '@/components/language-provider';
import {languageLocale} from '@/lib/language';

type Props={hasForecast:boolean;fetchedAt?:number;timezone:string;loading:boolean;error:string;stale:boolean;clockChanged:boolean;onRefresh:()=>void;refreshLabel?:string};

export default function WeatherFreshness({hasForecast,fetchedAt,timezone,loading,error,stale,clockChanged,onRefresh,refreshLabel}:Props){
 const {language,t}=useLanguage();
 const stamp=hasForecast&&fetchedAt!==undefined?new Intl.DateTimeFormat(languageLocale(language),{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:timezone,timeZoneName:'shortOffset'}).format(new Date(fetchedAt)):'';
 const message=loading?hasForecast?t('weather.refreshingPrevious'):t('weather.fetching'):error?hasForecast?t('weather.failedPrevious'):t('weather.failed',{error}):stamp?t('weather.fetched',{stamp,age:stale?t('weather.staleAge'):''}):'';
 const refreshText=refreshLabel?(language==='en'?refreshLabel:error?t('weather.retrySevenNights'):t('weather.refreshSevenNights')):(error?t('weather.retry'):t('weather.refresh'));
 return <>
  <div className="forecast-freshness"><p className={error?'error':'muted'} role="status">{message}{stamp&&(loading||error)?t('weather.lastUpdate',{stamp}):''}</p><button className="text-button" disabled={loading} onClick={onRefresh}><RefreshCw size={16}/>{loading?t('weather.refreshing'):refreshText}</button></div>
  {stale&&<p className="notice" role="status">{t('weather.staleNotice')}</p>}
  {clockChanged&&<p className="notice" role="status">{t('weather.clockNotice')}</p>}
 </>;
}
