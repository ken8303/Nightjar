'use client';

import {RefreshCw} from 'lucide-react';
import {useLanguage} from '@/components/language-provider';

type Props={hasForecast:boolean;fetchedAt?:number;timezone:string;loading:boolean;error:string;stale:boolean;clockChanged:boolean;onRefresh:()=>void;refreshLabel?:string};

export default function WeatherFreshness({hasForecast,fetchedAt,timezone,loading,error,stale,clockChanged,onRefresh,refreshLabel}:Props){
 const {language,tr}=useLanguage();
 const stamp=hasForecast&&fetchedAt!==undefined?new Intl.DateTimeFormat(language==='zh-Hant'?'zh-Hant':'en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:timezone,timeZoneName:'shortOffset'}).format(new Date(fetchedAt)):'';
 const message=loading?hasForecast?tr('Refreshing weather; previous forecast shown.','正在更新天氣，顯示先前預報。'):tr('Fetching weather…','正在取得天氣預報…'):error?hasForecast?tr('Refresh failed; previous forecast shown. Retry to update it.','更新失敗，顯示先前預報。請重試以更新。'):tr(error,`無法取得預報：${error}`):stamp?tr(`Weather fetched ${stamp}${stale?' · over 30 minutes ago':''}.`,`預報取得時間：${stamp}${stale?'（已超過 30 分鐘）':''}。`):'';
 const refreshText=refreshLabel?(language==='zh-Hant'?(error?'重試七夜預報':'更新七夜預報'):refreshLabel):(error?tr('Retry forecast','重試預報'):tr('Refresh weather','更新天氣'));
 return <>
  <div className="forecast-freshness"><p className={error?'error':'muted'} role="status">{message}{stamp&&(loading||error)?tr(` Last successful update: ${stamp}.`,` 上次成功更新：${stamp}。`):''}</p><button className="text-button" disabled={loading} onClick={onRefresh}><RefreshCw size={16}/>{loading?tr('Refreshing…','正在更新…'):refreshText}</button></div>
  {stale&&<p className="notice" role="status">{tr('This weather was fetched over 30 minutes ago. Refresh before relying on its planning scores or cloud averages.','此天氣資料已超過 30 分鐘。使用觀測評分或平均雲量前，請先更新。')}</p>}
  {clockChanged&&<p className="notice" role="status">{tr('The weather update time is ahead of your device clock. Its age cannot be confirmed; check your clock and refresh before relying on this forecast.','預報更新時間比裝置時鐘還晚，無法確認資料時效。請檢查裝置時鐘並更新預報。')}</p>}
 </>;
}
