import { routing } from '../src/i18n/routing';

// 单一数据源：跟 next-intl 的 routing 配置保持一致，新增语言时不需要在这里另外维护一份列表。
export const LOCALES: readonly string[] = routing.locales;

export const LOCALE_LABELS: Record<string, string> = {
  en: '英语',
  zh: '简体中文',
  'zh-Hant': '繁体中文',
  fr: '法语',
  es: '西班牙语',
  ja: '日语',
  ko: '韩语',
  it: '意大利语',
  de: '德语',
};

// 把 locale 转成能当 collection/singleton key 用的字符串（去掉连字符）。
export function localeToKey(locale: string): string {
  return locale.replace(/-/g, '');
}
