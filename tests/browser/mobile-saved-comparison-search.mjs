import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://localhost:5173/');if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local server');
const messier=JSON.parse(await readFile(new URL('../../data/messier.json',import.meta.url),'utf8'));
const saved=[...messier.slice(0,70).map(target=>target.id),'IC2220'];
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);
 const time='2026-10-27T00:00:00.000Z';await page.clock.setFixedTime(new Date(time));await page.addInitScript(({origin,time,saved})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-sky-view-v1','2d');localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(saved))},{origin:base.origin,time,saved});
 await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[Date.parse(time)/1000],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
 await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Open planner navigation'}).tap();await page.getByRole('dialog').getByRole('button',{name:'Sky atlas',exact:true}).tap();const compare=page.locator('.deep-sky-comparison');await compare.locator('summary').tap();const picker=compare.locator('.deep-compare-picker'),search=compare.getByRole('searchbox',{name:'Search saved targets'});await search.waitFor();assert.equal(await picker.getByRole('checkbox').count(),36);
 await compare.getByRole('button',{name:'Show 30 more saved targets'}).tap();assert.equal(await picker.getByRole('checkbox').count(),66);
 await search.fill('Toby Jug Nebula');await compare.getByText('1 of 71 saved targets match. Selected targets stay visible.').waitFor();assert.equal(await picker.getByRole('checkbox').count(),7);assert.equal(await picker.getByRole('checkbox',{name:'IC2220',exact:true}).isDisabled(),true);
 await picker.getByRole('checkbox',{name:saved[0],exact:true}).uncheck();await picker.getByRole('checkbox',{name:'IC2220',exact:true}).check();assert.equal(await picker.getByRole('checkbox',{name:'IC2220',exact:true}).isChecked(),true);
 await search.fill('no such target');await compare.getByText('0 of 71 saved targets match. Selected targets stay visible.').waitFor();assert.equal(await picker.getByRole('checkbox').count(),6);assert.equal(await picker.getByRole('checkbox',{name:'IC2220',exact:true}).isChecked(),true);
 await page.locator('#planner-language').selectOption('zh-Hant');await compare.getByRole('searchbox',{name:'搜尋已儲存天體'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: saved comparison search, pagination and selection passed`);
}}finally{await browser.close()}
