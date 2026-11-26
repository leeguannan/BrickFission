# 渲染管线、视觉规范与原创音频系统规范（Milestone 2）

> **模块路径**：`src/game/render/`、`src/game/audio/`
> **设计原则**：视觉严格保持截图中的深蓝夜空高对比像素风；渲染与音频针对微信小游戏低端机环境进行极限性能优化。

---

## 1. 视觉与 UI 规范（保持截图现有风格）

### 1.1 色彩规范（Color Palette）
* **舞台背景色**：深海夜空蓝 `#08102e`（外围沉浸底色可为 `#050b22`）。
* **微砖块高对比色板**：
  * 经典红砖（截图 1）：填充 `#ef1d1d`，内亮边 `#ff5252`，格子间隙 `#08102e`（间隙 `1px~1.5px`，形成清晰像素格栅感）。
  * 经典绿砖（截图 2、3）：填充 `#00c82a`，内亮边 `#39ff5a`。
  * 不可破坏钢墙（Grey Wall）：填充 `#7d8594`，微高光 `#9aa3b2`（截图 1 齿轮边框、截图 3 外框）。
  * 多血量扩展色阶（如 2 血/3 血砖）：金黄 `#ffb800` → 橙红 `#ff5c00` → 亮紫 `#a855f7`。
* **球与瞄准线**：纯白 `#ffffff`（带有轻微发光边缘的预烘焙贴图），瞄准虚线圆点 `#ffffff`（半径 `3.5px`）。

### 1.2 HUD 布局规范（严格复刻截图操作体验）
* **顶部栏（Top Bar，`y: 18 ~ 90`）**：
  * 左上角：快进切换按钮 `>>`（点击循环切换 `1x → 2x → 3x`，高亮显示倍率）、重开按钮 `↻`。
  * 顶部居中：圆形小白点 + 两位数字关卡号（如 `● 03`，白色粗体无衬线数字）。
  * 右上角：暂停按钮 `||`（深蓝底白图标或圆角蓝色按钮）。
* **左侧功能列（Left Action Column，`x: 24 ~ 110, y: 800 ~ 1020`）**：
  * 蓝标技能按钮：蓝色圆形底（`#2b7fff`）内含 3 个横向白点 `...`，右侧/下方显示可用次数（如 `x4` / `62`）。
  * 橙标技能按钮：橙黄色圆形底（`#f59e0b`）内含品字形 3 个白点，显示可用次数。
  * *交互保护*：点击左侧技能按钮区域时，**禁止触发挡板瞬移或发球动作**（事件拦截）。

### 1.3 挡板皮肤规范（`SkinRegistry.ts`）
V1 内置 3 款高辨识度皮肤（对应你的 3 张截图）：
1. **`capsule_blue`（经典蓝胶囊，默认）**：圆角胶囊形，`#7ca2ff` 渐变至 `#5b84f5`，带微弱顶部高光。
2. **`bamboo_green`（翠竹节，截图 2）**：亮绿色 `#16e325` 竹节造型，左右两端带金色 `#e5b80b` 竹节箍，下方偏左伸出一片翠绿竹叶。
3. **`minimal_white`（极简白条，截图 3）**：纯白 `#ffffff` 锐利矩形条，适合硬核极简玩家。

---

## 2. `IRenderer` 渲染抽象与 Canvas 2D 极限性能优化

### 2.1 `IRenderer` 接口契约（`src/game/render/IRenderer.ts`）
为了未来无缝切换到 WebGL（开启微信高性能+模式），逻辑层与外壳只认识 `IRenderer`：

```typescript
export interface RenderContextData {
  engineState: Readonly<GameSnapshot>; // 球、挡板、瞄准点、HUD 状态
  dirtyBricks: ReadonlyArray<DirtyBrickUpdate>; // 本帧状态变化/被击碎的砖块列表
  fullRebuildBricks: boolean; // 切关或重开时为 true，触发整层重绘
}

export interface IRenderer {
  init(canvas: AnyCanvas, width: number, height: number, dpr: number): void;
  resize(width: number, height: number, dpr: number): void;
  setSkin(paddleSkinId: string, ballSkinId?: string): void;
  spawnBrickParticles(x: number, y: number, color: string, count: number): void;
  triggerScreenShake(intensity: number, durationMs: number): void;
  render(data: RenderContextData, dt: number): void;
  dispose(): void;
}
```

### 2.2 `Canvas2DRenderer.ts` 必须遵守的 4 大性能铁律
1. **静态砖块离屏缓存（Offscreen Brick Layer）**：
   * 在初始化/切关时创建一张与舞台等大的离屏画布 `brickOffscreenCanvas`（微信小游戏端调用 `wx.createCanvas()` 即可作为离屏画布，Web 端用 `document.createElement('canvas')`，通过 `PlatformAdapter.createOffscreenCanvas()` 屏蔽差异）。
   * 全量绘制一次全部 `1600+` 块砖。
   * **游戏进行中每帧绝对禁止遍历画砖块！** 只有收到 `dirtyBricks` 时，对发生变化的单个格子 `(col, row)` 执行 `offscreenCtx.clearRect(...)`（若未碎仅扣血，则重绘该单个格子）。主画布每帧只需 **1 次 `ctx.drawImage(brickOffscreenCanvas, 0, 0)`**！
