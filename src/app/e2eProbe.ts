/**
 * 《碎砖大裂变》(Brick Fission) — 端到端测试探针
 *
 * 用途：给 Playwright（`tests/e2e/game.spec.ts`）提供**只读**运行期快照与
 * 少量**测试专用**的造局助手，用于稳定复现「失败」「残局」这类正常玩法
 * 需要数分钟才能出现的局面。
 *
 * 安全边界（红线，勿破坏）：
 *   1. 仅当 URL 带 `?e2e=1` 时才挂载 `window.__BF_TEST__`；
 *      正常访问（无 query）不挂载任何全局变量，**不存在作弊后门**；
 *   2. 探针只读取引擎状态；唯一的写操作是 `leaveOneBrick()`（打碎砖块）
 *      与 `forceLost()`（移除在场球），二者都只改运行时内存态，
 *      不写存档、不改金币、不解锁关卡；
 *   3. 本文件位于 `src/app/`（宿主层），**不进入 `src/game/core/`**，
 *      因此内核目录继续保持零宿主 API 依赖。
 */
import { BALL_RADIUS } from '../game/core/constants.js';
import type { Ball, GamePhase } from '../game/core/types.js';
import type { BrickGrid } from '../game/core/BrickGrid.js';
import type { GameEngine } from '../game/core/GameEngine.js';

/** 渲染层调试计数快照（与 `Canvas2DRenderer.getDebugCounters()` 同构）。 */
export interface E2EDebugCounters {
  frameCount: number;
  brickLayerBlits: number;
  dirtyCellRepaints: number;
  brickLayerRebuilds: number;
  mainThreadArcCalls: number;
}

/** 只读状态快照。 */
export interface E2ETestState {
  /** 当前阶段：READY_AIM / PLAYING / PAUSED / WON / LOST。 */
  phase: GamePhase;
  /** 当前关卡下标（0 基）。 */
  levelIndex: number;
  /** 在场物理球数量。 */
  activeBallCount: number;
  /** 剩余可破坏砖数量。 */
  remainingBreakable: number;
  /** 挡板中心 X。 */
  paddleX: number;
  /** 技能库存。 */
  skills: { multiLaunchCount: number; tripleSplitCount: number };
  /** 金币数。 */
  coins: number;
  /** 渲染层调试计数。 */
  debugCounters: E2EDebugCounters;
  /* --- 以下为附加只读字段，便于断言，不影响任何游戏逻辑 --- */
  speedMultiplier: number;
  elapsedSec: number;
  totalBreakable: number;
  paddleTargetX: number;
  /** 在场球的快照（仅 active）。 */
  balls: Array<{ x: number; y: number; vx: number; vy: number }>;
  /**
   * `leaveOneBrick()` 选中的幸存砖（逻辑坐标中心）。
   * E2E 用它把指针点到该砖上，即可让首发球沿最直接的路径命中它。
   */
  aimTarget: { x: number; y: number } | null;
  /**
   * Milestone 5 / Step 2：Fever 能量与暴走状态（只读）。
   *
   * `energy` 为 0~`maxEnergy`；`active` 为 true 时表示暴走进行中，
   * 此时全场球获得穿透 + 2× 伤害倍率。
   */
  fever: {
    energy: number;
    maxEnergy: number;
    active: boolean;
    remainingSec: number;
  };
}

/** 探针 API。 */
export interface E2ETestApi {
  /** 读取只读状态快照。 */
  state(): E2ETestState;
  /** 立即制造失败局面：移除全部在场球 → 引擎下一次判定即 LOST。 */
  forceLost(): void;
  /** 制造残局：只保留一块可破坏砖（其余全部打碎）。 */
  leaveOneBrick(): void;
}

/** 探针宿主：由 `GameApp` 实现（全部为取值函数，随引擎重建保持实时）。 */
export interface E2EProbeHost {
  getEngine(): GameEngine;
  getCoins(): number;
  getLevelIndex(): number;
  getDebugCounters(): E2EDebugCounters;
  getBalls(): Ball[];
}

/** 幸存砖与垂直方向的最小夹角（度）。
 *  复活补球使用 [-12°, 0°, +12°] 扇形，夹角过小会让复活球误击幸存砖。 */
const SURVIVOR_MIN_ANGLE_DEG = 20;
/** 发射角上限（与 `AIM_ANGLE_MAX_DEG` 对齐，留 2° 余量）。 */
const MAX_AIM_ANGLE_DEG = 70;
/** 通道采样步长（px）。 */
const CORRIDOR_STEP_PX = 1.5;

declare global {
  interface Window {
    __BF_TEST__?: E2ETestApi;
  }
}

/**
 * 安装 E2E 探针。
 *
 * @returns 安装成功返回 API；未启用 `?e2e=1` 返回 null（此时不挂载任何全局变量）。
 */
