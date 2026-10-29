"use client";
import {useState} from 'react';
import type {SatelliteFeed} from '@/lib/satellite-elements';
import type {SatelliteViewingWindow} from '@/lib/satellite-passes';
import type {Place} from '@/lib/sky';
import {satelliteWindowCalendar} from '@/lib/satellite-calendar';
import {downloadFile} from '@/lib/download';
import type {SatelliteFreshness} from '@/lib/satellite-validity';

const utc=(time:number)=>new Date(time).toISOString().replace('T',' ').replace(/\.\d{3}Z$/,' UTC');
export default function SatelliteWindowActions({window,feed,place,onDate}:{window:SatelliteViewingWindow;feed:SatelliteFeed;place:Place;onDate:(date:Date,freshness:SatelliteFreshness)=>void}){
 const midpoint=Math.floor(window.start+(window.end-window.start)/2);
 const [message,setMessage]=useState('');
 function download(){
  try{
   const text=satelliteWindowCalendar({window,feed,place});
   downloadFile(new Blob([text],{type:'text/calendar;charset=utf-8'}),`nightjar-iss-${new Date(window.start).toISOString().slice(0,19).replace(/[:T]/g,'-')}.ics`);
   setMessage('Calendar file prepared for download. Import it into your calendar app; this snapshot will not update.');
  }catch(error){setMessage(error instanceof Error?error.message:'The calendar file could not be created. Try again.')}
 }
 return <div className="satellite-window-actions"><button type="button" className="button satellite-window-time" aria-label={`Set observing time to ISS window midpoint at ${utc(midpoint)}`} onClick={()=>onDate(new Date(midpoint),{fetchedAt:feed.fetchedAt,epoch:feed.elements.EPOCH})}>Use midpoint · {utc(midpoint).slice(11)}</button><button type="button" className="button satellite-window-time" aria-label={`Download ISS window calendar from ${utc(window.start)} to ${utc(window.end)}`} onClick={download}>Download calendar</button>{message&&<p role="status">{message}</p>}</div>;
}
