'use client';
import {useId,useMemo,type MouseEvent} from 'react';
import {type Place,lines,skyTargets,galacticCentrePosition} from '@/lib/sky';
import {layoutSkyLabels,nearestSkyPoint} from '@/lib/sky-labels';

export default function SkyChart({place,date,large=false,selected="",showLines=true,showLabels=true,showMilkyWay=false,onSelect}:{place:Place;date:Date;large?:boolean;selected?:string;showLines?:boolean;showLabels?:boolean;showMilkyWay?:boolean;onSelect?:(name:string)=>void}){
 const points=useMemo(()=>skyTargets(date,place).filter(target=>target.altitude>0).map(target=>{
  const radius=(90-target.altitude)/90*166,angle=target.azimuth*Math.PI/180;
  return {...target,x:Number((220-radius*Math.sin(angle)).toFixed(3)),y:Number((195-radius*Math.cos(angle)).toFixed(3))};
 }),[place,date]);
 const core=useMemo(()=>{const position=galacticCentrePosition(date,place),radius=(90-position.altitude)/90*166,angle=position.azimuth*Math.PI/180;return {...position,x:220-radius*Math.sin(angle),y:195-radius*Math.cos(angle)}},[date,place]);
 const labels=useMemo(()=>layoutSkyLabels(points,points.filter(point=>showLabels&&(large||point.mag<.4||point.planet)).map(point=>point.name),selected),[points,showLabels,large,selected]);
 const interactive=large&&Boolean(onSelect);
 const gradientId=`sky-${useId().replace(/:/g,'')}`;
 function selectNearest(event:MouseEvent<SVGSVGElement>){
  const svg=event.currentTarget,matrix=svg.getScreenCTM();if(!matrix)return;
  const screenPoint=svg.createSVGPoint();screenPoint.x=event.clientX;screenPoint.y=event.clientY;
  const local=screenPoint.matrixTransform(matrix.inverse()),name=nearestSkyPoint(points,local.x,local.y);
  if(name){
   onSelect?.(name);
   Array.from(svg.querySelectorAll<SVGGElement>('.sky-object')).find(element=>element.dataset.skyName===name)?.focus({preventScroll:true});
  }
 }
 return <svg className={large?'sky-chart large':'sky-chart'} viewBox="0 0 440 390" onClick={interactive?selectNearest:undefined} role={interactive?'group':'img'} aria-label={`Sky above ${place.name} at ${date.toISOString()}; north up and east left${selected?`; selected target ${selected}`:''}; star pattern lines ${showLines?'shown':'hidden'}; object labels ${showLabels?'shown':'hidden'}${showMilkyWay?'; Milky Way core direction shown when above horizon':''}`}>
  <defs><radialGradient id={gradientId}><stop stopColor="#14232e"/><stop offset="1" stopColor="#0c151d"/></radialGradient></defs>
  <circle cx="220" cy="195" r="167" fill={`url(#${gradientId})`} stroke="#516571"/>
  {[55,111].map(radius=><circle key={radius} cx="220" cy="195" r={radius} fill="none" stroke="#31434e" strokeDasharray="2 5"/>)}
  {Array.from({length:72},(_,i)=>{const angle=i*Math.PI/36,inner=i%6===0?159:163;return <line key={`tick-${i}`} x1={220+inner*Math.sin(angle)} y1={195-inner*Math.cos(angle)} x2={220+167*Math.sin(angle)} y2={195-167*Math.cos(angle)} stroke="#718591" strokeOpacity={i%6===0?.75:.35} strokeWidth=".6"/>})}
  <g fill="#8197a4" fontSize="9"><text x="225" y="139">60°</text><text x="225" y="83">30°</text></g>
  <path d="M53 195H387M220 28V362" stroke="#31434e" strokeDasharray="2 5"/>
  {showLines&&lines.flatMap((line,k)=>line.slice(1).map((name,i)=>{
   const a=points.find(point=>point.name===line[i]),b=points.find(point=>point.name===name);
   return a&&b?<line key={`${k}-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#578798" strokeOpacity=".6"/>:null;
  }))}
  {points.map(point=><g key={point.name} data-sky-name={point.name} className={interactive?'sky-object':''} role={interactive?'button':undefined} tabIndex={interactive?0:undefined} aria-label={interactive?`Select ${point.name} on sky chart, ${point.altitude.toFixed(1)}° altitude`:undefined} aria-pressed={interactive?selected===point.name:undefined} onClick={interactive?event=>{if(event.detail===0){event.stopPropagation();onSelect?.(point.name)}}:undefined} onKeyDown={interactive?event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect?.(point.name)}}:undefined}>
   {interactive&&<circle className="sky-hit" cx={point.x} cy={point.y} r="22" fill="transparent"/>}
   {selected===point.name&&<circle cx={point.x} cy={point.y} r="10" fill="none" stroke="#d4ee91" strokeWidth="2"/>}
   {point.planet&&<circle cx={point.x} cy={point.y} r="8" fill="#c1df93" opacity=".09"/>}
   <circle cx={point.x} cy={point.y} r={point.planet?4:Math.max(1.5,3.5-point.mag*.7)} fill={point.planet?'#dce6a1':'#e0f1fb'}/>
   {labels.has(point.name)&&<text className="sky-label" x={labels.get(point.name)!.x} y={labels.get(point.name)!.y} fill={point.planet?'#dce6a1':'#b7cad6'} fontSize="11">{point.name}</text>}
  </g>)}
  {showMilkyWay&&core.altitude>0&&<g className="galactic-core-marker" aria-label={`Milky Way core direction, ${core.altitude.toFixed(1)}° altitude`}><circle cx={core.x} cy={core.y} r="10" fill="none" stroke="#e9b990" strokeWidth="2" strokeDasharray="3 3"/><circle cx={core.x} cy={core.y} r="2.5" fill="#e9b990"/><text x={core.x+13} y={core.y-10} fill="#f1c9a4" fontSize="11">Core direction</text></g>}
  <g fill="#93a7b5" fontSize="12" textAnchor="middle"><text x="220" y="18">N</text><text x="220" y="382">S</text><text x="35" y="199">E</text><text x="407" y="199">W</text></g>
 </svg>;
}
