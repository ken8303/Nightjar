import {Place,nextObservingTime} from './sky';
import {parseObservingInstant} from './observing-time';

export const initialPlace:Place={name:'London',latitude:51.5085,longitude:-.1257,country:'United Kingdom',timezone:'Europe/London'};
export function validPlace(value:unknown):value is Place{
 if(!value||typeof value!=='object')return false;
 const p=value as Record<string,unknown>;
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>=200||typeof p.latitude!=='number'||!Number.isFinite(p.latitude)||Math.abs(p.latitude)>90||typeof p.longitude!=='number'||!Number.isFinite(p.longitude)||Math.abs(p.longitude)>180)return false;
 if(p.country!==undefined&&(typeof p.country!=='string'||p.country.length>=200))return false;
 if(p.bortle!==undefined&&(typeof p.bortle!=='number'||!Number.isInteger(p.bortle)||p.bortle<1||p.bortle>9))return false;
 if(p.timezone!==undefined){if(typeof p.timezone!=='string')return false;try{new Intl.DateTimeFormat('en',{timeZone:p.timezone})}catch{return false}}
 return true;
}
export function readObservingSite(storage?:Pick<Storage,'getItem'>):{place:Place;error:boolean}{
 try{
  const raw=(storage??localStorage).getItem('nightjar-place');
  if(raw===null)return {place:initialPlace,error:false};
  if(raw.length>5*1024*1024)throw Error('Stored site is too large.');
  const value:unknown=JSON.parse(raw);if(!validPlace(value))throw Error('Invalid stored site.');
  return {place:value,error:false};
 }catch{return {place:initialPlace,error:true}}
}
export function readPlannerSetup(now=new Date()){
 const site=readObservingSite(),place=site.place;let saved:Place[]=[],recovery:Date|null=null;
 try{const value:unknown=JSON.parse(localStorage.getItem('nightjar-places')||'[]');if(Array.isArray(value))saved=value.filter(validPlace)}catch{}
 // Reading is repeatable for React Strict Mode; remove the token after mounting.
 try{const value:unknown=JSON.parse(sessionStorage.getItem('nightjar-recovery-time-v1')||'null');recovery=parseObservingInstant(value)}catch{}
 return {place,saved,placeReadError:site.error,date:recovery||nextObservingTime(now,place)};
}

export function samePlaceCoordinates(a:Place,b:Place){return Math.abs(a.latitude-b.latitude)<.0001&&Math.abs(a.longitude-b.longitude)<.0001}
export function resolveObservingPlace(candidate:Place,saved:Place[],current?:Place):Place{
 if(!validPlace(candidate))throw Error('Invalid observing place.');
 const known=saved.find(site=>samePlaceCoordinates(site,candidate));
 const active=current&&samePlaceCoordinates(current,candidate)?current:undefined;
 return {...candidate,country:candidate.country??known?.country??active?.country,timezone:candidate.timezone??known?.timezone??active?.timezone,bortle:candidate.bortle??known?.bortle??active?.bortle};
}
