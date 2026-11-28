/**
 * 《碎砖大裂变》(Brick Fission) — 五声音阶连击程序化音效合成器
 *
 * 契约来源：`docs/02_RENDERER_AUDIO_AND_VISUAL_SPEC.md` §3.2。
 * 全部音效由 WebAudio 振荡器 + 增益包络实时合成，零音频资源文件：
 *   - 击砖：Triangle 主音 + 高八度 Sine 泛音，2ms attack / 55ms decay，
 *     combo 在 350ms 窗口内沿五声音阶 [C5…G6] 爬升，超时回落；
 *   - 钢墙：160→90Hz 低频滑落闷响（40ms）；
 *   - 挡板：弹性鼓点，边缘接球音调高于中心；
 *   - 技能：蓝标 3 连上行琶音 / 橙标和弦冲击波 + 高频 sweep；
 *   - 胜负：4 音上行胜利琶音 / 下行柔和衰减和弦。
 * 所有发声先过 `AudioLimiter` 门控，节点 onended 自动释放声部并断开。
 */
import type { AudioLimiter } from './AudioLimiter.js';

/** 五声音阶（宫调式）：C5 D5 E5 G5 A5 C6 D6 E6 G6。 */
const PENTATONIC_FREQS: readonly number[] = [
  523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98,
];

const COMBO_WINDOW_SEC = 0.35;
const BRICK_ATTACK_SEC = 0.002;
const BRICK_DECAY_SEC = 0.055;

export class ProceduralSFX {
  private readonly limiter: AudioLimiter;
  private comboStep = 0;
  private lastBrickHitAt = -Infinity;

  constructor(limiter: AudioLimiter) {
    this.limiter = limiter;
  }

  /** 连击状态重置（切关/重开时调用）。 */
  resetCombo(): void {
    this.comboStep = 0;
    this.lastBrickHitAt = -Infinity;
  }

  playBrickHit(combo: number): void {
    if (!this.limiter.tryAcquire('brick')) return;
    const ctx = this.limiter.ctx;
    const now = ctx.currentTime;

    // 350ms 窗口内连击沿音阶爬升，超时回落；外部 combo 作为爬升上限参考
    if (now - this.lastBrickHitAt < COMBO_WINDOW_SEC) {
      this.comboStep = Math.min(this.comboStep + 1, PENTATONIC_FREQS.length - 1);
    } else {
      this.comboStep = 0;
    }
    this.lastBrickHitAt = now;
    const step = Math.max(0, Math.min(this.comboStep, combo));
    const freq = PENTATONIC_FREQS[step] ?? PENTATONIC_FREQS[0]!;

    // Triangle 主音 + 高八度 Sine 泛音
    const voice = ctx.createGain();
    voice.connect(this.limiter.input);
    voice.gain.setValueAtTime(0, now);
    voice.gain.linearRampToValueAtTime(0.32, now + BRICK_ATTACK_SEC);
    voice.gain.exponentialRampToValueAtTime(0.001, now + BRICK_DECAY_SEC);

    const main = ctx.createOscillator();
    main.type = 'triangle';
    main.frequency.value = freq;
    const overtone = ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.value = freq * 2;
    const overtoneGain = ctx.createGain();
    overtoneGain.gain.value = 0.28;

    main.connect(voice);
    overtone.connect(overtoneGain);
    overtoneGain.connect(voice);

    const stopAt = now + BRICK_DECAY_SEC + 0.02;
    main.start(now);
    overtone.start(now);
    main.stop(stopAt);
    overtone.stop(stopAt);
    this.autoRelease(main, voice);
    this.autoRelease(overtone, voice, overtoneGain);
  }

