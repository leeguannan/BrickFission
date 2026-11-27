/**
 * 《碎砖大裂变》(Brick Fission) — 机器人决策（纯逻辑，零宿主依赖）
 *
 * 该模块把「怎么打」的知识从脚本里抽出来，供两处复用：
 *   - `scripts/test-levels-playthrough.ts`：20 关无头通关回归；
 *   - `src/app/e2eProbe.ts`：E2E 造局时挑选「首发直线可命中」的幸存砖。
 *
 * 纯 TypeScript，不触碰 DOM / Canvas / 音频，也不修改 `src/game/core/`。
 */
import {
  BALL_RADIUS,
  DEATH_LINE_Y,
  WALL_LEFT,
  WALL_RIGHT,
  WALL_TOP,
} from '../core/constants.js';
import type { BrickGrid } from '../core/BrickGrid.js';
import type { Ball } from '../core/types.js';

/** 目标砖（逻辑坐标中心）。 */
/** 目标选取策略：'widest' 优先选偏离垂直轴最远的目标，'nearest' 优先选最近目标。 */
export type TargetStrategy = 'widest' | 'nearest';

/**
 * 机器人目标策略全集。
 *
 * 实测（20 关 × 240s 虚拟时长）没有任何单一策略能通吃全部关卡：
 * `deep` 通 {01,02,03,05,19,20}、`dense` 通 {01,02,04,05,07,18}、
 * `breach` 通 {01,02,03,07,11,18,19}、`gap` 通 {01,03,04,18}、
 * `slanted` 通 {01,03,05,12,18}、`onsight` 通 {01,02,04,18}。
 * 差异来自关卡结构（实心阵 / 随机通道阵 / 悬空图案），因此每关的推荐
 * 策略由离线标定写入 `src/game/levels/builtinLevelStrategies.ts`。
 */
export type BotStrategy =
  | 'widest'
  | 'dense'
  | 'gap'
  | 'breach'
  | 'deep'
  | 'onsight'
  | 'slanted'
  | 'reflect'
  | 'auto'
  | 'dense_gap';

export interface TargetBrick {
  col: number;
  row: number;
  x: number;
  y: number;
  /** 剩余血量（残局逐砖清理时优先打 1 血砖）。 */
  hp?: number;
}

