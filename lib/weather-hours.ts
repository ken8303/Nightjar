import {Place, scoreAt} from './sky';

export type HourlyForecast={time:number[];cloud_cover:(number|null)[];[field:string]:(number|null)[]};
export type WeatherForecast={hourly:HourlyForecast;timezone?:string};
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);

export function parseWeatherForecast(value:unknown):WeatherForecast{
 if(!value||typeof value!=='object')throw new Error('Forecast unavailable');
 const raw=value as Record<string,unknown>,data=raw.hourly;
 if(!data||typeof data!=='object')throw new Error(typeof raw.error==='string'?raw.error:'Forecast unavailable');
 const fields=data as Record<string,unknown>;
 const times=fields.time;
 if(!Array.isArray(times)||times.length===0||times.length>240||!times.every((time,index)=>finite(time)&&Number.isFinite(+new Date(time*1000))&&(index===0||time-times[index-1]>=3600))||times[times.length-1]-times[0]>240*3600)throw new Error('Forecast timestamps are unavailable. Please retry.');
 if(!Array.isArray(fields.cloud_cover)||fields.cloud_cover.length!==times.length)throw new Error('Forecast cloud coverage is unavailable. Please retry.');
 const hourly:HourlyForecast={time:[...times],cloud_cover:[]};
 const allowed=['cloud_cover','temperature_2m','relative_humidity_2m','wind_speed_10m','cloud_cover_low','cloud_cover_mid','cloud_cover_high','dew_point_2m','visibility'];
 for(const name of allowed){
  const samples=fields[name];
  if(samples===undefined)continue;
  if(!Array.isArray(samples)||samples.length!==times.length)throw new Error('Forecast samples do not match their timestamps. Please retry.');
  const percentage=name.startsWith('cloud_cover')||name==='relative_humidity_2m';
  const nonnegative=name==='wind_speed_10m'||name==='visibility';
  hourly[name]=samples.map(value=>finite(value)&&(!percentage||value>=0&&value<=100)&&(!nonnegative||value>=0)?value:null);
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
 const start=hourly.time[index],instant=+date/1000;
 return hourly.time.map((time,index)=>({time,index})).filter(({time})=>finite(time)&&Number.isFinite(+new Date(time*1000))&&time>=start&&time<instant+12*3600).sort((a,b)=>a.time-b.time).slice(0,13).map(({time,index})=>{
  const at=new Date(time*1000);
  const value=(field:string)=>{const raw=hourly[field]?.[index];return finite(raw)?raw:null};
  const rawCloud=value('cloud_cover'),cloud=rawCloud!==null&&rawCloud>=0&&rawCloud<=100?rawCloud:null;
  return {date:at,cloud,temp:value('temperature_2m'),humidity:value('relative_humidity_2m'),wind:value('wind_speed_10m'),score:cloud===null?null:scoreAt(cloud,at,place)};
 });
}
