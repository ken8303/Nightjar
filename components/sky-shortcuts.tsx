'use client';
import {useEffect,useRef,useState,type MouseEvent} from 'react';
import {Camera} from 'lucide-react';

import {skyShortcutSections as sections} from '@/lib/sky-shortcuts';
import {watchForegroundDelay} from '@/lib/foreground-delay';
import {useLanguage} from '@/components/language-provider';
import {skyShortcutLabel} from '@/lib/language';
export default function SkyShortcuts({onCamera}:{onCamera:(launcher:HTMLButtonElement)=>void}){
 const {language,tr}=useLanguage();
 const pending=useRef<(()=>void)|null>(null);
 const [status,setStatus]=useState('');
 useEffect(()=>()=>pending.current?.(),[]);
 function navigate(event:MouseEvent<HTMLAnchorElement>,id:string,label:string){
  // Preserve normal modified-click and new-tab browser behaviour.
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  pending.current?.();pending.current=null;setStatus('');
  if(document.getElementById(id))return;
  event.preventDefault();const launcher=event.currentTarget;launcher.focus({preventScroll:true});setStatus(tr(`Waiting for ${label.toLowerCase()} to load…`,`正在等待「${label}」載入…`));
  let active=true;const observer=new MutationObserver(find);
  const cancelDeadline=watchForegroundDelay(()=>{stop();setStatus(tr(`${label} has not loaded. Check your connection and try the shortcut again, or use the section's reload control.`,`「${label}」尚未載入。請檢查連線後重試，或使用該區域的重新載入按鈕。`))},window,document,{hidden:()=>document.hidden});
  function stop(){if(!active)return;active=false;observer.disconnect();cancelDeadline();if(pending.current===stop)pending.current=null}
  function find(){
   if(!active)return;const section=document.getElementById(id);if(!section)return;
   stop();setStatus('');
   // A later action takes priority over the earlier deferred jump.
   if(document.activeElement!==launcher)return;
   history.pushState(history.state,'',`#${id}`);
   section.focus({preventScroll:true});section.scrollIntoView({block:'start',behavior:'instant'});
  }
  pending.current=stop;observer.observe(document.getElementById('main-content')??document.body,{childList:true,subtree:true});find();
 }
 return <><nav className="sky-shortcuts" aria-label={tr('Sky atlas shortcuts','星空圖快捷方式')}><button className="button primary" onClick={event=>{pending.current?.();pending.current=null;setStatus('');onCamera(event.currentTarget)}}><Camera size={18}/>{tr('Open camera','開啟相機')}</button>{sections.map(([id,label])=>{const text=skyShortcutLabel(id,language,label);return <a className="button" key={id} href={`#${id}`} onClick={event=>navigate(event,id,text)}>{text}</a>})}</nav>{status&&<p className="muted sky-shortcut-status" role="status">{status}</p>}</>;
}
