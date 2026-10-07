import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {framingGuide}=await vite.ssrLoadModule('/lib/framing-guide.ts');
const {mosaic,mosaicCsv}=await vite.ssrLoadModule('/lib/photography.ts');
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
test('mosaic CSV wraps RA rounded to 24 hours without changing source coordinates',()=>{
 const panels=mosaic(23.999999999,0,1,1,1,1,0,0),before=structuredClone(panels);
 assert(panels[0].raHours<24&&panels[0].raHours>23.99999995);
 assert.equal(mosaicCsv(panels),'panel,row,column,ra_hours,dec_degrees\r\n1,1,1,0.0000000,0.0000000\r\n');
 assert.deepEqual(panels,before);
});
test('mosaic CSV retains ordered grid identities and angular precision across RA zero',()=>{
 const panels=mosaic(23.99,65,2,1,3,2,25,35),csv=mosaicCsv(panels);
 assert(panels.some(p=>p.raHours<1)&&panels.some(p=>p.raHours>23));
 const lines=csv.split('\r\n');assert.equal(lines.pop(),'');assert.equal(lines.shift(),'panel,row,column,ra_hours,dec_degrees');
 assert.equal(lines.length,6);
 lines.forEach((line,i)=>{
  const fields=line.split(','),[panel,row,column,ra,dec]=fields.map(Number),source=panels[i];
  assert.deepEqual([panel,row,column],[source.panel,source.row,source.column]);
  assert(ra>=0&&ra<24);assert(Math.abs(dec)<=90);
  assert.match(fields[3],/^\d+\.\d{7}$/);assert.match(fields[4],/^-?\d+\.\d{7}$/);
  assert(Math.abs(((ra-source.raHours+36)%24)-12)<=5.1e-8);
  assert(Math.abs(dec-source.decDegrees)<=5.1e-8);
 });
});
