import {englishMessages} from './messages/en';
import type {Language} from './language';
import type {Translator} from './messages';
const statusKeys=["bright.statusSavedRead", "bright.statusNotesRefreshed", "bright.statusNotesRead", "bright.statusNotesLoadedPending", "bright.statusNotesLoaded", "bright.statusNotesUnavailable", "bright.statusNotesSaved", "bright.statusReview", "bright.statusDuplicateNote", "bright.statusTargetsLoaded", "bright.statusListDownloaded", "bright.statusListFailed", "bright.statusPlanDownloaded", "bright.statusPlanFailed", "bright.statusReviewCancelled", "bright.statusListFull", "bright.statusInvalidTargets", "bright.statusInvalidNotes", "bright.statusNotesTooMany", "bright.statusNotesConflict", "bright.statusNotesConflictAgain", "bright.statusReviewChanged", "bright.statusNoRecovery", "bright.statusRecoveryLarge","bright.statusNotesReadFailed","bright.statusRecoveryFailed","bright.statusVersionsUnavailable","bright.statusReviewSaveFailed","bright.statusTargetsReadFailed","bright.statusTargetsUnavailable","bright.statusTargetChangeFailed","bright.statusUndoFailed","bright.statusInvalidList","bright.statusNotesLarge","bright.statusOriginalUnavailable","bright.statusRecoveryTime"] as const;
export function brightFeedback(value:string,language:Language,t:Translator){
  if(language==='en'||!value)return value;
  const key=statusKeys.find(key=>englishMessages[key]===value);if(key)return t(key);
  const suffix=englishMessages['bright.statusSaveSuffix'];if(value.endsWith(suffix)){const reason=value.slice(0,-suffix.length).trim(),matched=statusKeys.find(key=>englishMessages[key]===reason);return (matched?t(matched)+' ':reason?reason+' ':'')+t('bright.statusSaveSuffix')}
  const already=/^(.+) is already saved\. Your current list was kept\.$/.exec(value);if(already)return t('bright.statusAlreadySaved',{name:already[1]});
  const restored=/^(.+) restored to your targets\.$/.exec(value);if(restored)return t('bright.statusRestored',{name:restored[1]});
  const recovery=/^Recovery copy of (\d+) unsaved notes? prepared for download\. Keep the file for manual recovery; it cannot be imported as a plan backup\. Your edits remain unsaved\.$/.exec(value);if(recovery)return t('bright.statusRecoveryCopy',{count:recovery[1]});
  return value;
}
