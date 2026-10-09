import {validateAuroraFeed} from './aurora';

const unavailable='NOAA’s aurora feed is temporarily unavailable. Try again shortly.';

export async function readAuroraResponse(response:Pick<Response,'ok'|'json'>){
 if(!response.ok)throw Error(unavailable);
 let raw:unknown;
 try{raw=await response.json()}catch(error){
  if(error instanceof Error&&error.name==='AbortError')throw error;
  throw Error('Aurora response is unreadable. Please retry.');
 }
 return validateAuroraFeed(raw);
}

export function auroraFailureMessage(error:unknown){
 if(error instanceof Error&&error.name==='AbortError')return 'Aurora request timed out. Please retry.';
 if(error instanceof TypeError||!(error instanceof Error))return unavailable;
 return error.message||unavailable;
}
