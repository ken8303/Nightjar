type Worker=Pick<ServiceWorker,'state'|'postMessage'>;
type Options={preserve:()=>void;reload:()=>void;onFailure:(message:string)=>void;timeoutMs?:number};
// Listen before messaging: activation can finish immediately in some browsers.
export function applyPwaUpdate(worker:Worker,controller:EventTarget,options:Options){
 let finished=false;
 let timer:ReturnType<typeof setTimeout>|undefined=undefined;
 function cleanup(){finished=true;controller.removeEventListener('controllerchange',activated);if(timer!==undefined)clearTimeout(timer)}
 function fail(message:string){if(finished)return;cleanup();options.onFailure(message)}
 function activated(){if(finished)return;cleanup();options.reload()}
 if(worker.state!=='installed'){fail('This update is no longer waiting. Reload Nightjar to check again.');return cleanup}
 controller.addEventListener('controllerchange',activated);
 timer=setTimeout(()=>fail('The update did not finish. Reconnect and try again, or reload Nightjar.'),options.timeoutMs??15000);
 try{options.preserve();worker.postMessage({type:'SKIP_WAITING'})}
 catch{fail('The update could not start. Reconnect and try again, or reload Nightjar.')}
 return cleanup;
}
