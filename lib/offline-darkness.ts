/*! Deep-sky coordinates adapted from OpenNGC by Mattia Verga and contributors, CC BY-SA 4.0: https://github.com/mattiaverga/OpenNGC ; https://creativecommons.org/licenses/by-sa/4.0/ */
import {darknessSummaryLines} from './darkness-remaining';
import {bestDeepSkyTime,deepSkySampleTimes} from './deep-sky';
import {validObservingDate} from './observing-time';
import {A,bodyPosition,isAstronomicalNight,j2000Position,nextAstronomicalDarkness,skyBodies,stars,sunAltitude,type Place} from './sky';
import messier from '../data/messier.json';
import additional from '../data/additional-deep-sky.json';

// The offline page supplies an explicitly selected saved snapshot, not live weather.
export function offlineDarknessDetails(time:string,place:Place){
 const date=new Date(time);
 if(!validObservingDate(date)||date.toISOString()!==time||!Number.isFinite(place.latitude)||Math.abs(place.latitude)>90||!Number.isFinite(place.longitude)||Math.abs(place.longitude)>180)throw Error('A valid saved time and site are required.');
 const lines=darknessSummaryLines(date,place),dark=isAstronomicalNight(date,place);
 let next:string|null=null;
 if(!dark){
  const candidate=nextAstronomicalDarkness(date,place);next=candidate?.toISOString()??null;
  lines.push(next?`Next fully dark time UTC: ${next}`:'No full darkness found within 48 hours or before the supported date limit.');
 }
 return {lines,next,dark};
}
export function offlineDarkness(time:string,place:Place){return offlineDarknessDetails(time,place).lines}

export function offlineDeepSkyPosition(time:string,place:Place,id:string){
 const {dark}=offlineDarknessDetails(time,place);
 if(!dark)throw Error('Target positions are available only during full astronomical darkness.');
 const target=[...messier,...additional].find(item=>item.id===id);
 if(!target)throw Error('This target is not in the offline catalogue.');
 return j2000Position(target.ra,target.dec,new Date(time),place);
}

export const offlineBrightTargetNames=[...stars.map(star=>star[0]),...skyBodies.map(String)];
export function offlineBrightPosition(time:string,place:Place,name:string){
 const {dark}=offlineDarknessDetails(time,place);
 if(!dark)throw Error('Target positions are available only during full astronomical darkness.');
 const star=stars.find(item=>item[0]===name);
 if(star)return j2000Position(star[1],star[2],new Date(time),place);
 const body=skyBodies.find(item=>String(item)===name);
 if(!body)throw Error('This target is not in the offline catalogue.');
 const position=bodyPosition(body as A.Body,new Date(time),place);
 return {altitude:position.altitude,azimuth:position.azimuth};
}

// Match the planner's 15-minute samples and its strict darkness/altitude criteria.
export function offlineDeepSkyBest(time:string,place:Place,id:string){
 const {dark}=offlineDarknessDetails(time,place);
 if(!dark)throw Error('Start from a time during full astronomical darkness.');
 const target=[...messier,...additional].find(item=>item.id===id);
 if(!target)throw Error('This target is not in the offline catalogue.');
 const best=bestDeepSkyTime(target,new Date(time),place);
 return best?{time:best.date.toISOString(),altitude:best.altitude,azimuth:best.azimuth}:null;
}

// Solar-system positions change with time; calculate them at every dark sample.
export function offlineBrightBest(time:string,place:Place,name:string){
 const {dark}=offlineDarknessDetails(time,place);
 if(!dark)throw Error('Start from a time during full astronomical darkness.');
 const star=stars.find(item=>item[0]===name),body=skyBodies.find(item=>String(item)===name);
 if(!star&&!body)throw Error('This target is not in the offline catalogue.');
 let best:{time:string;altitude:number;azimuth:number}|null=null;
 for(const date of deepSkySampleTimes(new Date(time))){
  if(!(sunAltitude(date,place)<-18))continue;
  const position=star?j2000Position(star[1],star[2],date,place):bodyPosition(body as A.Body,date,place);
  if(position.altitude>30&&(!best||position.altitude>best.altitude))best={time:date.toISOString(),altitude:position.altitude,azimuth:position.azimuth};
 }
 return best;
}
