type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Options={hidden:()=>boolean;intervalMs?:number;schedule?:(tick:()=>void,interval:number)=>()=>void};

// Background planning does not need to recalculate; refresh before resuming
// the foreground cadence so old recommendations expire on return.
export function watchPlanningClock(events:Events,update:()=>void,options:Options){
 let cancel:(()=>void)|null=null,disposed=false;
 const schedule=options.schedule??((tick,interval)=>{const timer=setInterval(tick,interval);return()=>clearInterval(timer)});
 const tick=()=>{if(!disposed&&!options.hidden())update()};
 const changed=()=>{
  cancel?.();cancel=null;
  if(disposed||options.hidden())return;
  update();if(!disposed&&!options.hidden())cancel=schedule(tick,options.intervalMs??30000);
 };
 events.addEventListener('visibilitychange',changed);
 if(!options.hidden())cancel=schedule(tick,options.intervalMs??30000);
 return()=>{disposed=true;cancel?.();cancel=null;events.removeEventListener('visibilitychange',changed)};
}