/** 缝隙瞄准的角点外扩量（px）：球心落在砖角外侧这么远仍算命中。 */
const CORNER_AIM_OFFSET = 2.5;
/** 密集区目标的邻域半径（格）。 */
const DENSITY_RADIUS = 2;
/** 破口目标的前瞻格数：沿「挡板→洞」方向再往前看多少格统计实心砖。 */
const BREACH_LOOKAHEAD_CELLS = 5;

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
  // 球在落到挡板前可能先撞到左右侧墙，撞墙后水平速度反向 —— 线性外推
  // 会把落点算偏，挡板就跑到错误的位置接不到球（实测是漏球的主因）。
  // 这里按固定步长做一次「只算墙、不算砖」的飞行模拟，得到真实落点。
  const stepSec = 1 / 120;
  let x = ball.x;
  let y = ball.y;
  let vx = ball.vx;
  const vy = ball.vy;
  const leftLimit = WALL_LEFT + ball.radius;
  const rightLimit = WALL_RIGHT - ball.radius;
  for (let i = 0; i < 600; i += 1) {
    const nextY = y + vy * stepSec;
    if (nextY >= paddleTop - ball.radius) {
      const t = (paddleTop - ball.radius - y) / (vy || 1);
      return x + vx * t;
    }
    x += vx * stepSec;
    y = nextY;
    if (x < leftLimit) {
      x = leftLimit;
      vx = Math.abs(vx);
    } else if (x > rightLimit) {
      x = rightLimit;
      vx = -Math.abs(vx);
    }
  }
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
  /**
   * 每球独立目标（与 `balls` 下标一一对应；`null` 项回退到统一 `target`）。
   *
   * 多球群专用：让每颗球去撞各自区域的砖，球群覆盖面成倍扩大，
   * 而不是全部抢同一块砖（否则多球只是重复同一发）。
   */
  targetsByBall?: Array<TargetBrick | null>;
  /**
   * 低空球兜底阈值（秒）：到达挡板的时间小于该值的球视为「必须兜住」。
   *
   * 球多时挡板一次只能覆盖 1~2 颗球，「接住几颗」几乎无法区分候选，
   * 真正决定生死的是**别漏掉马上要落地的那颗**（漏一颗即可能全场阵亡）。
   */
  urgencySec?: number;
  /**
   * 最多接住几颗球（默认不限）。
   *
   * 残局用：球群越少，单球出射角越准（实测单球 P90 误差 0.25°，12 球时 29°）。
   * 把上限压到 1，接球 AI 就会「只兜住最紧急的那颗、其余放过」，
   * 多余球漏出底线后球群自然收缩到 1~2 颗，精度随之回来。
   */
  maxCatches?: number;
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
  const urgencySec = params.urgencySec ?? 0.6;
  /** 最多接住几颗球（残局用 1，把球群压回单球精度）。 */
  const maxCatches = params.maxCatches ?? Number.POSITIVE_INFINITY;
  /** 兜住低空球的额外权重（以「多接住一颗球」为 1 个单位）。 */
  const urgencyBonus = 2;
  const targetsByBall = params.targetsByBall;

  interface Arrival {
    t: number;
    contactX: number;
    /** 在 `balls` 中的下标，用于取每球独立目标。 */
    ballIndex: number;
  }
  const arrivals: Arrival[] = [];
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i]!;
    if (!ball.active || ball.vy <= 0) continue;
    const gap = paddleTop - ball.y - ball.radius;
    const t = gap > 0 ? gap / ball.vy : 0;
    arrivals.push({ t, contactX: predictContactX(ball, paddleTop), ballIndex: i });
  }
  if (arrivals.length === 0) return paddleX;
  arrivals.sort((a, b) => a.t - b.t);

  const candidates: Array<{ x: number; aimed: boolean }> = [];
  for (const arrival of arrivals) {
    candidates.push({ x: arrival.contactX, aimed: false });
    const ballTarget = targetsByBall?.[arrival.ballIndex] ?? target;
    if (ballTarget) {
      const desiredDeg =
        (Math.atan2(ballTarget.x - arrival.contactX, paddleTop - ballTarget.y) * 180) / Math.PI;
      const clamped = Math.max(-maxDeflectDeg, Math.min(maxDeflectDeg, desiredDeg));
      candidates.push({
        x: arrival.contactX - (clamped / maxDeflectDeg) * halfWidth,
        aimed: true,
      });
    }
  }

  let bestX = paddleX;
  let bestScore = -Infinity;
  /** 兜不住任何低空球时的退路（全体候选里的最优解）。 */
  let fallbackX = paddleX;
  let fallbackScore = -Infinity;
  for (const candidate of candidates) {
    let catches = 0;
    let urgentCaught = false;
    let urgentMissed = false;
    for (const arrival of arrivals) {
      const reachable = Math.abs(candidate.x - paddleX) <= followSpeed * arrival.t;
      const covered = Math.abs(arrival.contactX - candidate.x) <= halfWidth;
      if (reachable && covered) {
        if (catches < maxCatches) catches++;
        if (arrival.t <= urgencySec) urgentCaught = true;
      } else if (arrival.t <= urgencySec) {
        urgentMissed = true;
      }
    }
    let score = catches + (candidate.aimed ? aimWeight : 0);
    if (urgentCaught) score += urgencyBonus;
    else if (urgentMissed) score -= urgencyBonus;
    if (score > fallbackScore) {
      fallbackScore = score;
      fallbackX = candidate.x;
    }
    // **低空球兜底是硬约束**：只要存在能兜住低空球的候选，就只在这些候选里
    // 择优，绝不因为「更瞄准」而放弃马上要落地的球。
    // 之前只是加了个权重（+2），瞄准权重一旦变大（残局用 3）就会压过它 ——
    // 实测挡板会直奔远处的目标，把 0.1s 后落地的球放过去漏掉。
    if (urgentCaught && score > bestScore) {
      bestScore = score;
      bestX = candidate.x;
    }
  }
  return bestScore > -Infinity ? bestX : fallbackX;
}

