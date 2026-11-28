# 微信小游戏适配规范、商业化预留与 Step 1~4 演进架构（Milestone 4）

> **模块路径**：`src/game/platform/`
> **核心目标**：确保 Web 预览版跑通后，可极低成本迁移至微信小游戏；商业化与社交接口规范预置到位，并为 Step 2~4 产品独特性升级预留无痛扩展点。

---

## 1. 平台适配抽象层（`IPlatformAdapter.ts`）

游戏内核与渲染、音频只通过 `IPlatformAdapter` 与宿主环境通信，绝对不直接调用 `localStorage` 或 `wx.*`：

```typescript
export interface PlayerSaveData {
  unlockedLevel: number;
  selectedPaddleSkin: string;
  unlockedSkins: string[];
  multiLaunchStock: number; // 蓝标技能全局余量
  tripleSplitStock: number; // 橙标技能全局余量
  coins: number;
  muted: boolean;
  bestTimesSec: Record<string, number>; // 每关最佳通关耗时（为后续竞速榜做准备）
}

export type AdPlacement =
  | 'REVIVE_KEEP_PROGRESS'  // 失败复活（保留场上已打碎的砖块进度 + 赠送 3 颗球）
  | 'REFILL_SKILL_BLUE'     // 局内免费领蓝标技能
  | 'REFILL_SKILL_ORANGE'   // 局内免费领橙标技能
  | 'DOUBLE_CLEAR_REWARD'   // 过关双倍金币/技能奖励
  | 'TRIAL_SKIN';           // 局前免费试用皮肤

export interface IPlatformAdapter {
  readonly platformName: 'web' | 'wechat';
  getSystemMetrics(): { width: number; height: number; dpr: number; safeAreaTop: number; safeAreaBottom: number };
  createOffscreenCanvas(width: number, height: number): AnyCanvas;
  loadSaveData(): PlayerSaveData;
  writeSaveData(data: PlayerSaveData): void;
  vibrateShort(type?: 'light' | 'medium' | 'heavy'): void;
  // 商业化预留接口
  showRewardedVideo(placement: AdPlacement): Promise<{ rewarded: boolean }>;
  setBannerVisible(visible: boolean): void;
  // 社交与生命周期接口
  shareAppMessage(params: { title: string; query?: string }): void;
  submitRankScore(levelId: string, timeSec: number): void;
  onLifecycleChange(cb: (state: 'show' | 'hide') => void): void;
}
```

### 双端实现说明
1. **`WebAdapter.ts`（Milestone 2/4 实际运行）**：
   * 存档走 `localStorage`（Key 统一为 `brick_fission_save_v1`）；`showRewardedVideo` 弹出优雅的非阻塞模拟广告确认框（2 秒倒计时模拟看广告得奖励，方便完整测试复活与补给闭环）；`vibrateShort` 尝试调用 `navigator.vibrate`（静默容错）。
2. **`WechatAdapter.stub.ts`（Milestone 4 按微信最新 API 规范编写完整模板）**：
   * 提供标准 `wx.getWindowInfo()`（替代已废弃的 `wx.getSystemInfoSync()`）获取安全区；
   * `wx.createCanvas()` 离屏画布；`wx.getStorageSync` / `wx.setStorageSync`（Key 同样为 `brick_fission_save_v1`）；
   * `wx.createRewardedVideoAd` 单例复用与 `onClose(res => res.isEnded)` 规范防重入；
   * `wx.onShow` / `wx.onHide` / `wx.onAudioInterruptionBegin` 暂停游戏并挂起音频；转发文案默认带入《碎砖大裂变》品牌词。

---

## 2. 微信小游戏合规与审核红线（迁端必查清单）

MiniMax 编写的所有 `src/game/` 代码必须满足以下微信小游戏硬性规范，避免后续提审被拒或真机闪退：

1. **主包体积红线（`< 4MB`，目标 `< 500KB`）**：
   * 得益于“纯 TS 物理 + 离屏矢量预烘焙 + 程序化 WebAudio 音效”，核心游戏打包后 JS 体积可控制在 **`150KB ~ 300KB`**，实现真正的微信小游戏“秒开”。
   * 未来若增加大型皮肤图片，一律放入分包（`subpackages`）或 CDN 按需加载。
