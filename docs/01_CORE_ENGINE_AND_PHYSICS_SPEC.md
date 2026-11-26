# 核心物理引擎与逻辑内核规范（Milestone 1）

> **模块路径**：`src/game/core/`
> **硬性约束**：零 DOM、零 Canvas、零 WebAudio、零 React、零 `wx.*`。全部时间推进由外部传入固定步长 `dt` 驱动（确定性模拟，支持 Web 试玩、Node 单元测试及 Headless 关卡盲测）。

---

## 1. 逻辑坐标系与舞台布局

为完美适配微信小游戏主流竖屏（9:16 至 9:21）及截图视觉比例，内核统一使用固定逻辑空间：

* **逻辑画布尺寸**：`WORLD_WIDTH = 720`，`WORLD_HEIGHT = 1280`
* **垂直分区规划**（预留微信顶部胶囊栏与底部安全区）：
  * `y ∈ [0, 110]`：顶部 HUD 区（快进 `>>`、重开 `↻`、关卡号 `● 03`、暂停 `||`）。
  * `y ∈ [120, 780]`：**砖块矩阵区（Brick Arena）**。
    * 水平边距 `paddingX = 24`，有效宽度 `672`。
    * 默认高密度网格：`cols = 42`、`rows = 38`（单格尺寸 `cellSize = 16px`，总计 `1596` 格；支持关卡自定义 `cols ∈ [28, 48]`、`rows ∈ [24, 42]`，居中自动适配 `cellSize`）。
  * `y ∈ [780, 1080]`：弹射与接球缓冲空域（左侧悬浮暂停/蓝标/橙标技能按钮区与砖块区互不遮挡，技能区在渲染/UI层点击不触发误发球）。
  * `y = 1090`：**挡板中心线（Paddle Y）**。
  * `y = 1190`：**死亡底线（Death Line Y）**（球心 `y - radius > 1190` 判定出界丢失）。
* **左右边界墙**：`x = 16` 与 `x = 704`；**顶部边界墙**：`y = 112`（确保球能打到最顶排砖块，同时不遮挡顶部 HUD）。

---

## 2. 核心类型与接口契约（`src/game/core/types.ts`）

MiniMax 必须严格按照以下接口定义核心数据结构（后续扩展 Step 2~4 特性只需追加可选字段，不可破坏已有字段语义）：

```typescript
export type GamePhase =
  | 'READY_AIM'   // 开局或等待发球：球停靠在挡板上，玩家拖动瞄准并松手发射
  | 'PLAYING'     // 球飞行战斗中
  | 'PAUSED'      // 暂停
  | 'WON'         // 所有可破坏砖块清零
  | 'LOST';       // 所有活跃球出界（可触发复活或重开）

export type BrickRole =
  | 'EMPTY'       // 0: 空位
  | 'NORMAL'      // 1: 普通可破坏砖块（1血或多血）
  | 'STEEL'       // 2: 不可破坏灰墙（阻挡反射，不计入过关目标）
  // --- 以下为 Step 2~3 预留扩展角色，V1 解析时可先按 NORMAL 或空位降级/预留钩子 ---
  | 'BOMB'        // 炸弹砖
  | 'PRISM'       // 折射分裂砖
  | 'CORE';       // 特殊核心砖

export interface BrickCell {
  role: BrickRole;
  hp: number;
  maxHp: number;
  colorIndex: number; // 对应关卡 Palette 索引
  dropTag?: string;   // 预留掉落物标识
}

export interface Ball {
  id: number;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pierceCount: number; // 预留穿透次数（V1 默认 0）
  bouncesSinceBrick: number; // 连续未击碎砖块的反弹计数（防死循环用）
}

export interface Paddle {
  x: number;         // 中心 X
  y: number;         // 固定 Y = 1090
  width: number;     // 默认 116
  height: number;    // 默认 18
  targetX: number;   // 目标平滑位置
}

export interface SkillInventory {
  multiLaunchCount: number; // 蓝标（...）：从挡板额外连发一波小球
  tripleSplitCount: number; // 橙标（品字三点）：场上现有小球全部一分为三
}

export type GameEvent =
  | { type: 'BRICK_HIT'; col: number; row: number; x: number; y: number; color: string; destroyed: boolean; combo: number }
  | { type: 'WALL_HIT'; x: number; y: number }
  | { type: 'PADDLE_HIT'; x: number; y: number; offsetRatio: number }
  | { type: 'SKILL_USED'; skill: 'MULTI_LAUNCH' | 'TRIPLE_SPLIT'; spawnedCount: number }
  | { type: 'BALL_LOST'; remainingBalls: number }
  | { type: 'GAME_WON'; levelId: string; elapsedSec: number }
  | { type: 'GAME_LOST'; levelId: string; remainingRatio: number };
```

