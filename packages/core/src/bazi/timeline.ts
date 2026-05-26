import { Solar } from 'lunar-typescript';
import type { TianGan, DiZhi } from './types';
import { calcShiShen } from './utils';
import { STEM_MAP, BRANCH_MAP } from './engine';
import { TIANGAN_WUXING, TIANGAN_YINYANG, DIZHI_CANGGAN } from './constants';

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

  const dayMasterEn = STEM_MAP[dayMaster] as TianGan;

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

    const dyGanEn = STEM_MAP[dyGan] as TianGan;
    const stemShishenId = calcShiShen(
      TIANGAN_WUXING[dayMasterEn], TIANGAN_YINYANG[dayMasterEn],
      TIANGAN_WUXING[dyGanEn], TIANGAN_YINYANG[dyGanEn]
    );
    const dyZhiEn = BRANCH_MAP[dyZhi] as DiZhi;
    const mainQiStemEn = DIZHI_CANGGAN[dyZhiEn][0].stem;
    const branchShishenId = calcShiShen(
      TIANGAN_WUXING[dayMasterEn], TIANGAN_YINYANG[dayMasterEn],
      TIANGAN_WUXING[mainQiStemEn], TIANGAN_YINYANG[mainQiStemEn]
    );
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
