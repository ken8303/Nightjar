import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

// Optional local production check. The caller supplies Playwright and Chromium.
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://localhost:5173');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||!['http:','https:'].includes(base.protocol))throw Error('Use a local Nightjar server for this fixture-based check.');
const browser=await chromium.launch({headless:true,
 ...(process.env.NIGHTJAR_CHROMIUM_EXECUTABLE?{executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE}:{}),
 args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[],
});
try{
 for(const [name,viewport] of [
  ['desktop',{width:1365,height:1000}],['phone',{width:390,height:844}],
  ['narrow',{width:320,height:740}],['landscape',{width:640,height:320}],
  ['tablet-portrait',{width:820,height:1180}],['tablet-landscape',{width:1180,height:820}],
 ]){
  const touch=name!=='desktop',page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch});
  page.setDefaultTimeout(15000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',entry=>{if(['warning','error'].includes(entry.type()))errors.push(entry.text())});
  await page.addInitScript(({origin})=>{
   if(location.origin!==origin)return;
   const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
   sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-25T00:30:17.125Z',place}));
   localStorage.setItem('nightjar-sky-view-v1','2d');
   localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Clock-change note'}));
  },{origin:base.origin});
  await page.context().route('**/api/weather?*',route=>route.fulfill({json:{hourly:{
   time:[0,1,3].map(hour=>Date.parse(`2026-10-25T0${hour}:00Z`)/1000),cloud_cover:[10,20,30],
   dew_point_2m:[-2,0,3],visibility:[12345,100,200],
  }}}));
  await page.context().route('**/*',route=>route.request().resourceType()==='image'&&new URL(route.request().url()).origin!==base.origin
   ?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});
  assert.match(await page.title(),/Nightjar/);
  await page.getByRole('button',{name:'Refresh weather',exact:true}).waitFor();
  const panel=page.locator('.atmosphere-panel'),stamp=panel.locator('.atmosphere-timestamp');
  const input=page.locator('#observing-time');
  const saved=await page.evaluate(()=>localStorage.getItem('nightjar-target-notes-v1'));
  async function activate(button){if(touch)await button.tap();else await button.click()}
  async function check(instant,pattern){
   await page.waitForFunction(instant=>document.querySelector('.atmosphere-timestamp time')?.getAttribute('datetime')===instant,instant);
   assert.match(await stamp.textContent(),pattern);
   await stamp.scrollIntoViewIfNeeded();
   const box=await stamp.boundingBox();assert(box.x>=0&&box.x+box.width<=viewport.width);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await check('2026-10-25T00:00:00.000Z',/Forecast hour: 25 Oct 2026, 01:00 GMT\+1/);
  assert((await panel.textContent()).includes('12.3 km'));
  const darkness=page.locator('.darkness-remaining');
  const end=await darkness.locator('time').getAttribute('datetime');
  const remaining=async()=>{const text=await darkness.locator('strong').textContent();return Number(text.match(/(\d+) hours?/)?.[1]||0)*60+Number(text.match(/(\d+) minutes?/)?.[1]||0)};
  const initialMinutes=await remaining();assert(initialMinutes>120);

  // An unfinished edit must not change the source timestamp or measurements.
  await input.fill('');
  await activate(page.getByRole('button',{name:'Next observing hour',exact:true}));
  await page.getByRole('heading',{name:'Your edits have not been saved'}).waitFor();
  await activate(page.getByRole('button',{name:'Keep editing',exact:true}));
  assert.equal(await input.inputValue(),'');
  await check('2026-10-25T00:00:00.000Z',/GMT\+1/);
  await activate(page.getByRole('button',{name:'Cancel time edit',exact:true}));
  await activate(page.getByRole('button',{name:'Next observing hour',exact:true}));
  await check('2026-10-25T01:00:00.000Z',/Forecast hour: 25 Oct 2026, 01:00 GMT(?:\+0)? · Europe\/London/);
  assert((await panel.textContent()).includes('0.1 km'));
  assert.equal(await remaining(),initialMinutes-60,'repeated local hour still consumes one elapsed hour of darkness');
  assert.equal(await darkness.locator('time').getAttribute('datetime'),end);

  await activate(page.getByRole('button',{name:'Next observing hour',exact:true}));
  await check('2026-10-25T02:30:17.125Z',/Selected time: 25 Oct 2026, 02:30 GMT/);
  assert((await panel.textContent()).includes('No atmospheric forecast for this hour'));
  assert.equal(await panel.locator('.atmosphere-grid').count(),0);
  assert.equal(await remaining(),initialMinutes-120);
  assert.equal(await darkness.locator('time').getAttribute('datetime'),end);
  await input.fill('2026-10-25T12:00');await page.locator('.night-only-notice').waitFor();
  assert.equal(await panel.isVisible(),false);assert.equal(await darkness.isVisible(),false);

  await input.fill('2026-10-26T00:30');
  await check('2026-10-26T00:30:00.000Z',/Selected time: 26 Oct 2026, 00:30 GMT/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-target-notes-v1')),saved);
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);assert.deepEqual(errors,[]);
  console.log(`${name}: repeated-hour offsets, gaps, date change, elapsed darkness, daylight hiding, retained draft and containment PASS`);
  await page.close();
 }
}finally{await browser.close()}
