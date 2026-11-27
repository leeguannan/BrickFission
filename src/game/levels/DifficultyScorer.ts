/**
 * 《碎砖大裂变》(Brick Fission) — 自动化难度打分引擎（Milestone 3，docs/03 §3）
 *
 * 评分 = 静态结构分析（满分 40）+ Headless 物理盲测（满分 60），并承担废关拦截：
 *   1. BFS/Flood Fill 8 邻域死区检测（仅 STEEL 阻断，可破坏砖可一路打通）；
 *   2. 默认发球线钢墙封死检测（M2 实测盲区，docs/03 §3.1 强制规则）；
 *   3. 血量密度 / STEEL 遮挡 / 底部入口宽度的静态拓扑分；
 *   4. 直接实例化 core GameEngine（与游戏共用同一套物理，禁止两套物理代码），
 *      8 个典型角度各跑 20 秒虚拟时间，挡板开自动追踪接球 AI，统计平均清砖率。
 *
 * 纯 TypeScript：计时使用 ES 内置 Date.now()，不引用任何宿主环境 API。
 */
import { FIXED_DT } from '../core/constants.js';
import { GameEngine } from '../core/GameEngine.js';
import type { BrickCell } from '../core/types.js';
import {
  decodeRLE,
  toRuntimeConfig,
  type DifficultyReport,
  type DifficultyTier,
  type LevelDefinition,
} from './LevelSchema.js';

/** 盲测典型开局角度（度，相对垂直向上）。 */
export const SIM_ANGLES: readonly number[] = [-60, -45, -30, -15, 15, 30, 45, 60];
/** 单轮盲测虚拟时长（秒）。 */
export const SIM_DURATION_SEC = 20;
/** 性能红线：单关 8 轮盲测总耗时目标（ms）。 */
export const SIM_BUDGET_MS = 150;
/**
 * 清砖率参考点（按本机物理标定，见 scripts 标定记录）：
 * 单球 20s 仅能击碎个位数~十几块，docs/03 字面的 0.45/0.12 在 42×38 规模下不可达；
 * 盲测改用「标准技能玩家」铺场协议后，实测清砖率带宽约 0.03（大迷宫）~0.30（稀疏小关），
 * 故将参考点标定到可达区间，保留「清砖率越高越简单」的规格语义。
 */
const EASY_RATE = 0.28;
const HARD_RATE = 0.05;
/** 蓝标连发铺场次数（首发 1 球 + 2×5 球 = 11 球）。 */
const SIM_MULTI_LAUNCH_USES = 2;
/** 橙标裂变触发帧（11 球 → 33 球，处于 200 球池安全区）。 */
const SIM_SPLIT_FRAME = 30;

/** 静态结构分析结果（不含物理盲测，Studio 实时提示可单独调用）。 */
export interface StructureAnalysis {
  breakableCount: number;
  steelCount: number;
  steelOcclusionRatio: number;
  /** 遮挡钢墙的靠下加权和（每个遮挡钢墙贡献 r/rows），用于静态遮挡分。 */
  weightedOcclusion: number;
  /** 死区或发球线封死是否存在（废关警告）。 */
  hasDeadZoneWarning: boolean;
  /** 死区中无法触及的可破坏砖数量。 */
  deadZoneBrickCount: number;
  /** 默认发球线是否被连续 STEEL 封死。 */
  launchLineBlocked: boolean;
  /** 底部中央引流通道在底 1/3 行带内的最窄可通过宽度（格）。 */
  entranceWidth: number;
  /** 总血量（含多血砖）。 */
  totalHp: number;
}

/** 评分明细（便于 Studio 仪表盘与单测断言）。 */
export interface ScoreBreakdown extends StructureAnalysis {
  staticScore: number;
  densityScore: number;
  occlusionScore: number;
  entranceScore: number;
  headlessScore: number;
  simBreakRate20s: number;
  perAngleBreakRates: readonly number[];
  simElapsedMs: number;
  withinSimBudget: boolean;
}

/** 完整评分输出：DifficultyReport + 明细。 */
export interface ScoreResult extends DifficultyReport {
  breakdown: ScoreBreakdown;
}

export interface ScorerOptions {
  angles?: readonly number[];
  simSeconds?: number;
  rngSeed?: number;
}

