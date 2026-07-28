# Mindo 八字模块 — 完整文档

## 一、算法核心参数（已锁定，修改须经架构讨论）

### 1.1 藏干基础分（静态，来自传统藏气比例）

```
子：癸30 | 丑：己18/癸9/辛3 | 寅：甲16/丙7/戊7
卯：乙30 | 辰：戊18/乙9/癸3 | 巳：丙16/庚7/戊7
午：丁21/己9 | 未：己18/丁9/乙3 | 申：庚16/壬7/戊7
酉：辛30 | 戌：戊18/辛9/丁3 | 亥：壬21/甲9
```

### 1.2 月令系数（斐波那契数列×0.25）

```
得令（同五行）    ×2.00   （0.25×8）
近旺（月令所生）  ×1.25   （0.25×5）
泄气（生助月令）  ×0.75   （0.25×3）
受制（月令所克）  ×0.50   （0.25×2）
失令（克制月令）  ×0.25   （0.25×1）
```

### 1.3 天干五合（步骤0）

真化三条件（同时满足）：

1. 两干宫位相邻（年月 / 月日 / 日时）
2. 月令生助化神五行
3. 全局所有天干中，无任何一干的五行克化神五行

真化→双干改写为化神五行；否则→合绊（双干 outputEnabled=false）。

### 1.4 透根系数（步骤1）

```
单根透根系数 = 藏干基础分 ÷ 10
总透根系数   = 所有根的系数之和（无上限）
```

设计依据：以比肩为基准单位1。墓库本气（≈18）÷10≈1.8，符合"1比肩<1墓库气"；余气（≈7）÷10≈0.7，2个比肩<1余气；纯气（30）÷10=3，3比肩<1长生纯气。

### 1.5 独立能量（步骤4）

```
天干能量 = 30 × 月令系数 × (1 + 总透根系数)
藏干能量 = 基础分 × 月令系数
```

### 1.6 合绊 / 墓库（步骤5）

- 合绊：outputEnabled=false，日干例外（始终输出）
- 墓库：仅土支（辰戌丑未）。有藏干透出→正常输出；无透出→锁闭（MuKuLocked）。六冲开库（辰戌互冲/丑未互冲）。

### 1.7 宫位权重（步骤6）

**已废弃**。当前 influence = energy，无位置权重。未找到合理系数逻辑，待后续设计。

### 1.8 用神算法（`packages/core/src/bazi/yongshen.ts` / `computeWuxingAssessment`）

**分组**（以日主为基准）：

```
A = 印星（生我）   B = 比劫+日主（同我）   C = 食伤（我生）
D = 财星（我克）   E = 官杀（克我）

H（扶我方）= A + B
K（耗我方）= C + D + E
baseScore  = |H - K|
```

**链式反应系数**（注入30点某五行X时）：

```
X本身        +30 × 1.0  （基准）
X生者（子）  +30 × 0.8  （接收生气，递减0.2）
X被生者（母）-30 × 0.2  （生出去的消耗）
X所克者      -30 × 0.6  （隔1位克，贪生忘克：0.6<0.8）
克X者        -30 × 0.3  （逆向消耗；3次被克克方合计-1.2，符合反侮）
```

五行相生顺序：A→B→C→D→E→A（印生比，比生食，食生财，财生官，官生印）。三会局五行免疫被克效果（旺神不可克）。

**分级阈值**（均相对 baseScore）：

```
|effect| < baseScore × 10%  → 闲神（无命理依据，设计决策）
|effect| ≥ baseScore × 50%  → 强用神 / 强忌神
|effect| < baseScore × 50%  → 弱用神 / 弱忌神
effect最大的用神             → 关键用神
```

**WuxingStrengthLabel 枚举**：`'关键用神' | '强用神' | '弱用神' | '闲神' | '弱忌神' | '强忌神'`

**WuxingAssessment.role 枚举**：`'yongshen' | 'jishen' | 'xianshen'`

**特殊格局**（化气/专旺/从格）：跳过平衡算法，直接按格局规则输出标签。

### 1.9 `preparePhase1Input` 十神排序规则

三级排序（`packages/core/src/bazi/preparePhase1Input.ts`）：

1. 有节点且影响力 > 0 → 按影响力降序
2. 有节点但影响力 = 0（墓库锁闭）→ 排中间
3. 完全无节点（缺失）→ 排最后

## 二、五行颜色规范（单一真相）

```
Wood: #388E3C
Fire: #D32F2F
Earth: #F57F17
Metal: #757575
Water: #1976D2
```

这套颜色是八字模块独有的，跟大五人格的颜色系统（见`Mindo-大五.md`）、以后紫微斗数可能会有的另一套颜色系统，各自独立。片语模块相似度算法里如果需要用到五行数值，用的是这套颜色对应的五行概念本身（Wood/Fire/Earth/Metal/Water），不涉及颜色值。

