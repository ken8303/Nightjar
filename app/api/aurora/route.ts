import {parseAurora} from '@/lib/aurora';
let cached:{expires:number;data:ReturnType<typeof parseAurora>}|undefined;
let loading:Promise<ReturnType<typeof parseAurora>>|undefined;
async function load(){
 const response=await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error();
 const data=parseAurora(await response.json());cached={expires:Date.now()+300000,data};return data;
}
export async function GET(){
 if(cached&&cached.expires>Date.now())return Response.json(cached.data,{headers:{'Cache-Control':'public, max-age=300'}});
 const request=loading??=load();
 try{return Response.json(await request,{headers:{'Cache-Control':'public, max-age=300'}})}
 catch{return Response.json({error:'NOAA’s aurora feed is temporarily unavailable. Try again shortly.'},{status:502})}
 // A failed shared read must not pin future callers to its rejection. A late
 // caller finishing that read must not clear a newer request's ownership.
 finally{if(loading===request)loading=undefined}
}
