import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {framingGuide}=await vite.ssrLoadModule('/lib/framing-guide.ts');
const {mosaic}=await vite.ssrLoadModule('/lib/photography.ts');
test('framing centres agree with exported mosaic coordinates after rotation and overlap',()=>{
 const ra=.71231944,dec=41.26905556,rad=Math.PI/180,a=ra*15*rad,d=dec*rad;
 const centre=[Math.cos(d)*Math.cos(a),Math.cos(d)*Math.sin(a),Math.sin(d)],east=[-Math.sin(a),Math.cos(a),0],north=[-Math.sin(d)*Math.cos(a),-Math.sin(d)*Math.sin(a),Math.cos(d)];
 const dot=(x,y)=>x.reduce((sum,v,i)=>sum+v*y[i],0);
 for(const angle of [0,35,90,-45]){
  const guide=framingGuide(3,2,3,2,35,angle),positions=mosaic(ra,dec,3,2,3,2,35,angle);
  assert.equal(guide.panels.length,positions.length);
  positions.forEach((p,i)=>{const ra=p.raHours*15*rad,dec=p.decDegrees*rad,v=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)];assert(Math.abs(dot(v,east)/dot(v,centre)-guide.panels[i].centre.x)<1e-12);assert(Math.abs(dot(v,north)/dot(v,centre)-guide.panels[i].centre.y)<1e-12)});
 }
});
test('object extent comparison responds to camera rotation and available mosaic span',()=>{
 const target={major:360,minor:60,positionAngle:0};
 assert.equal(framingGuide(2,8,1,1,0,0,target).object.fitsFrame,true);
 assert.equal(framingGuide(2,8,1,1,0,90,target).object.fitsMosaic,false);
 assert.equal(framingGuide(2,8,4,1,0,90,target).object.fitsMosaic,true);
 assert.equal(framingGuide(2,8,4,1,50,90,target).object.fitsMosaic,false);
 const unknown=framingGuide(2,8,1,1,0,0,{...target,positionAngle:null}).object;
 assert.equal(unknown.uncertain,true);assert.equal(unknown.rx,unknown.ry);assert.equal(unknown.fitsFrame,false);
 assert.equal(framingGuide(2,8,1,1,0,0,{major:null,minor:null,positionAngle:null}).object,null);
});
test('invalid camera grids cannot create a plausible framing diagram',()=>{
 for(const args of [[0,2,1,1,20,0],[11,2,1,1,20,0],[2,2,1.5,1,20,0],[2,2,7,1,20,0],[2,2,1,1,51,0],[2,2,1,1,20,NaN]])assert.equal(framingGuide(...args),null);
});
