import {type WeatherForecast} from './weather-hours';
import {forecastFreshness} from './forecast-freshness';
import type {Place} from './sky';

// These exact endpoints denote one coordinate. Keep all other precision so
// comparison selections and cached forecasts never merge distinct positions.
export function siteForecastKey(place:Pick<Place,'latitude'|'longitude'>){
 return `${place.latitude},${place.longitude===180?-180:place.longitude}`;
}

// UTC can format a comparison when the zone is unknown. It must not become
// a persisted claim about that site's local clock during a planning handoff.
export function siteForecastContext(place:Place,data:WeatherForecast|undefined){
 const known=data?.timezone||place.timezone;
 return {timezone:known||'UTC',timezoneKnown:Boolean(known),planningPlace:known?{...place,timezone:known}:place};
}

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

type ComparableSite={id:string;score:number|null;loading:boolean;error:string;stale:boolean;clockChanged:boolean};
export function compareSiteScores(sites:readonly ComparableSite[]){
 const complete=sites.length>1&&sites.every(site=>typeof site.score==='number'&&Number.isFinite(site.score)&&site.score>=0&&site.score<=100&&!site.loading&&!site.error&&!site.stale&&!site.clockChanged);
 const best=complete?Math.max(...sites.map(site=>site.score!)):null;
 return {complete,best,leadingIds:best!==null&&best>0?sites.filter(site=>site.score===best).map(site=>site.id):[]};
}
