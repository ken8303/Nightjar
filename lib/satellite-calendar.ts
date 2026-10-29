import {isFullDarknessInterval} from './darkness-remaining';
import {calendarText,calendarTime,foldCalendarLine} from './calendar-format';
import {parseSatelliteFeed,type SatelliteFeed} from './satellite-elements';
import {satelliteDataIssue} from './satellite-position';
import type {SatelliteViewingWindow} from './satellite-passes';
import {satelliteViewingAltitude,satelliteViewingSunAltitude,satelliteViewingMinimumMs} from './satellite-viewing-rules';
import {validPlace} from './planner-state';
import type {Place} from './sky';

export function satelliteWindowCalendar({window,place,feed:raw}:{window:SatelliteViewingWindow;place:Place;feed:SatelliteFeed},created=new Date()){
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
  `Modelled ISS observing window: ${new Date(start).toISOString()} to ${new Date(end).toISOString()} (UTC).`,
  `Criteria: above ${satelliteViewingAltitude} degrees, fully sunlit, Sun centre below ${satelliteViewingSunAltitude} degrees; calculated overlap at least ${satelliteViewingMinimumMs/1000} seconds.`,
  'The geometric Sun centre remains below -18 degrees throughout this calendar interval.',
  `Observing site: ${place.name}; latitude ${place.latitude}, longitude ${place.longitude}.`,
  place.timezone?`Site time zone: ${place.timezone}.`:'Site time zone unavailable; event times use UTC.',
  `Orbital epoch: ${feed.elements.EPOCH} (UTC). Source retrieved: ${feed.fetchedAt}.`,
  ...(feed.refreshPaused?['Automatic source refresh was paused for investigation when this file was created; the last successfully cached elements were used.']:[]),
  ...(feed.issue?[`Source status: ${feed.issue}`]:[]),
  'Source: CelesTrak GP data for ISS (NORAD 25544). Calculations: satellite.js SGP4 and approximate spherical Earth-shadow/Sun models.',
  ...(window.startsAtBoundary?['The interval begins at the search boundary; an earlier qualifying portion may be outside this search.']:[]),
  ...(window.endsAtBoundary?['The interval ends at the search boundary; a later qualifying portion may be outside this search.']:[]),
  'This file is a fixed planning snapshot and does not refresh. Recheck current orbital data and conditions in Nightjar before observing. Weather, terrain, brightness, source uncertainty and manoeuvres are not included; visibility is not guaranteed.'
 ].join('\n');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nightjar//ISS Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:iss-25544-${calendarTime(eventStart)}-${hash.toString(16)}@nightjar.local`,`DTSTAMP:${calendarTime(created)}`,`DTSTART:${calendarTime(eventStart)}`,`DTEND:${calendarTime(eventEnd)}`,`SUMMARY:${calendarText('ISS observing window at '+place.name)}`,`LOCATION:${calendarText(place.name)}`,`GEO:${place.latitude};${place.longitude}`,`DESCRIPTION:${calendarText(description)}`,'STATUS:TENTATIVE','TRANSP:TRANSPARENT','END:VEVENT','END:VCALENDAR',''].map(foldCalendarLine).join('\r\n');
}
