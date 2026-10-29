import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const launch=extra=>chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:[...(process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]),...extra]});
async function openMoon(browser,width,delayTexture=false){
 const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);
 await page.clock.setFixedTime(new Date('2026-10-27T00:00Z'));await page.addInitScript(origin=>{if(location.origin!==origin)return;const place={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-27T00:00:00.000Z',place}));},base.origin);
 const start=Date.parse('2026-10-27T00:00Z')/1000;await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[start],cloud_cover:[20]}}}));
 await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
 if(delayTexture)await page.route('**/textures/moon-nasa.jpg*',async route=>{await new Promise(resolve=>setTimeout(resolve,2500));await route.continue()});
 await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.match(await page.title(),/Nightjar/);await page.getByRole('button',{name:'Open planner navigation'}).tap();await page.getByRole('dialog').getByRole('button',{name:'Moon',exact:true}).tap();return {page,errors};
}
const active=await launch(['--enable-unsafe-swiftshader']);
try{
 for(const width of [320,390]){
  const {page,errors}=await openMoon(active,width),globe=page.locator('.moon-globe');
  await page.locator('.lunar-touch-guidance').waitFor();assert.match(await page.locator('.lunar-touch-guidance').textContent(),/Swipe outside/);
  assert.equal(await globe.evaluate(node=>getComputedStyle(node).touchAction),'none');
  for(const button of await page.locator('.globe-controls button').all()){const rect=await button.boundingBox();assert(rect.width>=44&&rect.height>=44,JSON.stringify(rect))}
  const markers=globe.locator('.lunar-marker:visible'),count=await markers.count();assert(count>0,'at least one lunar landmark should be available');
  const rects=await markers.evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}}));
  for(const rect of rects)assert(rect.width>=44&&rect.height>=44,JSON.stringify(rect));
  for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'lunar touch targets should not overlap')}
  const landmark=markers.first(),name=(await landmark.textContent()).trim();await landmark.tap();await page.waitForFunction(name=>[...document.querySelectorAll('.lunar-marker')].some(el=>el.textContent.trim()===name&&el.getAttribute('aria-pressed')==='true'),name);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  if(width===390)await globe.screenshot({path:'/tmp/nightjar-mobile-moon-globe.png'});await page.close();console.log(`${width}: lunar tap targets, landmark selection and non-overlapping labels passed`);
 }
 const {page,errors}=await openMoon(active,390,true),loading=page.locator('.moon-globe-loading');await loading.waitFor();assert.equal(await loading.evaluate(node=>getComputedStyle(node).touchAction),'pan-y');await page.locator('.lunar-touch-guidance').waitFor();assert.deepEqual(errors,[]);await page.close();console.log('loading: page scrolling remains available until the globe is interactive');
}finally{await active.close()}
const fallback=await launch(['--disable-webgl']);
try{
 const {page,errors}=await openMoon(fallback,390),globe=page.locator('.moon-globe-static');await globe.waitFor();
 assert.equal(await globe.evaluate(node=>getComputedStyle(node).touchAction),'pan-y');assert.equal(await page.locator('.lunar-touch-guidance').count(),0);
 await globe.scrollIntoViewIfNeeded();const box=await globe.boundingBox(),before=await page.evaluate(()=>window.scrollY),client=await page.context().newCDPSession(page);
 const x=Math.round(box.x+box.width/2),y=Math.min(750,Math.round(box.y+box.height*.75));
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-150}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(before=>window.scrollY>before+10,before);assert.deepEqual(errors,[]);await page.close();console.log('fallback: touch scrolling remains available without WebGL');
}finally{await fallback.close()}
