"use client";
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {createPendingEdits} from '@/lib/pending-edits';
export const pendingEdits=createPendingEdits();
const serverSnapshot=()=>'';
export function usePendingEdits(section?:string){const snapshot=useCallback(()=>pendingEdits.snapshot(section),[section]);return useSyncExternalStore(pendingEdits.subscribe,snapshot,serverSnapshot)}
export function usePendingEditReporter(section:string,label:string,retainedAcrossSections=false){
 const [owner]=useState(()=>Symbol(label)),dirty=useRef(false);
 const report=useCallback((pending:boolean)=>{dirty.current=pending;pendingEdits.change(owner,pending?{section,label,retainedAcrossSections}:null)},[owner,section,label,retainedAcrossSections]);
 useEffect(()=>{report(dirty.current);return()=>pendingEdits.change(owner,null)},[report,owner]);
 return report;
}
