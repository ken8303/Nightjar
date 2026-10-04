type Lock=Pick<WakeLockSentinel,'released'|'release'|'addEventListener'|'removeEventListener'>;
type Callbacks={onState:(state:'off'|'requesting'|'on')=>void;onError:()=>void;onReleased:()=>void};
// A late grant must never keep a closed or background viewer awake.
export function createCameraWakeLock(callbacks:Callbacks){
 let generation=0,active:Lock|null=null,removeListener=()=>{};
 const release=(lock:Lock)=>{void lock.release().catch(()=>{})};
 function stop(notify=true){
  generation++;removeListener();removeListener=()=>{};
  const lock=active;active=null;if(lock)release(lock);
  if(notify)callbacks.onState('off');
 }
 async function start(acquire:()=>Promise<Lock>,canUse=()=>true){
  stop();const request=generation;callbacks.onState('requesting');
  try{
   const lock=await acquire();
   if(request!==generation){release(lock);return 'cancelled' as const}
   if(!canUse()){release(lock);stop();return 'cancelled' as const}
   if(lock.released){stop();callbacks.onReleased();return 'released' as const}
   active=lock;
   const released=()=>{if(request!==generation||active!==lock)return;generation++;removeListener();removeListener=()=>{};active=null;callbacks.onState('off');callbacks.onReleased()};
   lock.addEventListener('release',released);removeListener=()=>lock.removeEventListener('release',released);
   callbacks.onState('on');return 'started' as const;
  }catch{
   if(request!==generation)return 'cancelled' as const;
   stop();callbacks.onError();return 'failed' as const;
  }
 }
 return {start,stop};
}