2. **安全区与 Banner 广告防遮挡铁律**：
   * `safeAreaTop` 必须避开微信右上角官方“胶囊按钮”（通常预留顶部 `90~110px` 逻辑高度）。
   * 若后续接入底部 Banner 广告，广告高度约 `100~140px`，**必须保证挡板操作线（`Paddle Y`）位于 Banner 上方至少 `80px` 以上**，防止玩家拖板误点广告导致微信判定违规（诱导点击）。
3. **禁止动态代码执行**：零 `eval`、零 `new Function`。
4. **隐私与中断处理**：切后台必须自动触发游戏 `PAUSED` 与音频 `suspend`，切回后弹出继续按钮（不可直接突然发球导致玩家漏球）。

---

## 3. 商业化与留存闭环预留（V1 可体验版）

V1 虽以轻量耐玩为主，但必须跑通以下核心循环（Web 版即可体验）：
1. **失败复活机制**：球全部漏出底线时弹出结算面板，提供 **“复活续关（保留当前已清砖块 + 赠送 3 颗球）”** 按钮与 **“直接重开”** 按钮。
2. **技能补给机制**：当蓝标或橙标次数耗尽时点击技能图标，不再毫无反应，而是触发 **“观看激励（模拟）获取 +2 次”** 弹窗并自动暂停物理，领完立刻恢复战斗。
3. **皮肤试用与解锁**：商店/皮肤弹窗支持用过关获得的金币解锁竹节皮肤、极简白皮肤，或通过激励口子免费试用 1 局。

---

## 4. 产品演进预埋架构（Step 1 → Step 4 独特性路线图）

为了保证后续向 V2/V3/V4 演进时不推翻重来，V1 代码架构中**必须保留以下干净的扩展接口**：

| 演进阶段 | 核心独特性玩法 | 在 V1 代码中的预留钩子（MiniMax 需保留的扩展点） |
| :--- | :--- | :--- |
| **Step 1（当前 V1）** | 极致力学手感 + 双技能 + 音阶解压 + 自动化关卡工具 | 确定性 `GameEngine`、`IRenderer`、`LevelDefinition`、程序化音频 |
| **Step 2（微策略爆破）**<br>✅ **已于 Milestone 5 交付** | 1. 炸弹/棱镜/引力微砖块<br>2. 挡板边缘“精准接球”积攒 Fever 激光球<br>3. 残局无人机自动扫尾 | `BrickRole` 的 `BOMB / PRISM / CORE` 已落地（BOMB 3×3 冲击波 + 连环引爆且不炸钢墙、PRISM 折射分裂、CORE 技能充能 + 有限穿透）；`PADDLE_HIT.offsetRatio` 已驱动精准接球与 Fever 暴走（**取 2× 伤害倍率分支，不做全场穿透**，理由见 `docs/00` §7.2）；`ENDGAME_ASSIST` 残局软追踪框架保持不变 |
| **Step 3（轻肉鸽 + 动态关）** | 1. 局内“三选一”物理词条（火花/电弧/穿透/变大）<br>2. 动态旋转齿轮阵与像素 Boss | `Ball` 已预留 `pierceCount`；`GameEngine` 事件总线可随时监听进度百分比触发 `PAUSED -> PICK_BUFF`；`LevelMechanicsConfig` 已预留旋转与 Boss 字段 |
| **Step 4（UGC 社交裂变）** | 1. **玩家拍照/输入文字 1 秒自制关卡**<br>2. **微信好友挑战卡片与同图竞速榜** | `LevelGenerators.fromImageOrText` 纯 TS 编写，**可直接运行在微信小游戏前端**；`PlayerSaveData.bestTimesSec` 与 `shareAppMessage(query)` 已为“战绩卡片带关卡种子分享”铺平道路 |

---

## 5. 最终整体验收 Checklist（Milestone 4 交付给架构师审核）

当 MiniMax 完成所有阶段后，我将从以下 6 项执行最终 Code Review：
1. **目录纯洁度检查**：搜索 `src/game/core/`，确认零 `window / document / React / wx` 引用。
2. **性能与 GC 审计**：审查 `PhysicsEngine`、`Canvas2DRenderer`、`ParticlePool`，确认主循环无高频临时对象分配。
3. **编译与单测**：`npm run lint`（`tsc --noEmit`）、`npm run build`、以及 `node:test` 全部通过。
4. **玩法闭环体验**：Web 端连续试玩 5 关，验证瞄准反射、蓝/橙双技能、200 球超载倍率转化、`1x/2x/3x` 快进、竹节皮肤、复活续关、音阶连击与动态 BGM 全部正常。
5. **关卡工作台验证**：在 Level Studio 中输入汉字（如“破”）与上传图片生成关卡，成功输出难度评分与盲测报告，并能立即试玩。
6. **微信迁移就绪度**：检查 `WechatAdapter.stub.ts` 与所有平台调用点，确认无任何阻断微信开发者工具编译的依赖。

