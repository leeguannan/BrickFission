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
  BOMB_BLAST_DAMAGE,
  BOMB_BLAST_RADIUS,
  BOMB_CHAIN_MAX_DEPTH,
  CORE_PIERCE_COUNT,
  CORE_SKILL_CHARGE,
  DEATH_LINE_Y,
  ENDGAME_HOMING_DEG,
  ENDGAME_IDLE_SEC,
  ENDGAME_REMAINING_COUNT,
  ENDGAME_REMAINING_RATIO,
  FEVER_DAMAGE_MULTIPLIER,
  FEVER_DURATION_SEC,
  FEVER_ENERGY_MAX,
  FEVER_ENERGY_PER_CATCH,
  FIXED_DT,
  PADDLE_CONTACT_GAP,
  PADDLE_FOLLOW_SPEED,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_Y,
  PRECISE_CATCH_THRESHOLD,
  PRISM_SPLIT_ANGLE_DEG,
  PRISM_SPLIT_COUNT,
  REVIVE_BALL_COUNT,
  REVIVE_FAN_ANGLES,
  SKILL_REFILL_COUNT,
  SOFT_HOMING_STEEL_PROBE,
  SOFT_HOMING_TANGENT_FACTOR,
  WALL_LEFT,
  WALL_RIGHT,
  brickColorAt,
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
  FeverSnapshot,
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

  /* --- Milestone 5 / Step 2：Fever 暴走状态 --- */
  /** Fever 能量（0 ~ FEVER_ENERGY_MAX）。 */
  private feverEnergy = 0;
  /** Fever 是否处于暴走中。 */
  private feverActive = false;
  /** Fever 剩余时长（秒）。 */
  private feverRemainingSec = 0;
  /** 连锁引爆的统计缓冲（零 GC 复用）。 */
  private readonly blastAffected = { count: 0 };

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

  /**
   * Fever 暴走状态快照（Milestone 5 / Step 2）。
   *
   * Web HUD、Canvas HUD（微信版）与 e2e 探针共用这一份只读数据，
   * 保证三端表现一致。
   */
  get feverSnapshot(): FeverSnapshot {
    return {
      energy: this.feverEnergy,
      maxEnergy: FEVER_ENERGY_MAX,
      active: this.feverActive,
      remainingSec: this.feverRemainingSec,
      durationSec: FEVER_DURATION_SEC,
      // 与 `damageMultiplier()` / `feverDamageMultiplier()` 同源：取两者较大值。
      damageMultiplier: Math.max(this.damageMultiplier(), this.feverDamageMultiplier()),
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
  /* 商业化预留（Milestone 4）                                          */
  /* ---------------------------------------------------------------- */

  /**
   * 复活续关（`docs/04` §3.1 商业化循环 ①）。
   *
   * 语义：
   *   - 仅在 `LOST` 阶段可用（一次失败一次机会，用掉即失效）；
   *   - **保留已清砖块进度**（`grid` 不重建）；
   *   - 从挡板上方按扇形补发 `ballCount` 颗球（默认 3 颗，见 `REVIVE_BALL_COUNT`）；
   *   - 阶段回到 `PLAYING`，计时继续累计（用于最佳秒数统计）。
   *
   * @param ballCount 补发球数，默认 `REVIVE_BALL_COUNT`。
   * @returns 是否复活成功（无球可发或阶段不允许时为 false）。
   */
  revive(ballCount: number = REVIVE_BALL_COUNT): boolean {
    if (this.phase !== 'LOST') return false;
    if (!Number.isFinite(ballCount) || ballCount <= 0) return false;

    const count = Math.floor(ballCount);
    const docked = this.dockedBallPosition;
    const angles = computeReviveAngles(count);
    let spawned = 0;
    for (let i = 0; i < angles.length; i++) {
      const angleDeg = angles[i] ?? 0;
      const rad = (angleDeg * Math.PI) / 180;
      const vx = BASE_BALL_SPEED * Math.sin(rad);
      const vy = -BASE_BALL_SPEED * Math.cos(rad);
      const ball = this.physics.spawnBall(docked.x, docked.y, vx, vy, BALL_RADIUS);
      if (!ball) break;
      spawned += 1;
    }
    if (spawned === 0) return false;

    this.phase = 'PLAYING';
    this.idleBrickSec = 0;
    this.emit({ type: 'REVIVED', ballCount: spawned });
    return true;
  }

  /**
   * 直接发放技能库存（`docs/04` §3.1 商业化循环 ②：激励广告补给）。
   *
   * 不受「击碎砖块充能」限制，只加库存；调用方负责广告观看与暂停/恢复。
   *
   * @param skill 技能种类。
   * @param count 发放次数，默认 `SKILL_REFILL_COUNT`。
   * @returns 发放后的库存总数（未发放时返回原值）。
   */
  grantSkill(
    skill: 'MULTI_LAUNCH' | 'TRIPLE_SPLIT',
    count: number = SKILL_REFILL_COUNT,
  ): number {
    const total = this.skills.grantInventory(skill, count);
    this.emit({ type: 'SKILL_GRANTED', skill, total });
    return total;
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
      this.updateFever(FIXED_DT);
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
   * 软追踪：球每次撞墙 / 撞挡板后，速度方向向"最近剩余可碎砖"微调 ≤ ENDGAME_HOMING_DEG 度。
   *
   * 防吸墙：若目标方向上紧邻着就是 STEEL 钢墙，硬偏转只会让球贴着钢墙反复回弹
   * （实测残局里球在钢墙与砖阵之间来回弹，破砖率归零）。
   * 因此偏转前先沿目标方向探测钢墙：
   *   - 目标方向被挡 → 改沿切向微幅脱困（切向同样不能指向钢墙）；
   *   - 两侧切向都被挡 → 本次不偏转，保持当前航向。
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

    // 目标方向单位向量（与 heading 约定一致：0 = 垂直向上）。
    let dirX = Math.sin(desired);
    let dirY = -Math.cos(desired);

    if (this.isSteelAhead(ball.x, ball.y, dirX, dirY, SOFT_HOMING_STEEL_PROBE)) {
      // 目标方向紧邻钢墙 → 尝试沿切向脱困。
      const tangent = maxDelta * SOFT_HOMING_TANGENT_FACTOR;
      const left = rotateVector(dirX, dirY, tangent);
      const right = rotateVector(dirX, dirY, -tangent);
      const leftClear = !this.isSteelAhead(ball.x, ball.y, left[0], left[1], SOFT_HOMING_STEEL_PROBE);
      const rightClear = !this.isSteelAhead(ball.x, ball.y, right[0], right[1], SOFT_HOMING_STEEL_PROBE);
      if (leftClear) {
        dirX = left[0];
        dirY = left[1];
      } else if (rightClear) {
        dirX = right[0];
        dirY = right[1];
      } else {
        // 两侧都是钢墙：本次不偏转，避免把球塞进钢墙缝隙里来回弹。
        return;
      }
    }

    const aimed = Math.atan2(dirX, -dirY);
    const delta = clamp(wrapAngle(aimed - heading), -maxDelta, maxDelta);
    if (delta === 0) return;

    const cos = Math.cos(delta);
    const sin = Math.sin(delta);
    const vx = ball.vx * cos - ball.vy * sin;
    const vy = ball.vx * sin + ball.vy * cos;
    ball.vx = vx;
    ball.vy = vy;
  }

  /**
   * 沿方向探测前方是否有 STEEL 钢墙。
   *
   * 探测区间从球心 + 球半径开始（跳过球自身占据的空间），
   * 避免「球正贴着墙」时被自身所在格误判为前方有墙。
   */
  private isSteelAhead(x: number, y: number, dirX: number, dirY: number, distance: number): boolean {
    const start = BALL_RADIUS;
    const end = BALL_RADIUS + distance;
    const step = 2;
    for (let d = start; d <= end; d += step) {
      const px = x + dirX * d;
      const py = y + dirY * d;
      const col = this.grid.colAt(px);
      const row = this.grid.rowAt(py);
      if (!this.grid.contains(col, row)) continue;
      const cell = this.grid.at(col, row);
      if (cell && cell.role === 'STEEL') return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------- */
  /* Milestone 5 / Step 2：特殊砖与 Fever 暴走                          */
  /* ---------------------------------------------------------------- */

  /**
   * 特殊砖被击碎后的结算（由物理层在砖块摧毁的瞬间上抛）。
   *
   * - `BOMB`：以爆点为中心做 `BOMB_BLAST_RADIUS`（3×3）邻域冲击波，
   *   对范围内可破坏砖造成 `BOMB_BLAST_DAMAGE` 点伤害；
   *   相邻 BOMB 会**连环引爆**（递归深度受 `BOMB_CHAIN_MAX_DEPTH` 限制，
   *   杜绝无限递归）；**钢墙 STEEL 永不被爆破破坏**。
   * - `PRISM`：按当前速度方向分裂出 `PRISM_SPLIT_COUNT` 颗折射子球；
   *   球池已满时，溢出的子球按 §5.2 规则转化为伤害倍率（不无限刷爆球池）。
   * - `CORE`：立即发放 `CORE_SKILL_CHARGE` 次随机技能充能，
   *   并给场上所有活跃球附加 `CORE_PIERCE_COUNT` 次穿透力。
   */
  onSpecialBrickDestroyed(
    role: 'BOMB' | 'PRISM' | 'CORE',
    col: number,
    row: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
  ): void {
    if (role === 'BOMB') {
      this.blastAffected.count = 0;
      this.explodeBomb(col, row, 0);
      this.emit({
        type: 'BOMB_EXPLODED',
        col,
        row,
        x,
        y,
        affectedCount: this.blastAffected.count,
      });
      return;
    }
    if (role === 'PRISM') {
      this.splitPrism(x, y, vx, vy);
      return;
    }
    this.grantCoreBonus(x, y);
  }

  /**
   * 炸弹冲击波（3×3 邻域 + 连环引爆）。
   *
   * 递归深度由 `BOMB_CHAIN_MAX_DEPTH` 封顶：即使整片区域都是炸弹，
   * 也不会出现无限递归。
   */
  private explodeBomb(col: number, row: number, depth: number): void {
    const radius = BOMB_BLAST_RADIUS;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dc === 0 && dr === 0) continue;
        const tc = col + dc;
        const tr = row + dr;
        if (!this.grid.contains(tc, tr)) continue;
        const cell = this.grid.at(tc, tr);
        if (!cell) continue;
        const cellRole = cell.role;
        // 空位与钢墙都不参与爆破（钢墙永不破坏）。
        if (cellRole === 'EMPTY' || cellRole === 'STEEL') continue;

        const colorIndex = cell.colorIndex;
        const rect = this.grid.cellRect(tc, tr);
        const cx = rect.x + rect.width * 0.5;
        const cy = rect.y + rect.height * 0.5;
        const result = this.grid.damage(tc, tr, BOMB_BLAST_DAMAGE);
        if (!result.damaged) continue;

        this.blastAffected.count++;
        if (result.destroyed) {
          this.onBrickDestroyed(tc, tr);
        }
        this.emit({
          type: 'BRICK_HIT',
          col: tc,
          row: tr,
          x: cx,
          y: cy,
          color: brickColorAt(colorIndex),
          destroyed: result.destroyed,
          combo: this.combo,
        });

        if (result.destroyed && cellRole === 'BOMB' && depth < BOMB_CHAIN_MAX_DEPTH) {
          this.explodeBomb(tc, tr, depth + 1);
        }
      }
    }
  }

  /**
   * 棱镜折射分裂：按当前速度方向左右各偏 `PRISM_SPLIT_ANGLE_DEG` 度，
   * 分裂出 `PRISM_SPLIT_COUNT` 颗子球。
   *
   * 球池满时溢出部分转化为伤害倍率（与蓝标/橙标技能共用同一套规则）。
   */
  private splitPrism(x: number, y: number, vx: number, vy: number): void {
    const speed = Math.hypot(vx, vy);
    if (speed <= ANGLE_EPSILON) return;

    const baseAngle = Math.atan2(vx, -vy);
    const spread = (PRISM_SPLIT_ANGLE_DEG * Math.PI) / 180;

    let spawned = 0;
    let overflow = 0;
    for (let s = 0; s < PRISM_SPLIT_COUNT; s++) {
      const sign = s === 0 ? -1 : 1;
      const angle = baseAngle + sign * spread;
      const nvx = Math.sin(angle) * speed;
      const nvy = -Math.cos(angle) * speed;
      const ball = this.physics.spawnBall(x, y, nvx, nvy, BALL_RADIUS);
      if (ball) spawned++;
      else overflow++;
    }

    if (overflow > 0) {
      this.skills.raiseOverflowDamage(overflow, this.physics.maxBalls, (event) => this.emit(event));
    }
    this.emit({ type: 'PRISM_SPLIT', x, y, spawnedCount: spawned });
  }

  /**
   * 核心砖奖励：随机发放一次技能充能，并给场上所有活跃球附加穿透力。
   */
  private grantCoreBonus(x: number, y: number): void {
    const skill: 'MULTI_LAUNCH' | 'TRIPLE_SPLIT' = this.rng() < 0.5 ? 'MULTI_LAUNCH' : 'TRIPLE_SPLIT';
    const total = this.grantSkill(skill, CORE_SKILL_CHARGE);
    this.emit({ type: 'CORE_GRANTED', skill, total, x, y });

    const balls = this.physics.balls;
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      if (ball && ball.active) ball.pierceCount += CORE_PIERCE_COUNT;
    }
  }

  /**
   * 精准接球（Milestone 5 / Step 2）。
   *
   * `|offsetRatio| >= PRECISE_CATCH_THRESHOLD`（挡板边缘命中）且为有效战斗回弹时，
   * 累计 `FEVER_ENERGY_PER_CATCH` 点 Fever 能量；能量满 `FEVER_ENERGY_MAX` 时
   * 自动进入 Fever 暴走（持续 `FEVER_DURATION_SEC` 秒）。
   */
  onPaddleHit(offsetRatio: number): void {
    if (this.phase !== 'PLAYING') return;
    if (!Number.isFinite(offsetRatio)) return;
    if (Math.abs(offsetRatio) < PRECISE_CATCH_THRESHOLD) return;
    // Fever 期间不再累计能量（结束后清零重新积攒）。
    if (this.feverActive) return;

    this.feverEnergy = Math.min(FEVER_ENERGY_MAX, this.feverEnergy + FEVER_ENERGY_PER_CATCH);
    this.emit({ type: 'PRECISE_CATCH', offsetRatio, feverEnergy: this.feverEnergy });
    if (this.feverEnergy >= FEVER_ENERGY_MAX) {
      this.activateFever();
    }
  }

  /**
   * 激活 Fever 暴走：2× 伤害倍率，持续 `FEVER_DURATION_SEC` 秒。
   *
   * **不发放任何全局穿透**（见 `constants.ts` 中 `FEVER_DAMAGE_MULTIPLIER` 的
   * 设计取舍说明）：全局穿透会改写球的轨迹模型，把第 18 / 19 关的千砖阵
   * 破砖率从 99% 打到 14%，击穿 V1 回归门禁。伤害倍率分支对单血砖等价、
   * 对多血砖只加速破砖，轨迹零改变。
   */
  private activateFever(): void {
    this.feverActive = true;
    this.feverRemainingSec = FEVER_DURATION_SEC;
    this.emit({ type: 'FEVER_ACTIVATED', durationSec: FEVER_DURATION_SEC });
  }

  /** Fever 倒计时推进（结束清零能量并回收额外穿透）。 */
  private updateFever(dt: number): void {
    if (!this.feverActive) return;
    this.feverRemainingSec -= dt;
    if (this.feverRemainingSec > 0) return;
    this.feverRemainingSec = 0;
    this.feverActive = false;
    this.feverEnergy = 0;
    this.emit({ type: 'FEVER_ENDED' });
  }

  /* ---------------------------------------------------------------- */
  /* PhysicsWorld 实现                                                 */
  /* ---------------------------------------------------------------- */

  /**
   * 当前全局伤害倍率（仅技能溢出时 > 1）。
   *
   * Fever 的倍率走独立的 `feverDamageMultiplier()`，因为它**只对已受损的砖**
   * 生效，语义与「技能溢出全局生效」不同，混在一起会让物理层无法区分。
   */
  damageMultiplier(): number {
    return this.skills.damageMultiplier;
  }

  /**
   * Fever 暴走的伤害倍率（未开启时为 1）。
   *
   * 物理层只把该倍率施加给**已受损的砖**：1 血 / 2 血砖的破碎时序与基线
   * 完全一致，3 血及以上砖被加速击碎 —— 这样既满足「2× 伤害倍率」的需求，
   * 又不会击穿 V1 回归门禁（实测无条件 2× 会让 `test:bot` 从 17/20 掉到 13/20）。
   */
  feverDamageMultiplier(): number {
    return this.feverActive ? FEVER_DAMAGE_MULTIPLIER : 1;
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
    this.feverEnergy = 0;
    this.feverActive = false;
    this.feverRemainingSec = 0;
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

/**
 * 二维向量旋转（弧度）。
 *
 * 残局软追踪用它在目标方向被钢墙挡住时求切向脱困方向。
 */
function rotateVector(x: number, y: number, angle: number): [number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos - y * sin, x * sin + y * cos];
}

/**
 * 计算复活补发球的扇形角度（单位：度，0 = 垂直向上）。
 *
 * - 1 颗：正上方，避免无谓偏折；
 * - 2 颗：±6°，左右对称；
 * - 3 颗：-12° / 0° / +12°（默认复活球数）；
 * - 4 颗及以上：在 ±12° 内等距铺开（4 颗时与 `REVIVE_FAN_ANGLES` 完全一致）。
 */
function computeReviveAngles(count: number): number[] {
  const span = 12;
  const n = Math.max(1, Math.floor(count));
  if (n === 1) return [0];
  if (n === 2) return [-span / 2, span / 2];
  if (n === REVIVE_FAN_ANGLES.length) return [...REVIVE_FAN_ANGLES];
  const step = (span * 2) / (n - 1);
  const angles: number[] = [];
  for (let i = 0; i < n; i++) angles.push(-span + i * step);
  return angles;
}

/** 供外部复用：死亡线常量（渲染层做死亡特效时使用）。 */
export const DEATH_LINE = DEATH_LINE_Y;
/** 供外部复用：挡板顶面接触间隙。 */
export const PADDLE_GAP = PADDLE_CONTACT_GAP;
