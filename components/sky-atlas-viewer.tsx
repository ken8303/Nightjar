'use client';
import {lazy,useEffect,useRef,useState,type RefObject} from 'react';
import {flushSync} from 'react-dom';
import {reviewObservingTimeEvent} from '@/lib/observing-time-actions';
import {reviewCoordinateEntryEvent} from '@/lib/coordinate-entry-actions';
import {reviewImagingDraftEvent} from '@/lib/imaging-draft-actions';
import {reviewDiaryFormsEvent} from '@/lib/diary-form-actions';
import {Dialog} from 'radix-ui';
import {Camera,Maximize2,X,Image as PhotoIcon} from 'lucide-react';
import {type Place} from '@/lib/sky';
import type {AtlasView} from '@/lib/atlas-view';
import DeferredView from '@/components/deferred-view';
import SkyChart from '@/components/sky-chart';
import ExpandedSkyAtlas from '@/components/expanded-sky-atlas';
import SkyLayerControls,{type SkyLayerSettings} from '@/components/sky-layer-controls';
const SkyDome=lazy(()=>import('@/components/sky-dome'));
const CameraSky=lazy(()=>import('@/components/camera-sky'));
const editReviewEvents=[reviewObservingTimeEvent,reviewCoordinateEntryEvent,reviewImagingDraftEvent,reviewDiaryFormsEvent];
export type SkyAtlasProps={place:Place;date:Date;selected:string;onSelect:(name:string)=>void;showLines:boolean;showLabels:boolean;showMilkyWay:boolean};
function focusDetails(id:string){
 const details=document.getElementById(id);
 if(!details)return;
 requestAnimationFrame(()=>{details.focus({preventScroll:true});details.scrollIntoView({block:'start',behavior:'instant'})});
}
function focusTargetDetails(){focusDetails('target-details')}
export default function SkyAtlasViewer(props:SkyAtlasProps & SkyLayerSettings & {cameraDeepTarget?:string;view:AtlasView;onViewChange:(view:AtlasView)=>void;viewStorageError:boolean;onCameraPlan:(date:Date,place:Place,deepSkyId?:string)=>void;cameraOpen:boolean;onCameraOpenChange:(open:boolean)=>void;onCameraLauncherChange:(launcher:HTMLButtonElement|null)=>void;cameraReturnFocus:RefObject<HTMLButtonElement|null>}){
 const mode=props.view;
 const viewingDetails=useRef(false),viewingDeepDetails=useRef(false);
 const [cameraFullScreen,setCameraFullScreen]=useState(false),[expanded,setExpanded]=useState(false);
 const reviewingEdits=useRef<string|null>(null);
 function finishReview(event:Event){const requested=reviewingEdits.current;if(!requested)return false;event.preventDefault();reviewingEdits.current=null;queueMicrotask(()=>window.dispatchEvent(new Event(requested)));return true}
 const {cameraOpen,onCameraOpenChange}=props;
 useEffect(()=>{
  // Replay review after dialog cleanup, when the planner field can take focus.
  const review=(event:Event)=>{if(!expanded&&!cameraOpen)return;event.stopImmediatePropagation();reviewingEdits.current=event.type;flushSync(()=>{setExpanded(false);setCameraFullScreen(false);onCameraOpenChange(false)})};
  editReviewEvents.forEach(event=>window.addEventListener(event,review,true));
  return()=>editReviewEvents.forEach(event=>window.removeEventListener(event,review,true));
 },[expanded,cameraOpen,onCameraOpenChange]);
 return <div className="sky-atlas-viewer"><div className="sky-view-switch" role="group" aria-label="Sky atlas view"><button className="button" aria-pressed={mode==='3d'} onClick={()=>props.onViewChange('3d')}>3D sky</button><button className="button" aria-pressed={mode==='2d'} onClick={()=>props.onViewChange('2d')}>2D chart</button>{mode==='3d'&&<Dialog.Root open={expanded} onOpenChange={setExpanded}><Dialog.Trigger className="button"><Maximize2 size={16}/>Expand 3D sky</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="expanded-atlas-overlay"/><Dialog.Content className="expanded-atlas-dialog expanded-dome-dialog" onCloseAutoFocus={event=>{if(finishReview(event))return;if(!viewingDetails.current)return;viewingDetails.current=false;if(!document.getElementById('target-details'))return;event.preventDefault();focusTargetDetails()}}><div className="expanded-atlas-header"><div><Dialog.Title>3D sky above {props.place.name}</Dialog.Title><Dialog.Description>Positions for {props.date.toISOString().slice(0,16).replace('T',' ')} UTC. Orbit the dome to explore your sky.</Dialog.Description></div><Dialog.Close className="button" aria-label="Close expanded 3D sky"><X size={20}/></Dialog.Close></div><SkyLayerControls {...props}/><DeferredView name="3D sky" fallback={<p role="status">Loading 3D sky…</p>}><SkyDome {...props}/></DeferredView><div className="expanded-dome-selection"><p className="muted" role="status">{props.selected?`Selected: ${props.selected}`:'Select an object to highlight it and view its photo in the target details.'}</p>{props.selected&&<Dialog.Close asChild><button className="button" onClick={()=>{viewingDetails.current=true}}>View {props.selected} photo & details</button></Dialog.Close>}</div></Dialog.Content></Dialog.Portal></Dialog.Root>}{mode==='2d'&&<ExpandedSkyAtlas {...props}/>}<Dialog.Root open={props.cameraOpen} onOpenChange={open=>{props.onCameraOpenChange(open);if(!open)setCameraFullScreen(false)}}><Dialog.Trigger className="button" onClick={event=>{props.onCameraLauncherChange(event.currentTarget)}}><Camera size={16}/>Camera sky view</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="expanded-atlas-overlay"/><Dialog.Content className={`camera-sky-dialog${cameraFullScreen?' camera-sky-fullscreen':''}`} onEscapeKeyDown={event=>{if(cameraFullScreen){event.preventDefault();setCameraFullScreen(false)}}} onCloseAutoFocus={event=>{if(finishReview(event)){props.onCameraLauncherChange(null);return}if(!viewingDetails.current){const launcher=props.cameraReturnFocus.current;props.onCameraLauncherChange(null);if(launcher?.isConnected){event.preventDefault();launcher.focus()}return}viewingDetails.current=false;props.onCameraLauncherChange(null);const id=viewingDeepDetails.current?'deep-sky-object-details':'target-details';viewingDeepDetails.current=false;if(!document.getElementById(id))return;event.preventDefault();focusDetails(id)}}><div className="camera-sky-header"><div><Dialog.Title>Camera sky view</Dialog.Title><Dialog.Description>Point your phone at the sky to explore predicted object positions. Camera and motion access start only when you choose them.</Dialog.Description></div><Dialog.Close className="button" aria-label="Close camera sky view"><X size={20}/></Dialog.Close></div><DeferredView name="Camera sky view" fallback={<p role="status">Loading camera sky view…</p>}><CameraSky initialDeepTarget={props.cameraDeepTarget} fullScreen={cameraFullScreen} onFullScreenChange={setCameraFullScreen} place={props.place} selected={props.selected} onSelect={props.onSelect} onDetails={(date,place,deepSkyId)=>{viewingDetails.current=true;viewingDeepDetails.current=Boolean(deepSkyId);props.onCameraPlan(date,place,deepSkyId);setCameraFullScreen(false);props.onCameraOpenChange(false)}}/></DeferredView></Dialog.Content></Dialog.Portal></Dialog.Root></div>{props.viewStorageError&&<p className="muted" role="status">Your chosen view applies for this visit, but could not be saved for next time.</p>}<p className="sky-view-guidance muted">{mode==='3d'?'3D dome · compass labels show north, east, south and west as you rotate. Zenith is directly overhead.':'2D overhead chart · north is up and east is left. The outer circle is your horizon; the centre is overhead.'}</p>{props.selected&&<button className="button sky-photo-shortcut" onClick={focusTargetDetails}><PhotoIcon size={16}/>View {props.selected} photo & details ↑</button>}{mode==='3d'?<DeferredView name="3D sky" fallback={<div className="sky-dome" role="status">Loading 3D sky…</div>}><SkyDome {...props}/></DeferredView>:<SkyChart {...props} large/>}</div>;
}
