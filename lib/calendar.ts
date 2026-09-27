export function meteorCalendar(name:string,year:number,month:number,day:number){
 const dayString=(date:Date)=>date.toISOString().slice(0,10).replaceAll('-','');
 // Two all-day entries in one event preserve the typical overnight window in every time zone.
 const start=new Date(Date.UTC(year,month,day-1)),end=new Date(Date.UTC(year,month,day+1));
 const safe=name.replace(/[\\,;\r\n]/g,' ').trim();
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Meteor Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${safe.toLowerCase().replaceAll(' ','-')}-${year}@nightjar.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;VALUE=DATE:${dayString(start)}`,`DTEND;VALUE=DATE:${dayString(end)}`,`SUMMARY:${safe} - typical peak window`,'DESCRIPTION:Typical annual dates only. Check the current IMO calendar for exact timing.','URL:https://www.imo.net/resources/calendar/','END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
