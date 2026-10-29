"use client";

import {useState} from 'react';
import type {Place} from '@/lib/sky';
import {useLanguage} from '@/components/language-provider';

export default function SiteDarkness({place,onChange,disabled=false}:{place:Place;onChange:(bortle:number|undefined)=>string|undefined;disabled?:boolean}){
 const {tr}=useLanguage();
 const [error,setError]=useState('');
 return <div className="site-darkness">
  <label htmlFor="site-bortle">{tr('Your sky darkness rating','你的天空黑暗度評級')}</label>
  <select id="site-bortle" disabled={disabled} value={place.bortle??''} aria-describedby={error?'site-bortle-help site-bortle-feedback':'site-bortle-help'} onChange={event=>setError(onChange(event.target.value?Number(event.target.value):undefined)||'')}>
   <option value="">{tr('Not rated','尚未評級')}</option>
   {Array.from({length:9},(_,index)=><option key={index+1} value={index+1}>{tr(`Bortle class ${index+1}`,`Bortle ${index+1} 級`)}{index===0?tr(' · darkest',' · 最暗'):index===8?tr(' · brightest',' · 最亮'):''}</option>)}
  </select>
  {error&&<p id="site-bortle-feedback" role="status" className="error">{error}</p>}
  <p id="site-bortle-help">{tr('Rate a site from your own observations: class 1 is the darkest sky, class 9 is a bright inner-city sky. This stays on this device and does not change the weather score. ','根據自己的觀測評級：1 級最暗，9 級為明亮的市中心天空。評級儲存於此裝置，不會改變天氣評分。')}<a href="https://skyandtelescope.org/astronomy-resources/light-pollution-and-astronomy-the-bortle-dark-sky-scale/" target="_blank" rel="noreferrer">{tr('How to rate a sky ↗','如何評估天空黑暗度 ↗')}</a></p>
 </div>;
}
