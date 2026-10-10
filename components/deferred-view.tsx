"use client";

import {Component, Suspense, type ReactNode,useState,useEffect} from 'react';
import {pendingEdits,usePendingEdits} from '@/hooks/use-pending-edits';
import PendingEditRecovery from '@/components/pending-edit-recovery';
import {reloadPlanner} from '@/lib/reload-planner';

type Props={name:string;children:ReactNode};

function ViewLoading({name}:{name:string}){
 const [delayedName,setDelayedName]=useState<string|null>(null);
 useEffect(()=>{const timeout=setTimeout(()=>setDelayedName(name),15000);return()=>clearTimeout(timeout)},[name]);
 const delayed=delayedName===name;
 return <section className={`panel tab-loading${delayed?' view-load-delayed':''}`} role="status" aria-label={`${name} loading`}>
  {delayed?<><h3>{name} is taking longer to load</h3><p>Check your connection. You can still use the other tabs while this view loads, or reload Nightjar to try again.</p><ViewRecovery/></>:<>Loading {name.toLowerCase()}…</>}
 </section>;
}

function ViewRecovery(){
 const pendingText=usePendingEdits(),[reloadError,setReloadError]=useState('');
 return <>{pendingText&&<p>Reload is paused for unfinished edits: {pendingText}. Resolve or copy them before reloading.</p>}<PendingEditRecovery/><button type="button" className="button" disabled={Boolean(pendingText)} onClick={()=>{if(!pendingEdits.snapshot()&&!reloadPlanner())setReloadError('Your observing site and time could not be preserved. Keep Nightjar open, restore browser storage access and try again.')}}>Reload Nightjar</button>{reloadError&&<p role="status">{reloadError}</p>}</>;
}
class ViewBoundary extends Component<Props,{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){
  if(this.state.failed)return <section className="panel view-unavailable" role="alert">
   <h3>{this.props.name} is unavailable</h3>
   <p>If your connection dropped, reconnect and reload Nightjar. You can still use the other tabs.</p>
   <ViewRecovery/>
  </section>;
  return this.props.children;
 }
}

export default function DeferredView({name,children,fallback}:Props&{fallback?:ReactNode}){
 return <ViewBoundary name={name}><Suspense fallback={fallback??<ViewLoading name={name}/>}>{children}</Suspense></ViewBoundary>;
}
