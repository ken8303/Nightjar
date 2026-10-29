import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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
    localStorage.setItem('nightjar-targets-v1',JSON.stringify(['Vega']));
   },{origin:base.origin,place,time});
   let auroraTime=time,auroraFails=false;
   await page.context().route('**/api/aurora',route=>auroraFails?route.fulfill({status:503,json:{error:'Fixture outage'}}):route.fulfill({json:{forecastAt:auroraTime,observedAt:new Date(Date.parse(auroraTime)-1800000).toISOString(),fetchedAt:time,cells:Array.from({length:100},(_,i)=>[i,52,50])}}));
   await page.context().route('**/api/weather?*',route=>route.fulfill({json:{hourly:{time:Array.from({length:48},(_,i)=>Date.parse(time)/1000+i*3600),cloud_cover:Array(48).fill(20)}}}));
   await page.context().route('**/*',route=>new URL(route.request().url()).origin!==base.origin?route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg"/>'}):route.fallback());
   await page.goto(base.href,{waitUntil:'domcontentloaded'});
   const warning=page.locator('.night-only-notice');await warning.waitFor();
   if(name==='phone'&&!polar)await page.screenshot({path:'/tmp/nightjar-night-only-phone.png'});
   assert.equal(await page.locator('.outlook').isVisible(),false);
   assert.equal(await page.locator('.darkness-remaining').isVisible(),false);
   assert.equal(await page.getByRole('button',{name:'Download observing summary',exact:true}).isVisible(),false);
   async function section(label){
    const mobile=page.getByRole('button',{name:'Open planner navigation',exact:true});
    if(await mobile.isVisible()){await mobile.click();await page.locator('.mobile-navigation-options').getByRole('button',{name:label,exact:true}).click()}
    else await page.getByRole('tab',{name:label,exact:true}).click();
   }
   for(const [key,label] of [['sky','Sky atlas'],['moon','Moon'],['events','Sky calendar'],['tools','Photo tools']]){
    await section(label);await warning.waitFor();assert.equal(await page.locator(`[data-night-content="${key}"]`).isVisible(),false);
   }
   await page.getByRole('button',{name:'Change observing site',exact:true}).click();assert.equal(await warning.isVisible(),false);await page.locator('.place-comparison').waitFor();
   const currentCard=page.locator(`[data-comparison-card="${place.latitude},0"]`);await currentCard.waitFor();assert.match(await currentCard.textContent(),/Outside full astronomical darkness/);assert.equal(await currentCard.locator('.comparison-score').count(),0);
   if(!polar)await page.locator('[data-comparison-card="51.5,-180"] .comparison-score').waitFor();
   await section('Tonight');await warning.waitFor();
   // Recovery still honours unfinished time edits.
   await page.locator('#observing-time').fill('');
   if(polar){
    await page.locator('.night-only-empty').waitFor();assert.equal(await page.getByRole('button',{name:'Use this dark time',exact:true}).isDisabled(),true);
    assert.equal(await page.locator('.night-only-preview').count(),0);
    assert.equal(await warning.isVisible(),true);await page.getByRole('button',{name:'Cancel time edit',exact:true}).click();
    await page.locator('#observing-time').fill('2026-12-21T12:00');await page.locator('.darkness-remaining').waitFor();
    assert.match(await page.locator('.darkness-remaining').textContent(),/No end of full darkness was found within 48 hours/);assert.equal(await page.locator('.darkness-remaining time').count(),0);
   }else{
    const preview=await page.locator('.night-only-preview time').getAttribute('datetime');assert(sun(new Date(preview),place)<-18);
    await page.getByRole('button',{name:'Use this dark time',exact:true}).click();
    await page.getByRole('button',{name:'Keep editing',exact:true}).click();assert.equal(await warning.isVisible(),true);
    await page.getByRole('button',{name:'Use this dark time',exact:true}).click();
    await page.getByRole('button',{name:'Use selected time',exact:true}).click();await warning.waitFor({state:'hidden'});
    await page.locator('.outlook').waitFor();
    assert.equal(await page.locator('#observing-time').inputValue(),preview.slice(0,16));
    const duration=await page.locator('.darkness-remaining strong').textContent();
    const end=new Date(await page.locator('.darkness-remaining time').getAttribute('datetime'));assert(+end>Date.parse(preview));
    assert(sun(new Date(+end-2000),place)<-18);assert(sun(new Date(+end+2000),place)>-18);
    await page.locator('.darkness-remaining').screenshot({path:`/tmp/nightjar-darkness-remaining-${name}.png`});
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
    // Full darkness starts partway through this hour. The heading must not
    // print its brighter beginning as an observing time.
    const hourStart=new Date(Math.floor(Date.parse(preview)/3600000)*3600000);
    assert(sun(hourStart,place)>=-18);assert(sun(new Date(preview),place)<-18);
    const introduction=page.locator('#visibility-planner > p').first();
    assert.match(await introduction.textContent(),/first sample can precede the selected time/i);
    assert.doesNotMatch(await introduction.textContent(),/starting at/i);
    await introduction.screenshot({path:`/tmp/nightjar-visibility-dusk-${name}.png`});
    const textDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download observing list',exact:true}).click();
    const textFile=await textDownload;assert(textFile.suggestedFilename().includes(`-london-${preview.replace(/[:.]/g,'-')}.txt`));const text=await readFile(await textFile.path(),'utf8');
    assert(text.includes(`Full darkness remaining: ${duration} after the selected observing time.`));
    assert(text.includes(`Full darkness ends UTC: ${end.toISOString()}`));assert(text.includes('[ ] Vega'));
    for(const label of ['Download print-ready plan','Download deep-sky observing plan']){
     const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();
     const file=await downloaded;assert(file.suggestedFilename().includes(`-london-${preview.replace(/[:.]/g,'-')}.html`));const html=await readFile(await file.path(),'utf8');
     assert(html.includes(`${duration} after the selected time`));assert(html.includes(end.toISOString().replace('T',' ').replace('Z',' UTC')));
     const report=await browser.newPage({viewport});await report.setContent(html);
     await report.getByText('FULL DARKNESS ENDS (UTC)',{exact:true}).waitFor();
     assert(await report.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
     if(name==='narrow'&&label==='Download print-ready plan')await report.locator('.meta').screenshot({path:'/tmp/nightjar-print-darkness-narrow.png'});
     await report.close();
    }
    for(const label of await page.locator('.deep-sky-hours button').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))){const date=new Date(label.match(/ at (.*), altitude /)[1]);assert(sun(date,place)<-18,label)}
    const mobileBars=page.locator('.mobile-altitude-grid button');for(const card of await mobileBars.all()){const label=await card.getAttribute('aria-label'),degrees=Number(label.match(/altitude (-?[\d.]+) degrees/)[1]);assert.equal((await card.locator('span').first().textContent()).trim(),`${degrees.toFixed(1)}°`);if(degrees>30.1)assert.match(await card.textContent(),/Above 30°/);const width=await card.locator('.mobile-altitude-bar i').evaluate(node=>parseFloat(node.style.width));assert(Math.abs(width-Math.max(0,Math.min(90,degrees))/90*100)<0.12);}
    const buttons=page.locator('#visibility-planner button[aria-label^="View "][aria-label*="altitude"]');
    for(const label of await buttons.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))){
     const date=new Date(label.match(/ at (.*), altitude /)[1]);assert(sun(date,place)<-18,label);
    }
    const visibleSample=page.locator('.mobile-altitude-grid button:visible, .desktop-visibility button[aria-label^="View "][aria-label*="altitude"]:visible').first();
    const chosen=new Date((await visibleSample.getAttribute('aria-label')).match(/ at (.*), altitude /)[1]);
    await visibleSample.click();assert.equal(await page.locator('#observing-time').inputValue(),chosen.toISOString().slice(0,16));
    // A bright-time edit hides the view; returning to night restores it.
    await page.locator('#observing-time').fill('2026-10-25T12:00');await warning.waitFor();
    assert.equal(await page.locator('#visibility-planner').isVisible(),false);
    await page.locator('#observing-time').fill('2026-10-25T00:00');await warning.waitFor({state:'hidden'});
    await page.locator('#visibility-planner').waitFor();
    assert.equal(await page.locator('#visibility-planner').getByText('Day / civil',{exact:true}).count(),0);
    const dawn=A.SearchAltitude(A.Body.Sun,new A.Observer(place.latitude,place.longitude,0),1,new Date('2026-10-25T00:00Z'),1,-18).date;
    const beforeDawn=new Date(Math.floor((+dawn-120000)/60000)*60000);
    await page.locator('#observing-time').fill(beforeDawn.toISOString().slice(0,16));
    const timeline=page.locator('.deep-sky-timeline');await timeline.locator('.deep-sky-isolated-marker').first().waitFor();
    assert.match(await timeline.textContent(),/Dots mark isolated dark samples/);
    await timeline.locator('.deep-sky-plot').screenshot({path:`/tmp/nightjar-isolated-dark-${name}.png`});
   }
   assert.match(await page.evaluate(()=>localStorage.getItem('nightjar-target-notes-v1')),/Keep this note/);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.deepEqual(errors,[]);console.log(`${name}: ${polar?'polar no-darkness':'daylight, recovery, timelines and clock change'} passed`);await page.close();
  }
 }
}finally{await browser.close()}
