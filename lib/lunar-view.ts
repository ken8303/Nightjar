import {Libration} from 'astronomy-engine';
import {validObservingDate} from './observing-time';

export type LunarLibration={latitude:number;longitude:number;distanceKm:number;diameterArcminutes:number};
// Geocentric sub-Earth coordinates, in the same east-positive lunar system as
// the surface landmarks. This does not include observer parallax or sky roll.
export function lunarLibration(date:Date):LunarLibration|null{
 if(!validObservingDate(date))return null;
 try{
  const value=Libration(date);
  if(![value.elat,value.elon,value.dist_km,value.diam_deg].every(Number.isFinite)||Math.abs(value.elat)>90||Math.abs(value.elon)>180||value.dist_km<=0||value.diam_deg<=0)return null;
  return {latitude:value.elat,longitude:value.elon,distanceKm:value.dist_km,diameterArcminutes:value.diam_deg*60};
 }catch{return null}
}

// Globe axes: +X = 90°E, +Y = lunar north, +Z = 0° longitude.
// Use the same frame for camera, markers and approximate phase illumination.
export function lunarViewFrame(latitude:number,longitude:number,phase:number){
 if(![latitude,longitude,phase].every(Number.isFinite)||Math.abs(latitude)>90||Math.abs(longitude)>180)return null;
 const lat=latitude*Math.PI/180,lon=longitude*Math.PI/180,angle=phase*Math.PI/180;
 const direction:[number,number,number]=[Math.sin(lon)*Math.cos(lat),Math.sin(lat),Math.cos(lon)*Math.cos(lat)];
 const right:[number,number,number]=[Math.cos(lon),0,-Math.sin(lon)];
 const light=direction.map((value,index)=>right[index]*Math.sin(angle)-value*Math.cos(angle)) as [number,number,number];
 return {direction,light};
}
