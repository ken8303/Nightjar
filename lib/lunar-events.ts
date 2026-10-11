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
 if(+event.peak.date<+date-60000)event=A.NextLunarEclipse(event.peak);
 while(events.length<3&&validObservingDate(event.peak.date)){
  events.push(event);
  if(events.length<3)event=A.NextLunarEclipse(event.peak);
 }
 return events;
}
