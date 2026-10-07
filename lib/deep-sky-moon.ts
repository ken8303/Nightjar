import {deepSkyPosition,type DeepSkyObject} from './deep-sky';
import {A,bodyPosition,moonInfo,type Place} from './sky';
export function skySeparation(first:{altitude:number;azimuth:number},second:{altitude:number;azimuth:number}){
 const radians=Math.PI/180,a=first.altitude*radians,b=second.altitude*radians;
 const cosine=Math.sin(a)*Math.sin(b)+Math.cos(a)*Math.cos(b)*Math.cos((first.azimuth-second.azimuth)*radians);
 return Math.acos(Math.max(-1,Math.min(1,cosine)))/radians;
}
export function deepSkyMoon(target:DeepSkyObject,date:Date,place:Place){
 const moon=bodyPosition(A.Body.Moon,date,place),info=moonInfo(date,place);
 return {date,name:info.name,illumination:info.illumination,altitude:moon.altitude,separation:skySeparation(deepSkyPosition(target,date,place),moon),belowHorizon:moon.altitude<=0};
}
export type DeepSkyMoon=ReturnType<typeof deepSkyMoon>;
