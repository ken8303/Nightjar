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
  const data=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
  if(!response.ok)throw Error(typeof data.error==='string'?data.error.slice(0,300):'Location search is unavailable. Try again or enter coordinates.');
  if(signal.aborted)throw new DOMException('Location search cancelled.','AbortError');
  if(timedOut)throw Error('Location search timed out. Try again or enter coordinates.');
  return Array.isArray(data.results)?data.results.filter((value):value is LocationResult=>validPlace(value)&&'id' in value&&typeof value.id==='number'&&Number.isFinite(value.id)&&(!('admin1' in value)||value.admin1===undefined||typeof value.admin1==='string')).slice(0,6):[];
 }catch(error){
  if(signal.aborted)throw new DOMException('Location search cancelled.','AbortError');
  if(timedOut)throw Error('Location search timed out. Try again or enter coordinates.');
  if(error instanceof SyntaxError)throw Error('Location search returned an unreadable response. Try again or enter coordinates.');
  throw error;
 }finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel)}
}
