import {parseAurora} from '@/lib/aurora';
let cached:{expires:number;data:ReturnType<typeof parseAurora>}|undefined;
export async function GET(){
 if(cached&&cached.expires>Date.now())return Response.json(cached.data,{headers:{'Cache-Control':'public, max-age=300'}});
 try{const r=await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const data=parseAurora(await r.json());cached={expires:Date.now()+300000,data};return Response.json(data,{headers:{'Cache-Control':'public, max-age=300'}})}catch{return Response.json({error:'NOAA’s aurora feed is temporarily unavailable. Try again shortly.'},{status:502})}
}
