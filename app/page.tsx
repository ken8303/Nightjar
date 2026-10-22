"use client";
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
import {placeMapSource} from '@/lib/place-map';
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
import SevenNightOutlook from '@/components/seven-night-outlook';
import WeatherFreshness from '@/components/weather-freshness';
import ForecastBestHour from '@/components/forecast-best-hour';
import HourlyForecast from '@/components/hourly-forecast';
import ObservingSummaryDownload from '@/components/observing-summary-download';
import {forecastFreshness} from '@/lib/forecast-freshness';
import {createDeepSkyBrowsing,createBrightTargetBrowsing} from '@/lib/target-browsing';
import SiteDarkness from '@/components/site-darkness';
import {rateObservingSite,SiteRatingReadError} from '@/lib/site-rating';
import {weatherHours,type WeatherForecast} from '@/lib/weather-hours';
import {readForecastResponse,forecastFailureMessage} from '@/lib/forecast-response';
import {forecastPlanning,forecastHourLabel,closestForecastHour} from '@/lib/weather-planning';
import {validPlace,readPlannerSetup,readObservingSite,recoveryPlannerContextKey,resolveObservingPlace,samePlaceCoordinates as same} from '@/lib/planner-state';
import {upsertSavedPlace,readSavedPlaces,removeSavedPlace,restoreSavedPlace,savedPlacesLimit,savedPlaceRowKeys} from '@/lib/saved-collections';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {useClientReady} from '@/hooks/use-client-ready';
import {useForecastRefresh} from '@/hooks/use-forecast-refresh';
import {usePlanningClock} from '@/hooks/use-planning-clock';
import DeferredView from '@/components/deferred-view';
import LightPollutionReference from '@/components/light-pollution-reference';
import {readPhotographyDraft,savePhotographyDraftPatch,type PhotographyDraft} from '@/lib/photography-draft';
const AuroraPanel=lazy(()=>import('@/components/aurora-panel'));
const MeteorPlanner=lazy(()=>import('@/components/meteor-planner'));
const SatelliteTracker=lazy(()=>import('@/components/satellite-tracker'));
const MoonExplorer=lazy(()=>import('@/components/moon-explorer'));
const PhotographyLight=lazy(()=>import('@/components/photography-light'));
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
export default function Home(){
 const ready=useClientReady();
 return ready?<Planner/>:<div className="app"><header id="page-top" className="top"><span className="brand"><Aperture size={30}/><span>nightjar.</span></span></header><main id="main-content" tabIndex={-1} className="startup-loading" aria-busy="true"><section className="panel" role="status"><h1>Getting your sky ready…</h1><p className="muted">Restoring your observing site and time.</p></section></main></div>;
}
function Planner(){
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
 const [tab,updateTab]=useState(()=>startupAnchor?'sky':'tonight'),[place,setPlace]=useState<Place>(setup.place),[saved,setSaved]=useState<Place[]>(setup.saved),[date,updateDate]=useState<Date>(setup.date),[query,setQuery]=useState(''),[results,setResults]=useState<LocationResult[]>([]),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState(''),[notice,setNotice]=useState(''),[lat,setLat]=useState(''),[lon,setLon]=useState('');
 const applyDate=useCallback((next:Date)=>{
  if(!validObservingDate(next)){
   setNotice(observingTimeRangeNotice);
   requestAnimationFrame(()=>{const feedback=document.getElementById('planner-notice');if(feedback?.textContent===observingTimeRangeNotice){feedback.focus({preventScroll:true});feedback.scrollIntoView({block:'center',behavior:'instant'})}});
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
 const setDate=useCallback((next:Date,section=tab,target?:PlannerTimeTarget)=>{
  if(!validObservingDate(next)){applyDate(next);return false}
  return navigation.request({kind:'time',section,date:next,...(target?{target}:{})},+next!==+date&&pendingEdits.hasSection('observing-time')||section!==tab&&Boolean(pendingEdits.snapshot(tab)),applyNavigation);
 },[applyDate,applyNavigation,date,navigation,tab]);
 function chooseNextDarkness(){
  const next=nextAstronomicalDarkness(new Date(),place);
  if(!next){setNotice(`No astronomical darkness occurs within the next 48 hours at ${place.name}, or before the supported date limit. Your observing time is unchanged.`);return}
  if(setDate(next))setNotice(`Astronomical darkness selected for ${place.name}: ${forecastHourLabel(next,place.timezone||'UTC').full}.`);
 }
 function chooseTargetTime(target:PlannerTimeTarget,next:Date){
  const owner=document.activeElement;
  if(setDate(next,'sky',target))deferFocusAndScroll(()=>document.getElementById(target.catalogue==='deep'?'deep-sky-object-details':'target-details'),{owner});
 }
 function chooseSatelliteTime(next:Date){
  const owner=document.activeElement;
  if(setDate(next))deferFocusAndScroll(()=>document.getElementById('planner-heading'),{owner});
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
  if(!navigation.continue(applyNavigation)||ownsFocus)return;
  const destination=target?(target.catalogue==='deep'?'deep-sky-object-details':'target-details'):'planner-heading';
  deferFocusAndScroll(()=>document.getElementById(destination),{owner});
 }

 const {revision,refresh,recordAttempt}=useForecastRefresh();
 const now=usePlanningClock();
 const siteKey=`${place.latitude},${place.longitude}`;
 const forecastKey=`${siteKey}:${revision}`;
 const [weather,setWeather]=useState<{key:string;siteKey:string;fetchedAt?:number;data?:WeatherForecast;error?:string}|null>(null);
 const forecast=weather?.siteKey===siteKey?weather.data:null,loading=weather?.key!==forecastKey,error=weather?.key===forecastKey?weather.error||'':'';
 const {stale,clockChanged}=forecastFreshness(forecast?weather?.fetchedAt:undefined,now);
 useEffect(()=>{savedRef.current=saved},[saved]);
 useEffect(()=>{
  const update=()=>{
   try{const latest=readSavedPlaces(localStorage);savedRef.current=latest;setSaved(latest);setSavedReadError(false)}catch{setSavedReadError(true)}
  };
  return watchSavedDataRefresh(update,window,document,{storage:()=>localStorage,key:'nightjar-places',hidden:()=>document.hidden});
 },[]);
 useEffect(()=>{placeRef.current=place},[place]);
 const choose=useCallback((p:Place,options:{date?:Date;section?:string;deepTarget?:string}={})=>{
  const next=resolveObservingPlace(p,savedRef.current,placeRef.current);
  if(options.date&&!Number.isFinite(+options.date))throw Error('Choose a valid observing time.');
  locationSession.current?.cancel();searchController.current?.abort();setSearching(false);
  const blocked=Boolean(pendingEdits.contextSnapshot(tab));if(blocked)setCameraOpen(false);
  return navigation.request({kind:'context',section:options.section||'tonight',place:next,date:options.date,deepTarget:options.deepTarget},blocked,applyNavigation);
 },[applyNavigation,navigation,setCameraOpen,tab]);
 function planAtSite(nextPlace:Place,nextDate?:Date){
  const owner=document.activeElement;
  if(choose(nextPlace,{date:nextDate}))deferFocusAndScroll(()=>document.getElementById('planner-heading'),{owner});
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
   const next=await searchLocations(query,{signal:controller.signal});
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
 const when=date,moon=useMemo(()=>moonInfo(date,place),[date,place]),tz=place.timezone||'UTC';
 const hours=useMemo(()=>weatherHours(forecast?.hourly,date,place),[forecast,date,place]);
 const planning=useMemo(()=>forecastPlanning(hours,date,place),[hours,date,place]),current=planning.current,best=planning.best,score=planning.score;
 const {dark,skyObjects}=useMemo(()=>({dark:sunAltitude(when,place)<-18,skyObjects:skyBodies.map(body=>({body,...bodyPosition(body,when,place)})).filter(p=>p.altitude>0).sort((a,b)=>b.altitude-a.altitude)}),[when,place]);

 const milestones=useMemo(()=>observingMilestones(when,place),[when,place]);
 const forecastRecovery=useMemo(()=>forecast&&!current?closestForecastHour(forecast.hourly.time,date):null,[forecast,current,date]);
 const shortenedMilestones=!validObservingDate(new Date(+when+48*3600000));
 const mapSource=placeMapSource(place);
 const title={tonight:'A night worth looking up.',sky:'Get to know your sky.',moon:'A world within reach.',places:'Find your place in the dark.',events:'Make a date with the cosmos.',tools:'Frame something extraordinary.',aurora:place.latitude<0?'Follow the southern lights.':'Follow the northern lights.'}[tab];
 useEffect(()=>{const context=(document as Document & {modelContext?:ModelContext}).modelContext;if(!context?.registerTool)return;const controller=new AbortController();Promise.resolve(context.registerTool({name:'set_observing_location',description:'Set the observing coordinates and show the Tonight dashboard.',inputSchema:{type:'object',properties:{name:{type:'string'},latitude:{type:'number',minimum:-90,maximum:90},longitude:{type:'number',minimum:-180,maximum:180}},required:['name','latitude','longitude'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input:unknown)=>{if(!validPlace(input))throw Error('Invalid observing location');const location=resolveObservingPlace(input,savedRef.current,placeRef.current);let applied=false;flushSync(()=>{applied=choose(location)});if(!applied)throw Error('Save or discard unfinished edits before applying the requested observing site.');return{location,view:'tonight'}}},{signal:controller.signal})).catch(()=>{});return()=>controller.abort()},[choose]);
 return <div className="app"><Tabs value={tab} onValueChange={setTab}><header id="page-top" tabIndex={-1} className="top"><button type="button" className="brand" aria-label="Nightjar home" onClick={()=>setTab('tonight')}><Aperture size={30}/><span>nightjar<span className="brand-dot">.</span></span></button><div className="nav-wrap"><TabsList className="navigation" variant="line">{plannerSections.map(([key,label,Icon])=><TabsTrigger key={key} value={key} onClick={()=>setTab(key)}><Icon size={17}/>{label}</TabsTrigger>)}</TabsList></div><a className="install-shortcut" href="#install-app">Install app <ArrowUpRight size={15}/></a></header><MobileNavigation section={tab} onSelect={setTab}/><main id="main-content" tabIndex={-1}><div className="page-heading"><div><h1 id="planner-heading" tabIndex={-1}>{title}</h1><p className="muted">{tab==='tonight'?'Find your window. Choose your place. Meet the night sky.':`${place.name} · ${place.latitude.toFixed(2)}°, ${place.longitude.toFixed(2)}°`}</p></div><div className="heading-utilities"><button className="location-button" onClick={()=>setTab('places')}><MapPin size={18}/>{place.name}<ChevronRight size={17}/></button><ViewingMode/></div></div>{placeReadError&&<section className="panel startup-site-warning"><h2>Stored observing site unavailable</h2><p role="alert">Your stored observing site could not be read. {place.name} is shown for this visit; the stored value is unchanged. Choose a site in My places to replace it, or download a raw recovery copy before repairing it.</p><div className="button-row"><button type="button" className="button" onClick={retryObservingSite}>Retry reading observing site</button><button type="button" className="button" onClick={()=>setTab('places')}>Open My places</button></div></section>}<div hidden={tab==='aurora'}><ObservingTimeControl date={date} timezone={place.timezone} onDate={setDate} onDarkness={chooseNextDarkness} contextRevision={siteEditRevision}/></div>{pendingDestination&&<section className="panel unsaved-view-warning" aria-labelledby="unsaved-view-heading"><h2 id="unsaved-view-heading" ref={pendingHeading} tabIndex={-1}>{pendingText?'Your edits have not been saved':'Ready to continue'}</h2><p>{pendingIntent?.kind==='imaging'&&pendingText?`Your ${pendingText} have not been saved. Using this target replaces the mosaic centre and opens Photo tools. Keep editing to save or copy your changes before continuing. Unsaved imaging fields are available in Photo tools.`:pendingText==='observing-time changes'?`Your observing-time edit is unfinished. Choose an occurrence, enter a complete time, or cancel the edit before ${pendingIntent?.kind==='time'?'using this time shortcut':'changing the site'}. Continuing can discard this edit.`:pendingText?`Your ${pendingText} have not been saved. Keep this view open to save or copy your text before leaving. Leaving can discard changes held only in this view.`:'You can continue to the section you selected.'}</p>{pendingIntent?.kind==='sky-anchor'&&<p className="pending-context-summary">Requested section: {pendingIntent.anchor.label}.</p>}{pendingIntent?.kind==='time'&&<p className="pending-context-summary">Next observing instant: {pendingIntent.date.toISOString().replace('T',' ').replace('Z',' UTC')}{pendingIntent.target?` · ${pendingIntent.target.id}`:''}{pendingIntent.section!==tab?` · ${plannerSections.find(([key])=>key===pendingIntent.section)?.[1]||'selected section'}`:''}.</p>}{pendingIntent?.kind==='context'&&<p className="pending-context-summary">Next: {pendingIntent.place.name} · {pendingIntent.place.latitude.toFixed(3)}°, {pendingIntent.place.longitude.toFixed(3)}° · {plannerSections.find(([key])=>key===pendingIntent.section)?.[1]||'selected section'}{pendingIntent.date?` · ${pendingIntent.date.toISOString().replace('T',' ').replace('.000Z','Z').replace(/Z$/,' UTC')}`:' · observing time kept'}{pendingIntent.deepTarget?` · ${pendingIntent.deepTarget}`:''}</p>}{pendingIntent?.kind==='imaging'&&<p className="pending-context-summary">Next: Photo tools · {pendingIntent.target.id} · J2000 RA {pendingIntent.target.ra.toFixed(5)} h · Dec {pendingIntent.target.dec.toFixed(5)}°. Equipment and grid settings are kept.</p>}<div className="button-row"><button className="button" onClick={keepEditing}>Keep editing</button><button className="button" onClick={leaveView}>{pendingIntent?.kind==='time'?'Use selected time':pendingIntent?.kind==='imaging'?'Use this imaging target':pendingText?'Leave without saving':`Continue to ${plannerSections.find(([key])=>key===pendingDestination)?.[1]||'selected section'}`}</button></div></section>}{notice&&<div id="planner-notice" tabIndex={-1} className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss message"><X size={16}/></button></div>}
 <TabsContent value="tonight"><div className="dashboard"><section className="panel outlook"><div className="section-label"><span>OBSERVING OUTLOOK</span><Moon size={18}/></div><div className="score-row"><div className="outlook-summary"><h2>{loading?'Checking the skies…':score==null?'The sky has its own schedule.':score>=75?'The night is yours.':score>=45?'A little patience. A little wonder.':score===0&&!dark?'Wait for the darkness.':'Keep an eye on the clouds.'}</h2><p className="muted">{loading?'Looking up your local weather.':error?error:!current?'No forecast for this selected hour. Your sky atlas still works for this date.':!planning.scored?'Cloud estimates are missing for these hours. Your sky atlas still works.':best&&best.score!==null&&best.score>0?`Best of the next 12 hours: ${forecastHourLabel(best.date,tz).full} · ${best.score}/100.`:'Conditions are limited in this window. Try another time.'}</p></div><div className="score-ring" style={{'--score':`${score??0}%`} as CSSProperties}><div><strong>{score??'—'}</strong><span>OUT OF 100</span></div></div><div className="best-window"><span>Best forecast time</span><strong>{best&&best.score!==null&&best.score>0?timeLabel(best.date,tz):'—'}</strong><small>{best&&best.score!==null&&best.score>0?`${forecastHourLabel(best.date,tz).full} · ${best.score}/100 · ${tz}`:loading?'Checking forecast hours…':!forecast?'Forecast unavailable.':!current?'Selected hour has no forecast.':!planning.scored?'Planning scores unavailable.':planning.missing?`No favourable scored hour · ${planning.missing} unavailable.`:'No favourable hour in the next 12 hours'}</small><ForecastBestHour best={best} timezone={tz} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} loading={loading} error={error} stale={stale} clockChanged={clockChanged} contextKey={JSON.stringify([forecastKey,place.name,tz,+date])} onDate={setDate} onRefresh={refresh}/><button className="text-button" onClick={()=>setTab('sky')}>Explore sky <ArrowUpRight size={16}/></button></div></div><div className="outlook-bottom"><span className="pill">{dark?'ASTRONOMICAL NIGHT':'TWILIGHT / DAYLIGHT'}</span><ObservingSummaryDownload date={date} place={place} forecast={forecast} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} refreshing={loading} refreshFailed={Boolean(error)} onNotice={setNotice}/></div>{!loading&&!current&&hours.length>0&&<p className="footnote forecast-gap" role="status">The selected hour has no forecast sample. Later available hours are shown below; timestamp gaps are not filled.</p>}{!loading&&planning.missing>0&&<p className="footnote forecast-coverage" role="status">Scored {planning.scored} of {planning.total} available forecast hours. Missing cloud estimates are not treated as clear skies.</p>}<WeatherFreshness hasForecast={Boolean(forecast)} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} timezone={tz} loading={loading} error={error} stale={stale} clockChanged={clockChanged} onRefresh={refresh}/></section><section className="panel atlas-preview"><div className="section-label"><span>THE SKY ABOVE {place.name.toUpperCase()}</span><Compass size={18}/></div><SkyChart place={place} date={when}/><div className="atlas-footer"><span className="muted">North up · looking overhead</span><button className="text-button" onClick={()=>setTab('sky')}>Open sky atlas <ArrowUpRight size={16}/></button></div></section></div>
 {forecastRecovery&&!loading&&<section className="panel forecast-recovery" aria-labelledby="forecast-recovery-title"><div><h2 id="forecast-recovery-title">Weather is unavailable at this time</h2><p className="muted">Your selected time is outside the forecast or in a gap. Sky positions still use your selected time. The closest available forecast hour is {forecastHourLabel(forecastRecovery,tz).full}.</p></div><button type="button" className="button" onClick={()=>setDate(forecastRecovery)}>Use closest forecast hour <ArrowUpRight size={16}/></button></section>}
 <div className="metrics">{([[Cloud,'Cloud cover',current?.cloud!=null?`${current.cloud}%`:'—','Less cloud, more sky'],[Moon,'Moon illumination',`${Math.round(moon.illumination*100)}%`,moon.name],[Wind,'Wind speed',current?.wind!=null?`${current.wind} km/h`:'—','At 10 m above ground'],[Droplets,'Humidity',current?.humidity!=null?`${current.humidity}%`:'—','Watch for dew on optics']] as const).map(([Icon,label,value,sub])=><section className="metric" key={label}><div><Icon size={18}/><span>{label}</span></div><strong>{value}</strong><small>{sub}</small></section>)}</div>
 <SevenNightOutlook requestKey={forecastKey} hourly={forecast?.hourly} place={place} loading={loading} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} error={error} onRefresh={refresh} selectedDate={date} onDate={setDate}/>
 <section className="panel next-panel"><div className="section-label"><span>YOUR NIGHT, HOUR BY HOUR</span><span className="muted">{tz} · Open-Meteo</span></div>{hours.length?<HourlyForecast hours={hours} currentDate={current?.date} timezone={tz} onDate={setDate}/>:<p className="empty-text">{loading?'Loading hourly conditions…':error||'No weather forecast for this date. Select a time within the next 7 days.'}</p>}<p className="footnote">Planning score: cloud cover (80%) + darkness (20%), with up to 20 points deducted for an illuminated Moon above the horizon. Daylight scores 0. The current score uses your exact observing time; hourly rows use forecast-hour starts. The next 12 hours can include partial first and last forecast hours. This is an estimate, not a seeing forecast.</p></section>
 <AtmosphereDetails hourly={forecast?.hourly} date={when} timezone={tz} loading={loading}/><section className="panel milestones"><div className="section-label"><span>THE RHYTHM OF THE NIGHT</span><span className="muted">Next events after your selected time</span></div><div className="milestone-grid">{milestones.map(m=><div key={m.label}><small>{m.label}</small><strong>{m.date?timeLabel(m.date,tz):"—"}</strong><span>{m.date?new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",timeZone:tz}).format(m.date):shortenedMilestones?"No crossing before the date limit":"No crossing in 48 hours"}</span></div>)}</div>{shortenedMilestones&&<p className="notice" role="status">The event search ends at the supported UTC date limit, before a full 48 hours. Your selected observing time is unchanged.</p>}<p className="footnote">Times in {tz}. Full darkness means the Sun is 18° below the horizon. At high latitudes some events may not occur. Terrain is not included.</p></section><div className="bottom-grid"><section className="panel"><div className="section-label"><span>ABOVE THE HORIZON</span><Telescope size={18}/></div>{skyObjects.length?skyObjects.slice(0,3).map(o=><button className="object-row" key={o.body} onClick={()=>{setSelectedTarget(o.body);setTab('sky')}}><span className="object-icon">✦</span><span><strong>{o.body}</strong><small>{Math.round(o.altitude)}° altitude · {Math.round(o.azimuth)}° azimuth</small></span><ArrowUpRight size={17}/></button>):<p className="muted">The bright planets and Moon are below your horizon. Explore the stars in the atlas.</p>}</section><section className="panel moon-card"><div className="section-label"><span>TONIGHT’S MOON</span><Moon size={18}/></div><h2>{moon.name}</h2><p className="muted">{Math.round(moon.illumination*100)}% illuminated · {moon.altitude>0?`${Math.round(moon.altitude)}° above the horizon`:'Below the horizon'}</p><p className="muted">{moon.illumination>.7?'Bright moonlight can wash out faint galaxies and nebulae. Try lunar detail or bright planets.':'Look for faint targets while the Moon is below the horizon and the sky is fully dark.'}</p></section></div></TabsContent>
 <TabsContent value="aurora"><DeferredView name="Aurora"><AuroraPanel place={place} onLocation={()=>setTab("places")}/></DeferredView></TabsContent>
 <TabsContent value="sky"><DeferredView name="Satellite directions"><SatelliteTracker date={when} place={place} onDate={chooseSatelliteTime} weather={{forecast:forecast??null,fetchedAt:forecast?weather?.fetchedAt:undefined,loading,error:Boolean(error)}} onRefreshWeather={refresh}/></DeferredView>{anchorNotice&&<p role="status" className="muted sky-shortcut-status">{anchorNotice}</p>}<SkyShortcuts onCamera={launcher=>{cameraReturnFocus.current=launcher;setCameraDeepTarget('');setCameraOpen(true)}}/><DeferredView key={`deep-sky-${planRevision}`} name="Deep-sky explorer"><DeepSkyFinder browsing={deepSkyBrowsing} onCamera={(target,launcher)=>{cameraReturnFocus.current=launcher;setCameraDeepTarget(target.id);setCameraOpen(true)}} request={deepSkyRequest??undefined} onRequestHandled={clearDeepSkyRequest} date={when} place={place} onPlan={(id,next)=>chooseTargetTime({catalogue:'deep',id},next)} onFrame={target=>{navigation.request({kind:'imaging',section:'tools',target:{id:target.id,ra:target.ra,dec:target.dec}},Boolean(pendingEdits.snapshot()),applyNavigation)}}/></DeferredView><DeferredView key={`targets-${planRevision}`} name="Target finder"><TargetFinder browsing={brightTargetBrowsing} date={when} place={place} selected={selectedTarget} onSelect={setSelectedTarget}/></DeferredView><div className="sky-layout"><section id="sky-chart" tabIndex={-1} className="panel full-atlas"><div className="section-label"><span>ALL-SKY VIEW</span><span>{timeLabel(when,tz)} {place.timezone?'AT SITE':'UTC'}</span></div><SkyLayerControls showLines={showStarPatterns} showLabels={showSkyLabels} showMilkyWay={showMilkyWay} onLinesChange={setShowStarPatterns} onLabelsChange={setShowSkyLabels} onCoreChange={setShowMilkyWay}/>{layerStorageError&&<p className="muted" role="status">Your display settings apply for this visit, but could not be saved for next time.</p>}<SkyAtlasViewer showImaging={showImagingGrid} onShowImagingChange={setShowImagingGrid} imagingDraft={imagingState.draft} imagingDraftStatus={imagingState.status} onEditImaging={()=>setTab('tools')} cameraDeepTarget={cameraDeepTarget||undefined} cameraOpen={cameraOpen} onCameraOpenChange={setCameraOpen} cameraReturnFocus={cameraReturnFocus} onCameraLauncherChange={launcher=>{cameraReturnFocus.current=launcher;if(launcher)setCameraDeepTarget('')}} onCameraPlan={(date,place,id)=>{choose(place,{date,section:'sky',deepTarget:id})}} view={atlasView} onViewChange={chooseAtlasView} viewStorageError={viewStorageError} place={place} date={when} selected={selectedTarget} showLines={showStarPatterns} showLabels={showSkyLabels} showMilkyWay={showMilkyWay} onSelect={setSelectedTarget} onLinesChange={setShowStarPatterns} onLabelsChange={setShowSkyLabels} onCoreChange={setShowMilkyWay}/><div className="chart-actions"><span className="muted">{selectedTarget?`Selected: ${selectedTarget}`:'Select a target to highlight it'}</span>{selectedTarget&&<a className="text-button" href="#target-details">View {selectedTarget} details ↑</a>}<a className="text-button" href="#target-finder">Find another target ↑</a></div><p className="footnote">Bright-star atlas · tap or keyboard-select a visible object to inspect it. Use the photo & details button to open its reference image and notes. Toggle guide lines for selected star patterns, including the Summer Triangle, and object labels above the chart. Labels adapt to avoid crowding. In 3D, centre the selected object if it is outside your view. Star positions are approximate; planet positions are calculated for your time. The core-direction marker is a sightline, not a visible object.</p></section><section className="panel"><div className="section-label"><span>VISIBLE SOLAR SYSTEM</span></div>{skyObjects.map(o=><div className="object-row" key={o.body}><Star size={18}/><span><strong>{o.body}</strong><small>Altitude {o.altitude.toFixed(1)}°<br/>Azimuth {o.azimuth.toFixed(1)}°</small></span></div>)}{!skyObjects.length&&<p className="muted">No listed planets or Moon above the horizon.</p>}<h3 className="spaced">Reading the sky</h3><p className="muted">Altitude is the angle above the horizon: 0° is level with it and 90° is directly overhead. Azimuth is the compass direction: 0° north, 90° east, 180° south and 270° west. Change the observing time to see objects move across the sky.</p><p className="muted">The horizon is idealised. Nearby trees, buildings and terrain are not included.</p></section></div><DeferredView name="Sky planning tools"><MilkyWayPlanner date={when} place={place} onDate={setDate}/><PlanetVisibility browsing={brightTargetBrowsing.visibility} date={when} place={place} selected={selectedTarget} onPlan={(id,next)=>chooseTargetTime({catalogue:'bright',id},next)}/></DeferredView></TabsContent>
 <TabsContent value="places"><div className="places-layout"><section className="panel"><div className="section-label"><span>CHOOSE AN OBSERVING SITE</span><MapPin size={18}/></div><form className="search-form" onSubmit={search}><label className="sr-only" htmlFor="location-search">Town or city</label><input id="location-search" type="search" autoComplete="off" placeholder="Search a town or city…" value={query} onChange={e=>changeSearchQuery(e.target.value)} maxLength={100} aria-describedby={searchError?'location-search-feedback':undefined}/><button className="button primary" disabled={searching}><Search size={17}/>{searching?'Searching…':'Search'}</button></form>{searching&&<button className="text-button" onClick={cancelSearch}>Cancel location search</button>}{query&&!searching&&<button type="button" className="text-button location-search-clear" onClick={()=>{changeSearchQuery('');document.getElementById('location-search')?.focus()}}>Clear location search</button>}<button className="text-button" onClick={locate} disabled={locating}><LocateFixed size={16}/>{locating?'Finding your location…':'Use my current location'}</button>{locating&&<button className="text-button" onClick={cancelLocation}>Keep selected site</button>}{searchError&&<p id="location-search-feedback" className="error" role="alert">{searchError}</p>}<div className="search-results">{results.map(r=><button key={r.id} onClick={()=>planAtSite({name:r.name,latitude:r.latitude,longitude:r.longitude,country:r.country,timezone:r.timezone})}><MapPin size={16}/><span>{r.name}<small>{[r.admin1,r.country].filter(Boolean).join(', ')}</small></span><ChevronRight size={16}/></button>)}</div><details><summary>Or enter precise coordinates</summary><CoordinateEntry latitude={lat} longitude={lon} onLatitude={value=>changeCoordinate('lat',value)} onLongitude={value=>changeCoordinate('lon',value)} onChoose={planAtSite} onClear={clearManualCoordinates}/></details><div className="saved-heading"><h3 ref={savedHeadingRef} tabIndex={-1}>Saved places</h3><span className="muted">On this device</span></div>{saved.length>savedPlacesLimit&&<p className="footnote">This legacy list has {saved.length} places. Existing records are kept; remove extras before adding places within the {savedPlacesLimit}-place limit.</p>}{savedReadError&&<div className="saved-places-read-error"><p className="error" role="alert">Saved places could not be read. The stored data is unchanged.{saved.length>0?' Displayed sites are from the last successful read.':''} Save, remove, rename and sky-rating changes are paused until a successful read. Retry, or download a raw recovery copy below before repairing the data.</p><button type="button" className="button" onClick={retrySavedPlaces}>Retry reading saved places</button></div>}{removedPlace&&<p className="place-removal-undo"><button ref={placeUndoRef} className="button" onClick={undoPlaceRemoval} disabled={savedReadError}>Undo removal of {removedPlace.place.name}</button>{placeUndoStatus&&<span className="error" role="status">{placeUndoStatus}</span>}<span className="footnote">Available until the next removal or reload. If a place is already saved at these coordinates, Undo keeps its current settings. Your selected observing site stays available.</span></p>}<div id="saved-place-list">{saved.length?saved.slice(0,savedShown).map((p,i)=><div className="saved-row" key={savedRowKeys[i]}><button onClick={()=>planAtSite(p)}><MapPin size={17}/><span>{p.name}<small>{p.latitude.toFixed(3)}°, {p.longitude.toFixed(3)}°{p.bortle?` · Bortle ${p.bortle}`:``}</small></span></button><button aria-label={`Remove ${p.name}`} onClick={()=>removePlace(p,i)} disabled={savedReadError}><Trash2 size={16}/></button></div>):!savedReadError&&<p className="muted">Save your favourite observing spots to return to them quickly.</p>}</div><SavedListControls count={saved.length} shown={savedShown} onChange={setSavedShown} label="saved places" listId="saved-place-list"/></section><section className="panel"><div className="section-label"><span>CURRENT LOCATION</span><MapPin size={18}/></div><h2>{place.name}</h2><SiteNameEditor key={`${place.latitude},${place.longitude}:${siteEditRevision}`} name={place.name} onSave={renameSite} disabled={savedReadError}/><p className="muted">{place.country} · {place.latitude.toFixed(3)}°, {place.longitude.toFixed(3)}°</p>{mapSource?<iframe title={`Map of ${place.name}`} className="place-map" src={mapSource} loading="lazy"/>:<p className="muted place-map-unavailable">The street map cannot reliably show this polar latitude. Your exact coordinates still apply to sky calculations.</p>}<SiteDarkness key={`${place.latitude},${place.longitude}:${place.name}:${siteEditRevision}`} place={place} onChange={setSiteDarkness} disabled={savedReadError||placeReadError}/><div className="place-actions"><button className="button primary" onClick={savePlace} disabled={savedReadError}><Bookmark size={16}/>{saved.some(p=>same(p,place))?'Saved on this device':'Save this place'}</button><button className="text-button" onClick={openConditions}>View conditions <ArrowUpRight size={16}/></button></div><p className="footnote">Base map © OpenStreetMap contributors. Your Bortle rating is personal and is not a measured light-pollution map.</p><LightPollutionReference key={`${place.latitude},${place.longitude}`} latitude={place.latitude} longitude={place.longitude} name={place.name} onChoose={point=>{const owner=document.activeElement;if(choose(point,{section:'places'}))deferFocusAndScroll(()=>document.getElementById('planner-heading'),{owner})}}/></section></div><DeferredView name="Site comparison"><PlaceComparison selection={comparisonSelection} onSelectionChange={setComparisonSelection} places={saved} current={place} date={when} onChoose={planAtSite} onPlan={planAtSite}/></DeferredView><DeferredView name="Plan backup"><PlannerBackupPanel onRestore={data=>{savedRef.current=data.places;setSaved(data.places);setSavedReadError(false);setPlanRevision(value=>value+1)}}/></DeferredView></TabsContent>
 <TabsContent value="events"><section className="panel calendar-forecast" aria-label="Meteor cloud forecast status"><div className="section-label"><span>CLOUD FORECAST FOR {place.name.toUpperCase()}</span></div><WeatherFreshness hasForecast={Boolean(forecast)} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} timezone={tz} loading={loading} error={error} stale={stale} clockChanged={clockChanged} onRefresh={refresh}/></section><DeferredView name="Sky calendar"><MeteorPlanner date={when} place={place} hourly={forecast?.hourly} onExplore={value=>setDate(value,'sky')} onNotice={setNotice}/></DeferredView></TabsContent>
 <TabsContent value="moon"><DeferredView name="Moon explorer"><MoonExplorer date={when} place={place} onDate={setDate}/></DeferredView></TabsContent>
 <TabsContent value="tools"><DeferredView key={`tools-${planRevision}`} name="Photo tools"><PhotographyLight date={when} place={place} onDate={setDate}/><PhotoPlanner draft={imagingState.draft} draftStatus={imagingState.status} onChange={changeImagingDraft} onRetryDraft={()=>changeImagingDraft({})} onRetryDraftRead={retryImagingDraftRead} focusMosaic={focusImaging} onFocusDone={()=>setFocusImaging(false)}/></DeferredView></TabsContent>
 </main></Tabs><footer><span>nightjar. <span className="muted">Made for the hours after dark.</span></span><span className="muted"><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather: Open-Meteo</a> · <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noreferrer">Astronomy Engine</a></span></footer></div>
}
