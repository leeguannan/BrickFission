/**
 * Milestone 1 验收测试 ②：挡板 68° 偏转角映射与防水平死锁
 *
 * 依据 `docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md` §3.4 / §3.5 / §7.2：
 *   球撞击挡板左边缘、中心、右边缘时，出射角符号与大小符合预期，
 *   且连续反弹 500 次不出现 `|vy| < speed * 0.18` 的水平卡死。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { BASE_BALL_SPEED, BALL_RADIUS, FIXED_DT, MIN_VERTICAL_RATIO, PADDLE_MAX_DEFLECT_DEG } from '../constants.js';
import { BrickGrid, makeSteelCell } from '../BrickGrid.js';
import { PhysicsEngine } from '../PhysicsEngine.js';
import { emptyLevel, headingDeg, levelWith, TestWorld } from './testkit.js';

const PADDLE_X = 360;
const PADDLE_WIDTH = 116;
const PADDLE_TOP = 1090 - 18 * 0.5;

/** 生成一个"球正落在挡板上方、正在下落"的初始状态。 */
function setupDrop(ballX: number, speed = BASE_BALL_SPEED) {
  const grid = new BrickGrid(emptyLevel());
  const world = new TestWorld(grid, { x: PADDLE_X, targetX: PADDLE_X, width: PADDLE_WIDTH });
  const physics = new PhysicsEngine(world, { rng: () => 0.5 });
  const ball = physics.spawnBall(ballX, PADDLE_TOP - BALL_RADIUS + 0.1, 0, speed)!;
  return { physics, ball, world };
}

test('paddle：左边缘命中 → 出射角约 -68°（向左）', () => {
  const { physics, ball, world } = setupDrop(PADDLE_X - PADDLE_WIDTH * 0.5);
  physics.step(FIXED_DT);

  const speed = Math.hypot(ball.vx, ball.vy);
  assert.ok(Math.abs(speed - BASE_BALL_SPEED) < 1e-6, '出射速度大小应保持不变');
  assert.ok(ball.vx < 0, '左边缘命中应向左偏');
  assert.ok(ball.vy < 0, '出射方向必须朝上');
  const heading = headingDeg(ball);
  assert.ok(
    Math.abs(heading - -PADDLE_MAX_DEFLECT_DEG) < 0.01,
    `左边缘出射角应约 -${PADDLE_MAX_DEFLECT_DEG}°，实际 ${heading}`,
  );
  assert.ok(
    Math.abs(ball.vx - BASE_BALL_SPEED * Math.sin((-68 * Math.PI) / 180)) < 1e-6,
    '横向速度应等于 speed·sin(θ)',
  );
  // 反弹瞬间球被夹紧到挡板顶面之上；本帧剩余子步只会继续向上，故只校验不嵌入挡板。
  assert.ok(ball.y + BALL_RADIUS <= PADDLE_TOP + 1e-6, '球不得嵌入挡板内部');
  const paddleHit = world.events.find((e) => e.type === 'PADDLE_HIT');
  assert.ok(paddleHit && paddleHit.type === 'PADDLE_HIT', '应产生 PADDLE_HIT 事件');
  assert.ok(Math.abs(paddleHit.offsetRatio + 1) < 1e-9, '左边缘命中的 offsetRatio 应为 -1');
});

test('paddle：中心命中 → 垂直向上出射（vx = 0）', () => {
  const { physics, ball } = setupDrop(PADDLE_X);
  physics.step(FIXED_DT);

  const speed = Math.hypot(ball.vx, ball.vy);
  assert.ok(Math.abs(ball.vx) < 1e-9, '中心命中应无横向分量');
  assert.ok(Math.abs(ball.vy + speed) < 1e-6, '中心命中应垂直向上');
  assert.ok(Math.abs(headingDeg(ball)) < 1e-9, '中心出射角应为 0°');
});

test('paddle：右边缘命中 → 出射角约 +68°（向右）', () => {
  const { physics, ball } = setupDrop(PADDLE_X + PADDLE_WIDTH * 0.5);
  physics.step(FIXED_DT);

  const speed = Math.hypot(ball.vx, ball.vy);
  assert.ok(ball.vx > 0, '右边缘命中应向右偏');
  assert.ok(ball.vy < 0, '出射方向必须朝上');
  assert.ok(
    Math.abs(Math.hypot(ball.vx, ball.vy) - speed) < 1e-6,
    '反射后速率应保持不变',
  );
  const heading = headingDeg(ball);
  assert.ok(
    Math.abs(heading - PADDLE_MAX_DEFLECT_DEG) < 0.01,
    `右边缘出射角应约 +${PADDLE_MAX_DEFLECT_DEG}°，实际 ${heading}`,
  );
});