## 三、前端架构

### 3.1 组件（卡片系统通用规则见 `CLAUDE.md`，此处只记具体规格）

- `components/modules/bazi/BaziChartCard.tsx` COLS=4 ROWS=2（命盘卡片，展开藏干/十神切换/中文映射）
- `components/modules/bazi/WuxingRadarCard.tsx` COLS=2 ROWS=2（五行雷达图）
- `components/modules/bazi/DayMasterCard.tsx` COLS=2 ROWS=3（日主小人卡片）
- `components/modules/bazi/BaziReadingCard.tsx` COLS=1 ROWS=2（路由用`@/i18n/navigation`，跳转报告页）
- `components/modules/bazi/BaziReadingView.tsx`（AI报告长页滚动视图，非卡片系统组件，见第四节）
- `components/modules/bazi/BaziReadingChart.tsx`（报告页命盘SVG组件，三种模式，见4.4节）

### 3.2 人生运势图（LifeKlineCard）

- 暂时隐藏（注释在bazi/page.tsx），待算法完善后恢复
- 算法问题：三会触发改写藏干baseScore导致能量异常放大，待解决

## 四、AI报告管道（八字解读）

### 4.1 数据流

```
用户触发 → /api/ai/reading (POST, 传snapshotId)
  → 读bazi_snapshots.calculation_result
  → 读profiles获取出生信息快照
  → 在bazi_readings创建新记录（状态：generating，同时把
    snapshot.calculation_result原样复制进calculation_result字段钉死）
  → preparePhase1Input(snapshot.calculation_result) 生成数据清单
  → 触发 generate-phase1（fire and forget，传snapshotId+readingId+dataSheet）
→ generate-phase1 → Gemini → 存bazi_readings.ai_reading_draft → 触发generate-theme1（传readingId）
→ generate-theme1 → 存bazi_readings.ai_reading_theme1 → 触发generate-theme2
→ generate-theme2 → 存bazi_readings.ai_reading_theme2 → 触发generate-theme3
→ generate-theme3 → 存bazi_readings.ai_reading_theme3 → 触发generate-theme4
→ generate-theme4 → 存bazi_readings.ai_reading_theme4，ai_reading_status="done"
```

"重新生成报告"走的是同一个入口，每次都会创建一条全新的`bazi_readings`记录（带自己的新`readingId`），所以"生成那一刻钉死快照"这个逻辑天然也覆盖了重新生成的情况，不需要额外处理。

表结构（`bazi_snapshots`/`bazi_readings`具体字段+外键关系）见 `Mindo-数据库.md`，本节只记数据流本身。

### 4.2 Edge Functions（Supabase，串行链式调用）

- generate-phase1：接收 `snapshotId`（读bazi_snapshots计算结果）+ `readingId`（写bazi_readings）+ `dataSheet`
- generate-theme1/2/3/4：只接收 `readingId`，全部读写 `bazi_readings`
- 五个函数全部不涉及`bazi_snapshots`或命盘图表，只管AI文字生成流水线
- 使用 `Deno.serve()` + `EdgeRuntime.waitUntil()` 绕过150秒超时（这个绕过超时的技巧本身是通用的，任何模块以后需要类似的长耗时Edge Function都可以用，已同步记入`CLAUDE.md`"关键教训"）
- temperature: 1.0，无 responseMimeType，防弹JSON解析装甲
- 模型：gemini-2.5-pro-preview（注意：代码里写的是gemini-3.1-pro-preview，实际以Supabase控制台为准）

### 4.3 assessments/status API

- 同时返回 `snapshotId`（bazi_snapshots.id）和 `readingId`（bazi_readings最新记录id）
- `BaziReadingCard` 用 `readingId` 跳转报告页，用 `snapshotId` 触发新报告生成

### 4.4 报告页架构

路由：`/{locale}/dashboard/assessments/bazi/reading?readingId=...`（物理位置不在`(os)`路由组下，见`CLAUDE.md`"路由结构"）

- `page.tsx`（Server Component）→ 读bazi_readings（含calculation_result），若profile_id存在才读profiles对比出生信息+读bazi_snapshots取最新snapshotId（供重新生成用），传birthMismatch给客户端
- `BaziReadingView.tsx`（Client Component）→ 长页滚动，Supabase Realtime订阅bazi_readings实时更新，birthMismatch触发弹窗；顶栏返回按钮=纯图标ChevronLeft+router.back()（不写死目标地址，因为报告可能从八字主页或资产管理进入）
- `BaziReadingChart.tsx` → 三种SVG命盘模式，全部读props传入的calculationResult，不关心数据来源

