import {requestCoordinates} from '@/lib/request-coordinates';
import {parseAstronomyProvider,type AstronomyForecast} from '@/lib/astronomy-forecast';

// Best-effort per-isolate request coalescing and short cache; not a global
// rate limiter across Cloudflare isolates.
const cache=new Map<string,{expires:number;data:AstronomyForecast}>();
const pending=new Map<string,Promise<AstronomyForecast>>();
const headers={'Cache-Control':'no-store'};
async function readForecast(response:Response){
 if(!response.ok){void response.body?.cancel().catch(()=>{});throw Error('Provider unavailable')}
 const reader=response.body?.getReader();if(!reader)throw Error('Missing response');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>100000){await reader.cancel();throw Error('Forecast too large')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 return parseAstronomyProvider(JSON.parse(new TextDecoder().decode(bytes)));
}
export async function GET(request:Request){
 const site=requestCoordinates(new URL(request.url).searchParams);
 if(!site)return Response.json({error:'Invalid coordinates'},{status:400,headers});
 // Do not enable until live HTTPS responses, timestamps and deployment terms
 // have been checked in an environment permitted to reach the provider.
 if(process.env.ASTRONOMY_FORECAST_VERIFIED!=='true')return Response.json({error:'Forecast provider not configured'},{status:503,headers});
 const key=`${site.latitude},${site.longitude}`,cached=cache.get(key);
 if(cached&&cached.expires>Date.now())return Response.json(cached.data,{headers});
 if(cached)cache.delete(key);
 let task=pending.get(key);
 if(!task){
  if(pending.size>=16)return Response.json({error:'Astronomy forecast is temporarily unavailable'},{status:502,headers});
  const params=new URLSearchParams({lat:String(site.latitude),lon:String(site.longitude),product:'astro',output:'json',tzshift:'0'});
  task=fetch(`https://www.7timer.info/bin/api.pl?${params}`,{signal:AbortSignal.timeout(12000)}).then(readForecast);
  pending.set(key,task);
 }
 try{
  const data=await task;
  if(cache.size>=64)cache.delete(cache.keys().next().value!);
  cache.set(key,{expires:Date.now()+300000,data});
  return Response.json(data,{headers});
 }catch{return Response.json({error:'Astronomy forecast is temporarily unavailable'},{status:502,headers})}
 finally{if(pending.get(key)===task)pending.delete(key)}
}
