"use client";
import {Component,useRef,type ReactNode,type RefObject} from 'react';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
export const savedListPageSize=20;
type RecoveryProps={count:number;listId:string;host:RefObject<HTMLDivElement|null>;more:RefObject<HTMLButtonElement|null>;fewer:RefObject<HTMLButtonElement|null>;message:RefObject<HTMLParagraphElement|null>;children:ReactNode};
// Snapshot ownership before React removes a list row or pagination button. Reading focus
// after the mutation would see BODY and lose which list owned the handoff.
class ListFocusRecovery extends Component<RecoveryProps,Record<string,never>,Element|null>{
 getSnapshotBeforeUpdate(previous:Readonly<RecoveryProps>){
  if(document.hidden||!document.hasFocus())return null;
  const host=this.props.host.current,list=document.getElementById(previous.listId),owner=document.activeElement;
  if(owner&&list&&!list.closest('[aria-hidden="true"]')&&list.contains(owner))return owner;
  if(previous.count===this.props.count)return null;
  return host&&!host.closest('[aria-hidden="true"]')&&owner&&host.contains(owner)?owner:null;
 }
 componentDidUpdate(_previous:Readonly<RecoveryProps>,_state:Readonly<Record<string,never>>,owner:Element|null){
  if(!owner||owner.isConnected)return;
  deferFocusAndScroll(()=>document.hasFocus()?(this.props.more.current??this.props.fewer.current??this.props.message.current):null,{owner});
 }
 render(){return this.props.children}
}
export default function SavedListControls({count,shown,onChange,label,listId}:{count:number;shown:number;onChange:(value:number)=>void;label:string;listId:string}){
 const more=useRef<HTMLButtonElement>(null),fewer=useRef<HTMLButtonElement>(null);
 const host=useRef<HTMLDivElement>(null),message=useRef<HTMLParagraphElement>(null);
 const focusRequest=useRef(0);
 const canReturnFocus=(owner:HTMLButtonElement)=>Boolean(host.current?.isConnected&&!host.current.closest('[aria-hidden="true"]')&&!document.hidden&&(document.activeElement===owner||document.activeElement===document.body));
 const visible=Math.min(count,shown),remaining=count-visible,condensed=count<=savedListPageSize;
 return <ListFocusRecovery count={count} listId={listId} host={host} more={more} fewer={fewer} message={message}><div ref={host} className={`saved-list-controls${condensed?' saved-list-condensed':''}`}><p ref={message} tabIndex={-1} role="status" className={condensed?'saved-list-recovery sr-only':undefined}>{condensed?(count?`Showing all ${count} ${label}.`:`No ${label} to show.`):`Showing ${visible} of ${count} ${label}.`}</p>{!condensed&&<div className="button-row">{remaining>0&&<button ref={more} type="button" className="button" aria-controls={listId} onClick={event=>{const owner=event.currentTarget,request=++focusRequest.current;onChange(Math.min(count,visible+savedListPageSize));requestAnimationFrame(()=>{if(request!==focusRequest.current||!canReturnFocus(owner))return;const target=document.getElementById(listId)?.children.item(visible)?.querySelector<HTMLButtonElement>('button');if(target&&!target.disabled)target.focus();else (more.current??fewer.current)?.focus()})}}>Show next {Math.min(remaining,savedListPageSize)} {label}</button>}{visible>savedListPageSize&&<button ref={fewer} type="button" className="button" aria-controls={listId} onClick={event=>{const owner=event.currentTarget,request=++focusRequest.current;onChange(savedListPageSize);requestAnimationFrame(()=>{if(request===focusRequest.current&&canReturnFocus(owner))more.current?.focus()})}}>Show fewer {label}</button>}</div>}</div></ListFocusRecovery>;
}
