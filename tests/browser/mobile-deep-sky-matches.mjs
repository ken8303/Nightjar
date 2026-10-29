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
  const finder=page.getByRole('region',{name:'Deep-sky target finder'}),search=finder.getByRole('searchbox',{name:'Search deep-sky objects'}),shortcut=finder.locator('.deep-sky-matches-shortcut');
  await search.waitFor();assert((await shortcut.boundingBox()).height>=44);
  await search.fill('zzzzzzzz');assert.equal(await shortcut.textContent(),'View 0 matches');await shortcut.tap();
  await page.waitForFunction(()=>document.activeElement?.id==='deep-sky-match-summary');assert.match(await finder.locator('#deep-sky-match-summary').textContent(),/0 matches/);
  await search.fill('M31');assert.match(await shortcut.textContent(),/^View \d+ match(?:es)?$/);
  const catalogue=finder.getByLabel('Catalogue selection');await catalogue.selectOption('ic');assert.equal(await shortcut.textContent(),'View 0 matches');await catalogue.selectOption('');
  assert.match(await shortcut.textContent(),/^View \d+ match(?:es)?$/);if(width===390)await finder.locator('#deep-sky-browsing').screenshot({path:'/tmp/nightjar-mobile-deep-sky-matches.png'});await shortcut.tap();
  await page.waitForFunction(()=>document.activeElement?.id==='deep-sky-match-summary');assert.match(await page.locator('#deep-sky-results').textContent(),/M31/);
  const object=page.locator('#deep-sky-results button').filter({hasText:'M31'}).first();await object.tap();assert.equal(await object.getAttribute('aria-pressed'),'true');
  await finder.getByRole('button',{name:'View M31 details',exact:true}).tap();await page.waitForFunction(()=>document.activeElement?.id==='deep-sky-object-details');assert.equal(await page.locator('#deep-sky-object-details').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.close();console.log(`${width}: match shortcut, empty results, target selection and details passed`);
 }
}finally{await browser.close()}
