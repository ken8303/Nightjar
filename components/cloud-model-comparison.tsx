'use client';
import {useEffect,useRef,useState} from 'react';
import {cloudModelsAt,parseCloudModelResponse,type CloudModels} from '@/lib/cloud-models';
import {isAstronomicalNight,type Place} from '@/lib/sky';
import {forecastHourLabel} from '@/lib/weather-planning';
import {useLanguage} from '@/components/language-provider';

type Result={key:string;kind:'loading'|'error'|'ready';data?:CloudModels;fetchedAt?:string};
function CloudModelRow({name,value}:{name:string;value:number|null|undefined}){
 const {tr}=useLanguage();
 const available=typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
 const amount=available?Math.round(value):null;
 return <div><dt>{name}</dt><dd>{amount===null?tr('Unavailable','無資料'):`${amount}%`}<span className={`cloud-model-bar${amount===null?' unavailable':''}`} aria-hidden="true">{amount!==null&&<span style={{width:`${amount}%`}}/>}</span></dd></div>;
}
export default function CloudModelComparison({place,date}:{place:Place;date:Date}){
 const {language,tr}=useLanguage();
 const key=JSON.stringify([place.latitude,place.longitude,+date]);
 const [result,setResult]=useState<Result|null>(null),pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null},[key]);
 // Retire the previous snapshot permanently when the site or instant changes.
 if(result&&result.key!==key)setResult(null);
 const active=result?.key===key?result:null;
 const dark=isAstronomicalNight(date,place);
 async function compare(){
  if(!dark)return;
  pending.current?.abort();const controller=new AbortController();pending.current=controller;
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort()},15000);
  setResult({key,kind:'loading'});
  try{
   const params=new URLSearchParams({lat:String(place.latitude),lon:String(place.longitude)});
   const response=await fetch(`/api/cloud-models?${params}`,{signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw Error('Unavailable');
   const data=parseCloudModelResponse(await response.json());
   if(!controller.signal.aborted&&pending.current===controller)setResult({key,kind:'ready',data,fetchedAt:new Date().toISOString()});
  }catch{if(pending.current===controller&&(!controller.signal.aborted||timedOut))setResult({key,kind:'error'})}
  finally{clearTimeout(timer);if(pending.current===controller)pending.current=null}
 }
 if(!dark)return null;
 const values=active?.kind==='ready'&&active.data?cloudModelsAt(active.data,date):null;
 return <section className="panel cloud-model-comparison" aria-labelledby="cloud-model-heading"><h2 id="cloud-model-heading">{tr('Compare cloud forecasts','比較雲量預報')}</h2><p className="muted">{tr(`Check three global model estimates for ${place.name} at your selected fully dark time. The comparison is requested only when you choose it.`,`比較 ${place.name} 在所選完全黑夜時間的三個全球模式預報。只有按下按鈕才會取得資料。`)}</p><button className="button" type="button" onClick={compare} disabled={active?.kind==='loading'}>{active?.kind==='loading'?tr('Checking cloud models…','正在取得模式預報…'):active?tr('Refresh cloud models','更新模式預報'):tr('Compare cloud models','比較模式預報')}</button>{active?.kind==='error'&&<p role="status">{tr('Cloud model comparison is unavailable. Try again.','無法取得雲量模式比較，請重試。')}</p>}{active?.kind==='ready'&&<div role="status"><p className="cloud-model-stamps">{tr('Selected time: ','所選時間：')}<time dateTime={date.toISOString()}>{forecastHourLabel(date,place.timezone||'UTC',language==='zh-Hant'?'zh-Hant':'en-GB').full}</time>{place.timezone?'':tr(' · site time zone unavailable',' · 地點時區無法取得')}<br/>{tr('Retrieved: ','取得時間：')}{active.fetchedAt&&<time dateTime={active.fetchedAt}>{forecastHourLabel(new Date(active.fetchedAt),place.timezone||'UTC',language==='zh-Hant'?'zh-Hant':'en-GB').full}</time>}</p>{values?<dl><CloudModelRow name="ECMWF IFS 0.25°" value={values.ecmwf}/><CloudModelRow name="DWD ICON global" value={values.icon}/><CloudModelRow name="NOAA GFS global" value={values.gfs}/></dl>:<p>{tr('No model forecast covers this selected time.','沒有模式預報涵蓋所選時間。')}</p>}</div>}<p className="footnote">{tr('Total cloud cover from Open-Meteo; bars run from 0% to 100%, and dashed bars mark unavailable values. Each model is an estimate for the forecast hour covering the selected time. Model run times are not shown. Differences do not measure confidence or astronomical seeing. Cloud forecasts do not include local obstructions; check current conditions before observing.','總雲量資料來自 Open-Meteo；長條範圍為 0% 至 100%，虛線表示無資料。每個模式顯示涵蓋所選時間的預報時段估計值，未顯示模式運算時間。模式間差異不代表信心程度或大氣視寧度。雲量預報不包括當地遮蔽物；觀測前請確認實際情況。')}</p></section>;
}
