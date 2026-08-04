# Mindo 内容库（Codex）架构决策文档

## 一、定位与目的

内容库是SEO/GEO/ASO策略的核心载体，同时服务三个对象：

- **搜索引擎**：关键词密度（决定语料库=最小单位）
- **AI（GEO）**：结构化（决定外壳=版式）
- **人类读者**：认知方式（决定内容如何在外壳中排列）

差异化定位：欧美市场目前没有对应的高质量内容库，中文市场现有内容普遍陈旧，Mindo的内容新颖度和系统性本身就是竞争优势，也是对冲"内容局部重叠"这类SEO风险的最有效手段（见第七节）。

---

## 二、技术选型：Fumadocs

### 2.1 结论

采用 **Fumadocs**（`fumadocs-core` + `fumadocs-mdx`，UI层自建，不使用`fumadocs-ui`默认主题）作为内容库的底层框架。

### 2.2 选型理由

- **无头架构（headless）**：Fumadocs拆分为数据层（`fumadocs-core`负责搜索索引/页面树/面包屑等结构化数据，`fumadocs-mdx`负责MDX解析）和UI层，UI层完全可选，可以只用数据层、自建界面——这与Mindo现有的高度自定义设计系统（Source字体系统、九宫格工具栏等）不冲突，不需要为了用框架而牺牲视觉自主权
- 对比Nextra：Nextra更省事但自带一套视觉模板，采用后需要大量返工才能匹配Mindo现有设计语言；Fumadocs是"用可配置性换取可定制性"，更适合本项目
- **内置搜索索引生成**：`fumadocs-core`直接提供搜索索引能力，不需要额外接入第三方搜索服务
- 原生支持Next.js App Router，与现有技术栈无缝对接
- MIT许可证，免费、可商用、无订阅费、无用量上限，代码完全归项目所有，不存在供应商锁定风险

### 2.3 已知取舍

- Fumadocs社区规模小于Nextra（GitHub 10,300+ star vs Nextra周下载量约80万），但维护活跃（核心包近期仍在持续发版），第三方评测确认"生产就绪"
- 真实成本是工程时间投入（数据层与自建UI的拼接工作），不是零工作量的"装上就能用"

### 2.4 路由整合原则

内容库不引入独立的语言路由系统。Fumadocs只负责"MDX解析、搜索索引、页面树"这层数据处理，**locale前缀统一交给项目现有的next-intl机制管理**，内容库页面路径形如 `/{locale}/codex/...`，与产品其余路由风格保持一致，现有的`LanguageSwitcher.tsx`和语言优先级链可直接复用，不需要重新实现一套。

---

## 三、颗粒度政策

**默认原则：一个传统命理/玄学概念 = 一个词条，不做子主题拆分。**

例如"正官"是一个词条，"正官判定""正官代表的心理机制""正官宫位"等，都是"正官"这一篇词条内部的小节，不单独开设子词条。这样处理是为了保持概念一体性，避免过度拆分破坏阅读的完整性，同时控制单人产出内容库的工作量。

例外处理方式：若某个子主题未来被证实有独立的高搜索量/高价值（需要真实SEO数据支撑），届时可以针对性拆分，不需要提前预判。

---

## 四、词条外壳模板（写作规范）——⚠️ 未确认，仅为早期参考草稿

**状态说明：本节内容来自项目更早期讨论中的一份草案，用户当时已明确指出"这个环节应该在准备动笔写内容之前才讨论"，此后未被重新讨论或正式确认。本节不构成架构决议，仅作为未来讨论外壳规范时的参考起点，实际规范需重新与用户逐条确认后才能生效。**

以下为草案原文，供参考：

适用于每一篇独立词条，固定结构（内容具体撰写细节留待写手/正式施工阶段落实，此处仅定骨架）：

1. **第一句话**：交代该词条的直接前置知识（仅直接前置，不追溯全部血统），附带超链接
2. **第二句话**：阐明该概念的用途
3. **正文开头**：给出具体可感知的意象锚点（概念隐喻，如"甲木=大树"）
4. **正文内容**：结构化展开
5. **对比型组织者**（如适用）：天然成对的概念（如正官/七杀）可做对照区块
6. **双重编码**：每个词条配一个极简视觉符号，图文邻近摆放

### 4.1 写作纪律

- 同一篇文章中，同一词条只在首次出现时加链接（首次原则）
- 只有存在独立页面的词条才加链接（用文字变色+超链接实现，不用星号等符号标注）
- 格式规则零例外，破坏格式会导致递归导航链条断裂

---

## 五、文件架构

### 5.1 基本单位：概念优先（方案B）

每个正式词条一个文件夹，内含该词条的全部语言版本文件（而非按语言分文件夹）：

