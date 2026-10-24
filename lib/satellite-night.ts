import {A,isAstronomicalNight,observer,type Place} from './sky';
import type {SatellitePassResult} from './satellite-passes';

// The orbit worker uses its own approximate Sun model. Apply the planner's
// geometric astronomical-darkness definition to the returned display times.
export function fullDarknessPasses(result:SatellitePassResult,place:Place):SatellitePassResult{
 const passes=result.passes.filter(pass=>{
  if(!Number.isFinite(pass.rise)||!Number.isFinite(pass.set)||pass.set<pass.rise||pass.peak<pass.rise||pass.peak>pass.set||pass.set-pass.rise>86400000)return false;
  const times=[pass.rise,pass.peak,pass.set];
  for(const window of pass.viewing??[]){
   if(window.start<pass.rise||window.end>pass.set||window.end<window.start)return false;
   times.push(window.start,window.end,Math.floor(window.start+(window.end-window.start)/2));
  }
  for(let time=pass.rise;time<pass.set;time+=30000)times.push(time);
  if(!times.every(time=>isAstronomicalNight(new Date(time),place)))return false;
  // A very short bright interval near a pole can fall between sample times.
  // A rising crossing would end full darkness even if both endpoints are dark.
  return pass.set===pass.rise||A.SearchAltitude(A.Body.Sun,observer(place),1,new Date(pass.rise),(pass.set-pass.rise)/86400000,-18)===null;
 });
 return {...result,passes};
}
