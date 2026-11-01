import {cachedMapRequest} from '@/lib/map-request-cache';
import {isAstronomicalNight} from '@/lib/sky';
import {validObservingDate} from '@/lib/observing-time';
import {forecastHourIndex,parseWeatherForecast} from '@/lib/weather-hours';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){
 const query=new URL(request.url).searchParams;
 const number=(key:string)=>{const raw=query.get(key);return raw!==null&&raw.trim()!==''?Number(raw):NaN};
 const south=number('south'),north=number('north'),west=number('west'),east=number('east'),time=number('time'),date=new Date(time);
 if(![south,north,west,east,time].every(Number.isFinite)||south< -85||north>85||south>=north||west< -180||east>180||west>=east||!validObservingDate(date))return Response.json({error:'Invalid map request'},{status:400,headers});
 const sites:{latitude:number;longitude:number}[]=[];
 for(let y=0;y<5;y++)for(let x=0;x<5;x++){
  const latitude=south+(north-south)*(y+.5)/5,longitude=west+(east-west)*(x+.5)/5;
  if(isAstronomicalNight(date,{name:'',latitude,longitude}))sites.push({latitude,longitude});
 }
 if(!sites.length)return Response.json({time,sites:[],fetchedAt:Date.now()},{headers});
 try{
  const result=await cachedMapRequest(`cloud:${south}:${north}:${west}:${east}:${time}`,300000,async()=>{
  const params=new URLSearchParams({latitude:sites.map(p=>p.latitude.toFixed(5)).join(','),longitude:sites.map(p=>p.longitude.toFixed(5)).join(','),hourly:'cloud_cover',timeformat:'unixtime',timezone:'GMT',forecast_days:'7'});
  const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`,{signal:AbortSignal.timeout(12000)});if(!response.ok){void response.body?.cancel().catch(()=>{});throw Error('Unavailable')}
  const body:unknown=await response.json(),rows=Array.isArray(body)?body:[body];if(rows.length!==sites.length)throw Error('Incomplete forecast');
  const result=sites.map((site,index)=>{const {hourly}=parseWeatherForecast(rows[index]);const hour=forecastHourIndex(hourly.time,date);return {...site,cloud:hour<0?null:hourly.cloud_cover[hour]}});
  return {time,sites:result,fetchedAt:Date.now()};
  });
  return Response.json(result,{headers});
 }catch{return Response.json({error:'Cloud map is temporarily unavailable'},{status:502,headers})}
}