```
codex/china/bazi/shi-shen/ge-ju/
  en.mdx
  zh.mdx
  ja.mdx
  ...（所有语言文件同一文件夹）
```

理由：按词条推进的实际工作方式下，方案B能一目了然看到单个词条的多语言完整度；若按语言优先分文件夹，需跨9个文件夹追踪同一词条，不直观。

### 5.2 文明分层：元知识与体系平级

**背景**：部分知识（阴阳、五行、干支、四大元素、二十七/二十八星宿、业力轮回论等）起源难以考证、不被任何单一体系独占，却是诸多具体体系的共同源头。但这类元知识存在明确的文明边界——阴阳五行干支只在中国文明范围内被共享，四大元素只在西方文明范围内被共享，二者不互通。

**命名澄清**：这一层没有独立的、脱离具体文明的统称（不称"concepts层"或类似名称），每个文明目录（`china/`、`india/`、`europe/`等）内部，元知识与该文明下的具体体系是平级并列关系，都直接挂在文明目录下，不存在一个跨文明的中立层级容器。

**结构**：以"文明"为一层，元知识与具体体系在该文明层下平级并列：

```
codex/
├── china/
│   ├── yinyang（阴阳，元知识）
│   ├── wuxing（五行，元知识）
│   ├── ganzhi（干支，元知识）
│   ├── ershiba-xiu（二十八星宿，元知识，中国专属）
│   ├── bazi/（体系）
│   └── ziwei/（体系）
├── india/
│   ├── ershiqi-xiu（二十七星宿，元知识，印度专属）
│   ├── karma-samsara（业力轮回论，元知识）
│   └── jyotish/（体系）
└── europe/
    ├── four-elements（四大元素，元知识）
    └── hellenistic/（体系）
```

**元知识判定标准**：该概念被两个以上体系共享，才有资格升级为文明层的元知识；若只服务于单一体系（如"逻各斯"只关联哲学，所以在哲学体系内而非体系外），则老实留在该体系自己的文件夹内，按普通词条处理，不特殊化。

**不预设"超越文明边界的元知识"层级**：是否存在真正跨文明、任何文明都不能单独认领的元知识，目前未知也不必现在回答。若未来实际遇到此类情况，再在`codex/`根目录开设更高层级，不提前搭建用不到的架子（与5.3节"紫微斗数原则"一致）。

### 5.3 词条归属：跟随产品建设进度，而非历史起源（"紫微斗数原则"）

**核心原则**：词条应该归属于哪个体系文件夹，取决于产品目前实际支持/建设到哪一步，而非该概念在学术史上真正诞生于哪个体系。

**示例**：当前星盘功能完全基于文艺复兴占星，即便某些词条明知历史上源自古希腊占星，在"古希腊占星"这个组件被真正创建之前，这些词条仍暂时归属于文艺复兴占星文件夹。未来若建设古希腊占星组件，才回头研究词条起源、将对应词条迁移过去。

**设计取舍**：这带来"信息随架构进化自动上浮"的持续工作量，但被认为是最合理的方式——词条的家诚实反映产品当前实际能提供的内容边界，不会因为历史考据而超前展示尚未真正建设的体系。

---

## 六、共享片段机制（逻辑id复用）

### 6.1 适用场景

同一段实质内容，需要在多个独立词条页面中出现（例如"甲木作为日主"这段内容，既要完整出现在"日主"总览页面，也要完整出现在"甲"这个天干词条页面）。

**决策背景**：曾讨论"两个页面各自独立撰写、角度不同"的方案，但被否决——用户体验上，同一件事在两处以不同措辞呈现，读者会感到别扭；维护上，两份独立文字长期容易出现"改一处忘另一处、说法逐渐不一致"的风险。最终采用内容片段复用机制。

### 6.2 技术实现

内容片段不是独立词条，没有自己的URL，只是被正式词条引用的一段内容。

**核心原则：一个字段只有一个归属方——归属方是这个字段真正描述的对象，字段就存放在归属方自己的词条文件里。归属只有一个，但引用可以有任意多个：其他任何词条，只要用得上这个字段，都可以从归属方那里把它取过来引用，不需要、也不会在自己的文件里重新定义一份。**

例如十种日主的字段，归属方是"日主"这个概念本身（因为字段描述的是"十种日主分别是什么样"，这天然是日主自己的内容），因此存放在"日主"（`ri-zhu`）词条自己的文件里，用具名导出的方式区分各个字段：

```
// ri-zhu/zh.mdx（示意）
export const jia = "甲木作为日主……"
export const yi = "乙木作为日主……"
（十天干各自一个具名字段，写在文件顶部）

---
（下方是"日主"这个词条本身的正文，用于渲染日主词条页面）
```

