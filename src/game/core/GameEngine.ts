/**
 * 《碎砖大裂变》(Brick Fission) — 核心游戏引擎（逻辑内核）
 *
 * 实现 `docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md` 的状态机与编排层：
 *   - 阶段机：`READY_AIM` / `PLAYING` / `PAUSED` / `WON` / `LOST`；
 *   - §3.2 快进：`×2 / ×3` 通过**循环调用 N 次 `step(FIXED_DT)`** 实现，
 *     严禁把 `dt` 乘以 3 传入单步计算（会造成穿透）；
 *   - §4 瞄准：READY_AIM 阶段预测折线并支持松手发球；
 *   - §5 技能：蓝标连发 / 橙标裂变 + 溢出伤害倍率；
 *   - §6 残局防垃圾时间：ENDGAME_ASSIST 软追踪收尾；
 *   - 胜负判定：可破坏砖清零 → `WON`（灰墙不计入）；所有球出界 → `LOST`。
 *
 * 纯 TypeScript：严禁引用任何宿主环境 API
 * （浏览器全局对象、Canvas / 音频上下文、动画帧调度、前端框架运行时、小游戏宿主等一律禁止）。
 */

import {
  AIM_ANGLE_MAX_DEG,
  AIM_ANGLE_MIN_DEG,
  ANGLE_EPSILON,
  BASE_BALL_SPEED,
  BALL_RADIUS,
  DEATH_LINE_Y,
  ENDGAME_HOMING_DEG,
  ENDGAME_IDLE_SEC,
  ENDGAME_REMAINING_COUNT,
  ENDGAME_REMAINING_RATIO,
  FIXED_DT,
  PADDLE_CONTACT_GAP,
  PADDLE_FOLLOW_SPEED,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_Y,
  WALL_LEFT,
  WALL_RIGHT,
} from './constants.js';
import { AimRaycaster } from './AimRaycaster.js';
import { BrickGrid } from './BrickGrid.js';
import { PhysicsEngine } from './PhysicsEngine.js';
import type { PhysicsWorld } from './PhysicsEngine.js';
import { SkillSystem } from './SkillSystem.js';
import type { SkillContext, SkillUseResult } from './SkillSystem.js';
import type {
  AimPrediction,
  Ball,
  GameEvent,
  GamePhase,
  LevelRuntimeConfig,
  Paddle,
  SkillInventory,
} from './types.js';

/** 支持的快进档位。 */
export type SpeedMultiplier = 1 | 2 | 3;

/** 事件队列上限（防止消费方不 drain 时无限增长）。 */
const EVENT_QUEUE_LIMIT = 512;

export interface GameEngineOptions {
  /** 关卡运行时配置（网格或 RLE 二选一）。 */
  level: LevelRuntimeConfig;
  /** 随机源（可注入，保证测试确定性）。 */
  rng?: () => number;
  /** 同屏物理球数上限（≤ MAX_PHYSICAL_BALLS）。 */
  maxBalls?: number;
  /** 开局技能存量（覆盖关卡配置）。 */
  initialSkills?: Partial<SkillInventory>;
}

/**
 * 逻辑内核入口：对外暴露「输入 → 状态 → 事件」的最小接口，
 * 渲染层 / UI 层（Milestone 2）只读消费 `snapshot` 与 `drainEvents()`。
 */
export class GameEngine implements PhysicsWorld {
  /** 砖块网格（只读视图，扣血通过物理层发生）。 */
  grid: BrickGrid;
  /** 物理引擎。 */
  readonly physics: PhysicsEngine;
  /** 技能系统。 */
  readonly skills: SkillSystem;
  /** 瞄准预测器。 */
  aim: AimRaycaster;
  /** 挡板状态。 */
  readonly paddle: Paddle;
  /** 关卡 ID。 */
  readonly levelId: string;

  private readonly level: LevelRuntimeConfig;
  private readonly rng: () => number;
  private readonly initialSkills: SkillInventory;
  private readonly events: GameEvent[] = [];
  private readonly skillContext: SkillContext;

  private phase: GamePhase = 'READY_AIM';
  private speedMultiplier: SpeedMultiplier = 1;
  private aimAngleDeg = 0;
  private elapsedSec = 0;
  /** 连续无砖块受击的时长（秒），残局辅助判据之一。 */
  private idleBrickSec = 0;
  /** 残局软追踪是否已激活。 */
  private endgameAssistActive = false;
  private endgameTargetCol = -1;
  private endgameTargetRow = -1;

