# Mindo 先天体质模块 — 完整文档

2026-08-21新增。Pro账号模式下的独立工具，面向持证中医师，仅供参考，不替代望闻问切，医生自行判断采纳；反映先天禀赋（体），不代表当下功能状态（用）。Pro账号基础设施（`pro_expires_at`/`pro_transactions`/后台发放/兑换）见 `Mindo-支付系统.md` 十二节，本文档只记这个模块自己的算法与前端。

## 一、算法核心（`packages/core/src/bazi/constitution/`）

八字模块下的子目录（不是`bazi/`的平级独立模块），内部直接用相对路径import`bazi/`的常量/类型（`TIANGAN_WUXING`/`TIANGAN_YINYANG`/`DIZHI_CANGGAN`/`YUELING_COEFF`/`GENERATES`/`RESTRAINS`）。

### 1.1 常规版 / 子平版两套平行体系

全模块（阴阳层/静态阴阳五行层/动态五行层/处方层四层）都分常规版与子平版，两套完整独立实现，不共享中间步骤：

- **常规版**：纯粹五行生克模型，不做天干五合真化/合绊判定、不做墓库锁闭判定、不做三会/三合等地支关系标注与免疫规则
- **子平版**：完整子平八字规则，与`bazi_snapshots`已经在用的那套判定完全一致

**不能直接复用`bazi/structure.ts`的产出算常规版**：`buildBaziStructure`会原地改写`tianGanNodes[].wuxing`（五合真化）、原地改写`cangGanNodes[].baseScore`（三会/三合化神覆盖），常规版明确要求跳过这两步，只能绕开它单独计算（`regularEnergy.ts`）。子平版则完全相反——直接复用`bazi_snapshots.calculation_result`现成产物，不重算（`ziPingEnergy.ts`）。

两种档案来源（账号档案模式读现成`bazi_snapshots`；手动输入模式跳过`packages/core/src/time`真太阳时引擎，直接把原始输入时间喂给`baziEngine.calculate()`，见`manualInput.ts`——这是代码层面的既定设计，前端页面上不再额外展示"不做真太阳时修正"这类说明文字，用户决定精简掉）最终都产出同一套`BaziSnapshot`结构，下游`computeConstitution(snapshot, version)`不关心来源，见`index.ts`。

**藏干基础分/月令系数/透根分配+封顶逻辑，常规版和子平版共用同一份实际代码（`bazi/energy/energy.ts`），不是各自维护一份**：透根系数=藏干基础分÷10，按同五行天干数分配、封顶3——`Mindo-八字.md`文档写的"无上限"是文档与代码的历史漂移，不是这里的准绳，这里以代码为准。

### 1.2 层一：阴阳层

- 一.一 总局阴阳：全部节点（天干+藏干）按`yinyang`分组求和
- 一.二 干支阴阳：天干节点、藏干节点分别独立求和
- 强弱判定`yinyangStrengthLabel()`（比例法）：比值(大/小)<1.5→中，<3→强/弱，≥3→极强/极弱；一方为0→该方"缺失"、另一方"极强"；两方都为0→都"缺失"
- **五态人（2026-08-22新增）**：`ConstitutionLayerOne.fiveConstitution`字段，由`fiveConstitutionLabel()`（`strength.ts`）对**一.一总局阴阳**（不看天干/地支阴阳）的强弱标签做固定映射得出，不再交给AI自行判断——阴极强+阳（极弱|缺失）→太阴之人，阴强+阳弱→少阴之人，阴中+阳中→阴阳和平之人，阳强+阴弱→少阳之人，阳极强+阴（极弱|缺失）→太阳之人。映射函数只读现成的`yangLabel`/`yinLabel`，不重新计算强弱、不重新定义阈值——"缺失"和"极弱"在这套映射里等价，因为`yinyangStrengthLabel()`本身保证一方缺失时另一方必为极强，两种输入天然对应同一个五态人结果。常规版/子平版的总局阴阳各自独立计算，五态人也各自独立算一次，不共用。

### 1.3 层二：静态阴阳五行层

- 二.一 五行五个静态值：按`wuxing`分组求和（口径同`bazi_snapshots.energyScores`）
- 二.二 阴阳五行十个静态值：按`(yinyang, wuxing)`组合分组求和（10组）
- 强弱判定`averageStrengthLabel()`（均值法，相对同组正值均值的倍数）：>2.00极强/>1.25强/>0.50中/>0.25弱/否则极弱；value=0→"缺失"
- 二.三 十干配脏腑（子午流注标准配属，阳干配腑阴干配脏）：甲→胆 乙→肝 丙→小肠 丁→心 戊→胃 己→脾 庚→大肠 辛→肺 壬→膀胱 癸→肾（`organMapping.ts`，纯展示映射表，不参与计算）

