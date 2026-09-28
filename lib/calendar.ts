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
