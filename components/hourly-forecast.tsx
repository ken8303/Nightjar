'use client';

import {browseHourButtons} from '@/lib/hour-button-keys';
import {useEffect,useRef,useState} from 'react';
import {Cloud,Star} from 'lucide-react';
import {forecastHourLabel} from '@/lib/weather-planning';
import {timeLabel} from '@/lib/sky';
import {type weatherHours} from '@/lib/weather-hours';
import {useLanguage} from '@/components/language-provider';

type Props={hours:ReturnType<typeof weatherHours>;currentDate?:Date;timezone:string;onDate:(date:Date)=>void};

export default function HourlyForecast({hours,currentDate,timezone,onDate}:Props){
 const {language,tr}=useLanguage();
 const scroller=useRef<HTMLDivElement>(null);
 const currentTime=Number(currentDate);
 const [scrollState,setScrollState]=useState({overflow:false,previous:false,next:false});
 useEffect(()=>{
  const node=scroller.current;if(!node)return;
  const update=()=>{const remaining=node.scrollWidth-node.clientWidth;setScrollState({overflow:remaining>1,previous:node.scrollLeft>1,next:node.scrollLeft<remaining-1})};
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);
  observer?.observe(node);node.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);update();
  return ()=>{observer?.disconnect();node.removeEventListener('scroll',update);window.removeEventListener('resize',update)};
 },[hours]);
 useEffect(()=>{if(scroller.current)scroller.current.scrollLeft=0},[currentTime]);
 function move(direction:number){
  const node=scroller.current;if(!node)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  node.scrollBy({left:direction*node.clientWidth*.8,behavior:reduce?'instant':'smooth'});
 }
 return <>
  <p className="hourly-score-key">{tr('Score bars show the observing score out of 100; dashed means unavailable. A star indicates 0% forecast cloud; a cloud icon indicates some cloud.','長條顯示滿分 100 的觀測評分；虛線表示資料不足。星號表示預報雲量為 0%，雲朵圖示表示有雲。')}</p>
  <p id="forecast-keyboard-help" className="footnote hourly-keyboard-help">{tr('Use Left/Right or Home/End to browse hours, then Enter or Space to select.','使用方向鍵或 Home／End 瀏覽時段，再按 Enter 或空白鍵選擇。')}</p>
  {scrollState.overflow&&<div className="hourly-scroll-controls"><span>{tr('Swipe for more dark hours','滑動查看更多黑夜時段')}</span><div><button type="button" className="button" onClick={()=>move(-1)} disabled={!scrollState.previous} aria-label={tr('Show earlier forecast hours','顯示較早的預報時段')}>{tr('Earlier','較早')}</button><button type="button" className="button" onClick={()=>move(1)} disabled={!scrollState.next} aria-label={tr('Show later forecast hours','顯示較晚的預報時段')}>{tr('Later','較晚')}</button></div></div>}
  <div ref={scroller} className="hourly" role="group" aria-label={tr('Hourly forecast times','逐時預報')} aria-describedby="forecast-keyboard-help">
   {hours.map(hour=>{
    const selected=+hour.date===Number(currentDate),label=forecastHourLabel(hour.date,timezone,language==='zh-Hant'?'zh-Hant':'en-GB');
    return <button type="button" className={`hour${selected?' selected':''}`} key={hour.date.toISOString()}
     aria-pressed={selected} aria-label={tr(`Select ${label.full}, score ${hour.score===null?'unavailable':`${hour.score} out of 100`}, ${hour.cloud===null?'cloud cover unavailable':`${hour.cloud}% cloud cover`}, ${hour.temp===null?'temperature unavailable':`${hour.temp} degrees Celsius`}`,`選擇 ${label.full}，評分 ${hour.score===null?'無資料':`${hour.score}／100`}，${hour.cloud===null?'雲量無資料':`雲量 ${hour.cloud}%`}，${hour.temp===null?'氣溫無資料':`氣溫攝氏 ${hour.temp} 度`}`)}
     onClick={()=>onDate(hour.date)}
     onKeyDown={browseHourButtons}>
     <span>{timeLabel(hour.date,timezone)}</span><small className="forecast-hour-stamp">{label.detail}</small>
     {hour.cloud===null?<span aria-hidden="true">?</span>:hour.cloud===0?<Star size={20} aria-hidden="true"/>:<Cloud size={20} aria-hidden="true"/>}
     <strong>{hour.score??'—'}<small>/100</small></strong><div className={`bar${hour.score===null?' unavailable':''}`} aria-hidden="true">{hour.score!==null&&<i style={{height:`${hour.score}%`}}/>}</div>
     <small className="forecast-cloud-label">{hour.cloud===null?tr('Cloud unavailable','雲量無資料'):tr(`${hour.cloud}% cloud`,`雲量 ${hour.cloud}%`)}</small><span>{hour.temp===null?'—':`${hour.temp}°`}</span>
    </button>;
   })}
  </div>
 </>;
}
