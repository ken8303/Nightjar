import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {checkClientRelease} from './release-assets.mjs';
import {stageCloudflareBuild} from './stage-cloudflare-build.mjs';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
let stage;
try{
 if(process.argv.length>2)throw Error('Release asset checks use this project’s dist build and accept no overrides.');
 stage=await stageCloudflareBuild(join(projectRoot,'dist'));
 console.log(JSON.stringify({...await checkClientRelease(stage.root,projectRoot),omittedCopies:stage.removedCopies.length}));
}catch(error){console.error(error instanceof Error?error.message:'Release asset verification failed.');process.exitCode=1}
finally{await stage?.cleanup()}