  constructor(options: GameEngineOptions) {
    this.level = options.level;
    this.rng = options.rng ?? Math.random;
    this.levelId = options.level.id;
    this.grid = new BrickGrid(options.level);
    this.physics = new PhysicsEngine(this, {
      maxBalls: options.maxBalls,
      rng: this.rng,
    });
    this.initialSkills = {
      multiLaunchCount: options.initialSkills?.multiLaunchCount ?? options.level.initialSkills?.multiLaunchCount ?? 0,
      tripleSplitCount: options.initialSkills?.tripleSplitCount ?? options.level.initialSkills?.tripleSplitCount ?? 0,
    };
    this.skills = new SkillSystem({
      inventory: this.initialSkills,
    });
    this.aim = new AimRaycaster(this.grid);
    this.paddle = {
      x: (WALL_LEFT + WALL_RIGHT) * 0.5,
      y: PADDLE_Y,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      targetX: (WALL_LEFT + WALL_RIGHT) * 0.5,
    };

    this.skillContext = {
      paddle: this.paddle,
      balls: this.physics.balls,
      maxBalls: this.physics.maxBalls,
      spawnBall: (x, y, vx, vy, radius) => this.physics.spawnBall(x, y, vx, vy, radius),
      emit: (event) => this.emit(event),
    };
  }

  /* ---------------------------------------------------------------- */
  /* 状态查询                                                          */
  /* ---------------------------------------------------------------- */

  /** 当前阶段。 */
  get currentPhase(): GamePhase {
    return this.phase;
  }

  /** 当前快进档位（1 / 2 / 3）。 */
  get currentSpeedMultiplier(): SpeedMultiplier {
    return this.speedMultiplier;
  }

  /** 当前瞄准角（度）。 */
  get currentAimAngle(): number {
    return this.aimAngleDeg;
  }

  /** 本局已进行的逻辑时长（秒）。 */
  get elapsedTimeSec(): number {
    return this.elapsedSec;
  }

  /** 活跃球数量。 */
  get activeBallCount(): number {
    return this.physics.activeBallCount;
  }

  /** 当前连击数。 */
  get combo(): number {
    return this.physics.currentCombo;
  }

  /** 剩余可破坏砖数量。 */
  get remainingBreakable(): number {
    return this.grid.remainingBreakable;
  }

  /** 剩余可破坏砖比例（0~1）。 */
  get remainingRatio(): number {
    return this.grid.remainingRatio;
  }

  /** 残局软追踪是否已激活。 */
  get isEndgameAssistActive(): boolean {
    return this.endgameAssistActive;
  }

  /** 残局软追踪的目标砖块。 */
  get endgameTarget(): { col: number; row: number } | null {
    if (!this.endgameAssistActive) return null;
    return { col: this.endgameTargetCol, row: this.endgameTargetRow };
  }

  /** 当前技能库存（只读快照）。 */
  get skillInventory(): SkillInventory {
    return {
      multiLaunchCount: this.skills.inventory.multiLaunchCount,
      tripleSplitCount: this.skills.inventory.tripleSplitCount,
    };
  }

  /** 待发射球的停靠位置（READY_AIM 阶段使用）。 */
  get dockedBallPosition(): { x: number; y: number } {
    return {
      x: this.paddle.x,
      y: this.paddle.y - this.paddle.height * 0.5 - BALL_RADIUS,
    };
  }

  /* ---------------------------------------------------------------- */
  /* 输入                                                              */
  /* ---------------------------------------------------------------- */

  /** 设置挡板目标 X（会被夹紧到墙内）。 */
  setPaddleTargetX(x: number): void {
    const half = this.paddle.width * 0.5;
    this.paddle.targetX = clamp(x, WALL_LEFT + half, WALL_RIGHT - half);
  }

  /** 设置瞄准角（度，自动夹紧到 [-72°, +72°]）。 */
  setAimAngle(angleDeg: number): void {
    this.aimAngleDeg = clamp(angleDeg, AIM_ANGLE_MIN_DEG, AIM_ANGLE_MAX_DEG);
  }

  /** 设置快进档位（1 / 2 / 3）。 */
  setSpeedMultiplier(multiplier: number): void {
    if (multiplier >= 3) this.speedMultiplier = 3;
    else if (multiplier === 2) this.speedMultiplier = 2;
    else this.speedMultiplier = 1;
  }

  /** 暂停。 */
  pause(): void {
    if (this.phase === 'PLAYING') this.phase = 'PAUSED';
  }

  /** 恢复。 */
  resume(): void {
    if (this.phase === 'PAUSED') this.phase = 'PLAYING';
  }

  /** 切换暂停。 */
  togglePause(): void {
    if (this.phase === 'PLAYING') this.phase = 'PAUSED';
    else if (this.phase === 'PAUSED') this.phase = 'PLAYING';
  }

