import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

// Fixture-based rendered check; Playwright and Chromium are provided by the caller.
const {chromium}=createRequire(import.meta.url)('playwright');
const base=new URL(process.argv[2]||'http://localhost:5173');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||!['http:','https:'].includes(base.protocol))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,...(process.env.NIGHTJAR_CHROMIUM_EXECUTABLE?{executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE}:{}),args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const [name,viewport] of [['phone',{width:320,height:740}],['tablet',{width:820,height:1180}],['desktop',{width:1365,height:900}]]){
  const page=await browser.newPage({viewport,hasTouch:name!=='desktop',isMobile:name!=='desktop'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',entry=>{if(entry.type()==='error')errors.push(entry.text())});
  await page.addInitScript(({origin})=>{
   if(location.origin!==origin)return;
   const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
   sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-20T19:00:17.125Z',place}));
   localStorage.setItem('nightjar-sky-view-v1','2d');
   localStorage.setItem('nightjar-places',JSON.stringify([place,{name:'Pacific site',latitude:0,longitude:180,timezone:'Pacific/Fiji'}]));
  },{origin:base.origin});
  await page.context().route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:48},(_,i)=>Date.parse('2026-10-20T19:00Z')/1000+i*3600),cloud_cover:Array(48).fill(20)}}}));
  await page.context().route('https://www.openstreetmap.org/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Map fixture</title>'}));
  await page.context().route('**/*',route=>route.request().resourceType()==='image'&&new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}):route.fallback());
  await page.clock.setFixedTime(new Date('2026-10-20T18:30:00Z'));
  await page.goto(base.href,{waitUntil:'domcontentloaded'});
  assert.match(await page.title(),/Nightjar/);
  const tab=page.getByRole('tab',{name:'My places',exact:true});
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('[role="tab"],button[aria-label="Open planner navigation"]')).some(el=>(el.getAttribute('aria-label')==='Open planner navigation'||el.textContent.trim()==='My places')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'));
  if(await tab.isVisible())await tab.click();else{await page.getByRole('button',{name:'Open planner navigation'}).click();await page.getByRole('dialog').getByRole('button',{name:'My places',exact:true}).click();}
  const comparison=page.locator('.place-comparison');
  const london=comparison.locator('[data-comparison-card="51.5,0"]'),pacific=comparison.locator('[data-comparison-card="0,-180"]');
  await london.locator('.comparison-score').waitFor();
  await pacific.getByText('Outside full astronomical darkness at this site.',{exact:false}).waitFor();
  assert.equal(await london.getByRole('button',{name:'Plan here at selected time'}).count(),1);
  assert.equal(await london.locator('.comparison-local').filter({hasText:'Europe/London'}).count(),1);
  assert.equal(await pacific.locator('.comparison-score').count(),0);
  assert.equal(await pacific.locator('.comparison-local').filter({hasText:'Pacific/Fiji'}).count(),0);
  assert.equal(await pacific.getByRole('button',{name:'Plan here at selected time'}).count(),0);
  await pacific.getByText('BEST UPCOMING DARK WINDOW').waitFor();
  if(process.env.NIGHTJAR_BROWSER_EVIDENCE_DIR){
   await pacific.scrollIntoViewIfNeeded();
   await page.screenshot({path:`${process.env.NIGHTJAR_BROWSER_EVIDENCE_DIR}/site-darkness-${name}.png`});
  }
  await pacific.getByRole('button',{name:'Choose this site'}).click();
  await page.waitForFunction(()=>document.querySelector('.location-button')?.textContent==='Pacific site');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);
  assert.deepEqual(errors,[]);
  console.log(`${name}: dark/bright comparison, upcoming window and site selection PASS`);
  await page.close();
 }
}finally{await browser.close()}
