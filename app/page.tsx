"use client";
import { lazy, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {pendingEdits,usePendingEdits,usePendingEditReporter} from '@/hooks/use-pending-edits';
import {watchPendingEditUnload} from '@/lib/pending-edits';
import Link from 'next/link';
import { flushSync } from 'react-dom';
import { Moon, Compass, MapPin, Telescope, ArrowUpRight, Star, Search, LocateFixed, Bookmark, Cloud, Wind, Droplets, ChevronRight, Aperture, X, Trash2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { A, Place, skyBodies, bodyPosition, moonInfo, timeLabel, observingMilestones } from '@/lib/sky';
import ViewingMode from '@/components/viewing-mode';
import SkyChart from '@/components/sky-chart';
import SiteNameEditor from '@/components/site-name-editor';
import SavedListControls,{savedListPageSize} from '@/components/saved-list-controls';
import {renameObservingSite} from '@/lib/site-name';
import SkyAtlasViewer from '@/components/sky-atlas-viewer';
import SkyShortcuts from '@/components/sky-shortcuts';
import SkyLayerControls from '@/components/sky-layer-controls';
import {createCameraLocation} from '@/lib/camera-location';
import {savePlannerTime} from '@/lib/reload-planner';
import {saveForecastTimezone} from '@/lib/place-timezone';
import {readAtlasView,saveAtlasView,readAtlasLayers,saveAtlasLayers,type AtlasView,type AtlasLayers} from '@/lib/atlas-view';
import MobileNavigation,{plannerSections} from '@/components/planner-navigation';
import {createPlannerNavigation,type PlannerNavigationIntent} from '@/lib/planner-navigation';
import ObservingTimeControl from '@/components/observing-time-control';
import AtmosphereDetails from '@/components/atmosphere-details';
import SevenNightOutlook from '@/components/seven-night-outlook';
import WeatherFreshness from '@/components/weather-freshness';
import SiteDarkness from '@/components/site-darkness';
import {weatherHours,parseWeatherForecast,type WeatherForecast} from '@/lib/weather-hours';
import {forecastPlanning,forecastHourLabel} from '@/lib/weather-planning';
import {validPlace,readPlannerSetup,readObservingSite,resolveObservingPlace,samePlaceCoordinates as same} from '@/lib/planner-state';
import {upsertSavedPlace,readSavedPlaces,removeSavedPlace,restoreSavedPlace} from '@/lib/saved-collections';
import {useClientReady} from '@/hooks/use-client-ready';
import {useForecastRefresh} from '@/hooks/use-forecast-refresh';
import {usePlanningClock} from '@/hooks/use-planning-clock';
import DeferredView from '@/components/deferred-view';
import {readPhotographyDraft,savePhotographyDraft,type PhotographyDraft} from '@/lib/photography-draft';
const AuroraPanel=lazy(()=>import('@/components/aurora-panel'));
const MeteorPlanner=lazy(()=>import('@/components/meteor-planner'));
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
export default function Home(){
 const ready=useClientReady();
 return ready?<Planner/>:<div className="app"><header id="page-top" className="top"><span className="brand"><Aperture size={30}/><span>nightjar.</span></span></header><main id="main-content" tabIndex={-1} className="startup-loading" aria-busy="true"><section className="panel" role="status"><h1>Getting your sky ready…</h1><p className="muted">Restoring your observing site and time.</p></section></main></div>;
}
function Planner(){
 const [setup]=useState(readPlannerSetup);
 const [placeReadError,setPlaceReadError]=useState(setup.placeReadError),[savedReadError,setSavedReadError]=useState(setup.savedReadError);
 const [selectedTarget,setSelectedTarget]=useState('');
 const [deepSkyRequest,setDeepSkyRequest]=useState<{id:string;revision:number}|null>(null);
 const clearDeepSkyRequest=useCallback(()=>setDeepSkyRequest(null),[]);
 const [atlasView,setAtlasView]=useState<AtlasView>(readAtlasView),[viewStorageError,setViewStorageError]=useState(false);
 function chooseAtlasView(view:AtlasView){setAtlasView(view);setViewStorageError(!saveAtlasView(view))}
 const [planRevision,setPlanRevision]=useState(0);
 const [imagingState,setImagingState]=useState(readPhotographyDraft);
 const reportImagingPending=usePendingEditReporter('tools','imaging draft fields',true);
 const imagingDraft=useRef(imagingState.draft);
 const [focusImaging,setFocusImaging]=useState(false);
 const changeImagingDraft=useCallback((patch:Partial<PhotographyDraft>)=>{
  const next={...imagingDraft.current,...patch};imagingDraft.current=next;
  const saved=savePhotographyDraft(next);reportImagingPending(!saved);
  setImagingState({draft:next,status:saved?'restored':'visit'});
 },[reportImagingPending]);
 const [atlasLayers,setAtlasLayers]=useState(readAtlasLayers),[layerStorageError,setLayerStorageError]=useState(false);
 const {showLines:showStarPatterns,showLabels:showSkyLabels,showMilkyWay}=atlasLayers;
 function chooseAtlasLayer(key:keyof AtlasLayers,shown:boolean){const next={...atlasLayers,[key]:shown};setAtlasLayers(next);setLayerStorageError(!saveAtlasLayers(next))}
 const setShowStarPatterns=(shown:boolean)=>chooseAtlasLayer('showLines',shown),setShowSkyLabels=(shown:boolean)=>chooseAtlasLayer('showLabels',shown),setShowMilkyWay=(shown:boolean)=>chooseAtlasLayer('showMilkyWay',shown);
 const [cameraOpen,updateCameraOpen]=useState(false),[cameraDeepTarget,setCameraDeepTarget]=useState('');
 const setCameraOpen=useCallback((open:boolean)=>{updateCameraOpen(open);if(!open)setCameraDeepTarget('')},[]);
 const cameraReturnFocus=useRef<HTMLButtonElement|null>(null);
 const [tab,updateTab]=useState('tonight'),[place,setPlace]=useState<Place>(setup.place),[saved,setSaved]=useState<Place[]>(setup.saved),[date,setDate]=useState<Date>(setup.date),[query,setQuery]=useState(''),[results,setResults]=useState<LocationResult[]>([]),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState(''),[notice,setNotice]=useState(''),[lat,setLat]=useState(''),[lon,setLon]=useState('');
 const [siteEditRevision,setSiteEditRevision]=useState(0);
 const [savedShown,setSavedShown]=useState(savedListPageSize);
 const [removedPlace,setRemovedPlace]=useState<{place:Place;index:number}|null>(null),[placeUndoStatus,setPlaceUndoStatus]=useState('');
 const placeUndoRef=useRef<HTMLButtonElement>(null),savedHeadingRef=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(removedPlace)placeUndoRef.current?.focus()},[removedPlace]);
 const [locating,setLocating]=useState(false);
 const locationSession=useRef<ReturnType<typeof createCameraLocation>|null>(null);
 const savedRef=useRef(saved),placeRef=useRef(place);
 const searchController=useRef<AbortController|null>(null);
 const applyNavigation=useCallback((intent:PlannerNavigationIntent)=>{
  if(intent.kind==='context'){
   locationSession.current?.cancel();searchController.current?.abort();setSearching(false);placeRef.current=intent.place;setPlace(intent.place);setResults([]);setQuery('');setSearchError('');setSiteEditRevision(value=>value+1);
   if(intent.date)setDate(intent.date);
   if(intent.deepTarget)setDeepSkyRequest({id:intent.deepTarget,revision:Date.now()});
   setCameraOpen(false);
   if(intent.persist===false)setPlaceReadError(false);else try{localStorage.setItem('nightjar-place',JSON.stringify(intent.place));setPlaceReadError(false)}catch{setNotice('This browser could not save your location.')}
  }else if(intent.kind==='imaging'){
   changeImagingDraft({catalogueId:intent.target.id,ra:String(intent.target.ra),dec:String(intent.target.dec)});setFocusImaging(true);setCameraOpen(false);
  }else if(intent.section!=='sky')setCameraOpen(false);
  updateTab(intent.section);
 },[setCameraOpen,changeImagingDraft]);
 const [pendingIntent,setPendingIntent]=useState<PlannerNavigationIntent|null>(null);
 const pendingDestination=pendingIntent?.section||'';
 const [navigation]=useState(()=>createPlannerNavigation({onPending:setPendingIntent}));
 const sectionPendingText=usePendingEdits(tab),allPendingText=usePendingEdits(),pendingText=pendingIntent?.kind==='imaging'?allPendingText:sectionPendingText,pendingHeading=useRef<HTMLHeadingElement>(null);
 const setTab=useCallback((next:string)=>{
  if(next!=='sky')setCameraOpen(false);
  navigation.request({kind:'section',section:next},next!==tab&&Boolean(pendingEdits.snapshot(tab)),applyNavigation);
 },[applyNavigation,navigation,setCameraOpen,tab]);
 useEffect(()=>{if(pendingIntent){pendingHeading.current?.focus({preventScroll:true});pendingHeading.current?.scrollIntoView({block:'center',behavior:'instant'})}},[pendingIntent]);
 useEffect(()=>watchPendingEditUnload(window,pendingEdits),[]);
 function keepEditing(){navigation.cancel();document.getElementById('planner-heading')?.focus()}
 function leaveView(){const imaging=pendingIntent?.kind==='imaging';navigation.continue(applyNavigation);if(imaging)return;requestAnimationFrame(()=>{const heading=document.getElementById('planner-heading');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start',behavior:'instant'})})}

 const {revision,refresh}=useForecastRefresh();
 const now=usePlanningClock();
 const siteKey=`${place.latitude},${place.longitude}`;
 const forecastKey=`${siteKey}:${revision}`;
 const [weather,setWeather]=useState<{key:string;siteKey:string;fetchedAt?:number;data?:WeatherForecast;error?:string}|null>(null);
 const forecast=weather?.siteKey===siteKey?weather.data:null,loading=weather?.key!==forecastKey,error=weather?.key===forecastKey?weather.error||'':'';
 const stale=Boolean(forecast&&weather?.fetchedAt&&now-weather.fetchedAt>=30*60*1000);
 useEffect(()=>{savedRef.current=saved},[saved]);
 useEffect(()=>{
  const update=(event:StorageEvent)=>{
   if(event.storageArea!==localStorage||event.key!==null&&event.key!=='nightjar-places')return;
   try{const latest=readSavedPlaces(localStorage);savedRef.current=latest;setSaved(latest);setSavedReadError(false)}catch{setSavedReadError(true)}
  };
  window.addEventListener('storage',update);return()=>window.removeEventListener('storage',update);
 },[]);
 useEffect(()=>{placeRef.current=place},[place]);
 const choose=useCallback((p:Place,options:{date?:Date;section?:string;deepTarget?:string}={})=>{
  const next=resolveObservingPlace(p,savedRef.current,placeRef.current);
  if(options.date&&!Number.isFinite(+options.date))throw Error('Choose a valid observing time.');
  locationSession.current?.cancel();searchController.current?.abort();setSearching(false);
  const blocked=Boolean(pendingEdits.snapshot(tab));if(blocked)setCameraOpen(false);
  return navigation.request({kind:'context',section:options.section||'tonight',place:next,date:options.date,deepTarget:options.deepTarget},blocked,applyNavigation);
 },[applyNavigation,navigation,setCameraOpen,tab]);
 useEffect(()=>{
  const session=createCameraLocation({onPending:setLocating,onSite:site=>choose({...site,name:'My location'}),onError:()=>setSearchError('Location could not be accessed. Search for a town or enter coordinates.')});
  locationSession.current=session;
  return()=>{session.cancel();locationSession.current=null};
 },[choose]);
 useEffect(()=>{try{sessionStorage.removeItem('nightjar-recovery-time-v1')}catch{};return()=>searchController.current?.abort()},[]);
 useEffect(()=>{savePlannerTime(date)},[date]);
 useEffect(()=>{
  let stopped=false;const controller=new AbortController(),requestedPlace=placeRef.current;
  const timeout=setTimeout(()=>controller.abort(),20000);
  fetch(`/api/weather?lat=${place.latitude}&lon=${place.longitude}`,{signal:controller.signal,cache:'no-cache'}).then(async response=>{
   const raw:unknown=await response.json();if(!response.ok)throw Error('Forecast unavailable. Please try again.');
   const data=parseWeatherForecast(raw);
   if(!stopped){setWeather({key:forecastKey,siteKey,data,fetchedAt:Date.now()});if(data.timezone){setPlace(p=>p.latitude===place.latitude&&p.longitude===place.longitude&&p.timezone!==data.timezone?{...p,timezone:data.timezone}:p);try{saveForecastTimezone(localStorage,requestedPlace,data.timezone)}catch{}}}
  }).catch(error=>{if(!stopped)setWeather(old=>({key:forecastKey,siteKey,data:old?.siteKey===siteKey?old.data:undefined,fetchedAt:old?.siteKey===siteKey?old.fetchedAt:undefined,error:error.name==='AbortError'?'Weather request timed out. Please retry.':error instanceof Error?error.message:'Forecast unavailable'}))});
  return()=>{stopped=true;clearTimeout(timeout);controller.abort()};
 },[place.latitude,place.longitude,forecastKey,siteKey]);

 function retryObservingSite(){
  const restored=readObservingSite();
  if(restored.error){setNotice('The stored observing site is still unavailable. Your current view and stored data were kept.');return}
  locationSession.current?.cancel();searchController.current?.abort();setSearching(false);const blocked=Boolean(pendingEdits.snapshot(tab));if(blocked)setCameraOpen(false);if(navigation.request({kind:'context',section:tab,place:restored.place,persist:false},blocked,applyNavigation))setNotice('Observing site loaded. Your observing time is unchanged.');
 }
 function retrySavedPlaces(){try{const latest=readSavedPlaces(localStorage);savedRef.current=latest;setSaved(latest);setSavedReadError(false);setNotice('Saved places loaded. Your selected site and observing time are unchanged.')}catch{setSavedReadError(true);setNotice('Saved places are still unavailable. Your displayed list and stored data were kept.')}}
 function readLatestSavedPlaces(){try{return readSavedPlaces(localStorage)}catch{setSavedReadError(true);throw Error('Saved places could not be read. Retry reading them before changing site settings.')}}
 function persistSavedPlaces(next:Place[],message:string){
  try{localStorage.setItem('nightjar-places',JSON.stringify(next));savedRef.current=next;setSaved(next);setSavedReadError(false);setNotice(message);return true}catch{setNotice('This browser could not save your places. The saved list stays unchanged.');return false}
 }
 function renameSite(name:string){readLatestSavedPlaces();const next=renameObservingSite(localStorage,place,name);savedRef.current=next.places;placeRef.current=next.place;setSaved(next.places);setSavedReadError(false);setPlace(next.place);setPlaceReadError(false);setNotice(`${next.place.name} saved as the site name.`)}
 function savePlace(){try{const next=upsertSavedPlace(readLatestSavedPlaces(),place);if(persistSavedPlaces(next,'Place saved on this device.'))setSavedShown(Math.max(savedListPageSize,next.length))}catch(error){setNotice(error instanceof Error&&error.name!=='QuotaExceededError'?error.message:'This place could not be saved.')}}
 function removePlace(index:number){
  const item=savedRef.current[index];if(!item)return;
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
  const next={...place,bortle};let applied=false;
  try{const latest=readLatestSavedPlaces(),nextSaved=latest.map(item=>same(item,place)?{...item,bortle}:item);setPlace(next);applied=true;localStorage.setItem('nightjar-place',JSON.stringify(next));setPlaceReadError(false);if(persistSavedPlaces(nextSaved,bortle?`Bortle class ${bortle} saved for ${place.name} on this device.`:`Sky darkness rating cleared for ${place.name}.`))return;setNotice('The rating applies to your selected site, but the saved place list could not be updated.')}
  catch{setNotice(applied?'This rating applies to the selected site for this visit. The saved place list could not be updated.':'Saved places could not be read. Your sky rating was kept; retry reading saved places before changing it.')}
 }
 async function search(e:React.FormEvent){
  e.preventDefault();if(query.trim().length<2){setSearchError('Enter at least two letters.');return}
  searchController.current?.abort();const controller=new AbortController();searchController.current=controller;
  setSearching(true);setSearchError('');setResults([]);
  try{
   const next=await searchLocations(query,{signal:controller.signal});
   if(!controller.signal.aborted){setResults(next);if(!next.length)setSearchError('No places found. Try a nearby town.')}
  }catch(error){if(!controller.signal.aborted)setSearchError(error instanceof Error?error.message:'Search unavailable.')}
  finally{if(!controller.signal.aborted)setSearching(false)}
 }
 function cancelSearch(){searchController.current?.abort();searchController.current=null;setSearching(false);setSearchError('Search cancelled. Enter another town or use coordinates.')}
 function locate(){setSearchError('');if(!navigator.geolocation){setSearchError('Device location is unavailable. Search for a town instead.');return}locationSession.current?.start((success,failure)=>navigator.geolocation.getCurrentPosition(success,failure,{timeout:10000}))}
 function cancelLocation(){locationSession.current?.cancel();setSearchError('Location request cancelled. Your selected observing site is unchanged.')}
 const when=date,moon=moonInfo(when,place),tz=place.timezone||'UTC';
 const hours=useMemo(()=>weatherHours(forecast?.hourly,date,place),[forecast,date,place]);
 const current=hours[0],planning=forecastPlanning(hours,date,place),best=planning.best;const dark=bodyPosition(A.Body.Sun,when,place).altitude<-18;const score=planning.score;const skyObjects=skyBodies.map(body=>({body,...bodyPosition(body,when,place)})).filter(p=>p.altitude>0).sort((a,b)=>b.altitude-a.altitude);

 const milestones=useMemo(()=>observingMilestones(when,place),[when,place]);
 const title={tonight:'A night worth looking up.',sky:'Get to know your sky.',moon:'A world within reach.',places:'Find your place in the dark.',events:'Make a date with the cosmos.',tools:'Frame something extraordinary.',aurora:place.latitude<0?'Follow the southern lights.':'Follow the northern lights.'}[tab];
 useEffect(()=>{const context=(document as Document & {modelContext?:ModelContext}).modelContext;if(!context?.registerTool)return;const controller=new AbortController();Promise.resolve(context.registerTool({name:'set_observing_location',description:'Set the observing coordinates and show the Tonight dashboard.',inputSchema:{type:'object',properties:{name:{type:'string'},latitude:{type:'number',minimum:-90,maximum:90},longitude:{type:'number',minimum:-180,maximum:180}},required:['name','latitude','longitude'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input:unknown)=>{if(!validPlace(input))throw Error('Invalid observing location');const location=resolveObservingPlace(input,savedRef.current,placeRef.current);let applied=false;flushSync(()=>{applied=choose(location)});if(!applied)throw Error('Save or discard unfinished edits before applying the requested observing site.');return{location,view:'tonight'}}},{signal:controller.signal})).catch(()=>{});return()=>controller.abort()},[choose]);
 return <div className="app"><Tabs value={tab} onValueChange={setTab}><header id="page-top" tabIndex={-1} className="top"><Link className="brand" href="/"><Aperture size={30}/><span>nightjar<span className="brand-dot">.</span></span></Link><div className="nav-wrap"><TabsList className="navigation" variant="line">{plannerSections.map(([key,label,Icon])=><TabsTrigger key={key} value={key} onClick={()=>setTab(key)}><Icon size={17}/>{label}</TabsTrigger>)}</TabsList></div><a className="install-shortcut" href="#install-app">Install app <ArrowUpRight size={15}/></a></header><MobileNavigation section={tab} onSelect={setTab}/><main id="main-content" tabIndex={-1}><div className="page-heading"><div><h1 id="planner-heading" tabIndex={-1}>{title}</h1><p className="muted">{tab==='tonight'?'Find your window. Choose your place. Meet the night sky.':`${place.name} · ${place.latitude.toFixed(2)}°, ${place.longitude.toFixed(2)}°`}</p></div><div className="heading-utilities"><button className="location-button" onClick={()=>setTab('places')}><MapPin size={18}/>{place.name}<ChevronRight size={17}/></button><ViewingMode/></div></div>{placeReadError&&<section className="panel startup-site-warning"><h2>Stored observing site unavailable</h2><p role="alert">Your stored observing site could not be read. {place.name} is shown for this visit; the stored value is unchanged. Choose a site in My places to replace it, or download a raw recovery copy before repairing it.</p><div className="button-row"><button type="button" className="button" onClick={retryObservingSite}>Retry reading observing site</button><button type="button" className="button" onClick={()=>setTab('places')}>Open My places</button></div></section>}{tab!=='aurora'&&<ObservingTimeControl date={date} timezone={tz} onDate={setDate}/>}{pendingDestination&&<section className="panel unsaved-view-warning" aria-labelledby="unsaved-view-heading"><h2 id="unsaved-view-heading" ref={pendingHeading} tabIndex={-1}>{pendingText?'Your edits have not been saved':'Ready to continue'}</h2><p>{pendingIntent?.kind==='imaging'&&pendingText?`Your ${pendingText} have not been saved. Using this target replaces the mosaic centre and opens Photo tools. Keep editing to save or copy your changes before continuing. Unsaved imaging fields are available in Photo tools.`:pendingText?`Your ${pendingText} have not been saved. Keep this view open to save or copy your text before leaving. Leaving can discard changes held only in this view.`:'You can continue to the section you selected.'}</p>{pendingIntent?.kind==='context'&&<p className="pending-context-summary">Next: {pendingIntent.place.name} · {pendingIntent.place.latitude.toFixed(3)}°, {pendingIntent.place.longitude.toFixed(3)}° · {plannerSections.find(([key])=>key===pendingIntent.section)?.[1]||'selected section'}{pendingIntent.date?` · ${pendingIntent.date.toISOString().replace('T',' ').replace('.000Z','Z').replace(/Z$/,' UTC')}`:' · observing time kept'}{pendingIntent.deepTarget?` · ${pendingIntent.deepTarget}`:''}</p>}{pendingIntent?.kind==='imaging'&&<p className="pending-context-summary">Next: Photo tools · {pendingIntent.target.id} · J2000 RA {pendingIntent.target.ra.toFixed(5)} h · Dec {pendingIntent.target.dec.toFixed(5)}°. Equipment and grid settings are kept.</p>}<div className="button-row"><button className="button" onClick={keepEditing}>Keep editing</button><button className="button" onClick={leaveView}>{pendingIntent?.kind==='imaging'?'Use this imaging target':pendingText?'Leave without saving':`Continue to ${plannerSections.find(([key])=>key===pendingDestination)?.[1]||'selected section'}`}</button></div></section>}{notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss message"><X size={16}/></button></div>}
 <TabsContent value="tonight"><div className="dashboard"><section className="panel outlook"><div className="section-label"><span>OBSERVING OUTLOOK</span><Moon size={18}/></div><div className="score-row"><div className="outlook-summary"><h2>{loading?'Checking the skies…':score==null?'The sky has its own schedule.':score>=75?'The night is yours.':score>=45?'A little patience. A little wonder.':score===0&&!dark?'Wait for the darkness.':'Keep an eye on the clouds.'}</h2><p className="muted">{loading?'Looking up your local weather.':error?error:!current?'No forecast for this selected hour. Your sky atlas still works for this date.':!planning.scored?'Cloud estimates are missing for these hours. Your sky atlas still works.':best&&best.score!==null&&best.score>0?`Best of the next 12 hours: ${timeLabel(best.date,tz)} local · ${best.score}/100.`:'Conditions are limited in this window. Try another time.'}</p></div><div className="score-ring" style={{'--score':`${score??0}%`} as CSSProperties}><div><strong>{score??'—'}</strong><span>OUT OF 100</span></div></div><div className="best-window"><span>Best forecast time</span><strong>{best&&best.score!==null&&best.score>0?timeLabel(best.date,tz):'—'}</strong><small>{best&&best.score!==null&&best.score>0?`${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:tz}).format(best.date)} · ${best.score}/100 · ${tz}`:loading?'Checking forecast hours…':!forecast?'Forecast unavailable.':!current?'Selected hour has no forecast.':!planning.scored?'Planning scores unavailable.':planning.missing?`No favourable scored hour · ${planning.missing} unavailable.`:'No favourable hour in the next 12 hours'}</small><button className="text-button" onClick={()=>setTab('sky')}>Explore sky <ArrowUpRight size={16}/></button></div></div><div className="outlook-bottom"><span className="pill">{dark?'ASTRONOMICAL NIGHT':'TWILIGHT / DAYLIGHT'}</span></div>{!loading&&planning.missing>0&&<p className="footnote forecast-coverage" role="status">Scored {planning.scored} of {planning.total} available forecast hours. Missing cloud estimates are not treated as clear skies.</p>}<WeatherFreshness hasForecast={Boolean(forecast)} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} timezone={tz} loading={loading} error={error} stale={stale} onRefresh={refresh}/></section><section className="panel atlas-preview"><div className="section-label"><span>THE SKY ABOVE {place.name.toUpperCase()}</span><Compass size={18}/></div><SkyChart place={place} date={when}/><div className="atlas-footer"><span className="muted">North up · looking overhead</span><button className="text-button" onClick={()=>setTab('sky')}>Open sky atlas <ArrowUpRight size={16}/></button></div></section></div>
 <div className="metrics">{([[Cloud,'Cloud cover',current?.cloud!=null?`${current.cloud}%`:'—','Less cloud, more sky'],[Moon,'Moon illumination',`${Math.round(moon.illumination*100)}%`,moon.name],[Wind,'Wind speed',current?.wind!=null?`${current.wind} km/h`:'—','At 10 m above ground'],[Droplets,'Humidity',current?.humidity!=null?`${current.humidity}%`:'—','Watch for dew on optics']] as const).map(([Icon,label,value,sub])=><section className="metric" key={label}><div><Icon size={18}/><span>{label}</span></div><strong>{value}</strong><small>{sub}</small></section>)}</div>
 <SevenNightOutlook hourly={forecast?.hourly} place={place} loading={loading} selectedDate={date} onDate={setDate}/>
 <section className="panel next-panel"><div className="section-label"><span>YOUR NIGHT, HOUR BY HOUR</span><span className="muted">{tz} · Open-Meteo</span></div>{hours.length?<div className="hourly">{hours.map((h)=><button className={'hour '+(h.date.getTime()===current.date.getTime()?'selected':'')} key={h.date.toISOString()} onClick={()=>setDate(h.date)} aria-label={`Select ${forecastHourLabel(h.date,tz).full}, score ${h.score??'unavailable'}`}><span>{timeLabel(h.date,tz)}</span><small className="forecast-hour-stamp">{forecastHourLabel(h.date,tz).detail}</small>{h.cloud===null?<span aria-label="Cloud cover unavailable">?</span>:h.cloud>50?<Cloud size={20}/>:<Star size={20}/>}<strong>{h.score??'—'}<small>/100</small></strong><div className="bar"><i style={{height:`${h.score??0}%`}}/></div><small>{h.cloud??'—'}% cloud</small><span>{h.temp??'—'}°</span></button>)}</div>:<p className="empty-text">{loading?'Loading hourly conditions…':error||'No weather forecast for this date. Select a time within the next 7 days.'}</p>}<p className="footnote">Planning score: cloud cover (80%) + darkness (20%), with up to 20 points deducted for an illuminated Moon above the horizon. Daylight scores 0. The current score uses your exact observing time; hourly rows use forecast-hour starts. The next 12 hours can include partial first and last forecast hours. This is an estimate, not a seeing forecast.</p></section>
 <AtmosphereDetails hourly={forecast?.hourly} date={when} timezone={tz} loading={loading}/><section className="panel milestones"><div className="section-label"><span>THE RHYTHM OF THE NIGHT</span><span className="muted">Next events after your selected time</span></div><div className="milestone-grid">{milestones.map(m=><div key={m.label}><small>{m.label}</small><strong>{m.date?timeLabel(m.date,tz):"—"}</strong><span>{m.date?new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",timeZone:tz}).format(m.date):"No crossing in 48 hours"}</span></div>)}</div><p className="footnote">Times in {tz}. Full darkness means the Sun is 18° below the horizon. At high latitudes some events may not occur. Terrain is not included.</p></section><div className="bottom-grid"><section className="panel"><div className="section-label"><span>ABOVE THE HORIZON</span><Telescope size={18}/></div>{skyObjects.length?skyObjects.slice(0,3).map(o=><button className="object-row" key={o.body} onClick={()=>{setSelectedTarget(o.body);setTab('sky')}}><span className="object-icon">✦</span><span><strong>{o.body}</strong><small>{Math.round(o.altitude)}° altitude · {Math.round(o.azimuth)}° azimuth</small></span><ArrowUpRight size={17}/></button>):<p className="muted">The bright planets and Moon are below your horizon. Explore the stars in the atlas.</p>}</section><section className="panel moon-card"><div className="section-label"><span>TONIGHT’S MOON</span><Moon size={18}/></div><h2>{moon.name}</h2><p className="muted">{Math.round(moon.illumination*100)}% illuminated · {moon.altitude>0?`${Math.round(moon.altitude)}° above the horizon`:'Below the horizon'}</p><p className="muted">{moon.illumination>.7?'Bright moonlight can wash out faint galaxies and nebulae. Try lunar detail or bright planets.':'Look for faint targets while the Moon is below the horizon and the sky is fully dark.'}</p></section></div></TabsContent>
 <TabsContent value="aurora"><DeferredView name="Aurora"><AuroraPanel place={place} onLocation={()=>setTab("places")}/></DeferredView></TabsContent>
 <TabsContent value="sky"><SkyShortcuts onCamera={launcher=>{cameraReturnFocus.current=launcher;setCameraDeepTarget('');setCameraOpen(true)}}/><DeferredView key={`deep-sky-${planRevision}`} name="Deep-sky explorer"><DeepSkyFinder onCamera={(target,launcher)=>{cameraReturnFocus.current=launcher;setCameraDeepTarget(target.id);setCameraOpen(true)}} request={deepSkyRequest??undefined} onRequestHandled={clearDeepSkyRequest} date={when} place={place} onDate={setDate} onFrame={target=>{navigation.request({kind:'imaging',section:'tools',target:{id:target.id,ra:target.ra,dec:target.dec}},Boolean(pendingEdits.snapshot()),applyNavigation)}}/></DeferredView><DeferredView key={`targets-${planRevision}`} name="Target finder"><TargetFinder date={when} place={place} selected={selectedTarget} onSelect={setSelectedTarget}/></DeferredView><div className="sky-layout"><section id="sky-chart" tabIndex={-1} className="panel full-atlas"><div className="section-label"><span>ALL-SKY VIEW</span><span>{timeLabel(when,tz)} LOCAL</span></div><SkyLayerControls showLines={showStarPatterns} showLabels={showSkyLabels} showMilkyWay={showMilkyWay} onLinesChange={setShowStarPatterns} onLabelsChange={setShowSkyLabels} onCoreChange={setShowMilkyWay}/>{layerStorageError&&<p className="muted" role="status">Your display settings apply for this visit, but could not be saved for next time.</p>}<SkyAtlasViewer cameraDeepTarget={cameraDeepTarget||undefined} cameraOpen={cameraOpen} onCameraOpenChange={setCameraOpen} cameraReturnFocus={cameraReturnFocus} onCameraLauncherChange={launcher=>{cameraReturnFocus.current=launcher;if(launcher)setCameraDeepTarget('')}} onCameraPlan={(date,place,id)=>{choose(place,{date,section:'sky',deepTarget:id})}} view={atlasView} onViewChange={chooseAtlasView} viewStorageError={viewStorageError} place={place} date={when} selected={selectedTarget} showLines={showStarPatterns} showLabels={showSkyLabels} showMilkyWay={showMilkyWay} onSelect={setSelectedTarget} onLinesChange={setShowStarPatterns} onLabelsChange={setShowSkyLabels} onCoreChange={setShowMilkyWay}/><div className="chart-actions"><span className="muted">{selectedTarget?`Selected: ${selectedTarget}`:'Select a target to highlight it'}</span>{selectedTarget&&<a className="text-button" href="#target-details">View {selectedTarget} details ↑</a>}<a className="text-button" href="#target-finder">Find another target ↑</a></div><p className="footnote">Bright-star atlas · tap or keyboard-select a visible object to inspect it. Use the photo & details button to open its reference image and notes. Toggle guide lines for selected star patterns, including the Summer Triangle, and object labels above the chart. Labels adapt to avoid crowding. In 3D, centre the selected object if it is outside your view. Star positions are approximate; planet positions are calculated for your time. The core-direction marker is a sightline, not a visible object.</p></section><section className="panel"><div className="section-label"><span>VISIBLE SOLAR SYSTEM</span></div>{skyObjects.map(o=><div className="object-row" key={o.body}><Star size={18}/><span><strong>{o.body}</strong><small>Altitude {o.altitude.toFixed(1)}°<br/>Azimuth {o.azimuth.toFixed(1)}°</small></span></div>)}{!skyObjects.length&&<p className="muted">No listed planets or Moon above the horizon.</p>}<h3 className="spaced">Reading the sky</h3><p className="muted">Altitude is the angle above the horizon: 0° is level with it and 90° is directly overhead. Azimuth is the compass direction: 0° north, 90° east, 180° south and 270° west. Change the observing time to see objects move across the sky.</p><p className="muted">The horizon is idealised. Nearby trees, buildings and terrain are not included.</p></section></div><DeferredView name="Sky planning tools"><MilkyWayPlanner date={when} place={place} onDate={setDate}/><PlanetVisibility date={when} place={place} selected={selectedTarget} onSelect={setSelectedTarget} onDate={setDate}/></DeferredView></TabsContent>
 <TabsContent value="places"><div className="places-layout"><section className="panel"><div className="section-label"><span>CHOOSE AN OBSERVING SITE</span><MapPin size={18}/></div><form className="search-form" onSubmit={search}><label className="sr-only" htmlFor="location-search">Town or city</label><input id="location-search" placeholder="Search a town or city…" value={query} onChange={e=>setQuery(e.target.value)} maxLength={100}/><button className="button primary" disabled={searching}><Search size={17}/>{searching?'Searching…':'Search'}</button></form>{searching&&<button className="text-button" onClick={cancelSearch}>Cancel location search</button>}<button className="text-button" onClick={locate} disabled={locating}><LocateFixed size={16}/>{locating?'Finding your location…':'Use my current location'}</button>{locating&&<button className="text-button" onClick={cancelLocation}>Keep selected site</button>}{searchError&&<p className="error" role="alert">{searchError}</p>}<div className="search-results">{results.map(r=><button key={r.id} onClick={()=>choose({name:r.name,latitude:r.latitude,longitude:r.longitude,country:r.country,timezone:r.timezone})}><MapPin size={16}/><span>{r.name}<small>{[r.admin1,r.country].filter(Boolean).join(', ')}</small></span><ChevronRight size={16}/></button>)}</div><details><summary>Or enter precise coordinates</summary><form className="coordinate-form" onSubmit={e=>{e.preventDefault();const p={name:`${Number(lat).toFixed(3)}°, ${Number(lon).toFixed(3)}°`,latitude:Number(lat),longitude:Number(lon)};if(!lat||!lon||!validPlace(p)){setSearchError('Enter a latitude from −90 to 90 and longitude from −180 to 180.');return}choose(p)}}><label>Latitude<input type="number" min="-90" max="90" step="any" required value={lat} onChange={e=>setLat(e.target.value)}/></label><label>Longitude<input type="number" min="-180" max="180" step="any" required value={lon} onChange={e=>setLon(e.target.value)}/></label><button className="button">Use coordinates</button></form></details><div className="saved-heading"><h3 ref={savedHeadingRef} tabIndex={-1}>Saved places</h3><span className="muted">On this device</span></div>{savedReadError&&<div className="saved-places-read-error"><p className="error" role="alert">Saved places could not be read. The stored data is unchanged.{saved.length>0?' Displayed sites are from the last successful read.':''} Save, remove, rename and sky-rating changes are paused until a successful read. Retry, or download a raw recovery copy below before repairing the data.</p><button type="button" className="button" onClick={retrySavedPlaces}>Retry reading saved places</button></div>}{removedPlace&&<p className="place-removal-undo"><button ref={placeUndoRef} className="button" onClick={undoPlaceRemoval} disabled={savedReadError}>Undo removal of {removedPlace.place.name}</button>{placeUndoStatus&&<span className="error" role="status">{placeUndoStatus}</span>}<span className="footnote">Available until the next removal or reload. If a place is already saved at these coordinates, Undo keeps its current settings. Your selected observing site stays available.</span></p>}<div id="saved-place-list">{saved.length?saved.slice(0,savedShown).map((p,i)=><div className="saved-row" key={`${p.latitude}-${p.longitude}-${i}`}><button onClick={()=>choose(p)}><MapPin size={17}/><span>{p.name}<small>{p.latitude.toFixed(3)}°, {p.longitude.toFixed(3)}°{p.bortle?` · Bortle ${p.bortle}`:``}</small></span></button><button aria-label={`Remove ${p.name}`} onClick={()=>removePlace(i)} disabled={savedReadError}><Trash2 size={16}/></button></div>):!savedReadError&&<p className="muted">Save your favourite observing spots to return to them quickly.</p>}</div><SavedListControls count={saved.length} shown={savedShown} onChange={setSavedShown} label="saved places" listId="saved-place-list"/></section><section className="panel"><div className="section-label"><span>CURRENT LOCATION</span><MapPin size={18}/></div><h2>{place.name}</h2><SiteNameEditor key={`${place.latitude},${place.longitude}:${siteEditRevision}`} name={place.name} onSave={renameSite} disabled={savedReadError}/><p className="muted">{place.country} · {place.latitude.toFixed(3)}°, {place.longitude.toFixed(3)}°</p><iframe title={`Map of ${place.name}`} className="place-map" src={`https://www.openstreetmap.org/export/embed.html?bbox=${place.longitude-.12}%2C${place.latitude-.08}%2C${place.longitude+.12}%2C${place.latitude+.08}&layer=mapnik&marker=${place.latitude}%2C${place.longitude}`} loading="lazy"/><SiteDarkness place={place} onChange={setSiteDarkness} disabled={savedReadError}/><div className="place-actions"><button className="button primary" onClick={savePlace} disabled={savedReadError}><Bookmark size={16}/>{saved.some(p=>same(p,place))?'Saved on this device':'Save this place'}</button><button className="text-button" onClick={()=>setTab('tonight')}>View conditions <ArrowUpRight size={16}/></button></div><p className="footnote">Base map © OpenStreetMap contributors. Your Bortle rating is personal and is not a measured light-pollution map.</p></section></div><DeferredView name="Site comparison"><PlaceComparison places={saved} current={place} date={when} onChoose={choose} onPlan={(nextPlace,nextDate)=>{choose(nextPlace,{date:nextDate})}}/></DeferredView><DeferredView name="Plan backup"><PlannerBackupPanel onRestore={data=>{savedRef.current=data.places;setSaved(data.places);setSavedReadError(false);setPlanRevision(value=>value+1)}}/></DeferredView></TabsContent>
 <TabsContent value="events"><section className="panel calendar-forecast" aria-label="Meteor cloud forecast status"><div className="section-label"><span>CLOUD FORECAST FOR {place.name.toUpperCase()}</span></div><WeatherFreshness hasForecast={Boolean(forecast)} fetchedAt={weather?.siteKey===siteKey?weather.fetchedAt:undefined} timezone={tz} loading={loading} error={error} stale={stale} onRefresh={refresh}/></section><DeferredView name="Sky calendar"><MeteorPlanner date={when} place={place} hourly={forecast?.hourly} onExplore={value=>{setDate(value);setTab('sky')}} onNotice={setNotice}/></DeferredView></TabsContent>
 <TabsContent value="moon"><DeferredView name="Moon explorer"><MoonExplorer date={when} place={place} onDate={setDate}/></DeferredView></TabsContent>
 <TabsContent value="tools"><DeferredView key={`tools-${planRevision}`} name="Photo tools"><PhotographyLight date={when} place={place} onDate={setDate}/><PhotoPlanner draft={imagingState.draft} draftStatus={imagingState.status} onChange={changeImagingDraft} onRetryDraft={()=>changeImagingDraft({})} focusMosaic={focusImaging} onFocusDone={()=>setFocusImaging(false)}/></DeferredView></TabsContent>
 </main></Tabs><footer><span>nightjar. <span className="muted">Made for the hours after dark.</span></span><span className="muted"><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather: Open-Meteo</a> · <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noreferrer">Astronomy Engine</a></span></footer></div>
}
