/**
 * 《碎砖大裂变》(Brick Fission) — 音频并发防爆音熔断器
 *
 * 契约来源：`docs/02_RENDERER_AUDIO_AND_VISUAL_SPEC.md` §3.1。
 *   - 全局总声部上限 `MAX_CONCURRENT_VOICES = 8`；
 *   - 同音色冷却：砖块 45ms、墙面 70ms；
 *   - 链路：Voice → 输入增益 → 低通（暂停 500Hz）→ DynamicsCompressor → Destination，
 *     百球钻洞时多音叠加也不破音削波。
 *
 * 所有时间均以 `AudioContext.currentTime`（秒）为准，不依赖定时器。
 */

export const MAX_CONCURRENT_VOICES = 8;
export const BRICK_HIT_COOLDOWN_MS = 45;
export const WALL_HIT_COOLDOWN_MS = 70;

/** 冷却分组（同组共享最小间隔）。 */
export type SoundKind = 'brick' | 'wall' | 'paddle' | 'skill' | 'stinger';

const COOLDOWN_MS: Readonly<Record<SoundKind, number>> = {
  brick: BRICK_HIT_COOLDOWN_MS,
  wall: WALL_HIT_COOLDOWN_MS,
  paddle: WALL_HIT_COOLDOWN_MS,
  skill: 60,
  stinger: 80,
};

const NORMAL_LOWPASS_HZ = 20000;
const PAUSED_LOWPASS_HZ = 500;
const LOWPASS_SWEEP_SEC = 0.18;

export class AudioLimiter {
  readonly ctx: AudioContext;
  /** 合成器接线入口（接低通）。 */
  readonly input: GainNode;
  private readonly master: GainNode;
  private readonly lowpass: BiquadFilterNode;
  private readonly compressor: DynamicsCompressorNode;

  private activeVoices = 0;
  private readonly lastPlayedAtMs: Record<SoundKind, number> = {
    brick: -Infinity,
    wall: -Infinity,
    paddle: -Infinity,
    skill: -Infinity,
    stinger: -Infinity,
  };
  private muted = false;
  private paused = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;

    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = NORMAL_LOWPASS_HZ;
    this.lowpass.Q.value = 0.6;

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;

    this.input = ctx.createGain();
    this.input.gain.value = 1;
    this.input.connect(this.lowpass);
    this.lowpass.connect(this.master);
    this.master.connect(this.compressor);
    this.compressor.connect(ctx.destination);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, now, 0.03);
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    const now = this.ctx.currentTime;
    this.lowpass.frequency.cancelScheduledValues(now);
    this.lowpass.frequency.setTargetAtTime(
      paused ? PAUSED_LOWPASS_HZ : NORMAL_LOWPASS_HZ,
      now,
      LOWPASS_SWEEP_SEC,
    );
  }

  /**
   * 尝试获取一个发声声部。
   * @returns 放行返回 true；冷却中或声部已满返回 false（调用方直接放弃本次发声）。
   */
  tryAcquire(kind: SoundKind): boolean {
    if (this.muted) return false;
    if (this.activeVoices >= MAX_CONCURRENT_VOICES) return false;
    const nowMs = this.ctx.currentTime * 1000;
    if (nowMs - this.lastPlayedAtMs[kind] < COOLDOWN_MS[kind]) return false;
    this.lastPlayedAtMs[kind] = nowMs;
    this.activeVoices++;
    return true;
  }

  /** 声部结束释放（由发声节点 onended 触发）。 */
  release(): void {
    if (this.activeVoices > 0) this.activeVoices--;
  }

  /** 当前活跃声部数（测试/诊断用）。 */
  get activeVoiceCount(): number {
    return this.activeVoices;
  }
}