/**
 * 视线扫描的一个采样点：返回该点**球心所在格及其相邻格**里遇到的
 * 第一块非空格。
 *
 * 关键：物理碰撞用的是「圆 vs AABB」（半径 BALL_RADIUS），而不是「球心是否在格内」。
 * 若扫描只用球心取格，会漏掉擦边碰撞——射线明明会蹭到某块砖，
 * 扫描却认为「视线畅通」，于是选出一个物理上打不中的目标（实测偏移一格）。
 * 这里按圆的外接盒扫 3×3 格，与物理判定保持一致。
 */
function scanBrickAlongRay(
  grid: BrickGrid,
  x: number,
  y: number,
  ignoreSteelNear?: { col: number; row: number },
): { col: number; row: number; role: 'NORMAL' | 'STEEL' } | null {
  const colMin = grid.colAt(x - BALL_RADIUS);
  const colMax = grid.colAt(x + BALL_RADIUS);
  const rowMin = grid.rowAt(y - BALL_RADIUS);
  const rowMax = grid.rowAt(y + BALL_RADIUS);
  let hit: { col: number; row: number; role: 'NORMAL' | 'STEEL' } | null = null;
  for (let row = rowMin; row <= rowMax; row += 1) {
    for (let col = colMin; col <= colMax; col += 1) {
      const cell = grid.at(col, row);
      if (!cell || cell.role === 'EMPTY') continue;
      if (cell.role === 'STEEL') {
        // 「只露一角」的残砖：球必须贴着目标砖旁边的钢墙擦进去，
        // 所以目标砖 8 邻域内的钢墙不算挡路。
        if (
          !ignoreSteelNear ||
          Math.abs(col - ignoreSteelNear.col) > 1 ||
          Math.abs(row - ignoreSteelNear.row) > 1
        ) {
          return { col, row, role: 'STEEL' };
        }
        continue;
      }
      if (!hit) hit = { col, row, role: 'NORMAL' };
    }
  }
  return hit;
}

