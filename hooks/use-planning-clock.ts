'use client';
import {useSyncExternalStore} from 'react';

function subscribe(update:()=>void){
 const timer=setInterval(update,30000);
 document.addEventListener('visibilitychange',update);
 return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update)};
}
const snapshot=()=>Math.floor(Date.now()/60000)*60000;
const serverSnapshot=()=>0;
// Expire recommendations each minute and when returning to a backgrounded app.
export function usePlanningClock(){return useSyncExternalStore(subscribe,snapshot,serverSnapshot)}
