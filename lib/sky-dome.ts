// Local horizon frame: +X east, +Y overhead, -Z north. Radius is schematic.
export function horizonVector(altitude:number,azimuth:number):[number,number,number]{
 const alt=altitude*Math.PI/180,az=azimuth*Math.PI/180;
 return [Math.cos(alt)*Math.sin(az),Math.sin(alt),-Math.cos(alt)*Math.cos(az)];
}
export function nearestProjectedTarget(points:{name:string;x:number;y:number;visible:boolean}[],x:number,y:number,radius=22){
 let nearest:string|undefined,distance=radius*radius;
 for(const point of points){if(!point.visible)continue;const squared=(point.x-x)**2+(point.y-y)**2;if(squared<distance){nearest=point.name;distance=squared}}
 return nearest;
}