/* ------------------------------------------------------------------ */
/* 死区与发球线检测                                                      */
/* ------------------------------------------------------------------ */

/**
 * 可达性 BFS（单一事实源，analyzeStructure 与生成器净化共用）。
 *
 * BFS 语义（docs/03 §3.1）：
 *   - 起点为底边所有非 STEEL 格（挡板所在开放区）；
 *   - EMPTY 与 NORMAL 均可通行（NORMAL 视为可被一路打通，不阻断）；
 *   - 仅 STEEL 阻断；
 *   - **严格 4 邻域正交连通**：只允许上下左右移动，禁止对角斜穿。
 *     斜穿会把「对角两块 STEEL 夹出的 1 格缝」误判成通路，
 *     而小球直径 13px、格宽 16px，实测会卡在这种缝里垂直弹跳死循环；
 *     改成正交连通后，生成器的死区净化会把这类缝后面的砖正确判为不可达。
 *   - 返回 visited：1=从挡板开放区可达，0=死区。
 */
export function computeReachable(cells: readonly BrickCell[], cols: number, rows: number): Uint8Array {
  const visited = new Uint8Array(cols * rows);
  const queue: number[] = [];

  // 起点：底行全部非 STEEL 格。
  const bottomRow = rows - 1;
  for (let c = 0; c < cols; c++) {
    const idx = bottomRow * cols + c;
    if (cells[idx]!.role !== 'STEEL') {
      visited[idx] = 1;
      queue.push(idx);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++]!;
    const col = idx % cols;
    const row = (idx / cols) | 0;
    // 严格 4 邻域：只走上下左右。
    const offsets = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const;
    for (const [dc, dr] of offsets) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const nIdx = nr * cols + nc;
      if (visited[nIdx]) continue;
      if (cells[nIdx]!.role === 'STEEL') continue;
      visited[nIdx] = 1;
      queue.push(nIdx);
    }
  }
  return visited;
}

/**
 * 静态结构分析。
 */
export function analyzeStructure(cells: readonly BrickCell[], cols: number, rows: number): StructureAnalysis {
  const visited = computeReachable(cells, cols, rows);

  let breakableCount = 0;
  let steelCount = 0;
  let totalHp = 0;
  let deadZoneBrickCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r * cols + c]!;
      if (cell.role === 'STEEL') {
        steelCount++;
        continue;
      }
      if (cell.role === 'EMPTY') continue;
      breakableCount++;
      totalHp += cell.hp;
      if (!visited[r * cols + c]) deadZoneBrickCount++;
    }
  }

  // STEEL 遮挡：钢墙同列下方还压着可破坏砖即构成遮挡，越靠下方权重越高。
  let occluding = 0;
  let weightedOcclusion = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r * cols + c]!.role !== 'STEEL') continue;
      let shieldsBrick = false;
      for (let below = r + 1; below < rows; below++) {
        const belowRole = cells[below * cols + c]!.role;
        if (belowRole !== 'EMPTY' && belowRole !== 'STEEL') {
          shieldsBrick = true;
          break;
        }
      }
      if (shieldsBrick) {
        occluding++;
        weightedOcclusion += r / rows;
      }
    }
  }
  const steelOcclusionRatio = steelCount > 0 ? occluding / steelCount : 0;

  const launchLineBlocked = detectLaunchLineBlocked(cells, cols, rows);
  const entranceWidth = measureEntranceWidth(cells, cols, rows);

  const hasDeadZoneWarning = deadZoneBrickCount > 0 || launchLineBlocked;

  return {
    breakableCount,
    steelCount,
    steelOcclusionRatio,
    weightedOcclusion,
    hasDeadZoneWarning,
    deadZoneBrickCount,
    launchLineBlocked,
    entranceWidth,
    totalHp,
  };
}

/**
 * 默认发球线封死检测（docs/03 §3.1，M2 盲区兜底）：
 * 中央两列（球 AABB 跨越宽度）自底向上扫描，
 *   - 中途出现「两列同时为 STEEL」的一行 → 钢墙横跨发球通道；
 *     若该钢墙下方没有任何可破坏砖（球够不到任何目标），判封死；
 *     若下方已有可破坏砖（球至少打得到那几块），不算封死；
 *   - 只有第 0 行出现双 STEEL → 生成器自动外框的封顶，不算封死；
 *   - 通道本身是空位或可破坏砖 → 不算封死。
 */
