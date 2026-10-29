import {auroraTimingIssue,type AuroraFeed} from './aurora';
import {isAstronomicalNight,type Place} from './sky';
import {satelliteWindowWeather,type SatelliteWeather} from './satellite-weather';

// NOAA's forecast instant, not the planner's selected time, owns this context.
// A one-millisecond window identifies its covering hourly cloud sample.
export function auroraWeatherAtForecast(feed:AuroraFeed,place:Place,weather:SatelliteWeather,now:number){
 const timing=auroraTimingIssue(feed,now);
 if(timing)return {status:'aurora-timing' as const};
 const instant=Date.parse(feed.forecastAt);
 if(!isAstronomicalNight(new Date(instant),place))return {status:'outside-darkness' as const};
 return satelliteWindowWeather(instant,instant+1,weather,now);
}