### 1.4 层三：动态五行层（对数饱和函数模型，2026-08-22改版）

**历史版本已废弃**：最初版本借用了`bazi/energy/yongshen.ts`的`computeCandidateEffect`那套"固定系数线性叠加+`Math.max(0,...)`截断"模型（`layers.ts`里的`computeDeltas()`）。上线后排查发现：这套模型在部分命盘上会把本该是负数的真实结果误显示成`0.0`（比如某条链路算出土≈-19.05、金≈-3.15、水≈-0.125，全部被`Math.max(0,...)`砍平，界面上看起来像是"命盘缺土金水"，实际是"被严重克制耗泄"），已确认不适用于本模块，替换为对数饱和函数模型。`computeDeltas()`函数本身**没有删除、没有修改**，继续原样服务层四（见1.5节），两套模型在`layers.ts`里并存，互不调用。

**新模型（`computeSigmoidDeltas()`）**：每个五行节点T同时接收来自其余四个关系角色的贡献（角色相对T本身，不是相对日主）：

```
母（生我者）  → T增长，系数0.8
子（我生/泄我者）→ T衰减，系数0.2
官（克我/我耗者）→ T衰减，系数0.6
财（我克者）  → T衰减，系数0.3

每条关系：
  比值 = 对方能量 ÷ T能量
  t = ln(比值)
  饱和系数 = 1 / (1 + e^(-t))     ← 恒属于(0,1)区间，
                                     满足 f(比值)+f(1/比值)=1 的对称性
  该关系对T的调整量 = T原值 × 饱和系数 × 关系系数

T新值 = T原值 + 母增长量 − 子衰减量 − 官衰减量 − 财衰减量
```

跟旧模型的本质区别：旧模型是"固定剂量的假设探针测试"（不管命盘多大，统一按固定系数线性叠加，这本来是`yongshen.ts`为"注入固定30点energy做what-if"设计的，语义上不适合本层）；新模型是"五个真实能量值按各自实际大小、通过饱和函数互相影响"——比值越悬殊，饱和系数越接近0或1（边际递减），不会出现"数值越大影响线性无限放大"的失真。

`T===0`时直接跳过关系计算、结果记为0（避免除0），因为公式本身是"T原值×饱和系数×系数"，T为0时无论饱和系数是多少这一项都是0，不需要真的算比值。

子平版三会免疫：跟旧版一样，`immuneWuxing`从`snapshot.relations.diZhiRelations`里`type==='SanHui'`的`wuxing`收集，命中免疫的目标跳过"官"（克我）这一条衰减——对应旧模型里"命中免疫的目标不接收所克者负向传播"的同一个语义，只是换成了新模型的角色命名。常规版恒为空集。

**不做`Math.max(0,...)`截断**——非负性理论上由每一项衰减`T×严格小于1的饱和系数×系数`小于T本身来保证，但**这个保证是针对单条关系的，不是对三条衰减关系的总和**：三个衰减系数加总(0.2+0.6+0.3=1.1)理论上可以超过1，如果子/官/财三者同时远大于T、而母又同时趋近于0，数学上T新值仍可能算出一个很小的负数（已用真实命盘验证过的两个例子——用户提供的验证例`Wood:100,Earth:20`和排查用的真实命盘`{Wood:92,Fire:8.75,Earth:43,Metal:4,Water:43.5}`——都没有触发这个边界情况，全部输出非负），这是已知的理论边界情况，故意没有加保护，等真的遇到实例再决定要不要处理。

### 1.5 层四：处方层（沿用旧模型，未随1.4节改版变动）

在层三结果基础上，对每一行做**固定注入30点能量**的反事实测试（复用用神算法`bazi/energy/yongshen.ts`同款注入量与系数），比较整体标准差升降：

```
stdBefore = stdev(层三五个值)
stdAfter  = stdev(注入该行30点能量之后的五个值)
stdAfter < stdBefore → 该行"宜补"
stdAfter > stdBefore → 该行"宜泻"
stdAfter = stdBefore → "持平"（理论edge case，正常命盘极少出现）
```