---

## 6. Milestone 4 落地实现记录与自检报告

> 本节为 M4 交付时的实际落地情况记录，作为 §5 最终 Code Review 的证据底稿。
> 验收命令与实测结果均取自本仓库当前提交状态。

### 6.1 交付文件清单（M4 相对 M3 基线 `cee9b63`）

新增：

| 文件 | 行数 | 作用 |
| :--- | ---: | :--- |
| `src/game/core/Layout.ts` | 100 | 安全区/Banner 防误触纯计算（零宿主 API） |
| `src/game/platform/Progression.ts` | 231 | 存档规范化 + 皮肤解锁 + 结算金币 + 关卡解锁 + 最佳秒数（唯一事实源，Web/微信共用） |
| `src/game/platform/WechatAdapter.stub.ts` | 291 | 微信小游戏适配模板（编译期不引用任何 `wx` 全局类型） |
| `src/game/core/__tests__/commercial.test.ts` | 166 | 复活/补给/Banner 间距内核单测（13 例） |
| `src/game/platform/__tests__/progression.test.ts` | 175 | 商业化规则单测（19 例） |
| `src/game/platform/__tests__/web_adapter.test.ts` | 122 | Web 适配器单测（8 例） |
| `src/game/platform/__tests__/wechat_adapter.test.ts` | 210 | 微信适配器单测（6 例） |
| `scripts/bench-300-balls.ts` | 99 | 同屏满池性能压测 |

修改：

`src/game/core/constants.ts`（§7 安全区/复活/补给常量）、`src/game/core/types.ts`（`REVIVED` 事件）、`src/game/core/SkillSystem.ts`（`grantInventory`）、`src/game/core/GameEngine.ts`（`revive()` / `grantSkill()` / `computeReviveAngles()`）、`src/game/platform/IPlatformAdapter.ts`（默认仅解锁「胶囊蓝」皮肤）、`src/game/platform/WebAdapter.ts`（存档走 `Progression`、Banner 状态广播）、`src/app/main.ts`（复活/补给/商店/金币/关卡解锁/安全区接线）、`src/app/HudController.ts`（金币与商店面板、库存为 0 仍可点击）、`src/app/styles.css`（安全区变量、商店样式、库存告警呼吸动效）、`index.html`（金币徽标 + 商店按钮 + 商店面板）、`package.json`（v0.4.0、`bench` 脚本）。

### 6.2 商业化三循环落地对照（对应 §3）

1. **失败复活**：`GameEngine.revive(3)`（`src/game/core/GameEngine.ts`）仅在 `LOST` 阶段可用，从 `dockedBallPosition` 按 `REVIVE_FAN_ANGLES` 扇形补发 3 球并回到 `PLAYING`；**不重建 `BrickGrid`**，天然满足「保留当前已清砖块进度」；`src/app/main.ts` 的 `watchRevive()` 走 `AdPlacement.REVIVE_KEEP_PROGRESS`，结算面板同时提供「复活续关」与「直接重开」。
2. **技能补给**：蓝/橙标库存归零时按钮不再 `disabled`（`HudController.setSkillCounts` 仅加 `.empty` 告警样式），点击触发 `refillSkill()` → `AdPlacement.REFILL_SKILL_BLUE / REFILL_SKILL_ORANGE` → `engine.grantSkill()` 发放 `SKILL_REFILL_COUNT = 2` 次 → **写入全局额外库存并落盘**；观看期间自动暂停物理与音频，结束后立即恢复。
3. **皮肤解锁/试用**：`SKIN_CATALOG`（胶囊蓝 0 / 翠竹节 120 / 极简白 200）+ `Progression.unlockSkin()` 扣币解锁，或 `AdPlacement.TRIAL_SKIN` 免费试用 1 局（`trialSkinId` 仅本次会话有效，`effectiveSkinId` 取 `trialSkinId ?? selectedPaddleSkin`）。

