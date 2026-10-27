import catalogue from '@/data/messier.json';
import additional from '@/data/additional-deep-sky.json';
import {validObservingDate} from './observing-time';
import {constellationName} from './constellations';
import {featuredDeepSkyPhoto} from './deep-sky-photos';
import {skySurveyPhoto} from '@/lib/object-photos';
import {j2000Position,j2000Projector,type Place,sunAltitude} from '@/lib/sky';
export type DeepSkyObject={id:string;catalogue:string;name:string;type:string;constellation:string;ra:number;dec:number;magnitude:number|null;major:number|null;minor:number|null;positionAngle:number|null;crossReferences?:string[]};
export const messierCatalogue:DeepSkyObject[]=catalogue;
export const deepSkyCatalogue:DeepSkyObject[]=[...catalogue,...additional];

import {deepSkyName,deepSkyNames} from './deep-sky-names';
export {deepSkyName,deepSkyNames};
export function deepSkyPosition(target:DeepSkyObject,date:Date,place:Place){
 // Horizontal positions never overwrite the source catalogue's J2000 RA/Dec.
 return j2000Position(target.ra,target.dec,date,place);
}

export function deepSkyPositions(targets:DeepSkyObject[],date:Date,place:Place){
 const project=j2000Projector(date,place);
 return targets.map(target=>({...target,...project(target.ra,target.dec)}));
}

export type DeepSkyCatalogueFilter=''|'messier'|'ngc'|'ic';
const normalizeDeepSkySearch=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[‘’]/g,"'").replace(/\s+/g,'').replace(/^messier(?=\d)/,'m').replace(/^(m|ngc|ic)0+(?=\d)/,'$1');
export function exactDeepSkyIdentifier(target:DeepSkyObject,query:string){
 const normalized=normalizeDeepSkySearch(query.trim());
 return Boolean(normalized)&&[target.id,target.catalogue,...(target.crossReferences??[])].some(value=>normalizeDeepSkySearch(value)===normalized);
}
export function findDeepSky(query:string,type:string,{constellation='',catalogue='',maximumMagnitude,unknownMagnitudeOnly=false,savedIds}:{constellation?:string;catalogue?:DeepSkyCatalogueFilter;maximumMagnitude?:number;unknownMagnitudeOnly?:boolean;savedIds?:readonly string[]}={}){
 const normalize=normalizeDeepSkySearch;
 const normalized=normalize(query.trim());
 const subset=savedIds===undefined?null:new Set(savedIds);
 return deepSkyCatalogue.filter(target=>(!subset||subset.has(target.id))&&(!catalogue||(catalogue==='messier'?target.id.startsWith('M'):target.id.startsWith(catalogue.toUpperCase())))&&(!type||target.type===type)&&(!constellation||target.constellation===constellation)&&(!unknownMagnitudeOnly||target.magnitude===null)&&(maximumMagnitude===undefined||Number.isFinite(maximumMagnitude)&&target.magnitude!==null&&target.magnitude<=maximumMagnitude)&&[target.id,target.catalogue,target.name,target.constellation,constellationName(target.constellation),...(target.crossReferences??[])].some(value=>normalize(value).includes(normalized)));
}
export function deepSkySampleTimes(date:Date){
 if(!validObservingDate(date))throw Error('Choose an observing time within UTC years 1–9999.');
 return Array.from({length:97},(_,index)=>new Date(+date+index*900000)).filter(validObservingDate);
}
export function deepSkyWindow(target:DeepSkyObject,date:Date,place:Place){
 return deepSkySampleTimes(date).map(time=>{
  return {time,sun:sunAltitude(time,place),...deepSkyPosition(target,time,place)};
 });
}
export type DeepSkySample=ReturnType<typeof deepSkyWindow>[number];
export function bestDeepSkySample(samples:DeepSkySample[]){
 return samples.reduce<DeepSkySample|null>((best,sample)=>sample.sun<-18&&sample.altitude>30&&(!best||sample.altitude>best.altitude)?sample:best,null);
}
export function bestDeepSkyTime(target:DeepSkyObject,date:Date,place:Place){
 const best=bestDeepSkySample(deepSkyWindow(target,date,place));
 return best?{date:best.time,altitude:best.altitude,azimuth:best.azimuth}:null;
}
export function deepSkyPhoto(target:DeepSkyObject,mode:'reference'|'survey'='reference'){
 const featured=mode==='reference'?featuredDeepSkyPhoto(target.id):undefined;if(featured)return featured;
 const field=Math.min(60,Math.max(15,Math.ceil((target.major??12)*1.25)));
 const photo=skySurveyPhoto(target.id,target.ra,target.dec,field);
 return {...photo,title:'Deep-sky survey field',caption:`Archival red-band photographic field, ${field} × ${field} arcminutes, centred on ${target.id}. ${target.major!==null&&target.major>field?'This shows the central region; the catalogue object extends beyond the frame.':'A survey reference, not a live view or a prediction of visual appearance.'}`};
}

// Share the Sun samples across the catalogue; search text does not need to
// recalculate the same 24-hour opportunity window for each keystroke.
export function deepSkyRecommendations(targets:DeepSkyObject[],date:Date,place:Place){
 if(targets.length>deepSkyCatalogue.length)throw Error(`Plan up to ${deepSkyCatalogue.length} deep-sky targets at once.`);
 if(!targets.length)return new Map<string,{date:Date;altitude:number;azimuth:number}>();
 const darkTimes=deepSkySampleTimes(date).filter(time=>sunAltitude(time,place)<-18).map(time=>({time,project:j2000Projector(time,place)}));
 const recommendations=new Map<string,{date:Date;altitude:number;azimuth:number}>();
 for(const target of targets){
  let best:{date:Date;altitude:number;azimuth:number}|null=null;
  for(const {time,project} of darkTimes){const position=project(target.ra,target.dec);if(position.altitude>30&&(!best||position.altitude>best.altitude))best={date:time,altitude:position.altitude,azimuth:position.azimuth}}
  if(best)recommendations.set(target.id,best);
 }
 return recommendations;
}

export function deepSkyPlanNotes(target:DeepSkyObject){
 const aliases=deepSkyNames(target).aliases;
 return [`${target.type} · ${constellationName(target.constellation)} (${target.constellation})`,`Catalogue: ${target.catalogue}`,...(aliases.length?[`Also known as: ${aliases.join(', ')}`]:[]),`J2000: RA ${target.ra.toFixed(5)} h · Dec ${target.dec.toFixed(5)}°`,`Visual magnitude: ${target.magnitude??'not listed'}`,`Angular major axis: ${target.major===null?'not listed':`${target.major} arcminutes`}`].join('\n');
}
