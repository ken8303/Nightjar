"use client";
import {lazy,useState} from 'react';
import DeferredView from '@/components/deferred-view';
import {useLanguage} from '@/components/language-provider';
import type {Place} from '@/lib/sky';
import type {SatelliteWeather} from '@/lib/satellite-weather';
import type {SatelliteFreshness} from '@/lib/satellite-validity';
const SatelliteReading=lazy(()=>import('./satellite-reading'));
export default function SatelliteTracker({date,place,onDate,weather,onRefreshWeather}:{date:Date;place:Place;onDate:(date:Date,freshness:SatelliteFreshness)=>void;weather:SatelliteWeather;onRefreshWeather:()=>void}){
 const {t}=useLanguage();
 const [opened,setOpened]=useState(false);
 return <section className="panel satellite-tracker"><div className="section-label">{t('iss.heading')}</div><h2>{t('iss.title')}</h2><p className="muted">{t('iss.intro')}</p><button className="button" type="button" aria-expanded={opened} onClick={()=>setOpened(value=>!value)}>{t(opened?'iss.close':'iss.open')}</button>{opened&&<DeferredView name="ISS directions"><SatelliteReading date={date} place={place} onDate={onDate} weather={weather} onRefreshWeather={onRefreshWeather}/></DeferredView>}<p className="footnote">{t('iss.orbitSource')} <a href="https://celestrak.org/NORAD/documentation/gp-data-formats.php" target="_blank" rel="noreferrer">CelesTrak GP data<span className="sr-only">{t('iss.newTab')}</span></a> · {t('iss.calculations')} <a href="https://github.com/shashwatak/satellite-js" target="_blank" rel="noreferrer">satellite.js<span className="sr-only">{t('iss.newTab')}</span></a> · <a href="/licenses/satellite-js.txt" target="_blank" rel="noreferrer">{t('iss.license')}<span className="sr-only">{t('iss.newTab')}</span></a>. {t('iss.online')}</p></section>;
}
