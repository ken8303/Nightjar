'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import Image from 'next/image';
import {Dialog} from 'radix-ui';
import {Maximize2,Minus,Plus,RotateCcw,X} from 'lucide-react';
import {objectPhoto,type ObjectPhoto as Photo} from '@/lib/object-photos';
import {watchPhotoDelay} from '@/lib/photo-delay';
import {photoRetrySource} from '@/lib/photo-retry';
import {viewerZoomKey} from '@/lib/viewer-zoom';
import {useLanguage} from '@/components/language-provider';

function PhotoImage({photo,enlarged=false}:{photo:Photo;enlarged?:boolean}){
 const {language,t}=useLanguage();
 const [failed,setFailed]=useState(false),[loaded,setLoaded]=useState(false),[retry,setRetry]=useState(0),[slow,setSlow]=useState(false),[usingArchive,setUsingArchive]=useState(false);
 const source=photo.previewSrc??photo.src;
 const [imageSource,setImageSource]=useState(source);
 const attempt=useRef(0),retryFocus=useRef(false),retryButton=useRef<HTMLButtonElement>(null),image=useRef<HTMLImageElement>(null);
 const frame=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(loaded||failed||!frame.current)return;return watchPhotoDelay(frame.current,()=>setSlow(true))},[loaded,failed,retry,imageSource]);
 useEffect(()=>{
  if(!retryFocus.current||!loaded&&!failed&&!slow)return;
  retryFocus.current=false;
  const destination=loaded?(enlarged?frame.current?.closest<HTMLDivElement>('.photo-viewer-viewport'):image.current):retryButton.current;
  const active=document.activeElement,dialog=frame.current?.closest('[role="dialog"]');
  if((active===document.body||enlarged&&active===dialog)&&!document.hidden&&!destination?.closest('[aria-hidden="true"]'))destination?.focus({preventScroll:true});
 },[loaded,failed,slow,enlarged]);
 const retryPhoto=()=>{
  retryFocus.current=true;
  setImageSource(photoRetrySource(source,`${Date.now()}-${++attempt.current}`,window.location.href));setUsingArchive(false);setFailed(false);setLoaded(false);setSlow(false);setRetry(value=>value+1);
 };
 return <div ref={frame} className={`${enlarged?'photo-enlarged-image':'object-photo-image'}${failed||(!loaded&&slow)?' photo-recovery-active':''}`}>
  {failed?<div role="status"><p>{t('image.failed')}</p><button ref={retryButton} className="button" onClick={retryPhoto}>{t('image.retry')}</button></div>:<>
   <Image ref={image} tabIndex={-1} key={retry} unoptimized src={imageSource} alt={language==='zh-Hant'?photo.altZh??photo.alt:photo.alt} width={800} height={800} loading={enlarged?'eager':'lazy'} referrerPolicy="no-referrer" style={loaded?undefined:{visibility:'hidden'}} onLoad={()=>setLoaded(true)} onError={()=>{if(!usingArchive&&photo.previewSrc&&photo.previewSrc!==photo.src){setUsingArchive(true);setImageSource(photo.src);setSlow(false)}else setFailed(true)}}/>
   {!loaded&&(slow?<div className="photo-slow-message" role="status"><p>{t('image.slow')}</p><button ref={retryButton} className="button" onClick={retryPhoto}>{t('image.retry')}</button></div>:<span role="status">{t('image.loading')}</span>)}
  </>}
 </div>;
}
function PhotoCaption({photo}:{photo:Photo}){
 const {language,t}=useLanguage();
 const title=language==='zh-Hant'?photo.titleZh??photo.title:photo.title,caption=language==='zh-Hant'?photo.captionZh??photo.caption:photo.caption;
 return <><strong>{title||t(photo.survey?'image.surveyTitle':'image.spacecraftTitle')}</strong><p>{caption}</p><p>{photo.credit} · <a href={photo.source} target="_blank" rel="noreferrer">{t('image.source')}</a>{photo.survey&&photo.previewSrc&&<> · <a href={photo.src} target="_blank" rel="noreferrer">{t('image.fullSurvey')}</a></>}</p><small>{t('image.caution')}</small></>;
}
export default function ObjectPhoto({name,reference}:{name:string;reference?:Photo}){
 const {t}=useLanguage();
 const photo=reference??objectPhoto(name),[zoom,setZoom]=useState(1);
 if(!photo)return null;
 return <figure className="object-photo">
  <PhotoImage key={photo.previewSrc??photo.src} photo={photo}/>
  <figcaption><PhotoCaption photo={photo}/>
   <Dialog.Root onOpenChange={open=>{if(open)setZoom(1)}}>
    <Dialog.Trigger className="button photo-expand-trigger"><Maximize2 size={16}/>{t('image.larger',{name})}</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="expanded-atlas-overlay"/><Dialog.Content className="photo-viewer-dialog">
     <div className="photo-viewer-header"><div><Dialog.Title>{t('image.dialogTitle',{name})}</Dialog.Title><Dialog.Description>{t('image.dialogDescription')}</Dialog.Description></div><Dialog.Close className="button" aria-label={t('image.close')}><X size={20}/></Dialog.Close></div>
     <div className="photo-viewer-controls" role="group" aria-label={t('image.controls')}>
      <button className="button" disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-.5))} aria-label={t('image.zoomOut')}><Minus size={18}/></button>
      <output aria-live="polite" aria-label={t('image.zoomValue')}>{Math.round(zoom*100)}%</output>
      <button className="button" disabled={zoom>=3} onClick={()=>setZoom(value=>Math.min(3,value+.5))} aria-label={t('image.zoomIn')}><Plus size={18}/></button>
      <button className="button" onClick={()=>setZoom(1)}><RotateCcw size={16}/>{t('image.reset')}</button>
     </div>
     <div className="photo-viewer-viewport" tabIndex={0} role="region" aria-label={t('image.scrollRegion',{name})} onKeyDown={event=>{if(event.target!==event.currentTarget||event.ctrlKey||event.metaKey||event.altKey)return;const next=viewerZoomKey(zoom,event.key);if(next!==undefined){event.preventDefault();setZoom(next)}}}><div className="photo-viewer-canvas" style={{'--photo-zoom':zoom} as CSSProperties}><PhotoImage key={photo.previewSrc??photo.src} photo={photo} enlarged/></div></div>
     <div className="photo-viewer-caption"><PhotoCaption photo={photo}/></div>
    </Dialog.Content></Dialog.Portal>
   </Dialog.Root>
  </figcaption>
 </figure>;
}
