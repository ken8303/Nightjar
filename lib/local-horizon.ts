// Eight user-entered horizon heights at N, NE, E, SE, S, SW, W and NW.
// Linear interpolation is an approximation, not a terrain survey.
import {numberEntryValue} from './number-entry';
export type LocalHorizon=readonly number[];
export function validLocalHorizon(value:readonly number[]):boolean{return value.length===8&&Array.from(value).every(height=>Number.isFinite(height)&&height>=0&&height<=90)}
export function parseLocalHorizonDraft(draft:readonly string[]):number[]|null{
 const heights=draft.map(value=>numberEntryValue(value)??NaN);
 return validLocalHorizon(heights)?heights:null;
}
export function localHorizonAltitude(profile:LocalHorizon,azimuth:number):number{
 if(!validLocalHorizon(profile)||!Number.isFinite(azimuth))throw Error('Enter eight horizon heights between 0 and 90 degrees.');
 const direction=((azimuth%360)+360)%360/45,index=Math.floor(direction),fraction=direction-index;
 return profile[index]*(1-fraction)+profile[(index+1)%8]*fraction;
}
export function aboveLocalHorizon(altitude:number,azimuth:number,profile?:LocalHorizon):boolean{
 return !profile||altitude>localHorizonAltitude(profile,azimuth);
}
