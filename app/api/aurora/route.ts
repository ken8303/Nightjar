import {parseAurora} from '@/lib/aurora';
type CachedAurora={expires:number;data:ReturnType<typeof parseAurora>};
let cached:CachedAurora|undefined;
let loading:Promise<CachedAurora>|undefined;
async function load(){
 const response=await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error();
 const data=parseAurora(await response.json());cached={expires:Date.now()+300000,data};return cached;
}
function respond(entry:CachedAurora){
 // HTTP caches receive only the remaining lifetime of this provider read,
 // rather than another five minutes on every in-memory cache hit.
 const maxAge=Math.max(0,Math.min(300,Math.floor((entry.expires-Date.now())/1000)));
 return Response.json(entry.data,{headers:{'Cache-Control':`public, max-age=${maxAge}`}});
}
export async function GET(){
 if(cached&&cached.expires>Date.now())return respond(cached);
 const request=loading??=load();
 try{return respond(await request)}
 catch{return Response.json({error:'NOAA’s aurora feed is temporarily unavailable. Try again shortly.'},{status:502})}
 // A failed shared read must not pin future callers to its rejection. A late
 // caller finishing that read must not clear a newer request's ownership.
 finally{if(loading===request)loading=undefined}
}
