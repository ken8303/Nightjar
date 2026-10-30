import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8788/');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Nightjar server.');
const browser=await chromium.launch({headless:true,executablePath:process.env.NIGHTJAR_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:process.env.NIGHTJAR_CHROMIUM_NO_SANDBOX==='1'?['--no-sandbox']:[]});
try{
 for(const width of [320,390])for(const language of ['en','zh-Hant']){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:true,isMobile:true});page.setDefaultTimeout(20000);await page.addInitScript(({origin,language})=>{if(location.origin===origin)localStorage.setItem('nightjar-language-v1',language)},{origin:base.origin,language});
  await page.route('**/*.js',route=>route.abort());await page.goto(base.href,{waitUntil:'domcontentloaded'});assert.equal(await page.locator('html').getAttribute('lang'),language);const startup=page.locator('.startup-loading');await startup.waitFor();assert.equal(await startup.locator('h1').innerText(),language==='en'?'Getting your sky ready…':'正在準備你的星空…');assert.equal(await page.locator('.skip-link').innerText(),language==='en'?'Skip to planner':'跳至規劃器');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.close();console.log(`${width} ${language}: saved language applied before app scripts`);
 }
}finally{await browser.close()}
