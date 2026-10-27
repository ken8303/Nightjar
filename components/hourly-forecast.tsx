'use client';

import {browseHourButtons} from '@/lib/hour-button-keys';
import {Cloud,Star} from 'lucide-react';
import {forecastHourLabel} from '@/lib/weather-planning';
import {timeLabel} from '@/lib/sky';
import {type weatherHours} from '@/lib/weather-hours';

type Props={hours:ReturnType<typeof weatherHours>;currentDate?:Date;timezone:string;onDate:(date:Date)=>void};

export default function HourlyForecast({hours,currentDate,timezone,onDate}:Props){
 return <>
  <p className="hourly-score-key">Score bars show the observing score out of 100. A dashed bar means the score is unavailable.</p>
  <p id="forecast-keyboard-help" className="footnote hourly-keyboard-help">Use Left/Right or Home/End to browse hours, then Enter or Space to select.</p>
  <div className="hourly" role="group" aria-label="Hourly forecast times" aria-describedby="forecast-keyboard-help">
   {hours.map(hour=>{
    const selected=+hour.date===Number(currentDate),label=forecastHourLabel(hour.date,timezone);
    return <button type="button" className={`hour${selected?' selected':''}`} key={hour.date.toISOString()}
     aria-pressed={selected} aria-label={`Select ${label.full}, score ${hour.score===null?'unavailable':`${hour.score} out of 100`}, ${hour.cloud===null?'cloud cover unavailable':`${hour.cloud}% cloud cover`}, ${hour.temp===null?'temperature unavailable':`${hour.temp} degrees Celsius`}`}
     onClick={()=>onDate(hour.date)}
     onKeyDown={browseHourButtons}>
     <span>{timeLabel(hour.date,timezone)}</span><small className="forecast-hour-stamp">{label.detail}</small>
     {hour.cloud===null?<span aria-label="Cloud cover unavailable">?</span>:hour.cloud>50?<Cloud size={20}/>:<Star size={20}/>}
     <strong>{hour.score??'—'}<small>/100</small></strong><div className={`bar${hour.score===null?' unavailable':''}`} aria-hidden="true">{hour.score!==null&&<i style={{height:`${hour.score}%`}}/>}</div>
     <small className="forecast-cloud-label">{hour.cloud===null?'Cloud unavailable':`${hour.cloud}% cloud`}</small><span>{hour.temp===null?'—':`${hour.temp}°`}</span>
    </button>;
   })}
  </div>
 </>;
}
