'use client';
import {useEffect,useRef,useState,type MouseEvent} from 'react';
import {Camera} from 'lucide-react';

import {skyShortcutSections as sections} from '@/lib/sky-shortcuts';
export default function SkyShortcuts({onCamera}:{onCamera:(launcher:HTMLButtonElement)=>void}){
 const pending=useRef<(()=>void)|null>(null);
 const [status,setStatus]=useState('');
 useEffect(()=>()=>pending.current?.(),[]);
 function navigate(event:MouseEvent<HTMLAnchorElement>,id:string,label:string){
  // Preserve normal modified-click and new-tab browser behaviour.
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  pending.current?.();pending.current=null;setStatus('');
  if(document.getElementById(id))return;
  event.preventDefault();const launcher=event.currentTarget;setStatus(`Waiting for ${label.toLowerCase()} to load…`);
  const observer=new MutationObserver(find);
  const timeout=setTimeout(()=>{stop();setStatus(`${label} has not loaded. Check your connection and try the shortcut again, or use the section's reload control.`)},15000);
  function stop(){observer.disconnect();clearTimeout(timeout);pending.current=null}
  function find(){
   const section=document.getElementById(id);if(!section)return;
   stop();setStatus('');
   // A later action takes priority over the earlier deferred jump.
   if(document.activeElement!==launcher)return;
   history.pushState(history.state,'',`#${id}`);
   section.focus({preventScroll:true});section.scrollIntoView({block:'start',behavior:'instant'});
  }
  pending.current=stop;observer.observe(document.getElementById('main-content')??document.body,{childList:true,subtree:true});find();
 }
 return <><nav className="sky-shortcuts" aria-label="Sky atlas shortcuts"><button className="button primary" onClick={event=>{pending.current?.();pending.current=null;setStatus('');onCamera(event.currentTarget)}}><Camera size={18}/>Open camera</button>{sections.map(([id,label])=><a className="button" key={id} href={`#${id}`} onClick={event=>navigate(event,id,label)}>{label}</a>)}</nav>{status&&<p className="muted sky-shortcut-status" role="status">{status}</p>}</>;
}
