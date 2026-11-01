import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://localhost:5173/');if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local server');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 const time='2026-10-27T00:00:00.000Z';await page.clock.setFixedTime(new Date(time));await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-sky-view-v1','2d')},{origin:base.origin,time});
 await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[Date.parse(time)/1000],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
 await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Open planner navigation'}).tap();await page.getByRole('dialog').getByRole('button',{name:'Sky atlas',exact:true}).tap();const list=page.locator('#deep-sky-results');await list.waitFor();assert.equal(await list.locator('button').count(),50);const more=page.getByRole('button',{name:'Show 50 more'});await more.tap();assert.equal(await list.locator('button').count(),100);if(width===390)await page.screenshot({path:'/tmp/nightjar-catalogue-pagination.png'});
 const search=page.locator('#deep-sky-browsing input[type=search]');await search.fill('NGC 7000');assert.equal(await list.locator('button').count(),1);assert.match(await list.innerText(),/NGC7000/);await search.fill('');assert.equal(await list.locator('button').count(),50);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: paginated deep-sky results and filter reset passed`);
}}finally{await browser.close()}
