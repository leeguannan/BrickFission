/**
 * 《碎砖大裂变》(Brick Fission) — 单元测试公共工具
 *
 * 本文件**不是**测试用例（文件名不匹配 `*.test.ts`），只提供测试夹具。
 * 纯 TypeScript：禁止出现任何宿主环境 API。
 */

import { PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_Y, WALL_LEFT, WALL_RIGHT } from '../constants.js';
import { BrickGrid, makeEmptyCell } from '../BrickGrid.js';
import type { PhysicsWorld } from '../PhysicsEngine.js';
import type { Ball, BrickCell, GameEvent, LevelRuntimeConfig, Paddle, Rect } from '../types.js';

/** 测试网格尺寸（落在文档允许的 cols ∈ [28,48] / rows ∈ [24,42] 内）。 */
export const TEST_COLS = 42;
export const TEST_ROWS = 38;

/** 构造一个全空关卡配置。 */
export function emptyLevel(id = 'empty-level'): LevelRuntimeConfig {
  return { id, cols: TEST_COLS, rows: TEST_ROWS };
}

/** 构造一个指定格子内容的关卡配置。 */
export function levelWith(
  specs: Array<[col: number, row: number, cell: BrickCell]>,
  id = 'test-level',
): LevelRuntimeConfig {
  const cells: BrickCell[] = new Array<BrickCell>(TEST_COLS * TEST_ROWS);
  for (let i = 0; i < cells.length; i++) cells[i] = makeEmptyCell();
  for (const [col, row, cell] of specs) {
    cells[row * TEST_COLS + col] = cell;
  }
  return { id, cols: TEST_COLS, rows: TEST_ROWS, cells };
}

/** 最小可用的物理世界（Headless 盲测夹具）。 */
export class TestWorld implements PhysicsWorld {
  readonly grid: BrickGrid;
  readonly paddle: Paddle;
  readonly events: GameEvent[] = [];
  destroyedCount = 0;
  boundaryBounceCount = 0;

  constructor(grid: BrickGrid, paddleOverride?: Partial<Paddle>) {
    this.grid = grid;
    this.paddle = {
      x: (WALL_LEFT + WALL_RIGHT) * 0.5,
      y: PADDLE_Y,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      targetX: (WALL_LEFT + WALL_RIGHT) * 0.5,
      ...paddleOverride,
    };
  }

  damageMultiplier(): number {
    return 1;
  }

  emit(event: GameEvent): void {
    this.events.push(event);
  }

  onBrickDestroyed(): void {
    this.destroyedCount++;
  }

  onBoundaryBounce(): void {
    this.boundaryBounceCount++;
  }
}

/** 球心是否落在矩形内部（严格内部，含极小容差）。 */
export function isCenterInsideRect(x: number, y: number, rect: Rect, epsilon = 1e-9): boolean {
  return (
    x > rect.x + epsilon &&
    x < rect.x + rect.width - epsilon &&
    y > rect.y + epsilon &&
    y < rect.y + rect.height - epsilon
  );
}

/** 圆与矩形是否相交（用于检测"贴边但未穿透"以外的接触）。 */
export function circleIntersectsRect(x: number, y: number, radius: number, rect: Rect): boolean {
  const closestX = x < rect.x ? rect.x : x > rect.x + rect.width ? rect.x + rect.width : x;
  const closestY = y < rect.y ? rect.y : y > rect.y + rect.height ? rect.y + rect.height : y;
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

/** 速度方向角（度）：0 = 垂直向上，正值 = 朝右。 */
export function headingDeg(ball: Ball): number {
  return (Math.atan2(ball.vx, -ball.vy) * 180) / Math.PI;
}
