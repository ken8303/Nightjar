type Worker=Pick<ServiceWorker,'state'|'postMessage'>;
type Options={preserve:()=>boolean|void;reload:()=>void;onFailure:(message:string)=>void;timeoutMs?:number;canReload?:()=>boolean};
// Listen before messaging: activation can finish immediately in some browsers.
export function applyPwaUpdate(worker:Worker,controller:EventTarget,options:Options){
 let finished=false;
 let timer:ReturnType<typeof setTimeout>|undefined=undefined;
 function cleanup(){finished=true;controller.removeEventListener('controllerchange',activated);if(timer!==undefined)clearTimeout(timer)}
 function fail(message:string){if(finished)return;cleanup();options.onFailure(message)}
 function activated(){if(finished)return;if(options.canReload&&!options.canReload()){fail('The new version is ready, but reload was paused because edits could not be saved. Keep this view open and save or copy your text first.');return}try{if(options.preserve()===false){fail('The new version is ready, but reload was paused because your observing time could not be preserved. Keep Nightjar open, restore browser storage access and try again.');return}}catch{fail('The new version is ready, but your observing time could not be preserved. Keep Nightjar open and try again.');return}cleanup();options.reload()}
 if(options.canReload&&!options.canReload()){fail('Save or copy your unsaved text before updating Nightjar.');return cleanup}
 if(worker.state!=='installed'){fail('This update is no longer waiting. Reload Nightjar to check again.');return cleanup}
 controller.addEventListener('controllerchange',activated);
 timer=setTimeout(()=>fail('The update did not finish. Reconnect and try again, or reload Nightjar.'),options.timeoutMs??15000);
 try{if(options.preserve()===false){fail('Your observing time could not be preserved. Keep Nightjar open, restore browser storage access and try again.');return cleanup}worker.postMessage({type:'SKIP_WAITING'})}
 catch{fail('The update could not start. Reconnect and try again, or reload Nightjar.')}
 return cleanup;
}
