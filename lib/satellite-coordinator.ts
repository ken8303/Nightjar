import {DurableObject} from 'cloudflare:workers';
import {SatelliteFeedCache} from './satellite-feed-cache';
export class SatelliteCoordinator extends DurableObject{
 private feed:SatelliteFeedCache;
 constructor(ctx:DurableObjectState,env:Cloudflare.Env){super(ctx,env);this.feed=new SatelliteFeedCache(ctx.storage)}
 async fetch(request:Request){
  if(request.method!=='GET'||new URL(request.url).pathname!=='/iss')return new Response('Not found',{status:404});
  return this.feed.read();
 }
}
