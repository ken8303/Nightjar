"use client";
import {useRef} from 'react';
export const savedListPageSize=20;
export default function SavedListControls({count,shown,onChange,label,listId}:{count:number;shown:number;onChange:(value:number)=>void;label:string;listId:string}){
 const more=useRef<HTMLButtonElement>(null),fewer=useRef<HTMLButtonElement>(null);
 const host=useRef<HTMLDivElement>(null);
 const focusRequest=useRef(0);
 const canReturnFocus=(owner:HTMLButtonElement)=>Boolean(host.current?.isConnected&&!host.current.closest('[aria-hidden="true"]')&&!document.hidden&&(document.activeElement===owner||document.activeElement===document.body));
 if(count<=savedListPageSize)return null;
 const visible=Math.min(count,shown),remaining=count-visible;
 return <div ref={host} className="saved-list-controls"><p role="status">Showing {visible} of {count} {label}.</p><div className="button-row">{remaining>0&&<button ref={more} type="button" className="button" aria-controls={listId} onClick={event=>{const owner=event.currentTarget,request=++focusRequest.current;onChange(Math.min(count,visible+savedListPageSize));requestAnimationFrame(()=>{if(request!==focusRequest.current||!canReturnFocus(owner))return;const target=document.getElementById(listId)?.children.item(visible)?.querySelector<HTMLButtonElement>('button');if(target&&!target.disabled)target.focus();else (more.current??fewer.current)?.focus()})}}>Show next {Math.min(remaining,savedListPageSize)} {label}</button>}{visible>savedListPageSize&&<button ref={fewer} type="button" className="button" aria-controls={listId} onClick={event=>{const owner=event.currentTarget,request=++focusRequest.current;onChange(savedListPageSize);requestAnimationFrame(()=>{if(request===focusRequest.current&&canReturnFocus(owner))more.current?.focus()})}}>Show fewer {label}</button>}</div></div>;
}
