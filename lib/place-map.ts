type Coordinates={latitude:number;longitude:number};
// HTTPS opens Maps on supported Apple devices and remains a web link elsewhere.
// Use the exact observing point; rounded display coordinates can move the pin.
export function placeAppleMapsLink({latitude,longitude,name}:Coordinates&{name:string}):string|null{
 if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)return null;
 const query=new URLSearchParams({ll:`${latitude},${longitude}`,q:name});
 return `https://maps.apple.com/?${query}`;
}
// A square Web Mercator map ends at atan(sinh(pi)), short of either pole.
export const placeMapLatitudeLimit=Math.atan(Math.sinh(Math.PI))*180/Math.PI;
export function placeMapSource({latitude,longitude}:Coordinates):string|null{
 // An effectively zero-height view at the edge cannot reliably frame a pin
 // within the provider's zoom limits. This margin affects the map only.
 if(!Number.isFinite(latitude)||placeMapLatitudeLimit-Math.abs(latitude)<.0001||!Number.isFinite(longitude)||Math.abs(longitude)>180)return null;
 // Shrink both sides together: clipping only the northern/southern bound
 // puts a near-edge site's pin outside the visible map instead of centring it.
 const radius=Math.min(.08,placeMapLatitudeLimit-Math.abs(latitude));
 const south=latitude-radius,north=latitude+radius;
 // Keep the view's shape when shrinking; a wide longitude interval otherwise
 // zooms out until the provider's world-edge constraint clips the pin again.
 const longitudeRadius=.12*(radius/.08);
 // Unwrapped longitude bounds keep a small view continuous at the date line.
 return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-longitudeRadius}%2C${south}%2C${longitude+longitudeRadius}%2C${north}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}
