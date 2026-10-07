import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {documentPreviewHTML,isDocumentPreviewClose,documentPreviewCloseMessage}=await vite.ssrLoadModule('/lib/document-preview.ts');
const {printableObservingPlan}=await vite.ssrLoadModule('/lib/observing-plan.ts');
test('preview retains escaped export content and adds a frame-local Escape bridge without changing the download',()=>{
 const html=printableObservingPlan({date:new Date('2026-10-07T20:00Z'),place:{name:'QA </head><script>bad()</script>',latitude:51.5,longitude:0,timezone:'Europe/London'},targets:[{name:'Vega',altitude:50,azimuth:270}],notes:{Vega:'</body><script>bad()</script>\n星空'},equipment:[]});
 const preview=documentPreviewHTML(html);
 assert(preview.includes('星空'));assert(preview.includes('&lt;script&gt;bad()&lt;/script&gt;'));assert(!preview.includes('<script>bad()'));
 assert(preview.includes('.print-controls{display:none}'));assert(preview.includes("event.key==='Escape'"));assert(preview.includes(documentPreviewCloseMessage));assert(html.includes('id="print-plan"'));assert(!html.includes(documentPreviewCloseMessage));
 assert.equal([...preview.matchAll(/<script>/g)].length,2);assert(!/<[^>]+\b(?:src|href)\s*=/i.test(preview));
});
test('only the current preview frame may request closure',()=>{
 const frame={},other={};
 assert(isDocumentPreviewClose({source:frame,data:documentPreviewCloseMessage},frame));
 for(const event of [{source:other,data:documentPreviewCloseMessage},{source:frame,data:'other'},{source:null,data:documentPreviewCloseMessage},{source:frame,data:{message:documentPreviewCloseMessage}}])assert.equal(isDocumentPreviewClose(event,frame),false);
 assert.equal(isDocumentPreviewClose({source:null,data:documentPreviewCloseMessage},null),false);
});
