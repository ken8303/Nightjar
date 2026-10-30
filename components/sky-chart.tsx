'use client';
import {useId,useMemo,type MouseEvent} from 'react';
import {type Place,lines,skyTargets,galacticCentrePosition} from '@/lib/sky';
import {aboveHorizonFrameSegments,type FramePosition,type SkyImagingFrame} from '@/lib/sky-framing';
import {layoutSkyLabels,nearestSkyPoint} from '@/lib/sky-labels';
import {useLanguage} from '@/components/language-provider';
import {skyTargetAlias,skyTargetLabel} from '@/lib/language';

// Clip in sky directions first: projecting a segment near the nadir can
// otherwise join opposite azimuths through the visible overhead chart.
function imagingFramePath(points:FramePosition[]){
 return aboveHorizonFrameSegments(points).map(segment=>segment.map(([east,up,north],index)=>{
  const horizontal=Math.hypot(east,north),radius=Math.atan2(horizontal,up)/(Math.PI/2)*166;
  const x=horizontal?220-radius*east/horizontal:220,y=horizontal?195+radius*north/horizontal:195;
  return (index?'L':'M')+x.toFixed(3)+' '+y.toFixed(3);
 }).join(' ')).join(' ');
}
export default function SkyChart({place,date,large=false,selected="",showLines=true,showLabels=true,showMilkyWay=false,imagingFrame,onSelect}:{place:Place;date:Date;large?:boolean;selected?:string;showLines?:boolean;showLabels?:boolean;showMilkyWay?:boolean;imagingFrame?:SkyImagingFrame;onSelect?:(name:string)=>void}){
 const {language,t}=useLanguage();
 const points=useMemo(()=>skyTargets(date,place).filter(target=>target.altitude>0).map(target=>{
  const radius=(90-target.altitude)/90*166,angle=target.azimuth*Math.PI/180;
  return {...target,label:language==='zh-Hant'?skyTargetAlias(target.name)||target.name:target.name,x:Number((220-radius*Math.sin(angle)).toFixed(3)),y:Number((195-radius*Math.cos(angle)).toFixed(3))};
 }),[place,date,language]);
 const core=useMemo(()=>{const position=galacticCentrePosition(date,place),radius=(90-position.altitude)/90*166,angle=position.azimuth*Math.PI/180;return {...position,x:220-radius*Math.sin(angle),y:195-radius*Math.cos(angle)}},[date,place]);
 const labels=useMemo(()=>{
  const marker=showMilkyWay&&core.altitude>0?{name:'Core direction',label:t('dome.core'),x:core.x,y:core.y,mag:99}:null;
  return layoutSkyLabels(marker?[...points,marker]:points,[...points.filter(point=>showLabels&&(large||point.mag<.4||point.planet)).map(point=>point.name),...(marker?[marker.name]:[])],selected);
 },[points,core,showMilkyWay,showLabels,large,selected,t]);
 const coreLabel=labels.get('Core direction');
 const interactive=large&&Boolean(onSelect);
 const gradientId=`sky-${useId().replace(/:/g,'')}`;
 function selectObject(name:string,svg:SVGSVGElement){
  onSelect?.(name);
  Array.from(svg.querySelectorAll<SVGGElement>('.sky-object')).find(element=>element.dataset.skyName===name)?.focus({preventScroll:true});
 }
 function selectNearest(event:MouseEvent<SVGSVGElement>){
  const svg=event.currentTarget,matrix=svg.getScreenCTM();if(!matrix)return;
  const screenPoint=svg.createSVGPoint();screenPoint.x=event.clientX;screenPoint.y=event.clientY;
  const local=screenPoint.matrixTransform(matrix.inverse()),name=nearestSkyPoint(points,local.x,local.y);
  if(name)selectObject(name,svg);
 }
 return <svg className={large?'sky-chart large':'sky-chart'} viewBox="0 0 440 390" onClick={interactive?selectNearest:undefined} role={interactive?'group':'img'} aria-label={t('chart.description',{place:place.name,date:date.toISOString()})+(selected?t('chart.selected',{name:skyTargetLabel(selected,language)}):'')+t(showLines?'chart.linesOn':'chart.linesOff')+t(showLabels?'chart.labelsOn':'chart.labelsOff')+(showMilkyWay?t('chart.coreOn'):'')}>
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
  {imagingFrame&&<g className="sky-imaging-frame" role="img" aria-label={t('chart.frame',{target:imagingFrame.target,columns:imagingFrame.cols,rows:imagingFrame.rows})} pointerEvents="none"><defs><clipPath id={gradientId+'-frame'}><circle cx="220" cy="195" r="166"/></clipPath></defs><g clipPath={'url(#'+gradientId+'-frame)'}>{imagingFrame.panels.map(panel=><path key={panel.number} d={imagingFramePath(panel.outline)} fill="none" stroke="#83d8e7" strokeWidth="1.25" vectorEffect="non-scaling-stroke"/>)}{imagingFrame.centre.altitude>0&&(()=>{const radius=(90-imagingFrame.centre.altitude)/90*166,angle=imagingFrame.centre.azimuth*Math.PI/180,x=220-radius*Math.sin(angle),y=195-radius*Math.cos(angle);return <g><circle cx={x} cy={y} r="3" fill="#83d8e7"/><text x={x+7} y={y-7} fill="#83d8e7" fontSize="10">{t('dome.imagingGrid',{target:imagingFrame.target})}</text></g>})()}</g></g>}
  {points.map(point=><g key={point.name} data-sky-name={point.name} className={interactive?'sky-object':''} role={interactive?'button':undefined} tabIndex={interactive?0:undefined} aria-label={interactive?t('chart.select',{name:skyTargetLabel(point.name,language),altitude:point.altitude.toFixed(1)}):undefined} aria-pressed={interactive?selected===point.name:undefined} onClick={interactive?event=>{if(event.detail===0){event.stopPropagation();onSelect?.(point.name)}}:undefined} onKeyDown={interactive?event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect?.(point.name)}}:undefined}>
   {interactive&&<circle className="sky-hit" cx={point.x} cy={point.y} r="22" fill="transparent"/>}
   {selected===point.name&&<circle className="sky-selection-ring" cx={point.x} cy={point.y} r="10" fill="none" stroke="#d4ee91" strokeWidth="2"/>}
   {point.planet&&<circle cx={point.x} cy={point.y} r="8" fill="#c1df93" opacity=".09"/>}
   <circle cx={point.x} cy={point.y} r={point.planet?4:Math.max(1.5,3.5-point.mag*.7)} fill={point.planet?'#dce6a1':'#e0f1fb'}/>
   {labels.has(point.name)&&<text onClick={interactive?event=>{event.stopPropagation();const svg=event.currentTarget.ownerSVGElement;if(svg)selectObject(point.name,svg)}:undefined} className="sky-label" x={labels.get(point.name)!.x} y={labels.get(point.name)!.y} fill={point.planet?'#dce6a1':'#b7cad6'} fontSize="11">{point.label}</text>}
  </g>)}
  {showMilkyWay&&core.altitude>0&&<g className="galactic-core-marker" aria-label={t('chart.coreAltitude',{altitude:core.altitude.toFixed(1)})}><circle cx={core.x} cy={core.y} r="10" fill="none" stroke="#e9b990" strokeWidth="2" strokeDasharray="3 3"/><circle cx={core.x} cy={core.y} r="2.5" fill="#e9b990"/>{coreLabel&&<text x={coreLabel.x} y={coreLabel.y} fill="#f1c9a4" fontSize="11">{t('dome.core')}</text>}</g>}
  <g fill="#93a7b5" fontSize="12" textAnchor="middle"><text x="220" y="18">{t('bright.directionN')}</text><text x="220" y="382">{t('bright.directionS')}</text><text x="35" y="199">{t('bright.directionE')}</text><text x="407" y="199">{t('bright.directionW')}</text></g>
 </svg>;
}
