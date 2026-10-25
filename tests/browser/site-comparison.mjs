import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';

// Optional rendered regression; the caller provides Playwright and Chromium.
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'))}
catch{throw Error('Provide Playwright to run this optional browser check. See README.md.');}
const base=new URL(process.argv[2]||'http://localhost:5173');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||!['http:','https:'].includes(base.protocol))throw Error('Use a local Nightjar server for this fixture-based check.');
const evidence=process.env.NIGHTJAR_BROWSER_EVIDENCE_DIR;
if(evidence)await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,
 ...(process.env.NIGHTJAR_CHROMIUM_EXECUTABLE?{executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE}:{}),
 args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[],
});
try{
 for(const [name,viewport] of [
  ['desktop',{width:1365,height:1000}],['phone',{width:390,height:844}],
  ['narrow',{width:320,height:740}],['landscape',{width:640,height:320}],
  ['tablet-portrait',{width:820,height:1180}],['tablet-landscape',{width:1180,height:820}],
 ]){
  for(const [kind,changed] of [
   ['expired','2026-10-20T19:00:00.000Z'],['peer-expiry','2026-10-20T19:00:00.000Z'],
   ['clock','2026-10-20T18:28:59.999Z'],['fresh','2026-10-20T18:59:59.999Z'],
  ]){
   const touch=name!=='desktop',page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch});
   page.setDefaultTimeout(15000);
   const errors=[],logs=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('console',entry=>{if(['warning','error'].includes(entry.type()))logs.push(entry.text())});
   await page.addInitScript(({origin})=>{
    if(location.origin!==origin)return;
    const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
    sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-20T19:00:17.125Z',place}));
    localStorage.setItem('nightjar-sky-view-v1','2d');
    localStorage.setItem('nightjar-places',JSON.stringify([place,{name:'Paris',latitude:48.8566,longitude:2.3522,timezone:'Europe/Paris'}]));
    localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Comparison note'}));
    localStorage.setItem('nightjar-observing-diary-v1',JSON.stringify([{id:'comparison-entry',target:'M31',observedAt:'2026-10-20T19:00:17.125Z',place,outcome:'seen',equipment:'Binoculars',notes:'Original observation'}]));
   },{origin:base.origin});
   let holdParis=kind==='peer-expiry',releaseParis,notifyParis;
   const parisRequested=new Promise(resolve=>notifyParis=resolve);
   // Context routes also cover requests forwarded by the service worker.
   await page.context().route('**/api/weather?*',async route=>{
    const paris=new URL(route.request().url()).searchParams.get('lat')==='48.8566';
    if(paris&&holdParis){const wait=new Promise(resolve=>releaseParis=resolve);notifyParis();await wait;}
    await route.fulfill({json:{hourly:{time:[Date.parse('2026-10-20T19:00Z')/1000],cloud_cover:[paris?0:80]}}});
   });
   await page.context().route('**/*',route=>route.request().resourceType()==='image'&&new URL(route.request().url()).origin!==base.origin
    ?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}):route.fallback());
   await page.context().route('https://www.openstreetmap.org/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Map fixture</title><p>Site comparison fixture.</p>'}));
   await page.clock.setFixedTime(new Date('2026-10-20T18:30:00Z'));
   await page.goto(base.href,{waitUntil:'domcontentloaded'});
   assert.match(await page.title(),/Nightjar/);assert.equal(new URL(page.url()).origin,base.origin);
   async function tap(control){if(touch)await control.tap();else await control.click()}
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('[role="tab"],button[aria-label="Open planner navigation"]')).some(el=>(el.getAttribute('aria-label')==='Open planner navigation'||el.textContent.trim()==='My places')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'),null,{timeout:30000});
   const tab=page.getByRole('tab',{name:'My places',exact:true});
   if(await tab.isVisible())await tap(tab);
   else{await tap(page.getByRole('button',{name:'Open planner navigation'}));await tap(page.getByRole('dialog').getByRole('button',{name:'My places',exact:true}));}
   const comparison=page.locator('.place-comparison'),action=comparison.getByRole('button',{name:'Plan at Paris',exact:true});
   if(holdParis){
    await parisRequested;
    await comparison.locator('[data-comparison-card="51.5,0"] .comparison-score').waitFor();
    await page.clock.setFixedTime(new Date('2026-10-20T18:40:00Z'));
    holdParis=false;releaseParis();
   }
   await action.waitFor();
   const time=page.locator('#observing-time');
   const utc=async()=>(await page.locator('.time-entry [aria-atomic=true]').textContent()).match(/Selected observing time: (.*?) UTC/)[1];
   const before=await utc(),saved=await page.evaluate(()=>({places:localStorage.getItem('nightjar-places'),notes:localStorage.getItem('nightjar-target-notes-v1'),diary:localStorage.getItem('nightjar-observing-diary-v1')}));
   await time.fill('');await action.scrollIntoViewIfNeeded();assert((await action.boundingBox()).height>=44);
   await page.clock.setFixedTime(new Date(changed));await tap(action);
   if(kind!=='fresh'){
    await comparison.locator('#comparison-planning-status').waitFor();
    assert((await comparison.locator('#comparison-planning-status').textContent()).includes('Your site and observing time were kept'));
    assert.equal(await action.count(),0);assert.equal(await comparison.locator('.comparison-card').count(),2);
    assert.equal(await page.locator('.location-button').textContent(),'London');
    assert.equal(await time.inputValue(),'');assert.equal(await utc(),before);
    assert.equal(await page.getByRole('heading',{name:'Your edits have not been saved',exact:true}).count(),0);
    if(evidence)await page.screenshot({path:`${evidence}/comparison-${name}-${kind}.png`});
    await tap(comparison.getByRole('button',{name:'Refresh forecasts',exact:true}));
    await action.waitFor();assert.equal(await comparison.locator('#comparison-planning-status').count(),0);await tap(action);
   }
   await page.getByRole('heading',{name:'Your edits have not been saved',exact:true}).waitFor();
   assert.equal(await page.locator('.location-button').textContent(),'London');assert.equal(await utc(),before);
   await tap(page.getByRole('button',{name:'Keep editing',exact:true}));assert.equal(await time.inputValue(),'');
   await tap(action);
   if(kind==='fresh')await page.clock.setFixedTime(new Date('2026-10-20T19:00:00.001Z'));
   await tap(page.getByRole('button',{name:'Leave without saving',exact:true}));
   if(kind==='fresh'){
    await page.getByRole('status').filter({hasText:'expired while awaiting confirmation'}).waitFor();
    assert.equal(await page.locator('.location-button').textContent(),'London');assert.equal(await utc(),before);assert.equal(await time.inputValue(),'');
    assert.deepEqual(await page.evaluate(()=>({places:localStorage.getItem('nightjar-places'),notes:localStorage.getItem('nightjar-target-notes-v1'),diary:localStorage.getItem('nightjar-observing-diary-v1')})),saved);
    assert.deepEqual(errors,[]);assert.deepEqual(logs,[]);
    console.log(`${name}/${kind}: expired comparison confirmation preserves site, time, draft and saved data PASS`);
    await page.close();continue;
   }
   await page.waitForFunction(()=>document.querySelector('.location-button')?.textContent==='Paris');
   assert.equal(await utc(),before);assert.equal(await time.inputValue(),'2026-10-20T19:00');
   assert.deepEqual(await page.evaluate(()=>({places:localStorage.getItem('nightjar-places'),notes:localStorage.getItem('nightjar-target-notes-v1'),diary:localStorage.getItem('nightjar-observing-diary-v1')})),saved);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);
   assert.deepEqual(errors,[]);assert.deepEqual(logs,[]);
   console.log(`${name}/${kind}: exact-tap comparison eligibility, unchanged context on refusal, refresh/review/cancel/accept and retained saved data PASS`);
   await page.close();
  }
 }
}finally{await browser.close()}
