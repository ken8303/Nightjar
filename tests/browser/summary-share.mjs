import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile} from 'node:fs/promises';

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
 ])for(const supported of [true,false]){
  const placeName=supported?'London':'星空 / Hill? #1';
  const touch=name!=='desktop',page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch});
  page.setDefaultTimeout(15000);
  const errors=[],logs=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',entry=>{if(['warning','error'].includes(entry.type()))logs.push(entry.text())});
  await page.addInitScript(({origin,supported,placeName})=>{
   if(location.origin!==origin)return;
   const place={name:placeName,latitude:51.5,longitude:0,timezone:'Europe/London'};
   sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-20T19:00:17.125Z',place}));
   localStorage.setItem('nightjar-sky-view-v1','2d');
   localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Share test note'}));
   localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31']));
   window.shareRequests=[];
   Object.defineProperty(navigator,'share',{configurable:true,value:supported?data=>new Promise((resolve,reject)=>window.shareRequests.push({data,resolve,reject})):undefined});
  },{origin:base.origin,supported,placeName});
  await page.context().route('**/api/weather?*',route=>route.fulfill({json:{hourly:{
   time:[19,20,21].map(hour=>Date.parse(`2026-10-20T${hour}:00Z`)/1000),cloud_cover:[30,30,30],cloud_cover_low:[0,10,20],cloud_cover_mid:[20,30,40],cloud_cover_high:[30,40,50],dew_point_2m:[-2.5,0,5],visibility:[12345,100,200],
  }}}));
  await page.context().route('**/*',route=>route.request().resourceType()==='image'&&new URL(route.request().url()).origin!==base.origin
   ?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}):route.fallback());
  await page.clock.setFixedTime(new Date('2026-10-20T18:30:00.000Z'));
  await page.goto(base.href,{waitUntil:'domcontentloaded'});
  assert.match(await page.title(),/Nightjar/);assert.equal(new URL(page.url()).origin,base.origin);
  const panel=page.locator('.outlook'),share=panel.getByRole('button',{name:'Share observing summary',exact:true});
  const download=panel.getByRole('button',{name:'Download observing summary',exact:true});
  await panel.getByRole('button',{name:'Refresh weather',exact:true}).waitFor();
  const time=page.locator('#observing-time'),exact=()=>page.locator('.time-entry [aria-atomic=true]').textContent();
  const stored=()=>page.evaluate(()=>({site:localStorage.getItem('nightjar-place'),notes:localStorage.getItem('nightjar-target-notes-v1'),deep:localStorage.getItem('nightjar-deep-targets-v1')}));
  async function activate(control){if(touch)await control.tap();else await control.click()}
  async function settled(){await page.waitForFunction(()=>!document.querySelector('button[aria-label="Share observing summary"]')?.disabled)}
  const duration=await page.locator('.darkness-remaining strong').textContent(),darknessEnd=await page.locator('.darkness-remaining time').getAttribute('datetime');
  const before=await exact(),saved=await stored();await time.fill('');
  if(supported){
   await share.waitFor();assert((await share.boundingBox()).height>=44);
   await activate(share);assert(!(await share.isEnabled()));
   // A disabled repeat activation must not open a second native share request.
   await share.evaluate(button=>button.click());assert.equal(await page.evaluate(()=>window.shareRequests.length),1);
   const payload=await page.evaluate(()=>window.shareRequests[0].data);
   assert(payload.text.includes(`Full darkness remaining: ${duration} after the selected observing time.`));assert(payload.text.includes(`Full darkness ends UTC: ${darknessEnd}`));
   for(const line of ['Low cloud cover: 0%','Mid cloud cover: 20%','High cloud cover: 30%','Dew point: -2.5 degrees C','Near-surface visibility: 12345 metres'])assert(payload.text.includes(line),line);
   assert.equal(payload.title,'Nightjar observing summary');assert.equal(payload.files,undefined);
   assert(payload.text.includes('Site: London'));assert(payload.text.includes('Observing UTC: 2026-10-20T19:00:17.125Z'));
   assert(payload.text.includes('Weather fetched: 2026-10-20T18:30:00.000Z'));assert(payload.text.includes('Weather source: Open-Meteo'));
   await page.evaluate(()=>window.shareRequests[0].resolve());await settled();
   const notice=page.locator('#planner-notice');await notice.waitFor();
   assert((await notice.textContent()).includes('London · 2026-10-20 19:00:17.125 UTC'));
   const success=await notice.textContent();
   await activate(share);await page.evaluate(()=>window.shareRequests[1].reject(new DOMException('Cancelled','AbortError')));await settled();
   assert.equal(await notice.textContent(),success,'cancelling native sharing leaves the prior notice intact');
   await activate(share);await page.evaluate(()=>window.shareRequests[2].reject(new DOMException('Not allowed','NotAllowedError')));await settled();
   assert((await notice.textContent()).includes('Use Download summary instead'));
  }else assert.equal(await share.count(),0);
  const downloaded=page.waitForEvent('download');await activate(download);const file=await downloaded;
  assert.equal(file.suggestedFilename(),`nightjar-observing-summary-${supported?'london':'星空-hill-1'}-2026-10-20T19-00-17-125Z.txt`);
  const text=await readFile(await file.path(),'utf8');assert(text.includes(`Full darkness remaining: ${duration} after the selected observing time.`));assert(text.includes(`Full darkness ends UTC: ${darknessEnd}`));assert(text.includes(`Site: ${placeName}`));assert(text.includes('Observing UTC: 2026-10-20T19:00:17.125Z'));assert(text.includes('Cloud cover: 30%'));
  for(const line of ['Low cloud cover: 0%','Mid cloud cover: 20%','High cloud cover: 30%','Dew point: -2.5 degrees C','Near-surface visibility: 12345 metres'])assert(text.includes(line),line);
  assert.equal(await exact(),before);assert.equal(await time.inputValue(),'');assert.deepEqual(await stored(),saved);
  assert.equal(await page.locator('.unsaved-view-warning').count(),0);
  if(supported){
   await activate(share);await page.evaluate(()=>window.shareRequests[3].resolve());await settled();
   await activate(share);
   await activate(page.getByRole('button',{name:'Cancel time edit',exact:true}));
   await time.fill('2026-10-20T21:00');
   await page.waitForFunction(()=>document.querySelector('#observing-time')?.value==='2026-10-20T21:00');
   await page.evaluate(()=>window.shareRequests[4].resolve());await settled();
   const notice=await page.locator('#planner-notice').textContent();
   assert(notice.includes('2026-10-20 19:00:17.125 UTC'),'completion identifies the shared snapshot, not a newer planner instant');
   assert((await exact()).includes('2026-10-20 21:00:00.000 UTC'));assert.deepEqual(await stored(),saved);
   assert((await page.evaluate(()=>window.shareRequests[4].data.text)).includes('Observing UTC: 2026-10-20T19:00:17.125Z'));
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(logs,[]);
  if(evidence)await panel.screenshot({path:`${evidence}/summary-share-${name}-${supported?'supported':'download-only'}.png`});
  console.log(`${name}/${supported?'share':'download-only'}: snapshot sharing/cancel/error/retry, download contents and retained edits/data PASS`);
  await page.close();
 }
}finally{await browser.close()}
