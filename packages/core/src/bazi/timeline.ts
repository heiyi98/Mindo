import { Solar } from 'lunar-typescript';

export interface ChapterSection {
  year: number;
  age: number;
  stem: string;
  branch: string;
  sectionId: string;
}

export interface LifeChapter {
  index: number;
  chapterId: string;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  stem: string;
  branch: string;
  isCurrent: boolean;
  sections: ChapterSection[];
}

export interface DestinyTimeline {
  currentChapterIndex: number;
  chapters: LifeChapter[];
}

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const STEM_MAP: Record<string, string> = { '甲':'Jia', '乙':'Yi', '丙':'Bing', '丁':'Ding', '戊':'Wu', '己':'Ji', '庚':'Geng', '辛':'Xin', '壬':'Ren', '癸':'Gui' };
const BRANCH_MAP: Record<string, string> = { '子':'Zi', '丑':'Chou', '寅':'Yin', '卯':'Mao', '辰':'Chen', '巳':'Si', '午':'Wu', '未':'Wei', '申':'Shen', '酉':'You', '戌':'Xu', '亥':'Hai' };

const BRANCH_MAIN_QI: Record<string, string> = {
  '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
  '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬'
};

const WX_MAP: Record<string, number> = { '甲':1, '乙':1, '丙':2, '丁':2, '戊':3, '己':3, '庚':4, '辛':4, '壬':5, '癸':5 };
const YY_MAP: Record<string, number> = { '甲':1, '乙':0, '丙':1, '丁':0, '戊':1, '己':0, '庚':1, '辛':0, '壬':1, '癸':0 };

function getShiShenId(dayMaster: string, target: string): string {
  if (!dayMaster || !target || target === '?') return 'Unknown';
  if (dayMaster === target) return 'BiJian';

  const meW = WX_MAP[dayMaster], meY = YY_MAP[dayMaster];
  const taW = WX_MAP[target], taY = YY_MAP[target];
  const sameY = meY === taY;

  let rel = 0;
  if (meW === taW) rel = 0;
  else if ((meW % 5) + 1 === taW) rel = 1;
  else if ((meW + 1) % 5 + 1 === taW) rel = 2;
  else if ((taW % 5) + 1 === meW) rel = 4;
  else rel = 3;

  if (rel === 0) return sameY ? 'BiJian' : 'JieCai';
  if (rel === 1) return sameY ? 'ShiShen' : 'ShangGuan';
  if (rel === 2) return sameY ? 'PianCai' : 'ZhengCai';
  if (rel === 3) return sameY ? 'QiSha' : 'ZhengGuan';
  if (rel === 4) return sameY ? 'PianYin' : 'ZhengYin';
  return 'Unknown';
}

function getNextPillar(gan: string, zhi: string, offset: number) {
  const gIdx = (STEMS.indexOf(gan) + offset + 12000) % 10;
  const zIdx = (BRANCHES.indexOf(zhi) + offset + 12000) % 12;
  return { gan: STEMS[gIdx], zhi: BRANCHES[zIdx] };
}

export function generateDestinyTimeline(dateStr: string, gender: 'M' | 'F', currentYear: number): DestinyTimeline {
  const [d, t] = dateStr.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [h, min] = t.split(':').map(Number);

  const solar = Solar.fromYmdHms(y, m, day, h, min, 0);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();
  const dayMaster = bazi.getDayGan();
  const birthYear = y;

  const yun = bazi.getYun(gender === 'M' ? 1 : 0);
  const daYunArr = yun.getDaYun();
  const validDaYuns = daYunArr.slice(1);

  let dir = 1;
  if (validDaYuns.length >= 2) {
    const g0 = STEMS.indexOf(validDaYuns[0].getGanZhi()[0]);
    const g1 = STEMS.indexOf(validDaYuns[1].getGanZhi()[0]);
    dir = (g1 - g0 + 10) % 10 === 1 ? 1 : -1;
  }

  const chapters: LifeChapter[] = [];
  let currentChapterIndex = -1;

  for (let i = 0; i < 12; i++) {
    let dyGan, dyZhi, startAge, endAge, startYear, endYear;

    if (i < validDaYuns.length) {
      const dy = validDaYuns[i];
      dyGan = dy.getGanZhi()[0];
      dyZhi = dy.getGanZhi()[1];
      startAge = dy.getStartAge();
      endAge = dy.getEndAge();
      startYear = birthYear + startAge - 1;
      endYear = birthYear + endAge - 1;
    } else {
      const lastDy = validDaYuns[validDaYuns.length - 1];
      const offset = dir * (i - validDaYuns.length + 1);
      const nextPillar = getNextPillar(lastDy.getGanZhi()[0], lastDy.getGanZhi()[1], offset);
      dyGan = nextPillar.gan;
      dyZhi = nextPillar.zhi;

      const prevChapter = chapters[i - 1];
      startAge = prevChapter.endAge + 1;
      endAge = startAge + 9;
      startYear = prevChapter.endYear + 1;
      endYear = startYear + 9;
    }

    const stemShishenId = getShiShenId(dayMaster, dyGan);
    const branchMainQi = BRANCH_MAIN_QI[dyZhi];
    const branchShishenId = getShiShenId(dayMaster, branchMainQi);
    const chapterId = `Chapters.${stemShishenId}_${branchShishenId}`;

    const sections: ChapterSection[] = [];
    for (let currentY = startYear; currentY <= endYear; currentY++) {
      const lnGanIndex = (currentY - 4 + 12000) % 10;
      const lnZhiIndex = (currentY - 4 + 12000) % 12;
      const lnGan = STEMS[lnGanIndex];
      const lnZhi = BRANCHES[lnZhiIndex];

      sections.push({
        year: currentY,
        age: startAge + (currentY - startYear),
        stem: STEM_MAP[lnGan],
        branch: BRANCH_MAP[lnZhi],
        sectionId: `${STEM_MAP[lnGan]}${BRANCH_MAP[lnZhi]}`
      });
    }

    const isCurrent = currentYear >= startYear && currentYear <= endYear;
    if (isCurrent) currentChapterIndex = i;

    chapters.push({
      index: i,
      chapterId,
      startAge,
      endAge,
      startYear,
      endYear,
      stem: STEM_MAP[dyGan],
      branch: BRANCH_MAP[dyZhi],
      isCurrent,
      sections
    });
  }

  if (currentChapterIndex === -1 && chapters.length > 0) {
    currentChapterIndex = 0;
    chapters[0].isCurrent = true;
  }

  return { currentChapterIndex, chapters };
}
