export async function GET(request:Request){
 const p=new URL(request.url).searchParams,lat=Number(p.get('lat')),lon=Number(p.get('lon'));
 if(!p.has('lat')||!p.has('lon')||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return Response.json({error:'Invalid coordinates'},{status:400});
 try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m&timezone=auto&timeformat=unixtime&forecast_days=7`,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const d=await r.json();return Response.json(d,{headers:{'Cache-Control':'public, max-age=900'}})}catch{return Response.json({error:'Weather is temporarily unavailable. Please try again.'},{status:502})}
}
