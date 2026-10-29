import {requestCoordinates} from '@/lib/request-coordinates';
import {parseCloudModels} from '@/lib/cloud-models';

export async function GET(request:Request){
 const coordinates=requestCoordinates(new URL(request.url).searchParams);
 if(!coordinates)return Response.json({error:'Invalid coordinates'},{status:400});
 try{
  const params=new URLSearchParams({latitude:String(coordinates.latitude),longitude:String(coordinates.longitude),hourly:'cloud_cover',models:'gfs_global,icon_global,ecmwf_ifs025',timezone:'GMT',timeformat:'unixtime',forecast_days:'7'});
  const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`,{signal:AbortSignal.timeout(12000)});
  if(!response.ok){void response.body?.cancel().catch(()=>{});throw Error('Provider unavailable')}
  const data=parseCloudModels(await response.json());
  return Response.json(data,{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Cloud model comparison is temporarily unavailable. Please try again.'},{status:502,headers:{'Cache-Control':'no-store'}})}
}
