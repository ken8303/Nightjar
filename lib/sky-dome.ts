// Local horizon frame: +X east, +Y overhead, -Z north. Radius is schematic.
// Zoom around the current orbit centre, which changes when a target is centred.
export function zoomCameraPosition(position:readonly [number,number,number],target:readonly [number,number,number],factor:number):[number,number,number]{
 const offset=position.map((value,index)=>value-target[index]);
 const distance=Math.hypot(...offset);
 if(!Number.isFinite(distance)||distance===0||!Number.isFinite(factor)||factor<=0)return [...position];
 const scale=Math.max(1.8,Math.min(5,distance*factor))/distance;
 return [target[0]+offset[0]*scale,target[1]+offset[1]*scale,target[2]+offset[2]*scale];
}
export function horizonVector(altitude:number,azimuth:number):[number,number,number]{
 const alt=altitude*Math.PI/180,az=azimuth*Math.PI/180;
 return [Math.cos(alt)*Math.sin(az),Math.sin(alt),-Math.cos(alt)*Math.cos(az)];
}
export function nearestProjectedTarget(points:{name:string;x:number;y:number;visible:boolean}[],x:number,y:number,radius=22){
 let nearest:string|undefined,distance=radius*radius;
 for(const point of points){if(!point.visible)continue;const squared=(point.x-x)**2+(point.y-y)**2;if(squared<distance){nearest=point.name;distance=squared}}
 return nearest;
}
