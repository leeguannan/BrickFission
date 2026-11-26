/**
 * 《碎砖大裂变》(Brick Fission) — Web 端音频引擎总入口
 *
 * 组合 `AudioLimiter`（熔断/压缩/暂停低通）+ `ProceduralSFX`（事件音效）
 * + `AdaptiveBGM`（动态多轨背景音乐），对外只暴露 `IAudioEngine`。
 *
 * 合规要点（docs/02 §3.3）：
 *   - AudioContext 在首次用户手势 `unlock()` 时惰性创建并 resume，
 *     满足浏览器自动播放策略；构造本对象不会发声也不会抛错；
 *   - 运行环境不支持 WebAudio 时进入安全降级（全部方法 no-op）；
 *   - 切后台立即 suspend，回前台按暂停/静音状态恢复；
 *   - 所有撞击音效均经 AudioLimiter 限流，禁止裸触发振荡器。
 */
import { AdaptiveBGM } from './AdaptiveBGM.js';
import { AudioLimiter } from './AudioLimiter.js';
import type { IAudioEngine } from './IAudioEngine.js';
import { ProceduralSFX } from './ProceduralSFX.js';

export class WebAudioEngine implements IAudioEngine {
  private ctx: AudioContext | null = null;
  private limiter: AudioLimiter | null = null;
  private sfx: ProceduralSFX | null = null;
  private bgm: AdaptiveBGM | null = null;

  private muted = false;
  private paused = false;
  private background = false;
  private lastActiveBalls = 0;
  private lastSpeed: 1 | 2 | 3 = 1;

  /** WebAudio 是否可用（不可用时本引擎等价于 NullAudioEngine）。 */
  get isAvailable(): boolean {
    return this.ctx !== null;
  }

  async unlock(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !this.background) {
        try {
          await this.ctx.resume();
        } catch {
          /* 恢复失败保持静默，后续手势会再次尝试 */
        }
      }
      return;
    }
    const Ctor = this.resolveAudioContextCtor();
    if (!Ctor) return; // 环境不支持 → 安全降级
    try {
      const ctx = new Ctor();
      const limiter = new AudioLimiter(ctx);
      this.ctx = ctx;
      this.limiter = limiter;
      this.sfx = new ProceduralSFX(limiter);
      this.bgm = new AdaptiveBGM(limiter);
      limiter.setMuted(this.muted);
      limiter.setPaused(this.paused);
      this.bgm.setIntensity(this.lastActiveBalls, this.lastSpeed);
      this.bgm.start();
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          /* 同上 */
        }
      }
    } catch {
      // 构造失败（极少数受限浏览器）：释放引用并永久降级
      this.ctx = null;
      this.limiter = null;
      this.sfx = null;
      this.bgm = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.limiter?.setMuted(muted);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.limiter?.setPaused(paused);
  }

  setBackground(hidden: boolean): void {
    this.background = hidden;
    const ctx = this.ctx;
    if (!ctx) return;
    if (hidden) {
      if (ctx.state === 'running') {
        void ctx.suspend().catch(() => {
          /* 忽略挂起失败 */
        });
      }
    } else if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        /* 忽略恢复失败 */
      });
    }
  }

  setIntensity(activeBalls: number, speedMultiplier: 1 | 2 | 3): void {
    this.lastActiveBalls = activeBalls;
    this.lastSpeed = speedMultiplier;
    this.bgm?.setIntensity(activeBalls, speedMultiplier);
  }

  playBrickHit(combo: number): void {
    this.sfx?.playBrickHit(combo);
  }

  playWallHit(): void {
    this.sfx?.playWallHit();
  }

  playPaddleHit(offsetRatio: number): void {
    this.sfx?.playPaddleHit(offsetRatio);
  }

  playMultiLaunch(): void {
    this.sfx?.playMultiLaunch();
  }

  playTripleSplit(): void {
    this.sfx?.playTripleSplit();
  }

  playWin(): void {
    this.sfx?.playWin();
  }

  playLose(): void {
    this.sfx?.playLose();
  }

  update(_dt: number): void {
    this.bgm?.update();
  }

  async dispose(): Promise<void> {
    this.bgm?.stop();
    const ctx = this.ctx;
    this.ctx = null;
    this.limiter = null;
    this.sfx = null;
    this.bgm = null;
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        /* 已关闭则忽略 */
      }
    }
  }

  /** 兼容 webkit 前缀的 AudioContext 构造器解析。 */
  private resolveAudioContextCtor(): typeof AudioContext | null {
    const host = globalThis as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    return host.AudioContext ?? host.webkitAudioContext ?? null;
  }
}
