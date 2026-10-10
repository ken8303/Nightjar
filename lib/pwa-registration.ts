type Registration=Pick<ServiceWorkerRegistration,'active'|'installing'|'waiting'|'addEventListener'|'removeEventListener'>;
type Callbacks={onReady:()=>void;onFailure:()=>void;onWaiting:(worker:ServiceWorker|null)=>void};

// Registration may resolve before installation or activation completes. Own
// the newest worker's listener so a superseded worker cannot undo recovery.
export function watchPwaRegistration(registration:Registration,callbacks:Callbacks){
 let disposed=false,current:ServiceWorker|null=null,removeCurrent=()=>{};
 const publishWaiting=()=>{if(!disposed)callbacks.onWaiting(registration.waiting?.state==='installed'?registration.waiting:null)};
 let inspect=publishWaiting;
 const changed=()=>{
  if(disposed)return;
  const worker=registration.installing??registration.waiting??registration.active;
  if(worker===current){inspect();return}
  removeCurrent();removeCurrent=()=>{};current=worker;
  if(!worker){inspect=publishWaiting;inspect();return}
  const read=()=>{
   if(disposed||current!==worker)return;
   if(worker.state==='activated'||registration.active?.state==='activated')callbacks.onReady();
   else if(worker.state==='redundant')callbacks.onFailure();
   publishWaiting();
  };
  inspect=read;worker.addEventListener('statechange',read);
  removeCurrent=()=>worker.removeEventListener('statechange',read);
  read();
 };
 registration.addEventListener('updatefound',changed);changed();
 return()=>{disposed=true;removeCurrent();registration.removeEventListener('updatefound',changed)};
}
