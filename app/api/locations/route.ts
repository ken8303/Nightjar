export async function GET(request:Request){
 const params=new URL(request.url).searchParams,q=params.get('q')?.trim();if(!q||q.length<2||q.length>100)return Response.json({results:[]});
 const language=params.get('lang')==='zh-Hant'?'zh-TW':'en';
 try{const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${language}&format=json`,{signal:AbortSignal.timeout(10000)});if(!r.ok){void r.body?.cancel().catch(()=>{});throw Error()}return Response.json(await r.json())}catch{return Response.json({error:'Location search is unavailable. Try your device location or coordinates.'},{status:502})}
}
