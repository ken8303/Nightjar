// Best-effort per-isolate cache and coalescing. Cloudflare isolates do not
// share this state, so this is not an account-wide rate limiter.
const cache=new Map<string,{expires:number;value:unknown}>();
const pending=new Map<string,Promise<unknown>>();
export async function cachedMapRequest<T>(key:string,ttl:number,load:()=>Promise<T>):Promise<T>{
 const found=cache.get(key);if(found&&found.expires>Date.now())return found.value as T;if(found)cache.delete(key);
 let task=pending.get(key) as Promise<T>|undefined;
 if(!task){if(pending.size>=8)throw Error('Map requests are busy');task=load();pending.set(key,task)}
 try{const value=await task;if(cache.size>=64&&!cache.has(key))cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+ttl,value});return value}
 finally{if(pending.get(key)===task)pending.delete(key)}
}
