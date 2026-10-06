import {requestCoordinates} from '@/lib/request-coordinates';
export async function GET(request:Request){
 const coordinates=requestCoordinates(new URL(request.url).searchParams);
 if(!coordinates)return Response.json({error:'Invalid coordinates'},{status:400});
 const {latitude:lat,longitude:lon}=coordinates;
 try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,cloud_cover_low,cloud_cover_mid,cloud_cover_high,dew_point_2m,visibility&timezone=auto&timeformat=unixtime&forecast_days=7`,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const d=await r.json();return Response.json(d,{headers:{'Cache-Control':'public, max-age=900'}})}catch{return Response.json({error:'Weather is temporarily unavailable. Please try again.'},{status:502})}
}
