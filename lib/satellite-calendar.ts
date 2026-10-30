import {isFullDarknessInterval} from './darkness-remaining';
import {calendarText,calendarTime,foldCalendarLine} from './calendar-format';
import {parseSatelliteFeed,type SatelliteFeed} from './satellite-elements';
import {satelliteDataIssue} from './satellite-position';
import type {SatelliteViewingWindow} from './satellite-passes';
import {satelliteViewingAltitude,satelliteViewingSunAltitude,satelliteViewingMinimumMs} from './satellite-viewing-rules';
import {validPlace} from './planner-state';
import type {Place} from './sky';
import type {Language} from './language';
import {createTranslator} from './messages';
import {satelliteStatusLabel} from './satellite-language';

export function satelliteWindowCalendar({window,place,feed:raw,language:requestedLanguage}:{window:SatelliteViewingWindow;place:Place;feed:SatelliteFeed;language?:Language},created=new Date()){
 const language=requestedLanguage==='zh-Hant'?'zh-Hant':'en',t=createTranslator(language);
 const feed=parseSatelliteFeed(raw),{start,end}=window;
 if(!validPlace(place)||!Number.isFinite(+created)||!Number.isFinite(start)||!Number.isFinite(end)||end-start<satelliteViewingMinimumMs||end-start>86400000||[start,end].some(time=>new Date(time).getUTCFullYear()<1950||new Date(time).getUTCFullYear()>2050)||typeof window.startsAtBoundary!=='boolean'||typeof window.endsAtBoundary!=='boolean')throw Error('This ISS observing window is invalid. Recalculate passes before downloading.');
 const issue=satelliteDataIssue(feed,new Date(start),+created)||satelliteDataIssue(feed,new Date(end),+created);
 if(issue)throw Error(issue);
 // Date truncates fractional milliseconds. Round outwards when checking the
 // darkness envelope so a threshold crossing cannot be hidden by clipping.
 if(!isFullDarknessInterval(new Date(Math.floor(start)),new Date(Math.ceil(end)),place))throw Error('This ISS window leaves full astronomical darkness. Recalculate passes before downloading.');
 // DATE-TIME uses whole seconds. Round inward to keep the calendar interval
 // inside the calculated window, preserving precise bounds in its notes.
 const eventStart=new Date(Math.ceil(start/1000)*1000),eventEnd=new Date(Math.floor(end/1000)*1000);
 if(eventEnd<=eventStart)throw Error('This ISS observing window is too short for a calendar event.');
 let hash=2166136261;
 for(const char of JSON.stringify([place.name,place.latitude,place.longitude,feed.elements.EPOCH,start,end]))hash=Math.imul(hash^char.codePointAt(0)!,16777619)>>>0;
 const description=[
  t('calendar.issInterval',{start:new Date(start).toISOString(),end:new Date(end).toISOString()}),
  t('calendar.issCriteria',{altitude:satelliteViewingAltitude,sun:satelliteViewingSunAltitude,seconds:satelliteViewingMinimumMs/1000}),
  t('calendar.issDark'),t('calendar.siteDetail',{place:place.name,latitude:place.latitude,longitude:place.longitude}),
  place.timezone?t('calendar.zone',{zone:place.timezone}):t('calendar.noZone'),
  t('calendar.issEpoch',{epoch:feed.elements.EPOCH,fetched:feed.fetchedAt}),
  ...(feed.refreshPaused?[t('calendar.issPaused')]:[]),
  ...(feed.issue?[t('calendar.issIssue',{status:satelliteStatusLabel(feed.issue,language,t)})]:[]),
  t('calendar.issSource'),
  ...(window.startsAtBoundary?[t('calendar.issStartBoundary')]:[]),
  ...(window.endsAtBoundary?[t('calendar.issEndBoundary')]:[]),
  t('calendar.issCaution')
 ].join('\n');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//ISS Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:iss-25544-${calendarTime(eventStart)}-${hash.toString(16)}@nightjar.local`,`DTSTAMP:${calendarTime(created)}`,`DTSTART:${calendarTime(eventStart)}`,`DTEND:${calendarTime(eventEnd)}`,`SUMMARY:${calendarText(t('calendar.issTitle',{place:place.name}))}`,`LOCATION:${calendarText(place.name)}`,`GEO:${place.latitude};${place.longitude}`,`DESCRIPTION:${calendarText(description)}`,'STATUS:TENTATIVE','TRANSP:TRANSPARENT','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}
