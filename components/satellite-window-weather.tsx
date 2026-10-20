import {satelliteWindowWeather,type SatelliteWeather} from '@/lib/satellite-weather';
const utc=(time:number)=>new Date(time).toISOString().replace('T',' ').replace(/\.\d{3}Z$/,' UTC');
const messages={
 loading:'Cloud context is loading with the planner forecast.',
 failed:'Cloud context is unavailable after a weather refresh failure. Use Refresh weather to retry.',
 unavailable:'No planner cloud forecast is available for this window.',
 timing:'The weather retrieval time is unavailable. Refresh weather before using cloud context.',
 clock:'The weather retrieval time is ahead of this device clock. Check the clock and refresh weather.',
 stale:'The planner forecast was retrieved at least 30 minutes ago. Refresh weather for cloud context.',
 coverage:'The hourly cloud forecast does not cover this entire window with valid samples.',
};
export default function SatelliteWindowWeather({start,end,weather,now}:{start:number;end:number;weather:SatelliteWeather;now:number}){
 const result=satelliteWindowWeather(start,end,weather,now);
 if(result.status!=='available')return <p className="footnote satellite-window-weather" role="status">{messages[result.status]}</p>;
 const minimum=Math.round(result.minimum),maximum=Math.round(result.maximum);
 const cloud=minimum===maximum?`${minimum}%`:`${minimum}–${maximum}%`;
 return <div className="satellite-window-weather"><p role="status">Hourly cloud cover: about {cloud} across {result.hours} forecast {result.hours===1?'hour':'hours'}.</p><p className="footnote">{result.hours===1?'Forecast hour starts':'First forecast hour starts'}<time className="block" dateTime={new Date(result.firstHour).toISOString()}>{utc(result.firstHour)}</time>{result.hours>1&&<>Last forecast hour starts<time className="block" dateTime={new Date(result.lastHour).toISOString()}>{utc(result.lastHour)}</time></>}Weather retrieved<time className="block" dateTime={new Date(result.fetchedAt).toISOString()}>{utc(result.fetchedAt)}</time></p></div>;
}
