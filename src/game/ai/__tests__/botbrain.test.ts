import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { BrickGrid, makeEmptyCell, makeNormalCell, makeSteelCell } from '../../core/BrickGrid.js';
import type { Ball, BrickCell } from '../../core/types.js';
import {
  choosePaddleTarget,
  collectReachableTargets,
  computePaddleTargetX,
  findBreachTarget,
  findGapTarget,
  findOnsightTarget,
  findReachableTarget,
  findSlantedTarget,
  hasClearCorridor,
  predictContactX,
} from '../BotBrain.js';
import {
  BALL_RADIUS,
  PADDLE_FOLLOW_SPEED,
  PADDLE_HEIGHT,
  PADDLE_MAX_DEFLECT_DEG,
  PADDLE_Y,
} from '../../core/constants.js';

/** 挡板顶面（球心接触面）。 */
const PADDLE_TOP = PADDLE_Y - PADDLE_HEIGHT / 2;

const COLS = 42;
const ROWS = 38;

function buildGrid(specs: Array<[number, number, BrickCell]>): BrickGrid {
  const cells: BrickCell[] = new Array(COLS * ROWS);
  for (let i = 0; i < cells.length; i += 1) cells[i] = makeEmptyCell();
  for (const [col, row, cell] of specs) cells[row * COLS + col] = cell;
  return new BrickGrid({ id: 'ai-test', cols: COLS, rows: ROWS, cells });
}

function ballAt(x: number, y: number, vx: number, vy: number): Ball {
  return {
    x,
    y,
    vx,
    vy,
    radius: BALL_RADIUS,
    active: true,
    bouncesSinceBrick: 0,
    id: 0,
  } as unknown as Ball;
}

describe('BotBrain 目标选取', () => {
  it('空网格找不到任何目标', () => {
    const grid = buildGrid([]);
    assert.equal(findReachableTarget(grid, 360, 1000), null);
    assert.equal(findOnsightTarget(grid, 360, 1000), null);
    assert.equal(findSlantedTarget(grid, 360, 1000), null);
    assert.equal(findGapTarget(grid, 360, 1000), null);
    assert.equal(findBreachTarget(grid, 360, 1000), null);
  });

  it('正上方的砖可被直线命中，且视线目标就是它', () => {
    const grid = buildGrid([[21, 10, makeNormalCell(1, 0)]]);
    const target = findOnsightTarget(grid, 360, 1000);
    assert.ok(target);
    assert.equal(target.col, 21);
    assert.equal(target.row, 10);
    const rect = grid.cellRect(21, 10);
    assert.ok(rect);
    assert.equal(target.x, rect.x + rect.width / 2);
  });

  it('斜飞目标的夹角不超过挡板最大偏转角', () => {
    const grid = buildGrid([
      [10, 8, makeNormalCell(1, 0)],
      [30, 12, makeNormalCell(1, 1)],
    ]);
    const target = findSlantedTarget(grid, 360, 1000);
    assert.ok(target);
    const angleDeg = (Math.atan2(target.x - 360, 1000 - target.y) * 180) / Math.PI;
    assert.ok(Math.abs(angleDeg) <= PADDLE_MAX_DEFLECT_DEG + 1e-6);
  });

  it('走廊被钢墙阻断时判定为不通', () => {
    const grid = buildGrid([
      [21, 20, makeSteelCell()],
      [21, 10, makeNormalCell(1, 0)],
    ]);
    const rect = grid.cellRect(21, 10);
    assert.ok(rect);
    const targetX = rect.x + rect.width / 2;
    const targetY = rect.y + rect.height / 2;
    assert.equal(hasClearCorridor(grid, 360, 1000, targetX, targetY, 21, 10), false);
  });

  it('走廊畅通时判定为通', () => {
    const grid = buildGrid([[21, 10, makeNormalCell(1, 0)]]);
    const rect = grid.cellRect(21, 10);
    assert.ok(rect);
    const targetX = rect.x + rect.width / 2;
    const targetY = rect.y + rect.height / 2;
    assert.equal(hasClearCorridor(grid, 360, 1000, targetX, targetY, 21, 10), true);
  });

  it('缝隙瞄准返回砖角附近的瞄准点', () => {
    const grid = buildGrid([
      [20, 10, makeSteelCell()],
      [21, 10, makeNormalCell(1, 0)],
      [22, 10, makeSteelCell()],
      [21, 9, makeSteelCell()],
      [21, 11, makeSteelCell()],
    ]);
    const target = findGapTarget(grid, 360, 1000);
    assert.ok(target);
    const rect = grid.cellRect(21, 10);
    assert.ok(rect);
    const dx = target.x - (rect.x + rect.width / 2);
    const dy = target.y - (rect.y + rect.height / 2);
    // 瞄准点应落在砖的某个角附近（横向或纵向偏移约半格）
    assert.ok(Math.abs(Math.abs(dx) - rect.width / 2) < 6);
    assert.ok(Math.abs(Math.abs(dy) - rect.height / 2) < 6);
  });

  it('可达目标清单按夹角从负到正排序', () => {
    const grid = buildGrid([
      [12, 8, makeNormalCell(1, 0)],
      [30, 8, makeNormalCell(1, 1)],
      [21, 12, makeNormalCell(1, 2)],
    ]);
    const list = collectReachableTargets(grid, 360, 1000);
    assert.ok(list.length >= 3);
    for (let i = 1; i < list.length; i += 1) {
      const prev = list[i - 1]!;
      const cur = list[i]!;
      const prevAngle = Math.atan2(prev.x - 360, 1000 - prev.y);
      const curAngle = Math.atan2(cur.x - 360, 1000 - cur.y);
      assert.ok(prevAngle <= curAngle + 1e-9);
    }
  });
});

