'use client';
import {useState,type CSSProperties} from 'react';
import {Dialog} from 'radix-ui';
import {Maximize2,Minus,Plus,RotateCcw,X} from 'lucide-react';
import {viewerZoomKey} from '@/lib/viewer-zoom';
import {framingGuide,type TargetExtent} from '@/lib/framing-guide';
export default function FramingGuide({width,height,cols,rows,overlap,rotation,target}:{width:number;height:number;cols:number;rows:number;overlap:number;rotation:number;target?:TargetExtent&{id:string}}){
 const [zoom,setZoom]=useState(1);
 const guide=framingGuide(width,height,cols,rows,overlap,rotation,target);if(!guide)return null;
 const scale=Math.min(430/(guide.extentX*2),260/(guide.extentY*2)),x=(value:number)=>250+value*scale,y=(value:number)=>165-value*scale;
 const diagram=<svg viewBox="0 0 500 330" role="img" aria-label={`${cols} by ${rows} camera grid rotated ${rotation} degrees east of north${guide.object?`, with ${target!.id} catalogue ${guide.object.uncertain?'major-axis bounding circle':'ellipse'}`:''}`}>
 <line x1="250" x2="250" y1="20" y2="310" stroke="#49616a" strokeDasharray="3 6"/><line x1="20" x2="480" y1="165" y2="165" stroke="#49616a" strokeDasharray="3 6"/>
 {guide.panels.map(panel=><polygon key={panel.number} points={panel.corners.map(point=>`${x(point.x)},${y(point.y)}`).join(' ')} fill="#c1df93" fillOpacity=".06" stroke="#c1df93" strokeWidth="1.5"/>)}
 {guide.object&&<ellipse cx="250" cy="165" rx={guide.object.rx*scale} ry={guide.object.ry*scale} transform={`rotate(${guide.object.angle} 250 165)`} fill="#efba82" fillOpacity=".12" stroke="#efba82" strokeWidth="2" strokeDasharray={guide.object.uncertain?'5 4':undefined}/>}
 <circle cx="250" cy="165" r="3" fill="#efba82"/>
 {/* Paint numbers above the target outline. Odd grids have a panel at the
     target centre; lift that number clear of the centre marker. */}
 {guide.panels.map(panel=><text key={panel.number} x={x(panel.centre.x)} y={y(panel.centre.y)-(panel.centre.x===0&&panel.centre.y===0?14:0)} textAnchor="middle" dominantBaseline="middle" fontSize="16" fill="#e9f0f0" stroke="#0b1014" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke">{panel.number}</text>)}
 </svg>;
 const caption=<><p><strong>{cols*rows} {cols*rows===1?'panel':'panels'}</strong> · {overlap}% overlap · {rotation}° rotation</p><p>Single frame: {width.toFixed(2)}° × {height.toFixed(2)}° · Grid span: {guide.spanWidth.toFixed(2)}° × {guide.spanHeight.toFixed(2)}°</p>{guide.object?<><p className="framing-fit" role="status">{target!.id}: {guide.object.fitsFrame?'catalogue outline fits a centred single frame':guide.object.fitsMosaic?'catalogue outline fits the schematic mosaic bounds':'catalogue outline extends beyond this mosaic'}.</p><p className="footnote">Orange: {guide.object.uncertain?'major-axis bounding circle; a minor axis or position angle is unavailable':'catalogue extent and major-axis position angle'}. Green: camera panels. North is up, east is right. Shapes compare angular scale in the mosaic’s tangent plane; they are not a sky image, surface-brightness map or guaranteed object boundary. Panel orientations away from the centre are approximate.</p></>:<p className="footnote">Choose a catalogue object with a listed angular size to compare its extent. Green outlines show the camera grid, north up and east right. Small-field schematic, not a sky image.</p>}</>;
 return <figure className="framing-guide" aria-label="Target and mosaic framing comparison"><div className="section-label"><span>FRAMING GUIDE</span><span>N ↑ · E →</span></div>{diagram}<figcaption>
  <Dialog.Root onOpenChange={open=>{if(open)setZoom(1)}}>
   <Dialog.Trigger className="button photo-expand-trigger"><Maximize2 size={16}/>Enlarge framing guide</Dialog.Trigger>
   <Dialog.Portal><Dialog.Overlay className="expanded-atlas-overlay"/><Dialog.Content className="photo-viewer-dialog framing-viewer-dialog">
    <div className="photo-viewer-header"><div><Dialog.Title>Mosaic framing guide</Dialog.Title><Dialog.Description>Zoom and scroll to inspect the numbered panels. Focus the drawing and use + or − to zoom, or 0 to reset.</Dialog.Description></div><Dialog.Close className="button" aria-label="Close enlarged framing guide"><X size={20}/></Dialog.Close></div>
    <div className="photo-viewer-controls" role="group" aria-label="Framing zoom controls">
     <button className="button" disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-.5))} aria-label="Zoom out framing guide"><Minus size={18}/></button>
     <output aria-live="polite" aria-label="Framing zoom">{Math.round(zoom*100)}%</output>
     <button className="button" disabled={zoom>=3} onClick={()=>setZoom(value=>Math.min(3,value+.5))} aria-label="Zoom in framing guide"><Plus size={18}/></button>
     <button className="button" onClick={()=>setZoom(1)}><RotateCcw size={16}/>Reset framing zoom</button>
    </div>
    <div className="photo-viewer-viewport framing-viewer-viewport" tabIndex={0} role="region" aria-label="Scrollable mosaic framing guide" onKeyDown={event=>{if(event.target!==event.currentTarget||event.ctrlKey||event.metaKey||event.altKey)return;const next=viewerZoomKey(zoom,event.key);if(next!==undefined){event.preventDefault();setZoom(next)}}}><div className="framing-viewer-canvas" style={{'--framing-zoom':zoom} as CSSProperties}>{diagram}</div></div>
    <div className="photo-viewer-caption framing-viewer-caption" role="region" aria-label="Framing guide details" tabIndex={0}>{caption}</div>
   </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
  {caption}
 </figcaption></figure>;
}
