import {validPlace} from './planner-state';
import {type Place} from './sky';
export type LocationResult=Place&{id:number;admin1?:string};
export async function searchLocations(query:string,{signal,fetcher=fetch,timeoutMs=15000}:{signal:AbortSignal;fetcher?:typeof fetch;timeoutMs?:number}):Promise<LocationResult[]>{
 const text=query.trim();if(text.length<2||text.length>100)throw Error('Enter a town or city name from 2 to 100 characters.');
 if(signal.aborted)throw new DOMException('Location search cancelled.','AbortError');
 const controller=new AbortController();let timedOut=false;
 const cancel=()=>controller.abort();signal.addEventListener('abort',cancel,{once:true});
 const timeout=setTimeout(()=>{timedOut=true;controller.abort()},timeoutMs);
 try{
  const response=await fetcher(`/api/locations?q=${encodeURIComponent(text)}`,{signal:controller.signal});
  const raw:unknown=await response.json();
  const isRecord=Boolean(raw&&typeof raw==='object'&&!Array.isArray(raw));
  const data=isRecord?raw as Record<string,unknown>:{};
  const detail=[data.error,data.reason].find(value=>typeof value==='string'&&value.trim());
  const providerFailure=typeof detail==='string'?detail.trim().slice(0,300):'Location search is unavailable. Try again or enter coordinates.';
  if(!response.ok)throw Error(providerFailure);
  if(signal.aborted)throw new DOMException('Location search cancelled.','AbortError');
  if(timedOut)throw Error('Location search timed out. Try again or enter coordinates.');
  const unreadable='Location search returned an unreadable response. Try again or enter coordinates.';
  if(!isRecord||Object.hasOwn(data,'results')&&!Array.isArray(data.results))throw Error(unreadable);
  if(data.error===true||typeof data.error==='string')throw Error(providerFailure);
  if(!Array.isArray(data.results))return [];
  const seen=new Set<number>();
  const results=data.results.filter((value):value is LocationResult=>{
   if(!validPlace(value)||!('id' in value)||typeof value.id!=='number'||!Number.isSafeInteger(value.id)||value.id<0||seen.has(value.id)||'admin1' in value&&value.admin1!==undefined&&(typeof value.admin1!=='string'||value.admin1.length>=200))return false;
   seen.add(value.id);return true;
  }).slice(0,6);
  if(data.results.length&&!results.length)throw Error(unreadable);
  return results;
 }catch(error){
  if(signal.aborted)throw new DOMException('Location search cancelled.','AbortError');
  if(timedOut)throw Error('Location search timed out. Try again or enter coordinates.');
  if(error instanceof SyntaxError)throw Error('Location search returned an unreadable response. Try again or enter coordinates.');
  throw error;
 }finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel)}
}
