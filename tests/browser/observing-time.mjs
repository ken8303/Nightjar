import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

// Optional rendered regression: Playwright and its browser are provided by the
// caller, rather than added to the application's runtime dependencies.
const require=createRequire(import.meta.url),A=require('astronomy-engine');
let chromium;
try{({chromium}=require('playwright'))}
catch{throw Error('Install/provide Playwright to run this optional browser check. See README.md.');}
const base=new URL(process.argv[2]||'http://localhost:5173');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname)||!['http:','https:'].includes(base.protocol))throw Error('Use a local Nightjar server for this fixture-based check.');
const browser=await chromium.launch({
 headless:true,
 ...(process.env.NIGHTJAR_CHROMIUM_EXECUTABLE?{executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE}:{}),
 args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[],
});
const london={name:'London',latitude:51.5085,longitude:-.1257,timezone:'Europe/London'};
const zeroOffset=/Europe\/London · GMT(?:\+0)?$/;

async function open(time,place,viewport){
 const page=await browser.newPage({viewport,acceptDownloads:true});
 page.setDefaultTimeout(15000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({time,place,origin})=>{
  if(location.origin!==origin)return;
  sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));
 },{time,place,origin:base.origin});
 await page.route('**/api/weather?*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({
  timezone:place.timezone,hourly:{time:[Date.parse('2026-10-20T19:00Z')/1000],cloud_cover:[10]},
 })}));
 await page.goto(base.href,{waitUntil:'domcontentloaded'});
 await page.locator('#observing-time').waitFor();
 return {page,errors};
}

try{
 for(const [name,viewport] of [['desktop',{width:1365,height:1000}],['mobile',{width:390,height:844}]]){
  for(const [kind,time] of [['spring','2026-03-29T00:30:00.000Z'],['autumn','2026-10-25T00:30:00.000Z']]){
   const {page,errors}=await open(time,london,viewport);
   const input=page.locator('#observing-time'),zone=page.locator('#observing-time-zone');
   await page.getByRole('button',{name:'Site local time',exact:true}).click();
   if(kind==='autumn')assert.match(await zone.textContent(),/GMT\+1/);
   await page.getByRole('button',{name:'Next observing hour',exact:true}).click();
   assert.equal(await input.inputValue(),kind==='spring'?'2026-03-29T02:30':'2026-10-25T01:30');
   assert.match(await zone.textContent(),kind==='spring'?/GMT\+1/:zeroOffset);
   assert((await page.locator('.time-entry [aria-atomic=true]').textContent()).includes(`${time.slice(0,10)} 01:30:00.000 UTC`));
   await page.getByRole('button',{name:'Previous observing hour',exact:true}).click();
   assert.equal(await input.inputValue(),kind==='spring'?'2026-03-29T00:30':'2026-10-25T01:30');
   if(kind==='spring'){
    await input.fill('2026-03-29T01:30');
    await page.getByText(/does not exist in the selected zone/).waitFor();
    await page.getByRole('button',{name:'Next observing hour',exact:true}).click();
    await page.getByRole('heading',{name:'Your edits have not been saved'}).waitFor();
    await page.getByRole('button',{name:'Keep editing',exact:true}).click();
    assert.equal(await input.inputValue(),'2026-03-29T01:30');
    await page.getByRole('button',{name:'Cancel time edit',exact:true}).click();
    assert.equal(await input.inputValue(),'2026-03-29T00:30');
   }else{
    await input.fill('2026-10-25T01:30');
    await page.getByText('This local time occurs twice when the clocks go back. Choose which occurrence to use.',{exact:true}).waitFor();
    const second=page.locator('.time-entry-warning').getByRole('button').nth(1);
    assert.match(await second.textContent(),/01:30:00 UTC/);
    await second.click();
    assert.match(await zone.textContent(),zeroOffset);
   }
   assert.deepEqual(errors,[]);
   console.log(`${name} ${kind}: elapsed hours, UTC offset and unfinished edit protection PASS`);
   await page.close();
  }
  for(const [kind,time,place] of [
   ['first','0001-01-01T00:00:00.000Z',{name:'New York',latitude:40.7,longitude:-74,timezone:'America/New_York'}],
   ['last','9999-12-31T23:59:59.999Z',{name:'Kiritimati',latitude:1.8721,longitude:-157.4278,timezone:'Pacific/Kiritimati'}],
  ]){
   const {page,errors}=await open(time,place,viewport);
   assert.equal(await page.locator('#observing-time').inputValue(),time.slice(0,16));
   assert.equal(await page.getByRole('button',{name:'Site local time',exact:true}).isDisabled(),true);
   assert.equal(await page.getByRole('button',{name:kind==='first'?'Previous observing hour':'Next observing hour',exact:true}).isDisabled(),true);
   const instant=new Date(time),observer=new A.Observer(place.latitude,place.longitude,0),equator=A.Equator(A.Body.Sun,instant,observer,true,true);
   const dark=A.Horizon(instant,observer,equator.ra,equator.dec).altitude< -18;
   const summary=page.getByRole('button',{name:'Download observing summary',exact:true});
   if(dark){
    const downloading=page.waitForEvent('download');await summary.click();
    const file=await downloading,text=await readFile(await file.path(),'utf8');
    assert(text.includes(time));assert.match(text,kind==='first'?/BC/:/10000/);
   }else{
    await page.locator('.night-only-notice').waitFor();assert.equal(await summary.isVisible(),false);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);
   console.log(`${name} ${kind} year: bounded controls, local range fallback and night-only summary availability PASS`);
   await page.close();
  }
 }
}finally{await browser.close()}
