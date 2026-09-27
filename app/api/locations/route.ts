export async function GET(request:Request){
 const q=new URL(request.url).searchParams.get('q')?.trim();if(!q||q.length<2||q.length>100)return Response.json({results:[]});
 try{const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();return Response.json(await r.json())}catch{return Response.json({error:'Location search is unavailable. Try your device location or coordinates.'},{status:502})}
}
