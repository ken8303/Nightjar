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
 ])for(const [kind,time] of [
  ['spring','2026-03-28T20:30:12.345Z'],['autumn','2026-10-24T20:30:12.345Z'],
  ['first','0001-01-01T23:59:59.999Z'],['last','9999-12-31T00:00:00.000Z'],
 ]){
  const touch=name!=='desktop',page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch});
  page.setDefaultTimeout(15000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',entry=>{if(['warning','error'].includes(entry.type()))errors.push(entry.text())});
  await page.addInitScript(({origin,time})=>{
   if(location.origin!==origin)return;
   const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
   sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));
   localStorage.setItem('nightjar-sky-view-v1','2d');
   localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'24-hour note'}));
   localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31']));
  },{origin:base.origin,time});
  await page.context().route('**/api/weather?*',route=>route.fulfill({json:{hourly:{
   time:[Date.parse('2026-10-25T00:00Z')/1000],cloud_cover:[30],
  }}}));
  await page.context().route('**/*',route=>route.request().resourceType()==='image'&&new URL(route.request().url()).origin!==base.origin
   ?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}):route.fallback());
  await page.goto(base.href,{waitUntil:'domcontentloaded'});
  assert.match(await page.title(),/Nightjar/);assert.equal(new URL(page.url()).origin,base.origin);
  await page.getByRole('button',{name:'Refresh weather',exact:true}).waitFor();
  const input=page.locator('#observing-time'),back=page.getByRole('button',{name:'Back 24 observing hours',exact:true}),forward=page.getByRole('button',{name:'Forward 24 observing hours',exact:true});
  const exact=()=>page.locator('.time-entry [aria-atomic=true]').textContent();
  const saved=()=>page.evaluate(()=>({place:localStorage.getItem('nightjar-place'),notes:localStorage.getItem('nightjar-target-notes-v1'),targets:localStorage.getItem('nightjar-deep-targets-v1')}));
  const before=await saved();
  async function activate(button){if(touch)await button.tap();else await button.click()}
  async function check(instant){
   const expected=instant.replace('T',' ').replace('Z',' UTC');
   await page.waitForFunction(expected=>document.querySelector('.time-entry [aria-atomic=true]')?.textContent.includes(expected),expected);
   assert((await exact()).includes(expected));assert.deepEqual(await saved(),before);
  }
  assert((await back.boundingBox()).height>=44);assert((await forward.boundingBox()).height>=44);
  if(kind==='first'||kind==='last'){
   const disabled=kind==='first'?back:forward,enabled=kind==='first'?forward:back;
   assert(!(await disabled.isEnabled()));assert(await enabled.isEnabled());
   await disabled.evaluate(button=>button.click());await check(time);
   await activate(enabled);await check(new Date(Date.parse(time)+(kind==='first'?1:-1)*86400000).toISOString());
   await activate(disabled);await check(time);
  }else{
   await activate(page.getByRole('button',{name:'Site local time',exact:true}));
   const original=await input.inputValue();
   await input.fill('');await activate(forward);
   await page.getByRole('heading',{name:'Your edits have not been saved'}).waitFor();
   await check(time);assert.equal(await input.inputValue(),'');
   await activate(page.getByRole('button',{name:'Keep editing',exact:true}));
   assert.equal(await input.inputValue(),'');await check(time);
   await activate(forward);await activate(page.getByRole('button',{name:'Use selected time',exact:true}));
   const next=new Date(Date.parse(time)+86400000).toISOString();await check(next);
   assert.equal(await input.inputValue(),kind==='spring'?'2026-03-29T21:30':'2026-10-25T20:30');
   await activate(back);await check(time);assert.equal(await input.inputValue(),original);
   // The same discarded-draft regression also affected the existing hour steps.
   await input.fill('');
   await activate(page.getByRole('button',{name:'Next observing hour',exact:true}));
   await activate(page.getByRole('button',{name:'Use selected time',exact:true}));
   await check(new Date(Date.parse(time)+3600000).toISOString());
   await activate(page.getByRole('button',{name:'Previous observing hour',exact:true}));
   await check(time);assert.equal(await input.inputValue(),original);
   assert.equal(await page.locator('.time-entry-warning').count(),0);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);assert.deepEqual(errors,[]);
  console.log(`${name}/${kind}: 24-hour touch shortcuts, exact time, bounds, edit review and retained data PASS`);
  await page.close();
 }
}finally{await browser.close()}
