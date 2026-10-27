import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{for(const width of [320,390,820,1365]){
 const page=await browser.newPage({viewport:{width,height:1000},hasTouch:width<1000,isMobile:width<1000}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
 await page.addInitScript(()=>{
  const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
  if(!sessionStorage.getItem('catalogue-fixture')){sessionStorage.setItem('catalogue-fixture','1');sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-27T00:00:00.000Z',place}));localStorage.setItem('nightjar-deep-targets-v1','["M31"]');localStorage.setItem('nightjar-sky-view-v1','2d')}
 });
 await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[Date.parse('2026-10-27T00:00Z')/1000],cloud_cover:[20]}}}));
 await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
 await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.locator('#observing-time').waitFor();
 const menu=page.getByRole('button',{name:'Open planner navigation',exact:true});if(await menu.isVisible()){await menu.click();await page.getByRole('dialog').getByRole('button',{name:'Sky atlas',exact:true}).click()}else await page.getByRole('tab',{name:'Sky atlas',exact:true}).click();
 const finder=page.locator('#deep-sky-finder');await finder.waitFor();assert.match(await finder.textContent(),/Browse 164 deep-sky objects/);
 const selection=finder.getByLabel('Catalogue selection');await selection.selectOption('ic');assert.equal(await page.locator('#deep-sky-results button').count(),2);
 await selection.selectOption('messier');await finder.getByRole('searchbox',{name:'Search deep-sky objects',exact:true}).fill('NGC 07000');assert.equal(await page.locator('#deep-sky-results button').count(),0);
 await selection.selectOption('ngc');
 await finder.getByRole('searchbox',{name:'Search deep-sky objects',exact:true}).fill('Centaurus A');assert.match(await page.locator('#deep-sky-results').textContent(),/NGC5128/);
 const magnitude=finder.getByLabel('Maximum visual magnitude');await magnitude.selectOption('unknown');
 await finder.getByRole('searchbox',{name:'Search deep-sky objects',exact:true}).fill('NGC 07000');
 const result=page.locator('#deep-sky-results button');await result.waitFor();assert.equal(await result.count(),1);await magnitude.selectOption('12');assert.equal(await result.count(),0);await magnitude.selectOption('unknown');await result.click();
 await finder.getByRole('button',{name:'Save NGC7000 to deep-sky list',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('nightjar-deep-targets-v1'))),['M31','NGC7000']);
 assert(await finder.getByRole('button',{name:'Find NGC7000 in camera view',exact:true}).isDisabled());
 const diary=page.locator('#observing-diary');await diary.getByRole('textbox',{name:'Observation notes',exact:true}).fill('Expanded catalogue observation');await diary.getByRole('button',{name:'Save observation',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nightjar-observing-diary-v1')||'[]').some(entry=>entry.target==='NGC7000'));
 const pending=page.waitForEvent('download');await finder.getByRole('button',{name:'Download deep-sky observing plan',exact:true}).click();const file=await pending,html=await readFile(await file.path(),'utf8');assert(html.includes('NGC7000'));assert(html.includes('North America Nebula'));assert(html.includes('M31'));assert(html.includes('20.98809'));
 const comparison=finder.locator('.deep-sky-comparison');await comparison.locator('summary').click();await comparison.getByRole('button',{name:'Plan NGC7000 at best dark-sky sample',exact:true}).waitFor();
 const calendarPending=page.waitForEvent('download');await comparison.getByRole('button',{name:/Download NGC7000 window from/}).first().click();const calendar=await calendarPending,ics=(await readFile(await calendar.path(),'utf8')).replace(/\r\n /g,'');assert(ics.includes('UID:deep-sky-NGC7000'));assert(ics.includes('GEO:51.5;0'));

 await finder.getByRole('button',{name:'Clear deep-sky filters',exact:true}).first().click();assert.equal(await selection.inputValue(),'');assert.equal(await magnitude.inputValue(),'');assert.equal(await page.locator('#deep-sky-results button').count(),164);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(width===320)await page.locator('#deep-sky-object-details').screenshot({path:'/tmp/nightjar-expanded-catalogue-narrow.png'});
 await page.goto(new URL('/offline',base).href,{waitUntil:'load'});assert.match(await page.locator('#deep-targets').textContent(),/NGC7000/);assert.match(await page.locator('#diary').textContent(),/Expanded catalogue observation/);assert.equal(await page.locator('#coverage-warning').isVisible(),false);assert.deepEqual(errors,[]);
 await page.close();console.log(`${width}: new NGC search/save/diary/plan/comparison/offline flow preserves legacy targets PASS`);
}}finally{await browser.close()}
