import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';

export function stampServiceWorker(source:string,files:[string,string|Uint8Array][]){
 const hash=createHash('sha256').update(source);
 for(const [name,content] of [...files].sort(([a],[b])=>a.localeCompare(b))){hash.update(name);hash.update('\0');hash.update(content);hash.update('\0')}
 return `// Nightjar release: ${hash.digest('hex')}\n${source}`;
}
// Keep the worker URL stable, but change its bytes when the built app changes.
export function nightjarRelease():Plugin{
 let root='';
 return {
  name:'nightjar-release',apply:'build',applyToEnvironment:environment=>environment.name==='client',
  configResolved:config=>{root=config.root},
  async writeBundle(options,bundle){
   if(!options.dir)throw Error('Nightjar release requires a client output directory');
   const source=await readFile(resolve(root,'public/sw.js'),'utf8');
   const offline=await readFile(resolve(root,'public/offline.html'),'utf8');
   const files:[string,string|Uint8Array][]=[['offline.html',offline]];
   for(const [name,output] of Object.entries(bundle))files.push([name,output.type==='chunk'?output.code:output.source]);
   await writeFile(resolve(root,options.dir,'sw.js'),stampServiceWorker(source,files));
  },
 };
}