export function installE2EProbe(host: E2EProbeHost): E2ETestApi | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get('e2e') !== '1') return null;

  let aimTarget: { x: number; y: number } | null = null;

  const api: E2ETestApi = {
    state(): E2ETestState {
      const engine = host.getEngine();
      const inventory = engine.skillInventory;
      const counters = host.getDebugCounters();
      const fever = engine.feverSnapshot;
      const balls: Array<{ x: number; y: number; vx: number; vy: number }> = [];
      for (const ball of host.getBalls()) {
        if (!ball.active) continue;
        balls.push({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });
      }
      return {
        phase: engine.currentPhase,
        levelIndex: host.getLevelIndex(),
        activeBallCount: engine.activeBallCount,
        remainingBreakable: engine.remainingBreakable,
        paddleX: engine.paddle.x,
        skills: {
          multiLaunchCount: inventory.multiLaunchCount,
          tripleSplitCount: inventory.tripleSplitCount,
        },
        coins: host.getCoins(),
        debugCounters: {
          frameCount: counters.frameCount,
          brickLayerBlits: counters.brickLayerBlits,
          dirtyCellRepaints: counters.dirtyCellRepaints,
          brickLayerRebuilds: counters.brickLayerRebuilds,
          mainThreadArcCalls: counters.mainThreadArcCalls,
        },
        speedMultiplier: engine.currentSpeedMultiplier,
        elapsedSec: engine.elapsedTimeSec,
        totalBreakable: engine.grid.totalBreakable,
        paddleTargetX: engine.paddle.targetX,
        balls,
        aimTarget,
        fever: {
          energy: fever.energy,
          maxEnergy: fever.maxEnergy,
          active: fever.active,
          remainingSec: fever.remainingSec,
        },
      };
    },

    forceLost(): void {
      const engine = host.getEngine();
      if (engine.currentPhase === 'READY_AIM') {
        // 未发球时先发一颗，随后立即移除，使引擎下一次判定进入 LOST。
        engine.releaseBall();
      }
      if (engine.currentPhase !== 'PLAYING') return;
      for (const ball of engine.physics.balls) {
        if (ball.active) ball.active = false;
      }
    },

    leaveOneBrick(): void {
      const engine = host.getEngine();
      const grid = engine.grid;
      const docked = engine.dockedBallPosition;
      const survivor = pickSurvivor(grid, docked.x, docked.y);
      aimTarget = null;
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          if (survivor && col === survivor.col && row === survivor.row) continue;
          const cell = grid.at(col, row);
          if (!cell || cell.role === 'EMPTY' || cell.role === 'STEEL') continue;
          grid.damage(col, row, cell.hp);
        }
      }
      if (survivor) {
        // 幸存砖血量归一为 1：保证「一发命中即通关」，E2E 不依赖多次碰撞。
        const cell = grid.at(survivor.col, survivor.row);
        if (cell && cell.hp > 1) grid.damage(survivor.col, survivor.row, cell.hp - 1);
        aimTarget = { x: survivor.x, y: survivor.y };
      }
    },
  };

  window.__BF_TEST__ = api;
  return api;
}

/* ------------------------------------------------------------------ */
/* 幸存砖选取                                                          */
/* ------------------------------------------------------------------ */

interface SurvivorCandidate {
  col: number;
  row: number;
  x: number;
  y: number;
  angleDeg: number;
  distSq: number;
}

/**
 * 选取一块「首发直线可命中」的砖作为残局幸存砖。
 *
 * 判据：
 *   1. 该砖与待发球位置之间存在一条**无阻挡走廊**（含球半径余量）；
 *   2. 发射角落在引擎允许的 ±72° 内；
 *   3. 优先选择偏离垂直轴较远的砖，避免复活补球（-12°/0°/+12°）误击。
 */
function pickSurvivor(grid: BrickGrid, fromX: number, fromY: number): SurvivorCandidate | null {
  const candidates: SurvivorCandidate[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.at(col, row);
      if (!cell || cell.role === 'EMPTY' || cell.role === 'STEEL') continue;
      const rect = grid.cellRect(col, row);
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      const dx = x - fromX;
      const dy = y - fromY;
      const angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (Math.abs(angleDeg) > MAX_AIM_ANGLE_DEG) continue;
      candidates.push({ col, row, x, y, angleDeg, distSq: dx * dx + dy * dy });
    }
  }
  candidates.sort((a, b) => {
    // 优先 1 血砖（首发一发即可清场），其次偏离垂直轴，最后取最近的
    const aHp = grid.at(a.col, a.row)?.hp ?? 1;
    const bHp = grid.at(b.col, b.row)?.hp ?? 1;
    if (aHp !== bHp) return aHp - bHp;
    const aOff = Math.abs(a.angleDeg) >= SURVIVOR_MIN_ANGLE_DEG ? 0 : 1;
    const bOff = Math.abs(b.angleDeg) >= SURVIVOR_MIN_ANGLE_DEG ? 0 : 1;
    if (aOff !== bOff) return aOff - bOff;
    return a.distSq - b.distSq;
  });
  for (const candidate of candidates) {
    if (!hasClearCorridor(grid, fromX, fromY, candidate.x, candidate.y, candidate.col, candidate.row)) continue;
    return candidate;
  }
  return null;
}

/**
 * 走廊检测：射线沿途（含球半径余量）除目标砖外必须全部为空。
 */
function hasClearCorridor(
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
  if (length < 1) return false;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const clearance = BALL_RADIUS + 0.5;
  for (let t = 0; t <= length; t += CORRIDOR_STEP_PX) {
    const cx = fromX + ux * t;
    const cy = fromY + uy * t;
    for (const offset of [-clearance, 0, clearance]) {
      const sx = cx + px * offset;
      const sy = cy + py * offset;
      const col = grid.colAt(sx);
      const row = grid.rowAt(sy);
      if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) continue;
      if (col === targetCol && row === targetRow) continue;
      const cell = grid.at(col, row);
      if (cell && cell.role !== 'EMPTY') return false;
    }
  }
  return true;
}
