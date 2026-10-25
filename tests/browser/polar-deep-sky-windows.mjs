import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),A=require('astronomy-engine');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const place={name:'Polar grazing fixture',latitude:84.56058967678678,longitude:0,timezone:'UTC'},observer=new A.Observer(place.latitude,place.longitude,0);
const transit=A.SearchHourAngle(A.Body.Sun,observer,0,new Date('2026-12-21T00:00Z')).time.date;
const time=new Date(+transit-450000).toISOString();
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const [name,viewport] of [['narrow',{width:320,height:740}],['phone',{width:390,height:844}],['tablet',{width:820,height:1180}],['desktop',{width:1365,height:1000}]]){
  const page=await browser.newPage({viewport,hasTouch:name!=='desktop',isMobile:name!=='desktop'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
  await page.addInitScript(({origin,place,time})=>{
   if(location.origin!==origin)return;
   sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));
   localStorage.setItem('nightjar-sky-view-v1','2d');
   localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M81']));
  },{origin:base.origin,place,time});
  await page.route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[Date.parse(time)/1000],cloud_cover:[20]}}}));
  await page.route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});await page.locator('#observing-time').waitFor();
  const mobile=page.getByRole('button',{name:'Open planner navigation',exact:true});
  if(await mobile.isVisible()){await mobile.click();await page.locator('.mobile-navigation-options').getByRole('button',{name:'Sky atlas',exact:true}).click()}
  else await page.getByRole('tab',{name:'Sky atlas',exact:true}).click();
  await page.getByRole('button',{name:'Select saved M81',exact:true}).click();
  const plot=page.locator('.deep-sky-timeline svg');await plot.waitFor();
  const path=await plot.locator('path').getAttribute('d');
  assert.match(path,/^M40\.00,[\d.]+ M49\.58,/,'the curve must restart after the twilight interval');
  assert.equal(await plot.locator('circle[cx="40"]').count(),1,'the isolated starting sample stays visible');
  for(const x of await plot.locator('rect').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('x')))))assert(x>40,'no shading over the first interval');
  if(name==='narrow')await page.locator('.deep-sky-plot').screenshot({path:'/tmp/nightjar-polar-timeline-narrow.png'});
  await page.locator('.deep-sky-comparison summary').click();
  const buttons=page.locator('.deep-compare-window button');await buttons.first().waitFor();
  const count=await buttons.count();assert(count>0);
  for(let index=0;index<count;index++){
   const pending=page.waitForEvent('download');await buttons.nth(index).click();
   const file=await pending,text=(await readFile(await file.path(),'utf8')).replace(/\r\n /g,'');
   const parse=key=>{const value=text.match(new RegExp(`${key}:(\\d{8}T\\d{6}Z)`))[1];return new Date(value.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z'))};
   const start=parse('DTSTART'),end=parse('DTEND');assert(+end>+start);
   assert(!(+start<+transit&&+end>+transit),'export must not bridge the bright transit');
   assert.equal(A.SearchAltitude(A.Body.Sun,observer,1,start,(+end-+start)/86400000,-18),null);
   assert(text.includes('strictly below -18 degrees throughout this interval'));
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  await page.close();console.log(`${name}: polar timeline, comparison and ${count} calendar downloads passed`);
 }
}finally{await browser.close()}
