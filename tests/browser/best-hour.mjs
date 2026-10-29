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
 ])for(const surface of viewport.width<=700?['outlook','summary']:['outlook'])for(const [kind,changed] of [
  ['stale','2026-10-20T19:00:00.000Z'],['clock','2026-10-20T18:28:59.999Z'],['fresh','2026-10-20T18:59:59.999Z'],
 ]){
  const touch=name!=='desktop',page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch});
  page.setDefaultTimeout(15000);
  const errors=[],logs=[];
  let response='initial';
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',entry=>{
   // Chromium reports our deliberate failed-refresh HTTP response in console.
   if(response==='failed'&&entry.type()==='error'&&entry.text().includes('status of 503')&&entry.location().url.startsWith(new URL('/api/weather?',base).href))return;
   if(['warning','error'].includes(entry.type()))logs.push(entry.text());
  });
  await page.addInitScript(({origin})=>{
   if(location.origin!==origin)return;
   const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
   sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-20T19:00:17.125Z',place}));
   localStorage.setItem('nightjar-sky-view-v1','2d');
   localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Best-hour note'}));
   localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31']));
  },{origin:base.origin});
  await page.context().route('**/api/weather?*',route=>response==='failed'
   ?route.fulfill({status:503,json:{error:'Fixture weather failure'}})
   :route.fulfill({json:{hourly:{time:[Date.parse('2026-10-20T20:00Z')/1000,Date.parse('2026-10-20T21:00Z')/1000],cloud_cover:response==='initial'?[0,100]:[100,0]}}}));
  await page.context().route('**/*',route=>route.request().resourceType()==='image'&&new URL(route.request().url()).origin!==base.origin
   ?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}):route.fallback());
  await page.clock.setFixedTime(new Date('2026-10-20T18:30:00.000Z'));
  await page.goto(base.href,{waitUntil:'domcontentloaded'});
  assert.match(await page.title(),/Nightjar/);assert.equal(new URL(page.url()).origin,base.origin);
  const outlook=page.locator('.outlook'),panel=surface==='summary'?page.locator('.mobile-night-glance'):outlook,action=panel.getByRole('button',{name:/^Plan best hour:/});
  const time=page.locator('#observing-time'),exact=()=>page.locator('.time-entry [aria-atomic=true]').textContent();
  const stored=()=>page.evaluate(()=>({site:localStorage.getItem('nightjar-place'),notes:localStorage.getItem('nightjar-target-notes-v1'),deep:localStorage.getItem('nightjar-deep-targets-v1')}));
  async function activate(control){if(touch)await control.tap();else await control.click()}
  await action.waitFor();const before=await exact(),saved=await stored();await time.fill('');
  await action.scrollIntoViewIfNeeded();assert((await action.boundingBox()).height>=44);
  await page.clock.setFixedTime(new Date(changed));await activate(action);
  if(kind!=='fresh'){
   const status=panel.locator(surface==='summary'?'#mobile-best-hour-planning-status':'#best-hour-planning-status');await status.waitFor();
   assert((await status.textContent()).includes('Forecast freshness has changed'));
   assert.equal(await action.count(),0);assert.equal(await page.locator('.unsaved-view-warning').count(),0);
   assert.equal(await time.inputValue(),'');assert.equal(await exact(),before);assert.deepEqual(await stored(),saved);
   const recovery=panel.getByRole('button',{name:'Refresh and review best hour',exact:true});
   assert((await recovery.boundingBox()).height>=44);
   if(evidence)await panel.screenshot({path:`${evidence}/best-hour-${name}-${kind}.png`});
   response='failed';await activate(recovery);
   const retry=outlook.getByRole('button',{name:'Retry forecast',exact:true});await retry.waitFor();
   assert((await outlook.locator('.forecast-freshness').textContent()).includes('Refresh failed'));
   assert.equal(await action.count(),0);assert.equal(await time.inputValue(),'');assert.equal(await exact(),before);assert.deepEqual(await stored(),saved);
   response='refreshed';await activate(retry);await action.waitFor();assert.equal(await status.count(),0);
   await activate(action);
  }
  await page.getByRole('heading',{name:'Your edits have not been saved',exact:true}).waitFor();
  await activate(page.getByRole('button',{name:'Keep editing',exact:true}));assert.equal(await time.inputValue(),'');assert.equal(await exact(),before);
  await activate(action);
  if(kind==='fresh')await page.clock.setFixedTime(new Date('2026-10-20T19:00:00.001Z'));
  await activate(page.getByRole('button',{name:'Use selected time',exact:true}));
  if(kind==='fresh'){
   await page.getByRole('status').filter({hasText:'expired while awaiting confirmation'}).waitFor();
   assert.equal(await exact(),before);assert.equal(await time.inputValue(),'');assert.deepEqual(await stored(),saved);
   await activate(page.getByRole('button',{name:'Cancel time edit',exact:true}));
   await time.fill('2026-10-20T19:00');
   await page.waitForFunction(()=>document.querySelector('.time-entry [aria-atomic=true]')?.textContent.includes('2026-10-20 19:00:00.000 UTC'));
   assert.equal(await page.locator('.unsaved-view-warning').count(),0);assert.deepEqual(await stored(),saved);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);assert.deepEqual(logs,[]);
   console.log(`${name}/${surface}/${kind}: expired confirmation preserves edits and permits explicit historical time recovery PASS`);
   await page.close();continue;
  }
  const expected=kind==='fresh'?'2026-10-20T20:00':'2026-10-20T21:00';
  await page.waitForFunction(expected=>document.querySelector('#observing-time')?.value===expected,expected);
  assert((await exact()).includes(`${expected.replace('T',' ')}:00.000 UTC`));assert.deepEqual(await stored(),saved);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(logs,[]);
  console.log(`${name}/${surface}/${kind}: exact-tap best-hour eligibility, failed-refresh retry, edit review and saved-data retention PASS`);
  await page.close();
 }
}finally{await browser.close()}
