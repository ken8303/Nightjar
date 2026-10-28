import {forecastHourIndex,parseWeatherForecast} from './weather-hours';

export type CloudModels={time:number[];gfs:(number|null)[];icon:(number|null)[]};
// Validate timestamps and values with the same rules as the main forecast.
// A missing model stays unavailable; it is never replaced with another model.
export function parseCloudModels(value:unknown):CloudModels{
 if(!value||typeof value!=='object')throw Error('Cloud model data is unavailable.');
 const root=value as Record<string,unknown>,raw=root.hourly,units=root.hourly_units;
 if(!raw||typeof raw!=='object'||!units||typeof units!=='object')throw Error('Cloud model data is unavailable.');
 const fields=raw as Record<string,unknown>,unit=units as Record<string,unknown>;
 if(unit.time!=='unixtime')throw Error('Cloud model timestamps are unavailable.');
 const times=fields.time;
 if(!Array.isArray(times)||times.length===0||times.length>240)throw Error('Cloud model timestamps are unavailable.');
 const normalize=(key:string)=>{
  const values=fields[key];
  if(values===undefined)return times.map(()=>null);
  if(unit[key]!=='%'||!Array.isArray(values)||values.length!==times.length)throw Error('Cloud model samples are unavailable.');
  return parseWeatherForecast({hourly:{time:times,cloud_cover:values}}).hourly.cloud_cover;
 };
 // Validate timestamps even if both models are absent.
 const time=parseWeatherForecast({hourly:{time:times,cloud_cover:times.map(()=>null)}}).hourly.time;
 return {time,gfs:normalize('cloud_cover_gfs_global'),icon:normalize('cloud_cover_icon_global')};
}
export function cloudModelsAt(data:CloudModels,date:Date){
 const index=forecastHourIndex(data.time,date);
 return index<0?null:{gfs:data.gfs[index],icon:data.icon[index]};
}

// Revalidate the normalized response at the browser boundary too.
export function parseCloudModelResponse(value:unknown):CloudModels{
 if(!value||typeof value!=='object')throw Error('Cloud model data is unavailable.');
 const raw=value as Record<string,unknown>;
 if(!Array.isArray(raw.gfs)||!Array.isArray(raw.icon))throw Error('Cloud model samples are unavailable.');
 return parseCloudModels({hourly:{time:raw.time,cloud_cover_gfs_global:raw.gfs,cloud_cover_icon_global:raw.icon},hourly_units:{time:'unixtime',cloud_cover_gfs_global:'%',cloud_cover_icon_global:'%'}});
}