  /**
   * READY_AIM 阶段松手发球：按当前瞄准角发射第一颗球并进入 PLAYING。
   */
  releaseBall(): boolean {
    if (this.phase !== 'READY_AIM') return false;
    const docked = this.dockedBallPosition;
    const rad = (this.aimAngleDeg * Math.PI) / 180;
    const vx = BASE_BALL_SPEED * Math.sin(rad);
    const vy = -BASE_BALL_SPEED * Math.cos(rad);
    const ball = this.physics.spawnBall(docked.x, docked.y, vx, vy, BALL_RADIUS);
    if (!ball) return false;
    this.phase = 'PLAYING';
    this.elapsedSec = 0;
    this.idleBrickSec = 0;
    this.checkOutcome();
    return true;
  }

  /**
   * 使用蓝标（连发加球）。
   *
   * 规格 docs/01 §5.1 明确适用场景含「开局快速铺场」，因此 READY_AIM
   * 阶段同样允许使用：扇形小球从挡板发射后阶段机转入 PLAYING。
   * PAUSED / WON / LOST 阶段拒绝。
   */
  useMultiLaunch(): SkillUseResult {
    if (this.phase !== 'PLAYING' && this.phase !== 'READY_AIM') {
      return { used: false, spawnedCount: 0, overflowCount: 0, overloadMultiplier: 1 };
    }
    const result = this.skills.useMultiLaunch(this.skillContext);
    if (result.used && result.spawnedCount > 0 && this.phase === 'READY_AIM') {
      this.phase = 'PLAYING';
    }
    return result;
  }

  /** 使用橙标（全场裂变 ×3）。 */
  useTripleSplit(): SkillUseResult {
    if (this.phase !== 'PLAYING') {
      return { used: false, spawnedCount: 0, overflowCount: 0, overloadMultiplier: 1 };
    }
    return this.skills.useTripleSplit(this.skillContext);
  }

  /* ---------------------------------------------------------------- */
  /* 主循环                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * 推进一帧。
   *
   * 快进实现（§3.2）：`×2 / ×3` 时**循环调用** 2 / 3 次 `step(FIXED_DT)`，
   * 每一步都走完整的 sub-stepping 流程，绝不把 `dt` 乘 3 传给单步。
   */
  update(dt: number): void {
    const frameDt = dt > 0 && Number.isFinite(dt) ? dt : FIXED_DT;

    this.updatePaddle(frameDt);

    if (this.phase !== 'PLAYING') return;

    const steps = this.speedMultiplier;
    for (let i = 0; i < steps; i++) {
      this.physics.step(FIXED_DT);
      this.skills.update(FIXED_DT);
      this.elapsedSec += FIXED_DT;
      this.idleBrickSec += FIXED_DT;
      this.checkOutcome();
      if (this.phase !== 'PLAYING') break;
    }

    this.updateEndgameAssist();
  }

  /** 挡板平滑跟随（targetX → x，受最大跟随速度限制）。 */
  private updatePaddle(dt: number): void {
    const diff = this.paddle.targetX - this.paddle.x;
    if (diff === 0) return;
    const maxStep = PADDLE_FOLLOW_SPEED * dt;
    if (Math.abs(diff) <= maxStep) {
      this.paddle.x = this.paddle.targetX;
    } else {
      this.paddle.x += Math.sign(diff) * maxStep;
    }
    const half = this.paddle.width * 0.5;
    this.paddle.x = clamp(this.paddle.x, WALL_LEFT + half, WALL_RIGHT - half);
  }

