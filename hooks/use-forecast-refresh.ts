'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {watchPlanningClock} from '@/lib/planning-clock';

// Refresh only in the foreground. Resuming and reconnecting share the same
// throttle so mobile lifecycle events cannot issue duplicate requests.
export function useForecastRefresh(maxAge=15*60*1000){
 const [revision,setRevision]=useState(0);
 const attemptedAt=useRef(0);
 const refresh=useCallback(()=>{
  attemptedAt.current=Date.now();
  setRevision(value=>value+1);
 },[]);
 useEffect(()=>{
  attemptedAt.current=Date.now();
  const check=(reconnected=false)=>{
   if(document.visibilityState==='hidden'||navigator.onLine===false)return;
   const age=Date.now()-attemptedAt.current;
   if(age>=(reconnected?1000:maxAge))refresh();
  };
  const resume=()=>check(),online=()=>check(true);
  const stopClock=watchPlanningClock(document,resume,{hidden:()=>document.visibilityState==='hidden'});
  window.addEventListener('online',online);
  return()=>{
   stopClock();
   window.removeEventListener('online',online);
  };
 },[maxAge,refresh]);
 return {revision,refresh};
}
