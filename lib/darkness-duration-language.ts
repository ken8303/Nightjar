import {darknessDuration} from './darkness-remaining';
import {createTranslator} from './messages';
import type {Language} from './language';

export function localizedDarknessDuration(start:Date,end:Date,language:Language='en'){
 const english=darknessDuration(start,end);if(language!=='zh-Hant')return english;
 const t=createTranslator(language),minutes=Math.floor((+end-+start)/60000);
 if(minutes<1)return t('plan.durationShort');
 return [Math.floor(minutes/60)?t('plan.durationHours',{hours:Math.floor(minutes/60)}):'',minutes%60?t('plan.durationMinutes',{minutes:minutes%60}):''].filter(Boolean).join('');
}
