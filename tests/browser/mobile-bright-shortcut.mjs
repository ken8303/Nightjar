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
  await page.addInitScript(origin=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-27T00:00:00.000Z',place}));localStorage.setItem('nightjar-sky-view-v1','2d');},base.origin);
  const start=Date.parse('2026-10-27T00:00Z')/1000;await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.match(await page.title(),/Nightjar/);
  await page.getByRole('button',{name:'Open planner navigation'}).tap();await page.getByRole('dialog').getByRole('button',{name:'Sky atlas',exact:true}).tap();
  const nav=page.getByRole('navigation',{name:'Sky atlas shortcuts'}),link=nav.getByRole('link',{name:'Bright targets',exact:true});await link.waitFor();assert((await link.boundingBox()).height>=44);
  await link.tap();await page.waitForURL(/#target-finder$/);await page.locator('#target-finder').waitFor();
  await page.waitForFunction(()=>{const section=document.querySelector('#target-finder'),bar=document.querySelector('.mobile-navigation-bar');if(!section||!bar)return false;const top=section.getBoundingClientRect().top;return top>=bar.getBoundingClientRect().bottom-1&&top<innerHeight});
  const search=page.locator('#target-search');await search.fill('Vega');await page.locator('#target-results').getByRole('button',{name:/Vega/}).waitFor();
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('#target-finder').waitFor();assert.equal(new URL(page.url()).hash,'#target-finder');assert.equal(await page.locator('[data-night-content="sky"]').isVisible(),true);
  await page.locator('#observing-time').fill('2026-10-27T12:00');await page.getByRole('heading',{name:'Outside full astronomical darkness'}).waitFor();assert.equal(await page.locator('[data-night-content="sky"]').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.close();console.log(`${width}: bright-target shortcut, search, reload and daylight hiding passed`);
 }
}finally{await browser.close()}
