"use client";

import {useEffect,useId,useMemo,useRef,useState} from 'react';
import type {Map as LeafletMap,TileLayer} from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {lightPollutionAtlas,mapTileHealth,createMapTileTracker,mapCentreSite,savedMapMarkers} from '@/lib/light-pollution';
import type {Place} from '@/lib/sky';
import {deferFocusAndScroll} from '@/lib/deferred-focus';
import LightPollutionReading from './light-pollution-sample';
import {lightPollutionCell} from '@/lib/light-pollution-sample';
import {watchForegroundDelay} from '@/lib/foreground-delay';

type Health=ReturnType<typeof mapTileHealth>;
const emptyHealth=():Health=>({loading:0,loaded:0,failed:0});
export default function LightPollutionMap({latitude,longitude,name,onChoose,savedSites,savedUnavailable}:{latitude:number;longitude:number;name:string;onChoose:(place:Place)=>void;savedSites:Place[];savedUnavailable:boolean}){
 const host=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null),overlay=useRef<TileLayer|null>(null);
 const [opacity,setOpacity]=useState(60),[attempt,setAttempt]=useState(0),[error,setError]=useState(''),[ready,setReady]=useState(false),[slow,setSlow]=useState(false);
 const [baseHealth,setBaseHealth]=useState(emptyHealth),[modelHealth,setModelHealth]=useState(emptyHealth);
 const [moving,setMoving]=useState(false),[selectionError,setSelectionError]=useState('');
 const [showSaved,setShowSaved]=useState(false),[markerError,setMarkerError]=useState(false);
 const savedMarkers=useMemo(()=>savedMapMarkers(savedSites,{latitude,longitude}),[savedSites,latitude,longitude]);
 const [centre,setCentre]=useState({latitude,longitude,zoom:7});
 const instructions=useId(),status=useId(),opacityId=useId();
 useEffect(()=>{
  let disposed=false,instance:LeafletMap|null=null,resize:ResizeObserver|undefined;
  const trackers:ReturnType<typeof createMapTileTracker<HTMLElement>>[]=[];
  let stopDelay=watchForegroundDelay(()=>{if(!disposed)setSlow(true)},window,document,{hidden:()=>document.hidden});
  const restartDelay=()=>{stopDelay();setSlow(false);stopDelay=watchForegroundDelay(()=>{if(!disposed)setSlow(true)},window,document,{hidden:()=>document.hidden})};
  import('leaflet').then(L=>{
   if(disposed||!host.current)return;
   const container=host.current;
   instance=L.map(container,{center:[latitude,longitude===180?-180:longitude],zoom:7,minZoom:2,maxZoom:12,zoomControl:false,attributionControl:false,scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,maxBounds:[[-85,-180],[85,180]],maxBoundsViscosity:1});
   map.current=instance;
   const bounds:L.LatLngBoundsExpression=[[-65,-180],[75,180]];
   const base=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:lightPollutionAtlas.maxZoom,errorTileUrl:'/map-tile-unavailable.svg',noWrap:true,keepBuffer:0,updateWhenIdle:true,updateWhenZooming:false});
   const model=L.tileLayer(lightPollutionAtlas.tiles,{minZoom:lightPollutionAtlas.minZoom,maxZoom:lightPollutionAtlas.maxZoom,maxNativeZoom:lightPollutionAtlas.maxNativeZoom,tileSize:lightPollutionAtlas.tileSize,zoomOffset:lightPollutionAtlas.zoomOffset,errorTileUrl:'/map-tile-unavailable.svg',opacity:.6,bounds,noWrap:true,keepBuffer:0,updateWhenIdle:true,updateWhenZooming:false});
   overlay.current=model;
   const track=(layer:TileLayer,report:(health:Health)=>void)=>{
    const tracker=createMapTileTracker<HTMLElement>(report);trackers.push(tracker);
    layer.on('tileloadstart',(event:L.TileEvent)=>{if(disposed)return;restartDelay();tracker.start(event.tile)});
    layer.on('tileload',(event:L.TileEvent)=>tracker.settle(event.tile,'loaded'));
    layer.on('tileerror',(event:L.TileEvent)=>tracker.settle(event.tile,'failed'));
    layer.on('tileunload',(event:L.TileEvent)=>tracker.forget(event.tile));
    layer.on('tileabort',(event:L.TileEvent)=>tracker.forget(event.tile));
   };
   track(base,setBaseHealth);track(model,setModelHealth);
   base.addTo(instance);model.addTo(instance);
   // Mask polar areas: missing model coverage must never look like a dark zone.
   for(const edge of [[[-85,-180],[-65,180]],[[75,-180],[85,180]]] as L.LatLngBoundsExpression[])L.rectangle(edge,{stroke:false,fillColor:'#637784',fillOpacity:.9,interactive:false}).addTo(instance);
   L.circleMarker([latitude,longitude===180?-180:longitude],{radius:8,color:'#fff',weight:3,fillColor:'#102532',fillOpacity:1,interactive:false}).addTo(instance);
   const moved=()=>{if(!disposed&&instance){setMoving(false);const point=instance.getCenter();setCentre({latitude:point.lat,longitude:point.lng,zoom:instance.getZoom()})}};
   instance.on('moveend zoomend',moved);
   instance.on('movestart zoomstart',()=>{if(!disposed){setMoving(true);setSelectionError('')}});
   resize=new ResizeObserver(()=>{if(container.clientWidth&&container.clientHeight)instance?.invalidateSize({pan:true,animate:false})});resize.observe(container);
   setReady(true);
  }).catch(()=>{if(!disposed){resize?.disconnect();trackers.forEach(tracker=>tracker.dispose());instance?.remove();instance=null;map.current=null;overlay.current=null;setError('The map could not start. Reconnect and try loading it again.')}});
  return()=>{disposed=true;stopDelay();resize?.disconnect();trackers.forEach(tracker=>tracker.dispose());instance?.remove();map.current=null;overlay.current=null};
 },[latitude,longitude,attempt]);
 useEffect(()=>{overlay.current?.setOpacity(opacity/100)},[opacity,ready,attempt]);
 useEffect(()=>{
  if(!ready||!showSaved||!map.current)return;
  let disposed=false,layer:import('leaflet').LayerGroup|null=null;
  import('leaflet').then(L=>{
   if(disposed||!map.current)return;
   layer=L.layerGroup().addTo(map.current);
   for(const marker of savedMarkers.markers){
    const label=document.createElement('div');label.textContent=[...marker.names,...(marker.omittedNames?[`${marker.omittedNames} additional names at this location; see Saved places.`]:[])].join('\n');label.style.whiteSpace='pre-line';
    L.circleMarker([marker.latitude,marker.longitude],{radius:9,color:'#fff',weight:2,fillColor:'#f5ad69',fillOpacity:1}).bindPopup(label).addTo(layer);
   }
  }).catch(()=>{if(!disposed)setMarkerError(true)});
  return()=>{disposed=true;layer?.remove()};
 },[ready,showSaved,savedMarkers,attempt]);
 const retry=(owner:Element)=>{setMoving(false);setSelectionError('');setCentre({latitude,longitude,zoom:7});setError('');setReady(false);setSlow(false);setBaseHealth(emptyHealth());setModelHealth(emptyHealth());setAttempt(value=>value+1);deferFocusAndScroll(()=>host.current,{owner})};
 const cell=lightPollutionCell(centre.latitude,centre.longitude);
 const candidate=mapCentreSite(centre.latitude,centre.longitude);
 const chooseCentre=()=>{const point=map.current?.getCenter(),site=point?mapCentreSite(point.lat,point.lng):null;if(!site){setSelectionError('The map centre is outside valid coordinates. Return to the selected site and try again.');return}setSelectionError('');onChoose(site)};
 const outside=centre.latitude<lightPollutionAtlas.south||centre.latitude>=lightPollutionAtlas.north||Math.abs(centre.longitude)>180;
 const loading=baseHealth.loading+modelHealth.loading>0||!ready;
 const failed=baseHealth.failed+modelHealth.failed>0;
 return <div className="light-pollution-map">
  <p id={instructions} className="footnote">Drag to explore, or focus the map and use arrow keys to pan and + / − to zoom. On touch screens, pinch with two fingers. The outlined dot marks your selected site; the crosshair marks the map centre. Exploring keeps your plan unchanged until you choose Use map centre.</p>
  <div className="light-pollution-map-controls">
   <button type="button" className="button" disabled={!ready||centre.zoom>=12} onClick={()=>map.current?.zoomIn()}>Zoom in</button>
   <button type="button" className="button" disabled={!ready||centre.zoom<=2} onClick={()=>map.current?.zoomOut()}>Zoom out</button>
   <button type="button" className="button" disabled={!ready} onClick={()=>map.current?.setView([latitude,longitude===180?-180:longitude],7)}>Return to selected site</button>
  </div>
  <label className="light-pollution-saved-toggle"><input type="checkbox" checked={showSaved} onChange={event=>{setMarkerError(false);setShowSaved(event.target.checked)}}/> Show saved observing sites</label>
  {showSaved&&!markerError&&<p className="footnote" role="status">Orange dots mark {savedMarkers.markers.length} saved {savedMarkers.markers.length===1?'location':'locations'}; tap a dot for its saved names. The outlined dot is the selected site. {savedMarkers.outside?`${savedMarkers.outside} saved ${savedMarkers.outside===1?'site is':'sites are'} outside the map’s latitude limits. `:''}{savedMarkers.omitted?`${savedMarkers.omitted} additional locations are omitted. `:''}{savedUnavailable?'Saved sites could not be refreshed; markers use the last readable list. ':''}Overlapping nearby dots may need zooming in. Tapping a dot does not change the selected site.</p>}
  {showSaved&&markerError&&<p className="error" role="status">Saved-site markers could not be displayed. Close and reopen the map to retry.</p>}
  <div className="light-pollution-map-frame"><div ref={host} tabIndex={0} role="region" aria-label={`Light-pollution map around ${name}`} aria-describedby={instructions} className="light-pollution-map-canvas"/><span className="light-pollution-crosshair" aria-hidden="true"/></div>
  <p className="light-pollution-attribution">Map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors<span className="sr-only"> (opens in a new tab)</span></a> · Sky brightness © <a href={lightPollutionAtlas.source} target="_blank" rel="noreferrer">David Lorenz<span className="sr-only"> (opens in a new tab)</span></a>, 2025 · <a href="/licenses/leaflet.txt" target="_blank" rel="noreferrer">Leaflet licence<span className="sr-only"> (opens in a new tab)</span></a></p>
  <label className="light-pollution-opacity" htmlFor={opacityId}>Model opacity: {opacity}%<input id={opacityId} type="range" min="0" max="100" step="10" value={opacity} onChange={event=>setOpacity(Number(event.target.value))}/></label>
  <p className="footnote">Map centre {centre.latitude.toFixed(3)}°, {centre.longitude.toFixed(3)}° · zoom {centre.zoom}. {opacity===0?'Model hidden; only the street map is visible.':opacity===100?'Model at full opacity; use the legend for the colour scale.':'Colours are blended with the base map; use the legend for the original scale.'}</p>
  <div className="light-pollution-pick"><button type="button" className="button primary" disabled={!ready||moving||!candidate} onClick={chooseCentre}>Use map centre</button><p className="footnote">Sets the crosshair’s coordinates as your observing site. Your observing time stays unchanged; you can rename or save the site above.</p>{selectionError&&<p role="status" className="error">{selectionError}</p>}</div>
  {cell&&<LightPollutionReading key={`${attempt}:${cell.key}`} cell={cell} disabled={!ready||moving}/> }
  <div id={status} role="status" className="light-pollution-map-status">
   {error?<p className="error">{error}</p>:<>
    {outside&&<p>Map centre is outside model coverage. Shaded polar areas and uncoloured gaps are not darkness estimates.</p>}
    {failed&&<p className="error">{modelHealth.failed>0?'Some sky-brightness tiles are unavailable. Hatched tiles and uncoloured gaps do not mean dark sky. ':''}{baseHealth.failed>0?'Some street-map tiles are unavailable. ':''}Try loading the visible map again.</p>}
    {loading?<p>{slow?'Map tiles are taking longer to load. You can retry or close the map and keep using your saved plan.':'Loading visible map tiles…'}</p>:!failed&&<p>{modelHealth.loaded>0?'Visible model tiles loaded.':'No model tiles in this view.'} This annual model is not a live forecast or a measurement.</p>}
   </>}
  </div>
  {(error||failed||slow&&loading)&&<button className="button" type="button" onClick={event=>retry(event.currentTarget)}>Retry loading map</button>}
 </div>;
}
