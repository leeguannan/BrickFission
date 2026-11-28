/**
 * 《碎砖大裂变》(Brick Fission) — 音频引擎抽象契约
 *
 * 契约来源：`docs/02_RENDERER_AUDIO_AND_VISUAL_SPEC.md` §3。
 * 外壳只依赖本接口；Web 端实现为纯代码 WebAudio 合成器，
 * 微信端（Milestone 4）可替换为 `wx.createWebAudioContext()` 实现而不改外壳。
 */

/** 逻辑层可用的全部音频反馈。 */
export interface IAudioEngine {
  /** 首次用户手势时调用：创建/恢复音频上下文（浏览器自动播放策略合规）。 */
  unlock(): Promise<void>;
  /** 全局静音开关。 */
  setMuted(muted: boolean): void;
  /** 暂停/恢复：暂停时主混音低通切至 500Hz。 */
  setPaused(paused: boolean): void;
  /** 前后台切换：切后台立即挂起上下文。 */
  setBackground(hidden: boolean): void;
  /** 场上强度输入，驱动 BGM 高潮层淡入淡出。 */
  setIntensity(activeBalls: number, speedMultiplier: 1 | 2 | 3): void;

  /** 击碎/命中普通砖（combo 驱动五声音阶爬升）。 */
  playBrickHit(combo: number): void;
  /** 撞击钢墙/边界（低频闷响）。 */
  playWallHit(): void;
  /** 挡板接球（offsetRatio 绝对值越大音调越高）。 */
  playPaddleHit(offsetRatio: number): void;
  /** 蓝标连发（3 连上行琶音）。 */
  playMultiLaunch(): void;
  /** 橙标分裂（宽广和弦 + 高频 sweep）。 */
  playTripleSplit(): void;
  /** 过关（4 音符上行胜利琶音）。 */
  playWin(): void;
  /** 失败（下行柔和衰减和弦）。 */
  playLose(): void;

  /* ---------------- Milestone 5 / Step 2：特殊砖与 Fever ---------------- */

  /** 炸弹爆破（低频轰击 + 起爆瞬态）。 */
  playBombExplosion(): void;
  /** 棱镜折射（清脆高频三和弦）。 */
  playPrismSplit(): void;
  /** 核心充能（温暖上行双音）。 */
  playCoreGrant(): void;
  /** 精准接球（短促高频点音）。 */
  playPreciseCatch(): void;
  /** Fever 激活激励音（上行扫频 + 和弦）。 */
  playFeverActivate(): void;
  /** Fever 结束收束音。 */
  playFeverEnd(): void;
  /** Fever 状态切换（驱动 BGM Fever 层与 Pad 明暗）。 */
  setFever(active: boolean): void;

  /** 每帧驱动（BGM lookahead 调度器）。 */
  update(dt: number): void;
  /** 释放全部音频资源。 */
  dispose(): void;
}

/** 空实现：无音频环境（Node 单测/上下文创建失败）下的安全替身。 */
export class NullAudioEngine implements IAudioEngine {
  async unlock(): Promise<void> {}
  setMuted(_muted: boolean): void {}
  setPaused(_paused: boolean): void {}
  setBackground(_hidden: boolean): void {}
  setIntensity(_activeBalls: number, _speedMultiplier: 1 | 2 | 3): void {}
  playBrickHit(_combo: number): void {}
  playWallHit(): void {}
  playPaddleHit(_offsetRatio: number): void {}
  playMultiLaunch(): void {}
  playTripleSplit(): void {}
  playWin(): void {}
  playLose(): void {}
  playBombExplosion(): void {}
  playPrismSplit(): void {}
  playCoreGrant(): void {}
  playPreciseCatch(): void {}
  playFeverActivate(): void {}
  playFeverEnd(): void {}
  setFever(_active: boolean): void {}
  update(_dt: number): void {}
  dispose(): void {}
}
