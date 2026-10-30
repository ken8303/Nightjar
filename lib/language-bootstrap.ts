import {languageKey} from './language';
// Read the saved choice before the server-rendered loading view paints.
// The default document language remains English when storage is unavailable.
export const languageBootstrap=`try{document.documentElement.lang=localStorage.getItem('${languageKey}')==='zh-Hant'?'zh-Hant':'en'}catch{}`;
