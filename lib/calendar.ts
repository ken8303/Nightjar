import {aboveLocalHorizon,validLocalHorizon,type LocalHorizon} from './local-horizon';
import {isFullDarknessInterval} from './darkness-remaining';
import {utcDate} from './utc-date';
import {validPlace} from './planner-state';
import {validDeepSkyId} from './deep-sky-list';
import {deepSkyLabel} from './deep-sky-names';
import type {DeepSkyObject,DeepSkySample} from './deep-sky';
import type {Place} from './sky';
import {calendarText,calendarTime,foldCalendarLine} from './calendar-format';
import {forecastSnapshotNotes,type ForecastSnapshot} from './forecast-freshness';
import {createTranslator,type Translator} from './messages';
import type {Language} from './language';
import {meteorNameLabel} from './meteor-language';
import {lunarContactLabel} from './lunar-language';
export function meteorCalendar(name:string,year:number,month:number,day:number,language:Language='en'){
 const t=createTranslator(language);
 const peak=utcDate(year,month,day);
 if(year<1||year>9999||month<0||month>11||peak.getUTCFullYear()!==year||peak.getUTCMonth()!==month||peak.getUTCDate()!==day||!name.trim())throw Error('Invalid meteor calendar date.');
 const dayString=(date:Date)=>date.toISOString().slice(0,10).replaceAll('-','');
 // Two all-day entries in one event preserve the typical overnight window in every time zone.
 const start=utcDate(year,month,day-1),end=utcDate(year,month,day+1);
 const safe=name.replace(/[\\,;\r\n]/g,' ').trim();
 if(start.getUTCFullYear()<1||end.getUTCFullYear()>9999)throw Error('This meteor window is outside the calendar year range.');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Meteor Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${safe.toLowerCase().replaceAll(' ','-')}-${year}@nightjar.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;VALUE=DATE:${dayString(start)}`,`DTEND;VALUE=DATE:${dayString(end)}`,`SUMMARY:${calendarText(t('calendar.meteorTitle',{name:meteorNameLabel(safe,language)}))}`,`DESCRIPTION:${calendarText(t('calendar.meteorDescription'))}`,'URL:https://www.imo.net/resources/calendar/','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}

type CalendarCoordinates={latitude?:number;longitude?:number};
function calendarSite(input:CalendarCoordinates){
 if(input.latitude===undefined&&input.longitude===undefined)return null;
 if(typeof input.latitude!=='number'||!Number.isFinite(input.latitude)||Math.abs(input.latitude)>90||typeof input.longitude!=='number'||!Number.isFinite(input.longitude)||Math.abs(input.longitude)>180)throw Error('Invalid calendar observing coordinates.');
 return {latitude:input.latitude,longitude:input.longitude};
}
const calendarDateValid=(date:Date)=>Number.isFinite(+date)&&date.getUTCFullYear()>=1&&date.getUTCFullYear()<=9999;
const calendarZoneNote=(timezone:string|undefined,t:Translator)=>timezone?t('calendar.zone',{zone:timezone}):t('calendar.noZone');
function calendarIdentity(text:string){let hash=2166136261;for(const char of text)hash=Math.imul(hash^char.codePointAt(0)!,16777619)>>>0;return hash.toString(16)}
export function lunarEclipseCalendar(input:{kind:string;peak:Date;place:string;timezone?:string;contacts:{label:string;time:Date;altitude:number}[];nightOnly?:boolean;language?:Language}&CalendarCoordinates,created=new Date()){
 const {contacts,peak,kind,place}=input,site=calendarSite(input),language=input.language==='zh-Hant'?'zh-Hant':'en',t=createTranslator(language);
 if(contacts.length<2||contacts.length>20)throw new Error('Eclipse contacts are required');
 const start=contacts[0].time,end=contacts[contacts.length-1].time;
 if(!calendarDateValid(peak)||!calendarDateValid(start)||!calendarDateValid(end)||!calendarDateValid(created)||+end<=+start||+peak<+start||+peak>+end||!['penumbral','partial','total'].includes(kind)||!place.trim()||place.length>=200||contacts.some((contact,index)=>!calendarDateValid(contact.time)||!Number.isFinite(contact.altitude)||Math.abs(contact.altitude)>90||!contact.label.trim()||contact.label.length>100||(index>0&&+contact.time<=+contacts[index-1].time)))throw new Error('Invalid eclipse interval');
 const eventStart=new Date(Math.floor(+start/1000)*1000),eventEnd=new Date(Math.ceil(+end/1000)*1000);
 if(!calendarDateValid(eventStart)||!calendarDateValid(eventEnd))throw Error('Eclipse interval exceeds the supported calendar years.');
 if(input.nightOnly&&(!site||!isFullDarknessInterval(eventStart,eventEnd,{name:place,...site})))throw Error('This eclipse interval leaves full astronomical darkness.');
 const description=[t('calendar.eclipseGreatest',{time:peak.toISOString()}),...contacts.map(c=>t('calendar.eclipseContact',{label:lunarContactLabel(c.label,t),time:c.time.toISOString(),altitude:c.altitude.toFixed(1),position:t(c.altitude>0?'calendar.above':'calendar.below'),place})),...(site?[t('calendar.siteCoordinates',{latitude:site.latitude,longitude:site.longitude})]:[]),calendarZoneNote(input.timezone,t),t('calendar.eclipseCaution')].join('\n');
 const identity=site?`-${calendarIdentity(`${place}|${site.latitude}|${site.longitude}`)}`:'';
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Lunar Eclipse Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:lunar-eclipse-${calendarTime(peak)}${identity}@nightjar.local`,`DTSTAMP:${calendarTime(created)}`,`DTSTART:${calendarTime(eventStart)}`,`DTEND:${calendarTime(eventEnd)}`,`SUMMARY:${calendarText(t('eclipse.title',{kind:language==='en'?kind[0].toUpperCase()+kind.slice(1):t(kind==='penumbral'?'eclipse.kindPenumbral':kind==='partial'?'eclipse.kindPartial':'eclipse.kindTotal')}))}`,`LOCATION:${calendarText(place)}`,...(site?[`GEO:${site.latitude};${site.longitude}`]:[]),`DESCRIPTION:${calendarText(description)}`,'STATUS:CONFIRMED','TRANSP:TRANSPARENT','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}

export function observingWindowCalendar(input:{start:Date;hours:number;place:string;timezone?:string;score:number;cloud:number;moonAbove:boolean;moonIllumination:number;weather?:ForecastSnapshot;nightOnly?:boolean;language?:Language}&CalendarCoordinates,created=new Date()){
 const {start,hours,place,timezone,score,cloud,moonAbove,moonIllumination}=input,site=calendarSite(input),language=input.language==='zh-Hant'?'zh-Hant':'en',t=createTranslator(language);
 if(!calendarDateValid(start)||!calendarDateValid(created)||!Number.isInteger(hours)||hours<1||hours>2||!Number.isFinite(score)||score<0||score>100||!Number.isFinite(cloud)||cloud<0||cloud>100||!Number.isFinite(moonIllumination)||moonIllumination<0||moonIllumination>1||!place.trim()||place.length>=200)throw new Error('Invalid observing window');
 const end=new Date(+start+hours*3600000);
 if(!calendarDateValid(end))throw Error('Observing interval exceeds the supported calendar years.');
 if(input.nightOnly&&(!site||!isFullDarknessInterval(start,end,{name:place,...site})))throw Error('This observing window leaves full astronomical darkness. Choose another window.');
 const eventStart=new Date(Math.ceil(+start/1000)*1000),eventEnd=new Date(Math.floor(+end/1000)*1000);
 const identity=calendarIdentity(`${place}|${timezone}${site?`|${site.latitude}|${site.longitude}`:''}`);
 const description=[t('calendar.observingScore',{score,cloud}),moonAbove?t('calendar.moonAbove',{illumination:Math.round(moonIllumination*100)}):t('calendar.moonBelow'),t('calendar.site',{place}),calendarZoneNote(timezone,t),...(site?[t('calendar.coordinates',{latitude:site.latitude,longitude:site.longitude})]:[]),...forecastSnapshotNotes(input.weather||{},created,language),t('calendar.weatherSource'),t('calendar.weatherCaution')].join('\n');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Observing Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:observing-${calendarTime(start)}-${identity}@nightjar.local`,`DTSTAMP:${calendarTime(created)}`,`DTSTART:${calendarTime(eventStart)}`,`DTEND:${calendarTime(eventEnd)}`,`SUMMARY:${calendarText(t('calendar.observingTitle',{place}))}`,`LOCATION:${calendarText(place)}`,...(site?[`GEO:${site.latitude};${site.longitude}`]:[]),`DESCRIPTION:${calendarText(description)}`,'STATUS:TENTATIVE','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}

export function deepSkyWindowCalendar(input:{target:DeepSkyObject;place:Place;start:Date;end:Date;samples:(DeepSkySample&{moonAltitude?:number})[];moonBelowOnly:boolean;horizon?:LocalHorizon;language?:Language},created=new Date()){
 const {target,place,start,end,samples,moonBelowOnly,horizon}=input,language=input.language==='zh-Hant'?'zh-Hant':'en',t=createTranslator(language);
 const validTime=(date:Date)=>Number.isFinite(+date)&&date.getUTCFullYear()>=1&&date.getUTCFullYear()<=9999;
 const duration=+end-+start;
 if(!validTime(start)||!validTime(end)||!validTime(created)||duration<900000||duration>86400000||duration%900000!==0||!validPlace(place)||!validDeepSkyId(target.id)||!Number.isFinite(target.ra)||target.ra<0||target.ra>=24||!Number.isFinite(target.dec)||Math.abs(target.dec)>90||typeof target.name!=='string'||target.name.length>500||typeof target.catalogue!=='string'||target.catalogue.length>100||typeof moonBelowOnly!=='boolean'||(horizon&&!validLocalHorizon(horizon))||samples.length>97)throw Error('Invalid deep-sky calendar window.');
 const included=samples.filter(sample=>+sample.time>=+start&&+sample.time<=+end);
 if(included.length!==duration/900000+1||included.some((sample,index)=>+sample.time!==+start+index*900000||!Number.isFinite(sample.altitude)||sample.altitude<=30||sample.altitude>90||!Number.isFinite(sample.azimuth)||!aboveLocalHorizon(sample.altitude,sample.azimuth,horizon)||!Number.isFinite(sample.sun)||sample.sun>= -18||(moonBelowOnly&&(!Number.isFinite(sample.moonAltitude)||sample.moonAltitude!>0))))throw Error('This interval has no complete qualifying deep-sky window.');
 if(!isFullDarknessInterval(start,end,place))throw Error('This interval leaves full astronomical darkness. Choose another deep-sky window.');
 const peak=included.reduce((best,sample)=>sample.altitude>best.altitude?sample:best,included[0]);
 // Calendar DATE-TIME has whole seconds. Round inward so serialization never
 // extends the event outside its sampled interval.
 const eventStart=new Date(Math.ceil(+start/1000)*1000),eventEnd=new Date(Math.floor(+end/1000)*1000);
 let hash=2166136261;for(const char of `${target.id}|${place.name}|${place.latitude}|${place.longitude}|${start.toISOString()}|${end.toISOString()}|${moonBelowOnly}${horizon?`|${horizon.join(",")}`:""}`)hash=Math.imul(hash^char.codePointAt(0)!,16777619)>>>0;
 const description=[t('calendar.deepName',{id:target.id,name:deepSkyLabel(target,language)}),t('calendar.deepPeak',{time:peak.time.toISOString(),altitude:peak.altitude.toFixed(1)}),t('calendar.deepCoordinates',{ra:target.ra.toFixed(5),dec:target.dec.toFixed(5)}),t('calendar.deepSite',{place:place.name,latitude:place.latitude,longitude:place.longitude}),calendarZoneNote(place.timezone,t),t('calendar.deepInterval',{start:start.toISOString(),end:end.toISOString()}),t(moonBelowOnly?'calendar.deepMoonDown':'calendar.deepMoonAny'),...(horizon?[t('calendar.deepHorizon',{heights:horizon.join(', ')})]:[t('calendar.deepNoTerrain')]),t('calendar.deepCaution')].join('\n');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//Deep Sky Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:deep-sky-${target.id}-${hash.toString(16)}@nightjar.local`,`DTSTAMP:${calendarTime(created)}`,`DTSTART:${calendarTime(eventStart)}`,`DTEND:${calendarTime(eventEnd)}`,`SUMMARY:${calendarText(t('calendar.deepTitle',{id:target.id,name:deepSkyLabel(target,language)}))}`,`LOCATION:${calendarText(place.name)}`,`GEO:${place.latitude};${place.longitude}`,`DESCRIPTION:${calendarText(description)}`,'STATUS:TENTATIVE','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}