> **技能额度记账模型（本关配额 vs 全局额外库存）**：技能额度被拆成两类，语义与生命周期完全不同：
>
> | 额度 | 来源 | 生命周期 | 是否写盘 |
> | :--- | :--- | :--- | :--- |
> | `levelQuota`（本关配额） | 关卡配置的 `initialSkills` | 每关重置，重开即恢复 | ❌ 不写盘 |
> | `extraStock`（全局额外库存） | 激励广告补给 / 购买 | 跨关保留，真实扣减 | ✅ 写盘（`save.multiLaunchStock` / `save.tripleSplitStock`） |
> | 关内充能 | 击碎 150 块砖自动奖励（`SKILL_GRANTED`） | 仅本关有效 | ❌ 不写盘 |
>
> 消耗顺序为 **本关配额 → 全局额外库存 → 关内充能**：`Progression.consumeSkillCredit()` 是唯一的扣减入口，只有真正动用了全局额外库存（`usedExtra === true`）才写盘。引擎库存 = 本关剩余配额 + 全局额外库存 + 关内充能量。
>
> ⚠️ **M4 旧口径已作废**：M4 初版用 `Math.max(存档库存, 引擎库存)` 回写存档，会把玩家**已经用掉的全局库存在重开后补满**，构成刷技能漏洞；Code Review 修复后改为写回全局额外库存的**真实剩余**，重开不再回满（见 §6.8）。关内击碎砖块充能也不再随离关写回存档。

> **存档版本迁移（`saveVersion`）**：`PlayerSaveData` 在 M4 新增 `saveVersion`（当前为 1）。Milestone 3 及更早的存档没有该字段，且当时**尚不存在皮肤解锁机制**（旧默认存档把三款皮肤全部解锁），因此 `Progression.normalizeSaveData()` 对无 `saveVersion` 的旧存档执行一次迁移：把 `unlockedSkins` 回收为「仅基础皮肤」，金币、关卡进度、技能库存、最佳秒数等其余资产完整保留；带 `saveVersion` 的新存档则原样保留玩家已解锁的皮肤。`src/app/main.ts` 启动时把迁移结果立即写回，避免重复迁移。

### 6.3 安全区与 Banner 防误触（对应 §2 第 2 条）

* `src/game/core/Layout.ts`：`computeBannerLayout(true)` → `bannerTop = 1280 - 100 = 1180`、`interactiveBottom = min(PADDLE_Y, bannerTop - 80) = 1090`、`clearance = 90 ≥ 80` → `compliant = true`；`verifyBannerClearance()` 为内核侧可断言的硬约束。
* `src/app/styles.css`：`--safe-top / --safe-bottom / --banner-reserve` 三个 CSS 变量分别注入顶栏 padding、底栏 padding 与 Banner 预留高度，底栏留白为 `calc(14px + max(env(safe-area-inset-bottom), var(--safe-bottom)) + var(--banner-reserve))`。
* `src/app/main.ts`：`applySafeArea(metrics)` 依据 `IPlatformAdapter.getSystemMetrics()` 写入安全区；`applyBannerLayout(visible)` 依据 `adapter.onBannerVisibilityChange()` 切换预留。

### 6.4 Step 2~4 扩展钩子自检报告（对应 §4）

| 阶段 | 预埋钩子 | 实测位置 | 结论 |
| :--- | :--- | :--- | :--- |
| Step 2 | `BrickRole` 的 `BOMB / PRISM / CORE` | `src/game/core/types.ts` + `GameEngine.onSpecialBrickDestroyed()` / `explodeBomb()` / `splitPrism()` / `grantCoreBonus()` | ✅ **已落地（M5）**：三种特殊砖全部实装，配 20 例内核单测 |
| Step 2 | `PADDLE_HIT` 携带 `offsetRatio` | `src/game/core/types.ts` + `PhysicsEngine.collidePaddle()` + `GameEngine.onPaddleHit()` | ✅ **已落地（M5）**：驱动精准接球与 Fever 暴走（音频边缘音同时复用） |
| Step 2 | `ENDGAME_ASSIST` 残局软追踪 | `GameEngine.updateEndgameAssist()` / `applySoftHoming()` | ✅ 保留（行为未变） |
| Step 3 | `Ball.pierceCount` | `src/game/core/types.ts` | ✅ 保留 |
| Step 3 | 事件总线可触发 `PAUSED -> PICK_BUFF` | `GameEngine.pause()/resume()` + `drainEvents()` + `LevelRuntimeConfig` | ✅ 保留（`PICK_BUFF` 阶段由后续版本新增，钩子不改内核即可接入） |
| Step 3 | `LevelMechanicsConfig` 旋转 / Boss 字段 | `src/game/levels/LevelSchema.ts`（`rotationSpeedDegPerSec` / `bossMode` / `roguePoolId`） | ✅ 保留 |
| Step 4 | 纯 TS 关卡生成（可直接跑微信） | `src/game/levels/LevelGenerators.ts` + `src/studio/imageRasterize.ts` | ✅ 保留（`src/game/levels` 实测零 DOM 依赖） |
| Step 4 | `bestTimesSec` + `shareAppMessage(query)` | `PlayerSaveData.bestTimesSec` + `Progression.recordBestTime()` + `WechatAdapter.shareAppMessage()` | ✅ 保留 |

