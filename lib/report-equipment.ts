import {readEquipmentProfiles} from './saved-collections';
export const reportEquipmentLimit=100;
export function readReportEquipment(storage:Pick<Storage,'getItem'>){
 try{const profiles=readEquipmentProfiles(storage);return {equipment:profiles.slice(0,reportEquipmentLimit),equipmentUnavailable:false,equipmentOmitted:Math.max(0,profiles.length-reportEquipmentLimit)}}
 catch{return {equipment:[],equipmentUnavailable:true,equipmentOmitted:0}}
}
