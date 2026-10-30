import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),A=require('astronomy-engine');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'},time='2026-10-18T19:00:00.000Z';
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  await page.clock.setFixedTime(new Date(time));await page.addInitScript(({origin,place,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));localStorage.setItem('nightjar-language-v1','zh-Hant');localStorage.setItem('nightjar-sky-view-v1','2d');},{origin:base.origin,place,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:24},(_,i)=>Date.parse(time)/1000+i*3600),cloud_cover:Array(24).fill(20)}}}));await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.lang==='zh-Hant');await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'星空圖',exact:true}).tap();
  const view=page.locator('#visibility-planner'),picker=view.locator('#visibility-object'),language=page.locator('#planner-language');await picker.waitFor();assert.match(await view.innerText(),/觀測時機/);assert.match(await view.innerText(),/太陽高度嚴格低於 −18°/);
  const options=await picker.locator('option').evaluateAll(nodes=>nodes.map(node=>({value:node.value,text:node.textContent})));assert(options.length>1);assert.match(options[1].text,/最高/);await picker.selectOption(options[1].value);
  const before=await page.locator('#observing-time').inputValue(),sampleLabels=await view.locator('.mobile-altitude-grid button').allTextContents();assert(sampleLabels.length>0);assert(sampleLabels.every(text=>text.includes('天文黑夜')));
  await language.selectOption('en');assert.equal(await picker.inputValue(),options[1].value);assert.equal(await page.locator('#observing-time').inputValue(),before);assert.match(await view.innerText(),/WHEN TO LOOK/);await language.selectOption('zh-Hant');assert.equal(await picker.inputValue(),options[1].value);
  await view.locator('.mobile-altitude-grid button').first().tap();const selectedTime=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('nightjar-current-time-v1')||'null'));assert(selectedTime);const observer=new A.Observer(place.latitude,place.longitude,0),instant=new Date(selectedTime),sun=A.Equator(A.Body.Sun,instant,observer,true,true);assert(A.Horizon(instant,observer,sun.ra,sun.dec,'normal').altitude< -18);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated visibility, retained selection and dark-only sample passed`);
 }
}finally{await browser.close()}
