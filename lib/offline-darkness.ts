/*! Deep-sky coordinates adapted from OpenNGC by Mattia Verga and contributors, CC BY-SA 4.0: https://github.com/mattiaverga/OpenNGC ; https://creativecommons.org/licenses/by-sa/4.0/ */
import {darknessSummaryLines} from './darkness-remaining';
import {validObservingDate} from './observing-time';
import {isAstronomicalNight,j2000Position,nextAstronomicalDarkness,type Place} from './sky';
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
