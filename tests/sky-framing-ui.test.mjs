import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},esbuild:{jsx:'automatic'},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {default:SkyAtlasViewer}=await vite.ssrLoadModule('/components/sky-atlas-viewer.tsx');
const {defaultPhotographyDraft,readPhotographyDraft,savePhotographyDraft}=await vite.ssrLoadModule('/lib/photography-draft.ts');
const noop=()=>{};
const props={place:{name:'London',latitude:51.5085,longitude:-.1257,timezone:'Europe/London'},date:new Date('2026-10-18T19:00:00Z'),selected:'Vega',onSelect:noop,showLines:true,showLabels:true,showMilkyWay:false,onLinesChange:noop,onLabelsChange:noop,onCoreChange:noop,view:'2d',onViewChange:noop,viewStorageError:false,cameraOpen:false,onCameraOpenChange:noop,onCameraLauncherChange:noop,onCameraPlan:noop,cameraReturnFocus:{current:null},showImaging:true,onShowImagingChange:noop,imagingDraft:defaultPhotographyDraft(),imagingDraftStatus:'restored',onEditImaging:noop};
const render=patch=>renderToStaticMarkup(createElement(SkyAtlasViewer,{...props,...patch}));
test('the atlas draws only an enabled valid draft and refuses corrupt fallback defaults',()=>{
 const before=structuredClone(props.imagingDraft),valid=render({});
 assert.match(valid,/aria-label="Imaging grid for M31,/);assert.match(valid,/5\.15°/);assert.match(valid,/Vega/);
 assert(!render({showImaging:false}).includes('aria-label="Imaging grid for'));
 const corrupt=render({imagingDraftStatus:'invalid'});assert(!corrupt.includes('aria-label="Imaging grid for'));assert.match(corrupt,/stored imaging draft is invalid/);assert.match(corrupt,/review the defaults/);assert(!corrupt.includes('Your current fields stay available'));
 const unfinished=render({imagingDraft:{...props.imagingDraft,ra:'-'}});assert(!unfinished.includes('aria-label="Imaging grid for'));assert.match(unfinished,/Imaging grid unavailable/);assert.match(unfinished,/Your current fields stay available/);
 assert.deepEqual(props.imagingDraft,before);
});

test('a failed storage read cannot draw fallback equipment as a known draft, while explicit visit edits can',()=>{
 let writes=0;const storage={getItem(){throw Error('Storage unavailable')},setItem(){writes++;throw Error('Storage unavailable')}};
 const initial=readPhotographyDraft(storage),unknown=render({imagingDraft:initial.draft,imagingDraftStatus:initial.status});
 assert(!unknown.includes('aria-label="Imaging grid for'),'unknown saved data must not silently display the defaults');
 assert.match(unknown,/could not be read/);assert.equal(writes,0);
 const edited={...initial.draft,name:'Explicit visit setup',focal:'500'};assert.equal(savePhotographyDraft(edited,storage),false);
 const visit=render({imagingDraft:edited,imagingDraftStatus:'visit'});assert.match(visit,/aria-label="Imaging grid for M31,/);assert.match(visit,/could not be saved/);assert.equal(writes,1);
});

test('a fully below-horizon grid near the nadir cannot draw a false line through the visible 2D sky',()=>{
 const markup=render({imagingDraft:{...props.imagingDraft,ra:'8.3',dec:'-51.5',catalogueId:''}});
 assert.match(markup,/At or below/);
 const paths=[...markup.matchAll(/<path\b[^>]*\bd="([^"]*)"[^>]*stroke="#83d8e7"/g)].map(match=>match[1]);
 assert(paths.every(path=>path===''),'below-horizon panel edges must be removed before the azimuthal projection');
});

test('a horizon-straddling 2D mosaic retains visible edges with every endpoint inside the horizon',()=>{
 const markup=render({imagingDraft:{...props.imagingDraft,ra:'3',dec:'0',catalogueId:''}});
 const paths=[...markup.matchAll(/<path\b[^>]*\bd="([^"]*)"[^>]*stroke="#83d8e7"/g)].map(match=>match[1]).filter(Boolean);
 assert(paths.length>0,'the visible portion must remain drawn');
 let horizonPoints=0;
 for(const path of paths){
  const coordinates=path.match(/-?\d+(?:\.\d+)?/g).map(Number);assert.equal(coordinates.length%2,0);
  for(let index=0;index<coordinates.length;index+=2){const radius=Math.hypot(coordinates[index]-220,coordinates[index+1]-195);assert(radius<=166.001,'no projected segment endpoint may lie below the horizon');if(Math.abs(radius-166)<.001)horizonPoints++;}
 }
 assert(horizonPoints>0,'crossing edges must reach the horizon');
});