一个词条文件因此同时承担两个角色：**它自己是一篇完整、可渲染的词条正文；同时可以携带若干具名导出的字段，供其他词条引用**，两者不冲突。"甲"这个天干词条页面讲到"作为日主"部分时，直接从`ri-zhu`文件里引入自己需要的那一个字段（`jia`）即可，不需要另外维护一个不属于任何词条的独立"片段文件"。

**片段撰写纪律**：片段内容应保持独立、通用，不写依赖上下文的过渡句（如"点击查看更多"），过渡与承上启下交给引用它的正文页面各自处理。

### 6.3 适用范围

不局限于八字模块内部，适用于整个内容库（含未来的六爻、梅花、周易、六壬、神煞等体系）。例如阴阳会被八字、六爻、梅花、周易共同引用，空亡会被六壬、神煞共同引用，均通过此机制复用，不重复撰写。

### 6.4 跨文明/跨体系引用不受目录边界限制

引用关系只取决于"逻辑id存在于哪个文件中"，不受文件所在文明目录或体系目录的限制。例如阿拉伯占星词条可以直接引用希腊占星文件夹中的片段，即便二者分属不同文明目录；紫微斗数词条大量引用密宗宿曜术的片段，即便二者同属中国文明但分属不同体系文件夹。这是同一套引用规则，不区分"文明内跨体系引用"与"跨文明引用"，不需要为后者单独设计逻辑。

---

## 七、SEO风险的真实边界（澄清此前讨论中的过度担忧）

- 搜索引擎判定的"重复内容"，指向大段文字近乎逐字相同的机械化复制，不是"两个页面涉及同一主题"
- Google对于内容重叠的常规处理方式是"过滤"，即多个高度相似的版本中只挑一个代表出现在搜索结果中，不是对整个页面或网站做惩罚性降权
- 真正触发处罚的是大规模、机械化、以操纵排名为目的的复制行为，不是"两个大体独立、完整的页面里，某个子话题存在实质性重叠"这种情况
- 页面整体质量与独特性的权重，远大于其中一小段内容重叠带来的负面信号；一个页面99%内容独一无二、仅1%与他处重叠，与"整篇文章都是重复拼凑"是完全不同的算法判定对象
- `canonical`标签只适用于"整页高度相似"的场景，不适用于"整体独立、仅局部重叠"的场景，不应被滥用于本项目的共享片段场景

**结论**：本项目选择的共享片段机制（同一段文字被多个页面引用，文本层面完全相同）虽然是更接近经典定义的重复内容，但按上述机制，最坏结果仅是"该重叠片段对应的搜索查询，两个页面中大概率只有一个会被搜索引擎选中展示"，不影响各自页面其余独有内容的正常排名。项目已明确决定内容完整性与用户体验优先于此风险，该风险评估支持这一决定的可行性。

---

## 八、URL变更与301重定向纪律

### 8.1 需要重定向的情况

仅当**拥有独立URL、已被搜索引擎索引过的正式词条**发生整体迁移时（例如"宫位"词条从`codex/china/bazi/gongwei`迁移到`codex/china/nayin/gongwei`），需要为旧URL设置301永久重定向指向新URL，避免死链、避免损失已积累的搜索权重。

### 8.2 不需要重定向的情况

**共享片段/逻辑id的迁移**（例如某片段从文艺复兴占星文件迁移到古希腊占星文件，见5.3节"紫微斗数原则"触发的迁移）不需要重定向。这类片段从未拥有独立URL，从未被搜索引擎单独索引过，其迁移纯粹是项目内部文件组织的调整，对用户和搜索引擎均无感知。

### 8.3 判断标准

以"该内容是否拥有独立URL"作为唯一判断依据：有，则挪动时必须配套301重定向；没有，则挪动无需任何面向搜索引擎的额外操作。

### 8.4 触发频率预期

正式词条的整体跨体系迁移预计是低频事件（不同体系下的词条一般是独立完整的讲解，不是同一内容简单换个归属）；片段级别的复用关系调整则会随产品进度推进（5.3节机制）持续发生，属于常态化的、低成本的维护工作。

---

## 九、待定与后续事项

- 具体词条清单：已确认八字板块首批范围——木火土金水（五行）+ 十天干各一词条 + 十二地支各一词条 + 十神各一词条（阴阳/五行本身作为元知识挪至`china/`层，不算作八字板块词条）
- 世界玄学完整谱系图：用户后续将持续扩充（本文档写作时仅有占星术体系源流传承图作为样本，展示了历史传承类关系的画法，但该图性质与"产品进度决定归属"的实际归档原则不同，仅供理解体系间历史脉络参考，不直接决定文件归属）
- 十神是否也需要共享片段机制：视未来"格局"词条或"日主×十神"交叉分析等场景的实际需要而定，未来出现复用需求时再套用第六节机制，不预先处理
- 外壳模板的具体文案规范、写手协作细则：留待正式施工/内容撰写阶段展开
- Sitemap与hreflang的具体技术实现：留待词条有实际产出后，交由Claude Code处理（预期可通过构建时扫描文件系统自动生成，不需要手动维护注册表）

