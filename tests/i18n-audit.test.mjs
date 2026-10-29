import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditCatalogues} from '../scripts/i18n-audit.mjs';
const languages=[{id:'en',label:'English'},{id:'zh-Hant',label:'繁體中文'}];
const source={hello:'Hello {name}',farewell:'Goodbye'};
test('partial catalogues report missing messages without blocking incremental translation',()=>{
 const result=auditCatalogues({en:source,'zh-Hant':{hello:'你好 {name}'}},languages);
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.reports.find(item=>item.id==='zh-Hant'),{id:'zh-Hant',total:2,translated:1,missing:['farewell']});
});
test('invalid placeholders, empty messages, unknown keys and registration errors are actionable',()=>{
 const result=auditCatalogues({en:source,'zh-Hant':{hello:'你好 {other}',farewell:' ',extra:'Text'},unused:{}},[...languages,{id:'fr',label:'Français'}]);
 assert(result.errors.some(error=>error.includes('placeholders do not match for hello')));
 assert(result.errors.some(error=>error.includes('farewell must be a non-empty string')));
 assert(result.errors.some(error=>error.includes('unknown message extra')));
 assert(result.errors.some(error=>error.includes('unused is not registered')));
 assert(result.errors.some(error=>error.includes('fr has no catalogue')));
});
test('the repository check validates actual catalogues and labels legacy counts clearly',()=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const output=execFileSync(process.execPath,['scripts/check-translations.mjs'],{cwd:root,encoding:'utf8'});
 assert.match(output,/Shared message catalogue coverage \(not overall app translation coverage\)/);
 assert.match(output,/zh-Hant: \d+\/\d+ keys; \d+ fall back to English/);
 assert.match(output,/Legacy direct tr\(\.\.\.\) calls: \d+ across \d+ files \(not all remaining untranslated text\)/);
});
