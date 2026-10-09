import {Place,nextObservingTime} from './sky';
import {parseObservingInstant,validObservingDate} from './observing-time';

export const currentPlannerContextKey='nightjar-current-context-v1',recoveryPlannerContextKey='nightjar-recovery-context-v1';
const contextPlace=(place:Place):Place=>({name:place.name,latitude:place.latitude,longitude:place.longitude,...(place.country!==undefined?{country:place.country}:{}),...(place.timezone!==undefined?{timezone:place.timezone}:{}),...(place.bortle!==undefined?{bortle:place.bortle}:{})});
export function serializePlannerContext(date:Date,place:Place){
 if(!validObservingDate(date)||!validPlace(place))throw Error('Invalid observing context.');
 return JSON.stringify({version:1,time:date.toISOString(),place:contextPlace(place)});
}
export function readPlannerContext(storage:Pick<Storage,'getItem'>,key:string):{date:Date;place:Place}|null{
 try{
  const raw=storage.getItem(key);if(raw===null||raw.length>4096)return null;
  const value:unknown=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const context=value as Record<string,unknown>,date=parseObservingInstant(context.time);
  return context.version===1&&date&&validPlace(context.place)?{date,place:contextPlace(context.place)}:null;
 }catch{return null}
}

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
export function parseSavedPlaces(raw:string|null):Place[]{
 if(raw&&raw.length>5*1024*1024)throw Error('The saved places could not be read.');
 const value:unknown=JSON.parse(raw===null?'[]':raw);
 if(!Array.isArray(value)||!value.every(validPlace))throw Error('The saved places contain invalid data.');
 return value;
}
export function readPlannerSetup(now=new Date()){
 const site=readObservingSite();let context:{date:Date;place:Place}|null=null;
 try{context=readPlannerContext(sessionStorage,recoveryPlannerContextKey)}catch{}
 const place=context?.place??site.place;let saved:Place[]=[],savedReadError=false,recovery:Date|null=context?.date??null;
 try{saved=parseSavedPlaces(localStorage.getItem('nightjar-places'))}catch{savedReadError=true}
 // Reading is repeatable for React Strict Mode; remove the token after mounting.
 if(!recovery)try{const value:unknown=JSON.parse(sessionStorage.getItem('nightjar-recovery-time-v1')||'null');recovery=parseObservingInstant(value)}catch{}
 return {place,saved,savedReadError,placeReadError:site.error,date:recovery||nextObservingTime(now,place)};
}

export function samePlaceCoordinates(a:Place,b:Place){return Math.abs(a.latitude-b.latitude)<.0001&&Math.abs(a.longitude-b.longitude)<.0001}
export function resolveObservingPlace(candidate:Place,saved:Place[],current?:Place):Place{
 if(!validPlace(candidate))throw Error('Invalid observing place.');
 const known=saved.find(site=>samePlaceCoordinates(site,candidate));
 const active=current&&samePlaceCoordinates(current,candidate)?current:undefined;
 return {...candidate,country:candidate.country??known?.country??active?.country,timezone:candidate.timezone??known?.timezone??active?.timezone,bortle:candidate.bortle??known?.bortle??active?.bortle};
}
