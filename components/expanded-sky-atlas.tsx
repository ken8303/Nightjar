'use client';
import {useMemo,useRef,useState,type CSSProperties} from 'react';
import {Dialog} from 'radix-ui';
import {Maximize2,Minus,Plus,RotateCcw,X} from 'lucide-react';
import SkyChart from '@/components/sky-chart';
import SkyLayerControls,{type SkyLayerSettings} from '@/components/sky-layer-controls';
import type {SkyAtlasProps} from '@/components/sky-atlas-viewer';
import {skyTargets} from '@/lib/sky';
import {viewerZoomKey} from '@/lib/viewer-zoom';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import {deepSkyTimestampFormatter as planningTimestampFormatter} from '@/lib/deep-sky-time';
import {useLanguage} from '@/components/language-provider';
import {skyTargetLabel} from '@/lib/language';

type Props=SkyAtlasProps&SkyLayerSettings;
export default function ExpandedSkyAtlas(props:Props){
 const {language,t}=useLanguage();
 const [open,setOpen]=useState(false),[zoom,setZoom]=useState(1);
 const viewingDetails=useRef(false),detailsOwner=useRef<HTMLButtonElement|null>(null);
 const target=useMemo(()=>props.selected?skyTargets(props.date,props.place).find(item=>item.name===props.selected):undefined,[props.date,props.place,props.selected]);
 const localTime=planningTimestampFormatter(props.date,props.place.timezone||'UTC').format(props.date);
 return <Dialog.Root open={open} onOpenChange={value=>{setOpen(value);if(value)setZoom(1)}}>
  <Dialog.Trigger className="text-button atlas-expand-trigger"><Maximize2 size={16}/>{t('atlas.expand2d')}</Dialog.Trigger>
  <Dialog.Portal><Dialog.Overlay className="expanded-atlas-overlay"/><Dialog.Content className="expanded-atlas-dialog expanded-2d-dialog" onCloseAutoFocus={event=>{
   if(!viewingDetails.current)return;
   viewingDetails.current=false;const owner=detailsOwner.current;detailsOwner.current=null;
   const details=document.getElementById('target-details');if(!details)return;
   event.preventDefault();
   deferFocusAndScroll(()=>details,{owner});
  }}>
   <div className="expanded-atlas-header"><div><Dialog.Title>{t('atlas.skyAbove',{place:props.place.name})}</Dialog.Title><span>{localTime} · {props.place.timezone||'UTC'}</span></div><Dialog.Close className="button" aria-label={t('atlas.close2d')}><X size={20}/></Dialog.Close></div>
   <Dialog.Description className="expanded-atlas-description">{t('atlas.description')}</Dialog.Description>
   <div className="expanded-atlas-tools"><SkyLayerControls {...props}/><div className="expanded-atlas-controls" role="group" aria-label={t('atlas.controls')}><button className="button" disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-.5))} aria-label={t('atlas.zoomOut')}><Minus size={18}/></button><output aria-live="polite" aria-label={t('atlas.zoomValue')}>{Math.round(zoom*100)}%</output><button className="button" disabled={zoom>=3} onClick={()=>setZoom(value=>Math.min(3,value+.5))} aria-label={t('atlas.zoomIn')}><Plus size={18}/></button><button className="button" onClick={()=>setZoom(1)}><RotateCcw size={15}/>{t('atlas.reset')}</button></div></div>
   <div className="expanded-atlas-viewport" tabIndex={0} role="region" aria-label={t('atlas.scrollRegion')} onKeyDown={event=>{if(event.target!==event.currentTarget||event.ctrlKey||event.metaKey||event.altKey)return;const next=viewerZoomKey(zoom,event.key);if(next!==undefined){event.preventDefault();setZoom(next)}}}><div className="expanded-atlas-canvas" style={{'--atlas-zoom':zoom} as CSSProperties}><SkyChart {...props} large/></div></div>
   <div className="expanded-atlas-selection"><p role="status">{target?t('atlas.selected',{name:skyTargetLabel(target.name,language),altitude:target.altitude.toFixed(1),azimuth:target.azimuth.toFixed(1)}):t('atlas.select')}</p>{target&&<button className="button" onClick={event=>{detailsOwner.current=event.currentTarget;viewingDetails.current=true;setOpen(false)}}>{t('atlas.details',{name:skyTargetLabel(target.name,language)})}</button>}</div>
  </Dialog.Content></Dialog.Portal>
 </Dialog.Root>;
}
