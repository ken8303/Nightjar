import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';

// Optional fixture-based check; Playwright and Chromium are caller supplied.
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
   localStorage.setItem('nightjar-places',JSON.stringify([place]));
   localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Location recovery note'}));
   window.locationRequests=[];
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
    getCurrentPosition:(success,failure)=>window.locationRequests.push({success,failure}),
   }});
  },{origin:base.origin});
  await page.context().route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[Date.parse('2026-10-20T19:00Z')/1000],cloud_cover:[20]}}}));
  await page.context().route('**/*',route=>new URL(route.request().url()).origin!==base.origin
   ?route.fulfill({contentType:route.request().resourceType()==='image'?'image/svg+xml':'text/html',body:route.request().resourceType()==='image'?'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>':'<!doctype html><title>Map fixture</title>'}):route.fallback());
  async function activate(control){if(touch)await control.tap();else await control.click()}
  await page.goto(base.href,{waitUntil:'domcontentloaded'});
  assert.match(await page.title(),/Nightjar/);assert.equal(new URL(page.url()).origin,base.origin);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('[role="tab"],button[aria-label="Open planner navigation"]')).some(el=>(el.getAttribute('aria-label')==='Open planner navigation'||el.textContent.trim()==='My places')&&el.getClientRects().length),null,{timeout:30000});
  const tab=page.getByRole('tab',{name:'My places',exact:true});
  if(await tab.isVisible())await activate(tab);
  else{await activate(page.getByRole('button',{name:'Open planner navigation'}));await activate(page.getByRole('dialog').getByRole('button',{name:'My places',exact:true}));}
  const locate=page.getByRole('button',{name:'Use my current location',exact:true}),feedback=page.locator('#location-search-feedback');
  const time=page.locator('#observing-time'),query=page.locator('#location-search');
  const exact=()=>page.locator('.time-entry [aria-atomic=true]').textContent();
  const stored=()=>page.evaluate(()=>({site:localStorage.getItem('nightjar-place'),saved:localStorage.getItem('nightjar-places'),notes:localStorage.getItem('nightjar-target-notes-v1')}));
  await locate.waitFor();const original=await stored(),instant=await exact();
  await query.fill('Oxford unfinished');await time.fill('');
  for(const [code,message] of [[1,'permission was denied'],[2,'could not determine its location'],[3,'timed out']]){
   await activate(locate);
   await page.getByRole('button',{name:'Keep selected site',exact:true}).waitFor();
   await page.evaluate(code=>window.locationRequests.at(-1).failure({code,message:'PRIVATE PROVIDER DETAIL'}),code);
   await feedback.waitFor();assert((await feedback.textContent()).includes(message));
   assert(!(await feedback.textContent()).includes('PRIVATE PROVIDER DETAIL'));
   assert((await feedback.textContent()).includes('selected observing site is unchanged'));
   await locate.waitFor();assert(await locate.isEnabled());
   assert.equal(await query.inputValue(),'Oxford unfinished');assert.equal(await time.inputValue(),'');
   assert.equal(await exact(),instant);assert.deepEqual(await stored(),original);
   assert.equal(await page.locator('.unsaved-view-warning').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(evidence&&code===1)await feedback.screenshot({path:`${evidence}/location-denied-${name}.png`});
  }
  await activate(locate);await activate(page.getByRole('button',{name:'Keep selected site',exact:true}));
  await page.evaluate(()=>{const old=window.locationRequests.at(-1);old.failure({code:1});old.success({coords:{latitude:48.85,longitude:2.35}})});
  assert((await feedback.textContent()).includes('cancelled'));assert.deepEqual(await stored(),original);
  await activate(locate);
  await page.evaluate(()=>{const old=window.locationRequests.at(-2);old.failure({code:3});window.locationRequests.at(-1).success({coords:{latitude:48.85,longitude:2.35}})});
  await page.getByRole('heading',{name:'Your edits have not been saved',exact:true}).waitFor();
  assert.equal(await time.inputValue(),'');assert.equal(await exact(),instant);assert.deepEqual(await stored(),original);
  assert((await page.locator('.pending-context-summary').textContent()).includes('48.850°, 2.350°'));
  await activate(page.getByRole('button',{name:'Keep editing',exact:true}));
  assert.equal(await time.inputValue(),'');assert.equal(await query.inputValue(),'Oxford unfinished');assert.deepEqual(await stored(),original);
  await activate(locate);
  await page.evaluate(()=>window.locationRequests.at(-1).success({coords:{latitude:48.85,longitude:2.35}}));
  await page.getByRole('heading',{name:'Your edits have not been saved',exact:true}).waitFor();
  await activate(page.getByRole('button',{name:'Leave without saving',exact:true}));
  await page.waitForFunction(()=>{const place=JSON.parse(localStorage.getItem('nightjar-place')||'null');return place?.latitude===48.85&&place?.longitude===2.35});
  // A coordinate-only fix can change the site's displayed zone; compare the
  // exact UTC instant independently from that local-time annotation.
  assert.equal((await exact()).split(' UTC')[0],instant.split(' UTC')[0]);
  const accepted=await stored();assert.equal(accepted.saved,original.saved);assert.equal(accepted.notes,original.notes);
  assert.equal(await page.locator('.unsaved-view-warning').count(),0);
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(logs,[]);
  console.log(`${name}: distinct location failures, retry/cancel, ignored late callbacks and guarded successful fix preserve unfinished edits and saved data PASS`);
  await page.close();
 }
}finally{await browser.close()}
