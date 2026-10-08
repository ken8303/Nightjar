import {cp,mkdtemp,readdir,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {isAbsolute,join,relative,resolve,sep} from 'node:path';

async function filesIn(root){
 const files=[];
 async function visit(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isSymbolicLink())throw Error('The generated build contains a symbolic link. Rebuild before packaging.');if(entry.isDirectory())await visit(path);else if(entry.isFile())files.push(path)}}
 await visit(root);return files;
}
// A separate snapshot keeps local generated-output copies out of deployment.
// Only identical, unreferenced numbered copies of hashed generated code qualify.
export async function stageCloudflareBuild(source,temporaryParent=tmpdir()){
 const build=resolve(source);
 let config;
 try{config=JSON.parse(await readFile(join(build,'server/wrangler.json'),'utf8'))}catch{throw Error('The Cloudflare build is unavailable. Run npm run build before packaging.')}
 if(typeof config.main!=='string'||!config.main||isAbsolute(config.main)||typeof config.assets?.directory!=='string'||isAbsolute(config.assets.directory)||resolve(build,'server',config.assets.directory)!==join(build,'client'))throw Error('The generated Cloudflare configuration must use relative paths to this build’s entry and client assets. Rebuild before packaging.');
 const main=resolve(build,'server',config.main),server=join(build,'server');
 if(!main.startsWith(server+sep))throw Error('The generated Worker entry must be inside the build. Rebuild before packaging.');
 try{if(!(await stat(main)).isFile())throw Error()}catch{throw Error('The generated Worker entry is unavailable. Run npm run build before packaging.')}
 // Inspect before cp so unexpected links never escape the snapshot.
 await filesIn(build);
 const root=await mkdtemp(join(temporaryParent,'nightjar-cloudflare-'));
 try{
  await cp(build,root,{recursive:true});
  const files=await filesIn(root),content=new Map();
  const textFiles=files.filter(file=>/\.(?:js|mjs|json|css|html|map)$/.test(file));
  for(const file of textFiles)content.set(file,await readFile(file));
  const texts=textFiles.map(file=>content.get(file).toString('utf8'));
  const removedCopies=[];
  for(const file of files){
   const name=relative(root,file).split(sep).join('/');
   if(!/^(?:client\/_next\/static\/(?:chunks|css)\/|server\/)/.test(name))continue;
   if(!/[-.][A-Za-z0-9_-]{8,} (?:[2-9]|[1-9]\d+)\.(?:js|mjs|css)$/.test(name))continue;
   const original=file.replace(/ (?:[2-9]|[1-9]\d+)(?=\.(?:js|mjs|css)$)/,'');
   const originalContent=content.get(original);if(!originalContent||!originalContent.equals(content.get(file)))continue;
   const basename=file.slice(file.lastIndexOf(sep)+1);
   if(texts.some(text=>text.includes(basename)||text.includes(encodeURI(basename))))continue;
   await rm(file);removedCopies.push(name);
  }
  return {root,config:join(root,'server/wrangler.json'),removedCopies,cleanup:()=>rm(root,{recursive:true,force:true})};
 }catch(error){await rm(root,{recursive:true,force:true});throw error}
}
