'use client';
import {deepSkyTimestampFormatter} from '@/lib/deep-sky-time';
import {type DeepSkySample} from '@/lib/deep-sky';
import {type Place,timeLabel} from '@/lib/sky';
export default function DeepSkyTimeline({name,samples,place,onDate}:{name:string;samples:DeepSkySample[];place:Place;onDate:(date:Date)=>void}){
 if(!samples.length)return <section className="deep-sky-timeline"><p role="status">No supported planning samples are available.</p></section>;
 const intervals=Math.max(1,samples.length-1),ticks=[...new Set([0,.25,.5,.75,1].map(fraction=>Math.round((samples.length-1)*fraction)))];
 const zone=place.timezone||'UTC',stamp=deepSkyTimestampFormatter(samples[0].time,zone);
 const x=(index:number)=>40+index/intervals*920,y=(altitude:number)=>20+(90-altitude)/180*200;
 const light=(sun:number)=>sun<=-18?'Dark':sun<=-6?'Twilight':'Day / civil';
 const path=samples.map((sample,index)=>`${index?'L':'M'}${x(index).toFixed(2)},${y(sample.altitude).toFixed(2)}`).join(' ');
 return <section className="deep-sky-timeline" aria-label={`${name} ${samples.length<97?'available':'24-hour'} altitude planning`}><h3>{name} {samples.length<97?'over the available planning window':'over the next 24 hours'}</h3>{samples.length<97&&<p role="status" className="muted">This window stops before UTC year 10000. Only {samples.length} supported {samples.length===1?'sample remains':'samples remain'}.</p>}<p className="muted">Starting {stamp.format(samples[0].time)} at {place.name}. Choose an hourly sample to update the planner. Times in {zone}; offsets distinguish repeated clock-change hours.</p><svg viewBox="0 0 1000 255" role="img" aria-label={`${name} altitude curve from minus 90 to 90 degrees; shaded periods are full darkness and the dashed line marks 30 degrees`}>
 {samples.slice(0,-1).map((sample,index)=>sample.sun<=-18?<rect key={+sample.time} x={x(index)} y="20" width={920/intervals+.1} height="200" fill="#c1df93" fillOpacity=".08"/>:null)}
 {[-90,0,30,90].map(altitude=><g key={altitude}><line x1="40" x2="960" y1={y(altitude)} y2={y(altitude)} stroke={altitude===30?'#c1df93':'#49616a'} strokeDasharray={altitude===30?'6 5':undefined}/><text x="30" y={y(altitude)+4} textAnchor="end" fill="#a9bdc6" fontSize="13">{altitude}°</text></g>)}
 <path d={path} fill="none" stroke="#c1df93" strokeWidth="3"/>{samples.length===1&&<circle cx={x(0)} cy={y(samples[0].altitude)} r="4" fill="#c1df93"/>}
 {ticks.map(index=><text key={index} x={x(index)} y="245" textAnchor="middle" fill="#a9bdc6" fontSize="14">+{index/4}h</text>)}
 </svg><p className="footnote">Shading shows full darkness at 15-minute samples. The curve includes daylight and below-horizon positions; the hour buttons include exact dates and UTC offsets.</p><div className="deep-sky-hours">{samples.filter((_,index)=>index%4===0).map((sample,index)=><button key={+sample.time} className={sample.sun<=-18&&sample.altitude>30?'recommended':''} aria-label={`View ${name} at ${stamp.format(sample.time)}, altitude ${sample.altitude.toFixed(1)} degrees, ${light(sample.sun)}`} onClick={()=>onDate(sample.time)}><strong>{timeLabel(sample.time,zone)}</strong><span>{sample.altitude.toFixed(1)}°</span><small>{light(sample.sun)}</small><small>{stamp.format(sample.time)}</small>{index===24&&<small>+24 hours</small>}</button>)}</div></section>;
}