---

## 3. $O(1)$ 网格空间碰撞与 Sub-stepping 物理算法（`PhysicsEngine.ts`）

### 3.1 为什么禁用通用刚体物理？
在 `200球 × 1600砖` 高频撞击下，通用物理引擎不仅开销大，而且相邻两块正方形砖块的公共边会产生 **Ghost Vertex（鬼影角点）** 导致球在平滑砖面上莫名垂直弹回。本游戏必须采用以下确定性网格物理：

### 3.2 Sub-stepping（步长细分）铁律
* 基础球速：`BASE_BALL_SPEED = 680 px/s`，球半径：`BALL_RADIUS = 6.5 px`。
* 固定逻辑帧：`FIXED_DT = 1 / 60`（约 `16.667ms`）。当开启 `×2` 或 `×3` 快进时，外部逻辑每帧循环执行 `2` 次或 `3` 次 `step(FIXED_DT)`（**切忌直接把 `dt` 乘以 3 传入单步计算**！）。
* **子步长细分**：在每次 `step(dt)` 内，根据球当前速度计算最大安全子步数：
  $$\text{maxDisp} = \text{speed} \times dt, \quad \text{subSteps} = \max\left(1, \left\lceil \frac{\text{maxDisp}}{\text{radius} \times 0.45} \right\rceil\right)$$
  每子步位移不超过半径的 `45%`，**彻底杜绝任何角度的穿墙与越过单格灰墙**。

### 3.3 单个子步内的网格碰撞查询（$O(1)$）
1. 推进位置：`ball.x += ball.vx * subDt; ball.y += ball.vy * subDt;`
2. 先检测**世界三边墙体**（左 `x=16`、右 `x=704`、顶 `y=112`）：位置回拉夹紧（Clamp）并反转对应轴速度。
3. **砖块网格查表**：根据球的包围盒 `[ball.x - r, ball.x + r] × [ball.y - r, ball.y + r]` 映射到网格索引 `[colMin..colMax] × [rowMin..rowMax]`（通常仅 `1~4` 个格子）。
4. 对命中的非空格子计算**圆心到格子 AABB 的最近点 `(closestX, closestY)`**：
   * 若 `distSq < r * r`：
   * **Ghost Vertex 防护处理**：在子步中若球同时接触两个相邻格子（例如同行的 `(c, r)` 和 `(c+1, r)`），**优先选取穿透深度（overlap）最大、或与速度方向法线对齐度最高的主碰撞面结算反弹**，本子步内一旦发生一次轴向速度反转，立即更新球位置推出穿透区（Push-out），避免在同一角点连弹两次导致速度反转失效。
   * **多血砖与灰墙扣血**：
     * `role === 'STEEL'`：仅反弹，不扣血，触发 `WALL_HIT`（或低沉金属音，不计 Combo）。
     * `role === 'NORMAL'`：扣减 `damage = globalDamageMultiplier`（平时为 1，球数溢出时提升）。若 `hp <= 0` 则置为 `EMPTY`，`remainingBreakable--`，触发 `BRICK_HIT(destroyed=true)`。

### 3.4 挡板反弹角度映射（核心手感灵魂）
绝对不能做纯镜面反射 `vy = -vy`！否则玩家无法控制发射/救球方向：
* 当球下落（`vy > 0`）并与挡板顶面 AABB 相交时：
  * 计算相对撞击偏移：
    $$\text{offset} = \text{clamp}\left(\frac{\text{ball.x} - \text{paddle.x}}{\text{paddle.width} / 2}, -1, 1\right)$$
  * 映射出射偏转角（以垂直向上为 `0°`）：
    $$\theta = \text{offset} \times 68^\circ$$
  * 新速度向量：
    $$v_x = \text{speed} \cdot \sin(\theta), \quad v_y = -\text{speed} \cdot \cos(\theta)$$
  * 将球 `y` 夹紧至 `paddle.y - paddle.height / 2 - ball.radius - 0.1`，防止连续两帧重复吸附在挡板上。

### 3.5 防水平/垂直死循环微扰机制
* **最小垂直分量保护**：每次墙面或砖块反弹后，强制检查 `|vy| < speed * 0.18`（即角度过于水平 `< 10°`）时，保持 `vy` 符号不变，强行将 `|vy|` 抬升至 `speed * 0.22` 并重新归一化速度向量。
* **久未破砖自救**：每个球维护 `bouncesSinceBrick`。击碎可破坏砖块或撞击挡板时归零；若撞击灰墙/顶边墙累计达到 `18` 次仍未碰到可破坏砖，自动向速度向量注入 `±6° ~ ±12°` 的随机偏转，帮助球自然跳出死循环腔室。

