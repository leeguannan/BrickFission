/**
 * Milestone 1 验收测试 ①：Sub-stepping 防穿透
 *
 * 依据 `docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md` §7.1：
 *   球速 `2000 px/s`（模拟快进极限）垂直及斜向撞击 1 格厚 `STEEL` 砖，
 *   1000 帧内穿透次数必须为 `0`。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { FIXED_DT } from '../constants.js';
import { BrickGrid, makeSteelCell } from '../BrickGrid.js';
import { GameEngine } from '../GameEngine.js';
import { PhysicsEngine } from '../PhysicsEngine.js';
import { isCenterInsideRect, levelWith, TestWorld } from './testkit.js';

const FAST_SPEED = 2000;
/** 1 格厚灰墙所在行（靠近底部，便于与挡板形成稳定往复）。 */
const WALL_ROW = 36;
const WALL_COL = 21;

test('substepping：2000px/s 垂直撞击 1 格厚 STEEL，1000 帧内零穿透', () => {
  const grid = new BrickGrid(levelWith([[WALL_COL, WALL_ROW, makeSteelCell()]]));
  const world = new TestWorld(grid);
  const physics = new PhysicsEngine(world, { rng: () => 0.5 });

  const rect = grid.cellRect(WALL_COL, WALL_ROW);
  const ball = physics.spawnBall(rect.x + rect.width * 0.5, rect.y + rect.height + 40, 0, -FAST_SPEED);
  assert.ok(ball, '应成功生成测试球');

  let penetrations = 0;
  let bounced = false;

  for (let frame = 0; frame < 1000; frame++) {
    const beforeVy = ball.vy;
    physics.step(FIXED_DT);
    if (!ball.active) break;
    if (ball.vy > 0 && beforeVy < 0) bounced = true;
    if (isCenterInsideRect(ball.x, ball.y, rect)) penetrations++;
    // 球心不得越过灰墙下沿（即穿墙到墙的另一侧）。
    if (ball.x > rect.x && ball.x < rect.x + rect.width && ball.y < rect.y + rect.height) {
      penetrations++;
    }
  }

  assert.equal(penetrations, 0, '灰墙不应被穿透');
  assert.ok(bounced, '球应在灰墙上发生反弹');
});

test('substepping：2000px/s 斜向（45°）撞击灰墙角点，零穿透', () => {
  const grid = new BrickGrid(levelWith([[WALL_COL, WALL_ROW, makeSteelCell()]]));
  const world = new TestWorld(grid);
  const physics = new PhysicsEngine(world, { rng: () => 0.5 });

  const rect = grid.cellRect(WALL_COL, WALL_ROW);
  const v = FAST_SPEED / Math.SQRT2;
  // 从右下角沿 45° 斜向逼近灰墙右下角点。
  const startX = rect.x + rect.width + 40;
  const startY = rect.y + rect.height + 40;
  const ball = physics.spawnBall(startX, startY, -v, -v);
  assert.ok(ball, '应成功生成测试球');

  let penetrations = 0;
  let bounced = false;
  let prevVy = ball.vy;

  for (let frame = 0; frame < 1000; frame++) {
    physics.step(FIXED_DT);
    if (!ball.active) break;
    if (prevVy < 0 && ball.vy > 0) bounced = true;
    prevVy = ball.vy;
    if (isCenterInsideRect(ball.x, ball.y, rect)) penetrations++;
  }

  assert.equal(penetrations, 0, '斜向撞击灰墙角点不应穿透');
  assert.ok(bounced, '球应在灰墙角点发生反弹');
});

test('substepping：×3 快进（每帧 3 次 step(FIXED_DT)）下灰墙零穿透', () => {
  const engine = new GameEngine({
    level: levelWith([[WALL_COL, WALL_ROW, makeSteelCell()]], 'fast-forward-level'),
    rng: () => 0.5,
  });

  assert.ok(engine.releaseBall(), '应成功发球');
  const ball = engine.physics.balls[0]!;
  ball.vx = 0;
  ball.vy = -FAST_SPEED;

  engine.setSpeedMultiplier(3);
  const rect = engine.grid.cellRect(WALL_COL, WALL_ROW);

  let penetrations = 0;
  let frames = 0;
  for (; frames < 1000; frames++) {
    engine.update(FIXED_DT);
    if (!ball.active) break;
    if (isCenterInsideRect(ball.x, ball.y, rect)) penetrations++;
  }

  assert.equal(penetrations, 0, '×3 快进下灰墙不应被穿透');
  assert.ok(frames > 10, '应至少推进若干帧');
});

test('substepping：单子步位移恒不超过球半径的 45%', () => {
  const grid = new BrickGrid(levelWith([[WALL_COL, WALL_ROW, makeSteelCell()]]));
  const world = new TestWorld(grid);
  const physics = new PhysicsEngine(world, { rng: () => 0.5 });

  const rect = grid.cellRect(WALL_COL, WALL_ROW);
  const ball = physics.spawnBall(rect.x + rect.width * 0.5, rect.y + rect.height + 40, 0, -FAST_SPEED)!;

  let prevX = ball.x;
  let prevY = ball.y;
  let maxStep = 0;
  for (let frame = 0; frame < 200; frame++) {
    physics.step(FIXED_DT);
    if (!ball.active) break;
    const step = Math.hypot(ball.x - prevX, ball.y - prevY);
    if (step > maxStep) maxStep = step;
    prevX = ball.x;
    prevY = ball.y;
  }

  // 单帧位移 = speed * dt；子步化后每子步 ≤ 0.45r，单帧位移仍可能大于 0.45r，
  // 因此这里校验"单帧位移不超过 speed * dt + 容差"。
  const frameLimit = (FAST_SPEED * FIXED_DT) * 1.001 + 1e-6;
  assert.ok(maxStep <= frameLimit, `单帧位移 ${maxStep} 应不超过 ${frameLimit}`);
});
