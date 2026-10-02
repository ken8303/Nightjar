export function meteorCalendar(name:string,year:number,month:number,day:number){
 const dayString=(date:Date)=>date.toISOString().slice(0,10).replaceAll('-','');
 // Two all-day entries in one event preserve the typical overnight window in every time zone.
 const start=new Date(Date.UTC(year,month,day-1)),end=new Date(Date.UTC(year,month,day+1));
 const safe=name.replace(/[\\,;\r\n]/g,' ').trim();
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Meteor Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${safe.toLowerCase().replaceAll(' ','-')}-${year}@nightjar.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;VALUE=DATE:${dayString(start)}`,`DTEND;VALUE=DATE:${dayString(end)}`,`SUMMARY:${safe} - typical peak window`,'DESCRIPTION:Typical annual dates only. Check the current IMO calendar for exact timing.','URL:https://www.imo.net/resources/calendar/','END:VEVENT','END:VCALENDAR',''].join('\r\n');
}

const calendarText = (value:string) => value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const calendarTime = (date:Date) => date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
// RFC 5545 limits content lines to 75 octets; never split a UTF-8 character.
function foldCalendarLine(line:string){
 let output='',part='',bytes=0;
 for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){output+=part+'\r\n';part=' ';bytes=1}part+=char;bytes+=size}
 return output+part;
}
export function lunarEclipseCalendar(input:{kind:string;peak:Date;place:string;contacts:{label:string;time:Date;altitude:number}[]},created=new Date()){
 const {contacts,peak,kind,place}=input;
 if(contacts.length<2)throw new Error('Eclipse contacts are required');
 const start=contacts[0].time,end=contacts[contacts.length-1].time;
 if(!Number.isFinite(+peak)||!Number.isFinite(+start)||!Number.isFinite(+end)||+end<=+start)throw new Error('Invalid eclipse interval');
 const description=[`Greatest eclipse: ${peak.toISOString()} (UTC).`,...contacts.map(c=>`${c.label}: ${c.time.toISOString()} (UTC); Moon altitude ${c.altitude.toFixed(1)} degrees, ${c.altitude>0?'above':'below'} horizon at ${place}.`),'Times calculated by Astronomy Engine. Horizon visibility does not include weather, terrain or buildings.'].join('\n');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Lunar Eclipse Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:lunar-eclipse-${calendarTime(peak)}@nightjar.local`,`DTSTAMP:${calendarTime(created)}`,`DTSTART:${calendarTime(start)}`,`DTEND:${calendarTime(end)}`,`SUMMARY:${calendarText(`${kind[0].toUpperCase()+kind.slice(1)} lunar eclipse`)}`,`LOCATION:${calendarText(place)}`,`DESCRIPTION:${calendarText(description)}`,'STATUS:CONFIRMED','TRANSP:TRANSPARENT','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}

export function observingWindowCalendar(input:{start:Date;hours:number;place:string;timezone:string;score:number;cloud:number;moonAbove:boolean;moonIllumination:number},created=new Date()){
 const {start,hours,place,timezone,score,cloud,moonAbove,moonIllumination}=input;
 if(!Number.isFinite(+start)||!Number.isFinite(+created)||!Number.isInteger(hours)||hours<1||hours>2||!Number.isFinite(score)||score<0||score>100||!Number.isFinite(cloud)||cloud<0||cloud>100||!Number.isFinite(moonIllumination)||moonIllumination<0||moonIllumination>1||!place.trim())throw new Error('Invalid observing window');
 const end=new Date(+start+hours*3600000);
 let siteHash=2166136261;
 for(const char of `${place}|${timezone}`)siteHash=Math.imul(siteHash^char.charCodeAt(0),16777619)>>>0;
 const description=[`Planning score: ${score}/100; forecast cloud cover: ${cloud}%.`,moonAbove?`Moon above the horizon at the start, ${Math.round(moonIllumination*100)}% illuminated.`:'Moon below the horizon at the start.',`Observing site: ${place} (${timezone}).`,'Forecast and Moon conditions are estimates. Check weather and local conditions before leaving.'].join('\n');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Observing Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:observing-${calendarTime(start)}-${siteHash.toString(16)}@nightjar.local`,`DTSTAMP:${calendarTime(created)}`,`DTSTART:${calendarTime(start)}`,`DTEND:${calendarTime(end)}`,`SUMMARY:${calendarText('Stargazing window at '+place)}`,`LOCATION:${calendarText(place)}`,`DESCRIPTION:${calendarText(description)}`,'STATUS:TENTATIVE','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}
