'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {watchForecastRefresh} from '@/lib/forecast-refresh';

// Refresh only in the foreground. Resuming and reconnecting share the same
// throttle so mobile lifecycle events cannot issue duplicate requests.
// Effects triggered directly by site/selection changes must record their
// actual request start too; those acquisitions do not increment revision.
export function useForecastRefresh(maxAge=15*60*1000){
 const [revision,setRevision]=useState(0);
 const attemptedAt=useRef(0);
 const attemptedOnline=useRef(true);
 const recordAttempt=useCallback(()=>{attemptedAt.current=Date.now();attemptedOnline.current=navigator.onLine!==false},[]);
 const refresh=useCallback(()=>{
  recordAttempt();
  setRevision(value=>value+1);
 },[recordAttempt]);
 useEffect(()=>{
  recordAttempt();
  return watchForecastRefresh(refresh,window,document,{hidden:()=>document.visibilityState==='hidden',online:()=>navigator.onLine!==false,attemptedAt:()=>attemptedAt.current,attemptedOnline:()=>attemptedOnline.current,now:Date.now,maxAge});
 },[maxAge,refresh,recordAttempt]);
 return {revision,refresh,recordAttempt};
}