  /* ---------------------------------------------------------------- */
  /* 胜负判定                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * 胜负判定：
   *   - 剩余可破坏砖为 0 → `WON`（场上仍有 STEEL 灰墙也不影响过关）；
   *   - 全部球出界（`y - radius > DEATH_LINE_Y`）→ `LOST`。
   */
  private checkOutcome(): void {
    if (this.phase !== 'PLAYING') return;

    if (this.grid.remainingBreakable <= 0) {
      this.phase = 'WON';
      this.emit({ type: 'GAME_WON', levelId: this.levelId, elapsedSec: this.elapsedSec });
      return;
    }

    if (this.physics.activeBallCount <= 0) {
      this.phase = 'LOST';
      this.emit({
        type: 'GAME_LOST',
        levelId: this.levelId,
        remainingRatio: this.grid.remainingRatio,
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* 残局防垃圾时间（§6）                                               */
  /* ---------------------------------------------------------------- */

  /**
   * 残局辅助判定：剩余可破坏砖比例 ≤ 3%（或 ≤ 12 块）且连续 6 秒无砖块受击
   * → 激活 `ENDGAME_ASSIST` 软追踪。
   */
  private updateEndgameAssist(): void {
    if (this.endgameAssistActive) return;

    const remaining = this.grid.remainingBreakable;
    if (remaining <= 0) return;

    const nearEnd =
      this.grid.remainingRatio <= ENDGAME_REMAINING_RATIO || remaining <= ENDGAME_REMAINING_COUNT;
    if (!nearEnd) return;
    if (this.idleBrickSec < ENDGAME_IDLE_SEC) return;

    const target = this.grid.nearestDestructible(this.paddle.x, this.paddle.y);
    if (!target) return;

    this.endgameAssistActive = true;
    this.endgameTargetCol = target.col;
    this.endgameTargetRow = target.row;
    this.emit({ type: 'ENDGAME_ASSIST', targetCol: target.col, targetRow: target.row });
  }

  /**
   * 软追踪：球每次撞墙 / 撞挡板后，速度方向向"最近剩余可碎砖"微调 ≤ 12°。
   */
  private applySoftHoming(ball: Ball): void {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed <= ANGLE_EPSILON) return;

    const target = this.grid.nearestDestructible(ball.x, ball.y);
    if (!target) return;

    const rect = this.grid.cellRect(target.col, target.row);
    const targetX = rect.x + rect.width * 0.5;
    const targetY = rect.y + rect.height * 0.5;

    // 航向角：0 = 垂直向上，正值 = 朝右。
    const heading = Math.atan2(ball.vx, -ball.vy);
    const desired = Math.atan2(targetX - ball.x, -(targetY - ball.y));
    const maxDelta = (ENDGAME_HOMING_DEG * Math.PI) / 180;
    const delta = clamp(wrapAngle(desired - heading), -maxDelta, maxDelta);
    if (delta === 0) return;

    const cos = Math.cos(delta);
    const sin = Math.sin(delta);
    const vx = ball.vx * cos - ball.vy * sin;
    const vy = ball.vx * sin + ball.vy * cos;
    ball.vx = vx;
    ball.vy = vy;
  }

  /* ---------------------------------------------------------------- */
  /* PhysicsWorld 实现                                                 */
  /* ---------------------------------------------------------------- */

  /** 当前全局伤害倍率（技能溢出时 > 1）。 */
  damageMultiplier(): number {
    return this.skills.damageMultiplier;
  }

  /** 事件出口（入队，由消费方 drain）。 */
  emit(event: GameEvent): void {
    if (event.type === 'BRICK_HIT') {
      // 任意砖块受击都会重置"连续无受击"计时。
      this.idleBrickSec = 0;
    }
    this.events.push(event);
    if (this.events.length > EVENT_QUEUE_LIMIT) {
      this.events.splice(0, this.events.length - EVENT_QUEUE_LIMIT);
    }
  }

  /** 砖块被击碎：推进技能充能。 */
  onBrickDestroyed(_col: number, _row: number): void {
    this.skills.notifyBrickDestroyed(1, (event) => this.emit(event));
  }

  /** 撞击墙面或挡板：残局软追踪。 */
  onBoundaryBounce(ball: Ball): void {
    if (!this.endgameAssistActive) return;
    this.applySoftHoming(ball);
  }

  /* ---------------------------------------------------------------- */
  /* 事件消费与重开                                                    */
  /* ---------------------------------------------------------------- */

  /** 取出并清空事件队列。 */
  drainEvents(): GameEvent[] {
    if (this.events.length === 0) return [];
    const drained = this.events.slice();
    this.events.length = 0;
    return drained;
  }

  /** 瞄准折线预测（READY_AIM 阶段渲染用）。 */
  predictAim(): AimPrediction {
    const docked = this.dockedBallPosition;
    return this.aim.predict(docked.x, docked.y, this.aimAngleDeg);
  }

  /** 重开本关（重建网格、清空球与技能）。 */
  restart(): void {
    this.grid = new BrickGrid(this.level);
    this.aim = new AimRaycaster(this.grid);
    this.physics.reset();
    this.skills.reset(this.initialSkills);
    this.phase = 'READY_AIM';
    this.speedMultiplier = 1;
    this.aimAngleDeg = 0;
    this.elapsedSec = 0;
    this.idleBrickSec = 0;
    this.endgameAssistActive = false;
    this.endgameTargetCol = -1;
    this.endgameTargetRow = -1;
    this.events.length = 0;
    this.paddle.x = (WALL_LEFT + WALL_RIGHT) * 0.5;
    this.paddle.targetX = this.paddle.x;
  }
}

/* ------------------------------------------------------------------ */
/* 内部工具                                                            */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** 把角度归一化到 (-π, π]。 */
function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

/** 供外部复用：死亡线常量（渲染层做死亡特效时使用）。 */
export const DEATH_LINE = DEATH_LINE_Y;
/** 供外部复用：挡板顶面接触间隙。 */
export const PADDLE_GAP = PADDLE_CONTACT_GAP;
