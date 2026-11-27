/**
 * 《碎砖大裂变》(Brick Fission) — 轻量级动态音序器 BGM
 *
 * 契约来源：`docs/02_RENDERER_AUDIO_AND_VISUAL_SPEC.md` §3.3。
 * 纯 WebAudio lookahead 调度器（无 setInterval、零音频资源文件），
 * 演奏 120 BPM、8 小节循环的 Minimal Synthwave / Chill Arcade：
 *   - Layer 1（全程）：脉冲 Bassline + 轻柔 Hi-hat；
 *   - Layer 2（全程铺底）：低通柔和 Pad，按和弦进行换和声；
 *   - Layer 3（动态）：16 分音符 Arpeggio，activeBalls >= 18 或
 *     ×2/×3 火力高潮时平滑淡入，回落残局平滑淡出。
 *
 * 调度由主循环 `update(dt)` 驱动（lookahead 0.12s 预排），
 * 不依赖定时器，便于单测与微信端生命周期挂起。
 */
import type { AudioLimiter } from './AudioLimiter.js';

const BPM = 120;
const SECONDS_PER_BEAT = 60 / BPM; // 0.5s
const SIXTEENTH_SEC = SECONDS_PER_BEAT / 4; // 16 分音符步长 0.125s
const STEPS_PER_BAR = 16;
const BARS_PER_LOOP = 8;
const TOTAL_STEPS = STEPS_PER_BAR * BARS_PER_LOOP; // 128 步 = 16s 循环

/** 调度前瞻窗口：提前 0.12s 把音符排进 WebAudio 时间线。 */
const SCHEDULE_AHEAD_SEC = 0.12;
/** Layer3 淡入淡出平滑时间常数。 */
const LAYER3_FADE_TAU = 0.6;
const LAYER3_PEAK = 0.32;

/**
 * 和弦进行（每 2 小节换一次，A 小调家族）：
 * Am → F → C → G，根音频率（Hz）。
 */
const CHORD_ROOTS: readonly number[] = [110.0, 87.31, 130.81, 98.0];
/** 各和弦的三音/五音相对根音的半音偏移（用于 Pad 与 Arp）。 */
const CHORD_INTERVALS: readonly number[][] = [
  [0, 3, 7], // Am  A C E
  [0, 4, 7], // F   F A C
  [0, 4, 7], // C   C E G
  [0, 4, 7], // G   G B D
];
/** Arp 音型（和弦内音索引序列，明亮 16 分律动）。 */
const ARP_PATTERN: readonly number[] = [0, 1, 2, 1, 2, 1, 0, 2];

function midiRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

export class AdaptiveBGM {
  private readonly limiter: AudioLimiter;
  private readonly layer1Gain: GainNode;
  private readonly layer2Gain: GainNode;
  private readonly layer3Gain: GainNode;
  private readonly padFilter: BiquadFilterNode;
  private readonly noiseBuffer: AudioBuffer;

  private running = false;
  private currentStep = 0;
  private nextNoteTime = 0;
  private layer3TargetOn = false;

  constructor(limiter: AudioLimiter) {
    this.limiter = limiter;
    const ctx = limiter.ctx;

    this.layer1Gain = ctx.createGain();
    this.layer1Gain.gain.value = 0.5;
    this.layer2Gain = ctx.createGain();
    this.layer2Gain.gain.value = 0.32;
    this.layer3Gain = ctx.createGain();
    this.layer3Gain.gain.value = 0; // 默认静音，高潮时淡入

    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 820;
    this.padFilter.Q.value = 0.7;

    this.layer1Gain.connect(limiter.input);
    this.layer2Gain.connect(this.padFilter);
    this.padFilter.connect(limiter.input);
    this.layer3Gain.connect(limiter.input);

    this.noiseBuffer = this.buildNoiseBuffer(ctx);
  }

