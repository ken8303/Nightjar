import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[],images=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(new Date('2026-10-27T00:00Z'));
  await page.addInitScript(origin=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-27T00:00:00.000Z',place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-sky-view-v1','2d');},base.origin);
  const start=Date.parse('2026-10-27T00:00Z')/1000;await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));
  await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base.origin)return route.fallback();if(url.hostname==='alasky.cds.unistra.fr'&&url.pathname.includes('hips2fits')&&url.searchParams.get('width')==='200'){images.push(url.href);if(url.searchParams.get('ra')==='81.86745833333333')return route.fulfill({status:503,body:'unavailable'})}return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#6688aa"/></svg>'})});
  await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.match(await page.title(),/Nightjar/);
  await page.getByRole('button',{name:'Open planner navigation'}).tap();await page.getByRole('dialog').getByRole('button',{name:'Sky atlas',exact:true}).tap();
  const finder=page.locator('#deep-sky-finder'),list=finder.locator('#deep-sky-results'),search=finder.getByRole('searchbox',{name:'Search deep-sky objects'});
  const toggle=finder.getByRole('button',{name:'Show object images'});await toggle.waitFor();assert.equal(images.length,0);await toggle.tap();assert.equal(await finder.getByRole('button',{name:'Hide object images'}).getAttribute('aria-pressed'),'true');
  await list.scrollIntoViewIfNeeded();await page.waitForFunction(()=>Array.from(document.querySelectorAll('#deep-sky-results .deep-sky-thumbnail img')).some(image=>image.complete&&image.naturalWidth>0));assert(images.length>0&&images.length<30,`unexpected initial image requests: ${images.length}`);
  assert.equal(await list.locator('button').count(),469);assert((await list.locator('.deep-sky-thumbnail img').count())<30);
  await search.fill('NGC 3077');await list.locator('button').first().scrollIntoViewIfNeeded();await list.locator('.deep-sky-thumbnail img').first().waitFor();await list.locator('button').first().tap();assert.match(await finder.locator('#deep-sky-object-details').innerText(),/NGC3077/);
  await search.fill('IC 0418');await list.locator('button').first().scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#deep-sky-results button .deep-sky-thumbnail')?.textContent==='—');assert.match(await list.locator('button').first().innerText(),/IC418/);
  await page.locator('#planner-language').selectOption('zh-Hant');assert.equal(await finder.getByRole('button',{name:'隱藏天體影像'}).count(),1);await finder.getByRole('button',{name:'隱藏天體影像'}).tap();assert.equal(await list.locator('.deep-sky-thumbnail').count(),0);await finder.getByRole('button',{name:'顯示天體影像'}).tap();
  await page.locator('#observing-time').fill('2026-10-27T12:00');await finder.waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: opt-in, bounded loading, NGC/IC filters, selection and language passed`);
 }
}finally{await browser.close()}