### 6.5 目录纯洁度自检（对应 §5 第 1、6 条）

`src/game/core/` 全量 grep 命中数（均为 0）：

`window` 0 · `document` 0 · `HTMLCanvasElement` 0 · `AudioContext` 0 · `requestAnimationFrame` 0 · `React` 0 · `wx.` 0 · `navigator` 0 · `localStorage` 0 · `setTimeout` 0 · `setInterval` 0 · `fetch` 0 · `OffscreenCanvas` 0

全项目 `src/`：`eval(` 0 · 动态代码执行 0 · `.innerHTML` 0 · `.outerHTML` 0 · `document.write` 0；`src/game/levels/` 的 `document.` / `window.` / `HTMLCanvasElement` 均 0。
`src/game/core` 共 8 个源文件、2654 行，全部为纯 TypeScript。

### 6.6 性能压测数据（对应 §5 第 2 条 与 M4 完成标志）

`npm run bench`（`scripts/bench-300-balls.ts`，headless 无渲染，稳态维持满池）：

```
压测球数：199（内核池上限 200）
采样帧数：3000        补充球数（维持满池）：481
平均物理步耗时：0.011 ms    P95：0.054 ms    最大：0.136 ms
等效帧率（仅物理步）：89395 FPS
残留球数：200        NaN 检测：通过
```

⚠️ **文档口径差（须如实标注）**：`docs/00` 的 M4 完成标志写「300 球同屏」，但 `docs/01` 物理规格的内核球池上限为 `MAX_PHYSICAL_BALLS = 200`，引擎实际可达上限为 **200 球同屏**。本仓库按 `docs/01` 实现（200 池），压测即取该上限；300 球需在上调内核池上限后重新压测。

### 6.7 编译与单测结果

| 命令 | 结果 |
| :--- | :--- |
| `npm test` | `tests 171 / pass 171 / fail 0`（core 58 · render 23 · levels 38 · studio 11 · platform 41） |
| `npm run lint` | 零报错（`tsc -p tsconfig.core.json --noEmit && tsc --noEmit`） |
| `npm run build` | 成功（vite 32 modules；dist index.html 3.66KB / CSS 9.17KB(gzip 2.66KB) / JS 138.99KB(gzip 40.20KB)，总量远低于 500KB 目标） |

### 6.8 Code Review 修复记录（架构师评审 5 项）

