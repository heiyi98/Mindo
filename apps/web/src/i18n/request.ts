import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// 递归合并对象
function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      key in result &&
      typeof result[key] === 'object' &&
      typeof source[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// 加载该语言的所有翻译文件并合并
async function loadMessages(locale: string): Promise<Record<string, any>> {
  // ui.json 是基础，必须存在
  const ui = (await import(`../../messages/${locale}/ui.json`)).default;

  // 模块文件按需加载，不存在时静默跳过
  const moduleFiles = [
    `../../messages/${locale}/assessments/index.json`,
    `../../messages/${locale}/bigfive/index.json`,
    `../../messages/${locale}/bigfive/questions.json`,
    `../../messages/${locale}/western/index.json`,
  ];

  const moduleKeys = [
    'assessments',
    'bigfive',
    'bigfive.questions',
    'western',
  ];

  let messages: Record<string, any> = { ...ui };

  for (let i = 0; i < moduleFiles.length; i++) {
    try {
      const mod = (await import(moduleFiles[i])).default;
      const keyPath = moduleKeys[i].split('.');

      // 按路径构建嵌套对象
      let nested: Record<string, any> = mod;
      for (let k = keyPath.length - 1; k >= 0; k--) {
        nested = { [keyPath[k]]: nested };
      }
      messages = deepMerge(messages, nested);
    } catch {
      // 模块文件不存在时跳过
    }
  }

  return messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
