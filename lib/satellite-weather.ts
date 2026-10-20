import type {WeatherForecast} from './weather-hours';
import {forecastFreshness} from './forecast-freshness';
import {validObservingDate} from './observing-time';

// The caller supplies only the main planner forecast matching its current site.
export type SatelliteWeather={forecast:WeatherForecast|null;fetchedAt?:number;loading:boolean;error:boolean};
type Missing='loading'|'failed'|'unavailable'|'timing'|'clock'|'stale'|'coverage';
export type SatelliteWindowWeather={status:Missing}|{status:'available';minimum:number;maximum:number;hours:number;firstHour:number;lastHour:number;fetchedAt:number};

// Cloud values describe complete covering forecast hours, without interpolation
// or treating absent samples as clear. The window end is exclusive.
export function satelliteWindowWeather(start:number,end:number,weather:SatelliteWeather,now:number):SatelliteWindowWeather{
 if(weather.loading)return {status:'loading'};
 if(weather.error)return {status:'failed'};
 if(!weather.forecast)return {status:'unavailable'};
 const fetchedAt=weather.fetchedAt;
 if(typeof fetchedAt!=='number'||!Number.isSafeInteger(fetchedAt)||!validObservingDate(new Date(fetchedAt))||!Number.isFinite(now))return {status:'timing'};
 const freshness=forecastFreshness(fetchedAt,now);
 if(freshness.clockChanged)return {status:'clock'};
 if(freshness.stale)return {status:'stale'};
 if(!Number.isFinite(start)||!Number.isFinite(end)||!validObservingDate(new Date(start))||!validObservingDate(new Date(end))||end<=start||end-start>86400000)return {status:'coverage'};
 const {time,cloud_cover}=weather.forecast.hourly;
 let index=time.findIndex(time=>time*1000<=start&&start<time*1000+3600000),cursor=start;
 const clouds:number[]=[],hours:number[]=[];
 while(cursor<end){
  if(index<0||index>=time.length)return {status:'coverage'};
  const hour=time[index]*1000,cloud=cloud_cover[index];
  if(!Number.isFinite(hour)||!validObservingDate(new Date(hour))||hour>cursor||cursor>=hour+3600000||typeof cloud!=='number'||!Number.isFinite(cloud)||cloud<0||cloud>100)return {status:'coverage'};
  if(hours.length&&hour!==hours.at(-1)!+3600000)return {status:'coverage'};
  clouds.push(cloud);hours.push(hour);cursor=Math.min(end,hour+3600000);index++;
 }
 return {status:'available',minimum:Math.min(...clouds),maximum:Math.max(...clouds),hours:hours.length,firstHour:hours[0],lastHour:hours.at(-1)!,fetchedAt};
}
