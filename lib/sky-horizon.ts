import {localHorizonAltitude,type LocalHorizon} from './local-horizon';

// The 2D atlas uses an azimuthal equidistant projection with zenith at
// (220, 195) and its ideal horizon at radius 166.
export function skyHorizonPath(horizon:LocalHorizon){
 return Array.from({length:361},(_,azimuth)=>{
  const altitude=localHorizonAltitude(horizon,azimuth),radius=(90-altitude)/90*166,angle=azimuth*Math.PI/180;
  return `${azimuth?'L':'M'}${(220-radius*Math.sin(angle)).toFixed(3)} ${(195-radius*Math.cos(angle)).toFixed(3)}`;
 }).join(' ')+' Z';
}
