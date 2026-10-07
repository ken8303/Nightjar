import catalogue from '@/data/messier.json';
import {constellationName} from './constellations';
import {featuredDeepSkyPhoto} from './deep-sky-photos';
import {skySurveyPhoto} from '@/lib/object-photos';
import {A,j2000Position,j2000Projector,bodyPosition,type Place} from '@/lib/sky';
export const messierCatalogue=catalogue;
export type DeepSkyObject=(typeof catalogue)[number];
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

export function findDeepSky(query:string,type:string,{constellation='',maximumMagnitude}:{constellation?:string;maximumMagnitude?:number}={}){
 const normalize=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/^(m|ngc|ic)0+(?=\d)/,'$1');
 const normalized=normalize(query.trim());
 return catalogue.filter(target=>(!type||target.type===type)&&(!constellation||target.constellation===constellation)&&(maximumMagnitude===undefined||Number.isFinite(maximumMagnitude)&&target.magnitude!==null&&target.magnitude<=maximumMagnitude)&&[target.id,target.catalogue,target.name,target.constellation,constellationName(target.constellation)].some(value=>normalize(value).includes(normalized)));
}
export function deepSkyWindow(target:DeepSkyObject,date:Date,place:Place){
 return Array.from({length:97},(_,index)=>{
  const time=new Date(+date+index*15*60000);
  return {time,sun:bodyPosition(A.Body.Sun,time,place).altitude,...deepSkyPosition(target,time,place)};
 });
}
export type DeepSkySample=ReturnType<typeof deepSkyWindow>[number];
export function bestDeepSkySample(samples:DeepSkySample[]){
 return samples.reduce<DeepSkySample|null>((best,sample)=>sample.sun<=-18&&sample.altitude>30&&(!best||sample.altitude>best.altitude)?sample:best,null);
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
 if(targets.length>109)throw Error('Plan up to 109 deep-sky targets at once.');
 if(!targets.length)return new Map<string,{date:Date;altitude:number;azimuth:number}>();
 const darkTimes=Array.from({length:97},(_,index)=>new Date(+date+index*900000)).filter(time=>bodyPosition(A.Body.Sun,time,place).altitude<=-18).map(time=>({time,project:j2000Projector(time,place)}));
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
