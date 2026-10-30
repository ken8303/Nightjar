import {darknessSummaryLines,remainingDarkness} from './darkness-remaining';
import {localizedDarknessDuration} from './darkness-duration-language';
import {createTranslator} from './messages';
import type {Language} from './language';
import type {Place} from './sky';

export function localizedDarknessSummaryLines(date:Date,place:Place,language:Language='en'){
 const darkness=remainingDarkness(date,place);
 if(language!=='zh-Hant')return darknessSummaryLines(date,place,darkness);
 const t=createTranslator(language);
 return darkness?.end?[t('textPlan.remaining',{duration:localizedDarknessDuration(date,darkness.end,language)}),t('textPlan.ends',{time:darkness.end.toISOString()})]:[darkness?t(darkness.dateLimited?'textPlan.endLimit':'textPlan.end48'):t('textPlan.outside')];
}
