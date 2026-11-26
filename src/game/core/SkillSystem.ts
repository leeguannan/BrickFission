/**
 * 《碎砖大裂变》(Brick Fission) — 双主动技能系统
 *
 * 实现 `docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md` §5：
 *   - §5.1 蓝标 `MULTI_LAUNCH`：从挡板连发一波小球；
 *   - §5.2 橙标 `TRIPLE_SPLIT`：场上每颗球在原地 1 变 3（偏转 ±22°）；
 *   - §5.2 Ball Cap & Overflow Damage：超出 `MAX_PHYSICAL_BALLS = 200` 的球数
 *     动态转化为伤害倍率（高能破甲），保证低端机帧率不受影响；
 *   - §5.3 连发充能：每击碎 150 块砖自动奖励技能。
 *
 * 纯 TypeScript：禁止出现任何宿主环境 API。
 */

import {
  BASE_BALL_SPEED,
  BALL_RADIUS,
  MAX_PHYSICAL_BALLS,
  MULTI_LAUNCH_COUNT,
  MULTI_LAUNCH_FAN_ANGLES,
  MULTI_LAUNCH_SPACING,
  OVERLOAD_DAMAGE_MULTIPLIER,
  OVERLOAD_DAMAGE_MULTIPLIER_HIGH,
  OVERLOAD_DURATION_SEC,
  OVERLOAD_HIGH_RATIO,
  SKILL_CHARGE_EVERY_BRICKS,
  TRIPLE_SPLIT_SPREAD_DEG,
} from './constants.js';
import type { Ball, GameEvent, Paddle, SkillInventory } from './types.js';

/** 技能使用所需的上下文（由 `GameEngine` 提供）。 */
export interface SkillContext {
  readonly paddle: Paddle;
  readonly balls: readonly Ball[];
  /** 物理同屏球数上限。 */
  readonly maxBalls: number;
  /** 生成新球；池满时返回 null。 */
  spawnBall(x: number, y: number, vx: number, vy: number, radius?: number): Ball | null;
  /** 事件出口。 */
  emit(event: GameEvent): void;
}

/** 技能使用结果。 */
export interface SkillUseResult {
  /** 是否成功使用（库存不足时为 false）。 */
  used: boolean;
  /** 实际生成的球数。 */
  spawnedCount: number;
  /** 因球数上限而未能生成的球数（已转化为伤害倍率）。 */
  overflowCount: number;
  /** 本次触发的溢出伤害倍率（1 表示未触发）。 */
  overloadMultiplier: number;
}

export class SkillSystem {
  /** 技能库存。 */
  readonly inventory: SkillInventory;

  private overloadMultiplier = 1;
  private overloadTimerSec = 0;
  private bricksSinceCharge = 0;
  /** 充能奖励轮次（奇数给蓝标、偶数给橙标）。 */
  private chargeRound = 0;
  /** 活跃球快照缓冲（零 GC）。 */
  private readonly ballScratch: Ball[] = [];

