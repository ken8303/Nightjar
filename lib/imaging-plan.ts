import {numberEntryValue} from './number-entry';
import {fieldOfView,imageScale,mosaic,validImagingEquipment} from './photography';
import type {PhotographyDraft} from './photography-draft';

// The imaging tools and atlas must validate exactly the same raw draft.
export function imagingPlan(draft:PhotographyDraft){
 const number=(text:string)=>numberEntryValue(text)??NaN;
 const values={width:number(draft.width),height:number(draft.height),focal:number(draft.focal),pixel:number(draft.pixel),ra:number(draft.ra),dec:number(draft.dec),cols:number(draft.cols),rows:number(draft.rows),overlap:number(draft.overlap),rotation:number(draft.rotation),rms:number(draft.rms)};
 const equipment={name:draft.name,width:values.width,height:values.height,focal:values.focal,pixel:values.pixel};
 const valid=validImagingEquipment(equipment),w=valid?fieldOfView(values.width,values.focal):0,h=valid?fieldOfView(values.height,values.focal):0,scale=valid?imageScale(values.pixel,values.focal):0;
 let panels:ReturnType<typeof mosaic>=[],mosaicError='';
 try{
  if(!valid)throw Error('Enter valid equipment dimensions first.');
  if([draft.ra,draft.dec,draft.cols,draft.rows,draft.overlap,draft.rotation].some(value=>value.trim()===''))throw Error('Complete all mosaic fields.');
  if(Math.abs(values.rotation)>360)throw Error('Use a grid rotation between −360° and 360°.');
  panels=mosaic(values.ra,values.dec,w,h,values.cols,values.rows,values.overlap,values.rotation);
 }catch(error){mosaicError=error instanceof Error?error.message:'Mosaic is unavailable.'}
 return {values,equipment,valid,w,h,scale,panels,mosaicError};
}
