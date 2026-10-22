import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

// Optional rendered regression. The caller supplies Playwright and Chromium;
// neither is added to the application dependencies.
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'))}
catch{throw Error('Provide Playwright to run this optional browser check. See README.md.');}
const base=new URL(process.argv[2]||'http://localhost:5173');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||!['http:','https:'].includes(base.protocol))throw Error('Use a local Nightjar server for this fixture-based check.');
const browser=await chromium.launch({
 headless:true,
 ...(process.env.NIGHTJAR_CHROMIUM_EXECUTABLE?{executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE}:{}),
 args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[],
});
const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
const original={id:'typing-first',target:'M31',observedAt:'2026-10-20T20:00:00.000Z',place,outcome:'seen',equipment:'Binoculars',notes:'Original first'};
const second={...original,id:'typing-second',observedAt:'2026-10-19T21:00:00.000Z',notes:'Original second'};
try{
 for(const [name,viewport] of [
  ['desktop',{width:1365,height:1000}],['phone',{width:390,height:844}],
  ['narrow',{width:320,height:740}],['landscape',{width:640,height:320}],
  ['tablet-portrait',{width:820,height:1180}],['tablet-landscape',{width:1180,height:820}],
 ]){
  const touch=name!=='desktop',page=await browser.newPage({viewport,hasTouch:touch,isMobile:touch});
  page.setDefaultTimeout(15000);
  const errors=[],logs=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(['warning','error'].includes(message.type()))logs.push(message.text())});
  await page.addInitScript(({origin,place,entries})=>{
   if(location.origin!==origin||sessionStorage.getItem('nightjar-typing-fixture'))return;
   sessionStorage.setItem('nightjar-typing-fixture','1');
   sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time:'2026-10-20T19:00:17.125Z',place}));
   localStorage.setItem('nightjar-sky-view-v1','2d');
   localStorage.setItem('nightjar-observing-diary-v1',JSON.stringify(entries));
  },{origin:base.origin,place,entries:[original,second]});
  // Context routes also cover requests forwarded by the service worker.
  await page.context().route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:[Date.parse('2026-10-20T19:00Z')/1000],cloud_cover:[20]}}}));
  await page.context().route('**/*',route=>route.request().resourceType()==='image'&&new URL(route.request().url()).origin!==base.origin
   ?route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'}):route.fallback());
  async function activate(control){if(touch)await control.tap();else await control.click()}
  async function waitForNavigation(label){
   await page.waitForFunction(label=>Array.from(document.querySelectorAll('[role="tab"],button[aria-label="Open planner navigation"]')).some(el=>(el.getAttribute('aria-label')==='Open planner navigation'||el.textContent.trim()===label)&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'),label,{timeout:30000});
  }
  async function navigate(label){
   await waitForNavigation(label);
   const tab=page.getByRole('tab',{name:label,exact:true});
   if(await tab.isVisible())await activate(tab);
   else{await activate(page.getByRole('button',{name:'Open planner navigation'}));await activate(page.getByRole('dialog').getByRole('button',{name:label,exact:true}));}
  }
  const diary=page.locator('#observing-diary'),notes=diary.getByRole('textbox',{name:'Observation notes',exact:true});
  const equipment=diary.getByRole('textbox',{name:'Equipment used',exact:true});
  const editHeading=diary.getByRole('heading',{name:'Edit M31 observation',exact:true});
  const entries=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nightjar-observing-diary-v1')));
  const drafts=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nightjar-diary-drafts-v1')));
  const focused=control=>control.evaluate(element=>element===document.activeElement);
  await page.goto(base.href,{waitUntil:'domcontentloaded'});
  await navigate('Sky atlas');await diary.waitFor();
  const site=await page.evaluate(()=>localStorage.getItem('nightjar-place'));
  const plannerTime=()=>page.locator('.time-entry [aria-atomic=true]').textContent();
  const initialTime=await plannerTime();
  await activate(diary.locator('[data-diary-edit="typing-first"]'));
  await editHeading.waitFor();assert(await focused(editHeading),'opening an entry reveals the edit form');
  await activate(notes);await notes.pressSequentially(' full notes',{delay:40});
  assert.equal(await notes.inputValue(),'Original first full notes');
  assert(await focused(notes),'saving each character must retain the notes editor');
  await activate(equipment);await equipment.pressSequentially(' 10x50',{delay:40});
  assert.equal(await equipment.inputValue(),'Binoculars 10x50');assert(await focused(equipment));
  await diary.locator('.diary-fields select').selectOption('not-seen');
  assert.deepEqual(await entries(),[original,second],'typing only changes the unfinished edit');
  assert.equal((await drafts()).edit.draft.notes,'Original first full notes');
  await navigate('Tonight');await navigate('Sky atlas');await editHeading.waitFor();
  assert.equal(await notes.inputValue(),'Original first full notes');
  assert.equal(await plannerTime(),initialTime);
  await page.reload({waitUntil:'domcontentloaded'});
  await waitForNavigation('Sky atlas');
  if(!await diary.isVisible())await navigate('Sky atlas');
  await editHeading.waitFor();assert.equal(await notes.inputValue(),'Original first full notes');
  const restoredTime=await plannerTime();
  await activate(notes);await notes.pressSequentially(' restored',{delay:40});
  assert.equal(await notes.inputValue(),'Original first full notes restored');assert(await focused(notes));
  await activate(diary.getByRole('button',{name:'Save diary changes',exact:true}));
  await diary.getByRole('button',{name:'Save observation',exact:true}).waitFor();
  assert.deepEqual(await entries(),[{...original,notes:'Original first full notes restored',equipment:'Binoculars 10x50',outcome:'not-seen'},second]);
  await activate(diary.locator('[data-diary-edit="typing-second"]'));
  await editHeading.waitFor();assert(await focused(editHeading),'opening another entry still reveals its form');
  await activate(notes);await notes.pressSequentially(' unsaved',{delay:40});
  assert.equal(await notes.inputValue(),'Original second unsaved');assert(await focused(notes));
  await activate(diary.getByRole('button',{name:'Cancel diary edit',exact:true}));
  await diary.getByRole('button',{name:'Save observation',exact:true}).waitFor();
  assert.deepEqual((await entries())[1],second,'cancel leaves the saved observation unchanged');
  assert.equal((await drafts()).edit,null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-place')),site);
  assert.equal(await plannerTime(),restoredTime,'diary editing does not change the planner time');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('vite-error-overlay,nextjs-portal').count(),0);
  assert.match(await page.title(),/Nightjar/);assert.deepEqual(errors,[]);assert.deepEqual(logs,[]);
  console.log(`${name}: continuous diary typing, restored edit, exact save metadata, different-entry handoff and cancel PASS`);
  await page.close();
 }
}finally{await browser.close()}
