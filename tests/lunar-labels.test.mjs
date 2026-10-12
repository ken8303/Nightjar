import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {layoutLunarLabels}=await vite.ssrLoadModule('/lib/lunar-labels.ts');
const point=(id,x,y,width=80,height=24)=>({id,x,y,width,height});
test('overlapping lunar labels retain the selected landmark before other names',()=>{
 const input=[point(0,20,60),point(1,60,60),point(2,30,180)];
 assert.deepEqual(layoutLunarLabels(input,{width:235,height:320},1).map(label=>label.id),[1,2]);
 assert.deepEqual(layoutLunarLabels(input,{width:235,height:320},0).map(label=>label.id),[0,2]);
});
test('compact edge clamping cannot create overlapping or clipped lunar labels',()=>{
 const labels=layoutLunarLabels([point(0,0,0),point(1,100,180,75),point(2,230,180,139)],{width:235,height:320},2);
 assert.deepEqual(labels.map(label=>label.id),[2,0]);
 for(const label of labels){assert(label.left>=4&&label.top>=4);assert(label.left+label.width<=231&&label.top+label.height<=316)}
});
test('label layout is deterministic without mutating the projection candidates',()=>{
 const input=[point(0,5,40),point(1,30,45),point(2,80,250)],snapshot=JSON.stringify(input);
 const first=layoutLunarLabels(input,{width:235,height:320},1);
 assert.deepEqual(layoutLunarLabels([...input].reverse(),{width:235,height:320},1),first);assert.equal(JSON.stringify(input),snapshot);
});
test('unusable viewer dimensions and invalid or oversized labels produce no placements',()=>{
 const input=[point(0,Infinity,40),point(1,30,45,300),point(2,10,10,10,500)];
 assert.deepEqual(layoutLunarLabels(input,{width:235,height:320},1),[]);
 for(const width of [0,8,NaN,Infinity])assert.deepEqual(layoutLunarLabels([point(0,0,0)],{width,height:320},0),[]);
});

test('landmarks projected outside the viewer are not relabelled at its clipped edge',()=>{
 const input=[point(0,-1,160),point(1,236,160),point(2,110,-1),point(3,110,321)];
 assert.deepEqual(layoutLunarLabels(input,{width:235,height:320},0),[]);
});
