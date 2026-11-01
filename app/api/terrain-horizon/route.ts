import {cachedMapRequest} from '@/lib/map-request-cache';
import {requestCoordinates} from '@/lib/request-coordinates';
import {calculateTerrainHorizon,terrainSamplePoints} from '@/lib/terrain-horizon';
export async function GET(request:Request){
 const site=requestCoordinates(new URL(request.url).searchParams);
 if(!site)return Response.json({error:'Invalid coordinates'},{status:400,headers:{'Cache-Control':'no-store'}});
 try{
  const data=await cachedMapRequest(`terrain:${site.latitude}:${site.longitude}`,86400000,async()=>{
  const points=terrainSamplePoints(site.latitude,site.longitude);
  const params=new URLSearchParams({latitude:points.map(p=>p.latitude.toFixed(6)).join(','),longitude:points.map(p=>p.longitude.toFixed(6)).join(',')});
  const response=await fetch(`https://api.open-meteo.com/v1/elevation?${params}`,{signal:AbortSignal.timeout(12000)});
  if(!response.ok){void response.body?.cancel().catch(()=>{});throw Error('Unavailable')}
  const raw=await response.json() as {elevation?:unknown};
  return {latitude:site.latitude,longitude:site.longitude,heights:calculateTerrainHorizon(raw.elevation),calculatedAt:new Date().toISOString()};
  });
  return Response.json(data,{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Terrain horizon is temporarily unavailable'},{status:502,headers:{'Cache-Control':'no-store'}})}
}