---

## 十、技术地基施工记录（已完成，2026-08-01）

本节记录"内容库技术地基"这次施工里确认/踩坑的技术细节，供以后新会话对齐，不涉及产品决策（产品决策见第一~九节）。**本次只搭架子，没有写任何正式词条内容**，所有词条文件都是占位文字。

### 10.1 版本与依赖

- `fumadocs-core@16.14.0` + `fumadocs-mdx@15.2.1`，装在 `apps/web`
- 明确不装 `fumadocs-ui`
- 两者都显式支持 Next.js 16 / React 19.2+，与项目现有技术栈无版本冲突
- 额外装了 `remark-math` + `rehype-katex` + `katex`（公式渲染）

### 10.2 词条文件夹命名：拼音/罗马化slug（非中文字符）

产品讨论阶段（第五节）曾用拼音示例（`yinyang`、`shi-shen/ge-ju`），但施工说明书草稿一度写成中文字符文件夹名。**已跟用户确认：文件夹名一律用拼音/罗马化slug，不用中文字符**，理由是避免URL出现需要转码的中文字符，也和第五节已有示例保持一致。

首批已建好的骨架（`apps/web/content/codex/`）：

```
china/
├── meta.json
├── yinyang/          ← 阴阳（元知识，独立词条）
├── wuxing/           ← 五行（元知识，独立词条）
├── ganzhi/           ← 干支（元知识，独立词条）
└── bazi/
    ├── meta.json
    ├── wuxing/       ← 五行在八字里的具体展开，5个词条：mu/huo/tu/jin/shui
    ├── tiangan/      ← 十天干，10个词条：jia/yi/bing/ding/wu/ji/geng/xin/ren/gui
    ├── dizhi/        ← 十二地支，12个词条：zi/chou/yin/mao/chen/si/wu/wei/shen/you/xu/hai
    └── shishen/      ← 十神，10个词条：bi-jian/jie-cai/shi-shen/shang-guan/zheng-cai/
                        pian-cai/zheng-guan/qi-sha/zheng-yin/pian-yin
```

注意 `china/wuxing`（五行本身，元知识，单篇）和 `china/bazi/wuxing`（五行在八字里的5个具体展开）是两个不同路径，都叫"五行"是故意的，不是重复。

每个词条文件夹内是9个语言文件（`en.mdx`/`zh.mdx`/`zh-Hant.mdx`/`fr.mdx`/`es.mdx`/`ja.mdx`/`ko.mdx`/`it.mdx`/`de.mdx`），当前内容都是占位（frontmatter只有`title`，正文是"占位内容，待正式撰写。"）。

每个分类文件夹（`china/`、`bazi/`及4个子分类）配一个`meta.json`，字段用fumadocs原生的`metaSchema`（`title`/`pages`/`icon`等），本次只填了`title`（分类中文名）和`pages`（子项slug顺序），`icon`留空。fumadocs原生支持在`pages`数组里用`"[文字](https://...)"`语法插入外部链接条目，本次没有用到，但不需要额外开发。

### 10.3 i18n 目录约定和 fumadocs 内置 i18n loader 的适配

fumadocs-core 的 `loader()` 内置两种 i18n 文件解析模式：`dir`（locale是路径最前面一段，如 `zh/page.mdx`）和 `dot`（locale是文件名里的一段，如 `page.zh.mdx`，且默认语言不带locale后缀）。**这两种都不匹配"一个词条一个文件夹，文件夹里直接放 `zh.mdx`/`en.mdx`"这个已确认的目录约定**。

解决方式：`apps/web/src/lib/source.ts` 里写了一个 `remapForDirParser` 函数，在喂给 `loader()` 之前，把每个文件的虚拟路径从 `词条路径/locale.mdx` 改写成 `locale/词条路径.mdx`（复用 `dir` 解析模式），meta.json 则改写成 `$/词条路径/meta.json`（`$` 是 fumadocs 内置的"通配所有语言"写法，一份 meta.json 对所有语言都生效）。**这个改写只发生在内存里，磁盘上的目录结构完全不受影响**——以后新增词条，照样是"开一个新文件夹，里面放9个语言文件"，不需要关心这层适配。

### 10.4 KaTeX 公式渲染 vs 代码块语法高亮：已知冲突，本次关掉了后者

