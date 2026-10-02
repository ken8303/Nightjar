'use client';
import {useEffect,useState} from 'react';

const key='nightjar-red-light';
export default function ViewingMode(){
 const [enabled,setEnabled]=useState(()=>{try{return localStorage.getItem(key)==='on'}catch{return false}});
 const [storageError,setStorageError]=useState(false);
 useEffect(()=>{
  try{document.documentElement.dataset.redLight=localStorage.getItem(key)==='on'?'on':'off'}catch{}
  const sync=(event:StorageEvent)=>{if(event.key===key){const value=event.newValue==='on';setEnabled(value);document.documentElement.dataset.redLight=value?'on':'off'}};
  window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
 },[]);
 function toggle(){
  const value=!enabled;setEnabled(value);document.documentElement.dataset.redLight=value?'on':'off';
  try{localStorage.setItem(key,value?'on':'off');setStorageError(false)}catch{setStorageError(true)}
 }
 return <div className="viewing-mode"><button className="button" aria-pressed={enabled} onClick={toggle}>Red light: {enabled?'on':'off'}</button>{enabled&&<p role="status">Red-light display enabled. Lower your device brightness too. Browser controls and other apps are unaffected.</p>}{storageError&&<p role="status">This preference could not be saved; it will apply for this visit.</p>}</div>;
}
