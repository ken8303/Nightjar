'use client';
import {useEffect,useState} from 'react';

const key='nightjar-red-light',changeEvent='nightjar-viewing-mode-change';
function currentMode(){
 try{const current=document.documentElement.dataset.redLight;if(current)return current==='on';return localStorage.getItem(key)==='on'}catch{return false}
}
export default function ViewingMode({inline=false}:{inline?:boolean}){
 const [enabled,setEnabled]=useState(currentMode);
 const [storageError,setStorageError]=useState(false);
 useEffect(()=>{
  const initial=currentMode();document.documentElement.dataset.redLight=initial?'on':'off';
  const sync=(event:StorageEvent)=>{if(event.key===key||event.key===null){const value=event.newValue==='on';setEnabled(value);document.documentElement.dataset.redLight=value?'on':'off'}};
  const syncCurrent=()=>setEnabled(document.documentElement.dataset.redLight==='on');
  window.addEventListener('storage',sync);window.addEventListener(changeEvent,syncCurrent);
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener(changeEvent,syncCurrent)};
 },[]);
 function toggle(){
  const value=!enabled;setEnabled(value);document.documentElement.dataset.redLight=value?'on':'off';
  try{localStorage.setItem(key,value?'on':'off');setStorageError(false)}catch{setStorageError(true)}
  window.dispatchEvent(new Event(changeEvent));
 }
 return <div className={`viewing-mode${inline?' viewing-mode-inline':''}`}><button className="button" aria-pressed={enabled} onClick={toggle}>Red light: {enabled?'on':'off'}</button>{enabled&&<p role="status">Red-light display enabled. Lower your device brightness too. Browser controls and other apps are unaffected.</p>}{storageError&&<p role="status">This preference could not be saved; it will apply for this visit.</p>}</div>;
}
