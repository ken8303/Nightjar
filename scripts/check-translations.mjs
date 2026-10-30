import {readFile,readdir} from 'node:fs/promises';
import {dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import ts from 'typescript';
import {auditCatalogues} from './i18n-audit.mjs';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const args=new Set(process.argv.slice(2));
if([...args].some(arg=>arg!=='--strict'))throw Error('Usage: node scripts/check-translations.mjs [--strict]');
const result=await build({stdin:{contents:"export {messageCatalogues} from './lib/messages/index.ts'; export {supportedLanguages} from './lib/language.ts';",resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {messageCatalogues,supportedLanguages}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
const audit=auditCatalogues(messageCatalogues,supportedLanguages);
console.log('Shared message catalogue coverage (not overall app translation coverage):');
for(const report of audit.reports){
 console.log(`  ${report.id}: ${report.translated}/${report.total} keys; ${report.missing.length} fall back to English`);
 if(report.missing.length)console.log(`    Missing: ${report.missing.join(', ')}`);
}
for(const error of audit.errors)console.error(`  Error: ${error}`);

async function sourceFiles(directory){
 const files=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory())files.push(...await sourceFiles(path));
  else if(entry.isFile()&&/\.(?:ts|tsx)$/.test(entry.name)&&!entry.name.endsWith('.d.ts'))files.push(path);
 }
 return files;
}
const files=(await Promise.all(['app','components','lib'].map(name=>sourceFiles(join(root,name))))).flat();
const legacy=[];
for(const file of files){
 const text=await readFile(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 let count=0;
 function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='tr')count++;ts.forEachChild(node,visit)}
 visit(source);if(count)legacy.push({file:relative(root,file),count});
}
legacy.sort((a,b)=>b.count-a.count||a.file.localeCompare(b.file));
console.log(`Legacy direct tr(...) calls: ${legacy.reduce((sum,item)=>sum+item.count,0)} across ${legacy.length} files (not all remaining untranslated text).`);
for(const item of legacy.slice(0,10))console.log(`  ${item.file}: ${item.count}`);
if(audit.errors.length||(args.has('--strict')&&audit.reports.some(report=>report.missing.length)))process.exitCode=1;
