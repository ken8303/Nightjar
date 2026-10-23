import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';

// Optional production-browser regression; the caller supplies Playwright.
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'))}
catch{throw Error('Provide Playwright to run this optional browser check. See README.md.');}
const base=new URL(process.argv[2]||'http://localhost:5173');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||!['http:','https:'].includes(base.protocol))throw Error('Use a local Nightjar server for this fixture-based check.');
const evidence=process.env.NIGHTJAR_BROWSER_EVIDENCE_DIR;
if(evidence)await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,
 ...(process.env.NIGHTJAR_CHROMIUM_EXECUTABLE?{executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE}:{}),
 args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[],
});
try{
 for(const [name,viewport] of [
  ['desktop',{width:1365,height:1000}],['phone',{width:390,height:844}],
  ['narrow',{width:320,height:740}],['landscape',{width:640,height:320}],
  ['tablet-portrait',{width:820,height:1180}],['tablet-landscape',{width:1180,height:820}],
 ])for(const [kind,selected,clouds] of [
  ['missing','2026-10-20T20:00:17.125Z',[100,null,0]],
  ['outside','2026-10-20T18:00:17.125Z',[null,null,0]],
  ['unavailable','2026-10-20T20:00:17.125Z',[null,null,null]],
 ]){
  const touch=name!=='desktop',page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch});
  page.setDefaultTimeout(15000);
  const errors=[],logs=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',entry=>{if(['warning','error'].includes(entry.type()))logs.push(entry.text())});
  await page.addInitScript(({origin,selected})=>{
   if(location.origin!==origin)return;
   const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
   sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:selected,place}));
   localStorage.setItem('nightjar-sky-view-v1','2d');
   localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Cloud recovery note'}));
   localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31']));
  },{origin:base.origin,selected});
  await page.context().route('**/api/weather?*',route=>route.fulfill({json:{hourly:{
   time:[19,20,21].map(hour=>Date.parse(`2026-10-20T${hour}:00Z`)/1000),cloud_cover:clouds,temperature_2m:[10,11,12],
  }}}));
  await page.context().route('**/*',route=>route.request().resourceType()==='image'&&new URL(route.request().url()).origin!==base.origin
   ?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}):route.fallback());
  await page.clock.setFixedTime(new Date('2026-10-20T18:00:00.000Z'));
  await page.goto(base.href,{waitUntil:'domcontentloaded'});
  assert.match(await page.title(),/Nightjar/);assert.equal(new URL(page.url()).origin,base.origin);
  const outlook=page.locator('.outlook'),panel=page.locator('.forecast-recovery');
  await outlook.getByRole('button',{name:'Refresh weather',exact:true}).waitFor();
  const time=page.locator('#observing-time'),exact=()=>page.locator('.time-entry [aria-atomic=true]').textContent();
  const stored=()=>page.evaluate(()=>({site:localStorage.getItem('nightjar-place'),notes:localStorage.getItem('nightjar-target-notes-v1'),deep:localStorage.getItem('nightjar-deep-targets-v1')}));
  async function activate(control){if(touch)await control.tap();else await control.click()}
  const before=await exact(),saved=await stored();
  assert.equal(await outlook.locator('.score-ring strong').textContent(),'—');
  if(kind==='unavailable'){
   assert.equal(await panel.count(),0);assert.equal(await exact(),before);assert.deepEqual(await stored(),saved);
   assert((await outlook.locator('.forecast-coverage').textContent()).includes('Scored 0'));
  }else{
   const action=panel.getByRole('button',{name:'Use closest forecast hour',exact:true});await action.waitFor();
   assert((await panel.textContent()).includes('closest hour with cloud data'));
   assert((await panel.textContent()).includes('22:00'));
   await time.fill('');await action.scrollIntoViewIfNeeded();assert((await action.boundingBox()).height>=44);
   if(evidence)await panel.screenshot({path:`${evidence}/cloud-recovery-${name}-${kind}.png`});
   await activate(action);await page.getByRole('heading',{name:'Your edits have not been saved',exact:true}).waitFor();
   assert.equal(await exact(),before);assert.equal(await time.inputValue(),'');assert.deepEqual(await stored(),saved);
   await activate(page.getByRole('button',{name:'Keep editing',exact:true}));assert.equal(await time.inputValue(),'');
   await activate(action);await activate(page.getByRole('button',{name:'Use selected time',exact:true}));
   await page.waitForFunction(()=>document.querySelector('#observing-time')?.value==='2026-10-20T21:00');
   assert((await exact()).includes('2026-10-20 21:00:00.000 UTC'));
   assert.notEqual(await outlook.locator('.score-ring strong').textContent(),'—');assert.equal(await panel.count(),0);assert.deepEqual(await stored(),saved);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(logs,[]);
  console.log(`${name}/${kind}: nearest known-cloud hour, unknown-score handling, edit review and retained time/data PASS`);
  await page.close();
 }
}finally{await browser.close()}
