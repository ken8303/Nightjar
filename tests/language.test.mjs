import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {parseLanguage,sectionLabel,moonPhaseLabel,deepSkyTypeLabel,pendingEditLabel,skyTargetLabel}=await vite.ssrLoadModule('/lib/language.ts');
const {forecastHourLabel}=await vite.ssrLoadModule('/lib/weather-planning.ts');
test('language preference accepts only supported values and keeps data identifiers stable',()=>{
 assert.equal(parseLanguage('zh-Hant'),'zh-Hant');for(const value of [null,'zh','zh-Hans',{},'en'])assert.equal(parseLanguage(value),'en');
 assert.equal(sectionLabel('sky','zh-Hant','Sky atlas'),'星空圖');assert.equal(sectionLabel('sky','en','Sky atlas'),'Sky atlas');assert.equal(sectionLabel('unknown','zh-Hant','Unknown'),'Unknown');
 assert.equal(moonPhaseLabel('Full Moon','zh-Hant'),'滿月');assert.equal(deepSkyTypeLabel('Galaxy','zh-Hant'),'星系');assert.equal(deepSkyTypeLabel('Unknown','zh-Hant'),'Unknown');
 assert.equal(skyTargetLabel('Vega','zh-Hant'),'織女星 (Vega)');assert.equal(skyTargetLabel('Vega','en'),'Vega');
 assert.equal(pendingEditLabel('observing-time changes, coordinate entry','zh-Hant'),'觀測時間、座標輸入');
});
test('Traditional Chinese forecast labels distinguish repeated local hours',()=>{
 const first=forecastHourLabel(new Date('2026-10-25T00:30:00Z'),'Europe/London','zh-Hant');
 const second=forecastHourLabel(new Date('2026-10-25T01:30:00Z'),'Europe/London','zh-Hant');
 assert.equal(first.time,'01:30');assert.equal(second.time,'01:30');assert.match(first.detail,/GMT\+1/);assert.match(second.detail,/GMT/);assert.notEqual(first.full,second.full);assert.match(first.detail,/10月25日/);
});
test('catalogue constellation names support Traditional Chinese search without changing codes',async()=>{
 const {deepSkyCatalogue,findDeepSky}=await vite.ssrLoadModule('/lib/deep-sky.ts');
 const {constellationLabel,traditionalChineseConstellationName}=await vite.ssrLoadModule('/lib/constellations.ts');
 for(const code of new Set(deepSkyCatalogue.map(target=>target.constellation)))assert(traditionalChineseConstellationName(code),`missing translation for ${code}`);
 assert.equal(constellationLabel('And','zh-Hant'),'仙女座');assert.equal(constellationLabel('And','en'),'Andromeda');assert.equal(constellationLabel('unknown','zh-Hant'),'unknown');
 assert(findDeepSky('仙女座','').some(target=>target.id==='M31'));assert(findDeepSky('Andromeda','').some(target=>target.id==='M31'));
 const serpens=findDeepSky('巨蛇座','');assert(serpens.some(target=>target.constellation==='Se1'));assert(serpens.some(target=>target.constellation==='Se2'));
 assert(findDeepSky('仙女座','',{constellation:'And'}).every(target=>target.constellation==='And'));
});
