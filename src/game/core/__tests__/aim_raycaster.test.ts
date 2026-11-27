/**
 * Milestone 1 附加测试：瞄准折线预测（§4）
 *
 * 依据 `docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md` §4：
 *   - 采样步长 4px、最长 900px、第二段 140px、圆点间距 22px；
 *   - 发射角限制在 [-72°, +72°]；
 *   - 预测须与物理层一致：命中砖块 / 墙面后按法线反射。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AIM_ANGLE_MAX_DEG,
  AIM_ANGLE_MIN_DEG,
  AIM_DOT_FADE,
  AIM_DOT_SPACING,
  AIM_MAX_LENGTH,
  AIM_SECOND_SEGMENT_LENGTH,
  AIM_STEP,
  BALL_RADIUS,
  WALL_RIGHT,
  WALL_TOP,
} from '../constants.js';
import { AimRaycaster } from '../AimRaycaster.js';
import { BrickGrid, makeNormalCell } from '../BrickGrid.js';
import { emptyLevel, levelWith } from './testkit.js';

const ORIGIN_X = 360;
const ORIGIN_Y = 1083.5;

test('aim：垂直向上发射时命中顶墙，第一段终点落在墙面附近', () => {
  const grid = new BrickGrid(emptyLevel());
  const raycaster = new AimRaycaster(grid);

  // 取一个距顶墙不足 900px 的发射点，确保射线在长度上限内命中顶墙。
  const prediction = raycaster.predict(ORIGIN_X, 600, 0);
  assert.equal(prediction.angleDeg, 0);
  assert.ok(prediction.hitPoint, '应命中顶墙');
  assert.ok(
    Math.abs(prediction.hitPoint.y - (WALL_TOP + BALL_RADIUS)) <= AIM_STEP + 1e-6,
    `命中点应贴近顶墙，实际 y=${prediction.hitPoint.y}`,
  );
  assert.ok(Math.abs(prediction.hitPoint.x - ORIGIN_X) < 1e-6, '垂直发射不应横向偏移');
  assert.ok(prediction.firstSegmentCount >= 2, '应产生多个瞄准圆点');
});

test('aim：900px 内未命中障碍时不产生命中点', () => {
  const grid = new BrickGrid(emptyLevel());
  const raycaster = new AimRaycaster(grid);

  // 发球点到顶墙距离超过 900px：射线在长度上限内不会命中。
  const prediction = raycaster.predict(ORIGIN_X, ORIGIN_Y, 0);
  assert.equal(prediction.hitPoint, null);
  assert.equal(prediction.secondSegmentCount, 0);
  assert.ok(prediction.firstSegmentCount >= 1, '应产生瞄准圆点');
});

test('aim：圆点按 22px 等距排列，且从起点开始', () => {
  const grid = new BrickGrid(emptyLevel());
  const raycaster = new AimRaycaster(grid);

  const prediction = raycaster.predict(ORIGIN_X, ORIGIN_Y, 0);
  const dots = prediction.firstSegment;
  const count = prediction.firstSegmentCount;
  assert.ok(count >= 2, '应产生多个瞄准圆点');
  assert.ok(Math.abs(dots[0]!.x - ORIGIN_X) < 1e-6);
  assert.ok(Math.abs(dots[0]!.y - ORIGIN_Y) < 1e-6);

  for (let i = 1; i < count; i++) {
    const dx = dots[i]!.x - dots[i - 1]!.x;
    const dy = dots[i]!.y - dots[i - 1]!.y;
    const distance = Math.hypot(dx, dy);
    assert.ok(Math.abs(distance - AIM_DOT_SPACING) < 1e-6, `第 ${i} 个圆点间距应为 ${AIM_DOT_SPACING}`);
  }

  const first = dots[0]!;
  const last = dots[count - 1]!;
  assert.ok(first.alpha > last.alpha, '末端圆点透明度应衰减');
  assert.ok(Math.abs(first.alpha - 1) < 1e-9);
  assert.ok(Math.abs(last.alpha - (1 - AIM_DOT_FADE)) < 1e-9);
});

test('aim：发射角被夹紧到 [-72°, +72°]', () => {
  const grid = new BrickGrid(emptyLevel());
  const raycaster = new AimRaycaster(grid);

  assert.equal(raycaster.predict(ORIGIN_X, ORIGIN_Y, 500).angleDeg, AIM_ANGLE_MAX_DEG);
  assert.equal(raycaster.predict(ORIGIN_X, ORIGIN_Y, -500).angleDeg, AIM_ANGLE_MIN_DEG);
  assert.equal(raycaster.predict(ORIGIN_X, ORIGIN_Y, 30).angleDeg, 30);
});

test('aim：命中砖块后按法线反射出第二段，长度不超过 140px', () => {
  const level = levelWith([[21, 20, makeNormalCell(1, 0)]], 'aim-level');
  const grid = new BrickGrid(level);
  const raycaster = new AimRaycaster(grid);

  const brickRect = grid.cellRect(21, 20);
  const prediction = raycaster.predict(ORIGIN_X, ORIGIN_Y, 0);

  assert.ok(prediction.hitPoint, '应命中砖块');
  assert.ok(
    prediction.hitPoint.y >= brickRect.y + brickRect.height - AIM_STEP &&
      prediction.hitPoint.y <= brickRect.y + brickRect.height + BALL_RADIUS + AIM_STEP,
    `命中点应落在砖块下沿，实际 y=${prediction.hitPoint.y}`,
  );
  assert.ok(prediction.secondSegmentCount >= 1, '命中后应给出第二段反射轨迹');

  const first = prediction.secondSegment[0]!;
  assert.ok(Math.abs(first.x - prediction.hitPoint.x) < 1e-6, '第二段应从命中点开始');
  assert.ok(Math.abs(first.y - prediction.hitPoint.y) < 1e-6, '第二段应从命中点开始');

  const last = prediction.secondSegment[prediction.secondSegmentCount - 1]!;
  const length = Math.hypot(last.x - first.x, last.y - first.y);
  assert.ok(length <= AIM_SECOND_SEGMENT_LENGTH + 1e-6, '第二段长度不应超过 140px');
});

test('aim：预测路径长度不超过 900px', () => {
  const grid = new BrickGrid(emptyLevel());
  const raycaster = new AimRaycaster(grid);

  const prediction = raycaster.predict(ORIGIN_X, ORIGIN_Y, AIM_ANGLE_MAX_DEG);
  const dots = prediction.firstSegment;
  const count = prediction.firstSegmentCount;
  assert.ok(count >= 1, '应产生瞄准圆点');
  const last = dots[count - 1]!;
  const length = Math.hypot(last.x - ORIGIN_X, last.y - ORIGIN_Y);
  assert.ok(length <= AIM_MAX_LENGTH, `预测长度不应超过 ${AIM_MAX_LENGTH}px，实际 ${length}`);
});

test('aim：偏心垂直撞砖仍按轴向法线垂直折返（不使用径向法线）', () => {
  const level = levelWith([[21, 20, makeNormalCell(1, 0)]], 'aim-offset');
  const grid = new BrickGrid(level);
  const raycaster = new AimRaycaster(grid);

  const brickRect = grid.cellRect(21, 20);
  const brickCenterX = brickRect.x + brickRect.width * 0.5;
  // 发射点偏离砖块中心 3px（仍在砖块水平范围内），用于暴露"径向法线歪折线"缺陷。
  const offsetX = brickCenterX - 3;

  const prediction = raycaster.predict(offsetX, 900, 0);

  assert.ok(prediction.hitPoint, '应命中砖块');
  const hitX = prediction.hitPoint.x;
  const hitY = prediction.hitPoint.y;

  // 轴向分离法线 (0, ±1)：命中点水平方向不偏移。
  assert.ok(
    Math.abs(hitX - offsetX) < 1e-6,
    `命中点不应横向偏移（径向法线会偏移），实际 x=${hitX} 期望 ${offsetX}`,
  );
  // 命中点 = 反弹后的球心位置：距砖面 radius + EPS。
  const expectedY = brickRect.y + brickRect.height + BALL_RADIUS;
  assert.ok(
    Math.abs(hitY - expectedY) < 0.01,
    `命中点应停在砖面外 radius 处，实际 y=${hitY} 期望 ${expectedY}`,
  );

  // 第二段必须存在且垂直折返（x 不变、y 增大）。
  assert.ok(prediction.secondSegmentCount >= 1, '命中后应给出第二段反射轨迹');
  const first = prediction.secondSegment[0]!;
  const last = prediction.secondSegment[prediction.secondSegmentCount - 1]!;
  assert.ok(Math.abs(first.x - hitX) < 1e-6, '第二段应从命中点开始');
  assert.ok(Math.abs(last.x - hitX) < 1e-6, '垂直撞砖后第二段应保持竖直');
  assert.ok(last.y > hitY, '垂直撞砖后第二段应向下折返');
});

test('aim：撞侧墙后仍能画出第二段折线（命中点沿法线推出）', () => {
  const grid = new BrickGrid(emptyLevel());
  const raycaster = new AimRaycaster(grid);

  // 向右上方发射，必定撞到右侧世界墙。
  const prediction = raycaster.predict(ORIGIN_X, ORIGIN_Y, AIM_ANGLE_MAX_DEG);

  assert.ok(prediction.hitPoint, '应命中右侧墙');
  const hitX = prediction.hitPoint.x;
  const hitY = prediction.hitPoint.y;
  assert.ok(
    Math.abs(hitX - (WALL_RIGHT - BALL_RADIUS)) < 0.01,
    `命中点应停在墙面内 radius 处，实际 x=${hitX}`,
  );

  assert.ok(prediction.secondSegmentCount >= 1, '撞墙后应给出第二段反射轨迹');
  const first = prediction.secondSegment[0]!;
  const last = prediction.secondSegment[prediction.secondSegmentCount - 1]!;
  assert.ok(Math.abs(first.x - hitX) < 1e-6, '第二段应从命中点开始');
  assert.ok(Math.abs(first.y - hitY) < 1e-6, '第二段应从命中点开始');
  assert.ok(last.x < hitX, '撞右墙后第二段应向左折返');
});
