import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {parseLanguage,sectionLabel,moonPhaseLabel,deepSkyTypeLabel,pendingEditLabel,skyTargetLabel,skyTargetAlias,skyShortcutLabel}=await vite.ssrLoadModule('/lib/language.ts');
const {forecastHourLabel}=await vite.ssrLoadModule('/lib/weather-planning.ts');
test('language preference accepts only supported values and keeps data identifiers stable',()=>{
 assert.equal(parseLanguage('zh-Hant'),'zh-Hant');for(const value of [null,'zh','zh-Hans',{},'en'])assert.equal(parseLanguage(value),'en');
 assert.equal(sectionLabel('sky','zh-Hant','Sky atlas'),'星空圖');assert.equal(sectionLabel('sky','en','Sky atlas'),'Sky atlas');assert.equal(sectionLabel('unknown','zh-Hant','Unknown'),'Unknown');assert.equal(sectionLabel('toString','zh-Hant','Unknown'),'Unknown');assert.equal(sectionLabel('sky','future-language','Sky atlas'),'Sky atlas');
 assert.equal(moonPhaseLabel('Full Moon','zh-Hant'),'滿月');assert.equal(moonPhaseLabel('Full Moon','future-language'),'Full Moon');assert.equal(deepSkyTypeLabel('Galaxy','zh-Hant'),'星系');assert.equal(deepSkyTypeLabel('Unknown','zh-Hant'),'Unknown');
 assert.equal(skyTargetLabel('Vega','zh-Hant'),'織女星 (Vega)');assert.equal(skyTargetLabel('Vega','en'),'Vega');assert.equal(skyTargetAlias('Vega'),'織女星');assert.equal(skyTargetAlias('toString'),'');assert.equal(skyShortcutLabel('unknown','zh-Hant','Unknown'),'Unknown');
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
 const {englishConstellationMessages}=await vite.ssrLoadModule('/lib/messages/constellations/en.ts');
 const {traditionalChineseConstellationMessages}=await vite.ssrLoadModule('/lib/messages/constellations/zh-hant.ts');
 assert.equal(Object.keys(englishConstellationMessages).length,90);assert.deepEqual(Object.keys(traditionalChineseConstellationMessages).sort(),Object.keys(englishConstellationMessages).sort());
 for(const code of new Set(deepSkyCatalogue.map(target=>target.constellation)))assert(traditionalChineseConstellationName(code),`missing translation for ${code}`);
 assert.equal(constellationLabel('And','zh-Hant'),'仙女座');assert.equal(constellationLabel('And','en'),'Andromeda');assert.equal(constellationLabel('unknown','zh-Hant'),'unknown');assert.equal(constellationLabel('toString','zh-Hant'),'toString');assert.equal(constellationLabel('Se1','zh-Hant'),'巨蛇座（蛇首）');assert.equal(constellationLabel('Se2','zh-Hant'),'巨蛇座（蛇尾）');
 assert(findDeepSky('仙女座','').some(target=>target.id==='M31'));assert(findDeepSky('Andromeda','').some(target=>target.id==='M31'));
 const serpens=findDeepSky('巨蛇座','');assert(serpens.some(target=>target.constellation==='Se1'));assert(serpens.some(target=>target.constellation==='Se2'));
 assert(findDeepSky('仙女座','',{constellation:'And'}).every(target=>target.constellation==='And'));
});
test('message catalogues retain matching placeholders and support safe incremental fallback',async()=>{
 const {englishMessages}=await vite.ssrLoadModule('/lib/messages/en.ts');
 const {traditionalChineseMessages}=await vite.ssrLoadModule('/lib/messages/zh-hant.ts');
 const {createTranslator,messageCatalogues}=await vite.ssrLoadModule('/lib/messages/index.ts');
 const placeholders=text=>[...new Set([...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match=>match[1]))].sort();
 for(const [language,catalogue] of Object.entries(messageCatalogues))for(const [key,value] of Object.entries(catalogue)){
  assert(Object.hasOwn(englishMessages,key),`Unknown message ${language}:${key}`);
  assert.deepEqual(placeholders(value),placeholders(englishMessages[key]),`Placeholder mismatch for ${language}:${key}`);
 }
 const en=createTranslator('en'),zh=createTranslator('zh-Hant');
 assert.equal(en('siteDarkness.class',{class:3}),'Bortle class 3');assert.equal(zh('siteDarkness.class',{class:3}),'Bortle 3 級');
 assert.equal(zh('weather.failed',{error:'{stamp} <b>Cloud</b>'}),'無法取得預報：{stamp} <b>Cloud</b>');
 const zones={original:'Europe/London',current:'UTC',range:''};assert.match(en('time.zoneChanged',zones),/still uses Europe\/London.*now UTC/);assert.match(zh('time.zoneChanged',zones),/仍使用 Europe\/London.*目前為 UTC/);
 const original=traditionalChineseMessages['siteDarkness.unrated'];
 try{delete traditionalChineseMessages['siteDarkness.unrated'];assert.equal(zh('siteDarkness.unrated'),'Not rated')}finally{traditionalChineseMessages['siteDarkness.unrated']=original}
});

test('a new catalogue can translate shared astronomy labels and fall back without changing identifiers',async()=>{
 const {messageCatalogues}=await vite.ssrLoadModule('/lib/messages/index.ts');
 messageCatalogues['test-language']={'phase.full':'Full phase test','deepSkyType.galaxy':'Galaxy test','target.Vega':'Vega test','shortcut.visibility':'Visibility test','pending.time':'Time test','pending.separator':' / ','constellation.And':'Andromeda test'};
 try{
  const {constellationLabel,traditionalChineseConstellationName}=await vite.ssrLoadModule('/lib/constellations.ts');
  assert.equal(constellationLabel('And','test-language'),'Andromeda test');assert.equal(constellationLabel('Ori','test-language'),'Orion');assert.equal(traditionalChineseConstellationName('And'),'仙女座');
  const {findDeepSky}=await vite.ssrLoadModule('/lib/deep-sky.ts');assert(findDeepSky('Andromeda test','',{language:'test-language'}).some(target=>target.id==='M31'));assert(findDeepSky('仙女座','',{language:'test-language'}).some(target=>target.id==='M31'));
  assert.equal(moonPhaseLabel('Full Moon','test-language'),'Full phase test');
  assert.equal(moonPhaseLabel('New Moon','test-language'),'New Moon');
  assert.equal(deepSkyTypeLabel('Galaxy','test-language'),'Galaxy test');
  assert.equal(deepSkyTypeLabel('toString','test-language'),'toString');
  assert.equal(skyTargetLabel('Vega','test-language'),'Vega test (Vega)');
  assert.equal(skyTargetLabel('Saturn','test-language'),'Saturn');
  assert.equal(skyTargetAlias('Vega'),'織女星');
  assert.equal(skyShortcutLabel('visibility-planner','test-language','When to look'),'Visibility test');
  assert.equal(pendingEditLabel('observing-time changes, coordinate entry','test-language'),'Time test / coordinate entry');
 }finally{delete messageCatalogues['test-language']}
});