/** 砖中心坐标。 */
function brickCenter(grid: BrickGrid, col: number, row: number): { x: number; y: number } | null {
  const rect = grid.cellRect(col, row);
  if (!rect) return null;
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * 视线第一块砖（近优先）。
 *
 * 沿「挡板 → 上方」做一圈角度扫描（从垂直向两侧扩散），对每个角度取
 * **视线上的第一块可破坏砖**；取角度最小的那块作为目标。
 *
 * 与 `findDeepestTarget`（瞄最远处、靠剥洋葱推进）相反：这里优先保证
 * **这一趟必定命中**——远处砖的命中误差随距离放大（误差 δ 时横向偏差
 * ≈ 距离·sinδ），近砖更容易打中，命中率高才能持续破砖。
 */
export function findOnsightTarget(
  grid: BrickGrid,
  originX: number,
  originY: number,
  maxAngleDeg = 68,
): TargetBrick | null {
  const stepDeg = 0.5;
  const stepPx = 4;
  const maxDist = 1400;
  for (let absDeg = 0; absDeg <= maxAngleDeg; absDeg += stepDeg) {
    for (const deg of absDeg === 0 ? [0] : [absDeg, -absDeg]) {
      const rad = (deg * Math.PI) / 180;
      const dx = Math.sin(rad);
      const dy = -Math.cos(rad);
      let t = 0;
      while (t < maxDist) {
        t += stepPx;
        const x = originX + dx * t;
        const y = originY + dy * t;
        if (x < WALL_LEFT + BALL_RADIUS || x > WALL_RIGHT - BALL_RADIUS) break;
        if (y < WALL_TOP + BALL_RADIUS) break;
        const hit = scanBrickAlongRay(grid, x, y);
        if (!hit) continue;
        if (hit.role === 'STEEL') break;
        const center = brickCenter(grid, hit.col, hit.row);
        if (!center) break;
        return { col: hit.col, row: hit.row, x: center.x, y: center.y };
      }
    }
  }
  return null;
}

/**
 * 最深目标：沿每条视线假设砖会被击穿，取最远的那块（剥洋葱式推进）。
 */
export function findDeepestTarget(
  grid: BrickGrid,
  originX: number,
  originY: number,
  maxAngleDeg = 68,
): TargetBrick | null {
  const stepDeg = 0.5;
  const stepPx = 4;
  const maxDist = 1400;
  let best: { col: number; row: number; x: number; y: number; dist: number } | null = null;
  for (let deg = -maxAngleDeg; deg <= maxAngleDeg; deg += stepDeg) {
    const rad = (deg * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    let t = 0;
    let deepest: { col: number; row: number; x: number; y: number; dist: number } | null = null;
    while (t < maxDist) {
      t += stepPx;
      const x = originX + dx * t;
      const y = originY + dy * t;
      if (x < WALL_LEFT + BALL_RADIUS || x > WALL_RIGHT - BALL_RADIUS) break;
      if (y < WALL_TOP + BALL_RADIUS) break;
      const hit = scanBrickAlongRay(grid, x, y);
      if (!hit) continue;
      if (hit.role === 'STEEL') break;
      const center = brickCenter(grid, hit.col, hit.row);
      if (!center) break;
      deepest = { col: hit.col, row: hit.row, x: center.x, y: center.y, dist: t };
    }
    if (deepest && (!best || deepest.dist > best.dist)) best = deepest;
  }
  if (!best) return null;
  return { col: best.col, row: best.row, x: best.x, y: best.y };
}

/**
 * 斜飞目标：在「视线可见」的砖里挑夹角最大（最陡）的一块。
 *
 * 垂直上打的球只会碎掉正下方那一块就落回来；斜着打能让球钻进砖阵内部，
 * 一次飞行连续撞碎多块，是提升破砖速率的关键。
 */
export function findSlantedTarget(
  grid: BrickGrid,
  originX: number,
  originY: number,
  maxAngleDeg = 68,
): TargetBrick | null {
  const stepDeg = 0.5;
  const stepPx = 4;
  const maxDist = 1400;
  for (let absDeg = maxAngleDeg; absDeg >= 0; absDeg -= stepDeg) {
    for (const deg of absDeg === 0 ? [0] : [absDeg, -absDeg]) {
      const rad = (deg * Math.PI) / 180;
      const dx = Math.sin(rad);
      const dy = -Math.cos(rad);
      let t = 0;
      while (t < maxDist) {
        t += stepPx;
        const x = originX + dx * t;
        const y = originY + dy * t;
        if (x < WALL_LEFT + BALL_RADIUS || x > WALL_RIGHT - BALL_RADIUS) break;
        if (y < WALL_TOP + BALL_RADIUS) break;
        const hit = scanBrickAlongRay(grid, x, y);
        if (!hit) continue;
        if (hit.role === 'STEEL') break;
        const center = brickCenter(grid, hit.col, hit.row);
        if (!center) break;
        return { col: hit.col, row: hit.row, x: center.x, y: center.y };
      }
    }
  }
  return null;
}

/**
 * 缝隙瞄准：找出「只能从角部擦到」的剩余砖。
 *
 * 残局里最后那几块砖常被钢墙包死，砖中心永远打不到，
 * 但砖角往往露出一条缝——球心飞到角点外侧 `CORNER_AIM_OFFSET` 即算命中。
 * 返回的 `x`/`y` 是**角点外侧的瞄准点**（不是砖中心）。
 */
export function findGapTarget(
  grid: BrickGrid,
  originX: number,
  originY: number,
  maxAngleDeg = 68,
): TargetBrick | null {
  interface GapCandidate {
    col: number;
    row: number;
    x: number;
    y: number;
    angleDeg: number;
    distSq: number;
  }
  const candidates: GapCandidate[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const cell = grid.at(col, row);
      if (!cell || cell.role === 'EMPTY' || cell.role === 'STEEL') continue;
      const rect = grid.cellRect(col, row);
      if (!rect) continue;
      const left = rect.x - CORNER_AIM_OFFSET;
      const right = rect.x + rect.width + CORNER_AIM_OFFSET;
      const top = rect.y - CORNER_AIM_OFFSET;
      const bottom = rect.y + rect.height + CORNER_AIM_OFFSET;
      const corners: Array<[number, number]> = [
        [left, top],
        [right, top],
        [left, bottom],
        [right, bottom],
      ];
      for (const [ax, ay] of corners) {
        const angleDeg = (Math.atan2(ax - originX, originY - ay) * 180) / Math.PI;
        if (Math.abs(angleDeg) > maxAngleDeg) continue;
        candidates.push({
          col,
          row,
          x: ax,
          y: ay,
          angleDeg,
          distSq: (ax - originX) ** 2 + (ay - originY) ** 2,
        });
      }
    }
  }
  if (candidates.length === 0) return null;

  // 垂直优先（命中精度最高），其次夹角最大（能擦到墙），最后距离近。
  candidates.sort((a, b) => {
    const verticalA = Math.abs(a.angleDeg);
    const verticalB = Math.abs(b.angleDeg);
    if (Math.abs(verticalA - verticalB) > 6) return verticalA - verticalB;
    const wideA = Math.abs(a.angleDeg);
    const wideB = Math.abs(b.angleDeg);
    if (Math.abs(wideA - wideB) > 1) return wideB - wideA;
    return a.distSq - b.distSq;
  });

  for (const candidate of candidates) {
    if (gapReachable(grid, originX, originY, candidate)) {
      return { col: candidate.col, row: candidate.row, x: candidate.x, y: candidate.y };
    }
  }
  return null;
}

/**
 * 指定某块砖的最佳「角外侧瞄准点」。
 *
 * 残局清场时需要**按砖**挑选目标：直线够不到的残砖通常只露一角，
 * 瞄准点必须落在砖的角外侧（`CORNER_AIM_OFFSET`），否则球会被旁边的
 * 钢墙先撞开。返回 null 表示这块砖当前连角点都够不到。
 */
export function gapAimPointFor(
  grid: BrickGrid,
  brick: TargetBrick,
  originX: number,
  originY: number,
  maxAngleDeg = 68,
): { x: number; y: number } | null {
  const rect = grid.cellRect(brick.col, brick.row);
  if (!rect) return null;
  const corners: Array<[number, number]> = [
    [rect.x - CORNER_AIM_OFFSET, rect.y - CORNER_AIM_OFFSET],
    [rect.x + rect.width + CORNER_AIM_OFFSET, rect.y - CORNER_AIM_OFFSET],
    [rect.x - CORNER_AIM_OFFSET, rect.y + rect.height + CORNER_AIM_OFFSET],
    [rect.x + rect.width + CORNER_AIM_OFFSET, rect.y + rect.height + CORNER_AIM_OFFSET],
  ];
  const scored = corners
    .map(([ax, ay]) => {
      const angleDeg = (Math.atan2(ax - originX, originY - ay) * 180) / Math.PI;
      return { ax, ay, angleDeg };
    })
    .filter((c) => Math.abs(c.angleDeg) <= maxAngleDeg)
    // 垂直优先（命中精度最高），其次夹角最大（能擦到墙）。
    .sort((a, b) => {
      const verticalA = Math.abs(a.angleDeg);
      const verticalB = Math.abs(b.angleDeg);
      if (Math.abs(verticalA - verticalB) > 6) return verticalA - verticalB;
      return Math.abs(b.angleDeg) - Math.abs(a.angleDeg);
    });
  for (const candidate of scored) {
    if (gapReachable(grid, originX, originY, { x: candidate.ax, y: candidate.ay, col: brick.col, row: brick.row })) {
      return { x: candidate.ax, y: candidate.ay };
    }
  }
  return null;
}

/**
 * 缝隙候选的可达性：沿 origin → 角点的射线步进，
 * 途中遇到「目标砖邻域之外的实体」才算挡路。
 *
 * 不能用 `hasClearCorridor`：那块残砖正是被钢墙包住才只露一角，
 * 直线走廊检测必然把它判成「不通」，于是残局瞄准永远选不到目标。
 */
function gapReachable(
  grid: BrickGrid,
  originX: number,
  originY: number,
  candidate: { col: number; row: number; x: number; y: number },
): boolean {
  const dx = candidate.x - originX;
  const dy = candidate.y - originY;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return true;
  const stepPx = 2;
  const steps = Math.ceil(dist / stepPx);
  for (let i = 1; i < steps; i += 1) {
    const t = (i / steps) * dist;
    const x = originX + (dx * t) / dist;
    const y = originY + (dy * t) / dist;
    if (x < WALL_LEFT + BALL_RADIUS || x > WALL_RIGHT - BALL_RADIUS) return false;
    if (y < WALL_TOP + BALL_RADIUS) return false;
    const hit = scanBrickAlongRay(grid, x, y, { col: candidate.col, row: candidate.row });
    if (!hit) continue;
    // 撞到目标砖本身 = 已经飞到了砖角（擦边命中），路径成立。
    if (hit.col === candidate.col && hit.row === candidate.row) return true;
    if (hit.role === 'NORMAL') return false;
  }
  return true;
}

/** 邻域内剩余可破坏砖数量。 */
function neighborhoodDensity(grid: BrickGrid, col: number, row: number): number {
  let count = 0;
  for (let dr = -DENSITY_RADIUS; dr <= DENSITY_RADIUS; dr += 1) {
    for (let dc = -DENSITY_RADIUS; dc <= DENSITY_RADIUS; dc += 1) {
      const cell = grid.at(col + dc, row + dr);
      if (cell && cell.role !== 'EMPTY' && cell.role !== 'STEEL') count += 1;
    }
  }
  return count;
}

/**
 * 密集区目标：挑选「周围一圈都是砖」的落点。
 *
 * 破砖速率的瓶颈不是球速，而是**一次飞行能连撞几块砖**：
 * 球进入砖阵内部后每撞一次就法向反弹，可连续打碎多块；
 * 而只打边缘砖的球一趟只碎 1 块就飞回挡板。
 */
export function findDenseTarget(
  grid: BrickGrid,
  originX: number,
  originY: number,
  maxAngleDeg = 68,
): TargetBrick | null {
  interface DenseCandidate {
    col: number;
    row: number;
    x: number;
    y: number;
    density: number;
    angleDeg: number;
    distSq: number;
  }
  const candidates: DenseCandidate[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const cell = grid.at(col, row);
      if (!cell || cell.role === 'EMPTY' || cell.role === 'STEEL') continue;
      const center = brickCenter(grid, col, row);
      if (!center) continue;
      const angleDeg = (Math.atan2(center.x - originX, originY - center.y) * 180) / Math.PI;
      if (Math.abs(angleDeg) > maxAngleDeg) continue;
      candidates.push({
        col,
        row,
        x: center.x,
        y: center.y,
        density: neighborhoodDensity(grid, col, row),
        angleDeg,
        distSq: (center.x - originX) ** 2 + (center.y - originY) ** 2,
      });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (b.density !== a.density) return b.density - a.density;
    return a.distSq - b.distSq;
  });
  for (const candidate of candidates) {
    if (
      hasClearCorridor(grid, originX, originY, candidate.x, candidate.y, candidate.col, candidate.row)
    ) {
      return { col: candidate.col, row: candidate.row, x: candidate.x, y: candidate.y };
    }
  }
  return null;
}

