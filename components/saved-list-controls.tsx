"use client";
import {useRef} from 'react';
export const savedListPageSize=20;
export default function SavedListControls({count,shown,onChange,label,listId}:{count:number;shown:number;onChange:(value:number)=>void;label:string;listId:string}){
 const more=useRef<HTMLButtonElement>(null),fewer=useRef<HTMLButtonElement>(null);
 if(count<=savedListPageSize)return null;
 const visible=Math.min(count,shown),remaining=count-visible;
 return <div className="saved-list-controls"><p role="status">Showing {visible} of {count} {label}.</p><div className="button-row">{remaining>0&&<button ref={more} type="button" className="button" aria-controls={listId} onClick={()=>{onChange(Math.min(count,visible+savedListPageSize));requestAnimationFrame(()=>{const target=document.getElementById(listId)?.children.item(visible)?.querySelector<HTMLButtonElement>('button');if(target&&!target.disabled)target.focus();else (more.current??fewer.current)?.focus()})}}>Show next {Math.min(remaining,savedListPageSize)} {label}</button>}{visible>savedListPageSize&&<button ref={fewer} type="button" className="button" aria-controls={listId} onClick={()=>{onChange(savedListPageSize);requestAnimationFrame(()=>more.current?.focus())}}>Show fewer {label}</button>}</div></div>;
}
