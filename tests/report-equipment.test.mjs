import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readReportEquipment}=await vite.ssrLoadModule('/lib/report-equipment.ts');
const {printableObservingPlan}=await vite.ssrLoadModule('/lib/observing-plan.ts');
const profile={name:'Scope QA',width:36,height:24,focal:400,pixel:3.76};
const input=equipment=>({date:new Date('2026-10-09T20:00Z'),place:{name:'Site QA',latitude:51.5,longitude:0},targets:[],notes:{},...equipment});
test('report equipment marks unreadable collections instead of silently keeping their valid subset',()=>{
 for(const raw of ['', 'bad', JSON.stringify([profile,{...profile,pixel:0}])]){const source={getItem:()=>raw},report=readReportEquipment(source);assert.deepEqual(report,{equipment:[],equipmentUnavailable:true,equipmentOmitted:0});assert.match(printableObservingPlan(input(report)),/Equipment could not be read/);assert.equal(source.getItem(),raw)}
 assert.deepEqual(readReportEquipment({getItem:()=>null}),{equipment:[],equipmentUnavailable:false,equipmentOmitted:0});assert.equal(readReportEquipment({getItem:()=>{throw Error('Blocked')}}).equipmentUnavailable,true);
});
test('legacy report limits state omitted counts and retain exact source data',()=>{
 const profiles=Array.from({length:101},(_,i)=>({...profile,name:'Scope '+i})),raw=JSON.stringify(profiles),source={getItem:()=>raw},report=readReportEquipment(source);assert.equal(report.equipment.length,100);assert.equal(report.equipmentOmitted,1);assert.equal(report.equipmentUnavailable,false);assert.deepEqual(report.equipment,profiles.slice(0,100));assert.equal(source.getItem(),raw);
 const html=printableObservingPlan(input(report));assert.match(html,/first 100 of 101 saved setups/);assert.match(html,/1 additional setup is not included/);assert(!html.includes('<strong>Scope 100</strong>'));assert(html.includes('<strong>Scope 99</strong>'));
});
test('invalid report coverage cannot create a misleading export',()=>{
 for(const equipmentOmitted of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER])assert.throws(()=>printableObservingPlan(input({equipment:[profile],equipmentOmitted})),/coverage is invalid/);
 assert.throws(()=>printableObservingPlan(input({equipment:[],equipmentUnavailable:true,equipmentOmitted:1})),/coverage is invalid/);assert(!printableObservingPlan(input({equipment:[profile]})).includes('not included in this checklist'));
});
