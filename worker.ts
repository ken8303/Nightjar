import handler from 'vinext/server/fetch-handler';
export {SatelliteCoordinator} from './lib/satellite-coordinator';
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  const url=new URL(request.url);
  if(url.pathname==='/api/satellite'){
   if(request.method!=='GET')return Response.json({error:'Use GET for orbital data.'},{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
   if([...url.searchParams.keys()].some(key=>key!=='object')||url.searchParams.get('object')!=='25544'||url.searchParams.getAll('object').length!==1)return Response.json({error:'Only the ISS catalogue number 25544 is supported.'},{status:400,headers:{'Cache-Control':'no-store'}});
   if(!env.SATELLITE_FEED)return Response.json({error:'The shared satellite service is not configured.'},{status:503,headers:{'Cache-Control':'no-store'}});
   try{return await env.SATELLITE_FEED.get(env.SATELLITE_FEED.idFromName('iss-25544-v1')).fetch('https://orbital-cache.internal/iss')}
   catch{return Response.json({error:'The shared satellite service is unavailable. Try again later.'},{status:503,headers:{'Cache-Control':'no-store'}})}
  }
  return handler.fetch(request,env,ctx);
 }
} satisfies ExportedHandler<Cloudflare.Env>;
