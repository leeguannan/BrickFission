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
| **Step 2（微策略爆破）** | 1. 炸弹/棱镜/引力微砖块<br>2. 挡板边缘“精准接球”积攒 Fever 激光球<br>3. 残局无人机自动扫尾 | `BrickRole` 已预留 `BOMB / PRISM / CORE`；`PADDLE_HIT` 事件已携带 `offsetRatio`；`ENDGAME_ASSIST` 已内置残局软追踪框架 |
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
