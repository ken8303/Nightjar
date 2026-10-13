"use client";

import {useState} from 'react';
import type {Place} from '@/lib/sky';

export default function SiteDarkness({place,onChange,disabled=false}:{place:Place;onChange:(bortle:number|undefined)=>string|undefined;disabled?:boolean}){
 const [error,setError]=useState('');
 return <div className="site-darkness">
  <label htmlFor="site-bortle">Your sky darkness rating</label>
  <select id="site-bortle" disabled={disabled} value={place.bortle??''} aria-describedby={error?'site-bortle-help site-bortle-feedback':'site-bortle-help'} onChange={event=>setError(onChange(event.target.value?Number(event.target.value):undefined)||'')}>
   <option value="">Not rated</option>
   {Array.from({length:9},(_,index)=><option key={index+1} value={index+1}>Bortle class {index+1}{index===0?' · darkest':index===8?' · brightest':''}</option>)}
  </select>
  {error&&<p id="site-bortle-feedback" role="status" className="error">{error}</p>}
  <p id="site-bortle-help">Rate a site from your own observations: class 1 is the darkest sky, class 9 is a bright inner-city sky. This stays on this device and does not change the weather score. <a href="https://skyandtelescope.org/astronomy-resources/light-pollution-and-astronomy-the-bortle-dark-sky-scale/" target="_blank" rel="noreferrer">How to rate a sky ↗</a></p>
 </div>;
}
