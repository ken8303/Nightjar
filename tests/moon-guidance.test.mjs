import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {moonObservingAdvice}=await vite.ssrLoadModule('/lib/moon-guidance.ts');
test('moon advice distinguishes horizon position from illumination',()=>{
 for(const illumination of [.1,.8,1])assert.match(moonObservingAdvice({illumination,altitude:-1}),/at or below your ideal horizon/);
 assert.match(moonObservingAdvice({illumination:1,altitude:0}),/at or below your ideal horizon/);
 assert.match(moonObservingAdvice({illumination:.71,altitude:.1}),/bright Moon above the horizon/);
 assert.match(moonObservingAdvice({illumination:.7,altitude:.1}),/Moon is above your ideal horizon/);
 assert.match(moonObservingAdvice({illumination:.1,altitude:.1}),/Moonlight can reduce contrast/);
});