`remark-math` 把公式转成 hast 节点时，节点上会同时带 `language-math`（本来是给代码高亮用的兜底标记）和 `math-display`/`math-inline`（给 `rehype-katex` 用）两个 class。fumadocs 默认的代码高亮插件（Shiki）**不管你怎么排 `rehypePlugins` 数组顺序，永远最先跑**（写死在 `fumadocs-mdx` 的预设逻辑里，不受配置影响），一看到 `language-math` 就想按代码语言高亮，但 Shiki 没有叫"math"的语法，直接抛错崩溃整个页面。

试过用 `rehypeCodeOptions.langAlias: { math: 'plaintext' }` 把"math"这个语言名指向纯文本绕过，没有生效（可能是 fumadocs 这层转发 `langAlias` 到 Shiki 高亮器实例的方式有问题，没深挖到底）。**最终方案：`source.config.ts` 里直接把 `rehypeCodeOptions` 设成 `false`，整个关掉代码块语法高亮**，避免和公式渲染打架。代价是 MDX 里的 ` ``` ` 代码块目前不会有语法高亮颜色，只是普通等宽文本。这个不在本次任务范围内（任务本身没要求代码块高亮），但如果以后词条正文需要代码高亮，需要有人重新排查这个冲突。

踩坑教训：改 `source.config.ts` 后，`fumadocs-mdx` 会自动重新编译并打印"MDX restarting dev server"，但**排查过程中发现这个"重启"有时候不会清干净内部的 MDX processor 缓存**，改完配置测试没反应时，先整个杀掉 `next dev` 进程、删掉 `.next` 和 `.source` 目录再重新启动，比反复相信"热重载已经生效"更可靠。

### 10.5 链接校验：做成了内部 API 路由，不是独立脚本

原计划是写一个独立 Node/tsx 脚本做构建时死链检查。实测发现 `fumadocs-mdx@15.2.1` 的 collection 定义（`fumadocs-mdx/macro` 的 `defineDocs`）**只能在 Next.js 的 webpack/turbopack 构建流程里被正确解析**，脱离这套构建流程直接用 Node/tsx 导入会报错（`this macro was not compiled by the bundler plugin`）。试过用 `fumadocs-mdx/node` 提供的 `register()`（专门给独立脚本用的模块加载钩子）配 `tsx` 一起用，两者的模块钩子会冲突，没能跑通。

**改成实现为 `apps/web/src/app/api/codex/check-links/route.ts`**，复用 `pnpm dev`/`next build` 已经在跑的 `codexSourceLoader`（这套环境里 macro 已经被正确解析），扫描所有语言所有词条正文里的 markdown 相对链接，用 `getPageByHref` 验证目标是否存在，返回JSON死链列表。用法：本地服务器跑起来后访问 `/api/codex/check-links`。这不是纯粹的"构建脚本"，更像一个可以接入CI（起服务、curl这个路由、检查返回的`brokenCount`）的检查点，如果以后想要真正的独立CLI脚本，需要先解决上面那个宏解析冲突。

### 10.6 搜索、sitemap、llms.txt/llms-full.txt

- 搜索：`fumadocs-core/search/server` 的 `createFromSource(codexSourceLoader)` 生成 `/api/codex/search` 路由（Shiki同款的flexsearch/zbsearch方案，内置多语言分词，不需要额外配置各语言tokenizer），前端用 `fumadocs-core/search/client` 的 `useDocsSearch` + `fetchClient` 接一个极简搜索框（`components/codex/CodexSearchBox.tsx`），没有做视觉设计
- sitemap：`apps/web/src/app/sitemap.ts`，用 Next.js 原生 `MetadataRoute.Sitemap` 约定，遍历 `codexSourceLoader.getLanguages()` 生成全部语言×全部词条的URL
- llms.txt（索引版）：`apps/web/src/app/llms.txt/route.ts`，用 `fumadocs-core/source` 的 `llms()` 辅助函数直接从 page tree 生成，支持 `?lang=` 切换语言
- llms-full.txt（全文版）：`apps/web/src/app/llms-full.txt/route.ts`，遍历指定语言的所有词条，拼接原始 MDX 正文（已去掉 frontmatter），同样支持 `?lang=`

### 10.7 路由与 next-intl 的分工

`/{locale}/codex/[[...slug]]` 用一个可选的 catch-all 路由同时处理"内容库首页"（无slug，展示搜索框）和"具体词条页"（有slug），物理位置在 `(os)` 路由组之外，不带 Dock/TopBar。

fumadocs 的 `loader()` 生成页面URL时默认会带上locale前缀（`hideLocale`默认`never`），这正好和 Next.js 路由里 `[locale]` 段的实际结构对上，所以 `page.url`/搜索结果的`url`字段可以直接当作`<Link href>`用，不需要手工拼接locale。next-intl 只负责这一层"识别/切换当前locale"（复用现有的`LanguageSwitcher`组件），词条内容层面的语言选择完全由 fumadocs loader 的 i18n 机制处理，两边不冲突。

翻译层空壳接口 `getDisplayTree()`（`src/lib/source.ts`）本次直接透传 `codexSourceLoader.getPageTree(locale)`，未实现任何重排逻辑，用途见函数内注释。

### 10.8 `learn`/`wiki` → `codex` 改名（2026-08-01，第二次施工）

第一版施工用 `learn`（路由前缀）和 `wiki`（内容目录/模块命名）都只是讨论过程中的临时用词，事后与产品负责人重新核对，确认统一改为 **`codex`**。改名范围：

- 路由：`apps/web/src/app/[locale]/learn/` → `codex/`，页面路径 `/{locale}/learn/...` → `/{locale}/codex/...`
- 内容目录：`apps/web/content/wiki/` → `content/codex/`（366个文件原样搬移，未改动任何文件内容）
- 数据层：`src/lib/source.ts` 里 `wiki`/`wikiI18n`/`wikiSource`/`wikiSourceLoader` → `codex`/`codexI18n`/`codexSource`/`codexSourceLoader`，`dir: 'content/wiki'` → `'content/codex'`，`baseUrl: '/learn'` → `'/codex'`
- API：`/api/wiki/search`、`/api/wiki/check-links` → `/api/codex/search`、`/api/codex/check-links`
- 组件：`components/wiki/WikiSearchBox.tsx` → `components/codex/CodexSearchBox.tsx`
- 翻译：`messages/{locale}/wiki/` → `messages/{locale}/codex/`，`i18n/request.ts` 里的注册键 `wiki` → `codex`；顺带把英/法/西/日/韩/意/德7个语言文件里字面写着"wiki"的用户可见文案（搜索框placeholder等）也改成了"codex"（中文两个语言本来就写的是"内容库"，没有这个问题）
- 全局搜索确认：改名后在 `apps/web/src` 全目录搜索 `wiki`/`learn`（不区分大小写）零残留

踩坑教训：改完文件夹名后 `tsc --noEmit` 报了几个"找不到模块"的错，报错路径指向的是 `.next/dev/types/validator.ts` 这个Next.js自动生成的路由类型校验文件，不是真的代码错误——**这类改名操作后，如果type-check报错指向`.next/`或`.source/`这类生成目录，先删掉这些生成目录再重新跑一遍，不要直接怀疑改名改漏了**。

### 10.9 `content/` 顶层目录结构：确认保留，定义为"长文本内容统一存放层"

`content/` 与 `src/`（程序代码）、`public/`（静态资源）平级，判断标准：**这段文字是不是由人逐字撰写、不是靠代码结构拼出来的界面**，是则归 `content/`。已规划但本次不建实体文件夹（做到哪个模块再建哪个模块，不提前占位）：

```
content/
├── codex/   ← 内容库，已建成
├── blog/    ← 未来博客，尚未建
└── legal/   ← 未来服务条款/隐私政策等法律文本，尚未建，同样需要9语言版本+修改留痕
```

`blog/`、`legal/` 启动时按 `codex/` 已验证过的模式（一词条/一篇一文件夹，内含9个语言文件；`source.config.ts`/`lib/source.ts` 各自开一个独立的 collection 和 loader，不与 `codex` 共用一个 loader 实例）直接复用即可，不需要重新讨论这层架构。

---

## 十一、Keystatic 内容编辑后台（已完成，2026-08-04）

本节记录"给产品负责人一个网页后台，编辑 `content/codex/` 词条和 `messages/` 翻译文案，不用每次都求AI重新生成整份文件手动替换"这次施工的技术细节。只装了本地模式（local storage），不接 GitHub 模式/Keystatic Cloud，不需要账号登录。

### 11.1 装了什么、挂在哪

- `@keystatic/core` + `@keystatic/next`，装在 `apps/web`
- 后台路由：`/keystatic`（不带locale前缀，跟`/api/*`一样是独立于`[locale]`之外的顶层路由）
- 相关文件：
  - `apps/web/keystatic.config.tsx`（主配置，组装所有collection/singleton）
  - `apps/web/keystatic/`（`locales.ts`语言列表、`codex-collections.ts`词条collection、`codex-content-components.tsx`正文自定义组件、`messages-collections.ts`翻译词典singleton）
  - `apps/web/scripts/generate-keystatic-schema.js`（见11.3）
  - `apps/web/src/app/keystatic/`（Admin UI页面）、`apps/web/src/app/api/keystatic/`（API路由）
- **只在开发环境可访问**：`keystatic.config.tsx`导出`showAdminUI = process.env.NODE_ENV==='development'`，layout和API路由在非开发环境直接返回404，不会被意外部署到生产环境的公开路径
- **踩坑**：Next.js 16把`middleware.ts`改名叫`proxy.ts`了（本项目在`apps/web/src/proxy.ts`）。这个文件的matcher几乎拦截所有路径转给next-intl处理locale前缀，`/keystatic`不带locale前缀会被当成"缺locale"307重定向到`/en/keystatic`（一个不存在的路由），后台直接打不开。修法是在proxy.ts里让`/keystatic`跟`/api/`一样直接放行，不经过intl处理。以后如果还要加新的"不带locale前缀的顶层路由"，都要记得来这里加一条。

### 11.2 词条：为什么是"一个语言 = 一个collection"，而不是一个词条一个collection

`content/codex/` 现有约定是一个词条一个文件夹，里面9个语言文件（`en.mdx`/`zh.mdx`/...），**每个语言文件各自独立带自己的frontmatter（`title`）+ 正文**。

Keystatic的`format.contentField`机制只能把"一份frontmatter + 一份正文"合并进同一个文件，而且一个collection只能指定一个字段当这个"contentField"。如果把9个语言字段都塞进同一个collection（一个词条=一个entry），只有被指定为contentField的那一个语言能拿到独立frontmatter，其余8个语言的字段会被当成"纯正文附属文件"处理，没有自己的frontmatter——这样这8个语言的`title`就无处安放（要么被迫塞进一份跟正文分开的共享数据文件，要么干脆丢失），会导致9个语言文件的实际存储格式变得不对称，跟现有文件结构不一致。

**最终方案：一个语言 = 一个collection**，9个collection（`codexEntry_en`/`codexEntry_zh`/...），每个的`path`用字面量后缀锁死对应的语言文件名：

```ts
path: `content/codex/**/${locale}`   // 例如 content/codex/**/zh → content/codex/{词条路径}/zh.mdx
```

