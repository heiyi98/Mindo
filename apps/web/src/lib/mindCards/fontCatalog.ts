import type { LangGroupKey, MindCardFontFamilySelection } from './style';

// 字体选择菜单：内容固定，不随界面语言切换（每个语言分组本身就是天然的标签）。
// 分组标题与字体显示名严格用该语言自身文字书写，技术名（font-family CSS值）与显示名解耦。
//
// relatedChain：仅简体/繁体中文与日文的字体才有。这是一份"完全显式写死"的完整回退顺序
// （含自己在内），由用户逐个字体手动定义，不做任何"简体统一规则/日文统一规则"这类通用公式
// 推导——三个语言各自的每一个字体，都是独立配置的一条记录，改一条不影响其他任何一条。
// 以后新增中/日字体，必须照此格式手写一条新的relatedChain，见Mindo-片语.md。
export interface MindFontOption {
  technicalName: string;
  displayName: string;
  relatedChain?: string[];
}

export interface MindFontGroup {
  groupKey: LangGroupKey;
  groupLabel: string;
  options: MindFontOption[];
}

export const MIND_FONT_CATALOG: MindFontGroup[] = [
  {
    groupKey: 'latin',
    groupLabel: '',
    options: [
      { technicalName: 'Source Serif 4', displayName: 'Source Serif Pro' },
      { technicalName: 'Source Sans 3', displayName: 'Source Sans Pro' },
      { technicalName: 'Source Code Pro', displayName: 'Source Code Pro' },
    ],
  },
  {
    groupKey: 'sc',
    groupLabel: '简体中文',
    options: [
      {
        technicalName: 'Noto Serif SC',
        displayName: '思源宋体',
        relatedChain: ['Noto Serif SC', 'Noto Serif TC', 'Noto Serif JP'],
      },
      {
        technicalName: 'Noto Sans SC',
        displayName: '思源黑体',
        relatedChain: ['Noto Sans SC', 'Noto Sans TC', 'Noto Sans JP'],
      },
    ],
  },
  {
    groupKey: 'tc',
    groupLabel: '繁體中文',
    options: [
      {
        technicalName: 'Noto Serif TC',
        displayName: '思源宋體',
        relatedChain: ['Noto Serif TC', 'Noto Serif SC', 'Noto Serif JP'],
      },
      {
        technicalName: 'Noto Sans TC',
        displayName: '思源黑體',
        relatedChain: ['Noto Sans TC', 'Noto Sans SC', 'Noto Sans JP'],
      },
    ],
  },
  {
    groupKey: 'jp',
    groupLabel: '日本語',
    options: [
      {
        technicalName: 'Noto Serif JP',
        displayName: '源ノ明朝',
        relatedChain: ['Noto Serif JP', 'Noto Serif TC', 'Noto Serif SC'],
      },
      {
        technicalName: 'Noto Sans JP',
        displayName: '源ノ角ゴシック',
        relatedChain: ['Noto Sans JP', 'Noto Sans TC', 'Noto Sans SC'],
      },
    ],
  },
  {
    groupKey: 'kr',
    groupLabel: '한국어',
    options: [
      { technicalName: 'Noto Serif KR', displayName: '본명조' },
      { technicalName: 'Noto Sans KR', displayName: '본고딕' },
    ],
  },
];

// 全局默认兜底：任何语言分组只要没被手动选过（或relatedChain没覆盖到），一律落到这里的衬线字体
export const SERIF_FALLBACK: Record<LangGroupKey, string> = {
  latin: 'Source Serif 4',
  sc: 'Noto Serif SC',
  tc: 'Noto Serif TC',
  jp: 'Noto Serif JP',
  kr: 'Noto Serif KR',
};

export const MIND_FONT_FALLBACK_STACK =
  '-apple-system, "PingFang SC", "Microsoft YaHei", "Malgun Gothic", "Hiragino Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';

// 单个技术名场景：字体选择菜单里预览某个选项本身用
export function resolveFontFamily(technicalName: string): string | undefined {
  if (!technicalName) return undefined;
  return `"${technicalName}", ${MIND_FONT_FALLBACK_STACK}`;
}

// 反查：给一个技术名，找出它属于哪个语言分组。
// 用途：cjkChain里存的是纯技术名数组，面板高亮时需要知道链条里每一项分别对应哪个语言。
export function findGroupForTechnicalName(technicalName: string): LangGroupKey | undefined {
  for (const group of MIND_FONT_CATALOG) {
    if (group.options.some((o) => o.technicalName === technicalName)) return group.groupKey;
  }
  return undefined;
}

// 组装最终渲染用的CSS font-family值：拉丁在最前（独立于CJK关联系统），中间是CJK三语言链
// （用户选过就用存的顺序，没选过就用衬线兜底三件套按固定latin/sc/tc/jp/kr顺序），韩语在最后，
// 末尾接系统兜底栈。这个函数同时服务"用户手动选过字体的卡片"和"完全没选过、走纯默认的卡片"
// 两种场景——后者只需传入空对象{}，各字段都会自动落到SERIF_FALLBACK，不需要额外分支处理。
export function resolveCardFontFamilyCss(payload: MindCardFontFamilySelection): string {
  const chain: string[] = [];
  chain.push(payload.latin || SERIF_FALLBACK.latin);
  if (payload.cjkChain && payload.cjkChain.length > 0) {
    chain.push(...payload.cjkChain);
  } else {
    chain.push(SERIF_FALLBACK.sc, SERIF_FALLBACK.tc, SERIF_FALLBACK.jp);
  }
  chain.push(payload.kr || SERIF_FALLBACK.kr);
  return chain.map((n) => `"${n}"`).join(', ') + `, ${MIND_FONT_FALLBACK_STACK}`;
}

// 给FontPicker面板用：把当前的结构化选择，还原成"五个语言各自当前应显示为选中状态"的完整映射。
// 永远返回全部5个语言的值（未选过的语言落到SERIF_FALLBACK），因为面板不区分"默认"和"手动选中"
// 两种视觉状态——衬线默认字体本身就应该显示为"已选中"，不是特殊的高亮态。
export function resolveFontPickerHighlights(
  payload: MindCardFontFamilySelection,
): Partial<Record<LangGroupKey, string>> {
  const map: Partial<Record<LangGroupKey, string>> = {};
  map.latin = payload.latin || SERIF_FALLBACK.latin;
  map.kr = payload.kr || SERIF_FALLBACK.kr;
  if (payload.cjkChain && payload.cjkChain.length > 0) {
    payload.cjkChain.forEach((name) => {
      const group = findGroupForTechnicalName(name);
      if (group) map[group] = name;
    });
  } else {
    map.sc = SERIF_FALLBACK.sc;
    map.tc = SERIF_FALLBACK.tc;
    map.jp = SERIF_FALLBACK.jp;
  }
  return map;
}