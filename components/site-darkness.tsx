"use client";

import {useState} from 'react';
import type {Place} from '@/lib/sky';
import {useLanguage} from '@/components/language-provider';

export default function SiteDarkness({place,onChange,disabled=false}:{place:Place;onChange:(bortle:number|undefined)=>string|undefined;disabled?:boolean}){
 const {t}=useLanguage();
 const [error,setError]=useState('');
 return <div className="site-darkness">
  <label htmlFor="site-bortle">{t('siteDarkness.label')}</label>
  <select id="site-bortle" disabled={disabled} value={place.bortle??''} aria-describedby={error?'site-bortle-help site-bortle-feedback':'site-bortle-help'} onChange={event=>setError(onChange(event.target.value?Number(event.target.value):undefined)||'')}>
   <option value="">{t('siteDarkness.unrated')}</option>
   {Array.from({length:9},(_,index)=><option key={index+1} value={index+1}>{t('siteDarkness.class',{class:index+1})}{index===0?t('siteDarkness.darkest'):index===8?t('siteDarkness.brightest'):''}</option>)}
  </select>
  {error&&<p id="site-bortle-feedback" role="status" className="error">{error}</p>}
  <p id="site-bortle-help">{t('siteDarkness.help')}<a href="https://skyandtelescope.org/astronomy-resources/light-pollution-and-astronomy-the-bortle-dark-sky-scale/" target="_blank" rel="noreferrer">{t('siteDarkness.link')}</a></p>
 </div>;
}