export function detectLaunchLineBlocked(cells: readonly BrickCell[], cols: number, rows: number): boolean {
  const axisLeft = Math.floor(cols / 2) - 1;
  let breakableSeen = false;
  for (let r = rows - 1; r >= 0; r--) {
    const left = cells[r * cols + axisLeft]!;
    const right = cells[r * cols + axisLeft + 1]!;
    const leftSteel = left.role === 'STEEL';
    const rightSteel = right.role === 'STEEL';
    if (leftSteel && rightSteel) {
      if (r === 0) return false; // 顶部外框封顶
      return !breakableSeen; // 下方无砖可打 → 通道被封死
    }
    const leftBreakable = left.role !== 'EMPTY' && !leftSteel;
    const rightBreakable = right.role !== 'EMPTY' && !rightSteel;
    if (leftBreakable || rightBreakable) breakableSeen = true;
  }
  return false;
}

/** 底部 1/3 行带内，中央向左右连续无 STEEL 的最窄可通过列宽。 */
function measureEntranceWidth(cells: readonly BrickCell[], cols: number, rows: number): number {
  const bandTop = Math.floor(rows * (2 / 3));
  const centerCol = Math.floor(cols / 2);
  const columnClear = (col: number): boolean => {
    if (col < 0 || col >= cols) return false;
    for (let r = bandTop; r < rows; r++) {
      if (cells[r * cols + col]!.role === 'STEEL') return false;
    }
    return true;
  };
  let width = 0;
  for (let offset = 0; ; offset++) {
    const left = centerCol - offset;
    const right = centerCol + offset + 1;
    const okL = columnClear(left);
    const okR = columnClear(right);
    if (!okL && !okR) break;
    if (okL) width++;
    if (okR) width++;
  }
  return width;
}

/* ------------------------------------------------------------------ */
/* 静态拓扑分（满分 40）                                                 */
/* ------------------------------------------------------------------ */

function scoreStatic(analysis: StructureAnalysis, cols: number, rows: number): ScoreBreakdownPieces {
  const totalCells = cols * rows;
  // 血量密度：0.6 覆盖率即拿满 14 分。
  const density = analysis.totalHp / totalCells;
  const densityScore = clampNum(14 * (density / 0.6), 2, 14);

  // STEEL 遮挡：数量比 + 靠下加权各占一半，满分 14。
  const weightedRatio = analysis.steelCount > 0
    ? analysis.weightedOcclusion / analysis.steelCount
    : 0;
  const occlusionScore = clampNum(14 * (0.5 * analysis.steelOcclusionRatio + 0.5 * weightedRatio), 0, 14);

  // 入口宽度：2 格以内近乎硬闯（12 分），12 格以上畅通（2 分）。
  const narrowness = clampNum(1 - (analysis.entranceWidth - 2) / 10, 0, 1);
  const entranceScore = 2 + narrowness * 10;

  const staticScore = clampNum(densityScore + occlusionScore + entranceScore, 0, 40);
  return { staticScore, densityScore, occlusionScore, entranceScore };
}

/** 静态分三件套（内部传参用）。 */
interface ScoreBreakdownPieces {
  staticScore: number;
  densityScore: number;
  occlusionScore: number;
  entranceScore: number;
}

/* ------------------------------------------------------------------ */
/* Headless 蒙特卡洛物理盲测（满分 60，共用 GameEngine）                  */
/* ------------------------------------------------------------------ */

/**
 * 单角度盲测：发球后以 FIXED_DT 推进 simSeconds 秒虚拟时间，
 * 挡板 AI 追踪最靠下的下落球，返回清砖率（被击碎数 / 初始可破坏数）。
 */
