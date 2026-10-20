import {parseWeatherForecast} from '@/lib/weather-hours';
import {requestCoordinates} from '@/lib/request-coordinates';

// Share simultaneous reads in this server instance, without retaining forecasts
// or merging nearby sites. Bound tracked requests if many distinct sites arrive.
const loading=new Map<string,Promise<unknown>>();
const maximumSharedRequests=32;
async function load(latitude:number,longitude:number){
 const response=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,cloud_cover_low,cloud_cover_mid,cloud_cover_high,dew_point_2m,visibility&timezone=auto&timeformat=unixtime&forecast_days=7`,{signal:AbortSignal.timeout(12000)});
 if(!response.ok){void response.body?.cancel().catch(()=>{});throw Error('Weather provider unavailable')}
 const data:unknown=await response.json();
 parseWeatherForecast(data);return data;
}
export async function GET(request:Request){
 const coordinates=requestCoordinates(new URL(request.url).searchParams);
 if(!coordinates)return Response.json({error:'Invalid coordinates'},{status:400});
 const {latitude,longitude}=coordinates;
 const key=`${latitude},${longitude}`;
 const pending=loading.get(key)??load(latitude,longitude);
 if(!loading.has(key)&&loading.size<maximumSharedRequests)loading.set(key,pending);
 try{
  return Response.json(await pending,{headers:{'Cache-Control':'public, max-age=900'}});
 }catch{
  return Response.json({error:'Weather is temporarily unavailable. Please try again.'},{status:502});
 }finally{
  // Only this promise may retire its slot; failures never pin later retries.
  if(loading.get(key)===pending)loading.delete(key);
 }
}