  /** 首次解锁后启动循环（重复调用安全）。 */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.currentStep = 0;
    this.nextNoteTime = this.limiter.ctx.currentTime + 0.06;
  }

  stop(): void {
    this.running = false;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /**
   * 场上强度输入：决定 Layer3 目标开关。
   * @param activeBalls 当前活跃球数
   * @param speedMultiplier 快进档位
   */
  setIntensity(activeBalls: number, speedMultiplier: 1 | 2 | 3): void {
    const on = activeBalls >= 18 || speedMultiplier >= 2;
    if (on === this.layer3TargetOn) return;
    this.layer3TargetOn = on;
    const now = this.limiter.ctx.currentTime;
    this.layer3Gain.gain.cancelScheduledValues(now);
    this.layer3Gain.gain.setTargetAtTime(
      on ? LAYER3_PEAK : 0,
      now,
      LAYER3_FADE_TAU,
    );
  }

  /** 主循环每帧驱动：把前瞻窗口内的 16 分音符全部预排。 */
  update(): void {
    if (!this.running) return;
    const ctx = this.limiter.ctx;
    while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += SIXTEENTH_SEC;
      this.currentStep = (this.currentStep + 1) % TOTAL_STEPS;
    }
  }

  /* ---------------------------------------------------------------- */
  /* 调度器内部                                                        */
  /* ---------------------------------------------------------------- */

  private scheduleStep(step: number, when: number): void {
    const bar = Math.floor(step / STEPS_PER_BAR);
    const stepInBar = step % STEPS_PER_BAR;
    const chordIndex = Math.floor(bar / 2) % CHORD_ROOTS.length;
    const root = CHORD_ROOTS[chordIndex]!;

    // Layer 1：Bassline 每拍（16 分步 0/4/8/12）一个根音脉冲
    if (stepInBar % 4 === 0) {
      this.scheduleBass(root, when);
    }
    // Layer 1：Hi-hat 反拍 16 分（奇数步轻击，步 4/12 加重）
    this.scheduleHat(when, stepInBar === 4 || stepInBar === 12 ? 0.12 : 0.05);

    // Layer 2：每个和弦段的第一小节首步换 Pad（长音铺满 2 小节）
    if (stepInBar === 0 && bar % 2 === 0) {
      this.schedulePad(chordIndex, when, SIXTEENTH_SEC * STEPS_PER_BAR * 2);
    }

    // Layer 3：16 分 Arpeggio（增益为 0 时自然听不到，无需停止调度）
    const arpIndex = ARP_PATTERN[stepInBar % ARP_PATTERN.length]!;
    const semitone = CHORD_INTERVALS[chordIndex]![arpIndex]! + 12; // 高八度
    this.scheduleArp(root * midiRatio(semitone), when);
  }

  /** 温暖深沉的脉冲 Bass：sawtooth + 低通 + 短包络。 */
  private scheduleBass(freq: number, when: number): void {
    const ctx = this.limiter.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.5, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.22);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.layer1Gain);
    osc.start(when);
    osc.stop(when + 0.26);
    this.autoDisconnect(osc, filter, gain);
  }

  /** 轻柔 Hi-hat：预烘焙白噪声 + 高通 + 极短包络。 */
  private scheduleHat(when: number, peak: number): void {
    const ctx = this.limiter.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.045);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.layer1Gain);
    src.start(when);
    src.stop(when + 0.06);
    this.autoDisconnect(src, filter, gain);
  }

  /** 柔和 Pad：双 detuned sawtooth 和声层，慢 attack 铺底。 */
  private schedulePad(chordIndex: number, when: number, duration: number): void {
    const ctx = this.limiter.ctx;
    const root = CHORD_ROOTS[chordIndex]!;
    const intervals = CHORD_INTERVALS[chordIndex]!;
    for (const semitone of intervals) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(0.16, when + 0.4);
      gain.gain.setValueAtTime(0.16, when + duration - 0.3);
      gain.gain.linearRampToValueAtTime(0, when + duration);
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = root * midiRatio(semitone);
        osc.detune.value = detune;
        osc.connect(gain);
        gain.connect(this.layer2Gain);
        osc.start(when);
        osc.stop(when + duration + 0.05);
        // 两个 detune 振荡器共用同一个 gain，重复 disconnect 是安全的（内部 try/catch）。
        this.autoDisconnect(osc, gain);
      }
    }
  }

  /** 明亮 16 分 Arp：triangle 拨弦感短音。 */
  private scheduleArp(freq: number, when: number): void {
    const ctx = this.limiter.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.4, when + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
    osc.connect(gain);
    gain.connect(this.layer3Gain);
    osc.start(when);
    osc.stop(when + 0.12);
    this.autoDisconnect(osc, gain);
  }

  /**
   * 让临时节点链在音源结束后自动断开，避免长时间运行积累悬挂节点。
   *
   * WebAudio 节点不会自动回收，若不显式 `disconnect()`，
   * 长时间游玩会持续累积已结束的振荡器/滤波器/增益节点。
   * 思路与 `ProceduralSFX.autoRelease` 一致（此处不涉及声部计数，故不调用 limiter.release）。
   */
  private autoDisconnect(source: AudioScheduledSourceNode, ...nodes: AudioNode[]): void {
    source.onended = () => {
      for (const node of nodes) {
        try {
          node.disconnect();
        } catch {
          /* 已断开则忽略 */
        }
      }
      try {
        source.disconnect();
      } catch {
        /* 已断开则忽略 */
      }
    };
  }

  /** 一次性烘焙 0.1s 白噪声 buffer，供全部 Hi-hat 复用（零运行期分配）。 */
  private buildNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.1);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 7;
    for (let i = 0; i < length; i++) {
      // 确定性 LCG 白噪声，避免每次构建结果漂移
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
    return buffer;
  }
}
