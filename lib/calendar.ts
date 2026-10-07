import {utcDate} from './utc-date';
import {validPlace} from './planner-state';
import {validMessierId} from './deep-sky-list';
import {deepSkyName} from './deep-sky-names';
import type {DeepSkyObject,DeepSkySample} from './deep-sky';
import type {Place} from './sky';
export function meteorCalendar(name:string,year:number,month:number,day:number){
 const peak=utcDate(year,month,day);
 if(year<1||year>9999||month<0||month>11||peak.getUTCFullYear()!==year||peak.getUTCMonth()!==month||peak.getUTCDate()!==day||!name.trim())throw Error('Invalid meteor calendar date.');
 const dayString=(date:Date)=>date.toISOString().slice(0,10).replaceAll('-','');
 // Two all-day entries in one event preserve the typical overnight window in every time zone.
 const start=utcDate(year,month,day-1),end=utcDate(year,month,day+1);
 const safe=name.replace(/[\\,;\r\n]/g,' ').trim();
 if(start.getUTCFullYear()<1||end.getUTCFullYear()>9999)throw Error('This meteor window is outside the calendar year range.');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Meteor Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${safe.toLowerCase().replaceAll(' ','-')}-${year}@nightjar.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;VALUE=DATE:${dayString(start)}`,`DTEND;VALUE=DATE:${dayString(end)}`,`SUMMARY:${safe} - typical peak window`,'DESCRIPTION:Typical annual dates only. Check the current IMO calendar for exact timing.','URL:https://www.imo.net/resources/calendar/','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}

const calendarText = (value:string) => value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const calendarTime = (date:Date) => date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
// RFC 5545 limits content lines to 75 octets; never split a UTF-8 character.
function foldCalendarLine(line:string){
 let output='',part='',bytes=0;
 for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){output+=part+'\r\n';part=' ';bytes=1}part+=char;bytes+=size}
 return output+part;
}
type CalendarCoordinates={latitude?:number;longitude?:number};
function calendarSite(input:CalendarCoordinates){
 if(input.latitude===undefined&&input.longitude===undefined)return null;
 if(typeof input.latitude!=='number'||!Number.isFinite(input.latitude)||Math.abs(input.latitude)>90||typeof input.longitude!=='number'||!Number.isFinite(input.longitude)||Math.abs(input.longitude)>180)throw Error('Invalid calendar observing coordinates.');
 return {latitude:input.latitude,longitude:input.longitude};
}
const calendarDateValid=(date:Date)=>Number.isFinite(+date)&&date.getUTCFullYear()>=1&&date.getUTCFullYear()<=9999;
function calendarIdentity(text:string){let hash=2166136261;for(const char of text)hash=Math.imul(hash^char.codePointAt(0)!,16777619)>>>0;return hash.toString(16)}
export function lunarEclipseCalendar(input:{kind:string;peak:Date;place:string;timezone?:string;contacts:{label:string;time:Date;altitude:number}[]}&CalendarCoordinates,created=new Date()){
 const {contacts,peak,kind,place}=input,site=calendarSite(input);
 if(contacts.length<2||contacts.length>20)throw new Error('Eclipse contacts are required');
 const start=contacts[0].time,end=contacts[contacts.length-1].time;
 if(!calendarDateValid(peak)||!calendarDateValid(start)||!calendarDateValid(end)||!calendarDateValid(created)||+end<=+start||+peak<+start||+peak>+end||!['penumbral','partial','total'].includes(kind)||!place.trim()||place.length>=200||contacts.some((contact,index)=>!calendarDateValid(contact.time)||!Number.isFinite(contact.altitude)||Math.abs(contact.altitude)>90||!contact.label.trim()||contact.label.length>100||(index>0&&+contact.time<=+contacts[index-1].time)))throw new Error('Invalid eclipse interval');
 const eventStart=new Date(Math.floor(+start/1000)*1000),eventEnd=new Date(Math.ceil(+end/1000)*1000);
 if(!calendarDateValid(eventStart)||!calendarDateValid(eventEnd))throw Error('Eclipse interval exceeds the supported calendar years.');
 const description=[`Greatest eclipse: ${peak.toISOString()} (UTC).`,...contacts.map(c=>`${c.label}: ${c.time.toISOString()} (UTC); Moon altitude ${c.altitude.toFixed(1)} degrees, ${c.altitude>0?'above':'below'} horizon at ${place}.`),...(site?[`Observing coordinates: latitude ${site.latitude}, longitude ${site.longitude}; timezone ${input.timezone||'UTC'}.`]:[]),'Times calculated by Astronomy Engine. Horizon visibility does not include weather, terrain or buildings.'].join('\n');
 const identity=site?`-${calendarIdentity(`${place}|${site.latitude}|${site.longitude}`)}`:'';
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Lunar Eclipse Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:lunar-eclipse-${calendarTime(peak)}${identity}@nightjar.local`,`DTSTAMP:${calendarTime(created)}`,`DTSTART:${calendarTime(eventStart)}`,`DTEND:${calendarTime(eventEnd)}`,`SUMMARY:${calendarText(`${kind[0].toUpperCase()+kind.slice(1)} lunar eclipse`)}`,`LOCATION:${calendarText(place)}`,...(site?[`GEO:${site.latitude};${site.longitude}`]:[]),`DESCRIPTION:${calendarText(description)}`,'STATUS:CONFIRMED','TRANSP:TRANSPARENT','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}

export function observingWindowCalendar(input:{start:Date;hours:number;place:string;timezone:string;score:number;cloud:number;moonAbove:boolean;moonIllumination:number}&CalendarCoordinates,created=new Date()){
 const {start,hours,place,timezone,score,cloud,moonAbove,moonIllumination}=input,site=calendarSite(input);
 if(!calendarDateValid(start)||!calendarDateValid(created)||!Number.isInteger(hours)||hours<1||hours>2||!Number.isFinite(score)||score<0||score>100||!Number.isFinite(cloud)||cloud<0||cloud>100||!Number.isFinite(moonIllumination)||moonIllumination<0||moonIllumination>1||!place.trim()||place.length>=200)throw new Error('Invalid observing window');
 const end=new Date(+start+hours*3600000);
 if(!calendarDateValid(end))throw Error('Observing interval exceeds the supported calendar years.');
 const eventStart=new Date(Math.ceil(+start/1000)*1000),eventEnd=new Date(Math.floor(+end/1000)*1000);
 const identity=calendarIdentity(`${place}|${timezone}${site?`|${site.latitude}|${site.longitude}`:''}`);
 const description=[`Planning score: ${score}/100; forecast cloud cover: ${cloud}%.`,moonAbove?`Moon above the horizon at the start, ${Math.round(moonIllumination*100)}% illuminated.`:'Moon below the horizon at the start.',`Observing site: ${place} (${timezone}).`,...(site?[`Latitude ${site.latitude}, longitude ${site.longitude}.`]:[]),'Forecast and Moon conditions are estimates. Check weather and local conditions before leaving.'].join('\n');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Observing Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:observing-${calendarTime(start)}-${identity}@nightjar.local`,`DTSTAMP:${calendarTime(created)}`,`DTSTART:${calendarTime(eventStart)}`,`DTEND:${calendarTime(eventEnd)}`,`SUMMARY:${calendarText('Stargazing window at '+place)}`,`LOCATION:${calendarText(place)}`,...(site?[`GEO:${site.latitude};${site.longitude}`]:[]),`DESCRIPTION:${calendarText(description)}`,'STATUS:TENTATIVE','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}

export function deepSkyWindowCalendar(input:{target:DeepSkyObject;place:Place;start:Date;end:Date;samples:(DeepSkySample&{moonAltitude?:number})[];moonBelowOnly:boolean},created=new Date()){
 const {target,place,start,end,samples,moonBelowOnly}=input;
 const validTime=(date:Date)=>Number.isFinite(+date)&&date.getUTCFullYear()>=1&&date.getUTCFullYear()<=9999;
 const duration=+end-+start;
 if(!validTime(start)||!validTime(end)||!validTime(created)||duration<900000||duration>86400000||duration%900000!==0||!validPlace(place)||!validMessierId(target.id)||!Number.isFinite(target.ra)||target.ra<0||target.ra>=24||!Number.isFinite(target.dec)||Math.abs(target.dec)>90||typeof target.name!=='string'||target.name.length>500||typeof target.catalogue!=='string'||target.catalogue.length>100||typeof moonBelowOnly!=='boolean'||samples.length>97)throw Error('Invalid deep-sky calendar window.');
 const included=samples.filter(sample=>+sample.time>=+start&&+sample.time<=+end);
 if(included.length!==duration/900000+1||included.some((sample,index)=>+sample.time!==+start+index*900000||!Number.isFinite(sample.altitude)||sample.altitude<=30||sample.altitude>90||!Number.isFinite(sample.sun)||sample.sun> -18||(moonBelowOnly&&(!Number.isFinite(sample.moonAltitude)||sample.moonAltitude!>0))))throw Error('This interval has no complete qualifying deep-sky window.');
 const peak=included.reduce((best,sample)=>sample.altitude>best.altitude?sample:best,included[0]);
 // Calendar DATE-TIME has whole seconds. Round inward so serialization never
 // extends the event outside its sampled interval.
 const eventStart=new Date(Math.ceil(+start/1000)*1000),eventEnd=new Date(Math.floor(+end/1000)*1000);
 let hash=2166136261;for(const char of `${target.id}|${place.name}|${place.latitude}|${place.longitude}|${start.toISOString()}|${end.toISOString()}|${moonBelowOnly}`)hash=Math.imul(hash^char.codePointAt(0)!,16777619)>>>0;
 const description=[`${target.id}: ${deepSkyName(target)}.`,`Highest qualifying sample in this interval: ${peak.time.toISOString()}, altitude ${peak.altitude.toFixed(1)} degrees.`,`Catalogue J2000 coordinates: RA ${target.ra.toFixed(5)} h, Dec ${target.dec.toFixed(5)} degrees.`,`Site: ${place.name}; latitude ${place.latitude}, longitude ${place.longitude}; timezone ${place.timezone||'UTC'}.`,`Original sampled interval: ${start.toISOString()} to ${end.toISOString()}.`,moonBelowOnly?'Moon centre at or below the horizon at every qualifying sample.':'Moon-down filtering was not required.','Above 30 degrees with the Sun at or below -18 degrees at 15-minute samples. Intervals are not exact rise/set/transit times; weather, light pollution, equipment and terrain are not included. Recheck conditions before observing.'].join('\n');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Deep Sky Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:deep-sky-${target.id}-${hash.toString(16)}@nightjar.local`,`DTSTAMP:${calendarTime(created)}`,`DTSTART:${calendarTime(eventStart)}`,`DTEND:${calendarTime(eventEnd)}`,`SUMMARY:${calendarText(`Observe ${target.id} - ${deepSkyName(target)}`)}`,`LOCATION:${calendarText(place.name)}`,`GEO:${place.latitude};${place.longitude}`,`DESCRIPTION:${calendarText(description)}`,'STATUS:TENTATIVE','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}
