'use client';
import {useDeferredValue,useMemo,useState} from 'react';
import rawIndex from '@/data/opengc-reference-index.json';
import {deepSkyCatalogue,deepSkyChineseName,deepSkyWindow,bestDeepSkySample} from '@/lib/deep-sky';
import {referencePlanningTarget} from '@/lib/opengc-reference-target';
import {aboveLocalHorizon,type LocalHorizon} from '@/lib/local-horizon';
import {j2000Projector,type Place} from '@/lib/sky';
import {deepSkyTimestampFormatter} from '@/lib/deep-sky-time';
import DeepSkyTimeline from '@/components/deep-sky-timeline';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {constellationName,traditionalChineseConstellationName} from '@/lib/constellations';
import {useLanguage} from '@/components/language-provider';

const labels:Record<string,readonly [string,string]>={
 G:['Galaxy','星系'],GCl:['Globular cluster','球狀星團'],OCl:['Open cluster','疏散星團'],HII:['H II region','電離氫區'],Neb:['Nebula','星雲'],PN:['Planetary nebula','行星狀星雲'],SNR:['Supernova remnant','超新星殘骸'],'Cl+N':['Cluster with nebulosity','星團及星雲'],RfN:['Reflection nebula','反射星雲'],EmN:['Emission nebula','發射星雲'],GPair:['Galaxy pair','星系對'],GTrpl:['Galaxy triplet','三重星系'],GGroup:['Galaxy group','星系群'],'*':['Star','恆星'],'**':['Double star','雙星'],'*Ass':['Stellar association','星協'],Nova:['Nova','新星'],Other:['Other or uncertain','其他或未確認'],Dup:['Historical duplicate','歷史重複記錄'],NonEx:['Not identified','未確認天體']
};
const normalize=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[‘’]/g,"'").replace(/\bmessier(?=\s*\d)/g,'m').replace(/\s+/g,'').replace(/(ngc|ic|m)0+(?=\d)/g,'$1');
const curated=new Map(deepSkyCatalogue.map(item=>[normalize(item.catalogue),item.id]));
const records=rawIndex.map(row=>{
 const [id,type,ra,dec,constellation,magnitude,names,m,ngc,ic]=row;
 const aliases=[...m.split(',').filter(Boolean).map(n=>`M${n}`),...ngc.split(',').filter(Boolean).map(n=>`NGC${n}`),...ic.split(',').filter(Boolean).map(n=>`IC${n}`)];
 const plannerId=curated.get(normalize(id));
 return {id,type,ra,dec,constellation,magnitude,names,aliases,plannerId,search:normalize([id,names,constellation,constellationName(constellation),traditionalChineseConstellationName(constellation),plannerId?deepSkyChineseName(plannerId):'',...aliases].join('|'))};
});
const types=[...new Set(records.map(record=>record.type))].sort();
export default function OpenNgcReference({onSelect,onTime,date,place,horizon}:{onSelect:(id:string)=>void;onTime:(date:Date)=>void;date:Date;place:Place;horizon?:LocalHorizon}){
 const {language,tr}=useLanguage(),[query,setQuery]=useState(''),[catalogue,setCatalogue]=useState(''),[type,setType]=useState(''),[scope,setScope]=useState('all'),[visibleOnly,setVisibleOnly]=useState(false);
 const [previewId,setPreviewId]=useState<string|null>(null);
 const deferredQuery=useDeferredValue(query),filterKey=JSON.stringify([deferredQuery,catalogue,type,scope,visibleOnly,+date,place.latitude,place.longitude,horizon]);
 const [page,setPage]=useState({key:filterKey,count:40});if(page.key!==filterKey)setPage({key:filterKey,count:40});
 const limit=page.key===filterKey?page.count:40;
 const results=useMemo(()=>{
  const needle=normalize(deferredQuery.trim());
  const project=visibleOnly?j2000Projector(date,place):null;
  const filtered=records.filter(record=>{
   if((catalogue&&!record.id.startsWith(catalogue))||(type&&record.type!==type)||(scope==='historical'&&record.type!=='Dup'&&record.type!=='NonEx')||(scope==='positioned'&&!(record.ra&&record.dec))||(scope==='unpositioned'&&Boolean(record.ra&&record.dec))||(needle&&!record.search.includes(needle)))return false;
   if(!project)return true;
   const target=referencePlanningTarget(record);if(!target)return false;
   const position=project(target.ra,target.dec);
   return position.altitude>30&&aboveLocalHorizon(position.altitude,position.azimuth,horizon);
  });
  if(needle)filtered.sort((a,b)=>Number(normalize(b.id)===needle)-Number(normalize(a.id)===needle));
  return filtered;
 },[deferredQuery,catalogue,type,scope,visibleOnly,date,place,horizon]);
 const selected=useMemo(()=>records.find(record=>record.id===previewId),[previewId]);
 const target=useMemo(()=>selected?referencePlanningTarget(selected):null,[selected]);
 const plan=useMemo(()=>{if(!target)return null;const samples=deepSkyWindow(target,date,place),best=bestDeepSkySample(samples,horizon);return {samples,best}},[target,date,place,horizon]);
 const stamp=deepSkyTimestampFormatter(date,place.timezone||'UTC',language==='zh-Hant'?'zh-Hant':'en-GB');
 const typeName=(value:string)=>labels[value]?.[language==='zh-Hant'?1:0]??value;
 return <div className="opengc-reference-index"><p className="footnote">{tr('Browse all 13,970 records in the pinned OpenNGC source. Historical duplicates, stars, unidentified entries and component records are included as catalogue references. Entries with listed source coordinates can be previewed and opened in the observing planner. Historical duplicates and unidentified records remain reference-only.','瀏覽固定版本 OpenNGC 的全部 13,970 筆記錄，包括歷史重複記錄、恆星、未確認天體及組成部分。列有來源座標的記錄可預覽並在觀測規劃器中開啟；歷史重複及未確認記錄僅供參考。')}</p>
  <label>{tr('Search complete catalogue','搜尋完整星表')}<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={tr('Identifier, name or constellation','編號、名稱或星座')}/></label>
  <div className="opengc-reference-filters"><label>{tr('Catalogue','星表')}<select value={catalogue} onChange={event=>setCatalogue(event.target.value)}><option value="">{tr('All records','全部記錄')}</option><option value="NGC">NGC</option><option value="IC">IC</option></select></label><label>{tr('Object type','天體類型')}<select value={type} onChange={event=>setType(event.target.value)}><option value="">{tr('All types','全部類型')}</option>{types.map(value=><option key={value} value={value}>{typeName(value)} ({value})</option>)}</select></label><label>{tr('Record status','記錄狀態')}<select value={scope} onChange={event=>setScope(event.target.value)}><option value="all">{tr('All records','全部記錄')}</option><option value="positioned">{tr('Coordinates listed','有座標')}</option><option value="unpositioned">{tr('Coordinates unavailable','沒有座標')}</option><option value="historical">{tr('Duplicates and unidentified','重複或未確認')}</option></select></label></div>
  <label className="opengc-reference-visible"><input type="checkbox" checked={visibleOnly} onChange={event=>setVisibleOnly(event.target.checked)}/> {horizon?tr('Only positions above 30° and the applied local horizon now','只顯示目前高於 30° 及已套用當地地平線的位置'):tr('Only positions above 30° now','只顯示目前高於 30° 的位置')}</label>{visibleOnly&&<p className="footnote">{tr('Uses the source position at the selected dark time; it does not include weather or guarantee visibility.','使用所選黑夜時間的來源位置，未考慮天氣，也不保證可見。')}</p>}
  <p role="status">{tr(`${results.length} matching records · showing ${Math.min(limit,results.length)}.`,`${results.length} 筆符合記錄 · 顯示 ${Math.min(limit,results.length)} 筆。`)}</p><ul className="opengc-reference-results">{results.slice(0,limit).map(record=>{
   const plannerId=record.plannerId;return <li key={record.id}><strong>{record.id}{record.names?` · ${record.names}`:''}</strong><small>{typeName(record.type)} ({record.type}){record.constellation?` · ${record.constellation}`:''}</small><small>{record.ra&&record.dec?`${tr('J2000 RA / Dec','J2000 赤經／赤緯')}: ${record.ra} / ${record.dec}`:tr('Coordinates unavailable','沒有座標')}</small>{record.magnitude&&<small>{tr('Visual magnitude','視星等')}: {record.magnitude}</small>}{record.aliases.length>0&&<small>{tr('Cross-references','其他編號')}: {record.aliases.join(', ')}</small>}{record.type==='Dup'&&<small>{tr('Historical duplicate; this is not a separate confirmed object.','歷史重複記錄；並非另一個已確認天體。')}</small>}{record.type==='NonEx'&&<small>{tr('This historical entry has not been identified as a confirmed object.','此歷史記錄尚未確定為已確認天體。')}</small>}{record.ra&&record.dec&&record.type!=='Dup'&&record.type!=='NonEx'&&<button type="button" className="button" onClick={event=>{const owner=event.currentTarget;setPreviewId(record.id);deferFocusAndScroll(()=>document.getElementById('opengc-observing-preview'),{owner})}}>{tr(`Preview ${record.id} observing position`,`預覽 ${record.id} 的觀測位置`)}</button>}{plannerId&&<button type="button" className="button" onClick={()=>onSelect(plannerId)}>{tr(`Open ${plannerId} in planner`,`在規劃器中開啟 ${plannerId}`)}</button>}</li>
  })}</ul>{results.length>40&&<button type="button" className="button" disabled={limit>=results.length} onClick={()=>setPage({key:filterKey,count:limit+40})}>{limit>=results.length?tr('All results shown','已顯示所有結果'):tr('Show 40 more','再顯示 40 筆')}</button>}
  {selected&&<section id="opengc-observing-preview" tabIndex={-1} aria-label={tr('Reference observing preview','參考觀測預覽')}><h3>{selected.id} · {tr('Observing preview','觀測預覽')}</h3>{target&&plan?<><p>{tr('At the selected site and time','所選地點及時間')}: {plan.samples[0].altitude.toFixed(1)}° · {tr('azimuth','方位角')} {plan.samples[0].azimuth.toFixed(1)}°</p>{horizon&&<p className="footnote">{tr('Suggested times respect the applied sampled local horizon.','建議時間會考慮已套用的取樣當地地平線。')}</p>}{horizon&&!aboveLocalHorizon(plan.samples[0].altitude,plan.samples[0].azimuth,horizon)&&<p className="notice" role="status">{tr('The selected position is below the applied local horizon and may be obstructed.','所選位置低於已套用的當地地平線，可能被遮擋。')}</p>}{selected.type==='Other'&&<p className="notice">{tr('OpenNGC classifies this record as uncertain or other; the coordinates do not establish a confirmed object.','OpenNGC 將此記錄分類為其他或未確認；座標不代表已確認天體。')}</p>}{plan.best?<p>{tr('Best qualifying dark sample','最佳符合條件的黑夜樣本')}: <time dateTime={plan.best.time.toISOString()}>{stamp.format(plan.best.time)}</time> · {plan.best.altitude.toFixed(1)}°</p>:<p>{horizon?tr('No qualifying sample above 30° and the applied horizon during full darkness in the next 24 hours.','未來 24 小時的全天文黑夜內，沒有高於 30° 及已套用地平線的合格樣本。'):tr('No qualifying sample above 30° during full darkness in the next 24 hours.','未來 24 小時的全天文黑夜內，沒有高度高於 30° 的合格樣本。')}</p>}<p className="footnote">{selected.plannerId?tr('Positions are approximate. Open this object in the planner to save it, record observations, view reference imagery or export a plan.','位置為估算值。在規劃器中開啟此天體即可儲存、記錄觀測、查看參考圖片或匯出計畫。'):tr('Positions are approximate. Saving and exports are unavailable for this reference entry.','位置為估算值。此參考記錄無法儲存或匯出。')}</p><DeepSkyTimeline name={selected.id} samples={plan.samples} place={place} horizon={horizon} onDate={onTime}/></>:<p>{tr('A usable position is unavailable for this record.','此記錄沒有可用的位置。')}</p>}</section>}
  <p className="footnote">{tr('Catalogue data: OpenNGC by Mattia Verga and contributors, CC BY-SA 4.0. Listed coordinates and magnitudes are source data, not a guarantee of visibility.','星表資料：Mattia Verga 及貢獻者的 OpenNGC，採用 CC BY-SA 4.0。列出的座標及星等為來源資料，不保證可以觀測。')} <a href="https://github.com/mattiaverga/OpenNGC" target="_blank" rel="noreferrer">OpenNGC ↗</a></p>
 </div>;
}
