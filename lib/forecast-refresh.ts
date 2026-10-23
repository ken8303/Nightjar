import {watchPlanningClock} from './planning-clock';
type Events=Pick<EventTarget,'addEventListener'|'removeEventListener'>;
type Options={hidden:()=>boolean;online:()=>boolean;attemptedAt:()=>number;attemptedOnline?:()=>boolean;now:()=>number;maxAge?:number;schedule?:(tick:()=>void,interval:number)=>()=>void};
// A reconnect can occur during suspension. Remember it for the next visible
// return, sharing the same throttle as ordinary foreground refreshes.
export function watchForecastRefresh(refresh:()=>void,page:Events,visibility:Events,options:Options){
 let stopped=false,pageHidden=false,reconnected=false,reconnectAttempt=options.attemptedAt(),wasOnline=options.online();
 const readNetwork=()=>{
  const online=options.online();
  if(wasOnline&&!online)reconnectAttempt=options.attemptedAt();
  if(!wasOnline&&online)reconnected=true;
  wasOnline=online;return online;
 };
 const check=()=>{
  if(stopped)return;
  const connected=readNetwork();
  if(pageHidden||options.hidden()||!connected)return;
  const attempted=options.attemptedAt();
  // A request started offline cannot satisfy a later silent reconnection.
  if(reconnected&&attempted!==reconnectAttempt&&options.attemptedOnline?.()!==false)reconnected=false;
  const age=options.now()-attempted;
  if(age<0||age>=(reconnected?1000:options.maxAge??15*60*1000)){reconnected=false;refresh()}
 };
 const hide=()=>{if(stopped)return;pageHidden=true;readNetwork()};
 const show=()=>{pageHidden=false};
 // Clear the suspension flag before the planning clock's pageshow check.
 page.addEventListener('pagehide',hide);page.addEventListener('pageshow',show);
 const stopClock=watchPlanningClock(visibility,check,{hidden:options.hidden,pageEvents:page,schedule:options.schedule});
 const online=()=>{if(!stopped){reconnected=true;reconnectAttempt=options.attemptedAt();check()}};
 const offline=()=>{if(!stopped){wasOnline=false;reconnectAttempt=options.attemptedAt()}};
 page.addEventListener('online',online);page.addEventListener('offline',offline);
 return()=>{stopped=true;stopClock();page.removeEventListener('online',online);page.removeEventListener('offline',offline);page.removeEventListener('pagehide',hide);page.removeEventListener('pageshow',show)};
}
