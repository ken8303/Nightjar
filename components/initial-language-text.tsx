import {englishMessages} from '@/lib/messages/en';
import {traditionalChineseMessages} from '@/lib/messages/zh-hant';

type InitialMessage='startup.heading'|'startup.description'|'startup.skip';
// Both variants stay in the server markup, so the early language preference can
// choose one without changing React's markup before hydration.
export default function InitialLanguageText({message}:{message:InitialMessage}){
 return <><span data-initial-language="en">{englishMessages[message]}</span><span data-initial-language="zh-Hant">{traditionalChineseMessages[message]}</span></>;
}
