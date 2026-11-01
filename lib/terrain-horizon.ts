import {validLocalHorizon} from './local-horizon';

// Eight bearings match the comparison's existing horizon representation.
// Sparse elevation samples miss narrow terrain and nearby obstacles.
export const terrainDistances=[250,500,1000,2000,5000,10000,20000,40000] as const;
const earthRadius=6371000;
export type TerrainPoint={latitude:number;longitude:number};
export function terrainSamplePoints(latitude:number,longitude:number):TerrainPoint[]{
 if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw Error('Invalid site coordinates');
 const lat=latitude*Math.PI/180,lon=longitude*Math.PI/180;
 const sinLat=Math.sin(lat),cosLat=Math.cos(lat),sinLon=Math.sin(lon),cosLon=Math.cos(lon);
 const points:TerrainPoint[]=[{latitude,longitude}];
 for(let direction=0;direction<8;direction++)for(const distance of terrainDistances){
  const bearing=direction*Math.PI/4,angle=distance/earthRadius;
  // Move along local north/east vectors. Unlike the usual longitude formula,
  // this remains stable at the poles, where its numerator and denominator
  // both approach zero. The chosen longitude defines the polar orientation.
  const north=Math.cos(bearing),east=Math.sin(bearing),along=Math.cos(angle),across=Math.sin(angle);
  const x=along*cosLat*cosLon+across*(-north*sinLat*cosLon-east*sinLon);
  const y=along*cosLat*sinLon+across*(-north*sinLat*sinLon+east*cosLon);
  const z=along*sinLat+across*north*cosLat;
  const targetLat=Math.atan2(z,Math.hypot(x,y)),targetLon=Math.atan2(y,x);
  points.push({latitude:targetLat*180/Math.PI,longitude:((targetLon*180/Math.PI+540)%360)-180});
 }
 return points;
}
export function calculateTerrainHorizon(values:unknown):number[]{
 if(!Array.isArray(values)||values.length!==1+8*terrainDistances.length||values.some(value=>typeof value!=='number'||!Number.isFinite(value)||value< -12000||value>9000))throw Error('Elevation data is incomplete');
 const base=values[0];const result=[];
 for(let direction=0;direction<8;direction++){
  let maximum=0;
  for(let step=0;step<terrainDistances.length;step++){
   const distance=terrainDistances[step],elevation=values[1+direction*terrainDistances.length+step];
   const angle=Math.atan2(elevation-base-distance*distance/(2*earthRadius),distance)*180/Math.PI;
   maximum=Math.max(maximum,angle);
  }
  result.push(Math.min(90,Math.ceil(maximum*10)/10));
 }
 if(!validLocalHorizon(result))throw Error('Invalid terrain horizon');
 return result;
}