  constructor(options?: { inventory?: Partial<SkillInventory> }) {
    this.inventory = {
      multiLaunchCount: options?.inventory?.multiLaunchCount ?? 0,
      tripleSplitCount: options?.inventory?.tripleSplitCount ?? 0,
    };
    for (let i = 0; i < MAX_PHYSICAL_BALLS; i++) {
      this.ballScratch.push({
        id: 0,
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        pierceCount: 0,
        bouncesSinceBrick: 0,
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* 状态查询                                                          */
  /* ---------------------------------------------------------------- */

  /** 当前生效的全局伤害倍率（普通状态为 1）。 */
  get damageMultiplier(): number {
    return this.overloadMultiplier;
  }

  /** 高能破甲是否生效中。 */
  get overloadActive(): boolean {
    return this.overloadMultiplier > 1 && this.overloadTimerSec > 0;
  }

  /** 高能破甲剩余秒数。 */
  get overloadRemainingSec(): number {
    return this.overloadTimerSec;
  }

  /** 距下一次技能充能还需击碎多少块砖。 */
  get bricksToNextCharge(): number {
    return Math.max(0, SKILL_CHARGE_EVERY_BRICKS - this.bricksSinceCharge);
  }

  /* ---------------------------------------------------------------- */
  /* 帧更新与充能                                                      */
  /* ---------------------------------------------------------------- */

  /** 推进高能破甲倒计时（由 `GameEngine.step` 调用）。 */
  update(dt: number): void {
    if (this.overloadTimerSec <= 0) return;
    this.overloadTimerSec -= dt;
    if (this.overloadTimerSec <= 0) {
      this.overloadTimerSec = 0;
      this.overloadMultiplier = 1;
    }
  }

  /**
   * 砖块被击碎时通知技能系统（§5.3 连发充能）。
   * 每满 `SKILL_CHARGE_EVERY_BRICKS` 块自动奖励 +1 蓝标或 +1 橙标。
   */
  notifyBrickDestroyed(count = 1, emit?: (event: GameEvent) => void): void {
    if (count <= 0) return;
    this.bricksSinceCharge += count;
    while (this.bricksSinceCharge >= SKILL_CHARGE_EVERY_BRICKS) {
      this.bricksSinceCharge -= SKILL_CHARGE_EVERY_BRICKS;
      this.chargeRound++;
      if (this.chargeRound % 2 === 1) {
        this.inventory.multiLaunchCount++;
        emit?.({ type: 'SKILL_GRANTED', skill: 'MULTI_LAUNCH', total: this.inventory.multiLaunchCount });
      } else {
        this.inventory.tripleSplitCount++;
        emit?.({ type: 'SKILL_GRANTED', skill: 'TRIPLE_SPLIT', total: this.inventory.tripleSplitCount });
      }
    }
  }

  /** 重置（重开关卡）。 */
  reset(inventory?: Partial<SkillInventory>): void {
    this.overloadMultiplier = 1;
    this.overloadTimerSec = 0;
    this.bricksSinceCharge = 0;
    this.chargeRound = 0;
    if (inventory) {
      this.inventory.multiLaunchCount = inventory.multiLaunchCount ?? 0;
      this.inventory.tripleSplitCount = inventory.tripleSplitCount ?? 0;
    }
  }

  /* ---------------------------------------------------------------- */
  /* §5.1 蓝标：MULTI_LAUNCH                                          */
  /* ---------------------------------------------------------------- */

  /**
   * 蓝标连发：在挡板当前位置上方以微扇形角度发射一批新球。
   *
   * 库存消耗规则：`multiLaunchCount` 变为 `multiLaunchCount - 1`（即消耗 1 个）。
   */
  useMultiLaunch(ctx: SkillContext): SkillUseResult {
    if (this.inventory.multiLaunchCount <= 0) {
      return { used: false, spawnedCount: 0, overflowCount: 0, overloadMultiplier: 1 };
    }
    this.inventory.multiLaunchCount--;

    const paddle = ctx.paddle;
    const radius = BALL_RADIUS;
    const originY = paddle.y - paddle.height * 0.5 - radius;
    const count = Math.min(MULTI_LAUNCH_COUNT, MULTI_LAUNCH_FAN_ANGLES.length);
    const half = (count - 1) * 0.5;

    let spawned = 0;
    let overflow = 0;
    for (let i = 0; i < count; i++) {
      const angleDeg = MULTI_LAUNCH_FAN_ANGLES[i] ?? 0;
      const rad = (angleDeg * Math.PI) / 180;
      const vx = BASE_BALL_SPEED * Math.sin(rad);
      const vy = -BASE_BALL_SPEED * Math.cos(rad);
      const x = paddle.x + (i - half) * MULTI_LAUNCH_SPACING;
      const ball = ctx.spawnBall(x, originY, vx, vy, radius);
      if (ball) spawned++;
      else overflow++;
    }

    if (overflow > 0) {
      this.raiseOverload(overflow, ctx.maxBalls, ctx.emit);
    }

    ctx.emit({ type: 'SKILL_USED', skill: 'MULTI_LAUNCH', spawnedCount: spawned });
    return {
      used: true,
      spawnedCount: spawned,
      overflowCount: overflow,
      overloadMultiplier: this.overloadMultiplier,
    };
  }

  /* ---------------------------------------------------------------- */
  /* §5.2 橙标：TRIPLE_SPLIT                                           */
  /* ---------------------------------------------------------------- */

  /**
   * 橙标全场裂变：每颗球在原地额外分裂出 2 颗（总计 1 变 3），偏转 ±22°。
   *
   * Ball Cap & Overflow Damage：
   *   物理层球池固定容量 200，超出部分不再生成球体，
   *   而是动态转化为 `damageMultiplier`（高能破甲 ×2 / ×3，持续 8 秒）。
   */
  useTripleSplit(ctx: SkillContext): SkillUseResult {
    if (this.inventory.tripleSplitCount <= 0) {
      return { used: false, spawnedCount: 0, overflowCount: 0, overloadMultiplier: 1 };
    }
    this.inventory.tripleSplitCount--;

    // 快照活跃球（分裂产生的新球不参与本次分裂，避免无限递归）。
    const scratch = this.ballScratch;
    scratch.length = 0;
    const pool = ctx.balls;
    for (let i = 0; i < pool.length; i++) {
      const ball = pool[i];
      if (ball && ball.active) scratch.push(ball);
    }

    let spawned = 0;
    let overflow = 0;
    const spreadRad = (TRIPLE_SPLIT_SPREAD_DEG * Math.PI) / 180;
    const cos = Math.cos(spreadRad);
    const sin = Math.sin(spreadRad);

    for (let i = 0; i < scratch.length; i++) {
      const source = scratch[i]!;
      if (!source.active) continue;
      for (let s = 0; s < 2; s++) {
        const sign = s === 0 ? -1 : 1;
        const vx = source.vx * cos - source.vy * sin * sign;
        const vy = source.vx * sin * sign + source.vy * cos;
        const ball = ctx.spawnBall(source.x, source.y, vx, vy, source.radius);
        if (ball) spawned++;
        else overflow++;
      }
    }

    if (overflow > 0) {
      this.raiseOverload(overflow, ctx.maxBalls, ctx.emit);
    }

    ctx.emit({ type: 'SKILL_USED', skill: 'TRIPLE_SPLIT', spawnedCount: spawned });
    return {
      used: true,
      spawnedCount: spawned,
      overflowCount: overflow,
      overloadMultiplier: this.overloadMultiplier,
    };
  }

  /* ---------------------------------------------------------------- */
  /* 溢出伤害倍率转化                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * 把超出的球数转化为伤害倍率。
   *
   * 规则：溢出量 > 0 → ×2；溢出量超过球池容量的 `OVERLOAD_HIGH_RATIO` → ×3。
   * 倍率持续 `OVERLOAD_DURATION_SEC`（8 秒）后自动回落。
   */
  private raiseOverload(overflowCount: number, maxBalls: number, emit?: (event: GameEvent) => void): void {
    const capacity = Math.max(1, maxBalls);
    const multiplier =
      overflowCount > capacity * OVERLOAD_HIGH_RATIO
        ? OVERLOAD_DAMAGE_MULTIPLIER_HIGH
        : OVERLOAD_DAMAGE_MULTIPLIER;
    this.overloadMultiplier = Math.max(this.overloadMultiplier, multiplier);
    this.overloadTimerSec = OVERLOAD_DURATION_SEC;
    emit?.({
      type: 'DAMAGE_OVERLOAD',
      multiplier: this.overloadMultiplier,
      expiresInSec: OVERLOAD_DURATION_SEC,
    });
  }
}
