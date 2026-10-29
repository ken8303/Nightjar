'use client';

import {useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {forecastFreshness} from '@/lib/forecast-freshness';
import {forecastHourLabel} from '@/lib/weather-planning';
import {useLanguage} from '@/components/language-provider';

type Props={best:{date:Date;score:number|null}|null;timezone:string;fetchedAt?:number;loading:boolean;error:string;stale:boolean;clockChanged:boolean;contextKey:string;onDate:(date:Date,fetchedAt:number)=>void;onRefresh:()=>void;statusId?:string};

export default function ForecastBestHour({best,timezone,fetchedAt,loading,error,stale,clockChanged,contextKey,onDate,onRefresh,statusId='best-hour-planning-status'}:Props){
 const {language,tr}=useLanguage();
 const context=JSON.stringify([contextKey,best?+best.date:null,best?.score,fetchedAt,loading,error]);
 const [issue,setIssue]=useState<string|null>(null);
 if(issue===context)return <div className="notice best-hour-recovery"><p id={statusId} role="status">{tr('Forecast freshness has changed. Your observing time was kept. Refresh the forecast before planning the best hour.','預報的時效已變更，觀測時間保持不變。請更新預報後再選擇最佳時間。')}</p><button type="button" className="button" onClick={onRefresh} disabled={loading}>{tr('Refresh and review best hour','更新並重新查看最佳時間')}</button></div>;
 if(loading||error||stale||clockChanged||typeof fetchedAt!=='number'||!Number.isFinite(fetchedAt)||!best||best.score===null||best.score<=0)return null;
 const chosenDate=best.date;
 function plan(){
  // A rendered action can outlive the age/clock boundary between clock ticks.
  const freshness=forecastFreshness(fetchedAt,Date.now());
  if(freshness.stale||freshness.clockChanged){setIssue(context);return}
  onDate(chosenDate,fetchedAt!);
 }
 return <button type="button" className="text-button forecast-best-hour-action" onClick={plan} aria-label={tr(`Plan best hour: ${forecastHourLabel(best.date,timezone,language==='zh-Hant'?'zh-Hant':'en-GB').full}`,`使用最佳時間：${forecastHourLabel(best.date,timezone,language==='zh-Hant'?'zh-Hant':'en-GB').full}`)}><CalendarDays size={16}/>{tr('Plan best hour','使用最佳時間')}</button>;
}
