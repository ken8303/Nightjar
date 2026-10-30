import {englishMessages} from './messages/en';
import type {Translator} from './messages';

const fixedKeys=[
 'diaryFeedback.saved',
 'diaryFeedback.updated',
 'diaryFeedback.formsSaved',
 'diaryFeedback.observationsLoaded',
 'diaryFeedback.diaryUnreadable',
 'diaryFeedback.formsLoadedChanges',
 'diaryFeedback.formsLoaded',
 'diaryFeedback.formsUnavailable',
 'diaryFeedback.formsSaveRetry',
 'diaryFeedback.formsSaveFailed',
 'diaryFeedback.formCopyFailed',
 'diaryFeedback.formsNoConflict',
 'diaryFeedback.formsReadFailed',
 'diaryFeedback.formReviewChanged',
 'diaryFeedback.formsResolveFailed',
 'diaryFeedback.formCleared',
 'diaryFeedback.formNew',
 'diaryFeedback.editingAlready',
 'diaryFeedback.editReplace',
 'diaryFeedback.observationsUnavailable',
 'diaryFeedback.observationChanged',
 'diaryFeedback.draftChanged',
 'diaryFeedback.observationSaveFailed',
 'diaryFeedback.removalFailed',
 'diaryFeedback.restoredAlready',
 'diaryFeedback.restoreFailed',
 'diaryFeedback.downloadFailed',
 'diaryFeedback.noLongerSaved',
 'diaryFeedback.changedElsewhere',
 'diaryFeedback.fullRestore',
 'diaryFeedback.copyTime',
 'diaryFeedback.copyTooLarge',
 'diaryFeedback.editFirst',
 'diaryFeedback.storageUnavailable',
 'diaryFeedback.formsTooLarge',
 'diaryFeedback.formsInvalid',
 'diaryFeedback.formsRestored',
 'diaryFeedback.formsRestoreFailed',
 'diaryFeedback.editReviewChanged',
 'diaryFeedback.formReviewChangedAgain',
 'diaryFeedback.editChangedElsewhere',
 'diaryFeedback.saveStorage',
 'diaryFeedback.invalidEntries',
] as const;

export function diaryFeedback(message:string,t:Translator){
 for(const key of fixedKeys)if(message===englishMessages[key])return t(key);
 {const match=message.match(/^The diary holds up to (\d+) entries\. Export a backup, then remove older saved entries to free space\.$/);if(match)return t('diaryFeedback.limit',{count:match[1]});}
 {const match=message.match(/^([\s\S]+) unfinished form restored\.$/);if(match)return t('diaryFeedback.formRestored',{target:match[1]});}
 {const match=message.match(/^The unfinished ([\s\S]+) form changed in another tab\. Your text is retained here; review the latest form before replacing it\.$/);if(match)return t('diaryFeedback.formConflict',{target:match[1]});}
 {const match=message.match(/^([\s\S]+) observation removed\. Undo is available until the next removal or leaving Sky atlas\. Unfinished form text is kept\.$/);if(match)return t('diaryFeedback.observationRemoved',{target:match[1]});}
 {const match=message.match(/^([\s\S]+) observation restored with its original site and time\.$/);if(match)return t('diaryFeedback.observationRestored',{target:match[1]});}
 const copy=message.match(/^Recovery copy prepared with (\d+) unfinished (form|forms) from this view\. Verify the file is saved before leaving; it cannot be imported as a plan backup\.$/);if(copy)return t(copy[2]==='form'?'diaryFeedback.copyOne':'diaryFeedback.copyMany',{count:copy[1]});
 const report=message.match(/^(\d+) saved observation(s?) prepared as (an offline report\. Open the file to print or save as PDF|CSV\. Open the file in a spreadsheet)\. Unsaved form edits are excluded\.$/);if(report){const one=!report[2],csv=report[3].startsWith('CSV');return t(csv?(one?'diaryFeedback.csvOne':'diaryFeedback.csvMany'):(one?'diaryFeedback.reportOne':'diaryFeedback.reportMany'),{count:report[1]})}
 return message;
}
