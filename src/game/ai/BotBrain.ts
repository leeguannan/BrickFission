/**
 * 《碎砖大裂变》(Brick Fission) — 机器人决策（纯逻辑，零宿主依赖）
 *
 * 该模块把「怎么打」的知识从脚本里抽出来，供两处复用：
 *   - `scripts/test-levels-playthrough.ts`：20 关无头通关回归；
 *   - `src/app/e2eProbe.ts`：E2E 造局时挑选「首发直线可命中」的幸存砖。
 *
 * 纯 TypeScript，不触碰 DOM / Canvas / 音频，也不修改 `src/game/core/`。
 */
import { BALL_RADIUS } from '../core/constants.js';
import type { BrickGrid } from '../core/BrickGrid.js';
import type { Ball } from '../core/types.js';

/** 目标砖（逻辑坐标中心）。 */
/** 目标选取策略：'widest' 优先选偏离垂直轴最远的目标，'nearest' 优先选最近目标。 */
export type TargetStrategy = 'widest' | 'nearest';

export interface TargetBrick {
  col: number;
  row: number;
  x: number;
  y: number;
}

/** 走廊采样步长（px）。 */
const CORRIDOR_STEP_PX = 2;
/** 走廊侧向采样偏移（px）：0 与 ±(球半径 + 余量)。 */
const CORRIDOR_SIDE_OFFSETS = [0, 1, -1] as const;

/** 判断格子是否为「会挡路」的实体（钢墙与可破坏砖都挡路）。 */
function isSolid(role: string): boolean {
  return role !== 'EMPTY';
}

/**
 * 直线走廊检测：从 `(fromX, fromY)` 到 `(toX, toY)` 的线段上（按球半径做侧向余量）
 * 是否除目标砖所在格外全部为空。
 */
export function hasClearCorridor(
  grid: BrickGrid,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  targetCol: number,
  targetRow: number,
): boolean {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy);
  if (length < 1) return true;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const clearance = BALL_RADIUS + 0.5;
  for (let t = 0; t <= length; t += CORRIDOR_STEP_PX) {
    const cx = fromX + ux * t;
    const cy = fromY + uy * t;
    for (const side of CORRIDOR_SIDE_OFFSETS) {
      const sx = cx + px * side * clearance;
      const sy = cy + py * side * clearance;
      const col = grid.colAt(sx);
      const row = grid.rowAt(sy);
      if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) continue;
      if (col === targetCol && row === targetRow) continue;
      const cell = grid.at(col, row);
      if (cell && isSolid(cell.role)) return false;
    }
  }
  return true;
}

/**
 * 挑选「从给定原点可以直线命中」的目标砖。
 *
 * 判据：
 *   1. 砖块可破坏（排除空位与钢墙）；
 *   2. 方向角在 `maxAngleDeg` 内（挡板最大偏转 ±68°，留余量）；
 *   3. 存在无阻挡走廊（否则球只会撞在挡路的砖上）。
 *
 * 命中最近且走廊通畅的砖；都不满足时回退到角度内最近的砖（可能需要多打几次）。
 */
export function findReachableTarget(
  grid: BrickGrid,
  originX: number,
  originY: number,
  maxAngleDeg = 60,
  strategy: TargetStrategy = 'widest',
): TargetBrick | null {
  const candidates: Array<TargetBrick & { angleDeg: number; distSq: number }> = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.at(col, row);
      if (!cell || !isSolid(cell.role) || cell.role === 'STEEL') continue;
      const rect = grid.cellRect(col, row);
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      const angleDeg = (Math.atan2(x - originX, originY - y) * 180) / Math.PI;
      if (Math.abs(angleDeg) > maxAngleDeg) continue;
      candidates.push({ col, row, x, y, angleDeg, distSq: (x - originX) ** 2 + (y - originY) ** 2 });
    }
  }
  if (candidates.length === 0) return null;
  // 'widest'：优先选夹角最大的可破坏砖——球以更陡的偏转角飞出，
  // 更容易在飞行途中撞到通道壁，而不是沿空通道一路弹到顶墙。
  // 'nearest'：优先选最近的可达砖。
  candidates.sort((a, b) =>
    strategy === 'widest' ? Math.abs(b.angleDeg) - Math.abs(a.angleDeg) : a.distSq - b.distSq,
  );

  let fallback: TargetBrick | null = null;
  for (const candidate of candidates) {
    if (!fallback) fallback = { col: candidate.col, row: candidate.row, x: candidate.x, y: candidate.y };
    if (hasClearCorridor(grid, originX, originY, candidate.x, candidate.y, candidate.col, candidate.row)) {
      return { col: candidate.col, row: candidate.row, x: candidate.x, y: candidate.y };
    }
  }
  return fallback;
}

