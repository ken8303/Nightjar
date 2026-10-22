// Read only the standard browser error code, never provider-supplied text.
export function deviceLocationError(error:unknown){
 const code=error&&typeof error==='object'&&'code' in error?error.code:undefined;
 const recovery=' Your selected observing site is unchanged. Search for a town or enter coordinates instead.';
 if(code===1)return 'Location permission was denied. To use device location, allow location access for this site in your browser and device settings.'+recovery;
 if(code===2)return 'Your device could not determine its location. Check that location services are enabled, then try again.'+recovery;
 if(code===3)return 'The location request timed out. Try again when your device can get a location fix.'+recovery;
 return 'Device location could not be accessed. Try again or check your browser and device location settings.'+recovery;
}
