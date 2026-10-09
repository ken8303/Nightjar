"use client";

import {Component, Suspense, type ReactNode,useState} from 'react';
import {pendingEdits,usePendingEdits} from '@/hooks/use-pending-edits';
import TimeEditRecovery from '@/components/time-edit-recovery';
import {reloadPlanner} from '@/lib/reload-planner';

type Props={name:string;children:ReactNode};

function ViewRecovery(){
 const pendingText=usePendingEdits(),[reloadError,setReloadError]=useState('');
 return <>{pendingText&&<p>Reload is paused while {pendingText} remain unsaved. Finish or cancel time edits; save or copy other unfinished changes before reloading.</p>}<TimeEditRecovery/><button type="button" className="button" disabled={Boolean(pendingText)} onClick={()=>{if(!pendingEdits.snapshot()&&!reloadPlanner())setReloadError('Your observing site and time could not be preserved. Keep Nightjar open, restore browser storage access and try again.')}}>Reload Nightjar</button>{reloadError&&<p role="status">{reloadError}</p>}</>;
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
 return <ViewBoundary name={name}><Suspense fallback={fallback??<div className="panel tab-loading" role="status">Loading {name.toLowerCase()}…</div>}>{children}</Suspense></ViewBoundary>;
}