---

## 4. 虚线瞄准线预测器（`AimRaycaster.ts`）

对应截图 1、2 中的白色圆点瞄准线（含**一次碰撞折线预览**）：
* **触发时机**：`phase === 'READY_AIM'` 时（球停在挡板上方中心 `y = paddle.y - paddle.height/2 - radius`）。
* **操作手感**：玩家在屏幕按住并拖拽，根据手指相对按压起点或指向挡板上方的向量确定发射角 `aimAngle ∈ [-72°, +72°]`。
* **射线步进算法**：
  * 从发球点沿 `aimAngle` 以固定步长 `step = 4px` 发射虚拟射线（最大长度 `900px`），复刻与 `PhysicsEngine` 相同的墙体与网格命中判定。
  * 记录第 1 段路径与第 1 个碰撞点 `hitPoint`，计算法线反射方向，再延伸约 `140px` 的第 2 段折线预览。
  * 输出等距采样点数组 `AimDot[]`（间距 `22px`），交由渲染层绘制白色圆点（越接近末端透明度可轻微衰减）。

---

## 5. 双主动技能与性能保护机制（`SkillSystem.ts`）

### 5.1 蓝标技能：`MULTI_LAUNCH`（连发加球）
* 消耗 `multiLaunchCount - 1`。
* 效果：在挡板当前位置上方，以微扇形角度（如 `-15°, -5°, +5°, +15°`）或短间隔队列（每隔 `80ms` 发射 1 颗，共发射 `5` 颗或可配置 `N` 颗）发射全新小球。
* 适用场景：开局快速铺场、或场上只剩 1~2 颗球时瞬间挽救火力。

### 5.2 橙标技能：`TRIPLE_SPLIT`（全场裂变 ×3）
* 消耗 `tripleSplitCount - 1`。
* 效果：遍历当前所有存活球体，**每颗球在原地额外分裂出 2 颗新球**（总计 1 变 3），新球速度方向相对原球分别偏转 `-22°` 与 `+22°`。
* **关键防死机保护（Ball Cap & Overflow Damage）**：
  * 设定物理渲染最大同屏球数 `MAX_PHYSICAL_BALLS = 200`（使用固定容量对象池 `BallPool[200]`）。
  * 当触发分裂导致预计球数超过 `200` 时：**物理层不再继续新增超过上限的球体，而是将超出的倍率动态转化为 `globalDamageMultiplier`（或持续 8 秒的“高能破甲倍率”，如 `×2 / ×3` 伤害），并在事件中通知 UI 提示“火力超载 ×2”**！这保证了哪怕玩家连点 5 次橙标，低端机帧率依然纹丝不动，且爽感（瞬间爆破多层砖）不减反增！

### 5.3 连发充能与局内掉落（为后续耐玩度铺路）
* V1 内置轻量充能规则：每击碎 `150` 块砖自动奖励 `+1` 蓝标或 `+1` 橙标（可配置），确保玩家在长关卡中能体验到技能滚雪球的快感，而不必卡死。

---

## 6. 残局防垃圾时间机制（Endgame Anti-Tedium）

针对截图类微砖块游戏最常见的痛点（最后剩 2 块角落砖打不到）：
* 当场上剩余可破坏砖块比例 `<= 3%`（或 `<= 12` 块）且连续 `6` 秒无砖块受击时：
  * 内核触发 `ENDGAME_ASSIST` 状态：场上球每次撞击墙面或挡板时，自动给予速度方向向“最近剩余可碎砖块”微调 `12°` 的软追踪偏转（Soft Homing），在不破坏物理真实感的前提下帮玩家优雅收尾。

---

## 7. Milestone 1 Code Review 验收标准（Node 单元测试清单）

MiniMax 在提交 Milestone 1 时，必须在 `src/game/core/__tests__/` 中包含以下自动化测试并全部通过：
1. `substepping.test.ts`：球速 `2000 px/s`（模拟快进极限）垂直及斜向撞击 1 格厚 `STEEL` 砖，1000 帧内穿透次数必须为 `0`。
2. `paddle_angle.test.ts`：球撞击挡板左边缘、中心、右边缘时，出射角符号与大小符合预期，且连续反弹 500 次不出现 `|vy| < speed * 0.18` 的水平卡死。
3. `skill_overflow.test.ts`：场上 100 颗球连按两次 `TRIPLE_SPLIT`，活跃物理球数严格 `<= 200`，且不会抛出数组越界或内存异常。
4. `win_lose.test.ts`：所有 `NORMAL` 砖块清空且场上仍有 `STEEL` 砖块时，状态必须正确进入 `WON`；所有球掉落 `y > 1190` 后进入 `LOST`。