**实现要点**：层四继续用`computeDeltas()`（固定系数线性叠加，未clamp的原始增量计算）——对单一候选的注入增量算出后，先叠加到层三基线上，再统一`Math.max(0,...)`（不能对增量本身提前clamp，否则会把候选对"克己者"产生的负值提前抹平，算出偏乐观的标准差）。**层三改用对数饱和函数模型之后，层四这套"固定30点注入+比标准差"的逻辑本身没有跟着改**——层四现在是在一个更真实（不再被误砍成0）的层三基线之上做同样的旧式反事实测试，这是2026-08-22这版改动之外的既有行为，用户明确要求这次范围只限layer三新增独立函数，不改`computeDeltas()`/`computeLayerFour()`一行代码。

## 二、类型与函数一览（`packages/core/src/bazi/constitution/`）

```
types.ts          ConstitutionVersion / ConstitutionEnergyNode / ConstitutionResult 等
strength.ts        yinyangStrengthLabel() / averageStrengthLabel() / averageOfPositive() / stdev() /
                    fiveConstitutionLabel()（新，五态人固定映射，只读总局阴阳强弱标签）
organMapping.ts    ORGAN_MAP
regularEnergy.ts   computeRegularEnergyNodes(pillars)
ziPingEnergy.ts    extractZiPingEnergyNodes(snapshot) / getSanhuiImmuneWuxing(snapshot)
manualInput.ts     buildManualBaziSnapshot(input) —— 跳过真太阳时引擎
layers.ts          computeLayerOne/Two/Three/Four()；内部私有函数
                    computeSigmoidDeltas()（新，只服务层三）和
                    computeDeltas()（旧，只服务层四）并存，互不调用
index.ts           computeConstitution(snapshot, version) —— 唯一对外入口，
                    给定任意来源的BaziSnapshot+所选版本，一次性算出完整四层结果
```

`packages/core/src/index.ts`统一导出（从`./bazi/constitution/index`转发），`apps/web`通过`@mindo/core`引用，不感知内部这层目录嵌套。

手工验证脚本：`packages/core/src/bazi/constitution/__tests__/algorithm.test.ts`（无断言，人工核对，运行`pnpm exec tsx src/bazi/constitution/__tests__/algorithm.test.ts`），照抄`bazi/__tests__/algorithm.test.ts`的风格。已跑过一组真实出生时间验证：常规版/子平版在同一命盘上确实产生不同数值（墓库锁闭/藏干隐显只影响子平版），符合设计预期。

## 三、前端

### 3.1 路由结构

Pro模块整体是"测算中心"的平行分支，视觉上跟`assessments`主页同一套（Dock+TopBar框架、CATEGORIES/CardDef卡片网格），具体某个Pro工具自己的长页面则跟八字AI报告页一样物理搬到`(os)`外面：

```
[locale]/dashboard/(os)/assessments/pro/page.tsx      Pro工具入口页（Pro Hub），在(os)路由组内，
                                                         带Dock/TopBar，卡片网格样式完全复用assessments
                                                         主页的写法（PRO_CARDS数组，目前只有先天体质一项，
                                                         以后新增Pro工具直接往这个数组加一项）；
                                                         客户端用payment-assets的proExpiresAt做访问门禁，
                                                         非Pro重定向回/dashboard/assessments
[locale]/dashboard/assessments/pro/constitution/page.tsx  先天体质工具本体，物理位置在(os)外面
                                                         （跟bazi/reading同样的理由：独立长页面，
                                                         不需要Dock/顶栏导航框架），Server Component
                                                         直接用session client查pro_expires_at，
                                                         未登录跳/auth/login，非Pro跳/dashboard/assessments
```

### 3.2 先天体质页面的顶部控制区（不是共用的os TopBar，是页面自己局部实现的header，单行）

`components/pro/ConstitutionView.tsx`（Client Component）自己在组件顶部包了一层`<CurrentProfileProvider>`——这个Provider本来只在`(os)/layout.tsx`挂一份给整个仪表盘共用，先天体质页面物理上在`(os)`外面拿不到那份实例，所以在这里单独再挂一份独立实例（内部用同一个`/api/profiles`查询缓存key，不会重复发请求，但`currentProfileId`这个"当前选中哪个档案"的状态是这个页面自己独立的，切这里的档案不会影响仪表盘那边，反之亦然）。挂了这层Provider之后，`ProfileSwitcher`组件可以原样复用，不用另外写一个。

顶部控制区是**单行**的sticky header（56px，跟共用TopBar同样的高度惯例），三段式布局（跟`components/os/TopBar.tsx`的`left/center/right`三段思路一致，只是这里是页面自己单独实现，不走`TopBarContext`）：

