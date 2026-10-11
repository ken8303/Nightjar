'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {watchForecastRefresh} from '@/lib/forecast-refresh';

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
  return watchForecastRefresh(refresh,window,document,{hidden:()=>document.visibilityState==='hidden',online:()=>navigator.onLine!==false,attemptedAt:()=>attemptedAt.current,now:Date.now,maxAge});
 },[maxAge,refresh]);
 return {revision,refresh};
}
