import {Place, scoreAt} from './sky';

export type HourlyForecast={time:number[];cloud_cover:(number|null)[];[field:string]:(number|null)[]};
export type WeatherForecast={hourly:HourlyForecast;timezone?:string};
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);

export function parseWeatherForecast(value:unknown):WeatherForecast{
 if(!value||typeof value!=='object')throw new Error('Forecast unavailable');
 const raw=value as Record<string,unknown>,data=raw.hourly;
 if(!data||typeof data!=='object')throw new Error(typeof raw.error==='string'?raw.error:'Forecast unavailable');
 const fields=data as Record<string,unknown>;
 if(!Array.isArray(fields.time)||!fields.time.every(time=>finite(time)&&Number.isFinite(+new Date(time*1000))))throw new Error('Forecast timestamps are unavailable');
 const hourly:HourlyForecast={time:fields.time,cloud_cover:[]};
 for(const [name,samples] of Object.entries(fields)){
  if(name!=='time'&&Array.isArray(samples))hourly[name]=samples.map(value=>finite(value)?value:null);
 }
 let timezone:string|undefined;
 if(typeof raw.timezone==='string'){try{new Intl.DateTimeFormat('en',{timeZone:raw.timezone});timezone=raw.timezone}catch{}}
 return {hourly,timezone};
}

export function forecastHourIndex(times:number[]|undefined,date:Date){
 const instant=+date/1000;
 return Array.isArray(times)?times.findIndex(time=>finite(time)&&time<=instant&&instant<time+3600):-1;
}

export function weatherHours(hourly:HourlyForecast|undefined,date:Date|null,place:Place){
 if(!Array.isArray(hourly?.time)||!date)return [];
 const index=forecastHourIndex(hourly.time,date);
 if(index<0)return [];
 const start=hourly.time[index];
 return hourly.time.map((time,index)=>({time,index})).filter(({time})=>finite(time)&&Number.isFinite(+new Date(time*1000))&&time>=start).sort((a,b)=>a.time-b.time).slice(0,12).map(({time,index})=>{
  const at=new Date(time*1000);
  const value=(field:string)=>{const raw=hourly[field]?.[index];return finite(raw)?raw:null};
  const rawCloud=value('cloud_cover'),cloud=rawCloud!==null&&rawCloud>=0&&rawCloud<=100?rawCloud:null;
  return {date:at,cloud,temp:value('temperature_2m'),humidity:value('relative_humidity_2m'),wind:value('wind_speed_10m'),score:cloud===null?null:scoreAt(cloud,at,place)};
 });
}