```
左：←返回按钮 + ProfileSwitcher
中：[年][月][日][时][分]五个小型输入框 + [排盘]按钮，紧挨在一起，整体居中
右：ThemeToggle
```

手动输入的五个字段是五个独立的`<select>`下拉菜单（年/月/日/时/分），不是`components/onboarding/steps/`下`DatePicker`/`TimePicker`那两个大尺寸选择器组件——那两个是为整屏引导流程设计的，内部间距/字号偏大，塞不进单行顶栏，所以这里自己重新写了一组窄版下拉，宽度按内容微调（年份4位数字宽度64px，月/日/时/分2位数字宽度44px）。日期选项会跟着年/月联动（`daysInMonth()`按当前选的年月算当月天数，切月份时把已选的日清空，避免残留一个当月不存在的日期）。`不需要出生地/时区字段，也不需要保存成档案`，五个下拉各自是受控的字符串state，点击紧挨着的"排盘"按钮才提交。

**两种触发计算的方式，互不冲突，共用同一个`result` state（谁最后触发显示谁）**：

- **切换档案（左侧ProfileSwitcher）**：`useEffect`监听`currentProfile?.id`，一变化（含首次加载自动选中的默认档案）立刻调用`/api/pro/constitution`，不需要用户额外点击
- **手动输入（顶栏正中的年月日时分五个框）**：只更新本地state，不会自动触发计算，必须点击紧挨着的"排盘"按钮才会调用`/api/pro/constitution`

**默认展示常规版，不是子平版**（`useState<ConstitutionVersion>('regular')`）——用户可以随时点"子平版"切换，但打开页面/切换档案/排盘后第一眼看到的都是常规版结果。

**四层结果的展示标题**用中医术语，不是内部代码的"层几"编号（内部数据结构/变量命名不变，只是前端展示层换了标题）：

```
层一 阴阳层     → 展示标题"阴阳"
层二 静态阴阳五行层 → 展示标题"藏象"
层三 动态五行层   → 展示标题"整体协同"
层四 处方层     → 展示标题"建议"
```

这四个标题跟`components/pro/constitutionPrompt.ts`里AI分析指令模板"四、输出结构"的四步（体质类型判断/五行藏象分析/整体体质判断/调理方向建议）大致对齐，不是巧合，但不是逐字一一对应（模板2026-08-22改版后自成一套措辞，见下）。

"整体协同"（层三）这个板块里，五行不再展示成单纯的"木/火/土/金/水"，改成带脏腑系统名的复合标签：`木·肝系统 / 火·心系统 / 土·脾系统 / 金·肺系统 / 水·肾系统`（取`ORGAN_MAP`里阴干/脏的那一侧，五脏系统是中医里更常见的"系统"叫法）。这个标签只用在层三，层二的十干静态值那里仍然分阴阳分别展示"阳X（腑）/阴X（脏）"两行，不套用这个复合标签。

`components/pro/constitutionPrompt.ts`——`buildConstitutionPrompt(result, version)`，纯字符串拼装，不落库，点击按钮时现算现拼，复制到剪贴板。**2026-08-22整份模板重写**：改为固定格式的"八字先天体质诊断"指令文本（身份定位→数据输入→写作要求→输出结构四段），数据输入段落包含新增的【五态人判定】小节，直接读`layerOne.fiveConstitution`——**旧模板里"五态人由AI对照《灵枢·通天》自行判断"这一步已取消**，AI现在只负责读取代码给出的结论去展开分析，不再自己判断类型。模板不再在"二、数据输入"标题里注明常规版/子平版（新模板文字本身不含版本字样，版本区分完全由调用方传入哪个`ConstitutionResult`决定）。【整体五行层】五个强弱标签是`constitutionPrompt.ts`内部现算的（`findLayerThreeLabel()`，复用`averageStrengthLabel()`+`averageOfPositive()`对层三五个数值同款均值法处理），**`ConstitutionLayerThree`本身仍然只是纯数值、没有新增标签字段**——这个标签只服务AI提示文本，UI"整体协同"板块继续只显示数值，不显示标签。

**多语言：先天体质页面自己的文案是用户明确决定的例外，中文硬编码，不接入next-intl**——面向持证中医师这一小众专业受众，这条决定覆盖CLAUDE.md"禁止硬编码中文"的通用铁律，仅适用于这一个页面本身的自定义UI文字（不含复用的`ProfileSwitcher`这个共享组件内部自带的翻译键，它该怎么读`useTranslations()`还怎么读，不受这条例外影响；也不含Pro Hub页面和测算中心TopBar的"PRO"入口，那些是主应用外壳的一部分，走`assessments.pro.*`翻译键，9语言齐全）。

