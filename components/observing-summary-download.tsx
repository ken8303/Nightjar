'use client';

import {useRef,useState,useSyncExternalStore} from 'react';
import {Download,Share2} from 'lucide-react';
import {downloadFile} from '@/lib/download';
import {observingSummary} from '@/lib/observing-summary';
import {type Place} from '@/lib/sky';
import {type WeatherForecast} from '@/lib/weather-hours';
import {useLanguage} from '@/components/language-provider';

type Props={date:Date;place:Place;forecast?:WeatherForecast|null;fetchedAt?:number;refreshing:boolean;refreshFailed:boolean;onNotice:(text:string)=>void};
const subscribe=()=>()=>{};
const shareSupported=()=>typeof navigator!=='undefined'&&typeof navigator.share==='function';
const serverShareSupported=()=>false;

export default function ObservingSummaryDownload({onNotice,...input}:Props){
 const {tr}=useLanguage();
 const canShare=useSyncExternalStore(subscribe,shareSupported,serverShareSupported);
 const [sharing,setSharing]=useState(false);
 const pendingShare=useRef(false);
 function download(){
  try{
   const summary=observingSummary(input);
   downloadFile(new Blob([summary.text],{type:'text/plain;charset=utf-8'}),summary.filename);
   onNotice(tr('Observing summary prepared. Check that the text file downloaded; its weather and sky conditions will not update.','英文觀測摘要已準備好。請確認文字檔已下載；其中的天氣與天空狀況不會自動更新。'));
  }catch{onNotice(tr('The observing summary could not be prepared. Your selected site and time are unchanged.','無法準備觀測摘要。所選地點與時間保持不變。'));}
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
   onNotice(tr(`Share options completed for ${label}. This summary is a snapshot and will not update.`,`${label} 的分享選項已結束。摘要是快照，不會自動更新。`));
  }catch(error){
   const cancelled=error!==null&&typeof error==='object'&&'name' in error&&error.name==='AbortError';
   if(!cancelled)onNotice(tr('The observing summary could not be shared. Use Download summary instead. Your selected site and time are unchanged.','無法分享觀測摘要，請改用下載摘要。所選地點與時間保持不變。'));
  }finally{pendingShare.current=false;setSharing(false)}
 }
 return <><button type="button" className="text-button" onClick={download} aria-label={tr('Download observing summary','下載英文觀測摘要')}><Download size={16}/>{tr('Download summary','下載英文摘要')}</button>{canShare&&<button type="button" className="text-button" onClick={share} disabled={sharing} aria-busy={sharing} aria-label={tr('Share observing summary','分享英文觀測摘要')}><Share2 size={16}/>{sharing?tr('Opening share options…','正在開啟分享選項…'):tr('Share summary','分享英文摘要')}</button>}</>;
}
