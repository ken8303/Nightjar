import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,relative,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {findLiteralCandidates} from './i18n-literals.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const args=process.argv.slice(2),json=args.includes('--json'),paths=args.filter(arg=>arg!=='--json');
if(paths.some(path=>path.startsWith('-')))throw Error('Usage: node scripts/find-untranslated-jsx.mjs [--json] [app-or-components-path ...]');
const allowed=['app','components'].map(path=>resolve(root,path));
const within=(file,parent)=>file===parent||file.startsWith(parent+sep);
async function files(path){
 const info=await stat(path);
 if(info.isDirectory())return (await Promise.all((await readdir(path)).map(name=>files(resolve(path,name))))).flat();
 return extname(path)==='.tsx'?[path]:[];
}
const selected=paths.length?paths.map(path=>resolve(root,path)):allowed;
if(selected.some(path=>!allowed.some(parent=>within(path,parent))))throw Error('Choose paths within app/ or components/.');
const candidates=[];
for(const file of (await Promise.all(selected.map(files))).flat().sort()){
 for(const item of findLiteralCandidates(await readFile(file,'utf8'),file))candidates.push({file:relative(root,file),...item});
}
if(json)console.log(JSON.stringify(candidates,null,2));
else{
 console.log('Possible untranslated JSX text and attributes (manual review required; not a coverage percentage):');
 for(const item of candidates)console.log(`${item.file}:${item.line}:${item.column} [${item.kind}] ${item.text}`);
 console.log(`${candidates.length} candidates; dynamic text, exports and offline HTML are not scanned.`);
}
