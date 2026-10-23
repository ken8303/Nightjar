'use client';

import {useRef,useState,useSyncExternalStore} from 'react';
import {Download,Share2} from 'lucide-react';
import {downloadFile} from '@/lib/download';
import {observingSummary} from '@/lib/observing-summary';
import {type Place} from '@/lib/sky';
import {type WeatherForecast} from '@/lib/weather-hours';

type Props={date:Date;place:Place;forecast?:WeatherForecast|null;fetchedAt?:number;refreshing:boolean;refreshFailed:boolean;onNotice:(text:string)=>void};
const subscribe=()=>()=>{};
const shareSupported=()=>typeof navigator!=='undefined'&&typeof navigator.share==='function';
const serverShareSupported=()=>false;

export default function ObservingSummaryDownload({onNotice,...input}:Props){
 const canShare=useSyncExternalStore(subscribe,shareSupported,serverShareSupported);
 const [sharing,setSharing]=useState(false);
 const pendingShare=useRef(false);
 function download(){
  try{
   const summary=observingSummary(input);
   downloadFile(new Blob([summary.text],{type:'text/plain;charset=utf-8'}),summary.filename);
   onNotice('Observing summary prepared. Check that the text file downloaded; its weather and sky conditions will not update.');
  }catch{onNotice('The observing summary could not be prepared. Your selected site and time are unchanged.');}
 }
 async function share(){
  if(pendingShare.current)return;
  pendingShare.current=true;setSharing(true);
  try{
   // Capture this tap's summary before opening native UI. Later planner edits
   // must not change the shared snapshot or its completion message.
   const summary=observingSummary(input);
   const label=`${input.place.name} · ${input.date.toISOString().replace('T',' ').replace('Z',' UTC')}`;
   await navigator.share({title:'Nightjar observing summary',text:summary.text});
   onNotice(`Share options completed for ${label}. This summary is a snapshot and will not update.`);
  }catch(error){
   const cancelled=error!==null&&typeof error==='object'&&'name' in error&&error.name==='AbortError';
   if(!cancelled)onNotice('The observing summary could not be shared. Use Download summary instead. Your selected site and time are unchanged.');
  }finally{pendingShare.current=false;setSharing(false)}
 }
 return <><button type="button" className="text-button" onClick={download} aria-label="Download observing summary"><Download size={16}/>Download summary</button>{canShare&&<button type="button" className="text-button" onClick={share} disabled={sharing} aria-busy={sharing} aria-label="Share observing summary"><Share2 size={16}/>{sharing?'Opening share options…':'Share summary'}</button>}</>;
}
