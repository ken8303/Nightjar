import type {MessageKey} from './en';

// Missing translations fall back to English; placeholder names must match English.
export const traditionalChineseMessages={
 'language.label':'語言',
 'language.storageError':'無法儲存語言設定；本次使用期間仍會套用。',
 'siteDarkness.label':'你的天空黑暗度評級',
 'siteDarkness.unrated':'尚未評級',
 'siteDarkness.class':'Bortle {class} 級',
 'siteDarkness.darkest':' · 最暗',
 'siteDarkness.brightest':' · 最亮',
 'siteDarkness.help':'根據自己的觀測評級：1 級最暗，9 級為明亮的市中心天空。評級儲存於此裝置，不會改變天氣評分。',
 'siteDarkness.link':'如何評估天空黑暗度 ↗',
 'weather.refreshingPrevious':'正在更新天氣，顯示先前預報。',
 'weather.fetching':'正在取得天氣預報…',
 'weather.failedPrevious':'更新失敗，顯示先前預報。請重試以更新。',
 'weather.failed':'無法取得預報：{error}',
 'weather.fetched':'預報取得時間：{stamp}{age}。',
 'weather.staleAge':'（已超過 30 分鐘）',
 'weather.lastUpdate':' 上次成功更新：{stamp}。',
 'weather.retrySevenNights':'重試七夜預報',
 'weather.refreshSevenNights':'更新七夜預報',
 'weather.retry':'重試預報',
 'weather.refresh':'更新天氣',
 'weather.refreshing':'正在更新…',
 'weather.staleNotice':'此天氣資料已超過 30 分鐘。使用觀測評分或平均雲量前，請先更新。',
 'weather.clockNotice':'預報更新時間比裝置時鐘還晚，無法確認資料時效。請檢查裝置時鐘並更新預報。',
} satisfies Partial<Record<MessageKey,string>>;
