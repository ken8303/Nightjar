import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {stageCloudflareBuild} from './stage-cloudflare-build.mjs';
const [mode,...args]=process.argv.slice(2);
if(!['check','deploy'].includes(mode))throw Error('Expected check or deploy.');
if(args.some(arg=>arg==='--config'||arg==='-c'||arg.startsWith('--config=')))throw Error('Use the generated build configuration; configuration overrides are not supported.');
if(mode==='check'&&args.length&&(args.length!==2||args[0]!=='--outdir'||!args[1]||args[1].startsWith('-')))throw Error('Packaging checks accept only an optional --outdir path and always run without publishing.');
const stage=await stageCloudflareBuild(fileURLToPath(new URL('../dist/',import.meta.url)));
let code=1;
try{
 console.log(`Prepared isolated Cloudflare build; omitted ${stage.removedCopies.length} identical unreferenced generated copies.`);
 const result=spawnSync(process.execPath,['--import',fileURLToPath(new URL('./sites-env.mjs',import.meta.url)),fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url)),'deploy','--config',stage.config,...(mode==='check'?['--dry-run']:[]),...args],{stdio:'inherit'});
 if(result.error)throw result.error;
 code=result.status??1;
}finally{await stage.cleanup()}
process.exitCode=code;
