/**
 * Mindo 测算模块注册表
 *
 * 这是整个系统的单一数据源（Single Source of Truth）。
 * 新增测算模块只需在此添加一条记录，系统其他部分自动感知。
 *
 * SOLID原则：
 * - 开闭原则：对扩展开放，对修改关闭
 * - 依赖倒置：所有UI层依赖此抽象配置，不依赖具体模块实现
 */

export type AssessmentCategory = 'destiny' | 'psychology';
export type AssessmentStatus = 'completed' | 'not_started' | 'locked';
export type InputRequirement = 'birthDate' | 'birthTime' | 'birthCity' | 'gender' | 'quiz';

export interface Assessment {
  id: string;                          // 对应 snapshots.snapshot_type
  category: AssessmentCategory;        // 分类
  route: string;                       // 前端路由（相对于/dashboard/divination/）
  nameKey: string;                     // i18n key
  descriptionKey: string;              // i18n key
  requires: InputRequirement[];        // 需要哪些输入
  isFree: boolean;                     // 基础结果是否免费
  hasAiReading: boolean;               // 是否有AI深度解读（VIP）
  isAvailable: boolean;                // 是否已上线（false=即将推出）
  estimatedMinutes?: number;           // 预计用时（答题制才有）
}

export const ASSESSMENTS: ReadonlyArray<Assessment> = [
  // ═══════════════════════════════
  // 命理测算
  // ═══════════════════════════════
  {
    id: 'bazi',
    category: 'destiny',
    route: 'bazi',
    nameKey: 'assessments.bazi.name',
    descriptionKey: 'assessments.bazi.description',
    requires: ['birthDate'],
    isFree: true,
    hasAiReading: true,
    isAvailable: true,
  },
  {
    id: 'ziwei',
    category: 'destiny',
    route: 'ziwei',
    nameKey: 'assessments.ziwei.name',
    descriptionKey: 'assessments.ziwei.description',
    requires: ['birthDate', 'birthTime', 'birthCity', 'gender'],
    isFree: true,
    hasAiReading: true,
    isAvailable: false,
  },
  {
    id: 'western',
    category: 'destiny',
    route: 'western',
    nameKey: 'assessments.western.name',
    descriptionKey: 'assessments.western.description',
    requires: ['birthDate', 'birthTime', 'birthCity'],
    isFree: true,
    hasAiReading: true,
    isAvailable: true,
  },
  // ═══════════════════════════════
  // 心理测算
  // ═══════════════════════════════
  {
    id: 'bigfive',
    category: 'psychology',
    route: 'bigfive',
    nameKey: 'assessments.bigfive.name',
    descriptionKey: 'assessments.bigfive.description',
    requires: ['quiz'],
    isFree: true,
    hasAiReading: true,
    isAvailable: true,
    estimatedMinutes: 10,
  },
  {
    id: 'mbti',
    category: 'psychology',
    route: 'mbti',
    nameKey: 'assessments.mbti.name',
    descriptionKey: 'assessments.mbti.description',
    requires: ['quiz'],
    isFree: true,
    hasAiReading: true,
    isAvailable: false,
    estimatedMinutes: 15,
  },
  {
    id: 'enneagram',
    category: 'psychology',
    route: 'enneagram',
    nameKey: 'assessments.enneagram.name',
    descriptionKey: 'assessments.enneagram.description',
    requires: ['quiz'],
    isFree: true,
    hasAiReading: true,
    isAvailable: false,
    estimatedMinutes: 10,
  },
] as const;

// ═══════════════════════════════
// 工具函数（纯函数，无副作用）
// ═══════════════════════════════

export function getAssessmentById(id: string): Assessment | undefined {
  return ASSESSMENTS.find(a => a.id === id);
}

export function getAssessmentsByCategory(category: AssessmentCategory): Assessment[] {
  return ASSESSMENTS.filter(a => a.category === category);
}

export function getAvailableAssessments(): Assessment[] {
  return ASSESSMENTS.filter(a => a.isAvailable);
}
