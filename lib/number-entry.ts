// Parse entered decimals without Number's empty/hex/grouping coercions.
// Retain raw text separately so incomplete or invalid drafts can be recovered.
export function numberEntryValue(value:string):number|null{
 const raw=value.normalize('NFKC').trim().replace(/^−/,'-');
 if(!/^[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[-+]?\d+)?$/i.test(raw))return null;
 const number=Number(raw.replace(',','.'));
 return Number.isFinite(number)?number:null;
}