**报告页布局规则**：
- 大标题（人格核心/心理机制/现实反应/调优建议）：fontSize 28px，大标题之间留白 mb-16
- 次级标题（十神名/场景名等）：fontSize 18px
- 正文：text-sm（14px）
- 十神之间、场景之间、建议之间：短横线（w-8 border-t）
- 机制交互与十神之间、自洽建议与针对性优化之间：长横线（border-t）
- 顶部固定导航栏：左侧纯图标返回按钮（ChevronLeft，router.back()），右侧ThemeToggle
- 界面右上角固定分享按钮（top-16 right-6），点击展开菜单含PDF下载

**BaziReadingChart 三种模式**：
1. **BaziOverviewChart**（主题一）：完整命盘，日干有颜色，其余全部淡化（含日支）。尺寸280×140px，viewBox 500×250
2. **BaziShishenChart**（主题二十神）：节点图，280×210px，viewBox 500×375
3. **BaziInteractionChart**（机制交互）：节点图，280×210px，viewBox 500×375

**节点图渲染规则（BaziShishenChart）**：
- 天干行/地支行/藏干行各占125pt高度，共3行
- 天干：阴阳五行完全一致→颜色+方框；五行同阴阳不同→颜色无方框；其他→淡化
- 地支：全部淡化，连线穿过但不显示颜色（不参与关系展示）
- 藏干：参与关系的才显示（其余完全不渲染）；完全一致→颜色+方框；五行同阴阳不同→颜色无方框；墓库锁闭→虚线方框
- 每个地支最多一个藏干参与关系（八字原理）
- 藏干查找：按五行匹配（wuxing === shishenWuxing），不固定本气
- 方框判断：阴阳五行完全匹配（wuxing + yinyang 都一致）
- 连线路径（直角折线）：通根=天干底部→自坐地支中心→横向→目标地支中心→藏干顶部；透出=藏干顶部→所在地支中心→横向→目标地支中心→天干底部
- 连线颜色：该十神的五行颜色

**机制交互图渲染规则（BaziInteractionChart）**：
- 参与关系的节点（天干或地支）→ 颜色+方框（各自五行色）
- 不参与的节点 → 淡化
- 连线颜色：黑色/白色（hsl(var(--foreground))，随深浅模式变化）
- 仅显示天干行+地支行，无藏干行

### 4.5 PDF导出

- 库：`@react-pdf/renderer` + `html2canvas`
- 字体：本地TTF文件，`apps/web/public/fonts/`——已从 NotoSansSC/TC/JP/KR + NotoSans 换成 Source 家族（Source Sans 3 直接从 Adobe 下载 TTF；Source Han Sans CN/TW/JP/KR 由 OTF 转 TTF），换血时做过实际生成 PDF + 文本回读的验证，原 NotoSans 系列文件已删除。此次换血同时覆盖了片语模块的网页端字体（见`Mindo-片语.md`），两处保持同一血统
- 字体格式必须用 `.ttf`（.otf支持不稳定）
- 按locale按需加载字体，用 `window.location.origin` 拼完整URL
- 字体注册加时间戳（`fontFamily = fontConfig.name + '-' + Date.now()`）防止缓存
- 中文换行：必须用hyphenationCallback把每个字符拆开——这个技巧本身是通用的，已同步记入`CLAUDE.md`"关键教训"，此处只记八字这边的具体用法
- 命盘图表用 `html2canvas` 截图（hidden容器，`position:fixed, opacity:0, zIndex:-1`）
- 文字宽度限制：每个 `Text` 组件用 `width: 483`（A4 595pt - padding 56×2）
- 四页结构：人格核心/心理机制/现实反应/调优建议各一页
- `next.config.ts` 需要：`transpilePackages: ['@react-pdf/renderer']`
- Hook路径：`apps/web/src/hooks/usePdfExport.tsx`（不用useCallback，避免缓存问题）

## 五、数据库

`bazi_snapshots`/`bazi_readings`两张表的具体字段、外键关系、`handle_new_user()`触发器等，详见 `Mindo-数据库.md`，本文档不重复列出，避免两处各记一份容易不同步。

## 六、AI 解读功能以外，尚未开工的部分

- [ ] 老的bazi_readings记录没有calculation_result快照，图表会缺失（用户决定不迁移，账号回头整体注销重来）
- [ ] 报告生成语言记录机制（目前完全没有，Gemini prompt固定中文，用户决定暂缓）
- [ ] 人生运势图算法修复（三会改写藏干问题，见3.2节）
- [ ] 日主小人PNG图片（/public/images/daymasters/{pinyin}.png）
- [ ] 十天干人格档案文字
- [ ] 报告生成中断恢复（资产管理/报告卡片入口，从断点继续生成）
- [ ] ai_reading_translated字段（多语言翻译缓存）