  playWallHit(): void {
    if (!this.limiter.tryAcquire('wall')) return;
    const ctx = this.limiter.ctx;
    const now = ctx.currentTime;
    const duration = 0.04;

    const voice = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    voice.connect(filter);
    filter.connect(this.limiter.input);
    voice.gain.setValueAtTime(0.28, now);
    voice.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160, now); // 160Hz → 90Hz 滑落
    osc.frequency.exponentialRampToValueAtTime(90, now + duration);
    osc.connect(voice);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    this.autoRelease(osc, voice, filter);
  }

  playPaddleHit(offsetRatio: number): void {
    if (!this.limiter.tryAcquire('paddle')) return;
    const ctx = this.limiter.ctx;
    const now = ctx.currentTime;
    const duration = 0.09;

    // 边缘接球（|offset|→1）音调更高：300Hz → 520Hz
    const edge = Math.min(1, Math.abs(offsetRatio));
    const baseFreq = 300 + edge * 220;

    const voice = ctx.createGain();
    voice.connect(this.limiter.input);
    voice.gain.setValueAtTime(0.3, now);
    voice.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.5, now); // 弹性下扫
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.05);
    osc.connect(voice);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    this.autoRelease(osc, voice);
  }

  playMultiLaunch(): void {
    // 快速 3 连上行琶音脉冲
    const notes = [PENTATONIC_FREQS[0]!, PENTATONIC_FREQS[2]!, PENTATONIC_FREQS[4]!];
    for (let i = 0; i < notes.length; i++) {
      if (!this.limiter.tryAcquire('skill')) continue;
      this.pluck(notes[i]!, this.limiter.ctx.currentTime + i * 0.07, 0.12, 'square', 0.18);
    }
  }

  playTripleSplit(): void {
    if (!this.limiter.tryAcquire('skill')) return;
    const ctx = this.limiter.ctx;
    const now = ctx.currentTime;

    // 宽广和弦冲击波（根音 + 三音 + 五音）
    const chord = [PENTATONIC_FREQS[0]!, PENTATONIC_FREQS[2]!, PENTATONIC_FREQS[3]!];
    for (const freq of chord) {
      this.pluck(freq, now, 0.35, 'sawtooth', 0.12);
    }

    // 高频闪烁 sweep
    const voice = ctx.createGain();
    voice.connect(this.limiter.input);
    voice.gain.setValueAtTime(0.001, now);
    voice.gain.linearRampToValueAtTime(0.14, now + 0.05);
    voice.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    const sweep = ctx.createOscillator();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(400, now);
    sweep.frequency.exponentialRampToValueAtTime(2400, now + 0.22);
    sweep.connect(voice);
    sweep.start(now);
    sweep.stop(now + 0.32);
    this.autoRelease(sweep, voice);
  }

  playWin(): void {
    // 原创 4 音符上行胜利琶音 C5 E5 G5 C6
    const notes = [
      PENTATONIC_FREQS[0]!,
      PENTATONIC_FREQS[2]!,
      PENTATONIC_FREQS[3]!,
      PENTATONIC_FREQS[5]!,
    ];
    for (let i = 0; i < notes.length; i++) {
      if (!this.limiter.tryAcquire('stinger')) continue;
      this.pluck(notes[i]!, this.limiter.ctx.currentTime + i * 0.11, 0.32, 'triangle', 0.26);
    }
  }

  playLose(): void {
    if (!this.limiter.tryAcquire('stinger')) return;
    const ctx = this.limiter.ctx;
    const now = ctx.currentTime;
    // 下行柔和衰减和弦 A4 F4 D4
    const chord = [440.0, 349.23, 293.66];
    for (const freq of chord) {
      const voice = ctx.createGain();
      voice.connect(this.limiter.input);
      voice.gain.setValueAtTime(0.001, now);
      voice.gain.linearRampToValueAtTime(0.16, now + 0.04);
      voice.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(voice);
      osc.start(now);
      osc.stop(now + 0.95);
      this.autoRelease(osc, voice);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Milestone 5 / Step 2：特殊砖与 Fever 专属音色                       */
  /* ---------------------------------------------------------------- */

  /**
   * 炸弹爆破：低频下坠轰击 + 短促起爆瞬态。
   * 走 `AudioLimiter` 的 'bomb' 冷却组，防炸音；整条链共用一个声部额度。
   */
  playBombExplosion(): void {
    if (!this.limiter.tryAcquire('bomb')) return;
    const ctx = this.limiter.ctx;
    const now = ctx.currentTime;
    const duration = 0.42;

    const voice = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    voice.connect(filter);
    filter.connect(this.limiter.input);
    voice.gain.setValueAtTime(0.42, now);
    voice.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // 低频主体：140Hz → 42Hz 指数下坠
    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(140, now);
    body.frequency.exponentialRampToValueAtTime(42, now + duration * 0.9);
    body.connect(voice);
    body.start(now);
    body.stop(now + duration + 0.02);

    // 起爆头：短方波高频瞬态
    const crack = ctx.createOscillator();
    crack.type = 'square';
    crack.frequency.setValueAtTime(900, now);
    crack.frequency.exponentialRampToValueAtTime(180, now + 0.06);
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.16, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    crack.connect(crackGain);
    crackGain.connect(voice);
    crack.start(now);
    crack.stop(now + 0.09);

    this.autoReleaseGroup([body, crack], voice, filter, crackGain);
  }

  /** 棱镜折射：清脆高频三和弦（1760 / 2349 / 3136 Hz），单个声部额度。 */
  playPrismSplit(): void {
    if (!this.limiter.tryAcquire('prism')) return;
    const ctx = this.limiter.ctx;
    const now = ctx.currentTime;
    const chord = [1760, 2349.32, 3135.96];

    const voice = ctx.createGain();
    voice.connect(this.limiter.input);
    voice.gain.setValueAtTime(0, now);
    voice.gain.linearRampToValueAtTime(0.2, now + 0.006);
    voice.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    const oscs: OscillatorNode[] = [];
    for (let i = 0; i < chord.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = chord[i]!;
      osc.connect(voice);
      osc.start(now);
      osc.stop(now + 0.31);
      oscs.push(osc);
    }
    this.autoReleaseGroup(oscs, voice);
  }

  /** 核心充能：温暖上行双音（G4 → D5），单个声部额度。 */
  playCoreGrant(): void {
    if (!this.limiter.tryAcquire('core')) return;
    const ctx = this.limiter.ctx;
    const now = ctx.currentTime;

    const voice = ctx.createGain();
    voice.connect(this.limiter.input);
    voice.gain.setValueAtTime(0.001, now);
    voice.gain.linearRampToValueAtTime(0.2, now + 0.02);
    voice.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    const oscs: OscillatorNode[] = [];
    const specs: Array<[number, number]> = [
      [392.0, now],
      [587.33, now + 0.09],
    ];
    for (const [freq, when] of specs) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0, when);
      oscGain.gain.linearRampToValueAtTime(1, when + 0.01);
      osc.connect(oscGain);
      oscGain.connect(voice);
      osc.start(when);
      osc.stop(now + 0.36);
      oscs.push(osc);
    }
    this.autoReleaseGroup(oscs, voice);
  }

  /** 精准接球：短促清脆高频点音（不占用既有 paddle 冷却组）。 */
  playPreciseCatch(): void {
    if (!this.limiter.tryAcquire('prism')) return;
    const ctx = this.limiter.ctx;
    this.pluck(2093, ctx.currentTime, 0.09, 'sine', 0.11);
  }

  /** Fever 激活：上行激励扫频 + 五声音阶叠加和弦（单个声部额度）。 */
  playFeverActivate(): void {
    if (!this.limiter.tryAcquire('fever')) return;
    const ctx = this.limiter.ctx;
    const now = ctx.currentTime;

    const voice = ctx.createGain();
    voice.connect(this.limiter.input);
    voice.gain.setValueAtTime(0.001, now);
    voice.gain.linearRampToValueAtTime(0.22, now + 0.06);
    voice.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    const oscs: OscillatorNode[] = [];

    // 激励扫频
    const sweep = ctx.createOscillator();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(220, now);
    sweep.frequency.exponentialRampToValueAtTime(1760, now + 0.55);
    const sweepGain = ctx.createGain();
    sweepGain.gain.value = 0.5;
    sweep.connect(sweepGain);
    sweepGain.connect(voice);
    sweep.start(now);
    sweep.stop(now + 0.92);
    oscs.push(sweep);

    // 五声音阶叠加和弦
    const chord = [PENTATONIC_FREQS[3]!, PENTATONIC_FREQS[5]!, PENTATONIC_FREQS[7]!];
    for (let i = 0; i < chord.length; i++) {
      const when = now + 0.05 + i * 0.06;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = chord[i]!;
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0, when);
      oscGain.gain.linearRampToValueAtTime(0.6, when + 0.012);
      oscGain.gain.exponentialRampToValueAtTime(0.001, when + 0.4);
      osc.connect(oscGain);
      oscGain.connect(voice);
      osc.start(when);
      osc.stop(when + 0.42);
      oscs.push(osc);
    }
    this.autoReleaseGroup(oscs, voice);
  }

  /** Fever 结束：柔和下行两音收束（单个声部额度）。 */
  playFeverEnd(): void {
    if (!this.limiter.tryAcquire('fever')) return;
    const ctx = this.limiter.ctx;
    const now = ctx.currentTime;

    const voice = ctx.createGain();
    voice.connect(this.limiter.input);
    voice.gain.setValueAtTime(0.001, now);
    voice.gain.linearRampToValueAtTime(0.14, now + 0.03);
    voice.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    const oscs: OscillatorNode[] = [];
    const specs: Array<[number, number]> = [
      [880, now],
      [523.25, now + 0.12],
    ];
    for (const [freq, when] of specs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0, when);
      oscGain.gain.linearRampToValueAtTime(1, when + 0.012);
      oscGain.gain.exponentialRampToValueAtTime(0.001, when + 0.36);
      osc.connect(oscGain);
      oscGain.connect(voice);
      osc.start(when);
      osc.stop(when + 0.38);
      oscs.push(osc);
    }
    this.autoReleaseGroup(oscs, voice);
  }

  /* ---------------------------------------------------------------- */
  /* 内部工具                                                          */
  /* ---------------------------------------------------------------- */

  /** 单音拨弦：指定起音时间、时长、波形与峰值。 */
  private pluck(
    freq: number,
    when: number,
    duration: number,
    type: OscillatorType,
    peak: number,
  ): void {
    const ctx = this.limiter.ctx;
    const voice = ctx.createGain();
    voice.connect(this.limiter.input);
    voice.gain.setValueAtTime(0, when);
    voice.gain.linearRampToValueAtTime(peak, when + 0.005);
    voice.gain.exponentialRampToValueAtTime(0.001, when + duration);

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(voice);
    osc.start(when);
    osc.stop(when + duration + 0.03);
    this.autoRelease(osc, voice);
  }

  /**
   * 节点生命周期托管：主振荡器停止后释放限流器声部并断开整条节点链，
   * 杜绝长时间播放后的节点泄漏。
   */
  private autoRelease(osc: OscillatorNode, ...nodes: AudioNode[]): void {
    osc.onended = () => {
      this.limiter.release();
      for (const node of nodes) {
        try {
          node.disconnect();
        } catch {
          /* 已断开则忽略 */
        }
      }
      try {
        osc.disconnect();
      } catch {
        /* 已断开则忽略 */
      }
    };
  }

  /**
   * 多振荡器共享单一限流器声部额度时使用：
   * 只有最后一个振荡器停止时才归还额度并断开整条节点链，
   * 避免「一次 acquire、多次 release」导致限流器计数漂移。
   */
  private autoReleaseGroup(oscs: OscillatorNode[], ...nodes: AudioNode[]): void {
    let remaining = oscs.length;
    if (remaining === 0) {
      this.limiter.release();
      return;
    }
    for (const osc of oscs) {
      osc.onended = () => {
        remaining--;
        if (remaining > 0) return;
        this.limiter.release();
        for (const node of nodes) {
          try {
            node.disconnect();
          } catch {
            /* 已断开则忽略 */
          }
        }
        for (const other of oscs) {
          try {
            other.disconnect();
          } catch {
            /* 已断开则忽略 */
          }
        }
      };
    }
  }
}
