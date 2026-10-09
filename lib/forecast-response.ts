import {parseWeatherForecast} from './weather-hours';

const unavailable='Forecast unavailable. Please try again.';

export async function readForecastResponse(response:Pick<Response,'ok'|'json'>){
 if(!response.ok)throw Error(unavailable);
 let raw:unknown;
 try{raw=await response.json()}catch(error){
  if(error instanceof Error&&error.name==='AbortError')throw error;
  throw Error('Forecast response could not be read. Please retry.');
 }
 return parseWeatherForecast(raw);
}

export function forecastFailureMessage(error:unknown){
 if(error instanceof Error&&error.name==='AbortError')return 'Weather request timed out. Please retry.';
 if(error instanceof TypeError||!(error instanceof Error))return unavailable;
 return error.message||unavailable;
}
