import {hasLightPollutionCoverage,lightPollutionAtlas,lightPollutionZone} from './light-pollution';

const side=600;
export const lightPollutionTileBytes=side*side+1;
const maxCompressedBytes=512*1024;
export type LightPollutionCell={key:string;tileX:number;tileY:number;x:number;y:number;latitude:number;longitude:number;url:string};

// Published grid: 5° tiles, 120 cells per degree, south-to-north rows.
// The +180 spelling addresses the same cell as -180.
export function lightPollutionCell(latitude:number,longitude:number):LightPollutionCell|null{
 if(!hasLightPollutionCoverage(latitude,longitude))return null;
 const east=(longitude===180?-180:longitude)+180,north=latitude+65;
 const tileX=Math.floor(east/5)+1,tileY=Math.floor(north/5)+1;
 const x=Math.min(side-1,Math.floor((east-(tileX-1)*5)*120)),y=Math.min(side-1,Math.floor((north-(tileY-1)*5)*120));
 return {key:`${tileX}:${tileY}:${x}:${y}`,tileX,tileY,x,y,latitude:-65+(tileY-1)*5+(y+.5)/120,longitude:-180+(tileX-1)*5+(x+.5)/120,url:`https://djlorenz.github.io/astronomy/binary_tiles/${lightPollutionAtlas.year}/binary_tile_${tileX}_${tileY}.dat.gz`};
}

export function decodeLightPollutionSample(bytes:Uint8Array,cell:LightPollutionCell){
 if(bytes.byteLength!==lightPollutionTileBytes||!Number.isInteger(cell.x)||!Number.isInteger(cell.y)||cell.x<0||cell.x>=side||cell.y<0||cell.y>=side)throw new Error('Invalid model data.');
 const signed=new Int8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let code=128*signed[0]+signed[1];
 for(let row=1;row<=cell.y;row++)code+=signed[side*row+1];
 for(let column=1;column<=cell.x;column++)code+=signed[side*cell.y+1+column];
 const ratio=5/195*Math.expm1(.0195*code),zone=lightPollutionZone(ratio);
 const magnitude=22-2.5*Math.log10(1+ratio);
 if(!zone||!Number.isFinite(magnitude))throw new Error('No valid brightness value in this cell.');
 return {ratio,magnitude,zone:zone.zone,color:zone.color,latitude:cell.latitude,longitude:cell.longitude};
}
export type LightPollutionSample=ReturnType<typeof decodeLightPollutionSample>;

async function boundedBytes(stream:ReadableStream<Uint8Array>,maximum:number,signal:AbortSignal){
 const reader=stream.getReader(),chunks:Uint8Array[]=[];
 let length=0;
 const abort=()=>{void reader.cancel().catch(()=>{})};
 signal.addEventListener('abort',abort,{once:true});
 try{
  signal.throwIfAborted();
  while(true){const {done,value}=await reader.read();signal.throwIfAborted();if(done)break;length+=value.byteLength;if(length>maximum)throw new Error('Model data exceeds its expected size.');chunks.push(value)}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}return bytes;
 }finally{signal.removeEventListener('abort',abort);await reader.cancel().catch(()=>{});reader.releaseLock()}
}

// Fetch only on request. No persistent/bulk cache, geocoding or inferred Bortle.
// A separate controller bounds the entire fetch + native gzip decode operation.
export async function fetchLightPollutionSample(cell:LightPollutionCell,{signal,fetcher=fetch,timeoutMs=20000}:{signal:AbortSignal;fetcher?:typeof fetch;timeoutMs?:number}){
 if(typeof DecompressionStream==='undefined')throw new Error('This browser cannot decode the model. Open the source atlas instead.');
 const controller=new AbortController();
 const abort=()=>controller.abort(signal.reason);
 signal.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(new Error('The brightness request timed out. Try again when your connection improves.')),timeoutMs);
 try{
  if(signal.aborted)abort();controller.signal.throwIfAborted();
  const response=await fetcher(cell.url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok){await response.body?.cancel().catch(()=>{});throw new Error('The model provider is unavailable. Try again later.')}
  if(!response.body)throw new Error('The provider returned no model data.');
  const compressed=await boundedBytes(response.body,maxCompressedBytes,controller.signal);
  const decoded=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const bytes=await boundedBytes(decoded,lightPollutionTileBytes,controller.signal);
  return decodeLightPollutionSample(bytes,cell);
 }catch(error){
  if(controller.signal.aborted)throw controller.signal.reason;
  if(error instanceof Error&&(/model|provider|cell|brightness/i).test(error.message))throw error;
  throw new Error('The brightness data could not be read. Reconnect and try again.');
 }finally{clearTimeout(timer);signal.removeEventListener('abort',abort)}
}