/**
 * 破口目标：瞄准「已经被打穿的洞」，让球钻进砖阵内部。
 *
 * 砖阵外部的砖容易打，但打碎后球就被弹回来；真正高效的是让球从洞里
 * 钻进去，在砖阵内部连续撞碎多块。
 */
export function findBreachTarget(
  grid: BrickGrid,
  originX: number,
  originY: number,
  maxAngleDeg = 68,
): TargetBrick | null {
  interface BreachCandidate {
    col: number;
    row: number;
    x: number;
    y: number;
    solidAhead: number;
    distSq: number;
  }
  const candidates: BreachCandidate[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const cell = grid.at(col, row);
      if (!cell || cell.role !== 'EMPTY') continue;
      const center = brickCenter(grid, col, row);
      if (!center) continue;
      const angleDeg = (Math.atan2(center.x - originX, originY - center.y) * 180) / Math.PI;
      if (Math.abs(angleDeg) > maxAngleDeg) continue;
      // 沿「挡板 → 洞」的方向继续前瞻若干格，统计前方还有多少实心砖。
      const dx = center.x - originX;
      const dy = center.y - originY;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;
      const ux = dx / len;
      const uy = dy / len;
      let solidAhead = 0;
      for (let step = 1; step <= BREACH_LOOKAHEAD_CELLS; step += 1) {
        const aheadX = center.x + ux * step * 16;
        const aheadY = center.y + uy * step * 16;
        const aheadCell = grid.at(grid.colAt(aheadX), grid.rowAt(aheadY));
        if (aheadCell && aheadCell.role !== 'EMPTY' && aheadCell.role !== 'STEEL') solidAhead += 1;
      }
      if (solidAhead <= 0) continue;
      candidates.push({
        col,
        row,
        x: center.x,
        y: center.y,
        solidAhead,
        distSq: len * len,
      });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (b.solidAhead !== a.solidAhead) return b.solidAhead - a.solidAhead;
    return a.distSq - b.distSq;
  });
  for (const candidate of candidates) {
    if (
      hasClearCorridor(grid, originX, originY, candidate.x, candidate.y, candidate.col, candidate.row)
    ) {
      return { col: candidate.col, row: candidate.row, x: candidate.x, y: candidate.y };
    }
  }
  return null;
}

