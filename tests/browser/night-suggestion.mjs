import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';

// Optional regression for boundaries crossed between render and a touch action.
// Playwright and Chromium are supplied by the caller, not app dependencies.
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
  for(const [kind,initial,changed,message] of [
   ['started','2026-10-20T19:59:59.900Z','2026-10-20T20:00:00.001Z','already started'],
   ['stale','2026-10-20T18:30:00.000Z','2026-10-20T19:00:00.000Z','Forecast freshness has changed'],
   ['clock','2026-10-20T18:30:00.000Z','2026-10-20T18:28:59.999Z','Forecast freshness has changed'],
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
    localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Boundary note'}));
    localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31']));
   },{origin:base.origin});
   let refreshed=false;
   // Context routes also cover requests forwarded by the service worker.
   await page.context().route('**/api/weather?*',route=>route.fulfill({json:{hourly:{
    time:[Date.parse(refreshed?'2026-10-20T21:00Z':'2026-10-20T20:00Z')/1000,Date.parse(refreshed?'2026-10-20T22:00Z':'2026-10-20T21:00Z')/1000],cloud_cover:[0,0],
   }}}));
   await page.context().route('**/*',route=>route.request().resourceType()==='image'&&new URL(route.request().url()).origin!==base.origin
    ?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}):route.fallback());
   // Fixed Date advances no timers: the visible suggestion really is the old
   // one, rather than a fresh render produced by the planning-clock interval.
   await page.clock.setFixedTime(new Date(initial));
   // App readiness is the visible suggestion below. Background requests and
   // service-worker traffic need not become idle before testing that action.
   await page.goto(base.href,{waitUntil:'domcontentloaded'});
   assert.match(await page.title(),/Nightjar/);
   assert.equal(new URL(page.url()).origin,base.origin);
   const panel=page.locator('.seven-night-outlook'),action=panel.getByRole('button',{name:'Use suggested window',exact:true});
   const time=page.locator('#observing-time'),exact=()=>page.locator('.time-entry [aria-atomic=true]').textContent();
   await action.waitFor();
   const before=await exact(),saved=await page.evaluate(()=>({notes:localStorage.getItem('nightjar-target-notes-v1'),deep:localStorage.getItem('nightjar-deep-targets-v1'),site:localStorage.getItem('nightjar-place')}));
   await time.fill('');
   await action.scrollIntoViewIfNeeded();
   assert((await action.boundingBox()).height>=44);
   await page.clock.setFixedTime(new Date(changed));
   if(touch)await action.tap();else await action.click();
   await panel.locator('#night-outlook-planning-status').waitFor();
   assert((await panel.locator('#night-outlook-planning-status').textContent()).includes(message));
   assert.equal(await exact(),before);
   assert.equal(await time.inputValue(),'');
   assert.equal(await page.getByRole('heading',{name:'Your edits have not been saved',exact:true}).count(),0);
   assert.equal(await action.count(),0);
   const recovery=panel.getByRole('button',{name:'Refresh and review suggested windows',exact:true});
   assert((await recovery.boundingBox()).height>=44);
   if(evidence)await page.screenshot({path:`${evidence}/night-boundary-${name}-${kind}.png`});
   refreshed=true;
   if(touch)await recovery.tap();else await recovery.click();
   await action.waitFor();
   assert.equal(await panel.locator('#night-outlook-planning-status').count(),0);
   if(touch)await action.tap();else await action.click();
   await page.getByRole('heading',{name:'Your edits have not been saved',exact:true}).waitFor();
   await page.getByRole('button',{name:'Keep editing',exact:true}).click();
   assert.equal(await time.inputValue(),'');
   if(touch)await action.tap();else await action.click();
   await page.getByRole('button',{name:'Use selected time',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#observing-time')?.value==='2026-10-20T21:00');
   assert((await exact()).includes('2026-10-20 21:00:00.000 UTC'));
   assert.equal(await panel.locator('.night-outlook-card.selected').count(),1);
   assert.deepEqual(await page.evaluate(()=>({notes:localStorage.getItem('nightjar-target-notes-v1'),deep:localStorage.getItem('nightjar-deep-targets-v1'),site:localStorage.getItem('nightjar-place')})),saved);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);
   assert.deepEqual(errors,[]);assert.deepEqual(logs,[]);
   console.log(`${name}/${kind}: expired tap refused; exact time/draft/data retained; refresh and guarded selection recover PASS`);
   await page.close();
  }
 }
}finally{await browser.close()}
