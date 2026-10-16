import {watchForegroundDelay} from './foreground-delay';
type Worker=Pick<ServiceWorker,'state'|'postMessage'>;
type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Options={preserve:()=>boolean|void;reload:()=>void;onFailure:(message:string)=>void;timeoutMs?:number;canReload?:()=>boolean;foreground?:{page:Events;visibility:Events;hidden:()=>boolean}};
// Listen before messaging: activation can finish immediately in some browsers.
export function applyPwaUpdate(worker:Worker,controller:EventTarget,options:Options){
 let finished=false;
 let stopDeadline=()=>{};
 function cleanup(){finished=true;controller.removeEventListener('controllerchange',activated);stopDeadline()}
 function fail(message:string){if(finished)return;cleanup();options.onFailure(message)}
 function activated(){if(finished)return;if(options.canReload&&!options.canReload()){fail('The new version is ready, but reload was paused because unfinished edits remain. Finish or cancel time edits; save or copy other changes first.');return}try{if(options.preserve()===false){fail('The new version is ready, but reload was paused because your observing site and time could not be preserved. Keep Nightjar open, restore browser storage access and try again.');return}}catch{fail('The new version is ready, but your observing site and time could not be preserved. Keep Nightjar open and try again.');return}cleanup();options.reload()}
 if(options.canReload&&!options.canReload()){fail('Finish or cancel time edits; save or copy your unsaved text before updating Nightjar.');return cleanup}
 if(worker.state!=='installed'){fail('This update is no longer waiting. Reload Nightjar to check again.');return cleanup}
 controller.addEventListener('controllerchange',activated);
 const timedOut=()=>fail('The update did not finish. Reconnect and try again, or reload Nightjar.');
 const foreground=options.foreground??(typeof window!=='undefined'&&typeof document!=='undefined'?{page:window,visibility:document,hidden:()=>document.hidden}:null);
 if(foreground)stopDeadline=watchForegroundDelay(timedOut,foreground.page,foreground.visibility,{hidden:foreground.hidden,delay:options.timeoutMs??15000});
 else{const timer=setTimeout(timedOut,options.timeoutMs??15000);stopDeadline=()=>clearTimeout(timer)}
 try{if(options.preserve()===false){fail('Your observing site and time could not be preserved. Keep Nightjar open, restore browser storage access and try again.');return cleanup}worker.postMessage({type:'SKIP_WAITING'})}
 catch{fail('The update could not start. Reconnect and try again, or reload Nightjar.')}
 return cleanup;
}
