"use client";

import {useEffect,useRef,useState} from 'react';
import {fetchLightPollutionSample,type LightPollutionCell,type LightPollutionSample} from '@/lib/light-pollution-sample';
import {lightPollutionAtlas} from '@/lib/light-pollution';
import {useLanguage} from '@/components/language-provider';
import {englishMessages} from '@/lib/messages/en';

const errors=['light.errorInvalid','light.errorNoValue','light.errorSize','light.errorDecode','light.errorProvider','light.errorNoData','light.errorTimeout','light.errorRead','light.errorUnavailable'] as const;
type Result={state:'idle'}|{state:'loading'}|{state:'error';message:string}|{state:'ready';sample:LightPollutionSample};
// Parent keys this component by grid cell; changing point retires its request.
export default function LightPollutionReading({cell,disabled}:{cell:LightPollutionCell;disabled:boolean}){
 const {language,t}=useLanguage();
 const [result,setResult]=useState<Result>({state:'idle'});
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>{request.current?.abort();request.current=null},[]);
 const read=async()=>{
  request.current?.abort();const controller=new AbortController();request.current=controller;setResult({state:'loading'});
  try{const sample=await fetchLightPollutionSample(cell,{signal:controller.signal});if(request.current===controller)setResult({state:'ready',sample})}
  catch(error){if(request.current===controller&&!controller.signal.aborted)setResult({state:'error',message:error instanceof Error?error.message:'Brightness data is unavailable. Try again later.'})}
  finally{if(request.current===controller)request.current=null}
 };
 const cancel=()=>{request.current?.abort();request.current=null;setResult({state:'idle'})};
 const localizeError=(message:string)=>{if(language==='en')return message;const key=errors.find(key=>englishMessages[key]===message);return key?t(key):message};
 return <div className="light-pollution-reading">
  <h4>{t('light.brightnessHeading')}</h4>
  <p className="footnote">{t('light.brightnessIntro',{year:lightPollutionAtlas.year})}</p>
  <button type="button" className="button" disabled={disabled&&result.state!=='loading'} onClick={result.state==='loading'?cancel:read}>{t(result.state==='loading'?'light.cancelReading':result.state==='error'?'light.retryReading':result.state==='ready'?'light.refreshReading':'light.readBrightness')}</button>
  <div role="status" aria-atomic="true">
   {result.state==='loading'&&<p>{t('light.loadingBrightness')}</p>}
   {result.state==='error'&&<p className="error">{localizeError(result.message)} {t('light.missing')}</p>}
   {result.state==='ready'&&<>
    <dl className="light-pollution-values"><div><dt>{t('light.total')}</dt><dd>{result.sample.magnitude.toFixed(2)} mag/arcsec²</dd></div><div><dt>{t('light.ratio')}</dt><dd>{result.sample.ratio.toFixed(result.sample.ratio<.1?3:result.sample.ratio<3?2:1)} ×</dd></div><div><dt>{t('light.colourZone')}</dt><dd>{result.sample.zone}</dd></div></dl>
    <p className="footnote">{t('light.cellNote',{latitude:result.sample.latitude.toFixed(4),longitude:result.sample.longitude.toFixed(4)})}</p>
   </>}
  </div>
  <p className="footnote">{t('light.modelNote')} <a href={lightPollutionAtlas.legend} target="_blank" rel="noreferrer">{t('light.assumptions')}<span className="sr-only">{t('light.newTab')}</span></a>.</p>
 </div>;
}