describe('BotBrain 落点预测与挡板决策', () => {
  it('垂直下落的球落点就是球的横坐标', () => {
    const ball = ballAt(300, 900, 0, 400);
    assert.equal(predictContactX(ball, PADDLE_TOP), 300);
  });

  it('斜向下落的球落点按速度外推', () => {
    const ball = ballAt(300, 900, 200, 400);
    const expected = 300 + 200 * ((PADDLE_TOP - 900 - BALL_RADIUS) / 400);
    assert.ok(Math.abs(predictContactX(ball, PADDLE_TOP) - expected) < 1);
  });

  it('撞到侧墙后落点会折返', () => {
    const ball = ballAt(690, 900, 600, 400);
    const contactX = predictContactX(ball, PADDLE_TOP);
    // 线性外推会得到 1040（超出右墙），模拟后必须落在墙内
    assert.ok(contactX <= 704 - BALL_RADIUS + 1e-6);
    assert.ok(contactX < 690);
  });

  it('偏转角反解：瞄准正上方的砖时偏转角接近 0', () => {
    const grid = buildGrid([[21, 10, makeNormalCell(1, 0)]]);
    const rect = grid.cellRect(21, 10);
    assert.ok(rect);
    const target = { col: 21, row: 10, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const paddleX = computePaddleTargetX(360, target, PADDLE_TOP, 58, PADDLE_MAX_DEFLECT_DEG);
    assert.ok(Math.abs(paddleX - 360) < 1);
  });

  it('接球决策返回合法挡板位置', () => {
    const ball = ballAt(360, 900, 0, 400);
    const x = choosePaddleTarget({
      balls: [ball],
      paddleX: 360,
      paddleTop: PADDLE_TOP,
      halfWidth: 58,
      followSpeed: PADDLE_FOLLOW_SPEED,
      target: { col: 21, row: 10, x: 368, y: 500 },
      maxDeflectDeg: PADDLE_MAX_DEFLECT_DEG,
      aimWeight: 1.5,
    });
    assert.ok(Number.isFinite(x));
    assert.ok(x >= 16 && x <= 704);
  });
});
