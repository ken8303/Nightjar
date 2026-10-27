import type {Place} from './sky';
const extensions={'observing-summary':'txt',targets:'txt',plan:'html','deep-sky-plan':'html'} as const;
export function observingExportFilename(kind:keyof typeof extensions,place:Place,date:Date){
 // Bound Unicode code points so the full UTF-8 filename fits common file
 // systems, and remove path separators, controls and reserved punctuation.
 const cleaned=place.name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');
 const site=Array.from(cleaned).slice(0,40).join('').replace(/-+$/,'')||'site';
 return `nightjar-${kind}-${site}-${date.toISOString().replace(/[:.]/g,'-')}.${extensions[kind]}`;
}
