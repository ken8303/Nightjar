import {Place,nextObservingTime} from './sky';

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
export function readPlannerSetup(now=new Date()){
 let place=initialPlace,saved:Place[]=[],recovery:Date|null=null;
 try{const value:unknown=JSON.parse(localStorage.getItem('nightjar-place')||'null');if(validPlace(value))place=value}catch{}
 try{const value:unknown=JSON.parse(localStorage.getItem('nightjar-places')||'[]');if(Array.isArray(value))saved=value.filter(validPlace)}catch{}
 // Reading is repeatable for React Strict Mode; remove the token after mounting.
 try{const value:unknown=JSON.parse(sessionStorage.getItem('nightjar-recovery-time-v1')||'null');if(typeof value==='string'){const date=new Date(value);if(Number.isFinite(+date))recovery=date}}catch{}
 return {place,saved,date:recovery||nextObservingTime(now,place)};
}

export function samePlaceCoordinates(a:Place,b:Place){return Math.abs(a.latitude-b.latitude)<.0001&&Math.abs(a.longitude-b.longitude)<.0001}
export function resolveObservingPlace(candidate:Place,saved:Place[],current?:Place):Place{
 if(!validPlace(candidate))throw Error('Invalid observing place.');
 const known=saved.find(site=>samePlaceCoordinates(site,candidate));
 const active=current&&samePlaceCoordinates(current,candidate)?current:undefined;
 return {...candidate,country:candidate.country??known?.country??active?.country,timezone:candidate.timezone??known?.timezone??active?.timezone,bortle:candidate.bortle??known?.bortle??active?.bortle};
}
