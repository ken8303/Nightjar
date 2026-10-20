import {readFile,readdir} from 'node:fs/promises';
import {join,dirname,resolve,relative,sep} from 'node:path';
import {stampServiceWorker} from './release-hash.mjs';

async function filesIn(root){
 const files=[];
 async function visit(directory){
  for(const item of await readdir(directory,{withFileTypes:true})){
   const path=join(directory,item.name);
   if(item.isSymbolicLink())throw Error('Release assets must not contain symbolic links.');
   if(item.isDirectory())await visit(path);
   else if(item.isFile())files.push(relative(root,path).split(sep).join('/'));
  }
 }
 await visit(root);return files;
}
/** Verify an already isolated build; this function never mutates its inputs. */
export async function checkClientRelease(buildRoot,sourceRoot){
 const client=resolve(buildRoot,'client'),publicRoot=resolve(sourceRoot,'public');
 const files=await filesIn(client),publicNames=new Set(await filesIn(publicRoot));
 const source=await readFile(join(publicRoot,'sw.js'),'utf8');
 if(!/const CACHE = 'nightjar-offline-v\d+';/.test(source))throw Error('The offline worker must declare a versioned Nightjar cache.');
 // Vinext adds its two legacy manifests and Cloudflare adds _headers after
 // writeBundle. Public files are copied separately; recovery files are explicit.
 const inputNames=files.filter(name=>!publicNames.has(name)&&name!=='_headers'&&!/\/_(?:build|ssg)Manifest\.js$/.test(name));
 const inputs=await Promise.all([...inputNames,'offline.html','planner-recovery.mjs'].map(async name=>{
  let bytes=await readFile(join(client,name));
  // Cloudflare appends this one ignore entry after the client bundle is stamped.
  if(name==='.assetsignore')bytes=Buffer.from(bytes.toString().replace(/\.vite\n$/,''));
  return [name,bytes];
 }));
 const expected=stampServiceWorker(source,inputs),worker=await readFile(join(client,'sw.js'),'utf8');
 if(worker!==expected)throw Error('The offline worker fingerprint does not match the generated app and recovery files. Rebuild before packaging.');
 let references=0;
 for(const name of files.filter(name=>/\.(?:m?js|css)$/.test(name))){
  const text=await readFile(join(client,name),'utf8');
  for(const match of text.matchAll(/(["'])(\.{1,2}\/[^"'\n]+\.(?:m?js|css))\1/g)){
   let target;try{target=resolve(dirname(join(client,name)),decodeURIComponent(match[2]))}catch{throw Error(`Invalid encoded asset reference in ${name}.`)}
   if(!target.startsWith(client+sep))throw Error(`A generated import leaves the client build: ${name}.`);
   try{await readFile(target)}catch{throw Error(`Missing generated import ${match[2]} from ${name}.`)}
   references++;
  }
 }
 for(const name of ['offline.html','planner-recovery.mjs','manifest.webmanifest']){
  if(!(await readFile(join(client,name))).equals(await readFile(join(publicRoot,name))))throw Error(`Built ${name} differs from its public source. Rebuild before packaging.`);
 }
 const manifest=JSON.parse(await readFile(join(client,'manifest.webmanifest'),'utf8'));
 if(manifest.id!=='/'||manifest.start_url!=='/'||manifest.scope!=='/'||manifest.display!=='standalone')throw Error('The built app manifest has unexpected identity, scope or display settings.');
 const signature=Buffer.from([137,80,78,71,13,10,26,10]);
 for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['maskable-512.png',512],['apple-touch-icon.png',180]]){
  const bytes=await readFile(join(client,'icons',name));
  if(bytes.length<24||!bytes.subarray(0,8).equals(signature)||bytes.readUInt32BE(16)!==size||bytes.readUInt32BE(20)!==size)throw Error(`Invalid built app icon: ${name}.`);
  if(!bytes.equals(await readFile(join(publicRoot,'icons',name))))throw Error(`Built icon ${name} differs from its public source. Rebuild before packaging.`);
 }
 return {release:expected.match(/^\/\/ Nightjar release: ([a-f0-9]{64})/)[1],inputs:inputs.length,references,clientFiles:files.length,manifestIcons:'pass',recoveryBytes:'pass'};
}
