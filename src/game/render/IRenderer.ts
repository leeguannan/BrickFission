/**
 * 《碎砖大裂变》(Brick Fission) — 渲染后端抽象契约
 *
 * 契约来源：`docs/02_RENDERER_AUDIO_AND_VISUAL_SPEC.md` §2.1。
 * 逻辑层与外壳只认识 `IRenderer`，未来可无缝替换为 WebGL 渲染器
 * （微信高性能模式）而不改游戏代码。
 */
import type {
  AimPrediction,
  Ball,
  BrickCell,
  FeverSnapshot,
  GamePhase,
  Paddle,
} from '../core/types.js';
import type { AnyCanvas } from '../platform/AnyCanvas.js';

/** 单格砖块的增量更新描述。 */
export interface DirtyBrickUpdate {
  col: number;
  row: number;
  /** 变化后的格子（被击碎时 role === 'EMPTY'）。 */
  cell: BrickCell;
  /** 本次更新是否伴随击碎（用于触发粒子）。 */
  destroyed: boolean;
}

/**
 * 引擎只读快照：所有数组均为引擎内部缓冲的直接引用，
 * 渲染器**只读不写**，禁止拷贝（零 GC 原则）。
 */
export interface GameSnapshot {
  phase: GamePhase;
  levelId: string;
  levelNo: number;
  paddle: Readonly<Paddle>;
  /** 物理球池（固定容量，按 `ball.active` 过滤绘制）。 */
  balls: ReadonlyArray<Ball>;
  activeBallCount: number;
  /** READY_AIM 阶段的瞄准预测；其余阶段为 null。 */
  aim: AimPrediction | null;
  combo: number;
  remainingBreakable: number;
  totalBreakable: number;
  speedMultiplier: 1 | 2 | 3;
  /** 当前全局伤害倍率（>1 时球切换高能贴图）。 */
  damageMultiplier: number;
  /** 残局软追踪是否激活。 */
  endgameAssist: boolean;
  /** 当前挡板皮肤 id。 */
  paddleSkinId: string;
  /** 全局静音（渲染器仅用于决定是否画静音角标，音频状态以音频引擎为准）。 */
  muted: boolean;
  /**
   * Milestone 5 / Step 2：Fever 暴走状态快照（可选字段，向后兼容）。
   * 缺省视为「无 Fever」，渲染层据此决定是否绘制 Fever 拖尾 / 边框光效。
   */
  fever?: FeverSnapshot;
}

export interface RenderContextData {
  engineState: Readonly<GameSnapshot>;
  /** 本帧状态变化/被击碎的砖块列表。 */
  dirtyBricks: ReadonlyArray<DirtyBrickUpdate>;
  /** 切关或重开时为 true，触发砖块离屏层整层重绘。 */
  fullRebuildBricks: boolean;
}

export interface IRenderer {
  init(canvas: AnyCanvas, width: number, height: number, dpr: number): void;
  resize(width: number, height: number, dpr: number): void;
  setSkin(paddleSkinId: string, ballSkinId?: string): void;
  spawnBrickParticles(x: number, y: number, color: string, count: number): void;
  /**
   * Milestone 5 / Step 2：特效爆发粒子（炸弹爆破 / 棱镜折射 / 核心充能）。
   *
   * 可选方法：颜色直接用预烘焙碎块贴图索引，数量不再受普通砖 2~3 的限制。
   * 仍复用同一个定长 `ParticlePool`，运行期零分配。
   */
  spawnEffectBurst?(x: number, y: number, colorIndex: number, count: number): void;
  triggerScreenShake(intensity: number, durationMs: number): void;
  render(data: RenderContextData, dt: number): void;
  dispose(): void;
}
