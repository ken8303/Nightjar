'use client';
import {lazy,Suspense,useRef,useState} from 'react';
import {Dialog} from 'radix-ui';
import {Maximize2,X,Image as PhotoIcon} from 'lucide-react';
import {type Place} from '@/lib/sky';
import SkyChart from '@/components/sky-chart';
import ExpandedSkyAtlas from '@/components/expanded-sky-atlas';
import SkyLayerControls,{type SkyLayerSettings} from '@/components/sky-layer-controls';
const SkyDome=lazy(()=>import('@/components/sky-dome'));
export type SkyAtlasProps={place:Place;date:Date;selected:string;onSelect:(name:string)=>void;showLines:boolean;showLabels:boolean;showMilkyWay:boolean};
function focusTargetDetails(){
 const details=document.getElementById('target-details');
 if(!details)return;
 requestAnimationFrame(()=>{details.focus({preventScroll:true});details.scrollIntoView({block:'start',behavior:'instant'})});
}
export default function SkyAtlasViewer(props:SkyAtlasProps & SkyLayerSettings){
 const [mode,setMode]=useState<'3d'|'2d'>('3d');
 const viewingDetails=useRef(false);
 return <div className="sky-atlas-viewer"><div className="sky-view-switch" role="group" aria-label="Sky atlas view"><button className="button" aria-pressed={mode==='3d'} onClick={()=>setMode('3d')}>3D sky</button><button className="button" aria-pressed={mode==='2d'} onClick={()=>setMode('2d')}>2D chart</button>{mode==='3d'&&<Dialog.Root><Dialog.Trigger className="button"><Maximize2 size={16}/>Expand 3D sky</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="expanded-atlas-overlay"/><Dialog.Content className="expanded-atlas-dialog expanded-dome-dialog" onCloseAutoFocus={event=>{if(!viewingDetails.current)return;viewingDetails.current=false;if(!document.getElementById('target-details'))return;event.preventDefault();focusTargetDetails()}}><div className="expanded-atlas-header"><div><Dialog.Title>3D sky above {props.place.name}</Dialog.Title><Dialog.Description>Positions for {props.date.toISOString().slice(0,16).replace('T',' ')} UTC. Orbit the dome to explore your sky.</Dialog.Description></div><Dialog.Close className="button" aria-label="Close expanded 3D sky"><X size={20}/></Dialog.Close></div><SkyLayerControls {...props}/><Suspense fallback={<p role="status">Loading 3D sky…</p>}><SkyDome {...props}/></Suspense><div className="expanded-dome-selection"><p className="muted" role="status">{props.selected?`Selected: ${props.selected}`:'Select an object to highlight it and view its photo in the target details.'}</p>{props.selected&&<Dialog.Close asChild><button className="button" onClick={()=>{viewingDetails.current=true}}>View {props.selected} photo & details</button></Dialog.Close>}</div></Dialog.Content></Dialog.Portal></Dialog.Root>}{mode==='2d'&&<ExpandedSkyAtlas {...props}/>}</div><p className="sky-view-guidance muted">{mode==='3d'?'3D dome · compass labels show north, east, south and west as you rotate. Zenith is directly overhead.':'2D overhead chart · north is up and east is left. The outer circle is your horizon; the centre is overhead.'}</p>{props.selected&&<button className="button sky-photo-shortcut" onClick={focusTargetDetails}><PhotoIcon size={16}/>View {props.selected} photo & details ↑</button>}{mode==='3d'?<Suspense fallback={<div className="sky-dome" role="status">Loading 3D sky…</div>}><SkyDome {...props}/></Suspense>:<SkyChart {...props} large/>}</div>;
}
