'use client';
import {lazy,useEffect,useMemo,useRef,useState,type RefObject} from 'react';
import {flushSync} from 'react-dom';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {reviewObservingTimeEvent} from '@/lib/observing-time-actions';
import {reviewCoordinateEntryEvent} from '@/lib/coordinate-entry-actions';
import {reviewImagingDraftEvent} from '@/lib/imaging-draft-actions';
import {reviewDiaryFormsEvent} from '@/lib/diary-form-actions';
import {reviewTargetNotesEvent} from '@/lib/target-note-actions';
import {Dialog} from 'radix-ui';
import {Camera,Maximize2,X,Image as PhotoIcon} from 'lucide-react';
import {type Place} from '@/lib/sky';
import {skyImagingFrame,type SkyImagingFrame} from '@/lib/sky-framing';
import type {PhotographyDraft,PhotographyDraftStatus} from '@/lib/photography-draft';
import type {AtlasView} from '@/lib/atlas-view';
import DeferredView from '@/components/deferred-view';
import SkyChart from '@/components/sky-chart';
import ExpandedSkyAtlas from '@/components/expanded-sky-atlas';
import SkyLayerControls,{type SkyLayerSettings} from '@/components/sky-layer-controls';
const SkyDome=lazy(()=>import('@/components/sky-dome'));
const CameraSky=lazy(()=>import('@/components/camera-sky'));
const editReviewEvents=[reviewObservingTimeEvent,reviewCoordinateEntryEvent,reviewImagingDraftEvent,reviewDiaryFormsEvent,reviewTargetNotesEvent];
export type SkyAtlasProps={imagingFrame?:SkyImagingFrame;place:Place;date:Date;selected:string;onSelect:(name:string)=>void;showLines:boolean;showLabels:boolean;showMilkyWay:boolean};
function focusDetails(id:string,reviewPending=false,owner?:Element|null){
 deferFocusAndScroll(()=>{
  // Camera context changes can be queued behind unfinished edits. Resolve
  // the destination after dialog cleanup and the pending review has rendered.
  const details=(reviewPending?document.getElementById('unsaved-view-heading'):null)??document.getElementById(id);
  return details;
 },{owner});
}
function focusTargetDetails(owner?:Element|null){focusDetails('target-details',false,owner)}
export default function SkyAtlasViewer(props:SkyAtlasProps & SkyLayerSettings & {showImaging:boolean;onShowImagingChange:(shown:boolean)=>void;imagingDraft:PhotographyDraft;imagingDraftStatus:PhotographyDraftStatus;onEditImaging:()=>void;cameraDeepTarget?:string;view:AtlasView;onViewChange:(view:AtlasView)=>void;viewStorageError:boolean;onCameraPlan:(date:Date,place:Place,deepSkyId?:string)=>void;cameraOpen:boolean;onCameraOpenChange:(open:boolean)=>void;onCameraLauncherChange:(launcher:HTMLButtonElement|null)=>void;cameraReturnFocus:RefObject<HTMLButtonElement|null>}){
 const mode=props.view;
 const showImaging=props.showImaging;
 const imaging=useMemo(()=>{
  if(!showImaging)return {frame:undefined,error:''};
  if(props.imagingDraftStatus==='unavailable')return {frame:undefined,error:'The saved imaging draft could not be read. Retry reading it in Photo tools before showing a grid, or edit the displayed defaults to start a new draft.'};
  if(props.imagingDraftStatus==='invalid')return {frame:undefined,error:'The stored imaging draft is invalid. Open Photo tools to review the defaults before starting a new draft.'};
  try{return {frame:skyImagingFrame(props.imagingDraft,props.date,props.place),error:''}}catch(error){return {frame:undefined,error:error instanceof Error?error.message:'The imaging grid is unavailable.'}}
 },[showImaging,props.imagingDraftStatus,props.imagingDraft,props.date,props.place]);
 const atlasProps={...props,imagingFrame:imaging.frame};
 const angle=(value:number)=>value>=1?value.toFixed(2)+'°':value>=1/60?(value*60).toFixed(2)+'′':(value*3600).toFixed(2)+'″';

 const viewingDetails=useRef(false),viewingDeepDetails=useRef(false),detailsOwner=useRef<Element|null>(null);
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
 return <div className="sky-atlas-viewer"><section className="sky-imaging-controls" aria-label="Equipment framing overlay"><div className="sky-imaging-actions"><button type="button" className="button" aria-pressed={showImaging} onClick={()=>props.onShowImagingChange(!showImaging)}>Imaging grid: {showImaging?'on':'off'}</button><button type="button" className="text-button" onClick={props.onEditImaging}>Edit in Photo tools</button></div>{showImaging&&<div role="status">{imaging.error?<p className="notice">Imaging grid unavailable: {imaging.error}{!['invalid','unavailable'].includes(props.imagingDraftStatus)&&' Your current fields stay available in Photo tools.'}</p>:imaging.frame&&<><p>{imaging.frame.name} · {imaging.frame.target} · {imaging.frame.cols} × {imaging.frame.rows} panels</p><p>Single frame {angle(imaging.frame.width)} × {angle(imaging.frame.height)} · {imaging.frame.rotation}° east of J2000 north.</p><p>Grid centre altitude {imaging.frame.centre.altitude.toFixed(1)}° · {imaging.frame.centre.altitude>0?'Above':'At or below'} the horizon. Only portions above the ideal horizon are drawn.</p></>}{props.imagingDraftStatus==='visit'&&<p>This imaging draft applies for this visit and could not be saved.</p>}<p className="footnote">Uses the current Photo tools equipment and mosaic draft. Frames keep their angular scale and can look small on an all-sky view. Expand the atlas or use the framing guide for inspection. Panel orientations away from the J2000 tangent-plane centre are approximate; this is not a mount command or a visibility prediction.</p></div>}</section><div className="sky-view-switch" role="group" aria-label="Sky atlas view"><button className="button" aria-pressed={mode==='3d'} onClick={()=>props.onViewChange('3d')}>3D sky</button><button className="button" aria-pressed={mode==='2d'} onClick={()=>props.onViewChange('2d')}>2D chart</button>{mode==='3d'&&<Dialog.Root open={expanded} onOpenChange={setExpanded}><Dialog.Trigger className="button"><Maximize2 size={16}/>Expand 3D sky</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="expanded-atlas-overlay"/><Dialog.Content className="expanded-atlas-dialog expanded-dome-dialog" onCloseAutoFocus={event=>{if(finishReview(event))return;if(!viewingDetails.current)return;viewingDetails.current=false;const owner=detailsOwner.current;detailsOwner.current=null;if(!document.getElementById('target-details'))return;event.preventDefault();focusTargetDetails(owner)}}><div className="expanded-atlas-header"><div><Dialog.Title>3D sky above {props.place.name}</Dialog.Title><Dialog.Description>Positions for {props.date.toISOString().slice(0,16).replace('T',' ')} UTC. Orbit the dome to explore your sky.</Dialog.Description></div><Dialog.Close className="button" aria-label="Close expanded 3D sky"><X size={20}/></Dialog.Close></div><SkyLayerControls {...props}/><DeferredView name="3D sky" fallback={<p role="status">Loading 3D sky…</p>}><SkyDome {...atlasProps}/></DeferredView><div className="expanded-dome-selection"><p className="muted" role="status">{props.selected?`Selected: ${props.selected}`:'Select an object to highlight it and view its photo in the target details.'}</p>{props.selected&&<Dialog.Close asChild><button className="button" onClick={event=>{detailsOwner.current=event.currentTarget;viewingDetails.current=true}}>View {props.selected} photo & details</button></Dialog.Close>}</div></Dialog.Content></Dialog.Portal></Dialog.Root>}{mode==='2d'&&<ExpandedSkyAtlas {...atlasProps}/>}<Dialog.Root open={props.cameraOpen} onOpenChange={open=>{props.onCameraOpenChange(open);if(!open)setCameraFullScreen(false)}}><Dialog.Trigger className="button" onClick={event=>{props.onCameraLauncherChange(event.currentTarget)}}><Camera size={16}/>Camera sky view</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="expanded-atlas-overlay"/><Dialog.Content className={`camera-sky-dialog${cameraFullScreen?' camera-sky-fullscreen':''}`} onEscapeKeyDown={event=>{if(cameraFullScreen){event.preventDefault();setCameraFullScreen(false)}}} onCloseAutoFocus={event=>{if(finishReview(event)){props.onCameraLauncherChange(null);return}if(!viewingDetails.current){const launcher=props.cameraReturnFocus.current;props.onCameraLauncherChange(null);if(launcher?.isConnected){event.preventDefault();launcher.focus()}return}viewingDetails.current=false;const owner=detailsOwner.current;detailsOwner.current=null;props.onCameraLauncherChange(null);const id=viewingDeepDetails.current?'deep-sky-object-details':'target-details';viewingDeepDetails.current=false;event.preventDefault();focusDetails(id,true,owner)}}><div className="camera-sky-header"><div><Dialog.Title>Camera sky view</Dialog.Title><Dialog.Description>Point your phone at the sky to explore predicted object positions. Camera and motion access start only when you choose them.</Dialog.Description></div><Dialog.Close className="button" aria-label="Close camera sky view"><X size={20}/></Dialog.Close></div><DeferredView name="Camera sky view" fallback={<p role="status">Loading camera sky view…</p>}><CameraSky initialDeepTarget={props.cameraDeepTarget} fullScreen={cameraFullScreen} onFullScreenChange={setCameraFullScreen} place={props.place} selected={props.selected} onSelect={props.onSelect} onDetails={(date,place,deepSkyId)=>{detailsOwner.current=document.activeElement;viewingDetails.current=true;viewingDeepDetails.current=Boolean(deepSkyId);props.onCameraPlan(date,place,deepSkyId);setCameraFullScreen(false);props.onCameraOpenChange(false)}}/></DeferredView></Dialog.Content></Dialog.Portal></Dialog.Root></div>{props.viewStorageError&&<p className="muted" role="status">Your chosen view applies for this visit, but could not be saved for next time.</p>}<p className="sky-view-guidance muted">{mode==='3d'?'3D dome · compass labels show north, east, south and west as you rotate. Zenith is directly overhead.':'2D overhead chart · north is up and east is left. The outer circle is your horizon; the centre is overhead.'}</p>{props.selected&&<button className="button sky-photo-shortcut" onClick={event=>focusTargetDetails(event.currentTarget)}><PhotoIcon size={16}/>View {props.selected} photo & details ↑</button>}{mode==='3d'?<DeferredView name="3D sky" fallback={<div className="sky-dome" role="status">Loading 3D sky…</div>}><SkyDome {...atlasProps}/></DeferredView>:<SkyChart {...atlasProps} large/>}</div>;
}
