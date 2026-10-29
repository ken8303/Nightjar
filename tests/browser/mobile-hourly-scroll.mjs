import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(new Date('2026-12-21T00:00Z'));
  await page.addInitScript(origin=>{if(location.origin!==origin)return;const place={name:'Polar winter',latitude:89,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-12-21T00:00:00.000Z',place}));},base.origin);
  const start=Date.parse('2026-12-21T00:00Z')/1000;
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:24},(_,i)=>start+i*3600),cloud_cover:Array.from({length:24},(_,i)=>i*4),temperature_2m:Array(24).fill(-10)}}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.match(await page.title(),/Nightjar/);
  const panel=page.locator('.next-panel'),track=panel.locator('.hourly'),earlier=panel.getByRole('button',{name:'Show earlier forecast hours'}),later=panel.getByRole('button',{name:'Show later forecast hours'});
  await later.waitFor();assert(await earlier.isDisabled());assert((await later.boundingBox()).height>=44);assert.match(await panel.locator('.hourly-scroll-controls').textContent(),/Swipe for more dark hours/);
  await later.tap();await page.waitForFunction(()=>document.querySelector('.next-panel .hourly').scrollLeft>5);assert(await earlier.isEnabled());
  await panel.locator('.hour').nth(4).tap();await page.waitForFunction(()=>document.querySelector('#observing-time')?.value==='2026-12-21T04:00');
  await page.waitForFunction(()=>document.querySelector('.next-panel .hourly')?.scrollLeft===0);assert.equal(await panel.locator('.hour').first().getAttribute('aria-pressed'),'true');assert(await earlier.isDisabled());
  await page.locator('#observing-time').fill('2026-12-21T23:00');await page.waitForFunction(()=>document.querySelectorAll('.next-panel .hour').length===1);
  await page.waitForFunction(()=>!document.querySelector('.hourly-scroll-controls'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.close();console.log(`${width}: touch scrolling, selected-hour visibility and short forecast passed`);
 }
}finally{await browser.close()}
