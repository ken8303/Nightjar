'use client';
import {useMemo,useRef,useState,type CSSProperties} from 'react';
import {Dialog} from 'radix-ui';
import {Maximize2,Minus,Plus,RotateCcw,X} from 'lucide-react';
import SkyChart from '@/components/sky-chart';
import {skyTargets,type Place} from '@/lib/sky';

type Props={place:Place;date:Date;selected:string;onSelect:(name:string)=>void;showLines:boolean;showLabels:boolean;showMilkyWay:boolean};
export default function ExpandedSkyAtlas(props:Props){
 const [open,setOpen]=useState(false),[zoom,setZoom]=useState(1);
 const viewingDetails=useRef(false);
 const target=useMemo(()=>props.selected?skyTargets(props.date,props.place).find(item=>item.name===props.selected):undefined,[props.date,props.place,props.selected]);
 const localTime=new Intl.DateTimeFormat('en-GB',{timeZone:props.place.timezone||'UTC',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(props.date);
 return <Dialog.Root open={open} onOpenChange={value=>{setOpen(value);if(value)setZoom(1)}}>
  <Dialog.Trigger className="text-button atlas-expand-trigger"><Maximize2 size={16}/>Expand 2D chart</Dialog.Trigger>
  <Dialog.Portal><Dialog.Overlay className="expanded-atlas-overlay"/><Dialog.Content className="expanded-atlas-dialog" onCloseAutoFocus={event=>{
   if(!viewingDetails.current)return;
   viewingDetails.current=false;
   const details=document.getElementById('target-details');if(!details)return;
   event.preventDefault();
   requestAnimationFrame(()=>{details.focus({preventScroll:true});details.scrollIntoView({block:'start',behavior:'instant'})});
  }}>
   <div className="expanded-atlas-header"><div><Dialog.Title>Sky above {props.place.name}</Dialog.Title><span>{localTime} · {props.place.timezone||'UTC'}</span></div><Dialog.Close className="button" aria-label="Close expanded sky atlas"><X size={20}/></Dialog.Close></div>
   <Dialog.Description className="expanded-atlas-description">Zoom in for labels and nearby objects, then scroll inside the chart to move around. North is up, east is left.</Dialog.Description>
   <div className="expanded-atlas-controls" role="group" aria-label="Sky atlas zoom controls"><button className="button" disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-.5))} aria-label="Zoom out sky atlas"><Minus size={18}/></button><output aria-live="polite" aria-label="Sky atlas zoom">{Math.round(zoom*100)}%</output><button className="button" disabled={zoom>=3} onClick={()=>setZoom(value=>Math.min(3,value+.5))} aria-label="Zoom in sky atlas"><Plus size={18}/></button><button className="button" onClick={()=>setZoom(1)}><RotateCcw size={15}/>Reset zoom</button></div>
   <div className="expanded-atlas-viewport" tabIndex={0} role="region" aria-label="Scrollable sky chart"><div className="expanded-atlas-canvas" style={{'--atlas-zoom':zoom} as CSSProperties}><SkyChart {...props} large/></div></div>
   <div className="expanded-atlas-selection"><p role="status">{target?`${target.name} · ${target.altitude.toFixed(1)}° altitude · ${target.azimuth.toFixed(1)}° azimuth`:'Select an object on the chart. Positions follow your observing site and time.'}</p>{target&&<button className="button" onClick={()=>{viewingDetails.current=true;setOpen(false)}}>View {target.name} details</button>}</div>
  </Dialog.Content></Dialog.Portal>
 </Dialog.Root>;
}
