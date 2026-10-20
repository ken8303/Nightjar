import {createHash} from 'node:crypto';
/** @param {string} source @param {Array<[string,string|Uint8Array]>} files */
export function stampServiceWorker(source,files){
 const hash=createHash('sha256').update(source);
 for(const [name,content] of [...files].sort(([a],[b])=>a.localeCompare(b))){hash.update(name);hash.update('\0');hash.update(content);hash.update('\0')}
 const release=hash.digest('hex');
 const versioned=source.replace(/const CACHE = '(nightjar-offline-v\d+)';/,(_match,base)=>`const CACHE = '${base}-${release}';`);
 return `// Nightjar release: ${release}\n${versioned}`;
}
