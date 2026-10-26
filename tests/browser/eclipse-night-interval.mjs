import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),A=require('astronomy-engine');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const place={name:'Polar eclipse fixture',latitude:86.26504344241616,longitude:136.10833333333335,timezone:'UTC'},time='2028-01-11T00:00:00.000Z';
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const [name,viewport] of [['narrow',{width:320,height:740}],['phone',{width:390,height:844}],['tablet',{width:820,height:1180}],['desktop',{width:1365,height:1000}]]){
  const page=await browser.newPage({viewport,hasTouch:name!=='desktop',isMobile:name!=='desktop'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await page.addInitScript(({origin,place,time})=>{if(location.origin===origin)sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}))},{origin:base.origin,place,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[Date.parse(time)/1000],cloud_cover:[20]}}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.locator('#observing-time').waitFor();
  const mobile=page.getByRole('button',{name:'Open planner navigation',exact:true});
  if(await mobile.isVisible()){await mobile.click();await page.getByRole('dialog').getByRole('button',{name:'Moon',exact:true}).click()}
  else await page.getByRole('tab',{name:'Moon',exact:true}).click();
  const panel=page.locator('.eclipse-panel');await panel.getByRole('button',{name:'Download eclipse calendar',exact:true}).waitFor();
  assert(await panel.getByRole('button',{name:'Download eclipse calendar',exact:true}).isDisabled());
  assert.match(await panel.textContent(),/including the time between contacts/);
  const stamps=await panel.locator('.eclipse-contacts time').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('datetime')));assert.equal(stamps.length,5);
  const observer=new A.Observer(place.latitude,place.longitude,0);
  for(const stamp of stamps){const date=new Date(stamp),q=A.Equator(A.Body.Sun,date,observer,true,true);assert(A.Horizon(date,observer,q.ra,q.dec).altitude<-18)}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  await page.close();console.log(`${name}: dark contacts retained, intervening twilight blocks calendar export PASS`);
 }
}finally{await browser.close()}