function simulateOneAngle(
  def: LevelDefinition,
  angleDeg: number,
  simSeconds: number,
  rngSeed: number,
): number {
  const engine = new GameEngine({
    level: toRuntimeConfig(def),
    rng: mulberry32(rngSeed + Math.round((angleDeg + 90) * 1000)),
  });
  const totalBreakable = engine.grid.totalBreakable;
  if (totalBreakable <= 0) return 0;

  engine.setAimAngle(angleDeg);
  engine.releaseBall();
  // 标准技能玩家：两次蓝标连发铺场（11 球），模拟会用技能的真实玩家而非裸单球。
  for (let i = 0; i < SIM_MULTI_LAUNCH_USES; i++) engine.useMultiLaunch();

  const frameCount = Math.round(simSeconds / FIXED_DT);
  for (let frame = 0; frame < frameCount; frame++) {
    // 接球 AI：锁定 y 最大的下落活跃球，挡板目标跟随其 x。
    let targetX: number | null = null;
    let lowestY = Number.NEGATIVE_INFINITY;
    for (const ball of engine.physics.balls) {
      if (ball.active && ball.vy > 0 && ball.y > lowestY) {
        lowestY = ball.y;
        targetX = ball.x;
      }
    }
    if (targetX !== null) engine.setPaddleTargetX(targetX);
    // 第 30 帧一次橙标裂变（11 → 33 球），放大清砖效率差异。
    if (frame === SIM_SPLIT_FRAME) engine.useTripleSplit();
    engine.update(FIXED_DT);
    if (engine.currentPhase === 'WON' || engine.currentPhase === 'LOST') break;
  }

  const destroyed = totalBreakable - engine.grid.remainingBreakable;
  return clampNum(destroyed / totalBreakable, 0, 1);
}

/** 难度分档位（与 docs/03 §5 关卡分布对齐）。 */
export function tierForScore(totalScore: number): DifficultyTier {
  if (totalScore < 35) return 'EASY';
  if (totalScore < 56) return 'MEDIUM';
  if (totalScore < 80) return 'HARD';
  return 'EXPERT';
}

/**
 * 完整评分入口：静态分析 + 8 角度盲测，输出 0~100 综合分与废关警告。
 * 死区/发球线封死时分数照常计算，但 hasDeadZoneWarning=true 由调用方拦截入库。
 */
export function scoreLevel(def: LevelDefinition, options?: ScorerOptions): ScoreResult {
  const angles = options?.angles ?? SIM_ANGLES;
  const simSeconds = options?.simSeconds ?? SIM_DURATION_SEC;
  const rngSeed = options?.rngSeed ?? 20261126;

  const decoded = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
  if (decoded.warnings.length > 0) {
    // 入库关卡的 RLE 必须严格合法；容错解码告警视为废件信号。
    throw new Error(`评分前 RLE 解码告警：${decoded.warnings.join('；')}`);
  }
  const cells = decoded.cells;
  const analysis = analyzeStructure(cells, def.cols, def.rows);
  const staticPieces = scoreStatic(analysis, def.cols, def.rows);

  const startedAt = Date.now();
  const perAngleBreakRates: number[] = [];
  for (const angle of angles) {
    perAngleBreakRates.push(simulateOneAngle(def, angle, simSeconds, rngSeed));
  }
  const simElapsedMs = Date.now() - startedAt;
  const simBreakRate20s = average(perAngleBreakRates);

  // 清砖率越高越简单：0.45 → factor 0（8 分起），0.12 → factor 1（58 分封顶）。
  const difficultyFactor = clampNum((EASY_RATE - simBreakRate20s) / (EASY_RATE - HARD_RATE), 0, 1);
  const headlessScore = Math.round(8 + difficultyFactor * 50);

  const totalScore = clampNum(Math.round(staticPieces.staticScore + headlessScore), 0, 100);
  const hasDeadZoneWarning =
    analysis.deadZoneBrickCount > 0 || analysis.launchLineBlocked;

  const breakdown: ScoreBreakdown = {
    ...analysis,
    staticScore: staticPieces.staticScore,
    densityScore: staticPieces.densityScore,
    occlusionScore: staticPieces.occlusionScore,
    entranceScore: staticPieces.entranceScore,
    headlessScore,
    simBreakRate20s,
    perAngleBreakRates,
    simElapsedMs,
    withinSimBudget: simElapsedMs <= SIM_BUDGET_MS,
  };

  return {
    totalScore,
    tier: tierForScore(totalScore),
    breakableCount: analysis.breakableCount,
    steelOcclusionRatio: analysis.steelOcclusionRatio,
    simBreakRate20s,
    hasDeadZoneWarning,
    breakdown,
  };
}

/* ------------------------------------------------------------------ */
/* 内部工具                                                             */
/* ------------------------------------------------------------------ */

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function clampNum(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** mulberry32（与 LevelGenerators 同算法的本地副本，保持模块间零循环依赖）。 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
