import type {Language} from '../language';
import {englishMessages,type MessageKey} from './en';
import {traditionalChineseMessages} from './zh-hant';

// Translations can be added incrementally; untranslated keys use English.
export const messageCatalogues:Readonly<Record<Language,Readonly<Partial<Record<MessageKey,string>>>>>=
 {en:englishMessages,'zh-Hant':traditionalChineseMessages};
type Placeholders<S extends string>=S extends `${string}{${infer Name}}${infer Rest}`?Name|Placeholders<Rest>:never;
type MessageArgs<K extends MessageKey>=Placeholders<(typeof englishMessages)[K]> extends never?[]:[values:Record<Placeholders<(typeof englishMessages)[K]>,string|number>];
export type Translator=<K extends MessageKey>(key:K,...args:MessageArgs<K>)=>string;
export function createTranslator(language:Language):Translator{
 return <K extends MessageKey>(key:K,...args:MessageArgs<K>)=>{
  const template=messageCatalogues[language]?.[key]??englishMessages[key];
  const values=args[0] as Record<string,string|number>|undefined;
  // One pass prevents braces in a user's place name or error text being interpreted.
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(match,name:string)=>values&&Object.prototype.hasOwnProperty.call(values,name)?String(values[name]):match);
 };
}
