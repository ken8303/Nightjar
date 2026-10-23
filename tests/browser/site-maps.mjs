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
 ])for(const place of [
  {name:'星空 & hill? #1 / &daddr=other',latitude:51.508512345,longitude:-.125712345,timezone:'Europe/London'},
  {name:'Southern site',latitude:-33.123456789,longitude:151.987654321,timezone:'Australia/Sydney'},
  {name:'Date-line site',latitude:1.123456789,longitude:-179.987654321},
 ]){
  const touch=name!=='desktop',page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch});
  page.setDefaultTimeout(15000);
  const errors=[],mapRequests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',entry=>{if(['warning','error'].includes(entry.type()))errors.push(entry.text())});
  await page.addInitScript(({origin,place})=>{
   if(location.origin!==origin)return;
   sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-20T19:00:17.125Z',place}));
   localStorage.setItem('nightjar-sky-view-v1','2d');
   localStorage.setItem('nightjar-places',JSON.stringify([place]));
   localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Maps test note'}));
  },{origin:base.origin,place});
  await page.context().route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[Date.parse('2026-10-20T19:00Z')/1000],cloud_cover:[20]}}}));
  await page.context().route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='maps.apple.com'&&route.request().isNavigationRequest())mapRequests.push(url.href);
   return url.origin!==base.origin?route.fulfill({contentType:route.request().resourceType()==='image'?'image/svg+xml':'text/html',body:route.request().resourceType()==='image'?'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>':'<!doctype html><title>Map fixture</title>'}):route.fallback();
  });
  async function activate(control){if(touch)await control.tap();else await control.click()}
  await page.goto(base.href,{waitUntil:'domcontentloaded'});
  assert.match(await page.title(),/Nightjar/);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('[role="tab"],button[aria-label="Open planner navigation"]')).some(el=>(el.getAttribute('aria-label')==='Open planner navigation'||el.textContent.trim()==='My places')&&el.getClientRects().length));
  const tab=page.getByRole('tab',{name:'My places',exact:true});
  if(await tab.isVisible())await activate(tab);
  else{await activate(page.getByRole('button',{name:'Open planner navigation'}));await activate(page.getByRole('dialog').getByRole('button',{name:'My places',exact:true}));}
  const link=page.getByRole('link',{name:`Open ${place.name} in Apple Maps (opens separately)`,exact:true});
  await link.waitFor();assert((await link.boundingBox()).height>=44);
  assert.equal(await link.getAttribute('target'),'_blank');assert((await link.getAttribute('rel')).includes('noopener'));
  const time=page.locator('#observing-time'),query=page.locator('#location-search');
  const exact=()=>page.locator('.time-entry [aria-atomic=true]').textContent();
  const stored=()=>page.evaluate(()=>({site:localStorage.getItem('nightjar-place'),saved:localStorage.getItem('nightjar-places'),notes:localStorage.getItem('nightjar-target-notes-v1')}));
  const original=await stored(),instant=await exact();
  await query.fill('Unfinished town search');await time.fill('');
  assert.equal(mapRequests.length,0,'opening My places does not contact Maps');
  const opened=page.waitForEvent('popup');await activate(link);const popup=await opened;
  await popup.waitForLoadState('domcontentloaded');
  const url=new URL(popup.url());assert.equal(url.origin,'https://maps.apple.com');
  assert.equal(url.searchParams.get('ll'),`${place.latitude},${place.longitude}`);assert.equal(url.searchParams.get('q'),place.name);
  assert.deepEqual([...url.searchParams.keys()],['ll','q']);assert.equal(mapRequests.length,1);
  assert.equal(await popup.evaluate(()=>window.opener),null);
  await popup.close();await page.bringToFront();
  assert.equal(new URL(page.url()).origin,base.origin);assert.equal(await exact(),instant);assert.deepEqual(await stored(),original);
  assert.equal(await query.inputValue(),'Unfinished town search');assert.equal(await time.inputValue(),'');
  assert.equal(await page.locator('.unsaved-view-warning').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);assert.deepEqual(errors,[]);
  if(evidence)await page.locator('.place-actions').screenshot({path:`${evidence}/maps-${name}-${place.latitude}.png`});
  console.log(`${name}/${place.latitude}: precise Maps handoff, encoded label, separate destination and retained edits/data PASS`);
  await page.close();
 }
}finally{await browser.close()}
