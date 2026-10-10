'use client';
import {useSyncExternalStore} from 'react';
import {watchPlanningClock} from '@/lib/planning-clock';

function subscribe(update:()=>void){
 return watchPlanningClock(document,update,{hidden:()=>document.hidden});
}
const snapshot=()=>Math.floor(Date.now()/60000)*60000;
const serverSnapshot=()=>0;
// Expire recommendations each minute and when returning to a backgrounded app.
export function usePlanningClock(){return useSyncExternalStore(subscribe,snapshot,serverSnapshot)}