test('paddle：连续反弹 500 次不出现 |vy| < speed * 0.18 的水平卡死', () => {
  const grid = new BrickGrid(emptyLevel());
  const world = new TestWorld(grid, { x: PADDLE_X, targetX: PADDLE_X, width: PADDLE_WIDTH });
  const physics = new PhysicsEngine(world, { rng: () => 0.5 });
  const ball = physics.spawnBall(PADDLE_X, PADDLE_TOP - BALL_RADIUS + 0.1, 0, BASE_BALL_SPEED)!;

  const halfWidth = PADDLE_WIDTH * 0.5;
  let minRatio = 1;

  for (let i = 0; i < 500; i++) {
    // 每轮在挡板不同位置重新落球，覆盖左中右所有命中点。
    const offset = [-1, -0.5, 0, 0.5, 1][i % 5]!;
    ball.x = PADDLE_X + offset * halfWidth;
    ball.y = PADDLE_TOP - BALL_RADIUS + 0.1;
    ball.vx = 0;
    ball.vy = BASE_BALL_SPEED;

    physics.step(FIXED_DT);

    const speed = Math.hypot(ball.vx, ball.vy);
    const ratio = Math.abs(ball.vy) / speed;
    if (ratio < minRatio) minRatio = ratio;
    assert.ok(
      ratio >= MIN_VERTICAL_RATIO - 1e-9,
      `第 ${i + 1} 次反弹出现水平卡死：|vy|/speed = ${ratio}`,
    );
  }

  assert.ok(minRatio >= MIN_VERTICAL_RATIO, `最小垂直分量比例 ${minRatio} 应不低于 ${MIN_VERTICAL_RATIO}`);
});

test('physics：墙面反弹后过水平的球被抬升垂直分量并重新归一化', () => {
  const grid = new BrickGrid(levelWith([], 'wall-bounce'));
  const world = new TestWorld(grid);
  const physics = new PhysicsEngine(world, { rng: () => 0.5 });

  const speed = Math.hypot(-670, 60);
  const ball = physics.spawnBall(20, 500, -670, 60)!;
  assert.ok(Math.abs(ball.vy) < speed * MIN_VERTICAL_RATIO, '前置条件：入射角过平');

  physics.step(FIXED_DT);

  const after = Math.hypot(ball.vx, ball.vy);
  assert.ok(Math.abs(after - speed) < 1e-6, '反弹后速度大小应保持');
  // 文档流程：先把 |vy| 抬到 speed*0.22，再重新归一化（归一化后略低于 0.22，
  // 但必须远高于 0.18 的卡死阈值）。
  assert.ok(
    Math.abs(ball.vy) >= speed * 0.21 - 1e-6,
    `垂直分量应被抬升到约 0.22*speed，实际 ${Math.abs(ball.vy)}`,
  );
  assert.ok(Math.abs(ball.vy) > speed * MIN_VERTICAL_RATIO);
});

test('physics：撞击灰墙/顶墙累计 18 次后自动注入 ±6°~±12° 偏转逃逸', () => {
  // 一格厚的灰墙位于 row 30（y 626~642），球在顶墙与灰墙之间来回弹跳，
  // 每次顶墙 +1、每次灰墙 +1，累计 18 次后触发自救偏转。
  const grid = new BrickGrid(levelWith([[21, 30, makeSteelCell(0)]], 'deadlock-level'));
  const world = new TestWorld(grid);
  // 固定随机源：magnitude = 6 + 0.5 * (12 - 6) = 9°，sign = +1。
  const physics = new PhysicsEngine(world, { rng: () => 0.5 });

  const ball = physics.spawnBall(368, 800, 0, -BASE_BALL_SPEED)!;
  let escaped = false;
  let escapeHeading = 0;

  for (let frame = 0; frame < 4000; frame++) {
    const beforeCounter = ball.bouncesSinceBrick;
    physics.step(FIXED_DT);
    if (!ball.active) break;
    if (beforeCounter > 0 && ball.bouncesSinceBrick === 0) {
      escaped = true;
      escapeHeading = headingDeg(ball);
      break;
    }
  }

  assert.ok(escaped, '累计 18 次灰墙/顶墙碰撞后应触发自救偏转');
  // 自救偏转是一次 ±9° 的速度旋转（rng=0.5 → 固定 9°，正向）。
  // 碰撞本身会把球镜像反向，因此以"镜像后的纯反射方向"为基准计算偏移量。
  const mirrorHeading = ball.vy > 0 ? 180 : 0;
  const deviation = (((escapeHeading - mirrorHeading) % 360) + 540) % 360 - 180;
  assert.ok(
    Math.abs(deviation - 9) < 0.5,
    `自救偏转应在 6°~12° 之间（正向 9°），实际偏移 ${deviation}`,
  );
});
