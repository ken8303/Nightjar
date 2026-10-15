'use client';
import {useEffect,useState} from 'react';
import {readViewingModeChange,viewingModeKey as key} from '@/lib/viewing-mode';

const changeEvent='nightjar-viewing-mode-change';
function currentMode(){
 try{const current=document.documentElement.dataset.redLight;if(current)return current==='on';return localStorage.getItem(key)==='on'}catch{return false}
}
export default function ViewingMode({inline=false}:{inline?:boolean}){
 const [enabled,setEnabled]=useState(currentMode);
 const [storageError,setStorageError]=useState(false);
 useEffect(()=>{
  const initial=currentMode();document.documentElement.dataset.redLight=initial?'on':'off';
  const sync=(event:StorageEvent)=>{const value=readViewingModeChange(event);if(value===null)return;setEnabled(value);setStorageError(false);document.documentElement.dataset.redLight=value?'on':'off'};
  const syncCurrent=(event:Event)=>{
   setEnabled(document.documentElement.dataset.redLight==='on');
   const saved=(event as CustomEvent<{saved?:unknown}>).detail?.saved;
   if(typeof saved==='boolean')setStorageError(!saved);
  };
  window.addEventListener('storage',sync);window.addEventListener(changeEvent,syncCurrent);
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener(changeEvent,syncCurrent)};
 },[]);
 function toggle(){
  const value=!enabled;setEnabled(value);document.documentElement.dataset.redLight=value?'on':'off';
  let saved=false;
  try{localStorage.setItem(key,value?'on':'off');saved=true}catch{}
  setStorageError(!saved);
  window.dispatchEvent(new CustomEvent(changeEvent,{detail:{saved}}));
 }
 return <div className={`viewing-mode${inline?' viewing-mode-inline':''}`}><button className="button" aria-pressed={enabled} onClick={toggle}>Red light: {enabled?'on':'off'}</button>{enabled&&<p role="status">Red-light display enabled. Lower your device brightness too. Browser controls and other apps are unaffected.</p>}{storageError&&<p role="status">This preference could not be saved; it will apply for this visit.</p>}</div>;
}
