import {sunPos,jday,shadowFraction,eciToEcf,ecfToLookAngles,gstime} from 'satellite.js';
import {satelliteState} from './satellite-position';
import type {OrbitElements} from './satellite-elements';

type Vector={x:number;y:number;z:number};
export type SatelliteLighting={shadow:number;sunlight:'sunlit'|'partial-shadow'|'earth-shadow';sunAltitude:number};
const auKm=149597870.69098932;
export function orbitalShadow(sun:Vector,position:Vector){
 if(![sun.x,sun.y,sun.z,position.x,position.y,position.z].every(Number.isFinite)||Math.hypot(sun.x,sun.y,sun.z)<.9||Math.hypot(sun.x,sun.y,sun.z)>1.1||Math.hypot(position.x,position.y,position.z)<=6378.135)return null;
 const fraction=shadowFraction(sun,position);
 if(!Number.isFinite(fraction)||fraction< -1e-9||fraction>1+1e-9)return null;
 const shadow=Math.max(0,Math.min(1,fraction));
 return {shadow,sunlight:shadow===0?'sunlit' as const:shadow===1?'earth-shadow' as const:'partial-shadow' as const};
}
// Use the propagation library's documented Sun/ECI pairing, not the J2000
// catalogue projector. Its low-precision Sun model is limited to 1950–2050.
export function satelliteLighting(elements:OrbitElements,date:Date,latitude:number,longitude:number):SatelliteLighting|null{
 if(!Number.isFinite(+date)||date.getUTCFullYear()<1950||date.getUTCFullYear()>2050||!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)return null;
 const state=satelliteState(elements,date);if(!state)return null;
 try{
  const sun=sunPos(jday(date)).rsun,shadow=orbitalShadow(sun,state.position);if(!shadow)return null;
  const fixed=eciToEcf({x:sun.x*auKm,y:sun.y*auKm,z:sun.z*auKm},gstime(date));
  const sunAltitude=ecfToLookAngles({latitude:latitude*Math.PI/180,longitude:(longitude===180?-180:longitude)*Math.PI/180,height:0},fixed).elevation*180/Math.PI;
  return Number.isFinite(sunAltitude)?{...shadow,sunAltitude}:null;
 }catch{return null}
}
