import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
  const time='2026-10-27T00:00:00.000Z',start=Date.parse(time)/1000;await page.clock.install({time:new Date(time)});
  await page.addInitScript(({origin,time})=>{if(location.origin!==origin)return;sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'}}));localStorage.setItem('nightjar-language-v1','zh-Hant');},{origin:base.origin,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));
  await page.route('**/api/aurora',route=>route.fulfill({status:503,json:{}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  let release,requested;const waiting=new Promise(resolve=>release=resolve),arrived=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Aurora chunk was not requested')),15000);requested=()=>{clearTimeout(timer);resolve()}});await page.route('**/aurora-panel-*.js',async route=>{requested();await waiting;await route.fallback()});
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'極光',exact:true}).tap();await arrived;
  const loading=page.locator('.tab-loading');await loading.waitFor();assert.match(await loading.innerText(),/正在載入極光/);await page.clock.fastForward(16000);await page.getByRole('heading',{name:'極光載入時間較長'}).waitFor();assert.match(await loading.innerText(),/檢查網路連線/);
  const language=page.locator('#planner-language');await language.selectOption('en');await page.getByRole('heading',{name:'Aurora is taking longer to load'}).waitFor();await language.selectOption('zh-Hant');await page.getByRole('heading',{name:'極光載入時間較長'}).waitFor();
  release();await page.getByRole('alert').filter({hasText:'NOAA 極光預報暫時無法取得'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: localized delayed lazy view and recovery passed`);
 }
}finally{await browser.close()}
