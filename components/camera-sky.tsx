'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Image from 'next/image';
import {objectPhoto} from '@/lib/object-photos';
import {Camera,Compass,MapPin,Square,Star,Maximize2,Minimize2} from 'lucide-react';
import ViewingMode from '@/components/viewing-mode';
import {layoutCameraLabels,type CameraLabelObstacle} from '@/lib/camera-labels';
import {createCameraLocation} from '@/lib/camera-location';
import {cameraSkyContext} from '@/lib/camera-context';
import {watchCameraLifecycle} from '@/lib/camera-lifecycle';
import {watchCameraOrientation} from '@/lib/camera-orientation';
import {createCameraSession} from '@/lib/camera-session';
import {createCameraWakeLock} from '@/lib/camera-wake-lock';
import {skyTargets,type Place} from '@/lib/sky';
import {cameraImageFrame,canShowCameraLabels,cameraHeadingAlignment,cameraDirection,cameraErrorMessage,manualCameraBasis,projectSkyTarget,rotateCameraBearing,targetDirectionGuide,type CameraBasis} from '@/lib/camera-sky';

function CameraThumbnail({name}:{name:string}){
 const photo=objectPhoto(name),[failed,setFailed]=useState(false);
 return <span className="camera-sky-thumbnail" aria-hidden="true">{photo&&!failed?<Image unoptimized src={photo.src} alt="" width={36} height={36} referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<Star size={20}/>}</span>;
}

