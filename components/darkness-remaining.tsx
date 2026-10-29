'use client';
import {useMemo} from 'react';
import {remainingDarkness,darknessDuration} from '@/lib/darkness-remaining';
import {forecastHourLabel} from '@/lib/weather-planning';
import type {Place} from '@/lib/sky';
import {useLanguage} from '@/components/language-provider';

export default function DarknessRemaining({date,place}:{date:Date;place:Place}){
 const {language,tr}=useLanguage();
 const window=useMemo(()=>remainingDarkness(date,place),[date,place]);
 if(!window)return null;
 const timezone=place.timezone||'UTC';
 const minutes=window.end?Math.floor((+window.end-+window.start)/60000):0;
 const duration=language==='zh-Hant'?(minutes<1?'少於一分鐘':`${Math.floor(minutes/60)?`${Math.floor(minutes/60)} 小時`:''}${minutes%60?`${minutes%60} 分鐘`:''}`):window.end?darknessDuration(window.start,window.end):'';
 return <section className="panel darkness-remaining" aria-labelledby="darkness-remaining-heading">
  <h2 id="darkness-remaining-heading">{tr('Your remaining dark time','剩餘的完全黑夜時間')}</h2>
  {window.end?<><p><strong>{duration}</strong>{tr(' of full astronomical darkness remains after your selected time.','的完全天文黑夜，從所選時間起計。')}</p><p>{tr('Full darkness ends ','完全黑夜結束時間：')}<time dateTime={window.end.toISOString()}>{forecastHourLabel(window.end,timezone,language==='zh-Hant'?'zh-Hant':'en-GB').full}</time> · {timezone}.</p></>:<p>{tr(`No end of full darkness was found ${window.dateLimited?'before the supported UTC date limit':'within 48 hours of your selected time'}. This does not mean darkness lasts indefinitely.`,`在${window.dateLimited?'支援的 UTC 日期上限之前':'所選時間後 48 小時內'}找不到完全黑夜的結束時間；這不代表黑夜會無限持續。`)}</p>}
  <p className="footnote">{tr(`Calculated for ${place.name}, with the Sun below −18°. Duration uses elapsed time across clock changes. Clouds, Moon glare and local obstructions can still limit observing.`,`以 ${place.name} 的太陽高度低於 −18° 計算。時長按實際經過時間計算，並考慮時鐘變更。雲量、月光及當地遮蔽物仍可能影響觀測。`)}</p>
 </section>;
}
