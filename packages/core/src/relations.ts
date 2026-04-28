// packages/core/src/relations.ts

import { PillarContext, RelationEvent } from './types';

const stemComboMap: Record<string, string> = { 'Jia':'Ji', 'Ji':'Jia', 'Yi':'Geng', 'Geng':'Yi', 'Bing':'Xin', 'Xin':'Bing', 'Ding':'Ren', 'Ren':'Ding', 'Wu':'Gui', 'Gui':'Wu' };
const stemClashMap: Record<string, string> = { 'Jia':'Geng', 'Geng':'Jia', 'Yi':'Xin', 'Xin':'Yi', 'Bing':'Ren', 'Ren':'Bing', 'Ding':'Gui', 'Gui':'Ding' };
const branchCombo6Map: Record<string, string> = { 'Zi':'Chou', 'Chou':'Zi', 'Yin':'Hai', 'Hai':'Yin', 'Mao':'Xu', 'Xu':'Mao', 'Chen':'You', 'You':'Chen', 'Si':'Shen', 'Shen':'Si', 'Wu':'Wei', 'Wei':'Wu' };
const branchClashMap: Record<string, string> = { 'Zi':'Wu', 'Wu':'Zi', 'Chou':'Wei', 'Wei':'Chou', 'Yin':'Shen', 'Shen':'Yin', 'Mao':'You', 'You':'Mao', 'Chen':'Xu', 'Xu':'Chen', 'Si':'Hai', 'Hai':'Si' };
const branchHarmMap: Record<string, string> = { 'Zi':'Wei', 'Wei':'Zi', 'Chou':'Wu', 'Wu':'Chou', 'Yin':'Si', 'Si':'Yin', 'Mao':'Chen', 'Chen':'Mao', 'Shen':'Hai', 'Hai':'Shen', 'You':'Xu', 'Xu':'You' };
const rootElementsMap: Record<string, string[]> = {
  'Jia': ['Jia','Yi'], 'Yi': ['Jia','Yi'],
  'Bing': ['Bing','Ding'], 'Ding': ['Bing','Ding'],
  'Wu': ['Wu','Ji'], 'Ji': ['Wu','Ji'],
  'Geng': ['Geng','Xin'], 'Xin': ['Geng','Xin'],
  'Ren': ['Ren','Gui'], 'Gui': ['Ren','Gui']
};

export function analyzeRelations(pillars: PillarContext[]): RelationEvent[] {
  const events: RelationEvent[] = [];
  const getPairId = (e1: string, e2: string) => [e1, e2].sort().join('');

  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const p1 = pillars[i];
      const p2 = pillars[j];

      if (p1.stem.charId !== '?' && p2.stem.charId !== '?') {
        const s1 = p1.stem.charId;
        const s2 = p2.stem.charId;
        if (stemComboMap[s1] === s2) {
          events.push({
            logicId: `Relations.StemCombo.${getPairId(s1, s2)}`,
            type: 'combo', locators: [p1.colName, p2.colName],
            nodes: [p1.stem.nodeId, p2.stem.nodeId], elements: [s1, s2]
          });
        }
        if (stemClashMap[s1] === s2) {
          events.push({
            logicId: `Relations.StemClash.${getPairId(s1, s2)}`,
            type: 'clash', locators: [p1.colName, p2.colName],
            nodes: [p1.stem.nodeId, p2.stem.nodeId], elements: [s1, s2]
          });
        }
      }

      if (p1.branch.charId !== '?' && p2.branch.charId !== '?') {
        const b1 = p1.branch.charId;
        const b2 = p2.branch.charId;
        if (branchCombo6Map[b1] === b2) {
          events.push({
            logicId: `Relations.BranchCombo6.${getPairId(b1, b2)}`,
            type: 'combo6', locators: [p1.colName, p2.colName],
            nodes: [p1.branch.nodeId, p2.branch.nodeId], elements: [b1, b2]
          });
        }
        if (branchClashMap[b1] === b2) {
          events.push({
            logicId: `Relations.BranchClash.${getPairId(b1, b2)}`,
            type: 'clash', locators: [p1.colName, p2.colName],
            nodes: [p1.branch.nodeId, p2.branch.nodeId], elements: [b1, b2]
          });
        }
        if (branchHarmMap[b1] === b2) {
          events.push({
            logicId: `Relations.BranchHarm.${getPairId(b1, b2)}`,
            type: 'harm', locators: [p1.colName, p2.colName],
            nodes: [p1.branch.nodeId, p2.branch.nodeId], elements: [b1, b2]
          });
        }
      }
    }
  }

  pillars.forEach(pStem => {
    if (pStem.stem.charId === '?') return;
    const matchTargets = rootElementsMap[pStem.stem.charId] || [];
    const rootNodes: string[] = [];
    const rootLocators: string[] = [];
    pillars.forEach(pBranch => {
      pBranch.hiddenStems.forEach(hs => {
        if (matchTargets.includes(hs.charId)) {
          rootNodes.push(hs.nodeId);
          if (!rootLocators.includes(pBranch.colName)) rootLocators.push(pBranch.colName);
        }
      });
    });
    if (rootNodes.length > 0) {
      events.push({
        logicId: `Relations.Root.${pStem.stem.charId}`,
        type: 'root',
        locators: [pStem.colName, ...rootLocators],
        nodes: [pStem.stem.nodeId, ...rootNodes],
        elements: [pStem.stem.charId]
      });
    }
  });

  return events;
}
