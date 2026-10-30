"use client";
import DarknessRemaining from '@/components/darkness-remaining';
import {LanguageProvider,LanguageControl,useLanguage} from '@/components/language-provider';
import PwaSupport from '@/components/pwa-support';
import {sectionLabel,moonPhaseLabel,pendingEditLabel,skyShortcutLabel,skyTargetLabel} from '@/lib/language';
import {watchSavedDataRefresh} from '@/lib/saved-data-refresh';
import {watchForegroundDelay} from '@/lib/foreground-delay';
import { lazy, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {pendingEdits,usePendingEdits,usePendingEditReporter} from '@/hooks/use-pending-edits';
import {watchPendingEditUnload} from '@/lib/pending-edits';
import {firstPendingEditReview} from '@/lib/pending-edit-review';
import { flushSync } from 'react-dom';
import { Moon, Compass, MapPin, Telescope, ArrowUpRight, Star, Search, LocateFixed, Bookmark, Cloud, Wind, Droplets, ChevronRight, Aperture, X, Trash2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Place, skyBodies, bodyPosition, moonInfo, timeLabel, observingMilestones, nextAstronomicalDarkness, sunAltitude} from '@/lib/sky';
import {placeMapSource,placeAppleMapsLink} from '@/lib/place-map';
import ViewingMode from '@/components/viewing-mode';
import SkyChart from '@/components/sky-chart';
import CoordinateEntry from '@/components/coordinate-entry';
import {coordinateEntryMatchesPoint,coordinateEntryValue} from '@/lib/coordinate-entry';
import {coordinateEntryEditLabel,reviewCoordinateEntryEvent} from '@/lib/coordinate-entry-actions';
import {imagingDraftEditLabel,reviewImagingDraftEvent} from '@/lib/imaging-draft-actions';
import SiteNameEditor from '@/components/site-name-editor';
import SavedListControls,{savedListPageSize} from '@/components/saved-list-controls';
import {renameObservingSite} from '@/lib/site-name';
import SkyAtlasViewer from '@/components/sky-atlas-viewer';
import SkyShortcuts from '@/components/sky-shortcuts';
import {readSkyShortcutHash,previousShortcutURL} from '@/lib/sky-shortcuts';
import SkyLayerControls from '@/components/sky-layer-controls';
import {createCameraLocation} from '@/lib/camera-location';
import {deviceLocationError} from '@/lib/device-location-error';
import {placeFeedback} from '@/lib/place-feedback-language';
import {plannerFeedback} from '@/lib/planner-feedback-language';
import {savePlannerTime} from '@/lib/reload-planner';
import {saveForecastTimezone} from '@/lib/place-timezone';
import {readAtlasView,saveAtlasView,readAtlasLayers,saveAtlasLayers,type AtlasView,type AtlasLayers} from '@/lib/atlas-view';
import MobileNavigation,{plannerSections} from '@/components/planner-navigation';
import {createPlannerNavigation,type PlannerNavigationIntent,type PlannerTimeTarget} from '@/lib/planner-navigation';
import {observingTimeEditLabel,reviewObservingTimeEvent} from '@/lib/observing-time-actions';
import {reviewDiaryFormsEvent} from '@/lib/diary-form-actions';
import {reviewTargetNotesEvent} from '@/lib/target-note-actions';
import {reviewSiteNameEvent} from '@/lib/site-name-actions';
import ObservingTimeControl from '@/components/observing-time-control';
import {validObservingDate} from '@/lib/observing-time';
import AtmosphereDetails from '@/components/atmosphere-details';
import AstronomyForecastPanel from '@/components/astronomy-forecast';
import CloudModelComparison from '@/components/cloud-model-comparison';
import SevenNightOutlook from '@/components/seven-night-outlook';
import WeatherFreshness from '@/components/weather-freshness';
import ForecastBestHour from '@/components/forecast-best-hour';
import HourlyForecast from '@/components/hourly-forecast';
import ObservingSummaryDownload from '@/components/observing-summary-download';
import {forecastFreshness} from '@/lib/forecast-freshness';
import {moonObservingAdvice} from '@/lib/moon-guidance';
import {satelliteFreshnessIssue,type SatelliteFreshness} from '@/lib/satellite-validity';
import {satelliteStatusLabel} from '@/lib/satellite-language';
import {createDeepSkyBrowsing,createBrightTargetBrowsing} from '@/lib/target-browsing';
import SiteDarkness from '@/components/site-darkness';
import {rateObservingSite,SiteRatingReadError} from '@/lib/site-rating';
import {weatherHours,type WeatherForecast} from '@/lib/weather-hours';
import {readForecastResponse,forecastFailureMessage} from '@/lib/forecast-response';
import {weatherFeedback} from '@/lib/weather-feedback-language';
import {forecastPlanning,forecastHourLabel,closestCloudForecastHour} from '@/lib/weather-planning';
import {validPlace,readPlannerSetup,readObservingSite,recoveryPlannerContextKey,resolveObservingPlace,samePlaceCoordinates as same} from '@/lib/planner-state';
import {upsertSavedPlace,readSavedPlaces,removeSavedPlace,restoreSavedPlace,savedPlacesLimit,savedPlaceRowKeys} from '@/lib/saved-collections';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {useClientReady} from '@/hooks/use-client-ready';
import InitialLanguageText from '@/components/initial-language-text';
import {useForecastRefresh} from '@/hooks/use-forecast-refresh';
import {usePlanningClock} from '@/hooks/use-planning-clock';
import DeferredView from '@/components/deferred-view';
import LightPollutionReference from '@/components/light-pollution-reference';
import {readPhotographyDraft,savePhotographyDraftPatch,type PhotographyDraft} from '@/lib/photography-draft';
const AuroraPanel=lazy(()=>import('@/components/aurora-panel'));
const MeteorPlanner=lazy(()=>import('@/components/meteor-planner'));
const SatelliteTracker=lazy(()=>import('@/components/satellite-tracker'));
const MoonExplorer=lazy(()=>import('@/components/moon-explorer'));
const PhotoPlanner=lazy(()=>import('@/components/photo-planner'));
const DeepSkyFinder=lazy(()=>import('@/components/deep-sky-finder'));
const TargetFinder=lazy(()=>import('@/components/target-finder'));
const PlanetVisibility=lazy(()=>import('@/components/planet-visibility'));
const MilkyWayPlanner=lazy(()=>import('@/components/milky-way-planner'));
const PlannerBackupPanel=lazy(()=>import('@/components/planner-backup'));
const PlaceComparison=lazy(()=>import('@/components/place-comparison'));
import {searchLocations,type LocationResult} from '@/lib/location-search';
type ModelContext={registerTool:(tool:{name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>Promise<{location:Place;view:string}>},options:{signal:AbortSignal})=>Promise<unknown>|void};
const observingTimeRangeNotice='This time falls outside supported UTC years 1–9999. Your observing time is unchanged.';
type PlannerNotice=string|{kind:'darkness-none';place:string}|{kind:'darkness-selected';place:string;time:number;timezone:string}|{kind:'expired-iss'|'expired-forecast'}|{kind:'satellite-issue';reason:string};
export default function Home(){
 const ready=useClientReady();
 return ready?<LanguageProvider><Planner/><PwaSupport/></LanguageProvider>:<div className="app"><header id="page-top" className="top"><span className="brand"><Aperture size={30}/><span>nightjar.</span></span></header><main id="main-content" tabIndex={-1} className="startup-loading" aria-busy="true"><section className="panel" role="status"><h1><InitialLanguageText message="startup.heading"/></h1><p className="muted"><InitialLanguageText message="startup.description"/></p></section></main></div>;
}
function Planner(){
 const {language,tr,t}=useLanguage();
 const dateLocale=language==='zh-Hant'?'zh-Hant':'en-GB';
 const [startupAnchor,setStartupAnchor]=useState<{id:string;label:string}|null>(()=>readSkyShortcutHash(window.location.hash)),[anchorNotice,setAnchorNotice]=useState(()=>startupAnchor?`Opening ${startupAnchor.label.toLowerCase()}…`:'');
 const anchorStarted=useRef(false);
 const [setup]=useState(readPlannerSetup);
 const [placeReadError,setPlaceReadError]=useState(setup.placeReadError),[savedReadError,setSavedReadError]=useState(setup.savedReadError);
 const [selectedTarget,setSelectedTarget]=useState('');
 const [deepSkyBrowsing]=useState(createDeepSkyBrowsing),[brightTargetBrowsing]=useState(createBrightTargetBrowsing);
 const [comparisonSelection,setComparisonSelection]=useState<string[]|null>(null);
 const [deepSkyRequest,setDeepSkyRequest]=useState<{id:string;revision:number}|null>(null);
 const clearDeepSkyRequest=useCallback(()=>setDeepSkyRequest(null),[]);
 const [showImagingGrid,setShowImagingGrid]=useState(false);
 const [atlasView,setAtlasView]=useState<AtlasView>(readAtlasView),[viewStorageError,setViewStorageError]=useState(false);
 function chooseAtlasView(view:AtlasView){setAtlasView(view);setViewStorageError(!saveAtlasView(view))}
 const [planRevision,setPlanRevision]=useState(0);
 const [imagingState,setImagingState]=useState(readPhotographyDraft);
 const reportImagingPending=usePendingEditReporter('tools',imagingDraftEditLabel,true);
 const imagingDraft=useRef(imagingState.draft),pendingImagingPatch=useRef<Partial<PhotographyDraft>>({});
 const [focusImaging,setFocusImaging]=useState(false);
 const changeImagingDraft=useCallback((patch:Partial<PhotographyDraft>)=>{
  pendingImagingPatch.current={...pendingImagingPatch.current,...patch};
  const {draft:next,saved}=savePhotographyDraftPatch(imagingDraft.current,pendingImagingPatch.current);imagingDraft.current=next;
  if(saved)pendingImagingPatch.current={};reportImagingPending(!saved);
  setImagingState({draft:next,status:saved?'restored':'visit'});return saved?'restored' as const:'visit' as const;
 },[reportImagingPending]);
 const retryImagingDraftRead=useCallback(()=>{
  if(imagingState.status!=='unavailable')return imagingState.status;
  const next=readPhotographyDraft();imagingDraft.current=next.draft;setImagingState(next);reportImagingPending(false);return next.status;
 },[imagingState.status,reportImagingPending]);
 const [atlasLayers,setAtlasLayers]=useState(readAtlasLayers),[layerStorageError,setLayerStorageError]=useState(false);
 const {showLines:showStarPatterns,showLabels:showSkyLabels,showMilkyWay}=atlasLayers;
 function chooseAtlasLayer(key:keyof AtlasLayers,shown:boolean){const next={...atlasLayers,[key]:shown};setAtlasLayers(next);setLayerStorageError(!saveAtlasLayers(next))}
 const setShowStarPatterns=(shown:boolean)=>chooseAtlasLayer('showLines',shown),setShowSkyLabels=(shown:boolean)=>chooseAtlasLayer('showLabels',shown),setShowMilkyWay=(shown:boolean)=>chooseAtlasLayer('showMilkyWay',shown);
 const [cameraOpen,updateCameraOpen]=useState(false),[cameraDeepTarget,setCameraDeepTarget]=useState('');
 const setCameraOpen=useCallback((open:boolean)=>{updateCameraOpen(open);if(!open)setCameraDeepTarget('')},[]);
 const cameraReturnFocus=useRef<HTMLButtonElement|null>(null);
 const [tab,updateTab]=useState(()=>startupAnchor?'sky':'tonight'),[place,setPlace]=useState<Place>(setup.place),[saved,setSaved]=useState<Place[]>(setup.saved),[date,updateDate]=useState<Date>(setup.date),[query,setQuery]=useState(''),[results,setResults]=useState<LocationResult[]>([]),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState(''),[notice,setNotice]=useState<PlannerNotice>(''),[lat,setLat]=useState(''),[lon,setLon]=useState('');
 const applyDate=useCallback((next:Date)=>{
  if(!validObservingDate(next)){
   setNotice(observingTimeRangeNotice);
   requestAnimationFrame(()=>{const feedback=document.getElementById('planner-notice');if(feedback?.dataset.noticeCode==='time-range'){feedback.focus({preventScroll:true});feedback.scrollIntoView({block:'center',behavior:'instant'})}});
   return;
  }
  setNotice(current=>current===observingTimeRangeNotice?'':current);updateDate(next);
 },[]);
 const locationSession=useRef<ReturnType<typeof createCameraLocation>|null>(null);
 const coordinateDraftRef=useRef({lat,lon});
 const reportCoordinateDraft=usePendingEditReporter('places',coordinateEntryEditLabel,true);
 useEffect(()=>reportCoordinateDraft(Boolean(lat||lon)),[lat,lon,reportCoordinateDraft]);
 const clearCoordinates=useCallback(()=>{coordinateDraftRef.current={lat:'',lon:''};setLat('');setLon('');reportCoordinateDraft(false)},[reportCoordinateDraft]);
 function changeCoordinate(axis:'lat'|'lon',value:string){
  locationSession.current?.cancel();
  coordinateDraftRef.current={...coordinateDraftRef.current,[axis]:value};
  if(axis==='lat')setLat(value);else setLon(value);
  reportCoordinateDraft(Boolean(coordinateDraftRef.current.lat||coordinateDraftRef.current.lon));
 }
 function clearManualCoordinates(){locationSession.current?.cancel();clearCoordinates()}
 const [siteEditRevision,setSiteEditRevision]=useState(0);
 const [savedShown,setSavedShown]=useState(savedListPageSize);
 const savedRowKeys=useMemo(()=>savedPlaceRowKeys(saved),[saved]);
 const [removedPlace,setRemovedPlace]=useState<{place:Place;index:number}|null>(null),[placeUndoStatus,setPlaceUndoStatus]=useState('');
 const placeUndoRef=useRef<HTMLButtonElement>(null),savedHeadingRef=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(removedPlace)placeUndoRef.current?.focus()},[removedPlace]);
 const [locating,setLocating]=useState(false);
 const savedRef=useRef(saved),placeRef=useRef(place);
 const searchController=useRef<AbortController|null>(null);
 const applyNavigation=useCallback((intent:PlannerNavigationIntent)=>{
  setAnchorNotice('');
  if(intent.section!=='sky'&&readSkyShortcutHash(window.location.hash))try{history.replaceState(history.state,'',window.location.pathname+window.location.search)}catch{/* Navigation still works if history updates are unavailable. */}
  if(intent.kind==='sky-anchor'){
   anchorStarted.current=false;setStartupAnchor(intent.anchor);setAnchorNotice(`Opening ${intent.anchor.label.toLowerCase()}…`);setCameraOpen(false);
   try{history.replaceState(history.state,'',`#${intent.anchor.id}`)}catch{/* The section remains usable if history updates are unavailable. */}
  }
  else if(intent.kind==='time'){applyDate(intent.date);if(intent.target?.catalogue==='deep')setDeepSkyRequest({id:intent.target.id,revision:Date.now()});else if(intent.target)setSelectedTarget(intent.target.id)}
  else if(intent.kind==='context'){
   if(coordinateEntryMatchesPoint(coordinateDraftRef.current.lat,coordinateDraftRef.current.lon,intent.place))clearCoordinates();
   locationSession.current?.cancel();searchController.current?.abort();setSearching(false);placeRef.current=intent.place;setPlace(intent.place);setResults([]);setQuery('');setSearchError('');setSiteEditRevision(value=>value+1);
   if(intent.date)applyDate(intent.date);
   if(intent.deepTarget)setDeepSkyRequest({id:intent.deepTarget,revision:Date.now()});
   setCameraOpen(false);
   if(intent.persist===false)setPlaceReadError(false);else try{localStorage.setItem('nightjar-place',JSON.stringify(intent.place));setPlaceReadError(false)}catch{setNotice('This browser could not save your location.')}
  }else if(intent.kind==='imaging'){
   changeImagingDraft({catalogueId:intent.target.id,ra:String(intent.target.ra),dec:String(intent.target.dec)});setFocusImaging(true);setCameraOpen(false);
  }else if(intent.section!=='sky')setCameraOpen(false);
  updateTab(intent.section);
 },[setCameraOpen,changeImagingDraft,clearCoordinates,applyDate,setStartupAnchor]);
 const [pendingIntent,setPendingIntent]=useState<PlannerNavigationIntent|null>(null);
 const pendingDestination=pendingIntent?.section||'';
 const [navigation]=useState(()=>createPlannerNavigation({onPending:setPendingIntent}));
 const sectionPendingText=usePendingEdits(tab),contextPendingText=usePendingEdits(tab,true),allPendingText=usePendingEdits(),pendingText=pendingIntent?.kind==='time'?[...new Set([...allPendingText.split(', ').filter(label=>label===observingTimeEditLabel),...(pendingIntent.section!==tab?sectionPendingText.split(', ').filter(Boolean):[])])].join(', '):pendingIntent?.kind==='imaging'?allPendingText:pendingIntent?.kind==='context'?contextPendingText:sectionPendingText,pendingHeading=useRef<HTMLHeadingElement>(null);
 const setDate=useCallback((next:Date,section=tab,target?:PlannerTimeTarget,forecastFetchedAt?:number,forecastMayHaveStarted?:boolean,satelliteFreshness?:SatelliteFreshness)=>{
  if(!validObservingDate(next)){applyDate(next);return false}
  return navigation.request({kind:'time',section,date:next,forecastFetchedAt,forecastMayHaveStarted,...(target?{target}:{}),...(satelliteFreshness?{satelliteFreshness}:{})},+next!==+date&&pendingEdits.hasSection('observing-time')||section!==tab&&Boolean(pendingEdits.snapshot(tab)),applyNavigation);
 },[applyDate,applyNavigation,date,navigation,tab]);
 function chooseNextDarkness(){
  const next=nextAstronomicalDarkness(date,place);
  if(!next){setNotice({kind:'darkness-none',place:place.name});return}
  if(setDate(next))setNotice({kind:'darkness-selected',place:place.name,time:+next,timezone:place.timezone||'UTC'});
 }
 function chooseTargetTime(target:PlannerTimeTarget,next:Date){
  const owner=document.activeElement;
  if(setDate(next,'sky',target))deferFocusAndScroll(()=>document.getElementById(target.catalogue==='deep'?'deep-sky-object-details':'target-details'),{owner});
 }
 function chooseSatelliteTime(next:Date,freshness:SatelliteFreshness){
  const issue=satelliteFreshnessIssue(freshness,next,Date.now());
  if(issue){setNotice({kind:'satellite-issue',reason:issue});return}
  const owner=document.activeElement;
  if(setDate(next,tab,undefined,undefined,undefined,freshness))deferFocusAndScroll(()=>document.getElementById('planner-heading'),{owner});
 }
 const setTab=useCallback((next:string)=>{
  if(next!=='sky')setCameraOpen(false);
  return navigation.request({kind:'section',section:next},next!==tab&&Boolean(pendingEdits.snapshot(tab)),applyNavigation);
 },[applyNavigation,navigation,setCameraOpen,tab]);
 function openConditions(){
  const owner=document.activeElement;
  if(setTab('tonight'))deferFocusAndScroll(()=>document.getElementById('planner-heading'),{owner});
 }
 useEffect(()=>{
  const follow=(event:HashChangeEvent)=>{
   const anchor=readSkyShortcutHash(window.location.hash);if(!anchor)return;
   if(navigation.request({kind:'sky-anchor',section:'sky',anchor},tab!=='sky'&&Boolean(pendingEdits.snapshot(tab)),applyNavigation))return;
   const previous=previousShortcutURL(event.oldURL,window.location.href);
   if(previous)try{history.replaceState(history.state,'',previous)}catch{/* Retain the unfinished view even if the URL cannot be restored. */}
  };
  window.addEventListener('hashchange',follow);return()=>window.removeEventListener('hashchange',follow);
 },[applyNavigation,navigation,tab]);
 useEffect(()=>{if(pendingIntent){pendingHeading.current?.focus({preventScroll:true});pendingHeading.current?.scrollIntoView({block:'center',behavior:'instant'})}},[pendingIntent]);
 useEffect(()=>watchPendingEditUnload(window,pendingEdits),[]);
 useEffect(()=>{
  const reviewTime=()=>{
   if(tab==='aurora')flushSync(()=>setTab('tonight'));
   const input=document.getElementById('observing-time');input?.focus({preventScroll:true});input?.closest('.time-entry')?.scrollIntoView({block:'start',behavior:'instant'});
  };
  window.addEventListener(reviewObservingTimeEvent,reviewTime);
  return()=>window.removeEventListener(reviewObservingTimeEvent,reviewTime);
 },[tab,setTab]);
 useEffect(()=>{
  const reviewCoordinates=()=>{
   if(tab!=='places')flushSync(()=>setTab('places'));
   const draft=coordinateDraftRef.current;
   const field=coordinateEntryValue(draft.lat,'latitude')!==null&&coordinateEntryValue(draft.lon,'longitude')===null?'manual-longitude':'manual-latitude';
   const input=document.getElementById(field);
   const disclosure=input?.closest('details');if(disclosure)disclosure.open=true;
   input?.focus({preventScroll:true});input?.scrollIntoView({block:'center',behavior:'instant'});
  };
  window.addEventListener(reviewCoordinateEntryEvent,reviewCoordinates);
  return()=>window.removeEventListener(reviewCoordinateEntryEvent,reviewCoordinates);
 },[tab,setTab]);
 useEffect(()=>{
  const reviewSiteName=()=>{
   if(tab!=='places')flushSync(()=>setTab('places'));
   const input=document.getElementById('observing-site-name');
   input?.focus({preventScroll:true});input?.scrollIntoView({block:'center',behavior:'instant'});
  };
  window.addEventListener(reviewSiteNameEvent,reviewSiteName);
  return()=>window.removeEventListener(reviewSiteNameEvent,reviewSiteName);
 },[tab,setTab]);
 useEffect(()=>{
  const reviewNotes=()=>{
   if(tab!=='sky')flushSync(()=>setTab('sky'));
   const recovery=document.getElementById('target-note-recovery')??document.getElementById('target-finder');
   const disclosure=recovery?.closest('details');if(disclosure)disclosure.open=true;
   recovery?.focus({preventScroll:true});recovery?.scrollIntoView({block:'center',behavior:'instant'});
  };
  window.addEventListener(reviewTargetNotesEvent,reviewNotes);
  return()=>window.removeEventListener(reviewTargetNotesEvent,reviewNotes);
 },[tab,setTab]);
 useEffect(()=>{
  const reviewDiary=()=>{
   if(tab!=='sky')flushSync(()=>setTab('sky'));
   const recovery=document.getElementById('diary-form-recovery')??document.getElementById('observing-diary');
   recovery?.focus({preventScroll:true});recovery?.scrollIntoView({block:'center',behavior:'instant'});
  };
  window.addEventListener(reviewDiaryFormsEvent,reviewDiary);
  return()=>window.removeEventListener(reviewDiaryFormsEvent,reviewDiary);
 },[tab,setTab]);
 useEffect(()=>{
  const reviewImaging=()=>{
   flushSync(()=>{setFocusImaging(false);if(tab!=='tools')setTab('tools')});
   const recovery=document.getElementById('imaging-draft-recovery');
   recovery?.focus({preventScroll:true});recovery?.scrollIntoView({block:'center',behavior:'instant'});
  };
  window.addEventListener(reviewImagingDraftEvent,reviewImaging);
  return()=>window.removeEventListener(reviewImagingDraftEvent,reviewImaging);
 },[tab,setTab]);
 useEffect(()=>{
  if(!startupAnchor)return;
  if(tab!=='sky'){anchorStarted.current=true;return}
  if(anchorStarted.current)return;let active=true,initialFrame:number|null=null;
  const observer=new MutationObserver(find);
  const cancelDeadline=watchForegroundDelay(()=>{anchorStarted.current=true;stop();setAnchorNotice(`${startupAnchor.label} has not loaded. Check your connection and try its shortcut again.`)},window,document,{hidden:()=>document.hidden});
  function stop(){if(!active)return;active=false;observer.disconnect();cancelDeadline();if(initialFrame!==null)cancelAnimationFrame(initialFrame);window.removeEventListener('pointerdown',cancel);window.removeEventListener('keydown',cancel)}
  function cancel(){anchorStarted.current=true;stop();setAnchorNotice('')}
  function find(){
   if(!active)return;const section=document.getElementById(startupAnchor!.id);if(!section)return;
   anchorStarted.current=true;stop();setAnchorNotice('');section.focus({preventScroll:true});section.scrollIntoView({block:'start',behavior:'instant'});
  }
  window.addEventListener('pointerdown',cancel);window.addEventListener('keydown',cancel);
  observer.observe(document.getElementById('main-content')??document.body,{childList:true,subtree:true});initialFrame=requestAnimationFrame(find);
  return()=>{stop()};
 },[startupAnchor,tab]);

 function keepEditing(){
  const review=firstPendingEditReview(pendingText,pendingEdits.snapshot(tab));navigation.cancel();
  if(review)queueMicrotask(()=>window.dispatchEvent(new Event(review.event)));
  else document.getElementById('planner-heading')?.focus();
 }
 function leaveView(){
  const owner=document.activeElement,target=pendingIntent?.kind==='time'&&pendingIntent.target,ownsFocus=pendingIntent?.kind==='imaging'||pendingIntent?.kind==='sky-anchor';
  if(!navigation.continue(applyNavigation)){setNotice({kind:pendingIntent?.satelliteFreshness?'expired-iss':'expired-forecast'});return}
  if(ownsFocus)return;
  const destination=target?(target.catalogue==='deep'?'deep-sky-object-details':'target-details'):'planner-heading';
  deferFocusAndScroll(()=>document.getElementById(destination),{owner});
 }

 const {revision,refresh,recordAttempt}=useForecastRefresh();
 const now=usePlanningClock();
 const siteKey=`${place.latitude},${place.longitude}`;
 const forecastKey=`${siteKey}:${revision}`;
 const [weather,setWeather]=useState<{key:string;siteKey:string;fetchedAt?:number;data?:WeatherForecast;error?:string}|null>(null);
 const forecast=weather?.siteKey===siteKey?weather.data:null,loading=weather?.key!==forecastKey,error=weather?.key===forecastKey?weatherFeedback(weather.error||'',t):'';
 const {stale,clockChanged}=forecastFreshness(forecast?weather?.fetchedAt:undefined,now);
 useEffect(()=>{savedRef.current=saved},[saved]);
 useEffect(()=>{
  const update=()=>{
   try{const latest=readSavedPlaces(localStorage);savedRef.current=latest;setSaved(latest);setSavedReadError(false)}catch{setSavedReadError(true)}
  };
  return watchSavedDataRefresh(update,window,document,{storage:()=>localStorage,key:'nightjar-places',hidden:()=>document.hidden});
 },[]);
 useEffect(()=>{placeRef.current=place},[place]);
 const choose=useCallback((p:Place,options:{date?:Date;section?:string;deepTarget?:string;forecastFetchedAt?:number;comparisonFetchedAt?:number[]}={})=>{
  const next=resolveObservingPlace(p,savedRef.current,placeRef.current);
  if(options.date&&!Number.isFinite(+options.date))throw Error('Choose a valid observing time.');
  locationSession.current?.cancel();searchController.current?.abort();setSearching(false);
  const blocked=Boolean(pendingEdits.contextSnapshot(tab));if(blocked)setCameraOpen(false);
  return navigation.request({kind:'context',section:options.section||'tonight',place:next,date:options.date,deepTarget:options.deepTarget,forecastFetchedAt:options.forecastFetchedAt,comparisonFetchedAt:options.comparisonFetchedAt},blocked,applyNavigation);
 },[applyNavigation,navigation,setCameraOpen,tab]);
 function planAtSite(nextPlace:Place,nextDate?:Date,forecastFetchedAt?:number,comparisonFetchedAt?:number[]){
  const owner=document.activeElement;
  if(choose(nextPlace,{date:nextDate,forecastFetchedAt,comparisonFetchedAt}))deferFocusAndScroll(()=>document.getElementById('planner-heading'),{owner});
 }
 useEffect(()=>{
  const session=createCameraLocation({onPending:setLocating,onSite:site=>{
   const owner=document.activeElement;
   if(choose({...site,name:'My location'}))deferFocusAndScroll(()=>document.getElementById('planner-heading'),{owner});
  },onError:error=>setSearchError(deviceLocationError(error))});
  locationSession.current=session;
  return()=>{session.cancel();locationSession.current=null};
 },[choose]);
 useEffect(()=>{for(const key of ['nightjar-recovery-time-v1',recoveryPlannerContextKey])try{sessionStorage.removeItem(key)}catch{};return()=>searchController.current?.abort()},[]);
 useEffect(()=>{savePlannerTime(date,undefined,undefined,place)},[date,place]);
 useEffect(()=>{
  let stopped=false;const controller=new AbortController(),requestedPlace=placeRef.current;
  recordAttempt();
  const timeout=setTimeout(()=>controller.abort(),20000);
  fetch(`/api/weather?lat=${place.latitude}&lon=${place.longitude}`,{signal:controller.signal,cache:'no-cache'}).then(async response=>{
   const data=await readForecastResponse(response);
   if(!stopped){setWeather({key:forecastKey,siteKey,data,fetchedAt:Date.now()});if(data.timezone){setPlace(p=>p.latitude===place.latitude&&p.longitude===place.longitude&&p.timezone!==data.timezone?{...p,timezone:data.timezone}:p);try{saveForecastTimezone(localStorage,requestedPlace,data.timezone)}catch{}}}
  }).catch(error=>{if(!stopped)setWeather(old=>({key:forecastKey,siteKey,data:old?.siteKey===siteKey?old.data:undefined,fetchedAt:old?.siteKey===siteKey?old.fetchedAt:undefined,error:forecastFailureMessage(error)}))});
  return()=>{stopped=true;clearTimeout(timeout);controller.abort()};
 },[place.latitude,place.longitude,forecastKey,siteKey,recordAttempt]);

 function retryObservingSite(){
  const restored=readObservingSite();
  if(restored.error){setNotice('The stored observing site is still unavailable. Your current view and stored data were kept.');return}
  locationSession.current?.cancel();searchController.current?.abort();setSearching(false);const blocked=Boolean(pendingEdits.contextSnapshot(tab));if(blocked)setCameraOpen(false);if(navigation.request({kind:'context',section:tab,place:restored.place,persist:false},blocked,applyNavigation))setNotice('Observing site loaded. Your observing time is unchanged.');
 }
 function retrySavedPlaces(){try{const latest=readSavedPlaces(localStorage);savedRef.current=latest;setSaved(latest);setSavedReadError(false);setNotice('Saved places loaded. Your selected site and observing time are unchanged.')}catch{setSavedReadError(true);setNotice('Saved places are still unavailable. Your displayed list and stored data were kept.')}}
 function readLatestSavedPlaces(){try{return readSavedPlaces(localStorage)}catch{setSavedReadError(true);throw Error('Saved places could not be read. Retry reading them before changing site settings.')}}
 function persistSavedPlaces(next:Place[],message:string){
  try{localStorage.setItem('nightjar-places',JSON.stringify(next));savedRef.current=next;setSaved(next);setSavedReadError(false);setNotice(message);return true}catch{setNotice('This browser could not save your places. The saved list stays unchanged.');return false}
 }
 function renameSite(name:string){readLatestSavedPlaces();const next=renameObservingSite(localStorage,place,name);savedRef.current=next.places;placeRef.current=next.place;setSaved(next.places);setSavedReadError(false);setPlace(next.place);setPlaceReadError(false);setNotice(`${next.place.name} saved as the site name.`)}
 function savePlace(){
  try{
   const latest=readLatestSavedPlaces();
   // Save adds a location. Renaming and sky-rating changes have their own
   // guarded actions; a stale Save must not overwrite another tab's metadata.
   if(latest.some(item=>same(item,place))){savedRef.current=latest;setSaved(latest);setSavedReadError(false);setNotice('This location is already saved. Its latest saved settings were kept. Choose it from Saved places to review them.');return}
   const next=upsertSavedPlace(latest,place);
   if(persistSavedPlaces(next,'Place saved on this device.'))setSavedShown(Math.max(savedListPageSize,next.length));
  }catch(error){setNotice(error instanceof Error&&error.name!=='QuotaExceededError'?error.message:'This place could not be saved.')}
 }
 function removePlace(item:Place,index:number){
  let latest:Place[]|undefined;
  try{latest=readLatestSavedPlaces();const next=removeSavedPlace(latest,item);if(persistSavedPlaces(next,`${item.name} removed from saved places. You can undo during this visit.`)){setRemovedPlace({place:item,index});setPlaceUndoStatus('')}}
  catch(error){if(latest){savedRef.current=latest;setSaved(latest)}setNotice(error instanceof Error?error.message:'This place could not be removed.')}
 }
 function undoPlaceRemoval(){
  if(!removedPlace)return;
  try{
   const latest=readLatestSavedPlaces();
   if(latest.some(item=>same(item,removedPlace.place))){savedRef.current=latest;setSaved(latest);setNotice('This place is already saved. Its current settings were kept.')}
   else if(!persistSavedPlaces(restoreSavedPlace(latest,removedPlace.place,removedPlace.index),`${removedPlace.place.name} restored to saved places.`)){setNotice('');setPlaceUndoStatus('This place could not be saved. Undo remains available; free browser storage and retry.');return;}
   setRemovedPlace(null);setPlaceUndoStatus('');savedHeadingRef.current?.focus();
  }catch(error){setNotice('');setPlaceUndoStatus(error instanceof Error?error.message:'This place could not be restored. Undo remains available.')}
 }
 function setSiteDarkness(bortle:number|undefined){
  setNotice('');
  try{const next=rateObservingSite(localStorage,place,bortle);savedRef.current=next.places;placeRef.current=next.place;setSaved(next.places);setPlace(next.place);setSavedReadError(false);setPlaceReadError(false);setNotice(bortle?`Bortle class ${bortle} saved for ${next.place.name} on this device.`:`Sky darkness rating cleared for ${next.place.name}.`)}
  catch(error){if(error instanceof SiteRatingReadError){if(error.scope==='places')setSavedReadError(true);else setPlaceReadError(true)}return error instanceof Error?error.message:'This sky rating could not be saved. Your displayed rating was kept.'}
 }
 function changeSearchQuery(value:string){
  locationSession.current?.cancel();
  searchController.current?.abort();searchController.current=null;
  setSearching(false);setResults([]);setSearchError('');setQuery(value);
 }
 async function search(e:React.FormEvent){
  e.preventDefault();if(query.trim().length<2){setSearchError('Enter at least two letters.');document.getElementById('location-search')?.focus();return}
  locationSession.current?.cancel();
  searchController.current?.abort();const controller=new AbortController();searchController.current=controller;
  setSearching(true);setSearchError('');setResults([]);
  try{
   const next=await searchLocations(query,{signal:controller.signal,language});
   if(!controller.signal.aborted){setResults(next);if(!next.length)setSearchError('No places found. Try a nearby town.')}
  }catch(error){if(!controller.signal.aborted)setSearchError(error instanceof Error?error.message:'Search unavailable.')}
  finally{if(!controller.signal.aborted)setSearching(false)}
 }
 function cancelSearch(){searchController.current?.abort();searchController.current=null;setSearching(false);setSearchError('Search cancelled. Enter another town or use coordinates.')}
 function locate(){
  searchController.current?.abort();searchController.current=null;setSearching(false);setSearchError('');
  if(!navigator.geolocation){setSearchError('Device location is unavailable. Search for a town instead.');return}
  locationSession.current?.start((success,failure)=>navigator.geolocation.getCurrentPosition(success,failure,{timeout:10000}));
 }
 function cancelLocation(){locationSession.current?.cancel();setSearchError('Location request cancelled. Your selected observing site is unchanged.')}
 const noticeText=(value:PlannerNotice)=>{
  if(typeof value==='string')return plannerFeedback(placeFeedback(value,t),t);
  if(value.kind==='darkness-none')return t('main.darknessNone',{place:value.place});
  if(value.kind==='darkness-selected')return t('main.darknessSelected',{place:value.place,time:forecastHourLabel(new Date(value.time),value.timezone,dateLocale).full});
  if(value.kind==='satellite-issue')return `${satelliteStatusLabel(value.reason,language,t)} ${t('main.timeKept')}`;
  return t(value.kind==='expired-iss'?'main.expiredISS':'main.expiredForecast');
 };
 const shortcutNotice=anchorNotice&&startupAnchor?(anchorNotice.startsWith('Opening ')?t('main.shortcutOpening',{label:language==='en'?startupAnchor.label.toLowerCase():skyShortcutLabel(startupAnchor.id,language,startupAnchor.label)}):t('main.shortcutFailed',{label:skyShortcutLabel(startupAnchor.id,language,startupAnchor.label)})):anchorNotice;
 const when=date,moon=useMemo(()=>moonInfo(date,place),[date,place]),tz=place.timezone||'UTC';
 const hours=useMemo(()=>weatherHours(forecast?.hourly,date,place),[forecast,date,place]);
 const planning=useMemo(()=>forecastPlanning(weatherHours(forecast?.hourly,date,place,true),date,place),[forecast,date,place]),current=planning.current,best=planning.best,score=planning.score;
 const {dark,skyObjects}=useMemo(()=>({dark:sunAltitude(when,place)<-18,skyObjects:skyBodies.map(body=>({body,...bodyPosition(body,when,place)})).filter(p=>p.altitude>0).sort((a,b)=>b.altitude-a.altitude)}),[when,place]);

 const darkRecovery=useMemo(()=>dark?null:nextAstronomicalDarkness(date,place),[dark,date,place]);
 const milestones=useMemo(()=>observingMilestones(when,place).filter(event=>event.label.startsWith('Full darkness')||event.label.includes('moon')&&event.date&&sunAltitude(event.date,place)<-18),[when,place]);
 const forecastRecovery=useMemo(()=>forecast&&(!current||current.cloud===null)?closestCloudForecastHour(forecast.hourly,date,place):null,[forecast,current,date,place]);
 const shortenedMilestones=!validObservingDate(new Date(+when+48*3600000));
 const mapSource=placeMapSource(place),appleMapsLink=placeAppleMapsLink(place);
 const title={tonight:tr('A night worth looking up.','抬頭看看今晚的星空。'),sky:tr('Get to know your sky.','認識你的星空。'),moon:tr('A world within reach.','探索月球。'),places:tr('Find your place in the dark.','尋找觀測地點。'),events:tr('Make a date with the cosmos.','探索天象。'),tools:tr('Frame something extraordinary.','規劃你的視野。'),aurora:place.latitude<0?tr('Follow the southern lights.','追尋南極光。'):tr('Follow the northern lights.','追尋北極光。')}[tab];
 useEffect(()=>{const context=(document as Document & {modelContext?:ModelContext}).modelContext;if(!context?.registerTool)return;const controller=new AbortController();Promise.resolve(context.registerTool({name:'set_observing_location',description:'Set the observing coordinates and show the Tonight dashboard.',inputSchema:{type:'object',properties:{name:{type:'string'},latitude:{type:'number',minimum:-90,maximum:90},longitude:{type:'number',minimum:-180,maximum:180}},required:['name','latitude','longitude'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input:unknown)=>{if(!validPlace(input))throw Error('Invalid observing location');const location=resolveObservingPlace(input,savedRef.current,placeRef.current);let applied=false;flushSync(()=>{applied=choose(location)});if(!applied)throw Error('Save or discard unfinished edits before applying the requested observing site.');return{location,view:'tonight'}}},{signal:controller.signal})).catch(()=>{});return()=>controller.abort()},[choose]);
 return <div className="app"><Tabs value={tab} onValueChange={setTab}><header id="page-top" tabIndex={-1} className="top"><button type="button" className="brand" aria-label={t('main.home')} onClick={()=>setTab('tonight')}><Aperture size={30}/><span>nightjar<span className="brand-dot">.</span></span></button><div className="nav-wrap"><TabsList className="navigation" variant="line">{plannerSections.map(([key,label,Icon])=><TabsTrigger key={key} value={key} onClick={()=>setTab(key)}><Icon size={17}/>{sectionLabel(key,language,label)}</TabsTrigger>)}</TabsList></div><a className="install-shortcut" href="#install-app">{tr('Install app','安裝應用程式')} <ArrowUpRight size={15}/></a></header><MobileNavigation section={tab} onSelect={setTab}/><main id="main-content" tabIndex={-1}><div className="page-heading"><div><h1 id="planner-heading" tabIndex={-1}>{title}</h1><p className="muted">{tab==='tonight'?tr('Find your window. Choose your place. Meet the night sky.','選擇地點與時間，規劃今晚的觀星。'):`${place.name} · ${place.latitude.toFixed(2)}°, ${place.longitude.toFixed(2)}°`}</p></div><div className="heading-utilities"><button className="location-button" onClick={()=>setTab('places')}><MapPin size={18}/>{place.name}<ChevronRight size={17}/></button><ViewingMode/><LanguageControl/></div></div>{placeReadError&&<section className="panel startup-site-warning"><h2>{t('main.siteUnavailable')}</h2><p role="alert">{t('main.siteReadError',{place:place.name})}</p><div className="button-row"><button type="button" className="button" onClick={retryObservingSite}>{t('main.retrySite')}</button><button type="button" className="button" onClick={()=>setTab('places')}>{t('main.openPlaces')}</button></div></section>}{language==='zh-Hant'&&<p className="language-coverage" role="status">繁體中文翻譯正在逐步擴充；部分詳細功能仍顯示英文。</p>}{tab==='tonight'&&dark&&<section className="mobile-night-glance" aria-label={tr('Observing overview at the selected time','所選時間的觀測摘要')}><div className="mobile-night-glance-score"><span>{tr('PLANNING SCORE','觀測評分')}</span><strong>{score??'—'}<small>{score==null?'':' / 100'}</small></strong></div><div className="mobile-night-glance-best"><span>{tr('BEST IN NEXT 12 HOURS','未來 12 小時的最佳時間')}</span><strong>{best&&best.score!==null&&best.score>0?timeLabel(best.date,tz):'—'}</strong><small>{best&&best.score!==null&&best.score>0?`${best.score}/100 · ${forecastHourLabel(best.date,tz,dateLocale).detail}`:tr('No scored recommendation','沒有可評分的建議時間')}</small></div><ForecastBestHour best={best} timezone={tz} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} loading={loading} error={error} stale={stale} clockChanged={clockChanged} contextKey={JSON.stringify([forecastKey,place.name,tz,+date])} onDate={(next,fetched)=>setDate(next,tab,undefined,fetched,true)} onRefresh={refresh} statusId="mobile-best-hour-planning-status"/><div className="mobile-night-glance-moon"><Moon size={17} aria-hidden="true"/><span>{moonPhaseLabel(moon.name,language)} · {Math.round(moon.illumination*100)}% {tr('lit','照明')} · {moon.altitude>0?tr('above horizon','地平線上'):tr('below horizon','地平線下')}</span></div><p className="mobile-night-glance-freshness">{loading?forecast?tr('Refreshing · previous forecast shown','正在更新，顯示先前預報'):tr('Loading forecast…','正在載入預報…'):error?forecast?tr('Refresh failed · previous forecast shown','更新失敗，顯示先前預報'):tr('Forecast unavailable','無法取得預報'):clockChanged?tr('Forecast age uncertain · check device clock','無法確認預報時間，請檢查裝置時鐘'):stale?tr('Forecast over 30 minutes old · refresh before relying on it','預報已超過 30 分鐘，請先更新'):forecast?tr('Forecast current · planning score is an estimate','預報為最新資料；觀測評分僅供參考'):tr('Forecast unavailable','無法取得預報')}</p></section>}<div hidden={tab==='aurora'}><ObservingTimeControl date={date} timezone={place.timezone} onDate={setDate} onDarkness={chooseNextDarkness} contextRevision={siteEditRevision}/></div>{pendingDestination&&<section className="panel unsaved-view-warning" aria-labelledby="unsaved-view-heading"><h2 id="unsaved-view-heading" ref={pendingHeading} tabIndex={-1}>{pendingText?tr('Your edits have not been saved','尚未儲存變更'):tr('Ready to continue','準備繼續')}</h2><p>{language==='zh-Hant'?(pendingText?`尚未儲存：${pendingEditLabel(pendingText,language)}。請先完成、儲存或複製變更；繼續可能捨棄尚未儲存的內容。`:'可以繼續前往所選功能。'):pendingIntent?.kind==='imaging'&&pendingText?`Your ${pendingText} have not been saved. Using this target replaces the mosaic centre and opens Photo tools. Keep editing to save or copy your changes before continuing. Unsaved imaging fields are available in Photo tools.`:pendingText==='observing-time changes'?`Your observing-time edit is unfinished. Choose an occurrence, enter a complete time, or cancel the edit before ${pendingIntent?.kind==='time'?'using this time shortcut':'changing the site'}. Continuing can discard this edit.`:pendingText?`Your ${pendingText} have not been saved. Keep this view open to save or copy your text before leaving. Leaving can discard changes held only in this view.`:'You can continue to the section you selected.'}</p>{pendingIntent?.kind==='sky-anchor'&&<p className="pending-context-summary">{tr('Requested section: ','要求前往：')}{skyShortcutLabel(pendingIntent.anchor.id,language,pendingIntent.anchor.label)}{tr('.','。')}</p>}{pendingIntent?.kind==='time'&&<p className="pending-context-summary">{tr('Next observing instant: ','下一個觀測時間：')}{pendingIntent.date.toISOString().replace('T',' ').replace('Z',' UTC')}{pendingIntent.target?` · ${pendingIntent.target.id}`:''}{pendingIntent.section!==tab?` · ${sectionLabel(pendingIntent.section,language,plannerSections.find(([key])=>key===pendingIntent.section)?.[1]||'selected section')}`:''}.</p>}{pendingIntent?.kind==='context'&&<p className="pending-context-summary">{tr('Next: ','接下來：')}{pendingIntent.place.name} · {pendingIntent.place.latitude.toFixed(3)}°, {pendingIntent.place.longitude.toFixed(3)}° · {sectionLabel(pendingIntent.section,language,plannerSections.find(([key])=>key===pendingIntent.section)?.[1]||'selected section')}{pendingIntent.date?` · ${pendingIntent.date.toISOString().replace('T',' ').replace('.000Z','Z').replace(/Z$/,' UTC')}`:tr(' · observing time kept',' · 觀測時間保持不變')}{pendingIntent.deepTarget?` · ${pendingIntent.deepTarget}`:''}</p>}{pendingIntent?.kind==='imaging'&&<p className="pending-context-summary">Next: Photo tools · {pendingIntent.target.id} · J2000 RA {pendingIntent.target.ra.toFixed(5)} h · Dec {pendingIntent.target.dec.toFixed(5)}°. Equipment and grid settings are kept.</p>}<div className="button-row"><button className="button" onClick={keepEditing}>{tr('Keep editing','繼續編輯')}</button><button className="button" onClick={leaveView}>{pendingIntent?.kind==='time'?tr('Use selected time','使用所選時間'):pendingIntent?.kind==='imaging'?tr('Use this imaging target','使用此攝影目標'):pendingText?tr('Leave without saving','不儲存並離開'):tr(`Continue to ${plannerSections.find(([key])=>key===pendingDestination)?.[1]||'selected section'}`,`繼續前往 ${sectionLabel(pendingDestination,language,'所選功能')}`)}</button></div></section>}{notice&&<div id="planner-notice" tabIndex={-1} className="notice" role="status" data-notice-code={notice===observingTimeRangeNotice?'time-range':undefined}>{noticeText(notice)}<button onClick={()=>setNotice('')} aria-label={tr('Dismiss message','關閉訊息')}><X size={16}/></button></div>}
 {!dark&&tab!=='places'&&tab!=='aurora'&&<section className="panel night-only-notice" aria-labelledby="night-only-heading"><h2 id="night-only-heading">{tr('Outside full astronomical darkness','目前不在完全天文黑夜')}</h2><p>{tr(`Nightjar shows observing information only when the Sun is below −18° at ${place.name}. Your selected time is kept; daytime and twilight results are hidden.`,`Nightjar 只在 ${place.name} 的太陽高度低於 −18° 時顯示觀測資訊。已保留所選時間，白天與曙暮光資料不會顯示。`)}</p>{darkRecovery?<p className="night-only-preview">{tr('Next full darkness: ','下一次完全天文黑夜：')}<time dateTime={darkRecovery.toISOString()}>{forecastHourLabel(darkRecovery,tz,dateLocale).full}</time> · {tz}</p>:<p className="night-only-empty" role="status">{tr('No full astronomical darkness was found within 48 hours of your selected time, or before the supported date limit. Some places have no full darkness in summer; choose another date or site.','所選時間後 48 小時內，或支援的日期範圍內，找不到完全天文黑夜。某些地點在夏季沒有完全天文黑夜；請選擇其他日期或地點。')}</p>}<div className="button-row"><button type="button" className="button" disabled={!darkRecovery} onClick={chooseNextDarkness}>{tr('Use this dark time','使用這個黑夜時間')}</button><button type="button" className="button" onClick={()=>setTab('places')}>{tr('Change observing site','更改觀測地點')}</button></div><p className="footnote">{tr('The search starts at your selected time and covers up to 48 hours. Your plan changes only when you choose a time or site.','搜尋從所選時間開始，最多涵蓋 48 小時。只有在你選擇時間或地點時，計畫才會更改。')}</p></section>}
 <TabsContent value="tonight"><div hidden={!dark} data-night-content="tonight"><div className="dashboard"><section className="panel outlook tonight-outlook"><div className="section-label"><span>{tr('OBSERVING OUTLOOK','觀測概況')}</span><Moon size={18}/></div><div className="score-row"><div className="outlook-summary"><h2>{loading?tr('Checking the skies…','正在查看天空狀況…'):score==null?tr('The sky has its own schedule.','目前沒有觀測評分。'):score>=75?tr('The night is yours.','今晚適合觀星。'):score>=45?tr('A little patience. A little wonder.','今晚值得留意。'):score===0&&!dark?tr('Wait for the darkness.','請等待天黑。'):tr('Keep an eye on the clouds.','請留意雲量。')}</h2><p className="muted">{loading?tr('Looking up your local weather.','正在取得當地天氣。'):error?error:!current?tr('No forecast for this selected hour. Your sky atlas still works for this date.','所選時段沒有預報；星空圖仍可使用。'):!planning.scored?tr('Cloud estimates are missing for these hours. Your sky atlas still works.','這些時段缺少雲量預報；星空圖仍可使用。'):best&&best.score!==null&&best.score>0?tr(`Best of the next 12 hours: ${forecastHourLabel(best.date,tz,dateLocale).full} · ${best.score}/100.`,`未來 12 小時最佳時間：${forecastHourLabel(best.date,tz,dateLocale).full} · ${best.score}/100。`):tr('Conditions are limited in this window. Try another time.','這段時間的條件有限，請嘗試其他時間。')}</p></div><div className="score-ring" style={{'--score':`${score??0}%`} as CSSProperties}><div><strong>{score??'—'}</strong><span>{tr('PLANNING SCORE / 100','觀測評分／100')}</span></div></div><div className="best-window"><span>{tr('Best forecast time','最佳預報時間')}</span><strong>{best&&best.score!==null&&best.score>0?timeLabel(best.date,tz):'—'}</strong><small>{best&&best.score!==null&&best.score>0?`${forecastHourLabel(best.date,tz,dateLocale).full} · ${best.score}/100 · ${tz}`:loading?tr('Checking forecast hours…','正在查看逐時預報…'):!forecast?tr('Forecast unavailable.','無法取得預報。'):!current?tr('Selected hour has no forecast.','所選時段沒有預報。'):!planning.scored?tr('Planning scores unavailable.','無法取得觀測評分。'):planning.missing?tr(`No favourable scored hour · ${planning.missing} unavailable.`,`沒有適合的評分時段 · ${planning.missing} 個時段無資料。`):tr('No favourable hour in the next 12 hours','未來 12 小時沒有適合的時段')}</small><ForecastBestHour best={best} timezone={tz} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} loading={loading} error={error} stale={stale} clockChanged={clockChanged} contextKey={JSON.stringify([forecastKey,place.name,tz,+date])} onDate={(next,fetched)=>setDate(next,tab,undefined,fetched,true)} onRefresh={refresh}/><button className="text-button" onClick={()=>setTab('sky')}>{tr('Explore sky','探索星空')} <ArrowUpRight size={16}/></button></div></div><div className="outlook-bottom"><span className="pill">{dark?tr('ASTRONOMICAL NIGHT','完全天文黑夜'):tr('TWILIGHT / DAYLIGHT','曙暮光／白天')}</span><ObservingSummaryDownload date={date} place={place} forecast={forecast} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} refreshing={loading} refreshFailed={Boolean(error)} onNotice={setNotice}/></div>{!loading&&!current&&hours.length>0&&<p className="footnote forecast-gap" role="status">{tr('The selected hour has no forecast sample. Later available hours are shown below; timestamp gaps are not filled.','所選時段沒有預報資料。下方顯示較晚的可用時段；缺少的時間不會補值。')}</p>}{!loading&&planning.missing>0&&<p className="footnote forecast-coverage" role="status">{tr(`Scored ${planning.scored} of ${planning.total} available forecast hours. Missing cloud estimates are not treated as clear skies.`,`可用預報時段中，${planning.total} 個有 ${planning.scored} 個已評分。缺少的雲量資料不會視為晴空。`)}</p>}<WeatherFreshness hasForecast={Boolean(forecast)} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} timezone={tz} loading={loading} error={error} stale={stale} clockChanged={clockChanged} onRefresh={refresh}/></section><section className="panel next-panel"><div className="section-label"><span>{tr('YOUR NIGHT, HOUR BY HOUR','逐時夜間預報')}</span><span className="muted">{tz} · Open-Meteo</span></div>{hours.length?<HourlyForecast hours={hours} currentDate={current?.date} timezone={tz} onDate={setDate}/>:<p className="empty-text">{loading?tr('Loading hourly conditions…','正在載入逐時預報…'):error?error:tr('No full-darkness forecast samples in the next 12 hours. Choose another time or site.','未來 12 小時沒有完全天文黑夜的預報資料。請選擇其他時間或地點。')}</p>}<p className="footnote">{tr('Planning score: cloud cover (80%) + darkness (20%), with up to 20 points deducted for an illuminated Moon above the horizon. Only samples with the Sun below −18° are displayed. The current score uses your exact observing time; hourly rows use forecast-hour starts. The next 12 hours can include partial first and last forecast hours. This is an estimate, not a seeing forecast.','觀測評分：雲量佔 80%，黑暗程度佔 20%；地平線上的月球最多扣 20 分。只顯示太陽低於 −18° 的資料。目前評分使用精確的觀測時間；逐時資料使用預報時段的開始時間。首尾時段可能不完整。評分僅供參考，並非大氣視寧度預報。')}</p></section><section className="panel atlas-preview"><div className="section-label"><span>{tr(`THE SKY ABOVE ${place.name.toUpperCase()}`,`${place.name} 上空`)}</span><Compass size={18}/></div><SkyChart place={place} date={when}/><div className="atlas-footer"><span className="muted">{tr('North up · looking overhead','北方在上 · 仰望天空')}</span><button className="text-button" onClick={()=>setTab('sky')}>{tr('Open sky atlas','開啟星空圖')} <ArrowUpRight size={16}/></button></div></section></div><DarknessRemaining date={date} place={place}/>
 {forecastRecovery&&!loading&&<section className="panel forecast-recovery" aria-labelledby="forecast-recovery-title"><div><h2 id="forecast-recovery-title">{tr('Cloud forecast is unavailable at this time','此時段沒有雲量預報')}</h2><p className="muted">{tr(`Your selected time is outside the forecast, in a gap, or has no cloud estimate. Sky positions still use your selected time. The closest full-darkness hour with cloud data is ${forecastHourLabel(forecastRecovery,tz,dateLocale).full}.`,`所選時間超出預報範圍、處於資料缺口或缺少雲量估計。天體位置仍使用所選時間。最近有雲量資料的完全黑夜時段為 ${forecastHourLabel(forecastRecovery,tz,dateLocale).full}。`)}</p></div><button type="button" className="button" onClick={()=>setDate(forecastRecovery)}>{tr('Use closest forecast hour','使用最近的預報時段')} <ArrowUpRight size={16}/></button></section>}
 <div className="metrics">{([[Cloud,tr('Cloud cover','雲量'),current?.cloud!=null?`${current.cloud}%`:'—',tr('Less cloud, more sky','雲量越少，天空越開闊')],[Moon,tr('Moon illumination','月球照明'),`${Math.round(moon.illumination*100)}%`,moonPhaseLabel(moon.name,language)],[Wind,tr('Wind speed','風速'),current?.wind!=null?`${current.wind} km/h`:'—',tr('At 10 m above ground','距地面 10 公尺')],[Droplets,tr('Humidity','濕度'),current?.humidity!=null?`${current.humidity}%`:'—',tr('Watch for dew on optics','留意光學設備結露')]] as const).map(([Icon,label,value,sub])=><section className="metric" key={label}><div><Icon size={18}/><span>{label}</span></div><strong>{value}</strong><small>{sub}</small></section>)}</div>
 <SevenNightOutlook requestKey={forecastKey} hourly={forecast?.hourly} place={place} loading={loading} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} error={error} onRefresh={refresh} selectedDate={date} onDate={(next,fetched)=>setDate(next,tab,undefined,fetched)}/>

 <AtmosphereDetails hourly={forecast?.hourly} date={when} timezone={tz} loading={loading}/>{dark&&<CloudModelComparison place={place} date={when}/>}{dark&&<AstronomyForecastPanel place={place} date={when} onSelect={next=>setDate(next)}/>} <section className="panel milestones"><div className="section-label"><span>{tr('THE RHYTHM OF THE NIGHT','夜間天象時間')}</span><span className="muted">{tr('Next events after your selected time','所選時間之後的天象')}</span></div><div className="milestone-grid">{milestones.map(m=><div key={m.label}><small>{m.label}</small><strong>{m.date?timeLabel(m.date,tz):"—"}</strong><span>{m.date?new Intl.DateTimeFormat(dateLocale,{day:"numeric",month:"short",timeZone:tz}).format(m.date):t(shortenedMilestones?'main.noCrossingLimit':'main.noCrossing48')}</span></div>)}</div>{shortenedMilestones&&<p className="notice" role="status">{t('main.crossingLimit')}</p>}<p className="footnote">{t('main.timesNote',{timezone:tz})}</p></section><div className="bottom-grid"><section className="panel"><div className="section-label"><span>{tr('ABOVE THE HORIZON','地平線上的天體')}</span><Telescope size={18}/></div>{skyObjects.length?skyObjects.slice(0,3).map(o=><button className="object-row" key={o.body} onClick={()=>{setSelectedTarget(o.body);setTab('sky')}}><span className="object-icon">✦</span><span><strong>{skyTargetLabel(o.body,language)}</strong><small>{t('main.altAz',{altitude:Math.round(o.altitude),azimuth:Math.round(o.azimuth)})}</small></span><ArrowUpRight size={17}/></button>):<p className="muted">{tr('The bright planets and Moon are below your horizon. Explore the stars in the atlas.','明亮行星與月球都在地平線下。可在星空圖中探索恆星。')}</p>}</section><section className="panel moon-card"><div className="section-label"><span>{tr('TONIGHT’S MOON','今晚的月球')}</span><Moon size={18}/></div><h2>{moonPhaseLabel(moon.name,language)}</h2><p className="muted">{tr(`${Math.round(moon.illumination*100)}% illuminated · ${moon.altitude>0?`${Math.round(moon.altitude)}° above the horizon`:'Below the horizon'}`,`照明比例 ${Math.round(moon.illumination*100)}% · ${moon.altitude>0?`地平線上 ${Math.round(moon.altitude)}°`:'地平線下'}`)}</p><p className="muted">{moonObservingAdvice(moon,language)}</p></section></div></div></TabsContent>
 <TabsContent value="aurora"><DeferredView name="Aurora"><AuroraPanel place={place} onLocation={()=>setTab("places")} weather={{forecast:forecast??null,fetchedAt:forecast?weather?.fetchedAt:undefined,loading,error:Boolean(error)}} onRefreshWeather={refresh}/></DeferredView></TabsContent>
 <TabsContent value="sky"><div hidden={!dark} data-night-content="sky"><DeferredView name="Satellite directions"><SatelliteTracker date={when} place={place} onDate={chooseSatelliteTime} weather={{forecast:forecast??null,fetchedAt:forecast?weather?.fetchedAt:undefined,loading,error:Boolean(error)}} onRefreshWeather={refresh}/></DeferredView>{anchorNotice&&<p role="status" className="muted sky-shortcut-status">{shortcutNotice}</p>}<SkyShortcuts onCamera={launcher=>{cameraReturnFocus.current=launcher;setCameraDeepTarget('');setCameraOpen(true)}}/><DeferredView key={`deep-sky-${planRevision}`} name="Deep-sky explorer"><DeepSkyFinder browsing={deepSkyBrowsing} onCamera={(target,launcher)=>{cameraReturnFocus.current=launcher;setCameraDeepTarget(target.id);setCameraOpen(true)}} request={deepSkyRequest??undefined} onRequestHandled={clearDeepSkyRequest} date={when} place={place} onPlan={(id,next)=>chooseTargetTime({catalogue:'deep',id},next)} onFrame={target=>{navigation.request({kind:'imaging',section:'tools',target:{id:target.id,ra:target.ra,dec:target.dec}},Boolean(pendingEdits.snapshot()),applyNavigation)}}/></DeferredView><DeferredView key={`targets-${planRevision}`} name="Target finder"><TargetFinder browsing={brightTargetBrowsing} date={when} place={place} selected={selectedTarget} onSelect={setSelectedTarget}/></DeferredView><div className="sky-layout"><section id="sky-chart" tabIndex={-1} className="panel full-atlas"><div className="section-label"><span>{tr('ALL-SKY VIEW','全天空檢視')}</span><span>{timeLabel(when,tz)} {place.timezone?tr('AT SITE','地點當地時間'):'UTC'}</span></div><SkyLayerControls showLines={showStarPatterns} showLabels={showSkyLabels} showMilkyWay={showMilkyWay} onLinesChange={setShowStarPatterns} onLabelsChange={setShowSkyLabels} onCoreChange={setShowMilkyWay}/>{layerStorageError&&<p className="muted" role="status">{t('main.layerStorage')}</p>}<SkyAtlasViewer showImaging={showImagingGrid} onShowImagingChange={setShowImagingGrid} imagingDraft={imagingState.draft} imagingDraftStatus={imagingState.status} onEditImaging={()=>setTab('tools')} cameraDeepTarget={cameraDeepTarget||undefined} cameraOpen={cameraOpen} onCameraOpenChange={setCameraOpen} cameraReturnFocus={cameraReturnFocus} onCameraLauncherChange={launcher=>{cameraReturnFocus.current=launcher;if(launcher)setCameraDeepTarget('')}} onCameraPlan={(date,place,id)=>{choose(place,{date,section:'sky',deepTarget:id})}} view={atlasView} onViewChange={chooseAtlasView} viewStorageError={viewStorageError} place={place} date={when} selected={selectedTarget} showLines={showStarPatterns} showLabels={showSkyLabels} showMilkyWay={showMilkyWay} onSelect={setSelectedTarget} onLinesChange={setShowStarPatterns} onLabelsChange={setShowSkyLabels} onCoreChange={setShowMilkyWay}/><div className="chart-actions"><span className="muted">{selectedTarget?tr(`Selected: ${selectedTarget}`,`已選擇：${selectedTarget}`):tr('Select a target to highlight it','選擇天體以醒目顯示')}</span>{selectedTarget&&<a className="text-button" href="#target-details">{t('main.viewDetails',{name:skyTargetLabel(selectedTarget,language)})}</a>}<a className="text-button" href="#target-finder">{tr('Find another target ↑','尋找其他天體 ↑')}</a></div><p className="footnote">{t('main.atlasNote')}</p></section><section className="panel"><div className="section-label"><span>{tr('VISIBLE SOLAR SYSTEM','可見的太陽系天體')}</span></div>{skyObjects.map(o=><div className="object-row" key={o.body}><Star size={18}/><span><strong>{skyTargetLabel(o.body,language)}</strong><small>{t('main.altitude',{value:o.altitude.toFixed(1)})}<br/>{t('main.azimuth',{value:o.azimuth.toFixed(1)})}</small></span></div>)}{!skyObjects.length&&<p className="muted">{tr('No listed planets or Moon above the horizon.','沒有列出的行星或月球位於地平線上方。')}</p>}<h3 className="spaced">{tr('Reading the sky','如何閱讀星空')}</h3><p className="muted">{t('main.skyHelp')}</p><p className="muted">{t('main.horizon')}</p></section></div><DeferredView name="Sky planning tools"><MilkyWayPlanner date={when} place={place} onDate={setDate}/><PlanetVisibility browsing={brightTargetBrowsing.visibility} date={when} place={place} selected={selectedTarget} onPlan={(id,next)=>chooseTargetTime({catalogue:'bright',id},next)}/></DeferredView></div></TabsContent>
 <TabsContent value="places"><div className="places-layout"><section className="panel"><div className="section-label"><span>{tr('CHOOSE AN OBSERVING SITE','選擇觀測地點')}</span><MapPin size={18}/></div><form className="search-form" onSubmit={search}><label className="sr-only" htmlFor="location-search">{tr('Town or city','城鎮或城市')}</label><input id="location-search" type="search" autoComplete="off" placeholder={tr('Search a town or city…','搜尋城鎮或城市…')} value={query} onChange={e=>changeSearchQuery(e.target.value)} maxLength={100} aria-describedby={searchError?'location-search-feedback':undefined}/><button className="button primary" disabled={searching}><Search size={17}/>{searching?tr('Searching…','搜尋中…'):tr('Search','搜尋')}</button></form>{language==='zh-Hant'&&<p className="footnote location-search-language-help">地名搜尋可能需要英文或拼音；也可以使用目前位置或輸入座標。</p>}{searching&&<button className="text-button" onClick={cancelSearch}>{tr('Cancel location search','取消地點搜尋')}</button>}{query&&!searching&&<button type="button" className="text-button location-search-clear" onClick={()=>{changeSearchQuery('');document.getElementById('location-search')?.focus()}}>{tr('Clear location search','清除地點搜尋')}</button>}<button className="text-button" onClick={locate} disabled={locating}><LocateFixed size={16}/>{locating?tr('Finding your location…','正在定位…'):tr('Use my current location','使用目前位置')}</button>{locating&&<button className="text-button" onClick={cancelLocation}>{tr('Keep selected site','保留所選地點')}</button>}{searchError&&<p id="location-search-feedback" className="error" role="alert">{placeFeedback(searchError,t)}</p>}<div className="search-results">{results.map(r=><button key={r.id} onClick={()=>planAtSite({name:r.name,latitude:r.latitude,longitude:r.longitude,country:r.country,timezone:r.timezone})}><MapPin size={16}/><span>{r.name}{(r.admin1||r.country)&&<small>{[r.admin1,r.country].filter(Boolean).join(', ')}</small>}<small className="location-result-coordinates">{r.latitude.toFixed(3)}°, {r.longitude.toFixed(3)}°{r.timezone?` · ${r.timezone}`:tr(' · time zone unavailable',' · 無法取得時區')}</small></span><ChevronRight size={16}/></button>)}</div><details><summary>{tr('Or enter precise coordinates','或輸入精確座標')}</summary><CoordinateEntry latitude={lat} longitude={lon} onLatitude={value=>changeCoordinate('lat',value)} onLongitude={value=>changeCoordinate('lon',value)} onChoose={planAtSite} onClear={clearManualCoordinates}/></details><div className="saved-heading"><h3 ref={savedHeadingRef} tabIndex={-1}>{tr('Saved places','已儲存地點')}</h3><span className="muted">{tr('On this device','儲存於此裝置')}</span></div>{saved.length>savedPlacesLimit&&<p className="footnote">{t('main.legacyPlaces',{count:saved.length,limit:savedPlacesLimit})}</p>}{savedReadError&&<div className="saved-places-read-error"><p className="error" role="alert">{t('main.placesReadError')}{saved.length>0?t('main.placesLastRead'):''}{t('main.placesReadHelp')}</p><button type="button" className="button" onClick={retrySavedPlaces}>{t('main.retryPlaces')}</button></div>}{removedPlace&&<p className="place-removal-undo"><button ref={placeUndoRef} className="button" onClick={undoPlaceRemoval} disabled={savedReadError}>{t('main.undoPlace',{place:removedPlace.place.name})}</button>{placeUndoStatus&&<span className="error" role="status">{placeFeedback(placeUndoStatus,t)}</span>}<span className="footnote">{t('main.undoPlaceHelp')}</span></p>}<div id="saved-place-list">{saved.length?saved.slice(0,savedShown).map((p,i)=><div className="saved-row" key={savedRowKeys[i]}><button onClick={()=>planAtSite(p)}><MapPin size={17}/><span>{p.name}<small>{p.latitude.toFixed(3)}°, {p.longitude.toFixed(3)}°{p.bortle?t('main.bortleSaved',{value:p.bortle}):''}</small></span></button><button aria-label={tr(`Remove ${p.name}`,`移除 ${p.name}`)} onClick={()=>removePlace(p,i)} disabled={savedReadError}><Trash2 size={16}/></button></div>):!savedReadError&&<p className="muted">{tr('Save your favourite observing spots to return to them quickly.','儲存常用觀測地點，以便日後快速選擇。')}</p>}</div><SavedListControls count={saved.length} shown={savedShown} onChange={setSavedShown} label="saved places" listId="saved-place-list"/></section><section className="panel"><div className="section-label"><span>{tr('CURRENT LOCATION','目前觀測地點')}</span><MapPin size={18}/></div><h2>{place.name}</h2><SiteNameEditor key={`${place.latitude},${place.longitude}:${siteEditRevision}`} name={place.name} onSave={renameSite} disabled={savedReadError}/><p className="muted">{place.country} · {place.latitude.toFixed(3)}°, {place.longitude.toFixed(3)}°</p>{mapSource?<iframe title={t('main.mapTitle',{place:place.name})} className="place-map" src={mapSource} loading="lazy"/>:<p className="muted place-map-unavailable">{t('main.mapUnavailable')}</p>}<SiteDarkness key={`${place.latitude},${place.longitude}:${place.name}:${siteEditRevision}`} place={place} onChange={setSiteDarkness} disabled={savedReadError||placeReadError}/><div className="place-actions"><button className="button primary" onClick={savePlace} disabled={savedReadError}><Bookmark size={16}/>{saved.some(p=>same(p,place))?tr('Saved on this device','已儲存於此裝置'):tr('Save this place','儲存此地點')}</button><button className="text-button" onClick={openConditions}>{tr('View conditions','查看觀測狀況')} <ArrowUpRight size={16}/></button>{appleMapsLink&&<a className="button" href={appleMapsLink} target="_blank" rel="noopener noreferrer" aria-label={t('main.appleMaps',{place:place.name})}>{tr('Open in Apple Maps','在 Apple 地圖中開啟')} <ArrowUpRight size={16}/></a>}</div><p className="footnote">{t('main.baseMap')}</p><LightPollutionReference key={`${place.latitude},${place.longitude}`} latitude={place.latitude} longitude={place.longitude} name={place.name} savedSites={saved} savedUnavailable={savedReadError} onChoose={point=>{const owner=document.activeElement;if(choose(point,{section:'places'}))deferFocusAndScroll(()=>document.getElementById('planner-heading'),{owner})}}/></section></div><DeferredView name="Site comparison"><PlaceComparison selection={comparisonSelection} onSelectionChange={setComparisonSelection} places={saved} current={place} date={when} onChoose={(site,peers)=>planAtSite(site,undefined,undefined,peers)} onPlan={planAtSite}/></DeferredView><DeferredView name="Plan backup"><PlannerBackupPanel onRestore={data=>{savedRef.current=data.places;setSaved(data.places);setSavedReadError(false);setPlanRevision(value=>value+1)}}/></DeferredView></TabsContent>
 <TabsContent value="events"><div hidden={!dark} data-night-content="events"><section className="panel calendar-forecast" aria-label={t('meteor.forecastStatus')}><div className="section-label"><span>{t('meteor.forecastAt',{place:place.name.toUpperCase()})}</span></div><WeatherFreshness hasForecast={Boolean(forecast)} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} timezone={tz} loading={loading} error={error} stale={stale} clockChanged={clockChanged} onRefresh={refresh}/></section><DeferredView name="Sky calendar"><MeteorPlanner date={when} place={place} hourly={forecast?.hourly} onExplore={value=>setDate(value,'sky')} onNotice={setNotice}/></DeferredView></div></TabsContent>
 <TabsContent value="moon"><div hidden={!dark} data-night-content="moon"><DeferredView name="Moon explorer"><MoonExplorer date={when} place={place} onDate={setDate}/></DeferredView></div></TabsContent>
 <TabsContent value="tools"><div hidden={!dark} data-night-content="tools"><DeferredView key={`tools-${planRevision}`} name="Photo tools"><p className="footnote">Daylight, golden-hour and blue-hour information is hidden in full-darkness mode.</p><PhotoPlanner draft={imagingState.draft} draftStatus={imagingState.status} onChange={changeImagingDraft} onRetryDraft={()=>changeImagingDraft({})} onRetryDraftRead={retryImagingDraftRead} focusMosaic={focusImaging} onFocusDone={()=>setFocusImaging(false)}/></DeferredView></div></TabsContent>
 </main></Tabs><footer><span>nightjar. <span className="muted">{t('main.footer')}</span></span><span className="muted"><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">{t('main.weatherSource')}</a> · <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noreferrer">Astronomy Engine</a></span></footer></div>
}
