"use client";

import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {downloadFile} from '@/lib/download';
import {useMemo, useState, type CSSProperties} from 'react';
import {ArrowUpRight, CalendarDays, Download, Moon} from 'lucide-react';
import {observingWindowLabel} from '@/lib/observing-window-label';
import {observingWindowCalendar} from '@/lib/calendar';
import {bestNightWindow,sevenNightOutlook} from '@/lib/night-outlook';
import {Place} from '@/lib/sky';
import {usePlanningClock} from '@/hooks/use-planning-clock';
import WeatherFreshness from '@/components/weather-freshness';
import {forecastFreshness} from '@/lib/forecast-freshness';
import {useLanguage} from '@/components/language-provider';

type Hourly={time:number[];cloud_cover:(number|null)[]};
export default function SevenNightOutlook({hourly,place,loading,selectedDate,onDate,fetchedAt,error,onRefresh,requestKey}:{hourly?:Hourly;place:Place;loading:boolean;selectedDate:Date|null;onDate:(date:Date,forecastFetchedAt?:number)=>void;fetchedAt?:number;error:string;onRefresh:()=>void;requestKey:string}){
 const {language,tr}=useLanguage();
 const now=usePlanningClock();
 const {stale,clockChanged}=forecastFreshness(hourly?fetchedAt:undefined,now);
 const nights=useMemo(()=>hourly?.time?.length?sevenNightOutlook(hourly,place,new Date(now)):[],[hourly,place,now]);
 const bestWindow=bestNightWindow(nights)?.best;
 const candidate=!loading&&!error&&typeof fetchedAt==='number'&&Number.isFinite(fetchedAt)&&!stale&&!clockChanged?bestWindow:null;
 const suggested=candidate&&candidate.score>0?candidate:null;
 const [planningIssue,setPlanningIssue]=useState<{context:string;kind:'stale'|'started'}|null>(null);
 const planningContext=JSON.stringify([place.name,place.latitude,place.longitude,place.timezone,requestKey,fetchedAt,loading,error,bestWindow]);
 const planningStatus=planningIssue?.context!==planningContext?'':planningIssue.kind==='stale'?tr('Forecast freshness has changed. Your observing time was kept. Refresh the forecast before planning a window.','預報的時效已變更，觀測時間保持不變。請更新預報後再選擇觀測時段。'):tr('This observing window has already started. Your observing time was kept. Choose a later window or refresh the forecast.','此觀測時段已開始，觀測時間保持不變。請選擇較晚的時段或更新預報。');
 const [downloadResult,setDownloadResult]=useState<{context:string;text:string}|null>(null);
 const downloadContext=JSON.stringify([place.name,place.latitude,place.longitude,place.timezone,requestKey,fetchedAt,loading,error,stale,clockChanged,nights.map(night=>[night.key,night.best])]);
 const downloadStatus=downloadResult?.context===downloadContext?downloadResult.text:'';
 const setDownloadStatus=(text:string)=>setDownloadResult({context:downloadContext,text});
 const timezone=place.timezone||'UTC';
 const dateLabel=(key:string)=>new Intl.DateTimeFormat(language==='zh-Hant'?'zh-Hant':'en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${key}T12:00:00Z`));
 const windowLabel=(start:Date,hours:number)=>observingWindowLabel(start,hours,timezone,language==='zh-Hant'?'zh-Hant':'en-GB');
 function reportPlanningIssue(kind:'stale'|'started'){
  setPlanningIssue({context:planningContext,kind});
  deferFocusAndScroll(()=>document.getElementById('night-outlook-planning-status'));
 }
 function planWindow(window:NonNullable<typeof bestWindow>,instant:number){
  // The minute-resolution display can outlive its forecast or window boundary.
  // Validate the exact tap time before queuing a planner-time change.
  const freshness=forecastFreshness(fetchedAt,instant);
  if(loading||error||typeof fetchedAt!=='number'||!Number.isFinite(fetchedAt)||freshness.stale||freshness.clockChanged){
   reportPlanningIssue('stale');return;
  }
  if(+window.date<instant){
   reportPlanningIssue('started');return;
  }
  onDate(window.date,fetchedAt);
 }
 function download(night:typeof nights[number]){
  if(!night.best)return;
  try{
   const best=night.best;
   const data=observingWindowCalendar({start:best.date,hours:best.hours,place:place.name,latitude:place.latitude,longitude:place.longitude,timezone:place.timezone,score:best.score,cloud:best.cloud,moonAbove:best.moonAbove,moonIllumination:best.moonIllumination,nightOnly:true,weather:{fetchedAt,refreshing:loading,refreshFailed:Boolean(error)}});
   downloadFile(new Blob([data],{type:'text/calendar;charset=utf-8'}),`nightjar-${night.key}.ics`);
   setDownloadStatus(tr(`Calendar file prepared for ${windowLabel(best.date,best.hours)}. Check that it arrived before opening it in your calendar app.`,`已準備 ${windowLabel(best.date,best.hours)} 的行事曆檔案。請確認檔案已儲存，再用行事曆應用程式開啟。`));
  }catch(error){setDownloadStatus(error instanceof Error?error.message:'The calendar file could not be created. Please try again.')}
 }
 return <section className="panel seven-night-outlook" aria-labelledby="seven-night-title">
  <div className="section-label"><span id="seven-night-title">{tr('THE NEXT SEVEN NIGHTS','未來七個夜晚')}</span><CalendarDays size={18}/></div>
  <p className="muted">{tr(`Compare upcoming forecast samples when the Sun is strictly below −18° in ${place.name}. Choose a card to set your observing time.`,`比較 ${place.name} 太陽高度低於 −18° 的預報時段。選擇卡片即可設定觀測時間。`)}</p>
  <WeatherFreshness hasForecast={Boolean(hourly)} fetchedAt={fetchedAt} timezone={timezone} loading={loading} error={error} stale={stale} clockChanged={clockChanged} onRefresh={onRefresh} refreshLabel={error?'Retry seven-night forecast':'Refresh seven-night forecast'}/>
  {suggested&&!planningStatus&&<div className="night-outlook-recommendation"><div><p id="night-outlook-suggestion"><strong>{tr('Suggested window','建議觀測時段')}</strong> · {windowLabel(suggested.date,suggested.hours)} · {suggested.score}/100</p><p className="footnote">{tr('Highest planning score among the available nightly windows. Equal scores favour longer windows, then earlier starts.','這是可用夜間時段中評分最高的時段。同分時優先選較長時段，再選較早開始的時段。')}</p></div><button type="button" className="button" aria-describedby="night-outlook-suggestion" onClick={()=>planWindow(suggested,Date.now())}>{tr('Use suggested window','使用建議時段')}</button></div>}
  {planningStatus&&<div className="notice night-outlook-recovery"><p id="night-outlook-planning-status" tabIndex={-1} role="status">{planningStatus}</p><button type="button" className="button" onClick={onRefresh} disabled={loading}>{tr('Refresh and review suggested windows','更新並重新查看建議時段')}</button></div>}
  {nights.length?<div className="night-outlook-grid">{nights.map(night=>night.best?<div className={`night-outlook-card${selectedDate&&+selectedDate===+night.best.date?' selected':''}`} key={night.key}><button type="button" className="night-outlook-select" onClick={()=>planWindow(night.best!,Date.now())} aria-pressed={Boolean(selectedDate&&+selectedDate===+night.best.date)} aria-label={tr(`${dateLabel(night.key)}: planning score ${night.best.score} out of 100; ${night.best.cloud}% cloud; ${night.forecastHours} of ${night.darkHours} dark samples scored; select ${windowLabel(night.best.date,night.best.hours)}`,`${dateLabel(night.key)}：觀測評分 ${night.best.score}／100；雲量 ${night.best.cloud}%；${night.darkHours} 個黑夜樣本中 ${night.forecastHours} 個已評分；選擇 ${windowLabel(night.best.date,night.best.hours)}`)}>
   <span className="night-date">{dateLabel(night.key)} <ArrowUpRight size={15}/></span>
   <span className="night-score" style={{'--night-score':`${night.best.score}%`} as CSSProperties}><strong>{night.best.score}<small>/100</small></strong></span>
   <span>{tr('Best ','最佳')}{night.best.hours===2?tr('2-hour window','2 小時時段'):tr('forecast hour','預報時段')} · {windowLabel(night.best.date,night.best.hours)}</span>
   <span>{tr(`${night.best.cloud}% cloud · ${night.forecastHours}/${night.darkHours} dark samples scored`,`雲量 ${night.best.cloud}% · ${night.forecastHours}/${night.darkHours} 個黑夜樣本已評分`)}</span><span className="night-coverage-track" aria-hidden="true"><i style={{width:`${night.forecastHours/night.darkHours*100}%`}}/></span>
   <span className="night-moon"><Moon size={14}/>{night.best.moonAbove?tr(`${Math.round(night.best.moonIllumination*100)}% lit Moon up at start`,`開始時月球在地平線上，照明 ${Math.round(night.best.moonIllumination*100)}%`):tr('Moon below horizon at start','開始時月球在地平線下')}</span>
  </button><button type="button" className="night-outlook-download" onClick={()=>download(night)} aria-label={tr(`Download calendar event for ${dateLabel(night.key)}`,`下載 ${dateLabel(night.key)} 的行事曆活動`)}><Download size={14}/> {tr('Add to calendar','加入行事曆')}</button></div>:<div className="night-outlook-card unavailable" key={night.key}><span className="night-date">{dateLabel(night.key)}</span><strong>—</strong><span>{night.forecastHours?tr('No complete dark hour remains in this forecast.','此預報中沒有剩餘的完整黑夜小時。'):tr(`${night.darkHours} dark samples; cloud forecast unavailable.`,`${night.darkHours} 個黑夜樣本；無法取得雲量預報。`)}</span></div>)}</div>:<p className="empty-text">{loading?tr('Loading the seven-night forecast…','正在載入七夜預報…'):hourly?tr('No full-darkness samples in the available forecast for this location.','此地點的可用預報中沒有完全天文黑夜樣本。'):tr('Seven-night weather is unavailable. Try refreshing the forecast.','無法取得七夜天氣預報，請嘗試更新。')}</p>}
  {downloadStatus&&<p className="night-download-status" role="status">{downloadStatus}</p>}
  <p className="footnote">{tr('Window endpoints include dates and UTC offsets. The card date names the observing night; a window after midnight can fall on the next calendar day. Scores use hourly cloud cover, astronomical darkness and Moon illumination. Sample counts describe forecast coverage, not hours of continuous darkness. Each suggested window stays fully dark: checks include its endpoints, 15-minute samples and a search for any crossing into twilight. Moon status is at the start. The best available pair of consecutive dark forecast hours is shown; a single hour is used when no pair has complete coverage. Scores are estimates, not astronomical seeing or transparency. Forecast length and coverage vary by location. Calendar files include the weather fetch time and refresh/age warnings; they are snapshots and do not update automatically.','時段起點與終點均包含日期及 UTC 偏移。卡片日期代表觀測夜晚；午夜後的時段可能屬於下一個日期。評分使用逐時雲量、天文黑夜與月球照明。樣本數代表預報涵蓋情況，並非連續黑夜時數。建議時段會檢查起終點、每 15 分鐘樣本及是否進入曙暮光，確保全程處於完全黑夜。月球狀態以開始時間為準。若無完整的連續兩小時預報，則使用單一小時。評分僅為估計，並非大氣視寧度或透明度。預報長度與涵蓋範圍因地點而異。行事曆檔案包含天氣取得時間及更新／時效提醒，屬於快照，不會自動更新。')}</p>
 </section>;
}
