import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:[...(process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]),'--enable-unsafe-swiftshader']});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);
  const time='2026-10-27T00:00:00.000Z',start=Date.parse(time)/1000;await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'月球',exact:true}).tap();await page.locator('.lunar-touch-guidance').waitFor();
  const landmarks=page.locator('.lunar-landmarks'),globe=page.locator('.moon-globe'),canvas=globe.locator('canvas');await landmarks.getByRole('button',{name:/靜海/}).tap();assert.equal(await landmarks.getByRole('button',{name:/靜海/}).getAttribute('aria-pressed'),'true');assert.match(await page.locator('.lunar-libration').innerText(),/地心下點/);assert.match(await canvas.getAttribute('aria-label'),/互動式月球模型/);
  await canvas.evaluate(node=>{window.__originalLunarCanvas=node});const language=page.locator('#planner-language');await language.selectOption('en');assert.equal(await landmarks.getByRole('button',{name:/Mare Tranquillitatis/}).getAttribute('aria-pressed'),'true');assert.match(await canvas.getAttribute('aria-label'),/Interactive lunar globe/);await language.selectOption('zh-Hant');assert.equal(await landmarks.getByRole('button',{name:/靜海/}).getAttribute('aria-pressed'),'true');assert.equal(await canvas.evaluate(node=>node===window.__originalLunarCanvas),true);
  const markers=await globe.locator('.lunar-marker:visible').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}}));for(let i=0;i<markers.length;i++)for(let j=i+1;j<markers.length;j++){const a=markers[i],b=markers[j];assert(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'translated landmark controls overlap')}
  assert.equal(await page.locator('#observing-time').inputValue(),'2026-10-27T00:00');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated lunar facts, landmarks and stable globe passed`);
 }
}finally{await browser.close()}
