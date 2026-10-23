import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';

// Optional production-browser regression; the caller supplies Playwright.
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
 ])for(const kind of ['offline-mount','offline-retry']){
  const touch=name!=='desktop',page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch});
  page.setDefaultTimeout(15000);
  const errors=[],logs=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',entry=>{
   if(entry.type()==='error'&&entry.text().includes('status of 503')&&entry.location().url.startsWith(new URL('/api/weather?',base).href))return;
   if(['warning','error'].includes(entry.type()))logs.push(entry.text());
  });
  await page.addInitScript(({origin,online})=>{
   if(location.origin!==origin)return;
   const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
   sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-20T19:00:17.125Z',place}));
   localStorage.setItem('nightjar-sky-view-v1','2d');
   localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Reconnect note'}));
   localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31']));
   window.fixtureOnline=online;
   Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>window.fixtureOnline});
  },{origin:base.origin,online:kind!=='offline-mount'});
  let failed=kind==='offline-mount',requests=0;
  await page.context().route('**/api/weather?*',route=>{
   requests++;
   return failed?route.fulfill({status:503,json:{error:'Fixture offline request failure'}}):route.fulfill({json:{hourly:{
    time:[19,20,21].map(hour=>Date.parse(`2026-10-20T${hour}:00Z`)/1000),cloud_cover:[30,30,30],
   }}});
  });
  await page.context().route('**/*',route=>route.request().resourceType()==='image'&&new URL(route.request().url()).origin!==base.origin
   ?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}):route.fallback());
  await page.clock.setFixedTime(new Date('2026-10-20T18:30:00.000Z'));
  await page.goto(base.href,{waitUntil:'domcontentloaded'});
  assert.match(await page.title(),/Nightjar/);assert.equal(new URL(page.url()).origin,base.origin);
  const panel=page.locator('.outlook'),freshness=panel.locator('.forecast-freshness');
  const retry=freshness.getByRole('button',{name:'Retry forecast',exact:true}),refresh=freshness.getByRole('button',{name:'Refresh weather',exact:true});
  await (kind==='offline-mount'?retry:refresh).waitFor();assert.equal(requests,1);
  const time=page.locator('#observing-time'),exact=()=>page.locator('.time-entry [aria-atomic=true]').textContent();
  const stored=()=>page.evaluate(()=>({site:localStorage.getItem('nightjar-place'),notes:localStorage.getItem('nightjar-target-notes-v1'),deep:localStorage.getItem('nightjar-deep-targets-v1')}));
  const before=await exact(),saved=await stored();await time.fill('');
  failed=true;await page.clock.setFixedTime(new Date('2026-10-20T18:30:01.000Z'));
  await page.evaluate(()=>{window.fixtureOnline=false;dispatchEvent(new Event('offline'))});
  const response=page.waitForResponse(response=>response.url().includes('/api/weather?')&&response.status()===503);
  const control=kind==='offline-mount'?retry:refresh;
  if(touch)await control.tap();else await control.click();
  await response;await retry.waitFor();assert.equal(requests,2);
  assert.equal(await exact(),before);assert.equal(await time.inputValue(),'');assert.deepEqual(await stored(),saved);
  // Simulate a missed online event on return. The request made offline must
  // not satisfy the reconnect; one foreground acquisition is still needed.
  failed=false;await page.clock.setFixedTime(new Date('2026-10-20T18:30:02.001Z'));
  await page.evaluate(()=>{window.fixtureOnline=true;dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))});
  await refresh.waitFor();assert.equal(requests,3);
  assert((await freshness.textContent()).includes('Weather fetched'));
  assert.equal(await freshness.locator('.error').count(),0);
  await page.evaluate(()=>{
   dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
   document.dispatchEvent(new Event('visibilitychange'));
   dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
  });
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(requests,3,'repeated resume signals must not duplicate acquisition');
  assert.equal(await exact(),before);assert.equal(await time.inputValue(),'');assert.deepEqual(await stored(),saved);
  assert.equal(await page.locator('.unsaved-view-warning').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(logs,[]);
  if(evidence)await panel.screenshot({path:`${evidence}/forecast-reconnect-${name}-${kind}.png`});
  console.log(`${name}/${kind}: silent reconnect after offline retry refreshes once and preserves exact time, unfinished input and saved data PASS`);
  await page.close();
 }
}finally{await browser.close()}
