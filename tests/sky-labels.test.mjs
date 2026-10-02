import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {layoutSkyLabels}=await vite.ssrLoadModule('/lib/sky-labels.ts');
const collide=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y-a.height<b.y&&a.y>b.y-b.height;
test('dense chart labels do not overlap each other or move astronomical points',()=>{
 const points=Array.from({length:18},(_,i)=>({name:`Star ${i}`,x:205+i%6*7,y:180+Math.floor(i/6)*10,mag:i/10}));
 const before=structuredClone(points),labels=layoutSkyLabels(points,points.map(p=>p.name));
 assert(labels.size>0);assert(labels.size<points.length,'crowded labels should be omitted rather than overlap');
 const boxes=[...labels.values()];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!collide(boxes[i],boxes[j]));
 assert.deepEqual(points,before);
});
test('labels near each chart edge remain inside the drawing bounds',()=>{
 const points=[{name:'North',x:220,y:30,mag:0},{name:'East',x:54,y:195,mag:0},{name:'West',x:386,y:195,mag:0},{name:'South',x:220,y:360,mag:0}];
 const labels=layoutSkyLabels(points,points.map(p=>p.name));assert.equal(labels.size,4);
 for(const label of labels.values()){assert(label.x>=24);assert(label.x+label.width<=416);assert(label.y-label.height>=32);assert(label.y<=358)}
});
test('selected target remains named in a dense cluster with ordinary labels disabled',()=>{
 const points=Array.from({length:30},(_,i)=>({name:`Object ${i}`,x:220+i%5,y:195+Math.floor(i/5),mag:i/10}));
 const labels=layoutSkyLabels(points,[],'Object 29');assert.deepEqual([...labels.keys()],['Object 29']);
 assert.equal(layoutSkyLabels(points,[]).size,0);
});
