'use client';
import {useEffect,useState} from 'react';
import {readViewingModeChange,viewingModeKey as key} from '@/lib/viewing-mode';
import {useLanguage} from '@/components/language-provider';

const changeEvent='nightjar-viewing-mode-change';
function currentMode(){
 try{const current=document.documentElement.dataset.redLight;if(current)return current==='on';return localStorage.getItem(key)==='on'}catch{return false}
}
export default function ViewingMode({inline=false}:{inline?:boolean}){
 const {tr}=useLanguage();
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
 return <div className={`viewing-mode${inline?' viewing-mode-inline':''}`}><button className="button" aria-pressed={enabled} onClick={toggle}>{tr('Red light: ','紅光模式：')}{enabled?tr('on','開啟'):tr('off','關閉')}</button>{enabled&&<p role="status">{tr('Red-light display enabled. Lower your device brightness too. Browser controls and other apps are unaffected.','已啟用紅光顯示。也請降低裝置亮度；瀏覽器控制項與其他應用程式不受影響。')}</p>}{storageError&&<p role="status">{tr('This preference could not be saved; it will apply for this visit.','無法儲存此設定；本次使用期間仍會套用。')}</p>}</div>;
}
