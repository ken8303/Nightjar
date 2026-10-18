import catalogue from '../data/messier.json';
import {framingGuide} from './framing-guide';
import {imagingPlan} from './imaging-plan';
import {j2000Projector,type Place} from './sky';
import {validObservingDate} from './observing-time';
import {validPlace} from './planner-state';
import type {PhotographyDraft} from './photography-draft';
export type FramePosition={altitude:number;azimuth:number};
export type SkyImagingFrame={name:string;target:string;width:number;height:number;cols:number;rows:number;rotation:number;centre:FramePosition;panels:{number:number;centre:FramePosition;outline:FramePosition[]}[]};

// Gnomonic offsets use the same J2000 tangent plane and position-angle
// convention as the numbered guide and CSV. Sample edges before projection.
export function imagingFrameEquatorial(draft:PhotographyDraft){
 const plan=imagingPlan(draft);if(plan.mosaicError)throw Error(plan.mosaicError);
 const {ra,dec,cols,rows,overlap,rotation}=plan.values;
 const guide=framingGuide(plan.w,plan.h,cols,rows,overlap,rotation)!;
 const rad=Math.PI/180,a=ra*15*rad,d=dec*rad;
 const centre=[Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)],east=[-Math.sin(a),Math.cos(a),0],north=[-Math.sin(d)*Math.cos(a),-Math.sin(d)*Math.sin(a),Math.cos(d)];
 const position=(x:number,y:number)=>{
  const vector=centre.map((value,index)=>value+x*east[index]+y*north[index]);
  return {ra:((Math.atan2(vector[1],vector[0])/rad/15)%24+24)%24,dec:Math.atan2(vector[2],Math.hypot(vector[0],vector[1]))/rad};
 };
 const target=catalogue.find(item=>item.id===draft.catalogueId&&item.ra===ra&&item.dec===dec);
 return {name:plan.equipment.name,target:target?.id??'custom J2000 centre',width:plan.w,height:plan.h,cols,rows,rotation,centre:{ra,dec},panels:guide.panels.map((panel,index)=>({number:panel.number,centre:{ra:plan.panels[index].raHours,dec:plan.panels[index].decDegrees},outline:panel.corners.flatMap((first,side)=>{
  const last=panel.corners[(side+1)%4];
  return Array.from({length:8},(_,step)=>position(first.x+(last.x-first.x)*step/8,first.y+(last.y-first.y)*step/8));
 })}))};
}
export function skyImagingFrame(draft:PhotographyDraft,date:Date,place:Place):SkyImagingFrame{
 if(!validObservingDate(date)||!validPlace(place))throw Error('A valid observing site and time are required for the imaging grid.');
 const frame=imagingFrameEquatorial(draft),project=j2000Projector(date,place);
 return {...frame,centre:project(frame.centre.ra,frame.centre.dec),panels:frame.panels.map(panel=>({...panel,centre:project(panel.centre.ra,panel.centre.dec),outline:panel.outline.map(point=>project(point.ra,point.dec))}))};
}
// Clip sampled edges in sky directions before either viewer projects them.
// The 2D chart also keeps a circular clip for its rim and centre marker.
export function aboveHorizonFrameSegments(points:FramePosition[]){
 const vector=(point:FramePosition)=>{const a=point.altitude*Math.PI/180,z=point.azimuth*Math.PI/180;return [Math.cos(a)*Math.sin(z),Math.sin(a),-Math.cos(a)*Math.cos(z)] as [number,number,number]};
 const segments:[number,number,number][][]=[];
 for(let index=0;index<points.length;index++){
  let first=vector(points[index]),last=vector(points[(index+1)%points.length]);
  if(first[1]<0&&last[1]<0)continue;
  if(first[1]<0||last[1]<0){
   const ratio=-first[1]/(last[1]-first[1]),x=first[0]+ratio*(last[0]-first[0]),z=first[2]+ratio*(last[2]-first[2]),length=Math.hypot(x,z);
   const edge:[number,number,number]=[x/length,0,z/length];
   if(first[1]<0)first=edge;else last=edge;
  }
  segments.push([first,last]);
 }
 return segments;
}
