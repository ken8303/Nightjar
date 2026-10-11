type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Options={hidden:()=>boolean;pageEvents?:Events;intervalMs?:number;schedule?:(tick:()=>void,interval:number)=>()=>void};

// Background planning does not need to recalculate; refresh before resuming
// the foreground cadence so old recommendations expire on return.
export function watchPlanningClock(events:Events,update:()=>void,options:Options){
 let cancel:(()=>void)|null=null,disposed=false,pageHidden=false,generation=0;
 const pageEvents=options.pageEvents??(typeof window==='undefined'?undefined:window);
 const schedule=options.schedule??((tick,interval)=>{const timer=setInterval(tick,interval);return()=>clearInterval(timer)});
 const hidden=()=>pageHidden||options.hidden();
 const suspend=()=>{generation++;cancel?.();cancel=null};
 const start=()=>{const current=generation;cancel=schedule(()=>{if(!disposed&&current===generation&&!hidden())update()},options.intervalMs??30000)};
 const changed=()=>{
  suspend();
  if(disposed||hidden())return;
  update();if(!disposed&&!hidden())start();
 };
 const hide=()=>{pageHidden=true;suspend()};
 const show=()=>{pageHidden=false;changed()};
 events.addEventListener('visibilitychange',changed);
 pageEvents?.addEventListener('pagehide',hide);pageEvents?.addEventListener('pageshow',show);
 if(!hidden())start();
 return()=>{disposed=true;suspend();events.removeEventListener('visibilitychange',changed);pageEvents?.removeEventListener('pagehide',hide);pageEvents?.removeEventListener('pageshow',show)};
}