`**`部分对应词条在文件系统里的实际路径（可以任意深度嵌套，如`china/bazi/tiangan/jia`），末尾的locale是字面量，不参与通配。`slugField`直接复用`title`字段本身（`fields.slug`的标准用法：`name`部分对应frontmatter里的title文本，`slug`部分对应文件夹路径），这样磁盘上的frontmatter形状跟现有文件完全一致，只有`title`一个key，接入Keystatic不会让文件多出任何字段。

分类的`meta.json`（`china/`、`china/bazi/`、`china/bazi/wuxing/`等每一层都有一份）同理，单独一个`codexMeta`collection，`path: 'content/codex/**/meta'`，schema对齐现有的`title`+`pages`两个字段。

**已知风险**：`fields.slug`允许在编辑器里直接改"词条路径标识"这个slug值。一旦改了，Keystatic会把**当前正在编辑的这一个语言文件**（或者，如果是在`codexMeta`里改，整个分类文件夹）挪到新路径，但不会连带挪动其他8个语言的文件——因为9个collection是完全独立、互不知道对方存在的。改坏了会导致某个词条的9个语言文件从此对不上号。字段的`description`里已经写了中文警告，但Keystatic本身没有"禁止改slug"的开关，这是接入这套工具的已知代价，不是bug。**正常编辑正文/标题文字不会碰到这个风险**，只有主动去点"改slug"那个操作才会触发。

