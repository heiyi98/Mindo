import { fields, singleton } from '@keystatic/core';
import { LOCALES, LOCALE_LABELS, localeToKey } from './locales';
import messageShapes from './messages-shapes.generated.json';

// 命名空间文件的字段结构快照由 scripts/generate-keystatic-schema.js 生成（predev/prebuild 自动跑），
// 这个文件本身只做"结构 -> Keystatic 字段"的纯翻译，不碰 fs —— 因为 keystatic.config.tsx
// 会被一个 'use client' 组件直接 import，整条依赖链都要能进浏览器端 bundle，node:fs 在那里跑不了。
type MessageShape =
  | { kind: 'string'; long: boolean }
  | { kind: 'number' }
  | { kind: 'boolean' }
  | { kind: 'array'; element: MessageShape }
  | { kind: 'object'; fields: Record<string, MessageShape> };

// 已知命名空间的中文显示名。未收录的文件（未来新增模块时）会退化成直接显示文件路径，
// 仍然可用，不需要因为新增一个翻译文件就得回来改这份配置。
const NAMESPACE_LABELS: Record<string, string> = {
  'ui.json': '基础UI',
  'assessments/index.json': '功能中心',
  'bazi/index.json': '八字模块',
  'bigfive/index.json': '大五人格',
  'bigfive/questions.json': '大五人格题库',
  'western/index.json': '西洋星盘',
  'mindcards/index.json': '片语模块',
  'codex/index.json': '内容库',
  'dock/index.json': 'Dock导航（疑似孤儿文件，目前未接入 i18n/request.ts 的加载管道，见 CLAUDE.md 待办）',
};

function fieldsFromShape(shape: MessageShape, labelHint: string): any {
  switch (shape.kind) {
    case 'string':
      return fields.text({ label: labelHint, multiline: shape.long, defaultValue: '' });
    case 'number':
      return fields.number({ label: labelHint });
    case 'boolean':
      return fields.checkbox({ label: labelHint });
    case 'array':
      return fields.array(fieldsFromShape(shape.element, '项'), {
        label: labelHint,
        itemLabel: (props: any) => {
          const v = props.value;
          if (typeof v === 'string') return v || '（空）';
          return '项';
        },
      });
    case 'object': {
      const objFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(shape.fields)) {
        objFields[key] = fieldsFromShape(value, key);
      }
      return fields.object(objFields, { label: labelHint });
    }
    default:
      return fields.text({ label: labelHint, defaultValue: '' });
  }
}

export const messagesSingletons: Record<string, any> = {};
export const messagesNavigationGroups: Record<string, string[]> = {};

for (const [rel, shape] of Object.entries(messageShapes as Record<string, MessageShape>)) {
  const namespaceLabel = NAMESPACE_LABELS[rel] ?? rel;
  const inferred = fieldsFromShape(shape, namespaceLabel);
  const topFields: Record<string, any> = inferred.kind === 'object' ? inferred.fields : { value: inferred };
  const relWithoutExt = rel.replace(/\.json$/, '');
  const groupKey = `翻译词典 · ${namespaceLabel}`;
  messagesNavigationGroups[groupKey] = [];

  for (const locale of LOCALES) {
    const key = `messages_${localeToKey(locale)}_${rel.replace(/[/.]/g, '_')}`;
    messagesSingletons[key] = singleton({
      label: `${namespaceLabel} · ${LOCALE_LABELS[locale] ?? locale}`,
      path: `messages/${locale}/${relWithoutExt}`,
      format: { data: 'json' },
      schema: topFields,
    });
    messagesNavigationGroups[groupKey].push(key);
  }
}
