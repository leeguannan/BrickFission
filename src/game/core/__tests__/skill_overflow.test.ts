/**
 * Milestone 1 验收测试 ③：200 球上限与溢出伤害倍率转化
 *
 * 依据 `docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md` §5.1 / §5.2 / §5.3 / §7.3：
 *   - 100 球连续两次 TRIPLE_SPLIT，活跃球数严格 ≤ 200，不越界不异常；
 *   - 溢出的球数转化为全局伤害倍率（×2 / ×3，持续 8 秒）；
 *   - 蓝标 MULTI_LAUNCH 连发扇形 5 球并消耗库存；
 *   - 每击碎 150 块砖交替奖励 +1 蓝标 / +1 橙标。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASE_BALL_SPEED,
  DEATH_LINE_Y,
  MAX_PHYSICAL_BALLS,
  MULTI_LAUNCH_COUNT,
  OVERLOAD_DAMAGE_MULTIPLIER,
  OVERLOAD_DAMAGE_MULTIPLIER_HIGH,
  OVERLOAD_DURATION_SEC,
  WALL_LEFT,
  WALL_RIGHT,
  WALL_TOP,
} from '../constants.js';
import { GameEngine } from '../GameEngine.js';
import { makeNormalCell } from '../BrickGrid.js';
import { levelWith } from './testkit.js';

function buildEngine(): GameEngine {
  // 右下角放一块普通砖：保证 remainingBreakable > 0（不会立刻判胜），
  // 同时远离测试球的运动区域。
  const level = levelWith([[41, 37, makeNormalCell(1, 0)]], 'skill-level');
  return new GameEngine({
    level,
    rng: () => 0.5,
    initialSkills: { multiLaunchCount: 1, tripleSplitCount: 2 },
  });
}

test('skill：100 球连按两次橙标裂变，活跃球数严格 ≤ 200', () => {
  const engine = buildEngine();
  assert.ok(engine.releaseBall(), '应能发出第一颗球');
  assert.equal(engine.currentPhase, 'PLAYING');

  // 补足到 100 颗球（分散在场地中上部，方向朝上）。
  for (let i = 0; i < 99; i++) {
    const x = 120 + (i % 20) * 24;
    const y = 300 + Math.floor(i / 20) * 40;
    const ball = engine.physics.spawnBall(x, y, 0, -BASE_BALL_SPEED);
    assert.ok(ball, `第 ${i + 1} 颗补充球应生成成功`);
  }
  assert.equal(engine.activeBallCount, 100);

  // 第一次裂变：100 球 → 需求 200 个新球，球池只剩 100 个空位。
  const first = engine.useTripleSplit();
  assert.equal(first.used, true);
  assert.equal(first.spawnedCount, 100);
  assert.equal(first.overflowCount, 100);
  assert.equal(engine.activeBallCount, 200);
  assert.ok(engine.activeBallCount <= MAX_PHYSICAL_BALLS);

  // 第二次裂变：球池已满，全部溢出。
  const second = engine.useTripleSplit();
  assert.equal(second.used, true);
  assert.equal(second.spawnedCount, 0);
  assert.equal(second.overflowCount, 400, '第二次裂变：200 球 × 2 全部溢出');
  assert.equal(engine.activeBallCount, 200, '活跃球数不得超过 200');
  assert.ok(engine.activeBallCount <= MAX_PHYSICAL_BALLS);

  // 库存按"消耗 1 个"结算。
  assert.equal(engine.skillInventory.tripleSplitCount, 0);
});

test('skill：溢出球数转化为伤害倍率 ×2 / ×3，并发出 DAMAGE_OVERLOAD 事件', () => {
  const engine = buildEngine();
  engine.releaseBall();
  for (let i = 0; i < 99; i++) {
    engine.physics.spawnBall(120 + (i % 20) * 24, 300 + Math.floor(i / 20) * 40, 0, -BASE_BALL_SPEED);
  }

  const first = engine.useTripleSplit();
  assert.equal(first.overloadMultiplier, OVERLOAD_DAMAGE_MULTIPLIER);
  assert.equal(engine.damageMultiplier(), OVERLOAD_DAMAGE_MULTIPLIER);
  assert.equal(engine.skills.overloadRemainingSec, OVERLOAD_DURATION_SEC);

  const second = engine.useTripleSplit();
  assert.equal(second.overloadMultiplier, OVERLOAD_DAMAGE_MULTIPLIER_HIGH);
  assert.equal(engine.damageMultiplier(), OVERLOAD_DAMAGE_MULTIPLIER_HIGH);

  const events = engine.drainEvents();
  const overloads = events.filter((e) => e.type === 'DAMAGE_OVERLOAD');
  assert.ok(overloads.length >= 2, '应至少发出两次 DAMAGE_OVERLOAD 事件');
  const last = overloads[overloads.length - 1]!;
  assert.ok(last.type === 'DAMAGE_OVERLOAD');
  assert.equal(last.multiplier, OVERLOAD_DAMAGE_MULTIPLIER_HIGH);
  assert.equal(last.expiresInSec, OVERLOAD_DURATION_SEC);
});

test('skill：高能破甲 8 秒后自动回落为 ×1', () => {
  const engine = buildEngine();
  engine.releaseBall();
  for (let i = 0; i < 99; i++) {
    engine.physics.spawnBall(120 + (i % 20) * 24, 300 + Math.floor(i / 20) * 40, 0, -BASE_BALL_SPEED);
  }
  engine.useTripleSplit();
  assert.equal(engine.damageMultiplier(), OVERLOAD_DAMAGE_MULTIPLIER);

  engine.skills.update(OVERLOAD_DURATION_SEC + 0.01);
  assert.equal(engine.damageMultiplier(), 1, '持续时间结束后倍率应回落');
  assert.equal(engine.skills.overloadActive, false);
});

test('skill：200 球满场运行 60 帧不越界、不出现 NaN，活跃球数始终 ≤ 200', () => {
  const engine = buildEngine();
  engine.releaseBall();
  for (let i = 0; i < 99; i++) {
    engine.physics.spawnBall(120 + (i % 20) * 24, 300 + Math.floor(i / 20) * 40, 0, -BASE_BALL_SPEED);
  }
  engine.useTripleSplit();
  engine.useTripleSplit();

  let peak = engine.activeBallCount;
  for (let frame = 0; frame < 60; frame++) {
    engine.update(1 / 60);
    peak = Math.max(peak, engine.activeBallCount);
    assert.ok(engine.activeBallCount <= MAX_PHYSICAL_BALLS, `第 ${frame + 1} 帧活跃球数越界`);
    for (const ball of engine.physics.balls) {
      if (!ball.active) continue;
      assert.ok(Number.isFinite(ball.x) && Number.isFinite(ball.y), '球坐标不得为 NaN');
      assert.ok(Number.isFinite(ball.vx) && Number.isFinite(ball.vy), '球速度不得为 NaN');
      assert.ok(
        ball.x >= WALL_LEFT - ball.radius - 1e-6 && ball.x <= WALL_RIGHT + ball.radius + 1e-6,
        `球 X 越界：${ball.x}`,
      );
      assert.ok(ball.y >= WALL_TOP - ball.radius - 1e-6, `球 Y 越界（顶部）：${ball.y}`);
      assert.ok(ball.y <= DEATH_LINE_Y + 64, `球 Y 越界（底部）：${ball.y}`);
    }
  }
  assert.ok(peak <= MAX_PHYSICAL_BALLS);
});

test('skill：蓝标连发一次发射 5 球并消耗 1 个蓝标，库存耗尽后不可用', () => {
  const engine = buildEngine();
  engine.releaseBall();
  const before = engine.activeBallCount;

  const used = engine.useMultiLaunch();
  assert.equal(used.used, true);
  assert.equal(used.spawnedCount, MULTI_LAUNCH_COUNT);
  assert.equal(engine.activeBallCount, before + MULTI_LAUNCH_COUNT);
  assert.equal(engine.skillInventory.multiLaunchCount, 0, '应消耗 1 个蓝标');

  const again = engine.useMultiLaunch();
  assert.equal(again.used, false, '库存为 0 时不可再次使用');
  assert.equal(again.spawnedCount, 0);
});

test('skill：每击碎 150 块砖交替奖励 +1 蓝标 / +1 橙标', () => {
  const engine = buildEngine();
  assert.equal(engine.skillInventory.multiLaunchCount, 1);
  assert.equal(engine.skillInventory.tripleSplitCount, 2);

  for (let i = 0; i < 150; i++) engine.onBrickDestroyed(0, 0);
  assert.equal(engine.skillInventory.multiLaunchCount, 2, '第 1 次充能应奖励蓝标');
  assert.equal(engine.skillInventory.tripleSplitCount, 2);

  for (let i = 0; i < 150; i++) engine.onBrickDestroyed(0, 0);
  assert.equal(engine.skillInventory.tripleSplitCount, 3, '第 2 次充能应奖励橙标');
  assert.equal(engine.skillInventory.multiLaunchCount, 2);

  const granted = engine.drainEvents().filter((e) => e.type === 'SKILL_GRANTED');
  assert.equal(granted.length, 2);
});

test('skill：非 PLAYING 阶段不可使用技能', () => {
  const engine = buildEngine();
  assert.equal(engine.currentPhase, 'READY_AIM');
  assert.equal(engine.useMultiLaunch().used, false);
  assert.equal(engine.useTripleSplit().used, false);
});
