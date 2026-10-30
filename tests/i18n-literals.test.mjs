import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {findLiteralCandidates} from '../scripts/i18n-literals.mjs';

test('literal inventory reports visible JSX and labels without treating translated expressions as literals',()=>{
 const source=`function View(){return <section aria-label="Search sky"><h2>Find a target</h2><p>{t('view.loading')}</p><button title="Open map">{'Explore'}</button><span>12°</span></section>}`;
 const entries=findLiteralCandidates(source);
 assert.deepEqual(entries.map(({kind,text})=>({kind,text})),[{kind:'attribute',text:'Search sky'},{kind:'text',text:'Find a target'},{kind:'attribute',text:'Open map'},{kind:'text',text:'Explore'}]);
 assert(entries.every(entry=>entry.line===1&&entry.column>0));
});
test('literal inventory can scope output to one component as machine-readable candidates',()=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const output=execFileSync(process.execPath,['scripts/find-untranslated-jsx.mjs','--json','components/satellite-tracker.tsx'],{cwd:root,encoding:'utf8'});
 const entries=JSON.parse(output);assert(entries.length>0);assert(entries.every(entry=>entry.file==='components/satellite-tracker.tsx'));
});
