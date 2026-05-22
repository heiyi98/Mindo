\# Mindo 算法与核心决策文档



\## 一、八字能量算法完整公式



\### 静态数据

\*\*藏干基础分\*\*（传统命理藏气比例）：

```

子：癸30 | 丑：己18/癸9/辛3 | 寅：甲16/丙7/戊7

卯：乙30 | 辰：戊18/乙9/癸3 | 巳：丙16/庚7/戊7

午：丁21/己9 | 未：己18/丁9/乙3 | 申：庚16/壬7/戊7

酉：辛30 | 戌：戊18/辛9/丁3 | 亥：壬21/甲9

```



\*\*月令系数\*\*：

```

得令（同五行）×2.0 | 近旺（月令所生）×1.33

泄气（生助月令）×0.83 | 受制（月令所克）×0.67

失令（克制月令）×0.33

```



\*\*宫位权重（勾股定理，日干坐标(1,3)为原点）\*\*：

```

年干(1,1)→√4=2.00→权重0.50

年支(2,1)→√5=2.24→权重0.45

月干(1,2)→√1=1.00→权重1.00

月支(2,2)→√2=1.41→权重0.71

日支(2,3)→√1=1.00→权重1.00

时干(1,4)→√1=1.00→权重1.00

时支(2,4)→√2=1.41→权重0.71

```



\### 七步执行顺序

```

步骤0：天干五合判定

&#x20; 真化条件（三个同时满足）：

&#x20; 1. 两干宫位紧贴（年月/月日/日时相邻）

&#x20; 2. 月令生助化神

&#x20; 3. 全局无天干克化神

&#x20; 真化→改写五行 | 否则→合绊（对外输出=0）



步骤1：透根判定（化神后扫描）

&#x20; 透根系数 = 藏干基础分 ÷ 30（无上限）

&#x20; 总透根系数 = 所有根的系数之和



步骤1.5：十神挂载（基于化神后五行）

&#x20; 同我：比肩/劫财 | 我生：食神/伤官

&#x20; 我克：偏财/正财 | 克我：七杀/正官

&#x20; 生我：偏印/正印（同阴阳为偏，异阴阳为正）



步骤2：地支关系标注（只记录，不进能量计算）

&#x20; 三会>三合/半合/拱合>六合>六冲>刑>害>破



步骤3：月令系数（全局环境修正）



步骤4：独立能量计算

&#x20; 天干：30 × 月令系数 × (1 + 总透根系数)

&#x20; 藏干：基础分 × 月令系数



步骤5：合绊/墓库标记

&#x20; 合绊：能量保留，对外输出=0（日干例外）

&#x20; 墓库（辰戌丑未）：无透出藏干→墓库待用，对外输出=0



步骤6：宫位距离权重（勾股定理）



步骤7：十神影响力总值

&#x20; 影响力 = 独立能量 × 宫位权重

&#x20; 按十神分组求和，合绊/墓库节点不计入

```



\---



\## 二、真太阳时算法



\### 原则

用户输入的时间永远是出生地行政时区时间（不是地理时区）。



\### 计算步骤

```

1\. 用城市经纬度查 administrative-timezones.ts → 行政时区IANA名

2\. 用Intl.DateTimeFormat计算该时区UTC偏移（处理+5:30、+5:45等特殊时区）

3\. 行政时间转UTC：localMinutes - utcOffsetMinutes

4\. 均时差（Spencer公式）：

&#x20;  B = (2π/364) × (dayOfYear - 81)

&#x20;  eot = 9.87×sin(2B) - 7.53×cos(B) - 1.5×sin(B)

5\. 真太阳时 = UTC + (经度×4分钟) + 均时差

6\. 结果用于排盘（传给lunar-typescript）

```



\### 时区数据来源

`apps/web/src/lib/administrative-timezones.ts`

\- 单时区国家：country\_code → IANA名称

\- 多时区国家（美国/澳大利亚/俄罗斯/巴西/加拿大/印尼）：

&#x20; country\_code + ISO3166-2省级代码 → IANA名称

\- 数据来自Nominatim的addressdetails=1返回的country\_code和ISO3166-2-lvl4



\---



\## 三、BaziSnapshot数据结构



\### 七段式存储（存入snapshots.calculation\_result）

```typescript

{

&#x20; meta:     { solarTime, lunarTime, jieQi }

&#x20; pillars:  {

&#x20;   year/month/day/hour: { stem, branch }

&#x20;   yuelingWuxing: Wuxing

&#x20;   tianGanNodes: TianGanNode\[]

&#x20;   cangGanNodes: CangGanNode\[]

&#x20; }

&#x20; relations: {

&#x20;   tianGanHe: TianGanHe\[]      // 五合结果

&#x20;   tianGanChong: TianGanChong\[] // 相冲

&#x20;   diZhiRelations: DiZhiRelation\[] // 地支关系（只标注）

&#x20; }

&#x20; tougen:   { touGenResults, cangGanVisibility }

&#x20; energy:   { energyNodes: EnergyNode\[] }

&#x20; shishen:  { shishenMap: ShiShenNode\[] }

&#x20; influence:{

&#x20;   shishenInfluence: ShiShenInfluenceGroup\[]

&#x20;   dayMasterEnergy: number

&#x20; }

&#x20; dayStem: TianGan      // 前端展示用

&#x20; energyScores: Record<Wuxing, number>  // 前端展示用

}

```



\### 旧格式检测

```typescript

const isNewFormat = 

&#x20; snapshot.calculation\_result?.pillars?.yuelingWuxing !== undefined \&\&

&#x20; snapshot.calculation\_result?.relations !== undefined \&\&

&#x20; snapshot.calculation\_result?.influence !== undefined;

```



\---



\## 四、Gemini数据清单格式



`formatBaziDataSheet`输出结构（全中文，传给Gemini）：

```

【一、基础命盘】四柱+月令

【二、藏干明细】各支藏干+本气中气余气+基础分

【三、天干关系】五合结果+相冲

【四、地支关系标注】所有关系只标注

【五、透根与隐显】各天干透根情况+藏干隐显

【六、独立能量】各节点能量+状态

【七、十神挂载】各节点十神

【八、十神影响力总值】按十神分组汇总

```



格局判定和用神判断交给Gemini自行分析，不在代码里硬编码。



\---



\## 五、大五人格算法



\### 题目结构

\- 120题，按domain/facet/direction排列（dictionary.ts）

\- 题目文本存在messages/{locale}/bigfive/questions.json（q001-q120）

\- 计算不依赖语言，使用ipipNeo120Dictionary



\### 计算逻辑

```

1\. 用questionId匹配dictionary

2\. direction=1：actualScore = answer.score

3\. direction=-1：actualScore = 6 - answer.score

4\. 按domain/facet分组累加

5\. 输出BigFiveReport（5个domain，30个facet）

```



\---



\## 六、重要产品决策



1\. \*\*付费模式\*\*：Lemon Squeezy（国际），中国版支付待定

2\. \*\*AI解读语言\*\*：永远用中文生成，其他语言通过AI翻译（缓存在ai\_reading\_translated字段）

3\. \*\*格局用神判断\*\*：由Gemini自行分析，不硬编码

4\. \*\*地支关系\*\*：只标注，不进能量计算，交给Gemini分析

5\. \*\*透根系数\*\*：无上限，由命盘自然结构决定最大值

6\. \*\*月令\*\*：是全局环境修正系数来源，不是普通宫位

7\. \*\*时区选择器\*\*：用户可手动修改，但默认值永远是出生地行政时区