### 11.3 翻译词典：为什么多了一个构建前脚本，而不是直接在config里读文件

`messages/{locale}/`下的JSON命名空间文件（`ui.json`、`assessments/index.json`等）没有固定的一份手写schema——想不为几百个翻译key手写字段清单，思路是"读一份现有JSON文件当样本，自动递归推导出对应的Keystatic字段结构"（字符串→文本字段，对象→object字段，数组→array字段）。

**踩的坑**：Keystatic官方推荐用法里，Admin UI页面（`src/app/keystatic/keystatic.tsx`）是一个`'use client'`组件，直接`import`整个`keystatic.config`。这意味着config以及它所有的依赖都会被打进**浏览器端**bundle。如果"读JSON文件推导schema"这一步直接写在config运行时里（用`node:fs`），会在打浏览器端bundle时报错崩溃（`the chunking context does not support external modules (request: node:fs)`），因为`node:fs`没法在浏览器里跑。

**最终方案**：把"扫描`messages/`目录、读JSON样本、递归推导字段结构"这件事，挪到一个独立的构建前脚本`apps/web/scripts/generate-keystatic-schema.js`（纯Node、CommonJS，不需要额外装tsx之类的工具链），跑完之后把结构写成一份纯数据的`apps/web/keystatic/messages-shapes.generated.json`。`keystatic/messages-collections.ts`只负责读这份JSON、把"结构描述"翻译成真正的Keystatic字段对象（`fields.text`/`fields.object`/`fields.array`等），全程不碰`fs`，可以安全地被浏览器端bundle引用。