/**
 * 收集全部「从给定原点可直线命中」的砖，按夹角从负到正排序。
 *
 * 供多球分工使用：把返回的清单按夹角分区分配给不同球，
 * 球群就能同时覆盖左右两侧的不同区域，而不是全部挤在同一块砖上。
 */
export function collectReachableTargets(
  grid: BrickGrid,
  originX: number,
  originY: number,
  maxAngleDeg = 68,
): TargetBrick[] {
  interface Candidate {
    col: number;
    row: number;
    x: number;
    y: number;
    angleDeg: number;
    distSq: number;
  }
  const candidates: Candidate[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const cell = grid.at(col, row);
      if (!cell || cell.role === 'EMPTY' || cell.role === 'STEEL') continue;
      const center = brickCenter(grid, col, row);
      if (!center) continue;
      const angleDeg = (Math.atan2(center.x - originX, originY - center.y) * 180) / Math.PI;
      if (Math.abs(angleDeg) > maxAngleDeg) continue;
      candidates.push({
        col,
        row,
        x: center.x,
        y: center.y,
        angleDeg,
        distSq: (center.x - originX) ** 2 + (center.y - originY) ** 2,
      });
    }
  }
  candidates.sort((a, b) => a.angleDeg - b.angleDeg);
  const result: TargetBrick[] = [];
  for (const candidate of candidates) {
    if (
      hasClearCorridor(grid, originX, originY, candidate.x, candidate.y, candidate.col, candidate.row)
    ) {
      result.push({ col: candidate.col, row: candidate.row, x: candidate.x, y: candidate.y });
    }
  }
  return result;
}

