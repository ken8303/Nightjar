import {issCatalogueNumber,parseOrbitElements,parseSatelliteFeed,satelliteRefreshMs,satelliteSource,parseOrbitalEpoch,satelliteEpochWindowMs,type OrbitElements} from './satellite-elements';
export const satelliteCacheKey='iss-feed-v1';
export type SatelliteCacheState={version:1;attemptedAt:number;nextAttemptAt:number;elements:OrbitElements|null;fetchedAt:string|null;halted:boolean;issue:string};
type Store={get<T=unknown>(key:string):Promise<T|undefined>;put(key:string,value:unknown):Promise<void>};
function readState(raw:unknown):SatelliteCacheState|null{
 if(raw===undefined)return null;
 if(!raw||typeof raw!=='object')throw Error('The shared orbital cache requires investigation.');
 const value=raw as SatelliteCacheState;
 if(value.version!==1||!Number.isSafeInteger(value.attemptedAt)||value.attemptedAt<=0||value.nextAttemptAt!==value.attemptedAt+satelliteRefreshMs||typeof value.halted!=='boolean'||typeof value.issue!=='string'||value.issue.length>300)throw Error('The shared orbital cache requires investigation.');
 if(value.elements!==null){parseSatelliteFeed({version:1,elements:value.elements,fetchedAt:value.fetchedAt,nextRefreshAt:new Date(value.nextAttemptAt).toISOString(),refreshPaused:value.halted,issue:value.issue})}
 else if(value.fetchedAt!==null)throw Error('The shared orbital cache requires investigation.');
 return value;
}
async function readBody(response:Response,signal:AbortSignal){
 if(!response.body)throw Error('The provider returned no orbital data.');
 const reader=response.body.getReader(),parts:Uint8Array[]=[];let size=0;
 const abort=()=>{void reader.cancel().catch(()=>{})};signal.addEventListener('abort',abort,{once:true});
 try{signal.throwIfAborted();while(true){const {done,value}=await reader.read();signal.throwIfAborted();if(done)break;size+=value.byteLength;if(size>16384)throw Error('The orbital response exceeds its size limit.');parts.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}
 finally{signal.removeEventListener('abort',abort);await reader.cancel().catch(()=>{});reader.releaseLock()}
}
// One instance belongs to one named Durable Object, shared across observers.
// Persist a halted fence BEFORE contacting the provider. Crashes or failed
// post-response writes cannot turn an unknown HTTP result into an automatic retry.
export class SatelliteFeedCache{
 private pending:Promise<Response>|null=null;
 constructor(private storage:Store,private fetcher:typeof fetch=(input,init)=>fetch(input,init),private clock:()=>number=Date.now,private timeoutMs=12000){}
 async read(){
  if(!this.pending)this.pending=this.refresh().finally(()=>{this.pending=null});
  // Each request needs its own body; never reuse a consumed Response.
  return (await this.pending).clone();
 }
 private response(state:SatelliteCacheState){
  const metadata={version:1,source:satelliteSource,nextRefreshAt:new Date(state.nextAttemptAt).toISOString(),refreshPaused:state.halted,issue:state.issue};
  return Response.json(state.elements?{...metadata,elements:state.elements,fetchedAt:state.fetchedAt}:{...metadata,error:state.issue||'Satellite orbital data is unavailable.'},{status:state.elements?200:503,headers:{'Cache-Control':'no-store'}});
 }
 private async refresh(){
  let state:SatelliteCacheState|null;
  try{state=readState(await this.storage.get(satelliteCacheKey))}catch{return Response.json({error:'The shared orbital cache could not be read. Automatic refresh is paused for investigation.'},{status:503,headers:{'Cache-Control':'no-store'}})}
  const now=this.clock();
  if(!Number.isSafeInteger(now)||now<=0||!Number.isFinite(+new Date(now+satelliteRefreshMs))||state&&now<state.attemptedAt)return Response.json({error:'The orbital cache clock requires investigation.'},{status:503,headers:{'Cache-Control':'no-store'}});
  if(state&&(state.halted||now<state.nextAttemptAt))return this.response(state);
  const fenced:SatelliteCacheState={version:1,attemptedAt:now,nextAttemptAt:now+satelliteRefreshMs,elements:state?.elements??null,fetchedAt:state?.fetchedAt??null,halted:true,issue:'The last orbital refresh did not complete. Automatic refresh is paused for investigation.'};
  try{await this.storage.put(satelliteCacheKey,fenced)}catch{return Response.json({error:'The orbital refresh could not be coordinated. No provider request was made.'},{status:503,headers:{'Cache-Control':'no-store'}})}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.timeoutMs);
  let next=fenced,receivedResponse=false;
  try{
   const response=await this.fetcher(satelliteSource,{signal:controller.signal,redirect:'manual',headers:{Accept:'application/json'}});receivedResponse=true;
   if(response.status!==200){await response.body?.cancel().catch(()=>{});next={...fenced,issue:`Orbital provider returned HTTP ${response.status}. Automatic refresh is paused for investigation.`}}
   else{
    const raw:unknown=JSON.parse(await readBody(response,controller.signal));
    if(!Array.isArray(raw)||raw.length!==1)throw Error('The orbital provider did not return one ISS record.');
    const elements=parseOrbitElements(raw[0],issCatalogueNumber);
    const completedAt=this.clock(),epoch=parseOrbitalEpoch(elements.EPOCH);
    if(!Number.isSafeInteger(completedAt)||completedAt<now||completedAt>=fenced.nextAttemptAt||!epoch||Math.abs(completedAt-+epoch)>satelliteEpochWindowMs)throw Error('The orbital epoch or source clock requires investigation.');
    next={...fenced,elements,fetchedAt:new Date(completedAt).toISOString(),halted:false,issue:''};
   }
  }catch{next={...fenced,halted:receivedResponse,issue:receivedResponse?'Orbital provider data could not be validated. Automatic refresh is paused for investigation.':'The orbital provider could not be reached. Refresh is paused until the next two-hour window.'}}
  finally{clearTimeout(timer)}
  try{await this.storage.put(satelliteCacheKey,next)}catch{return Response.json({error:'Orbital data could not be saved. Automatic refresh is paused for investigation.'},{status:503,headers:{'Cache-Control':'no-store'}})}
  return this.response(next);
 }
}