这个生成脚本接进了`package.json`的`predev`/`prebuild`（pnpm/npm会在跑`dev`/`build`之前自动先跑对应的`pre`脚本），正常开发流程完全不用手动管。生成出来的`messages-shapes.generated.json`本身进了`.gitignore`，不提交——它是纯派生数据，每次`predev`/`prebuild`都会重新生成，提交了也只会造成没意义的diff噪音。

推导schema时优先用`zh`语言的文件内容当样本（`zh`和`en`是CLAUDE.md里明确要求"必须完整"的两个语言），`zh`没有才退而求其次用`en`，再退而求其次用语言列表里第一个存在这个文件的。命名空间文件清单本身是"所有语言目录取并集"得出的，不是只看某一个语言——这样即使某个语言缺了整份文件（比如目前`es`/`ja`/`ko`/`it`/`de`都缺`bigfive/index.json`和`western/index.json`，`fr`缺`western/index.json`），Keystatic后台里依然会出现对应的编辑入口（读取时优雅返回空/null，不报错），正好可以拿这个后台直接把缺的翻译补上。

每个命名空间对应9个语言 × 1个singleton，一共扫出了9个命名空间文件（`ui.json`、`assessments/index.json`、`bazi/index.json`、`bigfive/index.json`、`bigfive/questions.json`、`western/index.json`、`mindcards/index.json`、`codex/index.json`，以及`dock/index.json`——这个是目前只有zh语言存在、且没接入`i18n/request.ts`实际加载管道的疑似孤儿文件，Keystatic后台里依然给它建了编辑入口，但要注意它可能跟"孤儿文件"这个待办状态本身有关，不代表页面真的会读到这份翻译）。

新增一个全新的命名空间文件（比如未来新模块的`index.json`）时，正常走`predev`/`prebuild`下次启动/构建就会自动认出来；如果想在不重启的情况下让Keystatic后台立刻认出它，手动跑一次`node scripts/generate-keystatic-schema.js`即可。

### 11.4 词条正文里的自定义组件：Cite + Media

`fields.mdx()`支持传一个`components`选项，把MDX正文里出现的自定义JSX标签映射成Keystatic编辑器里的可视化组件块，定义在`apps/web/keystatic/codex-content-components.tsx`：

- **Cite**（`wrapper`类型，有开合标签，包裹一段正文）：对应现有词条里已经在用的`<Cite title="..." url="...">被引用的文字</Cite>`，字段是来源标题+来源链接
- **Media**（`block`类型，自闭合标签，无children）：本次施工说明书要求的"最简版本"图片/视频嵌入块，**只有一个链接字段，没有尺寸/位置选项**，编辑器内`ContentView`直接用文件后缀判断渲染`<video>`还是`<img>`，做到实时预览

### 11.5 验证方式与结论

没有可用的浏览器自动化工具，这次验证走的是两条路：

1. **冷启动验证**：清空`.next`/`.source`后完整跑一遍`pnpm dev`，确认`/keystatic`和落地页`/`都返回200、内容完整、没有真实报错字符串（页面HTML里出现的"error"字样是Next.js内置错误边界的固定占位代码，`"error":"$undefined"`说明这个槽位是空的，不是真报错）
2. **数据正确性验证**：用`@keystatic/core/reader`的`createReader`直接在一个临时API路由里读取现有数据（读完立刻删除这个临时路由），确认：
   - 词条`china/bazi/tiangan/jia`的`zh`/`en`两个语言collection都能正确读出`title`（"甲"）和正文
   - 分类`china/bazi`的`meta.json`能正确读出`title`+`pages`
   - 翻译词典`ui.json`（zh）能正确读出`nav.home`（"主页"）
   - 缺文件的语言（`de`的`western/index.json`）读取时优雅返回`null`，不报错
   - `codexEntry_zh`collection的`list()`能列出全部369个词条slug，包含预期的多层嵌套路径

**结论：读取链路（路径解析、frontmatter拆分、动态schema生成、slugField复用title）全部验证通过。** 没有做的：浏览器里真人点击"保存"按钮的实际写入回归测试——Keystatic的写入(`serialize`)是读取(`parse`)的对称操作，理论上不会比读取更容易出错，但这终究是没有亲眼见证过的一步，建议找机会用真实浏览器走一遍"打开甲词条→改一个字→保存→确认磁盘文件更新"的完整流程做最终确认。