| # | 问题 | 修复 | 验证 |
| :--- | :--- | :--- | :--- |
| 1 | 瞄准折线预测失真：砖块只测圆心单点、反射用径向法线、命中点未推出 → 第二段射线在原点立即再撞、折线消失 | `AimRaycaster` 改为「邻域圈选 + 圆-AABB 最近点检测」，法线改用与 `PhysicsEngine` 一致的 **AABB 轴向分离法线**（`±1,0` / `0,±1`），命中点沿法线推出 `radius + CONTACT_EPSILON`；碰撞检测步长收敛到 `AIM_DETECT_STEP = 1`（球半径 6.5px 时接触窗口约 13px，4px 粗步会跳过浅接触） | 新增 2 例：偏心垂直撞砖仍垂直折返、撞侧墙仍能画出第二段折线（`aim_raycaster.test.ts` 6 → 8 例） |
| 2 | 重开本关可无限刷技能：`Math.max(存档库存, 引擎库存)` 把已用完的全局库存在重开时补满 | 拆分「本关配额」与「全局额外库存」，消耗顺序 quota → extra → 关内充能，仅动用到全局库存才写盘；`restartLevel()` 改为**重建引擎**（配额重置、全局库存保持真实剩余） | 新增 6 例配额记账用例（`progression.test.ts` 19 → 25 例） |
| 3 | `AdaptiveBGM` 临时节点不回收；`WebAudioEngine` 无法注入微信端 AudioContext | 四个调度函数统一绑定 `onended` 自动 `disconnect()` 整条节点链（对齐 `ProceduralSFX.autoRelease`）；新增 `contextFactory?: () => AudioContext` 注入位（微信端可传 `wx.createWebAudioContext`） | `npm run lint` + 171 例单测全绿 |
| 4 | 结算看广告翻倍后弹窗不再出现；模拟广告样式类名失配（`.bf-reward-count` vs `.bf-reward-countdown`） | 抽出 `showWinModal(elapsedSec, baseCoins, doubled)`，翻倍完成后**重显只含「重开本关 / 下一关」**的结算窗并附翻倍提示；CSS 补 `.bf-reward-countdown` / `.bf-reward-skip`，广告标题补 `bf-reward-title` class | `npm run build` 成功 |
| 5 | `HudController.setSkillCounts` / `setCoins` 每帧无条件写 DOM | 增加脏值缓存（`lastBlueCount` / `lastOrangeCount` / `lastCoins`），数值未变不触碰 DOM（与 `setPausedLabel` 同思路） | `npm run lint` 零报错 |

---

## 7. Milestone 5（Step 2 微策略爆破）落地记录（2026-11-28）

> Step 2 的全部玩法逻辑都落在 `src/game/core/`（纯 TypeScript、零宿主 API），
> 因此**天然可在微信小游戏运行时直接复用**，不需要为微信端另写一套物理。

### 7.1 微信端可直接复用的部分

| 能力 | 位置 | 微信侧说明 |
| :--- | :--- | :--- |
| BOMB / PRISM / CORE 三种特殊砖 | `GameEngine.onSpecialBrickDestroyed()` 及三个私有结算函数 | 纯逻辑，事件经 `drainEvents()` 上抛，微信 Canvas HUD 可直接按事件播粒子/震屏 |
| 精准接球与 Fever 暴走 | `GameEngine.onPaddleHit()` / `feverSnapshot` | 只读快照 `FeverSnapshot` 供微信端画进度条，无需改动内核 |
| 关卡 Schema 对特殊砖的支持 | `src/game/levels/LevelSchema.ts`（`M`/`L`/`K` 符号） | 纯 TS 编解码，微信端 `LevelGenerators` 可直接产出含特殊砖的关卡 |
| 特殊砖难度评分 | `src/game/levels/DifficultyScorer.ts` | 特殊砖计入可破坏砖，与 Web 端同一套评分 |

### 7.2 与微信打包链路（M6）的衔接点

* `GameEvent` 新增 6 个分支（`BOMB_EXPLODED` / `PRISM_SPLIT` / `CORE_GRANTED` / `PRECISE_CATCH` / `FEVER_ACTIVATED` / `FEVER_ENDED`）为**联合类型的新增分支**，不改动既有成员，因此微信端的事件消费代码只需 `switch` 增加 case，不存在破坏性变更。
* `FeverSnapshot` 由 `GameEngine.feverSnapshot` 统一提供，微信端 `CanvasHudRenderer` 与 Web 端 `HudController` 共用同一份数据，避免两端表现漂移。
* Fever 取「2× 伤害倍率」分支（而非全场穿透）还有一个额外好处：**不会让球长时间直穿砖阵飞出底线**，微信端的「复活续关 / 技能补给」商业化触点不会被高频触发。
* **Fever 的 2× 倍率只对「已受损砖」生效**（`cell.hp < cell.maxHp`）：1 血 / 2 血砖的破碎时序与基线一致，3 血及以上砖被加速击碎；连击计数在 Fever 期间翻倍（纯表现层，不影响物理）。实测 `npm run test:bot` 与基线**逐帧一致**（17/20、最低破砖率 70.2%），详见 `docs/00` §7.2。微信端沿用同一份 `GameEngine`，无任何额外分支。
* **微信端 HUD 复用点**：`FeverSnapshot{energy, maxEnergy, active, remainingSec, durationSec, damageMultiplier}` 已被 `src/app/e2eProbe.ts` 暴露为只读状态，M6 的 `CanvasHudRenderer` 直接读同一份快照即可画能量条，不需要在微信端另算一套能量逻辑。
