import type {SatellitePassResult} from './satellite-passes';

export function satellitePassSummary(result:SatellitePassResult){
 const count=result.passes.length,windows=result.passes.reduce((sum,pass)=>sum+(pass.viewing?.length??0),0),unavailable=result.passes.filter(pass=>pass.viewing===null).length;
 return `${count} geometric ${count===1?'pass':'passes'} found in this search window. ${windows} modelled observing ${windows===1?'window matches':'windows match'} the criteria.${unavailable?` Window calculations are unavailable for ${unavailable} ${unavailable===1?'pass':'passes'}.`:''}`;
}
