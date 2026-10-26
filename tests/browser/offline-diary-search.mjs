import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390,820,1365]){
  const page=await browser.newPage({viewport:{width,height:1000},hasTouch:width<1000,isMobile:width<1000}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
  await page.addInitScript(()=>{
   const place={name:'Hill 星空',latitude:51.5,longitude:0,timezone:'UTC'},entry={id:'one',target:'M31',observedAt:'2026-10-08T20:00:00.000Z',place,outcome:'seen',equipment:'Binoculars',notes:'Clear <night>'};
   localStorage.setItem('nightjar-observing-diary-v1',JSON.stringify([entry,{...entry,id:'two',target:'M45',notes:'Faint cluster',place:{...place,name:'Garden'}}]));
  });
  await page.goto(new URL('/offline',base).href,{waitUntil:'load'});await page.context().setOffline(true);
  const stored=await page.evaluate(()=>localStorage.getItem('nightjar-observing-diary-v1')),before=requests.length,search=page.getByRole('searchbox',{name:'Find a saved observation'});
  await search.fill('Ｍ３１');assert.equal(await page.locator('#diary > li:visible').count(),1);assert.match(await page.locator('#diary > li:visible').textContent(),/M31/);
  await search.fill('<NIGHT>');assert.equal(await page.locator('#diary > li:visible').count(),1);assert.equal(await page.locator('#diary img').count(),0);
  await search.fill('no matching observation');await page.getByText('No saved observations match this search.',{exact:true}).waitFor();assert.equal(await page.locator('#diary > li:visible').count(),0);
  await page.getByRole('button',{name:'Clear search',exact:true}).click();assert.equal(await search.inputValue(),'');assert.equal(await page.locator('#diary > li:visible').count(),2);
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'diary-search');
  assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-observing-diary-v1')),stored);assert.equal(requests.length,before);
  await page.evaluate(()=>{localStorage.setItem('nightjar-observing-diary-v1','[]');dispatchEvent(new StorageEvent('storage',{key:'nightjar-observing-diary-v1',storageArea:localStorage}))});
  await page.locator('#snapshot-warning').waitFor();await search.fill('garden');assert.equal(await page.locator('#diary > li:visible').count(),1);assert.equal(await page.evaluate(()=>localStorage.getItem('nightjar-observing-diary-v1')),'[]');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  if(width===320)await page.locator('[aria-labelledby="diary-title"]').screenshot({path:'/tmp/nightjar-offline-search-narrow.png'});
  await page.close();console.log(`${width}: offline Unicode search, clear, unchanged storage, no requests and snapshot warning PASS`);
 }
}finally{await browser.close()}
