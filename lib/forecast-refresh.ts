import {watchPlanningClock} from './planning-clock';
type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Options={hidden:()=>boolean;online:()=>boolean;attemptedAt:()=>number;now:()=>number;maxAge?:number;schedule?:(tick:()=>void,interval:number)=>()=>void};
// A reconnect can occur during suspension. Remember it for the next visible
// return, sharing the same throttle as ordinary foreground refreshes.
export function watchForecastRefresh(refresh:()=>void,page:Events,visibility:Events,options:Options){
 let stopped=false,pageHidden=false,reconnected=false,reconnectAttempt=0;
 const check=()=>{
  if(stopped||pageHidden||options.hidden()||!options.online())return;
  const attempted=options.attemptedAt();
  if(reconnected&&attempted!==reconnectAttempt)reconnected=false;
  const age=options.now()-attempted;
  if(age<0||age>=(reconnected?1000:options.maxAge??15*60*1000)){reconnected=false;refresh()}
 };
 const hide=()=>{pageHidden=true};
 const show=()=>{pageHidden=false};
 // Clear the suspension flag before the planning clock's pageshow check.
 page.addEventListener('pagehide',hide);page.addEventListener('pageshow',show);
 const stopClock=watchPlanningClock(visibility,check,{hidden:options.hidden,pageEvents:page,schedule:options.schedule});
 const online=()=>{if(!stopped){reconnected=true;reconnectAttempt=options.attemptedAt();check()}};page.addEventListener('online',online);
 return()=>{stopped=true;stopClock();page.removeEventListener('online',online);page.removeEventListener('pagehide',hide);page.removeEventListener('pageshow',show)};
}
