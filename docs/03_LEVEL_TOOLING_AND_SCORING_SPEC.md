# 自动化关卡工具链、可扩展 Schema 与难度评分引擎（Milestone 3）

> **模块路径**：`src/game/levels/`（纯 TS 核心）、`src/studio/`（Web 可视化工作台）
> **核心目标**：彻底解决人工手摆上千个微砖块效率低的问题，建立**“结构可扩展 + 自动化批量生产 + 物理盲测精准打分”**的工业化内容管线。

---

## 1. 可扩展关卡数据格式（`LevelSchema.ts`）

采用 **`元数据 + 调色板字典 + RLE 压缩网格`**，单关 1600 格压缩后仅约 `300~800 bytes`，500 关总体积 `< 300KB`。

```typescript
export interface TilePaletteEntry {
  symbol: string;       // 单字符编码，如 '.', 'R', 'G', 'S', '2', 'B'
  role: BrickRole;      // EMPTY | NORMAL | STEEL | BOMB | PRISM | CORE
  hp: number;           // 耐久度（NORMAL 可为 1, 2, 3...；STEEL 为 9999）
  color: string;        // 十六进制填充色，如 '#ef1d1d'
  dropTag?: string;     // 预留：击碎掉落（如 'skill_blue' | 'skill_orange' | 'buff_3choose1'）
}

export interface LevelMechanicsConfig {
  defaultBallSpeed?: number;
  initialSkills?: { multiLaunch: number; tripleSplit: number };
  // --- 预留 Step 2~4 扩展字段 ---
  rotationSpeedDegPerSec?: number; // 预留：如齿轮阵自转
  bossMode?: boolean;              // 预留：Boss 像素体
  roguePoolId?: string;            // 预留：三选一词条池
}

export interface LevelDefinition {
  version: 1;
  id: string;
  name: string;
  cols: number;          // 建议范围 28 ~ 48，默认 42
  rows: number;          // 建议范围 24 ~ 42，默认 36
  palette: Record<string, TilePaletteEntry>;
  /**
   * RLE 压缩格式，如 "42.|10S22R10S|..."
   * 行间用 '|' 分隔，单格前带数字表示重复次数（如 "10S" = 10个钢墙，"R" = 1个红砖）
   */
  rleGrid: string;
  difficultyScore?: DifficultyReport; // 由评分引擎自动写入
  mechanics?: LevelMechanicsConfig;
}
```

### 编解码规则要求
* `encodeRLE(grid)` 与 `decodeRLE(levelDef)` 必须严格无损可逆，并编写单元测试验证边界（如全空行、跨行不合并、数字 `>= 1` 解析）。

---

## 2. 三大自动化关卡生成器（`LevelGenerators.ts`）

### 生成器 A：文字 / PNG 像素图一键转关卡（`fromImageOrText`）
* **用途**：1 秒复刻截图 2 的“干”字关、或把任何图标/文字变成可玩关卡。
* **实现算法**：
  1. 接收灰度像素矩阵或离屏文字栅格化结果（支持模式：`POSITIVE` 文字本体为砖块 / `NEGATIVE` 背景铺满砖块、文字笔画镂空为通道，正好还原截图 2 效果！）。
  2. 按目标 `(cols, rows)` 下采样二值化（阈值可调）。
  3. 支持**“自动外框包边”**选项（如自动在四周加一圈 `STEEL` 灰墙，底部居中留出 `6~8` 格发球入口，复刻截图 3 效果）。

### 生成器 B：对称几何图腾生成器（`generateSymmetricTotem`）
* **用途**：批量生成类似截图 1 齿轮太阳阵、曼陀罗、蝶形等极具视觉美感的关卡。
* **实现算法**：
  1. 仅生成左上角 `1/4` 或 `1/8` 区域（结合极坐标环形半径掩码 + 径向辐条 + 中心空腔）。
  2. 通过 4 象限镜像复制，在图腾轮廓边缘自动镶嵌 `STEEL` 灰墙描边，并**强制确保底部中央至少有一条宽度 `>= 3` 格的“引流通道”直通中心空腔**，保证玩家能把球打进去挖洞！

### 生成器 C：迷宫挖洞通道生成器（`generateExcavationMaze`）
* **用途**：批量产出耐玩、结构多变的策略穿洞关。
* **实现算法**：
  1. 先用普通可碎砖块填满矩形区域（或分成类似截图 3 的多个矩形块矩阵）。
  2. 用随机有向掘进算法（Random Walk Carver）自底向上挖掘 `1~2` 条 `2~3` 格宽的曲折通道通往内部盲盒空腔。
  3. 依据难度参数，在部分壁垒下方嵌入一定比例的 `STEEL` 墙，迫使玩家必须通过角度反弹绕过钢墙进入上层。

---

## 3. 自动化难度打分引擎（`DifficultyScorer.ts`）

严禁只统计“砖块数量”作为难度！本引擎采用 **静态结构分析（40%）+ 无头物理盲测模拟（60%）** 给出 `0 ~ 100` 精准评分及废关拦截：

