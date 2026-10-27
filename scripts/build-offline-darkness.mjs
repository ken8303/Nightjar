import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({absWorkingDir:root,entryPoints:['lib/offline-darkness.ts'],bundle:true,format:'esm',platform:'browser',alias:{'@':root},minify:true,legalComments:'inline',outfile:'public/offline-darkness.mjs'});
