"use client";
import {lazy,useRef,useState} from 'react';
import type {Place} from '@/lib/sky';
import {ArrowUpRight} from 'lucide-react';
import DeferredView from '@/components/deferred-view';
import {hasLightPollutionCoverage,lightPollutionAtlas,lightPollutionZones} from '@/lib/light-pollution';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {useLanguage} from '@/components/language-provider';
const LightPollutionMap=lazy(()=>import('@/components/light-pollution-map'));

export default function LightPollutionReference({latitude,longitude,name,onChoose,savedSites,savedUnavailable}:{latitude:number;longitude:number;name:string;onChoose:(place:Place)=>void;savedSites:Place[];savedUnavailable:boolean}){
 const {t}=useLanguage();
 const [opened,setOpened]=useState(false),loadButton=useRef<HTMLButtonElement>(null);
 const covered=hasLightPollutionCoverage(latitude,longitude);
 return <div className="light-pollution-reference"><h3>{t('light.heading')}</h3><p className="muted">{t('light.intro')}</p>
  {covered?<><p className="footnote">{t('light.privacy')}</p><button ref={loadButton} type="button" className="button" aria-expanded={opened} onClick={event=>{const owner=event.currentTarget;setOpened(value=>!value);if(opened)deferFocusAndScroll(()=>loadButton.current,{owner})}}>{t(opened?'light.close':'light.load')}</button>{opened&&<DeferredView name="Light-pollution map"><LightPollutionMap latitude={latitude} longitude={longitude} name={name} onChoose={onChoose} savedSites={savedSites} savedUnavailable={savedUnavailable}/></DeferredView>}</>:<p className="footnote">{t('light.outsideSite')}</p>}
  <details className="light-pollution-legend"><summary>{t('light.legendTitle')}</summary><p className="footnote">{t('light.legendIntro')}</p><ul>{lightPollutionZones.map((entry,index)=><li key={entry.zone}><span aria-hidden="true" style={{background:entry.color}}/><span>{t('light.zone',{zone:entry.zone})}</span><strong>{Number.isFinite(entry.below)?`${index===0?'0':lightPollutionZones[index-1].below} – < ${entry.below}`:'≥ 46.77'}</strong></li>)}</ul><p className="footnote">{t('light.legendNote')}</p></details>
  <a className="button" href="https://djlorenz.github.io/astronomy/lp/overlay/dark.html" target="_blank" rel="noreferrer">{t('light.openSource')} <ArrowUpRight size={16}/><span className="sr-only">{t('light.newTab')}</span></a><p className="footnote">{t('light.source')} <a href={lightPollutionAtlas.source} target="_blank" rel="noreferrer">David Lorenz Light Pollution Atlas<span className="sr-only">{t('light.newTab')}</span></a> · <a href={lightPollutionAtlas.legend} target="_blank" rel="noreferrer">{t('light.colours')}<span className="sr-only">{t('light.newTab')}</span></a>. {t('light.yearNote')}</p>
 </div>;
}
