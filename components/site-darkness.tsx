"use client";

import type {Place} from '@/lib/sky';

export default function SiteDarkness({place,onChange}:{place:Place;onChange:(bortle:number|undefined)=>void}){
 return <div className="site-darkness">
  <label htmlFor="site-bortle">Your sky darkness rating</label>
  <select id="site-bortle" value={place.bortle??''} onChange={event=>onChange(event.target.value?Number(event.target.value):undefined)}>
   <option value="">Not rated</option>
   {Array.from({length:9},(_,index)=><option key={index+1} value={index+1}>Bortle class {index+1}{index===0?' · darkest':index===8?' · brightest':''}</option>)}
  </select>
  <p>Rate a site from your own observations: class 1 is the darkest sky, class 9 is a bright inner-city sky. This stays on this device and does not change the weather score. <a href="https://skyandtelescope.org/astronomy-resources/light-pollution-and-astronomy-the-bortle-dark-sky-scale/" target="_blank" rel="noreferrer">How to rate a sky ↗</a></p>
 </div>;
}