2. **预烘焙精灵图集（Sprite Pre-baking）**：
   * 初始化时在极小离屏画布上预先画好：标准白球（带抗锯齿和微光晕）、高能超载红金球、3 款挡板皮肤贴图、以及不同颜色的碎裂小方块贴图。
   * 主循环绘制 200 颗球时，一律用 `ctx.drawImage(ballSprite, x - r, y - r)`，**严禁在主循环内调用 `ctx.arc()`、`ctx.shadowBlur` 或创建 `createLinearGradient()`**。
3. **定长预分配粒子对象池（`ParticlePool.ts`）**：
   * 预设容量 `MAX_PARTICLES = 300` 的静态数组，所有粒子对象在构造时一次性分配完毕，仅通过 `active: boolean` 标记复用，循环覆盖最老粒子。
   * 单块微砖块碎裂时生成 `2~3` 个微型像素块粒子即可，既有爽快碎裂感又不糊屏。
4. **DPR 封顶保护**：
   * 逻辑画布缩放时 `dpr = Math.min(devicePixelRatio, 2)`，防止部分 3x/4x 高分屏手机填充像素过多导致帧率下降。

---

## 3. 原创程序化音频引擎规范（`src/game/audio/`）

为实现“原创爽感音效 + 动态背景音乐 + 极小包体”，采用 **纯代码 WebAudio 合成器引擎**（同时兼容浏览器 `AudioContext` 与微信基础库 `wx.createWebAudioContext()`）。

### 3.1 `AudioLimiter.ts`（并发防爆音熔断器）
百球钻洞时每秒可能发生 200+ 次撞击事件，必须做严格限流：
* **全局总声部上限**：`MAX_CONCURRENT_VOICES = 8`。
* **同音色最小冷却时间**：`BRICK_HIT_COOLDOWN_MS = 45ms`、`WALL_HIT_COOLDOWN_MS = 70ms`。
* **动态压缩器（DynamicsCompressorNode）**：所有合成器输出先汇总到一条 `MasterGain -> DynamicsCompressor -> Destination`，确保多音叠加时绝不破音削波（Clipping）。

### 3.2 `ProceduralSFX.ts`（音阶连击合成器）
* **打击砖块（`playBrickHit(combo)`）**：
  * 使用 `Triangle` + 短暂高频 `Sine` 泛音，包络为极短脆响（Attack `2ms`，Decay `55ms`）。
  * **五声音阶爬升机制**：`PENTATONIC_RATIOS` 映射 `[C5, D5, E5, G5, A5, C6, D6, E6, G6]`。每次连续命中（`combo` 间隔 `< 350ms` 内递增，超时回落），音高沿音阶平滑上扬，营造极度舒适的 ASMR 解压听感！
* **撞击钢墙（`playWallHit()`）**：低频短促闷响（`160Hz -> 90Hz` 音高滑落，`40ms`），与破砖脆响形成听觉区分。
* **挡板接球（`playPaddleHit(offsetRatio)`）**：清脆弹性鼓点音，边缘接球音调略高于中心接球。
* **技能触发**：
  * `MULTI_LAUNCH`：快速 3 连上行琶音脉冲。
  * `TRIPLE_SPLIT`：宽广和弦冲击波 + 高频闪烁 Sweep。
* **过关 / 失败**：原创 4 音符上行胜利琶音 / 下行柔和衰减和弦。

### 3.3 `AdaptiveBGM.ts`（轻量级动态音序器 BGM）
* 采用纯 WebAudio 调度器（`lookahead` 定时器预调度）演奏一段 **120 BPM、8 小节循环的深空科技极简电子旋律（Minimal Synthwave / Chill Arcade）**，零 MP3 资源占用：
  * **Layer 1（基础层，全程播放）**：温暖深沉的脉冲 Bassline + 轻柔 Hi-hat 律动。
  * **Layer 2（氛围和弦层）**：柔和低通滤波 Pad 铺底。
  * **Layer 3（高潮激发层，动态淡入）**：当场上 `activeBalls >= 18` 或处于 `×2/×3` 火力高潮时，自动淡入明亮的 16 分音符合成器 Arpeggio（琶音），一旦回落到残局则平滑淡出。
* **微信/iOS 合规生命周期**：
  * 监听首次 `pointerdown` / `touchstart` 自动调用 `audioCtx.resume()` 解锁声音；
  * 提供 `setMuted(muted)` 与 `onAppBackground(hidden)` 接口，切后台立即 `suspend()`，暂停游戏时将主混音低通滤波器切至 `500Hz` 营造沉浸暂停感。

---

## 4. Milestone 2 Code Review 验收标准

1. **离屏画布真缓存验证**：在 `Canvas2DRenderer` 中加入调试计数或代码审查，确认单帧 `PLAYING` 循环内对砖块的绘制调用只有 **1 次** `drawImage`，绝无整阵循环重绘。
2. **手感与误触验证**：手指在屏幕下半区左右滑动时挡板流畅跟手（采用**相对位移 ΔX 控板**，手指无需精确按在挡板上也不会遮挡视线）；点击左侧 `蓝标/橙标` 或顶部 `>> / ↻ / ||` 时，不引发挡板跳变或误发球。
3. **音频压测**：开启 `×3` 快进并触发 150 球钻洞，持续 10 秒无破音、无明显延迟、无控制台 WebAudio 报错；支持全局静音开关。
4. **皮肤切换**：切换“经典蓝胶囊 / 翠竹节 / 极简白”三款皮肤，视觉效果与截图高度吻合且不影响碰撞体尺寸。