```typescript
export interface DifficultyReport {
  totalScore: number;           // 0 ~ 100 综合难度分
  tier: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  breakableCount: number;       // 可破坏砖块数
  steelOcclusionRatio: number;  // 钢墙遮挡比（位于可碎砖下方的钢墙占比）
  simBreakRate20s: number;      // 模拟前 20 秒平均清砖率 (0~1)
  hasDeadZoneWarning: boolean;  // 是否存在封闭死区（外部球完全无法触及的砖块）
}
```

### 评分核心逻辑
1. **死区连通性检测（BFS/Flood Fill）**：
   * 从挡板所在区域出发，按 `8` 邻域（但允许斜穿至少 `2` 格空隙或从可破坏砖块一路打通，**仅不可破坏的 `STEEL` 封闭围墙会阻断连通**）做连通性检查。
   * 如果存在被 `STEEL` 死死封住且没有任何开口的 `NORMAL` 砖块，立即标记 `hasDeadZoneWarning = true`（废关警告，禁止进入正式关卡库！）。
   * **默认发球线封死检测（M2 实测盲区，M3 必须实现）**：从默认发球位（挡板中心正上方、角度 0° 的垂直线，宽度至少覆盖球 AABB 跨越的 2 个网格列）向上追踪，若该通道在抵达首个可破坏砖之前被连续 `STEEL` 封死，同样按废关拦截，禁止入库。机理：`docs/01` §3.5 规定 `bouncesSinceBrick` 每次撞击挡板即清零，球一旦在「钢墙 ↔ 挡板中心」之间形成二点垂直弹跳腔，18 次死锁自救阈值永远无法累计，最小垂直分量保护只管水平腔体、残局软追踪又要求剩余砖块 ≤ 12，三者均不触发，回合永不收敛（M2 无头冒烟实测：12000 帧零 `BRICK_HIT`）。M2 的齿轮阵与框体绿砖门已通过几何开门（中轴通道、框体底边入口）规避，M3 校验器须在生产侧兜底，任何生成器或手工关卡都不得绕过。
2. **静态拓扑分（满分 40）**：
   * 基于总血量密度、`STEEL` 墙遮挡占比（`STEEL` 越靠下方遮挡越严密，分数越高）、底部入口最窄通道宽度计算。
3. **Headless 蒙特卡洛物理盲测（满分 60）**：
   * 直接实例化 `src/game/core/GameEngine`（无渲染器、无音频），模拟 **8 个典型开局角度**（如 `±15°, ±30°, ±45°, ±60°`），以 `FIXED_DT` 运行 `20` 秒虚拟时间（挡板开启简易自动追踪接球 AI 避免过早掉落）。
   * 统计所有角度下 20 秒内**平均消砖百分比 `simBreakRate20s`**：
     * 消砖率越快（如 `> 45%`），说明结构极易钻洞爆破，偏爽快解压关（难度分低）；
     * 消砖率越慢（如 `< 12%`），说明钢墙阻挡极强、必须精准找角度或依赖技能，偏硬核挑战关（难度分高）。
   * *性能指标*：单关 8 轮 × 20 秒物理模拟在 JS 中执行总耗时应控制在 **`< 150ms`**。

---

## 4. Web 端可视化关卡工作台（`src/studio/`）

在 Web 版中提供一个侧边/模态工具界面 **Level Studio**，供策划或开发者直接使用：
1. **绘图画布**：点击/拖拽绘制砖块，支持选色板（红砖/绿砖/钢墙/橡皮擦）、**一键开启左右镜像 / 四象限镜像**。
2. **一键自动生成面板**：
   * “汉字/文字成关”输入框（输入任意字符立即生成）；
   * “PNG 像素图上传导入”（读取图片像素自动转 RLE）；
   * “随机对称图腾 / 迷宫通道”一键抽卡。
3. **实时难度仪表盘**：画完或生成后点击“物理盲测打分”，立即展示 `totalScore`、难度评级、死区警告状态。
4. **一键试玩 & 导出 JSON**：点击“立即试玩”直接把当前编辑器关卡注入游戏引擎开打；满意后复制 JSON 追加到 `builtinLevels.ts`。

---

## 5. 首批内置关卡库规划（`builtinLevels.ts`）

Milestone 3 交付时，必须内置 **20 个已完成自动打分并按难度平滑排序的关卡**，其中至少包含：
* 第 1~3 关（新手解压爽关，难度 15~30）：开放式像素方块、经典对称图形、双列绿砖门（致敬截图 3）。
* 第 4~10 关（钻洞技巧关，难度 35~55）：齿轮迷宫（致敬截图 1）、汉字阵列（致敬截图 2 的“干”字及“中”“回”“王”等经典结构）。
* 第 11~20 关（高密度多墙策略关，难度 60~85）：多层钢墙隔断、双腔室、高血量复合色砖阵。