/**
 * 列出全部**剩余**的可破坏砖（排除空位与钢墙）。
 *
 * 残局逐砖清理用：先把剩下的砖列出来，再按「血量少 → 距离近」的顺序逐块瞄准，
 * 避免所有球反复抢同一块砖而漏掉翼尖凹角里的最后几块。
 */
export function collectRemainingBricks(grid: BrickGrid): TargetBrick[] {
  const result: TargetBrick[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const cell = grid.at(col, row);
      if (!cell || cell.role === 'EMPTY' || cell.role === 'STEEL') continue;
      const center = brickCenter(grid, col, row);
      if (!center) continue;
      result.push({ col, row, x: center.x, y: center.y, hp: cell.hp });
    }
  }
  result.sort((a, b) => {
    const hpA = a.hp ?? 1;
    const hpB = b.hp ?? 1;
    if (hpA !== hpB) return hpA - hpB;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
  return result;
}

/**
 * 列出全部「从给定原点可直线命中」的剩余砖，按「血量少 → 距离近」排序。
 *
 * 与 {@link collectReachableTargets} 的区别：后者按夹角排序，供多球分区使用；
 * 这里按清理优先级排序，供残局逐块清场使用。
 */
export function collectReachableBricks(
  grid: BrickGrid,
  originX: number,
  originY: number,
  maxAngleDeg = 68,
): TargetBrick[] {
  const remaining = collectRemainingBricks(grid);
  const result: TargetBrick[] = [];
  for (const brick of remaining) {
    const angleDeg = (Math.atan2(brick.x - originX, originY - brick.y) * 180) / Math.PI;
    if (Math.abs(angleDeg) > maxAngleDeg) continue;
    if (!hasClearCorridor(grid, originX, originY, brick.x, brick.y, brick.col, brick.row)) continue;
    result.push(brick);
  }
  result.sort((a, b) => {
    const hpA = a.hp ?? 1;
    const hpB = b.hp ?? 1;
    if (hpA !== hpB) return hpA - hpB;
    const distA = (a.x - originX) ** 2 + (a.y - originY) ** 2;
    const distB = (b.x - originX) ** 2 + (b.y - originY) ** 2;
    return distA - distB;
  });
  return result;
}

/**
 * 反射目标：用镜像展开法求「一次墙面反射」后能命中的砖。
 *
 * 直线打不到的残砖（被前方砖阵遮住）有时只要在侧墙或顶墙弹一次就能命中。
 */
export function findReflectTarget(
  grid: BrickGrid,
  originX: number,
  originY: number,
  maxAngleDeg = 68,
): TargetBrick | null {
  interface ReflectCandidate {
    col: number;
    row: number;
    x: number;
    y: number;
    angleDeg: number;
    distSq: number;
  }
  const direct = new Set(
    collectReachableTargets(grid, originX, originY, maxAngleDeg).map((t) => `${t.col},${t.row}`),
  );
  const walls: Array<{ axis: 'x' | 'y'; value: number; min: number; max: number }> = [
    { axis: 'x', value: WALL_LEFT + BALL_RADIUS, min: WALL_TOP + BALL_RADIUS, max: DEATH_LINE_Y - 40 },
    { axis: 'x', value: WALL_RIGHT - BALL_RADIUS, min: WALL_TOP + BALL_RADIUS, max: DEATH_LINE_Y - 40 },
    { axis: 'y', value: WALL_TOP + BALL_RADIUS, min: WALL_LEFT + BALL_RADIUS, max: WALL_RIGHT - BALL_RADIUS },
  ];
  const candidates: ReflectCandidate[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const cell = grid.at(col, row);
      if (!cell || cell.role === 'EMPTY' || cell.role === 'STEEL') continue;
      if (direct.has(`${col},${row}`)) continue;
      const center = brickCenter(grid, col, row);
      if (!center) continue;
      for (const wall of walls) {
        const mirrored =
          wall.axis === 'x'
            ? { x: 2 * wall.value - center.x, y: center.y }
            : { x: center.x, y: 2 * wall.value - center.y };
        const dx = mirrored.x - originX;
        const dy = mirrored.y - originY;
        if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) continue;
        const t =
          wall.axis === 'x'
            ? (wall.value - originX) / dx
            : (wall.value - originY) / dy;
        if (!(t > 0 && t < 1)) continue;
        const rx = originX + dx * t;
        const ry = originY + dy * t;
        if (wall.axis === 'x') {
          if (ry < wall.min || ry > wall.max) continue;
        } else if (rx < wall.min || rx > wall.max) continue;
        const angleDeg = (Math.atan2(rx - originX, originY - ry) * 180) / Math.PI;
        if (Math.abs(angleDeg) > maxAngleDeg) continue;
        if (
          !hasClearCorridor(grid, originX, originY, rx, ry, col, row) ||
          !hasClearCorridor(grid, rx, ry, center.x, center.y, col, row)
        ) {
          continue;
        }
        candidates.push({
          col,
          row,
          x: rx,
          y: ry,
          angleDeg,
          distSq: (rx - originX) ** 2 + (ry - originY) ** 2,
        });
      }
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const wideA = Math.abs(a.angleDeg);
    const wideB = Math.abs(b.angleDeg);
    if (Math.abs(wideA - wideB) > 4) return wideA - wideB;
    return a.distSq - b.distSq;
  });
  const best = candidates[0]!;
  return { col: best.col, row: best.row, x: best.x, y: best.y };
}
