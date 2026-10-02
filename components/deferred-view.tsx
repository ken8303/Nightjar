"use client";

import {Component, Suspense, type ReactNode} from 'react';
import {reloadPlanner} from '@/lib/reload-planner';

type Props={name:string;children:ReactNode};

class ViewBoundary extends Component<Props,{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){
  if(this.state.failed)return <section className="panel view-unavailable" role="alert">
   <h3>{this.props.name} is unavailable</h3>
   <p>If your connection dropped, reconnect and reload Nightjar. You can still use the other tabs.</p>
   <button type="button" className="button" onClick={reloadPlanner}>Reload Nightjar</button>
  </section>;
  return this.props.children;
 }
}

export default function DeferredView({name,children}:Props){
 return <ViewBoundary name={name}><Suspense fallback={<div className="panel tab-loading" role="status">Loading {name.toLowerCase()}…</div>}>{children}</Suspense></ViewBoundary>;
}
