import { ASSESSMENTS } from './assessments';
import zhAssessments from '../../messages/zh/assessments/index.json';

export interface AdminServiceTypeOption {
  value: string; // 如 'bazi_report'
  label: string; // 如 '八字报告'
}

// /admin 后台不接入next-intl，固定用中文；服务清单和名称直接复用assessments.ts
// 和zh翻译文件，不在这里另建一份服务名称列表。只列isAvailable的模块——还没上线
// 的模块不该在这几个后台页面里被选中去定价/生成兑换码。
export const ADMIN_SERVICE_TYPES: AdminServiceTypeOption[] = ASSESSMENTS.filter(
  (a) => a.isAvailable
).map((a) => ({
  value: `${a.id}_report`,
  label: `${(zhAssessments as unknown as Record<string, { name: string }>)[a.id]?.name ?? a.id}报告`,
}));
