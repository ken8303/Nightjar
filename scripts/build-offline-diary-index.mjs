import {readFile,writeFile} from 'node:fs/promises';
const path=new URL('../public/offline.html',import.meta.url);
const sources=await Promise.all(['../data/messier.json','../data/additional-deep-sky.json'].map(async name=>JSON.parse(await readFile(new URL(name,import.meta.url),'utf8'))));
const index=Object.fromEntries(sources.flat().map(target=>[target.id,[target.name,target.catalogue,...(target.crossReferences??[])].join(' ')]));
const html=await readFile(path,'utf8'),marker=/const diaryCatalogueNames=[^\n]*;/;
if(!marker.test(html))throw Error('Offline diary index marker is missing.');
await writeFile(path,html.replace(marker,()=>`const diaryCatalogueNames=${JSON.stringify(index).replace(/</g,'\\u003c')};`));
