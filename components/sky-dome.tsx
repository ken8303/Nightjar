'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ArrowLeft,ArrowRight,ArrowUp,ArrowDown,Minus,Plus,RotateCcw,Crosshair} from 'lucide-react';
import {skyTargets,lines,galacticCentrePosition} from '@/lib/sky';
import {horizonVector,nearestProjectedTarget,zoomCameraPosition,createSkyTapSelection,handleSkyDomeKey} from '@/lib/sky-dome';
import SkyChart from '@/components/sky-chart';
import {aboveHorizonFrameSegments} from '@/lib/sky-framing';
import {viewerVerticalFov} from '@/lib/viewer-fov';
import {Button} from '@/components/ui/button';
import type {SkyAtlasProps} from '@/components/sky-atlas-viewer';
import {useLanguage} from '@/components/language-provider';
import {skyTargetLabel} from '@/lib/language';
type Actions={sync:()=>void;rotate:(angle:number)=>void;tilt:(angle:number)=>void;zoom:(factor:number)=>void;reset:()=>void;focus:()=>void;focusFrame:()=>void};
const cameraControls=[{name:'Rotate sky left',icon:ArrowLeft,action:'rotate',delta:-.25},{name:'Rotate sky right',icon:ArrowRight,action:'rotate',delta:.25},{name:'Tilt sky up',icon:ArrowUp,action:'tilt',delta:-.2},{name:'Tilt sky down',icon:ArrowDown,action:'tilt',delta:.2},{name:'Zoom into sky',icon:Plus,action:'zoom',delta:.8},{name:'Zoom out of sky',icon:Minus,action:'zoom',delta:1.25}] as const;
const guides=[{name:'N',alt:0,az:0},{name:'E',alt:0,az:90},{name:'S',alt:0,az:180},{name:'W',alt:0,az:270},{name:'Zenith',alt:90,az:0}];
export default function SkyDome(props:SkyAtlasProps){
 const {language,t}=useLanguage();
 const canvasLabel=useRef(t('dome.canvas'));
 const controlsRef=useRef<HTMLDivElement>(null),recoveryOwner=useRef<Element|null>(null);
 const host=useRef<HTMLDivElement>(null),labels=useRef(new Map<string,HTMLButtonElement>()),guideRefs=useRef(new Map<string,HTMLSpanElement>()),actions=useRef<Actions|null>(null);
 const targets=useMemo(()=>skyTargets(props.date,props.place),[props.date,props.place]);
 const points=useMemo(()=>targets.filter(point=>point.altitude>0),[targets]);
 const selectedTarget=targets.find(point=>point.name===props.selected);
 const core=useMemo(()=>galacticCentrePosition(props.date,props.place),[props.date,props.place]);
 const latest=useRef({props,points,core});
 const [failed,setFailed]=useState(false),[status,setStatus]=useState('Loading 3D sky…');
 const [revision,setRevision]=useState(0),retryHelp=useId(),retryFocus=useRef(false),retryButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{canvasLabel.current=t('dome.canvas');host.current?.querySelector('canvas')?.setAttribute('aria-label',canvasLabel.current)},[t]);
 function retry(){recoveryOwner.current=null;retryFocus.current=true;setFailed(false);setStatus('Loading 3D sky…');setRevision(value=>value+1)}
 useEffect(()=>{if(failed&&retryFocus.current){retryFocus.current=false;const owner=recoveryOwner.current;recoveryOwner.current=null;if((document.activeElement===document.body||document.activeElement===owner)&&!document.hidden&&!retryButton.current?.closest('[aria-hidden="true"]'))retryButton.current?.focus({preventScroll:true})}},[failed,retryHelp]);
 useEffect(()=>{
  let disposed=false;const disposers:(()=>void)[]=[];let dynamicGeometry:T.BufferGeometry[]=[];
  const cleanup=()=>{if(disposed)return;disposed=true;actions.current=null;dynamicGeometry.forEach(item=>item.dispose());dynamicGeometry=[];for(const dispose of disposers.reverse()){try{dispose()}catch{}}};
  const frame=requestAnimationFrame(()=>{if(disposed)return;try{
   const node=host.current;if(!node)return;const el=node;
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(44,1,.1,20);
   const renderer=new T.WebGLRenderer({alpha:true,antialias:true});
   disposers.push(()=>{renderer.dispose();if(!renderer.getContext().isContextLost())renderer.forceContextLoss();renderer.domElement.remove()});
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0x08121a,1);
   const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',canvasLabel.current);el.appendChild(canvas);
   const controls=new OrbitControls(camera,canvas);disposers.push(()=>controls.dispose());controls.enablePan=false;controls.enableDamping=false;controls.minDistance=1.8;controls.maxDistance=5;controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI/2;controls.target.set(0,.3,0);
   const dotGeometry=new T.SphereGeometry(1,12,8),starMaterial=new T.MeshBasicMaterial({color:0xe0f1fb}),planetMaterial=new T.MeshBasicMaterial({color:0xdce6a1}),selectedMaterial=new T.MeshBasicMaterial({color:0xd4ee91}),guideMaterial=new T.LineBasicMaterial({color:0x385566,transparent:true,opacity:.6}),horizonMaterial=new T.LineBasicMaterial({color:0x8eb49a,transparent:true,opacity:.8}),patternMaterial=new T.LineBasicMaterial({color:0x70a8ba,transparent:true,opacity:.65}),coreMaterial=new T.MeshBasicMaterial({color:0xe9b990});
   [dotGeometry,starMaterial,planetMaterial,selectedMaterial,guideMaterial,horizonMaterial,patternMaterial,coreMaterial].forEach(resource=>disposers.push(()=>resource.dispose()));
   function path(vertices:T.Vector3[],material:T.LineBasicMaterial,dynamic=false){const geometry=new T.BufferGeometry().setFromPoints(vertices);if(dynamic)dynamicGeometry.push(geometry);else disposers.push(()=>geometry.dispose());return new T.Line(geometry,material)}
   [0,30,60].forEach(alt=>scene.add(path(Array.from({length:129},(_,i)=>new T.Vector3(...horizonVector(alt,i/128*360))),alt===0?horizonMaterial:guideMaterial)));
   for(let az=0;az<360;az+=45)scene.add(path(Array.from({length:33},(_,i)=>new T.Vector3(...horizonVector(i/32*90,az))),guideMaterial));
   const groundGeometry=new T.CircleGeometry(1,96),groundMaterial=new T.MeshBasicMaterial({color:0x142c30,transparent:true,opacity:.45,side:T.DoubleSide}),ground=new T.Mesh(groundGeometry,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.006;scene.add(ground);disposers.push(()=>groundGeometry.dispose(),()=>groundMaterial.dispose());
   const objects=new T.Group(),patterns=new T.Group(),frames=new T.Group();scene.add(objects,patterns,frames);
   const frameMaterial=new T.LineBasicMaterial({color:0x83d8e7}),framePointMaterial=new T.MeshBasicMaterial({color:0x83d8e7});disposers.push(()=>frameMaterial.dispose(),()=>framePointMaterial.dispose());
   const ringGeometry=new T.TorusGeometry(.035,.003,6,36),ring=new T.Mesh(ringGeometry,selectedMaterial);scene.add(ring);disposers.push(()=>ringGeometry.dispose());
   let coordinates:{name:string;vector:T.Vector3;mag:number;planet:boolean}[]=[],projected:{name:string;x:number;y:number;visible:boolean}[]=[];
   const positionOnScreen=(vector:T.Vector3)=>{const screen=vector.clone().project(camera);return{x:(screen.x*.5+.5)*el.clientWidth,y:(-.5*screen.y+.5)*el.clientHeight,visible:screen.z>-1&&screen.z<1&&Math.abs(screen.x)<.98&&Math.abs(screen.y)<.98}};
   function render(){
    if(disposed)return;
    const {props:p}=latest.current,chosen=coordinates.find(point=>point.name===p.selected);ring.visible=Boolean(chosen);if(chosen){ring.position.copy(chosen.vector);ring.quaternion.copy(camera.quaternion)}
    renderer.render(scene,camera);projected=coordinates.map(point=>({name:point.name,...positionOnScreen(point.vector)}));
    const occupied:{x:number;y:number;width:number;height:number}[]=[];
    [...coordinates].sort((a,b)=>(a.name===p.selected?-1:b.name===p.selected?1:0)||Number(b.planet)-Number(a.planet)||a.mag-b.mag).forEach(point=>{
     const label=labels.current.get(point.name);if(!label)return;const screen=projected.find(item=>item.name===point.name)!;
     if(!screen.visible||(!p.showLabels&&point.name!==p.selected)){label.hidden=true;return}
     // Hiding an already-visible button, even briefly, drops its keyboard focus.
     if(label.hidden){label.style.visibility='hidden';label.hidden=false}
     const width=label.offsetWidth,height=label.offsetHeight,x=Math.max(3,Math.min(el.clientWidth-width-3,screen.x+8)),y=Math.max(3,Math.min(el.clientHeight-height-3,screen.y-height/2));
     if(occupied.some(box=>x<box.x+box.width+5&&x+width+5>box.x&&y<box.y+box.height+3&&y+height+3>box.y)){label.hidden=true;label.style.visibility='';return}
     occupied.push({x,y,width,height});label.style.left=`${x}px`;label.style.top=`${y}px`;label.style.visibility='';
    });
    guides.forEach(guide=>{const label=guideRefs.current.get(guide.name);if(!label)return;const screen=positionOnScreen(new T.Vector3(...horizonVector(guide.alt,guide.az)).multiplyScalar(1.05));label.hidden=!screen.visible;if(screen.visible){label.style.left=`${screen.x}px`;label.style.top=`${screen.y}px`}});
    const coreLabel=guideRefs.current.get('Core direction');if(coreLabel){const current=latest.current,screen=positionOnScreen(new T.Vector3(...horizonVector(current.core.altitude,current.core.azimuth)));coreLabel.hidden=!(current.props.showMilkyWay&&current.core.altitude>0&&screen.visible);if(!coreLabel.hidden){coreLabel.style.left=`${screen.x}px`;coreLabel.style.top=`${screen.y-18}px`}}
    const frameLabel=guideRefs.current.get('Imaging grid'),framing=latest.current.props.imagingFrame;
    if(frameLabel){const screen=framing?positionOnScreen(new T.Vector3(...horizonVector(framing.centre.altitude,framing.centre.azimuth))):null;frameLabel.hidden=!(framing&&framing.centre.altitude>0&&screen?.visible);if(screen&&!frameLabel.hidden){frameLabel.style.left=screen.x+'px';frameLabel.style.top=(screen.y+16)+'px'}}
   }
   function sync(){
    if(disposed)return;
    dynamicGeometry.forEach(item=>item.dispose());dynamicGeometry=[];objects.clear();patterns.clear();frames.clear();
    const {props:p,points:targets,core:c}=latest.current;
    coordinates=targets.map(target=>({name:target.name,vector:new T.Vector3(...horizonVector(target.altitude,target.azimuth)),mag:target.mag,planet:target.planet}));
    coordinates.forEach(point=>{const mesh=new T.Mesh(dotGeometry,point.planet?planetMaterial:starMaterial);mesh.scale.setScalar(point.planet?.016:Math.max(.005,.012-point.mag*.0018));mesh.position.copy(point.vector);objects.add(mesh)});
    if(p.showLines)lines.forEach(pattern=>{for(let i=1;i<pattern.length;i++){const a=coordinates.find(point=>point.name===pattern[i-1]),b=coordinates.find(point=>point.name===pattern[i]);if(a&&b){const arc=Array.from({length:17},(_,j)=>a.vector.clone().lerp(b.vector,j/16).normalize().multiplyScalar(1.001));patterns.add(path(arc,patternMaterial,true))}}});
    if(p.showMilkyWay&&c.altitude>0){const marker=new T.Mesh(dotGeometry,coreMaterial);marker.scale.setScalar(.018);marker.position.set(...horizonVector(c.altitude,c.azimuth));objects.add(marker)}
    if(p.imagingFrame){
     const vertices=p.imagingFrame.panels.flatMap(panel=>aboveHorizonFrameSegments(panel.outline).flatMap(segment=>segment.map(point=>new T.Vector3(...point))));
     if(vertices.length){const geometry=new T.BufferGeometry().setFromPoints(vertices);dynamicGeometry.push(geometry);frames.add(new T.LineSegments(geometry,frameMaterial))}
     if(p.imagingFrame.centre.altitude>0){const marker=new T.Mesh(dotGeometry,framePointMaterial);marker.scale.setScalar(.012);marker.position.set(...horizonVector(p.imagingFrame.centre.altitude,p.imagingFrame.centre.azimuth));frames.add(marker)}
    }
    render();
   }
   const reset=()=>{camera.position.set(1.65,1.8,2.2);controls.target.set(0,.3,0);camera.up.set(0,1,0);controls.update();render()};
   const focusVector=(vector:T.Vector3)=>{controls.target.copy(vector);const direction=new T.Spherical().setFromVector3(vector);direction.radius=2.4;direction.phi=T.MathUtils.clamp(direction.phi,.12,Math.PI/2);camera.position.setFromSpherical(direction).add(controls.target);controls.update();render()};
   actions.current={sync,reset,focus:()=>{const chosen=coordinates.find(point=>point.name===latest.current.props.selected);if(chosen)focusVector(chosen.vector)},focusFrame:()=>{const frame=latest.current.props.imagingFrame;if(frame&&frame.centre.altitude>0)focusVector(new T.Vector3(...horizonVector(frame.centre.altitude,frame.centre.azimuth)))},rotate:angle=>{camera.position.sub(controls.target).applyAxisAngle(new T.Vector3(0,1,0),angle).add(controls.target);controls.update();render()},tilt:angle=>{const spherical=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));spherical.phi=T.MathUtils.clamp(spherical.phi+angle,.12,Math.PI/2);camera.position.setFromSpherical(spherical).add(controls.target);controls.update();render()},zoom:factor=>{camera.position.set(...zoomCameraPosition(camera.position.toArray(),controls.target.toArray(),factor));controls.update();render()}};
   const resize=()=>{if(!el.clientWidth||!el.clientHeight)return;camera.aspect=el.clientWidth/el.clientHeight;camera.fov=viewerVerticalFov(44,camera.aspect);camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);render()};
   const observer=new ResizeObserver(resize);observer.observe(el);disposers.push(()=>observer.disconnect());controls.addEventListener('change',render);disposers.push(()=>controls.removeEventListener('change',render));
   const tap=createSkyTapSelection((x,y)=>{const rect=canvas.getBoundingClientRect(),name=nearestProjectedTarget(projected,x-rect.left,y-rect.top);if(name)latest.current.props.onSelect(name)});
   const pointerDown=(event:PointerEvent)=>tap.down(event),pointerMove=(event:PointerEvent)=>tap.move(event),pointerUp=(event:PointerEvent)=>tap.up(event),cancel=(event:PointerEvent)=>tap.cancel(event);
   const key=(event:KeyboardEvent)=>handleSkyDomeKey(event,actions.current);
   const lost=(event:Event)=>{event.preventDefault();const active=document.activeElement;if(el.contains(active)||controlsRef.current?.contains(active)){recoveryOwner.current=active;retryFocus.current=true}cleanup();setFailed(true);setStatus('3D rendering stopped. Use the 2D chart or retry 3D.')};
   // Handle release before OrbitControls releases pointer capture.
   canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp,true);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);canvas.addEventListener('keydown',key);canvas.addEventListener('webglcontextlost',lost);
   disposers.push(()=>{canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp,true);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);canvas.removeEventListener('keydown',key);canvas.removeEventListener('webglcontextlost',lost)});
   reset();resize();sync();setStatus('');
   if(retryFocus.current){retryFocus.current=false;if(document.activeElement===document.body&&!document.hidden&&!el.closest('[aria-hidden="true"]'))canvas.focus({preventScroll:true})}
  }catch{cleanup();setFailed(true);setStatus('3D is unavailable in this browser. Use the 2D chart or retry 3D.')}});
  disposers.push(()=>cancelAnimationFrame(frame));
  return cleanup;
 },[revision]);
 useEffect(()=>{latest.current={props,points,core};actions.current?.sync()},[props,points,core,language]);
 const statusLabel=status==='Loading 3D sky…'?t('dome.loading'):status==='3D rendering stopped. Use the 2D chart or retry 3D.'?t('dome.stopped'):status==='3D is unavailable in this browser. Use the 2D chart or retry 3D.'?t('dome.unavailable'):status;
 const controlKeys=['dome.left','dome.right','dome.up','dome.down','dome.zoomIn','dome.zoomOut'] as const;
 const guideKeys={N:'bright.directionN',E:'bright.directionE',S:'bright.directionS',W:'bright.directionW',Zenith:'dome.zenith'} as const;
 return <div className="sky-dome-view"><div className="sky-dome" ref={host}>{status&&!failed&&<p className="sky-dome-status" role="status">{statusLabel}</p>}{failed?<SkyChart {...props} large/>:<>{points.map(point=><button key={point.name} hidden ref={element=>{if(element)labels.current.set(point.name,element);else labels.current.delete(point.name)}} className="sky-dome-label" aria-pressed={props.selected===point.name} aria-label={t('dome.select',{name:skyTargetLabel(point.name,language),altitude:point.altitude.toFixed(1)})} onClick={()=>props.onSelect(point.name)}>{skyTargetLabel(point.name,language)}</button>)}{guides.map(guide=><span key={guide.name} hidden ref={element=>{if(element)guideRefs.current.set(guide.name,element);else guideRefs.current.delete(guide.name)}} className="sky-dome-guide">{t(guideKeys[guide.name as keyof typeof guideKeys])}</span>)}<span hidden className="sky-dome-guide sky-dome-imaging" ref={element=>{if(element)guideRefs.current.set('Imaging grid',element);else guideRefs.current.delete('Imaging grid')}}>{t('dome.imagingGrid',{target:props.imagingFrame?.target??''})}</span><span hidden ref={element=>{if(element)guideRefs.current.set('Core direction',element);else guideRefs.current.delete('Core direction')}} className="sky-dome-guide sky-dome-core">{t('dome.core')}</span></>}</div><div ref={controlsRef} className="sky-dome-controls" role="group" aria-label={t(failed?'dome.recovery':'dome.controls')}>{failed?<Button ref={retryButton} type="button" variant="outline" className="min-h-11" aria-describedby={retryHelp} onClick={retry}>{t('dome.retry')}</Button>:<>{cameraControls.map((control,index)=><button key={control.name} className="button" aria-label={t(controlKeys[index])} title={t(controlKeys[index])} disabled={failed||Boolean(status)} onClick={()=>actions.current?.[control.action](control.delta)}><control.icon size={17}/></button>)}<button className="button" disabled={failed||Boolean(status)||!selectedTarget||selectedTarget.altitude<=0} onClick={()=>actions.current?.focus()}><Crosshair size={16}/>{t('dome.centre')}</button>{props.imagingFrame&&<button className="button" disabled={failed||Boolean(status)||props.imagingFrame.centre.altitude<=0} onClick={()=>actions.current?.focusFrame()}><Crosshair size={16}/>{t('dome.centreFrame')}</button>}<button className="button" disabled={failed||Boolean(status)} onClick={()=>actions.current?.reset()}><RotateCcw size={16}/>{t('dome.reset')}</button></>}</div><p className="sky-dome-selection muted" role="status">{failed?statusLabel:selectedTarget?`${t('atlas.selected',{name:skyTargetLabel(selectedTarget.name,language),altitude:selectedTarget.altitude.toFixed(1),azimuth:selectedTarget.azimuth.toFixed(0)})} · ${t(selectedTarget.altitude<=0?'dome.below':'dome.centreHelp')}`:t('dome.selectHelp')}</p><p className="footnote" id={retryHelp}>{t(failed?'dome.retryHelp':'dome.guide')}</p></div>;
}
