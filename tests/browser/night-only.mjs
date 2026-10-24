import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),A=require('astronomy-engine');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
const sun=(date,place)=>{const obs=new A.Observer(place.latitude,place.longitude,0),eq=A.Equator(A.Body.Sun,date,obs,true,true);return A.Horizon(date,obs,eq.ra,eq.dec).altitude};
try{
 for(const [name,viewport] of [['phone',{width:390,height:844}],['narrow',{width:320,height:740}],['tablet',{width:820,height:1180}],['desktop',{width:1365,height:1000}]]){
  for(const polar of [false,true]){
   const place={name:polar?'North Pole':'London',latitude:polar?90:51.5,longitude:0,timezone:'Europe/London'},time=polar?'2026-06-21T12:00:00.000Z':'2026-10-24T12:00:00.000Z';
   const page=await browser.newPage({viewport,hasTouch:name!=='desktop',isMobile:name!=='desktop'}),errors=[];
   page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
   await page.addInitScript(({origin,place,time})=>{
    if(location.origin!==origin)return;
    sessionStorage.setItem('nightjar-recovery-context-v1',JSON.stringify({version:1,time,place}));
    localStorage.setItem('nightjar-sky-view-v1','2d');
    localStorage.setItem('nightjar-places',JSON.stringify([place,{...place,name:'Opposite longitude',longitude:180}]));
    localStorage.setItem('nightjar-target-notes-v1',JSON.stringify({Vega:'Keep this note'}));
    localStorage.setItem('nightjar-deep-targets-v1',JSON.stringify(['M31']));
   },{origin:base.origin,place,time});
   let auroraTime=time,auroraFails=false;
   await page.context().route('**/api/aurora',route=>auroraFails?route.fulfill({status:503,json:{error:'Fixture outage'}}):route.fulfill({json:{forecastAt:auroraTime,observedAt:new Date(Date.parse(auroraTime)-1800000).toISOString(),fetchedAt:time,cells:Array.from({length:100},(_,i)=>[i,52,50])}}));
   await page.context().route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:48},(_,i)=>Date.parse(time)/1000+i*3600),cloud_cover:Array(48).fill(20)}}}));
   await page.context().route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
   await page.goto(base.href,{waitUntil:'domcontentloaded'});
   const warning=page.locator('.night-only-notice');await warning.waitFor();
   if(name==='phone'&&!polar)await page.screenshot({path:'/tmp/nightjar-night-only-phone.png'});
   assert.equal(await page.locator('.outlook').isVisible(),false);
   assert.equal(await page.getByRole('button',{name:'Download observing summary',exact:true}).isVisible(),false);
   async function section(label){
    const mobile=page.getByRole('button',{name:'Open planner navigation',exact:true});
    if(await mobile.isVisible()){await mobile.click();await page.locator('.mobile-navigation-options').getByRole('button',{name:label,exact:true}).click()}
    else await page.getByRole('tab',{name:label,exact:true}).click();
   }
   for(const [key,label] of [['sky','Sky atlas'],['moon','Moon'],['events','Sky calendar'],['tools','Photo tools']]){
    await section(label);await warning.waitFor();assert.equal(await page.locator(`[data-night-content="${key}"]`).isVisible(),false);
   }
   await section('My places');assert.equal(await warning.isVisible(),false);await page.locator('.place-comparison').waitFor();
   const currentCard=page.locator(`[data-comparison-card="${place.latitude},0"]`);await currentCard.waitFor();assert.match(await currentCard.textContent(),/Outside full astronomical darkness/);assert.equal(await currentCard.locator('.comparison-score').count(),0);
   if(!polar)await page.locator('[data-comparison-card="51.5,-180"] .comparison-score').waitFor();
   await section('Tonight');await warning.waitFor();
   // Recovery still honours unfinished time edits.
   await page.locator('#observing-time').fill('');
   await page.getByRole('button',{name:'Find full darkness after selected time',exact:true}).click();
   if(polar){
    await page.locator('#planner-notice').waitFor();assert.match(await page.locator('#planner-notice').textContent(),/No astronomical darkness/);
    assert.equal(await warning.isVisible(),true);await page.getByRole('button',{name:'Cancel time edit',exact:true}).click();
   }else{
    await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.equal(await warning.isVisible(),true);
    await page.getByRole('button',{name:'Find full darkness after selected time',exact:true}).click();
    await page.getByRole('button',{name:'Use selected time',exact:true}).click();await warning.waitFor({state:'hidden'});
    await page.locator('.outlook').waitFor();
    await section('Aurora');await page.getByRole('heading',{name:'Aurora outlook outside full darkness',exact:true}).waitFor();assert.equal(await page.locator('.aurora-value').count(),0);
    auroraFails=true;await page.getByRole('button',{name:'Refresh aurora',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'previous forecast remains hidden'}).waitFor();
    assert.equal(await page.locator('.aurora-value').count(),0);
    auroraFails=false;auroraTime='2026-10-24T00:00:00.000Z';await page.getByRole('button',{name:'Retry aurora',exact:true}).click();await page.locator('.aurora-value').waitFor();
    await section('Tonight');
    const selected=new Date((await page.locator('#observing-time').inputValue())+'Z');assert(sun(selected,place)<-18);
    await page.locator('.hour').first().waitFor();
    for(const label of await page.locator('.hour').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))){
     const date=new Date(label.match(/^Select (.*), score /)[1]);assert(sun(date,place)<-18,label);
    }
    await section('Sky atlas');await page.locator('#visibility-planner').waitFor();
    for(const label of await page.locator('.deep-sky-hours button').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))){const date=new Date(label.match(/ at (.*), altitude /)[1]);assert(sun(date,place)<-18,label)}
    const buttons=page.locator('#visibility-planner button[aria-label^="View "][aria-label*="altitude"]');
    for(const label of await buttons.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))){
     const date=new Date(label.match(/ at (.*), altitude /)[1]);assert(sun(date,place)<-18,label);
    }
    // A bright-time edit hides the view; returning to night restores it.
    await page.locator('#observing-time').fill('2026-10-25T12:00');await warning.waitFor();
    assert.equal(await page.locator('#visibility-planner').isVisible(),false);
    await page.locator('#observing-time').fill('2026-10-25T00:00');await warning.waitFor({state:'hidden'});
    await page.locator('#visibility-planner').waitFor();
    assert.equal(await page.locator('#visibility-planner').getByText('Day / civil',{exact:true}).count(),0);
   }
   assert.match(await page.evaluate(()=>localStorage.getItem('nightjar-target-notes-v1')),/Keep this note/);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.deepEqual(errors,[]);console.log(`${name}: ${polar?'polar no-darkness':'daylight, recovery, timelines and clock change'} passed`);await page.close();
  }
 }
}finally{await browser.close()}
