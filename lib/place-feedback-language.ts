import {englishMessages} from './messages/en';
import type {Translator} from './messages';

const fixedKeys=[
 'feedback.placeSaved',
 'feedback.locationSaveFailed',
 'feedback.storedSiteUnavailable',
 'feedback.siteLoaded',
 'feedback.placesLoaded',
 'feedback.placesUnavailable',
 'feedback.placesRead',
 'feedback.placesSave',
 'feedback.placeDuplicate',
 'feedback.placeDuplicateUndo',
 'feedback.placeSaveError',
 'feedback.placeRemoveError',
 'feedback.placeUndoSave',
 'feedback.placeUndoError',
 'feedback.siteNameInvalid',
 'feedback.siteNameRead',
 'feedback.siteNameChanged',
 'feedback.siteNameDuplicate',
 'feedback.siteNameCheck',
 'feedback.siteNamePlacesChanged',
 'feedback.siteNameSiteChanged',
 'feedback.siteNameFailed',
 'feedback.siteNamePartial',
 'feedback.siteNameGeneric',
 'feedback.ratingInvalid',
 'feedback.ratingPlacesRead',
 'feedback.ratingSiteRead',
 'feedback.ratingChanged',
 'feedback.ratingConflict',
 'feedback.ratingFailed',
 'feedback.ratingPartial',
 'feedback.ratingGeneric',
 'feedback.searchShort',
 'feedback.searchNone',
 'feedback.searchCancelled',
 'feedback.locationUnavailable',
 'feedback.locationCancelled',
 'feedback.searchLength',
 'feedback.searchUnreadable',
 'feedback.searchUnavailable',
 'feedback.searchTimeout',
 'feedback.searchGeneric',
 'feedback.locationDenied',
 'feedback.locationNoFix',
 'feedback.locationTimeout',
 'feedback.locationFailed',
 'feedback.placeChanged',
 'feedback.placeAlreadyRemoved',
 'feedback.placeCannotRestore',
 'feedback.placeAmbiguous',
 'feedback.placeInvalid',
 'feedback.timeRange',
] as const;

export function placeFeedback(message:string,t:Translator){
 for(const key of fixedKeys)if(message===englishMessages[key])return t(key);
 const renamed=message.match(/^([\s\S]+) saved as the site name\.$/);if(renamed)return t('feedback.placeRenamed',{place:renamed[1]});
 const removed=message.match(/^([\s\S]+) removed from saved places\. You can undo during this visit\.$/);if(removed)return t('feedback.placeRemoved',{place:removed[1]});
 const restored=message.match(/^([\s\S]+) restored to saved places\.$/);if(restored)return t('feedback.placeRestored',{place:restored[1]});
 const rating=message.match(/^Bortle class ([1-9]) saved for ([\s\S]+) on this device\.$/);if(rating)return t('feedback.ratingSaved',{rating:rating[1],place:rating[2]});
 const cleared=message.match(/^Sky darkness rating cleared for ([\s\S]+)\.$/);if(cleared)return t('feedback.ratingCleared',{place:cleared[1]});
 const full=message.match(/^Your (\d+)-place list is full\. This removal cannot be undone until there is space\.$/);if(full)return t('feedback.placeListFull',{count:full[1]});
 const limit=message.match(/^You can save up to (\d+) places\. Remove a saved place before adding another\.$/);if(limit)return t('feedback.placeLimit',{count:limit[1]});
 return message;
}