/**
 * 预测下落球在挡板顶面的落点 X。
 */
export function predictContactX(ball: Ball, paddleTop: number): number {
  const gap = paddleTop - ball.y - ball.radius;
  if (gap <= 0 || ball.vy <= 0) return ball.x;
  return ball.x + ball.vx * (gap / ball.vy);
}

/**
 * 反解挡板目标 X，使球以指定偏转角飞向目标砖。
 *
 * 物理模型（`PhysicsEngine.collidePaddle`）：出球方向只由接触偏移决定，
 * `θ = offset × PADDLE_MAX_DEFLECT_DEG`，因此
 * `paddleX = contactX - (θ / MAX) × halfWidth`。
 */
export function computePaddleTargetX(
  contactX: number,
  target: TargetBrick | null,
  paddleTop: number,
  halfWidth: number,
  maxDeflectDeg: number,
): number {
  if (!target) return contactX;
  const desiredDeg = (Math.atan2(target.x - contactX, paddleTop - target.y) * 180) / Math.PI;
  const clamped = Math.max(-maxDeflectDeg, Math.min(maxDeflectDeg, desiredDeg));
  return contactX - (clamped / maxDeflectDeg) * halfWidth;
}

/** 挡板决策参数。 */
export interface PaddleDecisionParams {
  /** 全部在场球（含静止与上升的球）。 */
  balls: Ball[];
  /** 挡板当前中心 X。 */
  paddleX: number;
  /** 挡板顶面 Y。 */
  paddleTop: number;
  /** 挡板半宽。 */
  halfWidth: number;
  /** 挡板跟随速度（px/s）。 */
  followSpeed: number;
  /** 当前目标砖（用于计算回球方向）。 */
  target: TargetBrick | null;
  /** 挡板最大偏转角（度）。 */
  maxDeflectDeg: number;
  /**
   * 「朝向目标砖」的权重（以「多接住一颗球」为 1 个单位）。
   * 权重越大越偏向瞄准，代价是可能漏掉个别下落球。
   */
  aimWeight?: number;
}

/**
 * 多球接球决策：在「尽可能多接住下落球」与「回球朝向目标砖」之间求平衡。
 *
 * 做法：
 *   1. 预测每颗下落球到达挡板顶面的时刻 `t` 与落点 `contactX`；
 *   2. 枚举候选挡板位置（每颗球的落点，以及「按目标方向偏转」后的落点）；
 *   3. 对每个候选位置统计在物理上**来得及赶到**且能覆盖到的球数；
 *   4. 取球数最多的候选；球数相同时优先「朝向目标砖」的候选。
 *
 * 这是接球能力的上限所在：球越多，击砖吞吐越高，但漏一颗就少一颗。
 */
export function choosePaddleTarget(params: PaddleDecisionParams): number {
  const { balls, paddleX, paddleTop, halfWidth, followSpeed, target, maxDeflectDeg } = params;
  const aimWeight = params.aimWeight ?? 1;

  interface Arrival {
    t: number;
    contactX: number;
  }
  const arrivals: Arrival[] = [];
  for (const ball of balls) {
    if (!ball.active || ball.vy <= 0) continue;
    const gap = paddleTop - ball.y - ball.radius;
    const t = gap > 0 ? gap / ball.vy : 0;
    arrivals.push({ t, contactX: predictContactX(ball, paddleTop) });
  }
  if (arrivals.length === 0) return paddleX;
  arrivals.sort((a, b) => a.t - b.t);

  const candidates: Array<{ x: number; aimed: boolean }> = [];
  for (const arrival of arrivals) {
    candidates.push({ x: arrival.contactX, aimed: false });
    if (target) {
      const desiredDeg =
        (Math.atan2(target.x - arrival.contactX, paddleTop - target.y) * 180) / Math.PI;
      const clamped = Math.max(-maxDeflectDeg, Math.min(maxDeflectDeg, desiredDeg));
      candidates.push({ x: arrival.contactX - (clamped / maxDeflectDeg) * halfWidth, aimed: true });
    }
  }

  let bestX = paddleX;
  let bestScore = -1;
  for (const candidate of candidates) {
    let catches = 0;
    for (const arrival of arrivals) {
      if (Math.abs(candidate.x - paddleX) > followSpeed * arrival.t) continue;
      if (Math.abs(arrival.contactX - candidate.x) > halfWidth) continue;
      catches++;
    }
    const score = catches + (candidate.aimed ? aimWeight : 0);
    if (score > bestScore) {
      bestScore = score;
      bestX = candidate.x;
    }
  }
  return bestX;
}
