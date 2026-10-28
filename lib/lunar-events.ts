import {A} from './sky';
import {validObservingDate} from './observing-time';

export function nextLunarPhases(date:Date){
 if(!validObservingDate(date))throw Error('Choose an observing time within UTC years 1–9999.');
 const events:ReturnType<typeof A.SearchMoonQuarter>[]=[];
 let event=A.SearchMoonQuarter(date);
 while(events.length<4&&validObservingDate(event.time.date)){
  events.push(event);
  if(events.length<4)event=A.NextMoonQuarter(event);
 }
 return events;
}

export function nextLunarEclipses(date:Date){
 if(!validObservingDate(date))throw Error('Choose an observing time within UTC years 1–9999.');
 const events:ReturnType<typeof A.SearchLunarEclipse>[]=[];
 let event=A.SearchLunarEclipse(new Date(+date-86400000));
 // Keep an eclipse until its final penumbral contact has elapsed.
 if(+event.peak.date+event.sd_penum*60000<+date-60000)event=A.NextLunarEclipse(event.peak);
 while(events.length<3&&validObservingDate(event.peak.date)){
  events.push(event);
  if(events.length<3)event=A.NextLunarEclipse(event.peak);
 }
 return events;
}

// Keep the exact global contacts; callers decide which are usable at a site.
export function lunarEclipseContacts(eclipse:ReturnType<typeof A.SearchLunarEclipse>){
 const phases=[{label:'Penumbral begins',minutes:-eclipse.sd_penum},...(eclipse.sd_partial>0?[{label:'Partial begins',minutes:-eclipse.sd_partial}]:[]),...(eclipse.sd_total>0?[{label:'Totality begins',minutes:-eclipse.sd_total}]:[]),{label:'Greatest eclipse',minutes:0},...(eclipse.sd_total>0?[{label:'Totality ends',minutes:eclipse.sd_total}]:[]),...(eclipse.sd_partial>0?[{label:'Partial ends',minutes:eclipse.sd_partial}]:[]),{label:'Penumbral ends',minutes:eclipse.sd_penum}];
 return phases.map(phase=>({label:phase.label,time:new Date(+eclipse.peak.date+phase.minutes*60000)}));
}
