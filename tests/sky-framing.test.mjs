import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {imagingFrameEquatorial,skyImagingFrame,aboveHorizonFrameSegments}=await vite.ssrLoadModule('/lib/sky-framing.ts');
const {imagingPlan}=await vite.ssrLoadModule('/lib/imaging-plan.ts');
const {defaultPhotographyDraft}=await vite.ssrLoadModule('/lib/photography-draft.ts');
const {mosaic}=await vite.ssrLoadModule('/lib/photography.ts');
const {j2000Position}=await vite.ssrLoadModule('/lib/sky.ts');
const near=(actual,expected,tolerance=1e-10)=>assert(Math.abs(actual-expected)<tolerance,actual+' differs from '+expected);
const base=()=>({...defaultPhotographyDraft(),focal:'1000',width:String(2000*Math.tan(2*Math.PI/180)),height:String(2000*Math.tan(1.5*Math.PI/180)),ra:'0',dec:'0',cols:'1',rows:'1',overlap:'0',rotation:'0',catalogueId:''});
const place={name:'London',latitude:51.5085,longitude:-.1257,timezone:'Europe/London'},date=new Date('2026-10-18T19:00:00Z');
test('a known four by three degree frame projects its exact edge midpoints across RA zero',()=>{
 const draft=base(),before=structuredClone(draft),frame=imagingFrameEquatorial(draft),outline=frame.panels[0].outline;
 near(frame.width,4);near(frame.height,3);assert.equal(outline.length,32);
 near(outline[4].ra,0);near(outline[4].dec,1.5);
 near(outline[12].ra,2/15);near(outline[12].dec,0);
 near(outline[20].ra,0);near(outline[20].dec,-1.5);
 near(outline[28].ra,358/15);near(outline[28].dec,0);
 assert.deepEqual(draft,before);assert.equal(frame.target,'custom J2000 centre');
 const rotated=imagingFrameEquatorial({...draft,rotation:'90'}).panels[0].outline;
 near(rotated[4].ra,1.5/15);near(rotated[4].dec,0);near(rotated[12].ra,0);near(rotated[12].dec,-2);
});
test('atlas panels retain the CSV order and centres for rotated overlapping grids near the pole and seam',()=>{
 for(const rotation of ['0','35','90','-180','360']){
  const draft={...base(),ra:'23.99',dec:'75',cols:'6',rows:'6',overlap:'50',rotation},frame=imagingFrameEquatorial(draft),reference=mosaic(23.99,75,4,3,6,6,50,Number(rotation));
  assert.equal(frame.panels.length,36);
  frame.panels.forEach((panel,i)=>{assert.equal(panel.number,reference[i].panel);near(panel.centre.ra,reference[i].raHours);near(panel.centre.dec,reference[i].decDegrees);for(const p of panel.outline)assert(Number.isFinite(p.ra)&&p.ra>=0&&p.ra<24&&Number.isFinite(p.dec)&&Math.abs(p.dec)<=90)});
 }
});
test('the overlay follows the current site/time and the same precessed apparent positions as the atlas',()=>{
 const draft=defaultPhotographyDraft(),before=structuredClone({draft,place});
 for(const instant of [date,new Date('2100-01-01T00:00Z')])for(const site of [place,{name:'Date line',latitude:-17.75,longitude:180}]){
  const frame=skyImagingFrame(draft,instant,site),eq=imagingFrameEquatorial(draft);
  assert.equal(frame.target,'M31');assert.deepEqual(frame.centre,j2000Position(Number(draft.ra),Number(draft.dec),instant,site));
  frame.panels.forEach((panel,i)=>{assert.deepEqual(panel.centre,j2000Position(eq.panels[i].centre.ra,eq.panels[i].centre.dec,instant,site));assert.deepEqual(panel.outline[0],j2000Position(eq.panels[i].outline[0].ra,eq.panels[i].outline[0].dec,instant,site))});
 }
 assert.notDeepEqual(skyImagingFrame(draft,date,place).centre,skyImagingFrame(draft,new Date(+date+3600000),place).centre);
 assert.deepEqual({draft,place},before);
 assert.equal(imagingFrameEquatorial({...draft,ra:'1'}).target,'custom J2000 centre','a stale catalogue id cannot mislabel a changed centre');
});
test('incomplete, out-of-range and invalid equipment drafts refuse an atlas frame using shared tool validation',()=>{
 for(const patch of [{width:''},{focal:'0'},{pixel:'0.01'},{name:''},{ra:'24'},{dec:'75.01'},{cols:'1.5'},{rows:'7'},{overlap:'51'},{rotation:'361'},{ra:'-'},{focal:'0.1'}]){
  const draft={...base(),...patch},before=structuredClone(draft),plan=imagingPlan(draft);assert(plan.mosaicError);assert.equal(plan.panels.length,0);assert.throws(()=>imagingFrameEquatorial(draft));assert.deepEqual(draft,before);
 }
 const comma=imagingPlan({...base(),width:'36,5'});near(comma.values.width,36.5);assert.equal(comma.mosaicError,'');
 assert.throws(()=>skyImagingFrame(base(),new Date(NaN),place));assert.throws(()=>skyImagingFrame(base(),date,{...place,latitude:91}));
});
test('dome clipping retains crossing edges at the horizon and never draws a below-horizon segment',()=>{
 const points=[{altitude:-10,azimuth:350},{altitude:10,azimuth:10},{altitude:10,azimuth:30},{altitude:-10,azimuth:40}],segments=aboveHorizonFrameSegments(points);
 assert.equal(segments.length,3);near(segments[0][0][1],0);near(segments.at(-1)[1][1],0);
 near(segments[0][0][0],0);near(segments[0][0][2],-1);
 for(const segment of segments)for(const point of segment){assert(point.every(Number.isFinite));assert(point[1]>=0);near(Math.hypot(...point),1)}
 assert.deepEqual(aboveHorizonFrameSegments(points.map(p=>({...p,altitude:-10}))),[]);assert.deepEqual(aboveHorizonFrameSegments([]),[]);
});
test('an actual straddling mosaic keeps only its above-horizon dome edges',()=>{
 const frame=skyImagingFrame({...defaultPhotographyDraft(),ra:'3',dec:'0',catalogueId:''},date,place);
 assert(frame.centre.altitude<0);
 const points=frame.panels.flatMap(panel=>panel.outline);assert(points.some(p=>p.altitude>0)&&points.some(p=>p.altitude<0));
 const segments=frame.panels.flatMap(panel=>aboveHorizonFrameSegments(panel.outline));assert(segments.length>0);
 assert(segments.some(segment=>segment.some(point=>point[1]===0)));
 for(const segment of segments)for(const point of segment)assert(point[1]>=0&&point.every(Number.isFinite));
});
