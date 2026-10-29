import {forecastHourIndex,parseWeatherForecast} from './weather-hours';

type ModelSeries={gfs:(number|null)[];icon:(number|null)[];ecmwf:(number|null)[]};
export type CloudModels=ModelSeries&{time:number[];temperature:ModelSeries;humidity:ModelSeries};
const models={gfs:'gfs_global',icon:'icon_global',ecmwf:'ecmwf_ifs025'} as const;

// Validate each model and measurement separately; missing values are never
// borrowed from another model or another forecast hour.
export function parseCloudModels(value:unknown):CloudModels{
 if(!value||typeof value!=='object')throw Error('Model data is unavailable.');
 const root=value as Record<string,unknown>,raw=root.hourly,units=root.hourly_units;
 if(!raw||typeof raw!=='object'||!units||typeof units!=='object')throw Error('Model data is unavailable.');
 const fields=raw as Record<string,unknown>,unit=units as Record<string,unknown>;
 if(unit.time!=='unixtime')throw Error('Model timestamps are unavailable.');
 const times=fields.time;
 if(!Array.isArray(times)||times.length===0||times.length>240)throw Error('Model timestamps are unavailable.');
 const time=parseWeatherForecast({hourly:{time:times,cloud_cover:times.map(()=>null)}}).hourly.time;
 const normalize=(key:string,expectedUnit:string,percentage:boolean)=>{
  const values=fields[key];
  if(values===undefined)return time.map(()=>null);
  if(unit[key]!==expectedUnit||!Array.isArray(values)||values.length!==time.length)throw Error('Model samples are unavailable.');
  return values.map(value=>typeof value==='number'&&Number.isFinite(value)&&(!percentage||value>=0&&value<=100)?value:null);
 };
 const series=(field:string,expectedUnit:string,percentage:boolean):ModelSeries=>({
  gfs:normalize(`${field}_${models.gfs}`,expectedUnit,percentage),
  icon:normalize(`${field}_${models.icon}`,expectedUnit,percentage),
  ecmwf:normalize(`${field}_${models.ecmwf}`,expectedUnit,percentage),
 });
 return {time,...series('cloud_cover','%',true),temperature:series('temperature_2m','°C',false),humidity:series('relative_humidity_2m','%',true)};
}
export function cloudModelsAt(data:CloudModels,date:Date){
 const index=forecastHourIndex(data.time,date);
 return index<0?null:{gfs:data.gfs[index],icon:data.icon[index],ecmwf:data.ecmwf[index]};
}
export function modelConditionsAt(data:CloudModels,date:Date){
 const index=forecastHourIndex(data.time,date);
 if(index<0)return null;
 const at=(values:ModelSeries)=>({gfs:values.gfs[index],icon:values.icon[index],ecmwf:values.ecmwf[index]});
 return {cloud:at(data),temperature:at(data.temperature),humidity:at(data.humidity)};
}

// Revalidate the normalized response at the browser boundary too. Older
// responses without the added measurements remain usable with missing values.
export function parseCloudModelResponse(value:unknown):CloudModels{
 if(!value||typeof value!=='object')throw Error('Model data is unavailable.');
 const raw=value as Record<string,unknown>;
 if(!Array.isArray(raw.gfs)||!Array.isArray(raw.icon))throw Error('Model samples are unavailable.');
 const hourly:Record<string,unknown>={time:raw.time,cloud_cover_gfs_global:raw.gfs,cloud_cover_icon_global:raw.icon,cloud_cover_ecmwf_ifs025:raw.ecmwf};
 const hourlyUnits:Record<string,string>={time:'unixtime',cloud_cover_gfs_global:'%',cloud_cover_icon_global:'%',cloud_cover_ecmwf_ifs025:'%'};
 for(const [property,field,unit] of [['temperature','temperature_2m','°C'],['humidity','relative_humidity_2m','%']] as const){
  const values=raw[property];
  if(values===undefined)continue;
  if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Model samples are unavailable.');
  for(const [key,model] of Object.entries(models)){const fieldName=`${field}_${model}`;hourly[fieldName]=(values as Record<string,unknown>)[key];hourlyUnits[fieldName]=unit}
 }
 return parseCloudModels({hourly,hourly_units:hourlyUnits});
}
