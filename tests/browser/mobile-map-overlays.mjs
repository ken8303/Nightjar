import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://localhost:5173/');if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local server');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(20000);
 const stamp='2026-10-27T00:00:00.000Z',time=Date.parse(stamp);await page.clock.install({time:new Date(time)});await page.addInitScript(({origin,stamp})=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:stamp,place}));localStorage.setItem('nightjar-language-v1','zh-Hant')},{origin:base.origin,stamp});
 await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[time/1000],cloud_cover:[20]}}}));
 let cloudCalls=0,auroraCalls=0;
 await page.route('**/api/map-clouds?*',route=>{cloudCalls++;return route.fulfill({json:{time,fetchedAt:time,sites:[{latitude:52,longitude:0,cloud:40}]}})});
 await page.route('**/api/aurora',route=>{auroraCalls++;return route.fulfill({json:{observedAt:stamp,forecastAt:stamp,fetchedAt:stamp,cells:Array.from({length:120},(_,i)=>[(i*4)%360,51,40])}})});
 await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"/>'}):route.fallback());
 await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.match(await page.title(),/Nightjar/);await page.getByRole('button',{name:'開啟導覽選單'}).tap();await page.getByRole('dialog').getByRole('button',{name:'觀測地點',exact:true}).tap();const reference=page.locator('.light-pollution-reference');await reference.getByRole('button',{name:'載入光害地圖'}).tap();const map=reference.locator('.light-pollution-map');await map.getByRole('region',{name:'London 附近的光害地圖'}).waitFor();
 await map.getByRole('checkbox',{name:'顯示雲量預報樣本'}).check();await map.getByText('所選預報時間：',{exact:false}).waitFor();assert.equal(cloudCalls,1);
 await map.getByRole('checkbox',{name:'顯示 NOAA 極光預報'}).check();await map.getByText('NOAA 預報時間：',{exact:false}).waitFor();assert.equal(auroraCalls,1);
 assert((await map.locator('.leaflet-overlay-pane path').count())>=2);assert((await map.locator('.aurora-forecast-cell').count())>=1);await page.locator('#planner-language').selectOption('en');assert.match(await map.innerText(),/Show cloud forecast samples/);assert.match(await map.innerText(),/Show NOAA aurora forecast/);
 if(width===390)await map.screenshot({path:'/tmp/nightjar-map-overlays.png'});
 await page.clock.fastForward(31*60000);await map.getByText('Cloud samples are stale or the device clock changed. Refresh them.').waitFor();
 await map.getByRole('button',{name:'Zoom in',exact:true}).tap();await map.getByText('Map area or time changed. Refresh samples.').waitFor();for(let zoom=0;zoom<4;zoom++)await map.getByRole('button',{name:'Zoom in',exact:true}).tap();await map.locator('.aurora-forecast-cell').first().waitFor();assert.equal(cloudCalls,1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`${width}: translated map layers, dark sample fixtures and map movement passed`);
}}finally{await browser.close()}
