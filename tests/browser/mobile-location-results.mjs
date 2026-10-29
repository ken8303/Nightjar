import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-10-27T00:00Z'));
  await page.addInitScript(origin=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-27T00:00:00.000Z',place}));},base.origin);
  const start=Date.parse('2026-10-27T00:00Z')/1000;await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));
  await page.route('**/api/locations?*',route=>route.fulfill({json:{results:[{id:1,name:'Springfield',admin1:'Example region',country:'United States',latitude:42.101,longitude:-72.589,timezone:'America/New_York'},{id:2,name:'Springfield',admin1:'Example region',country:'United States',latitude:39.781,longitude:-89.650,timezone:'America/Chicago'},{id:3,name:'Springfield',latitude:1.234,longitude:2.345}]}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:route.request().resourceType()==='image'?'image/svg+xml':'text/html',body:route.request().resourceType()==='image'?'<svg xmlns="http://www.w3.org/2000/svg"/>':'<!doctype html><title>Map fixture</title>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.match(await page.title(),/Nightjar/);
  await page.getByRole('button',{name:'Open planner navigation'}).tap();await page.getByRole('dialog').getByRole('button',{name:'My places',exact:true}).tap();
  const search=page.locator('#location-search');await search.fill('Springfield');await page.locator('.search-form').getByRole('button',{name:'Search',exact:true}).tap();
  const results=page.locator('.search-results button');await results.nth(2).waitFor();assert.equal(await results.count(),3);
  assert.match(await results.nth(0).textContent(),/42\.101°, -72\.589° · America\/New_York/);assert.match(await results.nth(1).textContent(),/39\.781°, -89\.650° · America\/Chicago/);assert.match(await results.nth(2).textContent(),/1\.234°, 2\.345° · time zone unavailable/);
  for(const button of await results.all())assert((await button.boundingBox()).height>=44);
  if(width===390)await page.locator('.search-results').screenshot({path:'/tmp/nightjar-mobile-location-results.png'});
  const before=await page.evaluate(()=>localStorage.getItem('nightjar-place')),time=page.locator('#observing-time');await time.fill('');await results.nth(1).tap();
  await page.getByRole('heading',{name:'Your edits have not been saved'}).waitFor();assert.equal(await time.inputValue(),'');assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-place')),before);
  await page.getByRole('button',{name:'Keep editing',exact:true}).tap();await page.getByRole('button',{name:'Cancel time edit',exact:true}).tap();await results.nth(1).tap();
  await page.waitForFunction(()=>{const place=JSON.parse(localStorage.getItem('nightjar-place')||'null');return place?.latitude===39.781&&place?.longitude===-89.65&&place?.timezone==='America/Chicago'});
  assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T00:00');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.close();console.log(`${width}: distinguish same-name locations, preserve edits and select exact site passed`);
 }
}finally{await browser.close()}
