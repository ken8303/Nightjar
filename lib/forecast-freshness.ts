// Planning clocks update at minute resolution. A newly fetched forecast may
// lead that snapshot by less than a minute without a device-clock correction.
export function forecastFreshness(fetchedAt:number|undefined,now:number){
 const age=fetchedAt===undefined?null:now-fetchedAt;
 return {stale:age!==null&&age>=30*60000,clockChanged:age!==null&&age< -60000};
}
