import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('../',import.meta.url));
async function bundled(path){
 const bundle=await build({absWorkingDir:root,entryPoints:[path],bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
 return import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
}
const [catalogue,deep]=await Promise.all([bundled('lib/language.ts'),bundled('lib/deep-sky-names.ts')]);
const names=Object.fromEntries(catalogue.skyTargetTranslationNames.map(name=>[name,catalogue.skyTargetAlias(name,'zh-Hant')]).filter(([,label])=>label));
const deepNames=Object.fromEntries(deep.deepSkyTranslationIds.map(id=>[id,deep.deepSkyChineseName(id)]).filter(([,label])=>label));
const path=new URL('../public/offline.html',import.meta.url);let html=await readFile(path,'utf8');
for(const [variable,values] of [['offlineSkyNames',names],['offlineDeepSkyNames',deepNames]]){
 const marker=new RegExp(`const ${variable}=[^\\n]*;`);if(!marker.test(html))throw Error(`Offline ${variable} marker is missing.`);
 html=html.replace(marker,()=>`const ${variable}=${JSON.stringify(values).replace(/</g,'\\u003c')};`);
}
await writeFile(path,html);