type Props={fullScreen:boolean;onFullScreenChange:(full:boolean)=>void;place:Place;selected:string;onSelect:(name:string)=>void;onDetails:(date:Date,place:Place)=>void};
export default function CameraSky(props:Props){
 const [place,setPlace]=useState(props.place),[now,setNow]=useState(()=>new Date());
 const [camera,setCamera]=useState<'off'|'starting'|'on'>('off'),[cameraError,setCameraError]=useState(''),[cameraPaused,setCameraPaused]=useState(false);
 const [tracking,setTracking]=useState(false),[sensor,setSensor]=useState<{basis:CameraBasis;absolute:boolean}|null>(null),[sensorError,setSensorError]=useState(''),[aligned,setAligned]=useState(false),[offset,setOffset]=useState(0);
 const [sensorQuiet,setSensorQuiet]=useState(false),[motionSession,setMotionSession]=useState(0);
 const [motionPending,setMotionPending]=useState(false),[alignmentError,setAlignmentError]=useState<{target:string;message:string}|null>(null);
 const [bearing,setBearing]=useState(0),[altitude,setAltitude]=useState(30),[fov,setFov]=useState(60),[ratio,setRatio]=useState(.75),[size,setSize]=useState({width:360,height:480});
 const [sessionNotice,setSessionNotice]=useState('');
 const [wake,setWake]=useState<'off'|'requesting'|'on'>('off'),[wakeNotice,setWakeNotice]=useState('');
 const wakeSessionRef=useRef<ReturnType<typeof createCameraWakeLock>|null>(null);
 const [showPhotos,setShowPhotos]=useState(true);
 const [previousLabels,setPreviousLabels]=useState<string[]>([]);
 const badgeRef=useRef<HTMLSpanElement>(null);
 const [badgeBounds,setBadgeBounds]=useState<CameraLabelObstacle|null>(null);
 const returnFocusRef=useRef<'stage'|'settings'|'alignment'|null>(null),wasFullScreenRef=useRef(false);
 const [labelMode,setLabelMode]=useState<'all'|'selected'|'hidden'>('all');
 const [locating,setLocating]=useState(false),[locationError,setLocationError]=useState('');
 const videoRef=useRef<HTMLVideoElement>(null),stageRef=useRef<HTMLDivElement>(null),motionRequest=useRef(0),settingsRef=useRef<HTMLDivElement>(null),siteRef=useRef<HTMLDivElement>(null),calibrationRef=useRef<HTMLDivElement>(null);
 const locationSessionRef=useRef<ReturnType<typeof createCameraLocation>|null>(null);
 const motionStopRef=useRef<(()=>void)|null>(null);
 const cameraSessionRef=useRef<ReturnType<typeof createCameraSession>|null>(null);
 function focusPanel(panel:HTMLDivElement|null){panel?.focus({preventScroll:true});panel?.scrollIntoView({block:'start'})}
 useEffect(()=>{
  if(props.fullScreen){wasFullScreenRef.current=true;focusPanel(stageRef.current);return}
  if(wasFullScreenRef.current){wasFullScreenRef.current=false;const target=returnFocusRef.current;returnFocusRef.current=null;focusPanel(target==='settings'?settingsRef.current:target==='alignment'?calibrationRef.current:stageRef.current)}
 },[props.fullScreen]);
 function leaveFullScreen(settings=false){returnFocusRef.current=settings?'settings':'stage';props.onFullScreenChange(false)}
 function checkAlignment(){if(props.fullScreen){returnFocusRef.current='alignment';props.onFullScreenChange(false)}else focusPanel(calibrationRef.current)}
 function previewSelected(){if(!selected||selected.altitude<=0)return;setBearing(Math.round(selected.azimuth)%360);setAltitude(Math.round(selected.altitude));focusPanel(stageRef.current)}
 function stopCamera(){cameraSessionRef.current?.stop()}
 function updateVideoRatio(){const video=videoRef.current;if(video?.videoWidth&&video.videoHeight)setRatio(video.videoWidth/video.videoHeight)}
 useEffect(()=>{
  const cameraSession=createCameraSession({
   attach:stream=>{if(videoRef.current)videoRef.current.srcObject=stream},onState:setCamera,onPaused:setCameraPaused,
   onError:error=>setCameraError(cameraErrorMessage(error)),onEnded:()=>setCameraError('Camera access ended. Start the camera again to resume.'),
  });
  cameraSessionRef.current=cameraSession;
  const wakeSession=createCameraWakeLock({onState:setWake,onError:()=>setWakeNotice('Could not keep the screen awake. Your browser or battery settings may prevent it; you can try again.'),onReleased:()=>setWakeNotice('Screen awake ended. Tap Keep screen awake to request it again.')});
  wakeSessionRef.current=wakeSession;
  const clock=setInterval(()=>{if(!document.hidden)setNow(new Date())},15000);
  const locationSession=createCameraLocation({onPending:setLocating,onSite:site=>{setPlace(site);setNow(new Date());setAligned(false);setAlignmentError(null);setOffset(0)},onError:()=>setLocationError('Could not get your location. Check the selected site or try again.')});
  locationSessionRef.current=locationSession;
  const invalidate=()=>{motionRequest.current++;locationSession.cancel(false)};
  const stopLifecycle=watchCameraLifecycle(window,document,{
   hidden:()=>document.hidden,
   onSuspend:()=>{invalidate();wakeSession.stop();setWakeNotice('');cameraSession.stop();motionStopRef.current?.();setTracking(false);setMotionPending(false);setSensor(null);setSensorQuiet(false);setSensorError('');setAligned(false);setAlignmentError(null);setOffset(0);setLocating(false);setSessionNotice('Camera, motion and screen awake are off after leaving this view. Restart them when ready.')},
   onResume:()=>setNow(new Date()),
  });
  return ()=>{clearInterval(clock);stopLifecycle();motionStopRef.current?.();invalidate();locationSessionRef.current=null;wakeSession.stop(false);wakeSessionRef.current=null;cameraSession.stop(false);cameraSessionRef.current=null};
 },[]);
 useEffect(()=>{
  const el=stageRef.current;if(!el)return;
  const observer=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(el);return ()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(!tracking)return;
  const stopMotion=watchCameraOrientation(window,window.screen.orientation??null,{
   onReading:reading=>{setSensor(reading);setSensorError('')},onQuiet:setSensorQuiet,
   onAbsolute:()=>{setAligned(false);setAlignmentError(null);setOffset(0)},
   onRelative:()=>{setAligned(false);setAlignmentError(null);setOffset(0)},
   onUnavailable:reason=>{setSensor(null);setSensorError(reason==='rotated'?'Phone rotated. Move it slightly to refresh orientation before labels resume.':reason==='compass'?'Compass direction is unavailable. Tilt the phone slightly away from vertical, then move it again. If it stays unavailable, use manual preview.':reason==='invalid'?'Orientation data is unavailable. Use manual direction or retry phone motion.':'No orientation reading yet. Move the phone slightly, use manual direction or retry phone motion.')},
  },{angle:()=>window.screen.orientation?.angle??(window as Window & {orientation?:number}).orientation??0});
  motionStopRef.current=stopMotion;
  return ()=>{stopMotion();if(motionStopRef.current===stopMotion)motionStopRef.current=null};
 },[tracking,motionSession]);
 async function startCamera(){
  setSessionNotice('');setNow(new Date());setCameraError('');
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){setCameraError('Camera access needs HTTPS and a supported browser. Manual direction preview is available.');return}
  const cameraSession=cameraSessionRef.current;if(!cameraSession)return;
  await cameraSession.start(
   ()=>navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{exact:'environment'},width:{ideal:1280},height:{ideal:720}}}),
   async()=>{const video=videoRef.current;if(!video)throw Error('Camera viewer closed');await video.play()},
   ()=>!document.hidden&&!!videoRef.current,
  );
 }
 function startDiscovery(){if(!tracking&&!motionPending)void startMotion();void startCamera()}
 async function startWake(){
  setWakeNotice('');
  if(!window.isSecureContext||!navigator.wakeLock?.request){setWakeNotice('Keeping the screen awake needs HTTPS and a supported browser.');return}
  await wakeSessionRef.current?.start(()=>navigator.wakeLock.request('screen'),()=>!document.hidden&&!!stageRef.current);
 }
 function stopWake(){wakeSessionRef.current?.stop();setWakeNotice('')}
 async function startMotion(){
  setSessionNotice('');setNow(new Date());setSensorError('');setSensor(null);setSensorQuiet(false);setTracking(false);setAligned(false);setAlignmentError(null);setOffset(0);
  if(!window.isSecureContext||typeof DeviceOrientationEvent==='undefined'){setSensorError('Motion tracking is unavailable in this browser. Use manual direction.');return}
  const request=++motionRequest.current;setMotionPending(true);
  try{
   const api=DeviceOrientationEvent as typeof DeviceOrientationEvent & {requestPermission?:(absolute?:boolean)=>Promise<string>};
   if(api.requestPermission&&await api.requestPermission(true)!=='granted'){if(request===motionRequest.current)setSensorError('Motion access was denied. Use manual direction, or allow motion access in browser settings.');return}
   if(request!==motionRequest.current||document.hidden)return;
   setMotionSession(session=>session+1);setTracking(true);setSensorError('Waiting for orientation readings…');
  }catch{if(request===motionRequest.current)setSensorError('Motion access could not start. Use manual direction.')}
  finally{if(request===motionRequest.current)setMotionPending(false)}
 }
 function manualMode(){setSessionNotice('');motionRequest.current++;setMotionPending(false);setTracking(false);setSensor(null);setSensorQuiet(false);setSensorError('');setAlignmentError(null);setAligned(false);setOffset(0)}
 function locate(){
  if(!navigator.geolocation){setLocationError('Location access is unavailable. The selected observing site is still in use.');return}
  setLocationError('');
  locationSessionRef.current?.start((success,failure)=>navigator.geolocation.getCurrentPosition(success,failure,{enableHighAccuracy:true,timeout:15000,maximumAge:60000}));
 }
 function keepSite(){locationSessionRef.current?.cancel();setLocationError('Location result will be ignored. The displayed observing site is still in use.')}
 function restoreSite(){
  locationSessionRef.current?.cancel();setPlace(props.place);setNow(new Date());setLocationError('');setAligned(false);setAlignmentError(null);setOffset(0);
 }
 const siteChanged=place.latitude!==props.place.latitude||place.longitude!==props.place.longitude||place.name!==props.place.name;

 const light=useMemo(()=>cameraSkyContext(now,place),[now,place]);
 const targets=useMemo(()=>skyTargets(now,place),[now,place]);
 const selected=targets.find(target=>target.name===props.selected);
 const basis=tracking&&sensor?rotateCameraBearing(sensor.basis,offset):manualCameraBasis(bearing,altitude);
 const direction=cameraDirection(basis),canLabel=canShowCameraLabels(camera,cameraPaused,tracking,sensor,aligned);
 const guide=selected&&canLabel?targetDirectionGuide(basis,selected.altitude,selected.azimuth):null;
 function guidance(){
  if(!selected)return 'Choose an object to see its direction from the centre.';
  if(selected.altitude<=0)return `${selected.name} is below the horizon now.`;
  if(cameraPaused)return 'The camera is paused. Guidance resumes with the live feed.';
  if(!tracking&&camera!=='off')return 'Enable phone motion to discover names as you point. Manual preview is available with the camera off.';
  if(!guide)return sensor?'Choose Check alignment to match the phone direction to a known object.':'Waiting for phone orientation. Move the phone slightly, retry motion or use manual direction.';
  if(guide.separation<3)return `${selected.name} is near the centre · ${guide.separation.toFixed(1)}° away.`;
  const steps=[];
  if(Math.abs(guide.bearingDelta)>=3&&Math.abs(direction.altitude)<85&&selected.altitude<85)steps.push(`${guide.bearingDelta>0?'right':'left'} ${Math.round(Math.abs(guide.bearingDelta))}°`);
  if(Math.abs(guide.elevationDelta)>=3)steps.push(`${guide.elevationDelta>0?'up':'down'} ${Math.round(Math.abs(guide.elevationDelta))}°`);
  return `${tracking?'Turn':'Adjust manual direction'}${steps.length?` ${steps.join(' · ')}`:' towards the object'} · ${Math.round(guide.separation)}° from centre.`;
 }
 function projectedLabels(){
  if(!canLabel||labelMode==='hidden'||!badgeBounds)return [];
  const frame=cameraImageFrame(size.width,size.height,ratio);if(!frame.width||!frame.height)return [];
  const labelWidth=showPhotos?160:120;
  const candidates=[];
  for(const target of targets){
   if(labelMode==='selected'&&target.name!==props.selected)continue;
   const point=projectSkyTarget(target.altitude,target.azimuth,basis,frame.width/frame.height,fov);if(!point)continue;
   candidates.push({name:target.name,mag:target.mag,x:point.x*frame.width+frame.left,y:point.y*frame.height+frame.top});
  }
  return layoutCameraLabels(candidates,frame,labelWidth,props.selected,previousLabels,[badgeBounds]);
 }
 useEffect(()=>{
  const badge=badgeRef.current,stage=stageRef.current;if(!badge||!stage)return;
  const measure=()=>{
   const bounds={left:badge.offsetLeft,top:badge.offsetTop,width:badge.offsetWidth,height:badge.offsetHeight};
   setBadgeBounds(previous=>previous&&Object.keys(bounds).every(key=>previous[key as keyof CameraLabelObstacle]===bounds[key as keyof CameraLabelObstacle])?previous:bounds);
  };
  const observer=new ResizeObserver(measure);observer.observe(badge);observer.observe(stage);measure();
  return()=>observer.disconnect();
 },[props.fullScreen]);
 const labels=projectedLabels();
 const names=labels.map(label=>label.name);
 // Guarded render-time adjustment avoids an effect painting an unstable layout
 // first. Only identity changes update history; fresh coordinates never do.
 if(names.join('|')!==previousLabels.join('|'))setPreviousLabels(names);

 const labelStatus=cameraPaused?'Labels paused until the camera feed resumes.':labelMode==='hidden'?'Object names are hidden. Target guidance remains available when direction is ready.':!canLabel?!tracking?'Names hidden while live camera motion is off. Enable phone discovery.':sensor?'Names paused. Choose Check alignment to align a known object.':'Names paused until phone orientation is available.':labelMode==='selected'&&!selected?'Choose an object to show its name.':labels.length?`${labels.length} catalogue object${labels.length===1?'':'s'} in this direction.`:labelMode==='selected'?'The selected object has no label in this view. Follow its direction below, or choose another object.':'No catalogue objects in this view. Turn the phone or change the manual direction.';
 const trackingReady=tracking&&!!sensor&&(sensor.absolute||aligned);
 const trackingLabel=!tracking?'MOTION OFF':!sensor?'WAITING FOR MOTION':!trackingReady?'ALIGNMENT NEEDED':sensorQuiet?'LAST ORIENTATION':'DISCOVERY';
 const alignment=sensor&&selected?cameraHeadingAlignment(sensor.basis,selected.altitude,selected.azimuth):null;
 function align(){
  if(!sensor||!selected||selected.altitude<=0)return;
  const result=cameraHeadingAlignment(sensor.basis,selected.altitude,selected.azimuth);
  if(result.reason==='pitch'){setAlignmentError({target:selected.name,message:`Raise or lower the phone until the centre elevation is near ${Math.round(selected.altitude)}°, then align again.`});return}
  if(result.reason!=='ready')return;
  setOffset(result.offset);setAligned(true);setAlignmentError(null);
 }
 return <div className="camera-sky-layout"><div className="camera-sky-quick-controls"><div className="camera-sky-live-context"><div><strong>Sky positions for {place.name}</strong><span>Live · {now.toISOString().slice(11,16)} UTC · {light.label}</span></div><button className="text-button" onClick={()=>focusPanel(siteRef.current)}>Check observing site</button><p>{light.message}</p></div><label>Object to follow<select value={props.selected} onChange={event=>props.onSelect(event.target.value)}><option value="">Choose an object</option>{targets.map(target=><option key={target.name} value={target.name}>{target.name} · {Math.round(target.altitude)}°{target.altitude<=0?' · below horizon':''}</option>)}</select></label><div className="camera-sky-actions"><button className="button primary" disabled={camera==='starting'} onClick={camera==='on'?stopCamera:startDiscovery}>{camera==='on'?<Square size={16}/>:<Camera size={16}/>} {camera==='on'?'Stop camera':camera==='starting'?'Starting camera…':'Start camera & discovery'}</button>{camera==='starting'&&<button className="button" onClick={stopCamera}>Cancel camera request</button>}<button className="button" onClick={tracking||motionPending?manualMode:startMotion}><Compass size={16}/>{motionPending?'Cancel motion request':tracking?'Use manual direction':'Enable phone motion'}</button></div>{!tracking&&selected&&<button className="button" disabled={selected.altitude<=0} onClick={previewSelected}>Preview direction of {selected.name}</button>}<button className="button" aria-pressed={wake==='on'} aria-describedby="camera-wake-help" onClick={wake==='off'?startWake:stopWake}>{wake==='on'?'Screen awake · turn off':wake==='requesting'?'Cancel screen awake request':'Keep screen awake'}</button><button className="button" onClick={()=>props.onFullScreenChange(true)}><Maximize2 size={16}/>Full screen camera</button><button className="button" onClick={()=>focusPanel(settingsRef.current)}>Camera settings</button>{tracking&&<button className="button" onClick={checkAlignment}>Check alignment</button>}{tracking&&sensor&&<p role="status" className="camera-sky-message">{sensor.absolute?'Compass direction available · approximate. Check alignment if names drift.':aligned?'Object alignment applied · approximate. Check again if names drift.':'Phone motion is available, but names are paused. Choose a known object, then check alignment.'}</p>}<p id="camera-wake-help" className="camera-sky-wake-help">{wake==='on'?'Screen awake is on while this viewer stays visible. Uses extra battery; ends when you close or leave the viewer.':wake==='requesting'?'Requesting screen awake…':'Screen awake is optional and uses extra battery.'}</p>{wakeNotice&&<p role="status" className="camera-sky-message">{wakeNotice}</p>}{sessionNotice&&<p role="status" className="camera-sky-message">{sessionNotice}</p>}{tracking&&sensorQuiet&&sensor&&<p role="status" className="camera-sky-message">Using the last orientation reading. Some phones send updates only when moved. Move the phone slightly to refresh; if labels stay fixed, retry motion or use manual direction.</p>}{cameraError&&<p role="status" className="camera-sky-message">{cameraError}</p>}{sensorError&&<p role="status" className="camera-sky-message">{sensorError}</p>}{tracking&&(!sensor||sensorQuiet)&&!motionPending&&<button className="button" onClick={startMotion}>Retry phone motion</button>}{motionPending&&<p role="status">Waiting for motion permission…</p>}</div><div className="camera-sky-main"><div className="camera-sky-stage" ref={stageRef} style={{aspectRatio:ratio}} tabIndex={-1} role="region" aria-label="Camera sky object overlay">
  <video ref={videoRef} muted playsInline aria-hidden={camera!=='on'} aria-label="Live rear camera preview" onLoadedMetadata={updateVideoRatio} onResize={updateVideoRatio}/>
  {(camera!=='on'||cameraPaused)&&<div className="camera-sky-placeholder"><Camera size={30}/><strong>{cameraPaused?'Camera paused':camera==='starting'?'Opening rear camera…':'Direction preview'}</strong><span>{cameraPaused?'The camera feed is interrupted. If it does not resume, stop and start the camera again.':'Camera is off. Start it to place names over your view.'}</span></div>}
  {camera==='on'&&!trackingReady&&<div className="camera-sky-discovery-notice"><strong>{!tracking?'Camera only · motion is off':!sensor?'Waiting for phone direction':'Align phone direction'}</strong><span>{!tracking?'Names follow your phone after enabling motion.':!sensor?'Move the phone slightly. Names stay hidden until direction is available.':'Choose a known object, then align the phone to show names.'}</span><button className="button" disabled={motionPending} onClick={!tracking?startMotion:!sensor?startMotion:checkAlignment}>{motionPending?'Waiting for motion permission…':!tracking?'Enable phone discovery':!sensor?'Retry phone motion':'Check alignment'}</button></div>}
  <span className="camera-sky-reticle" aria-hidden="true"/>
  {labels.map(label=><button key={label.name} className={`camera-sky-label${showPhotos?' camera-sky-label-photo':''}`} title={showPhotos?`${label.name} · reference image; open photo details for source credits`:undefined} style={{left:label.x,top:label.y}} aria-pressed={props.selected===label.name} onClick={()=>props.onSelect(label.name)}>{showPhotos&&<CameraThumbnail name={label.name}/>}<span>{label.name}</span></button>)}
  <span ref={badgeRef} className="camera-sky-badge">{cameraPaused?'CAMERA PAUSED':camera==='on'?'LIVE CAMERA':'CAMERA OFF'} · {camera==='off'&&!tracking?'MANUAL PREVIEW':trackingLabel}</span>
 </div>{props.fullScreen&&<div className="camera-sky-fullscreen-controls"><div><button className="button" onClick={()=>leaveFullScreen()}><Minimize2 size={16}/>Exit full screen</button><button className="button" onClick={camera!=='off'?stopCamera:startDiscovery}><Camera size={16}/>{camera==='on'?'Stop camera':camera==='starting'?'Cancel camera request':'Start discovery'}</button><button className="button" onClick={tracking||motionPending?manualMode:startMotion}><Compass size={16}/>{motionPending?'Cancel motion request':tracking?'Use manual direction':'Enable motion'}</button><button className="button" onClick={()=>leaveFullScreen(true)}>Settings</button>{tracking&&<button className="button" onClick={checkAlignment}>Check alignment</button>}</div><p>{place.name} · {trackingLabel} · {tracking&&!sensor?'Waiting for phone direction':`${Math.round(direction.bearing)}° ${tracking&&sensor&&!sensor.absolute&&!aligned?'relative bearing':'bearing'} · ${Math.round(direction.altitude)}° elevation`}</p><p role="status">{cameraError||sensorError||sessionNotice||(motionPending?'Waiting for motion permission…':labelStatus)}</p>{selected&&<p>{guidance()}</p>}</div>}<p className="camera-sky-direction">{tracking&&!sensor?'Waiting for phone direction…':`Centre: ${Math.round(direction.bearing)}° ${tracking&&sensor&&!sensor.absolute&&!aligned?'relative bearing':'bearing'} · ${Math.round(direction.altitude)}° elevation`}</p><p className="muted" role="status">{labelStatus}</p><div className="camera-sky-target-guide"><strong>{selected?`Find ${selected.name}`:'Find an object'}</strong><p>{guidance()}</p>{selected&&<small>Target now: {Math.round(selected.azimuth)}° bearing · {Math.round(selected.altitude)}° elevation</small>}</div></div>
 <div className="camera-sky-tools" ref={settingsRef} role="region" aria-label="Camera settings" tabIndex={-1}><button className="button camera-sky-return" onClick={()=>focusPanel(stageRef.current)}>Back to sky view</button><ViewingMode inline/><label className="camera-sky-photo-toggle"><span>Reference thumbnails</span><input type="checkbox" checked={showPhotos} onChange={event=>setShowPhotos(event.target.checked)}/></label><small>NASA spacecraft images and DSS star fields. Reference images need internet; turn them off for a clearer view. Select a name, then open its photo & details for credits.</small><label>Object labels<select aria-label="Object labels" aria-describedby="camera-label-help" value={labelMode} onChange={event=>setLabelMode(event.target.value as typeof labelMode)}><option value="all">All objects</option><option value="selected">Selected object only</option><option value="hidden">Hide names</option></select><small id="camera-label-help">Reduce clutter over the camera. Direction guidance stays available; labels use predicted sky positions.</small></label>
 <div className="camera-sky-context" ref={siteRef} tabIndex={-1} role="region" aria-label="Camera observing site"><strong>{place.name}</strong><span>{place.latitude.toFixed(3)}°, {place.longitude.toFixed(3)}°</span><span>Live positions · {now.toISOString().slice(0,19).replace('T',' ')} UTC</span><button className="text-button" onClick={locate} disabled={locating}><MapPin size={15}/>{locating?'Finding your location…':'Use current location'}</button>{locating&&<button className="text-button" onClick={keepSite}>Keep displayed site</button>}{siteChanged&&<button className="text-button" onClick={restoreSite}>Use planner site: {props.place.name}</button>}{locationError&&<p role="status">{locationError}</p>}<small>Uses the selected observing site until you choose your device location. Location changes here apply only to this viewer.</small></div>
 {tracking?<div className="camera-sky-calibration" ref={calibrationRef} role="region" aria-label="Phone direction alignment" tabIndex={-1}><strong>{!sensor?'Waiting for phone orientation':sensor.absolute?'Compass tracking · approximate':aligned?'Aligned motion tracking · approximate':'Alignment needed'}</strong><p>Point the centre crosshair at a known selected object, then align its bearing. Keep the phone level from side to side. Repeat if labels drift.</p>{!selected&&<p>Choose a known object in Object to follow before aligning.</p>}{alignmentError?.target===props.selected&&<p role="status" className="camera-sky-message">{alignmentError.message}</p>}<button className="button" disabled={!alignment||alignment.reason==='horizon'||alignment.reason==='zenith'||alignment.reason==='invalid'} onClick={align}>Align {selected?.name||'selected object'} at centre</button>{alignment?.reason==='zenith'&&<p role="status">Heading alignment is unreliable near overhead. Choose an object below 85° elevation and point the phone towards it.</p>}{selected&&<small>{selected.name}: {Math.round(selected.azimuth)}° bearing · {Math.round(selected.altitude)}° elevation now{selected.altitude<=0?' · below horizon':''}</small>}<label>Heading correction: {Math.round(offset)}°<input type="range" min="-180" max="180" step="1" disabled={!sensor||(!sensor.absolute&&!aligned)} value={offset} onChange={event=>setOffset(Number(event.target.value))}/></label>{sensor&&!sensor.absolute&&!aligned&&<small>Align a known object first to enable heading correction and labels.</small>}</div>:<div className="camera-sky-manual"><label>Bearing: {bearing}°<input type="range" min="0" max="359" value={bearing} onChange={event=>setBearing(Number(event.target.value))}/></label><label>Elevation: {altitude}°<input type="range" min="0" max="90" value={altitude} onChange={event=>setAltitude(Number(event.target.value))}/></label></div>}
 <label className="camera-sky-fov">Vertical field of view: {fov}°<input type="range" min="30" max="100" value={fov} onChange={event=>setFov(Number(event.target.value))}/><small>Approximate. Adjust to match your camera lens; camera zoom and lens changes affect alignment.</small></label>
 {selected&&<button className="button" onClick={()=>props.onDetails(now,place)}>View {selected.name} photo & details at live time</button>}
 <p className="camera-sky-footnote">Names show predicted positions, not image recognition or guaranteed visibility. Compass drift, magnetic north, lens distortion and an incorrect site can shift labels. Clouds, daylight and obstructions are not detected. Camera frames stay on this device; nothing is recorded or uploaded. Camera and motion stop when you close this viewer or leave Nightjar in the background.</p>
 </div></div>;
}