### 3.3 API

`POST /api/pro/constitution`——`requireApiUser()`+`pro_expires_at`校验，`{mode:'profile', profileId}`或`{mode:'manual', year,month,day,hour,minute}`两种入参，内部调`computeConstitution()`两次（常规版+子平版各一次）一起返回，避免切换版本时前端重新请求。

账号档案模式如果该档案还没有可用的新格式`bazi_snapshots`（旧格式或完全没有），直接返回422提示"请先在测算中心打开一次八字模块"，不在这里重复实现`api/dashboard/route.ts`那套惰性迁移/首次计算逻辑——两者职责不同，这个接口只管拿现成数据算体质，不管命盘计算/迁移本身。

### 3.4 入口

`[locale]/dashboard/(os)/assessments/page.tsx`（测算中心）TopBar右侧，`pro_expires_at`有效时展示一个写着"PRO"的文字按钮（不是图标，字面就是"PRO"，比照"VIP"这类品牌/等级名词不强制走翻译键的既有惯例），点击进`/dashboard/assessments/pro`这个Pro Hub页面，见`Mindo-支付系统.md`十二节4.4小节。

## 四、待完成/已知缺口

- [x] ~~五态人依赖AI自行判断，结果不确定~~——**已修复（2026-08-22）**：新增`fiveConstitutionLabel()`（`strength.ts`），只读总局阴阳强弱标签做固定映射，结果落在`ConstitutionLayerOne.fiveConstitution`字段，AI分析指令模板同步整份重写（见3.2节），不再要求AI自己判断五态人。用真实命盘验证：总局阴阳"阳（弱）/阴（强）"→五态人正确判定为"少阴之人"。
- [x] ~~层三"整体协同"在部分命盘上会把本该是负数的结果误显示成0.0~~——**已修复（2026-08-22）**：根因是旧模型`computeDeltas()`+`Math.max(0,...)`clamp，已改用1.4节描述的对数饱和函数模型（新函数`computeSigmoidDeltas()`），不再clamp。修复只新增/替换了`layers.ts`里服务层三的部分，`computeDeltas()`/`computeLayerFour()`一行未动，`packages/core/src/bazi/`下的引擎本体文件（`energy.ts`/`yongshen.ts`/`structure.ts`等）全程未触碰。用真实命盘（层二.一`{Wood:92, Fire:8.75, Earth:43, Metal:4, Water:43.5}`）重新验证：新模型输出`{Wood:102.9, Fire:8.49, Earth:24.0, Metal:3.40, Water:25.36}`，五个都是有意义的正数，不再有клamp导致的虚假0.0
- [ ] 对数饱和函数模型的非负性只是"大概率成立"，不是数学上绝对保证：三条衰减关系（子0.2+官0.6+财0.3=1.1）的系数总和超过1，如果子/官/财三者同时远大于T、母又同时趋近于0，理论上仍可能算出一个小负数——目前用到的两个真实命盘都没有触发这个边界情况，故意没加额外保护，等真的遇到实例再决定要不要处理，见1.4节
- [ ] 四层结果展示的具体UI视觉设计仍是最简版本（纯数值列表+标签），没有做类似八字报告页那样的图形化呈现——用户当前决定先保证数据/算法正确、能跑通完整流程，视觉打磨留待后续
- [ ] 未用真实Pro测试账号走过完整端到端流程（后台发Pro兑换码批次→前台兑换→TopBar入口出现→进组件页→账号档案/手动输入两种来源分别算一遍→AI分析指令复制），本轮只验证到type-check通过+dev server路由重定向正常（未登录/非Pro两种情况都正确跳转），建议找机会用测试账号实测一遍
- [ ] 六气分支（地支三阴三阳，司天在泉）明确不纳入本轮，见原始施工说明文档第六节
- [ ] 大运流年动态时间维度扩展，明确不纳入本轮
- [ ] 总局阴阳vs干支阴阳的实际信息增量、常规版vs子平版哪个更贴近临床实感，均需要通过实际报告交由中医专业人士比对验证，不在编码阶段下定论
- [ ] 通根维度是否要单独呈现，依赖"层一.二天干地支能否对应阴阳"这一假设是否被验证成立，该假设本身尚未验证，暂不独立处理
