'use client';
import {useState,type CSSProperties} from 'react';
import Image from 'next/image';
import {Dialog} from 'radix-ui';
import {Maximize2,Minus,Plus,RotateCcw,X} from 'lucide-react';
import {objectPhoto,type ObjectPhoto as Photo} from '@/lib/object-photos';
import {viewerZoomKey} from '@/lib/viewer-zoom';

function PhotoImage({photo,enlarged=false}:{photo:Photo;enlarged?:boolean}){
 const [failed,setFailed]=useState(false),[loaded,setLoaded]=useState(false),[retry,setRetry]=useState(0);
 return <div className={enlarged?'photo-enlarged-image':'object-photo-image'}>
  {failed?<div role="status"><p>The reference photo could not load. Check your connection or open the source below.</p><button className="button" onClick={()=>{setFailed(false);setLoaded(false);setRetry(value=>value+1)}}>Retry photo</button></div>:<>
   <Image key={retry} unoptimized src={photo.src} alt={photo.alt} width={800} height={800} loading={enlarged?'eager':'lazy'} referrerPolicy="no-referrer" onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}/>
   {!loaded&&<span role="status">Loading reference photo…</span>}
  </>}
 </div>;
}
function PhotoCaption({photo}:{photo:Photo}){
 return <><strong>{photo.title||(photo.survey?'Photographic star field':'Spacecraft reference photo')}</strong><p>{photo.caption}</p><p>{photo.credit} · <a href={photo.source} target="_blank" rel="noreferrer">Image source ↗</a></p><small>Reference imagery does not represent today’s appearance, apparent size, or visibility. Internet access is required.</small></>;
}
export default function ObjectPhoto({name,reference}:{name:string;reference?:Photo}){
 const photo=reference??objectPhoto(name),[zoom,setZoom]=useState(1);
 if(!photo)return null;
 return <figure className="object-photo">
  <PhotoImage photo={photo}/>
  <figcaption><PhotoCaption photo={photo}/>
   <Dialog.Root onOpenChange={open=>{if(open)setZoom(1)}}>
    <Dialog.Trigger className="button photo-expand-trigger"><Maximize2 size={16}/>View larger {name} photo</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="expanded-atlas-overlay"/><Dialog.Content className="photo-viewer-dialog">
     <div className="photo-viewer-header"><div><Dialog.Title>{name} reference photo</Dialog.Title><Dialog.Description>Zoom to inspect the image, then scroll inside it to move around. With the image area focused, + and − zoom; 0 resets. Enlargement uses the same reference image and adds no detail.</Dialog.Description></div><Dialog.Close className="button" aria-label="Close enlarged photo"><X size={20}/></Dialog.Close></div>
     <div className="photo-viewer-controls" role="group" aria-label="Photo zoom controls">
      <button className="button" disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-.5))} aria-label="Zoom out photo"><Minus size={18}/></button>
      <output aria-live="polite" aria-label="Photo zoom">{Math.round(zoom*100)}%</output>
      <button className="button" disabled={zoom>=3} onClick={()=>setZoom(value=>Math.min(3,value+.5))} aria-label="Zoom in photo"><Plus size={18}/></button>
      <button className="button" onClick={()=>setZoom(1)}><RotateCcw size={16}/>Reset photo zoom</button>
     </div>
     <div className="photo-viewer-viewport" tabIndex={0} role="region" aria-label={`Scrollable ${name} photo`} onKeyDown={event=>{if(event.target!==event.currentTarget||event.ctrlKey||event.metaKey||event.altKey)return;const next=viewerZoomKey(zoom,event.key);if(next!==undefined){event.preventDefault();setZoom(next)}}}><div className="photo-viewer-canvas" style={{'--photo-zoom':zoom} as CSSProperties}><PhotoImage photo={photo} enlarged/></div></div>
     <div className="photo-viewer-caption"><PhotoCaption photo={photo}/></div>
    </Dialog.Content></Dialog.Portal>
   </Dialog.Root>
  </figcaption>
 </figure>;
}
