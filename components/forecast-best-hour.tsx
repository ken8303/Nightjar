'use client';

import {useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {forecastFreshness} from '@/lib/forecast-freshness';
import {forecastHourLabel} from '@/lib/weather-planning';
import {useLanguage} from '@/components/language-provider';
import {languageLocale} from '@/lib/language';

type Props={best:{date:Date;score:number|null}|null;timezone:string;fetchedAt?:number;loading:boolean;error:string;stale:boolean;clockChanged:boolean;contextKey:string;onDate:(date:Date,fetchedAt:number)=>void;onRefresh:()=>void;statusId?:string};

export default function ForecastBestHour({best,timezone,fetchedAt,loading,error,stale,clockChanged,contextKey,onDate,onRefresh,statusId='best-hour-planning-status'}:Props){
 const {language,t}=useLanguage();
 const context=JSON.stringify([contextKey,best?+best.date:null,best?.score,fetchedAt,loading,error]);
 const [issue,setIssue]=useState<string|null>(null);
 if(issue===context)return <div className="notice best-hour-recovery"><p id={statusId} role="status">{t('bestHour.freshnessChanged')}</p><button type="button" className="button" onClick={onRefresh} disabled={loading}>{t('bestHour.refresh')}</button></div>;
 if(loading||error||stale||clockChanged||typeof fetchedAt!=='number'||!Number.isFinite(fetchedAt)||!best||best.score===null||best.score<=0)return null;
 const chosenDate=best.date;
 function plan(){
  // A rendered action can outlive the age/clock boundary between clock ticks.
  const freshness=forecastFreshness(fetchedAt,Date.now());
  if(freshness.stale||freshness.clockChanged){setIssue(context);return}
  onDate(chosenDate,fetchedAt!);
 }
 return <button type="button" className="text-button forecast-best-hour-action" onClick={plan} aria-label={t('bestHour.planLabel',{time:forecastHourLabel(best.date,timezone,languageLocale(language)).full})}><CalendarDays size={16}/>{t('bestHour.plan')}</button>;
}
