'use client';

import {Download} from 'lucide-react';
import {downloadFile} from '@/lib/download';
import {observingSummary} from '@/lib/observing-summary';
import {type Place} from '@/lib/sky';
import {type WeatherForecast} from '@/lib/weather-hours';

type Props={date:Date;place:Place;forecast?:WeatherForecast|null;fetchedAt?:number;refreshing:boolean;refreshFailed:boolean;onNotice:(text:string)=>void};

export default function ObservingSummaryDownload({onNotice,...input}:Props){
 function download(){
  try{
   const summary=observingSummary(input);
   downloadFile(new Blob([summary.text],{type:'text/plain;charset=utf-8'}),summary.filename);
   onNotice('Observing summary prepared. Check that the text file downloaded; its weather and sky conditions will not update.');
  }catch{onNotice('The observing summary could not be prepared. Your selected site and time are unchanged.');}
 }
 return <button type="button" className="text-button" onClick={download} aria-label="Download observing summary"><Download size={16}/>Download summary</button>;
}
