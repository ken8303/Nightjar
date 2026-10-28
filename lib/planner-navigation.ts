import {forecastFreshness} from './forecast-freshness';
import {type Place} from './sky';
import {satelliteFreshnessIssue,type SatelliteFreshness} from './satellite-validity';
export type PlannerTimeTarget={catalogue:'deep'|'bright';id:string};
export type PlannerNavigationIntent=({kind:'section';section:string}|{kind:'sky-anchor';section:'sky';anchor:{id:string;label:string}}|{kind:'time';section:string;date:Date;target?:PlannerTimeTarget}|{kind:'context';section:string;place:Place;date?:Date;deepTarget?:string;persist?:boolean}|{kind:'imaging';section:'tools';target:{id:string;ra:number;dec:number}})&{forecastFetchedAt?:number;forecastMayHaveStarted?:boolean;comparisonFetchedAt?:number[];satelliteFreshness?:SatelliteFreshness};
const snapshotIntent=(intent:PlannerNavigationIntent):PlannerNavigationIntent=>intent.kind==='section'?{...intent}:intent.kind==='sky-anchor'?{...intent,anchor:{...intent.anchor}}:intent.kind==='time'?{...intent,date:new Date(+intent.date),...(intent.target?{target:{...intent.target}}:{})}:intent.kind==='imaging'?{...intent,target:{...intent.target}}:{...intent,place:{...intent.place},...(intent.date?{date:new Date(+intent.date)}:{})};
const snapshot=(intent:PlannerNavigationIntent):PlannerNavigationIntent=>({...snapshotIntent(intent),...(intent.comparisonFetchedAt?{comparisonFetchedAt:[...intent.comparisonFetchedAt]}:{}),...(intent.satelliteFreshness?{satelliteFreshness:{...intent.satelliteFreshness}}:{})});
// Only an explicit continuation applies a blocked site/time/catalogue request.
export function createPlannerNavigation({onPending}:{onPending:(intent:PlannerNavigationIntent|null)=>void}){
 let queued:PlannerNavigationIntent|null=null;
 const clear=()=>{queued=null;onPending(null)};
 return {
  request(intent:PlannerNavigationIntent,blocked:boolean,apply:(intent:PlannerNavigationIntent)=>void){const next=snapshot(intent);if(blocked){queued=next;onPending(next);return false}clear();apply(next);return true},
  cancel:clear,
  continue(apply:(intent:PlannerNavigationIntent)=>void,now=Date.now()){if(!queued)return false;const next=queued;clear();
   if(next.satelliteFreshness&&(next.kind!=='time'||satelliteFreshnessIssue(next.satelliteFreshness,next.date,now)))return false;
   if(next.comparisonFetchedAt!==undefined&&(!Number.isFinite(now)||!next.comparisonFetchedAt.length||next.comparisonFetchedAt.some(fetched=>{
    const freshness=forecastFreshness(fetched,now);return !Number.isFinite(fetched)||freshness.stale||freshness.clockChanged;
   })))return false;
   if(next.forecastFetchedAt!==undefined){
    const freshness=forecastFreshness(next.forecastFetchedAt,now),date=next.kind==='time'||next.kind==='context'?next.date:undefined;
    if(!Number.isFinite(next.forecastFetchedAt)||!Number.isFinite(now)||!date||!Number.isFinite(+date)||(!next.forecastMayHaveStarted&&+date<now)||freshness.stale||freshness.clockChanged)return false;
   }
   apply(next);return true},
 };
}
