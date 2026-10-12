import {type WeatherForecast} from './weather-hours';
import {forecastFreshness} from './forecast-freshness';

export type SiteForecast={data?:WeatherForecast;fetchedAt?:number;error?:string;requestKey:string};
export function storeSiteForecast(previous:Record<string,SiteForecast>,id:string,result:SiteForecast,active:string[]){
 const next:Record<string,SiteForecast>={};
 for(const key of active)if(previous[key])next[key]=previous[key];
 if(active.includes(id))next[id]=result.data?result:{...result,data:previous[id]?.data,fetchedAt:previous[id]?.fetchedAt};
 return next;
}
export function siteForecastState(result:SiteForecast|undefined,requestKey:string,now:number){
 const loading=result?.requestKey!==requestKey;
 return {loading,error:loading?'':result?.error||'',...forecastFreshness(result?.data?result.fetchedAt:undefined,now)};
}
