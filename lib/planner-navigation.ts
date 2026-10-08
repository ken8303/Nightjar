import {type Place} from './sky';
export type PlannerNavigationIntent={kind:'section';section:string}|{kind:'context';section:string;place:Place;date?:Date;deepTarget?:string;persist?:boolean};
const snapshot=(intent:PlannerNavigationIntent):PlannerNavigationIntent=>intent.kind==='section'?{...intent}:{...intent,place:{...intent.place},...(intent.date?{date:new Date(+intent.date)}:{})};
// Only an explicit continuation applies a blocked site/time/catalogue request.
export function createPlannerNavigation({onPending}:{onPending:(intent:PlannerNavigationIntent|null)=>void}){
 let queued:PlannerNavigationIntent|null=null;
 const clear=()=>{queued=null;onPending(null)};
 return {
  request(intent:PlannerNavigationIntent,blocked:boolean,apply:(intent:PlannerNavigationIntent)=>void){const next=snapshot(intent);if(blocked){queued=next;onPending(next);return false}clear();apply(next);return true},
  cancel:clear,
  continue(apply:(intent:PlannerNavigationIntent)=>void){if(!queued)return false;const next=queued;clear();apply(next);return true},
 };
}
