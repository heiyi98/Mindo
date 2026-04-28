// packages/core/src/types.ts

export type RelationCategory = 'combo' | 'clash' | 'combo6' | 'combo3' | 'meet' | 'harm' | 'punish' | 'root';

export interface RelationEvent {
  logicId: string;
  type: RelationCategory;
  locators: string[];
  nodes: string[];
  elements: string[];
}

export interface PillarContext {
  colName: string;
  stem: { charId: string; nodeId: string };
  branch: { charId: string; nodeId: string };
  hiddenStems: { charId: string; nodeId: string }[];
}

export interface LifeSection {
  sectionId: string;
  year: number;
  stem: string;
  branch: string;
  events: RelationEvent[];
}

export interface LifeChapter {
  chapterId: string;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  stem: string;
  branch: string;
  baseEvents: RelationEvent[];
  sections: LifeSection[];
}
