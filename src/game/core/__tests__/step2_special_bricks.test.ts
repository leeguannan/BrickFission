/**
 * Milestone 5 / Step 2 — 特殊微砖块与精准接球 Fever 单测
 *
 * 覆盖：
 *   - BOMB：3×3 邻域冲击波、连环引爆与深度上限、钢墙永不破坏；
 *   - PRISM：按**入射方向**分裂子球、球池满时溢出转伤害倍率；
 *   - CORE：立即发放技能充能 + 给场上球附加穿透力；
 *   - 穿透语义：穿透 1 血普通砖不反弹，撞 STEEL 仍正常反弹且不消耗穿透；
 *   - 精准接球与 Fever 暴走状态机（能量累计 / 激活 / 持续 / 结束 / 重开）。
 *
 * 纯 TypeScript：不含任何宿主环境 API。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BASE_BALL_SPEED,
  BOMB_CHAIN_MAX_DEPTH,
  CORE_PIERCE_COUNT,
  FEVER_COMBO_BONUS,
  FEVER_DAMAGE_MULTIPLIER,
  FEVER_DURATION_SEC,
  FEVER_ENERGY_MAX,
  FEVER_ENERGY_PER_CATCH,
  FIXED_DT,
  MAX_PHYSICAL_BALLS,
  OVERLOAD_DAMAGE_MULTIPLIER,
  PRISM_SPLIT_ANGLE_DEG,
  PRISM_SPLIT_COUNT,
  PRECISE_CATCH_THRESHOLD,
} from '../constants.js';
import { GameEngine } from '../GameEngine.js';
import { makeNormalCell, makeSteelCell } from '../BrickGrid.js';
import type { Ball, BrickCell, GameEvent, LevelRuntimeConfig } from '../types.js';
import { levelWith, makeSpecialCell } from './testkit.js';

/* ------------------------------------------------------------------ */
/* 夹具                                                                */
/* ------------------------------------------------------------------ */

/** 构造只含特殊砖与少量参照砖的关卡。 */
function buildLevel(specs: Array<[number, number, BrickCell]>, id = 'step2-level'): LevelRuntimeConfig {
  return levelWith(specs, id);
}

/** 格子中心坐标（逻辑坐标）。 */
function cellCenter(engine: GameEngine, col: number, row: number): { x: number; y: number } {
  const rect = engine.grid.cellRect(col, row);
  return { x: rect.x + rect.width * 0.5, y: rect.y + rect.height * 0.5 };
}

/** 推进物理直到条件成立（最多 maxFrames 帧）。 */
function stepUntil(engine: GameEngine, predicate: () => boolean, maxFrames = 300): boolean {
  for (let i = 0; i < maxFrames; i++) {
    engine.physics.step(FIXED_DT);
    if (predicate()) return true;
  }
  return predicate();
}

/** 在指定列正下方生成一颗竖直向上的球。 */
function spawnUpwardBall(engine: GameEngine, col: number, row: number, gapRows = 8): Ball {
  const target = cellCenter(engine, col, row);
  const ball = engine.physics.spawnBall(target.x, target.y + gapRows * 16, 0, -BASE_BALL_SPEED);
  assert.ok(ball, '测试球应生成成功');
  return ball;
}

/** 推进若干秒（保持挡板跟随球，避免球出界导致阶段切换）。 */
function runSeconds(engine: GameEngine, seconds: number): void {
  const frames = Math.ceil(seconds * 60);
  for (let i = 0; i < frames; i++) {
    const ball = engine.physics.balls.find((b) => b.active);
    if (ball) engine.setPaddleTargetX(ball.x);
    engine.update(1 / 60);
    if (engine.currentPhase === 'LOST') engine.revive(3);
  }
}

/** 从事件流中挑出指定类型。 */
function eventsOfType<T extends GameEvent['type']>(
  events: GameEvent[],
  type: T,
): Extract<GameEvent, { type: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

/** 3×3 邻域的 8 个偏移（不含中心）。 */
const RING8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/* ------------------------------------------------------------------ */
/* BOMB                                                               */
/* ------------------------------------------------------------------ */

test('special：BOMB 冲击波摧毁 3×3 邻域内的全部可破坏砖（8 格）', () => {
  const specs: Array<[number, number, BrickCell]> = [[21, 10, makeSpecialCell('BOMB')]];
  for (const [dc, dr] of RING8) specs.push([21 + dc, 10 + dr, makeNormalCell(1, 0)]);
  const engine = new GameEngine({ level: buildLevel(specs, 'bomb-blast'), rng: () => 0.5 });

  // 直接触发冲击波（等价于物理层在炸弹被击碎的瞬间上抛）。
  engine.grid.damage(21, 10, 99);
  assert.equal(engine.grid.at(21, 10)!.role, 'EMPTY');
  const center = cellCenter(engine, 21, 10);
  engine.onSpecialBrickDestroyed('BOMB', 21, 10, center.x, center.y, 0, -BASE_BALL_SPEED);

  let destroyed = 0;
  for (const [dc, dr] of RING8) {
    if (engine.grid.at(21 + dc, 10 + dr)!.role === 'EMPTY') destroyed++;
  }
  assert.equal(destroyed, 8, '3×3 邻域的 8 个邻居应全部被冲击波摧毁');
});

test('special：BOMB 被球击碎后触发冲击波（球驱动集成路径）', () => {
  // 炸弹正下方留出通道（(21,11) 为空），保证自下而上的球先命中炸弹本身。
  const specs: Array<[number, number, BrickCell]> = [[21, 10, makeSpecialCell('BOMB')]];
  for (const [dc, dr] of RING8) {
    if (dc === 0 && dr === 1) continue; // 正下方留空
    specs.push([21 + dc, 10 + dr, makeNormalCell(1, 0)]);
  }
  const engine = new GameEngine({ level: buildLevel(specs, 'bomb-driven'), rng: () => 0.5 });
  spawnUpwardBall(engine, 21, 10);

  assert.ok(stepUntil(engine, () => engine.grid.at(21, 10)!.role === 'EMPTY'), '炸弹砖应被击碎');
  let destroyed = 0;
  for (const [dc, dr] of RING8) {
    if (dc === 0 && dr === 1) continue;
    if (engine.grid.at(21 + dc, 10 + dr)!.role === 'EMPTY') destroyed++;
  }
  assert.equal(destroyed, 7, '邻域内 7 个可破坏砖应被冲击波摧毁');
});

test('special：BOMB 冲击波不破坏 STEEL 钢墙', () => {
  const engine = new GameEngine({
    level: buildLevel(
      [
        [21, 10, makeSpecialCell('BOMB')],
        [22, 10, makeSteelCell(7)],
        [21, 9, makeSteelCell(7)],
        [22, 9, makeSteelCell(7)],
      ],
      'bomb-steel',
    ),
    rng: () => 0.5,
  });
  spawnUpwardBall(engine, 21, 10);
  assert.ok(stepUntil(engine, () => engine.grid.at(21, 10)!.role === 'EMPTY'), '炸弹砖应被击碎');

  assert.equal(engine.grid.at(22, 10)!.role, 'STEEL', '钢墙不得被爆破破坏');
  assert.equal(engine.grid.at(21, 9)!.role, 'STEEL', '钢墙不得被爆破破坏');
  assert.equal(engine.grid.at(22, 9)!.role, 'STEEL', '钢墙不得被爆破破坏');
  assert.equal(engine.grid.at(22, 10)!.hp, 9999, '钢墙血量不得变化');
});

test('special：BOMB 连环引爆相邻炸弹，二阶爆炸继续摧毁邻砖', () => {
  const engine = new GameEngine({
    level: buildLevel(
      [
        [21, 10, makeSpecialCell('BOMB')],
        [22, 10, makeSpecialCell('BOMB')],
        [23, 10, makeNormalCell(1, 0)],
        [23, 9, makeNormalCell(1, 0)],
      ],
      'bomb-chain',
    ),
    rng: () => 0.5,
  });
  spawnUpwardBall(engine, 21, 10);
  assert.ok(stepUntil(engine, () => engine.grid.at(22, 10)!.role === 'EMPTY'), '相邻炸弹应被连环引爆');

  assert.equal(engine.grid.at(22, 10)!.role, 'EMPTY', '相邻炸弹应被连环引爆');
  assert.equal(engine.grid.at(23, 10)!.role, 'EMPTY', '二阶爆炸应摧毁再相邻的普通砖');
  assert.equal(engine.grid.at(23, 9)!.role, 'EMPTY', '二阶爆炸应摧毁对角普通砖');
});

test('special：BOMB 连环深度受 BOMB_CHAIN_MAX_DEPTH 限制，不会无限递归', () => {
  const specs: Array<[number, number, BrickCell]> = [];
  for (let col = 10; col <= 20; col++) specs.push([col, 10, makeSpecialCell('BOMB')]);
  const engine = new GameEngine({ level: buildLevel(specs, 'bomb-depth'), rng: () => 0.5 });
  spawnUpwardBall(engine, 10, 10);
  assert.ok(stepUntil(engine, () => engine.grid.at(10, 10)!.role === 'EMPTY'), '首颗炸弹应被击碎');

  // 链式引爆最多推进 BOMB_CHAIN_MAX_DEPTH 层，超出的炸弹只会受伤不会被引爆。
  const chainEnd = 10 + BOMB_CHAIN_MAX_DEPTH + 1;
  for (let col = 10; col <= chainEnd; col++) {
    assert.equal(engine.grid.at(col, 10)!.role, 'EMPTY', `第 ${col - 10} 层炸弹应被摧毁`);
  }
  assert.equal(engine.grid.at(chainEnd + 1, 10)!.role, 'BOMB', '超出深度上限的炸弹不应被引爆');
});

test('special：BOMB_EXPLODED 事件携带坐标与影响数量', () => {
  const specs: Array<[number, number, BrickCell]> = [[21, 10, makeSpecialCell('BOMB')]];
  specs.push([22, 10, makeNormalCell(1, 0)]);
  const engine = new GameEngine({ level: buildLevel(specs, 'bomb-event'), rng: () => 0.5 });
  spawnUpwardBall(engine, 21, 10);
  assert.ok(stepUntil(engine, () => engine.grid.at(21, 10)!.role === 'EMPTY'));

  const events = eventsOfType(engine.drainEvents(), 'BOMB_EXPLODED');
  assert.equal(events.length, 1, '应发出且仅发出一次 BOMB_EXPLODED');
  const evt = events[0]!;
  assert.equal(evt.col, 21);
  assert.equal(evt.row, 10);
  assert.ok(evt.affectedCount >= 1, '影响数量应大于 0');
  assert.ok(Number.isFinite(evt.x) && Number.isFinite(evt.y));
});

/* ------------------------------------------------------------------ */
/* PRISM                                                              */
/* ------------------------------------------------------------------ */

test('special：PRISM 被击碎按当前速度方向分裂出子球', () => {
  const engine = new GameEngine({
    level: buildLevel([[21, 10, makeSpecialCell('PRISM')]], 'prism-split'),
    rng: () => 0.5,
  });
  spawnUpwardBall(engine, 21, 10);
  assert.ok(stepUntil(engine, () => engine.grid.at(21, 10)!.role === 'EMPTY'));

  const events = eventsOfType(engine.drainEvents(), 'PRISM_SPLIT');
  assert.equal(events.length, 1);
  assert.equal(events[0]!.spawnedCount, PRISM_SPLIT_COUNT);
  assert.equal(engine.activeBallCount, PRISM_SPLIT_COUNT + 1, '原球 + 2 颗子球');
});

test('special：PRISM 子球方向为入射方向左右各偏 PRISM_SPLIT_ANGLE_DEG', () => {
  const engine = new GameEngine({
    level: buildLevel([[21, 10, makeSpecialCell('PRISM')]], 'prism-angle'),
    rng: () => 0.5,
  });
  const ball = spawnUpwardBall(engine, 21, 10);
  assert.ok(stepUntil(engine, () => engine.grid.at(21, 10)!.role === 'EMPTY'));

  const active = engine.physics.balls.filter((b) => b.active);
  assert.equal(active.length, PRISM_SPLIT_COUNT + 1);
  const childAngles = active
    .filter((b) => b !== ball)
    .map((b) => Math.abs((Math.atan2(b.vx, -b.vy) * 180) / Math.PI));
  assert.equal(childAngles.length, PRISM_SPLIT_COUNT);
  for (const angle of childAngles) {
    assert.ok(
      Math.abs(angle - PRISM_SPLIT_ANGLE_DEG) < 1e-6,
      `子球偏角应为 ${PRISM_SPLIT_ANGLE_DEG}°，实际 ${angle}°`,
    );
  }
});

test('special：PRISM 球池已满时溢出转化为伤害倍率，活跃球数不越界', () => {
  const engine = new GameEngine({
    level: buildLevel([[21, 10, makeSpecialCell('PRISM')]], 'prism-overflow'),
    rng: () => 0.5,
  });
  // 用静止球填满球池（全部叠放在空区 (1,1) 之外的空位，避开棱镜与测试球路径）。
  for (let i = 0; i < MAX_PHYSICAL_BALLS - 1; i++) {
    assert.ok(engine.physics.spawnBall(40, 170, 0, 0), `填充第 ${i + 1} 颗球应成功`);
  }
  assert.equal(engine.activeBallCount, MAX_PHYSICAL_BALLS - 1);

  spawnUpwardBall(engine, 21, 10);
  assert.equal(engine.activeBallCount, MAX_PHYSICAL_BALLS, '球池应已满');
  assert.ok(stepUntil(engine, () => engine.grid.at(21, 10)!.role === 'EMPTY'), '棱镜砖应被击碎');

  assert.equal(engine.activeBallCount, MAX_PHYSICAL_BALLS, '活跃球数不得越过 200 上限');
  const events = engine.drainEvents();
  const splits = eventsOfType(events, 'PRISM_SPLIT');
  assert.equal(splits.length, 1);
  assert.equal(splits[0]!.spawnedCount, 0, '球池满时不应分裂出子球');
  const overloads = eventsOfType(events, 'DAMAGE_OVERLOAD');
  assert.equal(overloads.length, 1, '溢出应发出一次 DAMAGE_OVERLOAD');
  assert.equal(overloads[0]!.multiplier, OVERLOAD_DAMAGE_MULTIPLIER);
  assert.equal(engine.damageMultiplier(), OVERLOAD_DAMAGE_MULTIPLIER, '溢出应转化为 ×2 伤害倍率');
});

/* ------------------------------------------------------------------ */
/* CORE                                                               */
/* ------------------------------------------------------------------ */

test('special：CORE 被击碎立即发放 +1 随机技能充能', () => {
  const engine = new GameEngine({
    level: buildLevel([[21, 10, makeSpecialCell('CORE', 1)]], 'core-grant'),
    rng: () => 0.1,
    initialSkills: { multiLaunchCount: 0, tripleSplitCount: 0 },
  });
  spawnUpwardBall(engine, 21, 10);
  assert.ok(stepUntil(engine, () => engine.grid.at(21, 10)!.role === 'EMPTY'));

  const events = eventsOfType(engine.drainEvents(), 'CORE_GRANTED');
  assert.equal(events.length, 1);
  const evt = events[0]!;
  assert.equal(evt.skill, 'MULTI_LAUNCH', 'rng=0.1 应发放蓝标');
  assert.equal(evt.total, 1);
  assert.equal(engine.skillInventory.multiLaunchCount, 1);
  assert.equal(engine.skillInventory.tripleSplitCount, 0);
});

test('special：CORE 被击碎给场上球附加穿透力', () => {
  const engine = new GameEngine({
    level: buildLevel([[21, 10, makeSpecialCell('CORE', 1)]], 'core-pierce'),
    rng: () => 0.5,
  });
  const ball = spawnUpwardBall(engine, 21, 10);
  assert.ok(stepUntil(engine, () => engine.grid.at(21, 10)!.role === 'EMPTY'));
  assert.equal(ball.pierceCount, CORE_PIERCE_COUNT, '场上球应获得穿透次数');
});

/* ------------------------------------------------------------------ */
/* 穿透语义                                                            */
/* ------------------------------------------------------------------ */

test('special：穿透状态下球穿过 1 血普通砖不反弹', () => {
  const engine = new GameEngine({
    level: buildLevel([[21, 10, makeNormalCell(1, 0)]], 'pierce-normal'),
    rng: () => 0.5,
  });
  const ball = spawnUpwardBall(engine, 21, 10);
  ball.pierceCount = 1;
  const vyBefore = ball.vy;
  assert.ok(stepUntil(engine, () => engine.grid.at(21, 10)!.role === 'EMPTY'));

  assert.ok(ball.vy < 0, '穿透后球应继续向上（不反弹）');
  assert.ok(ball.vy <= vyBefore + 1e-9, '垂直速度不应被翻转');
  assert.equal(ball.pierceCount, 0, '穿透次数应被消耗');
});

test('special：穿透状态下撞 STEEL 仍正常反弹且不消耗穿透次数', () => {
  const engine = new GameEngine({
    level: buildLevel([[21, 10, makeSteelCell(7)]], 'pierce-steel'),
    rng: () => 0.5,
  });
  const ball = spawnUpwardBall(engine, 21, 10);
  ball.pierceCount = 1;
  assert.ok(stepUntil(engine, () => ball.vy > 0));

  assert.ok(ball.vy > 0, '撞钢墙应反弹向下');
  assert.equal(ball.pierceCount, 1, '钢墙不消耗穿透次数');
  assert.equal(engine.grid.at(21, 10)!.role, 'STEEL');
});

/* ------------------------------------------------------------------ */
/* 精准接球与 Fever                                                   */
/* ------------------------------------------------------------------ */

test('special：精准接球（|offsetRatio| >= 0.65）累计 Fever 能量', () => {
  const engine = new GameEngine({
    level: buildLevel([[41, 36, makeNormalCell(99, 0)]], 'fever-catch'),
    rng: () => 0.5,
  });
  assert.ok(engine.releaseBall());
  assert.equal(engine.currentPhase, 'PLAYING');

  engine.onPaddleHit(PRECISE_CATCH_THRESHOLD);
  assert.equal(engine.feverSnapshot.energy, FEVER_ENERGY_PER_CATCH);
  const catches = eventsOfType(engine.drainEvents(), 'PRECISE_CATCH');
  assert.equal(catches.length, 1);
  assert.equal(catches[0]!.feverEnergy, FEVER_ENERGY_PER_CATCH);
});

test('special：挡板中央接球不累计 Fever 能量', () => {
  const engine = new GameEngine({
    level: buildLevel([[41, 36, makeNormalCell(99, 0)]], 'fever-center'),
    rng: () => 0.5,
  });
  assert.ok(engine.releaseBall());
  engine.onPaddleHit(0.2);
  engine.onPaddleHit(-0.3);
  assert.equal(engine.feverSnapshot.energy, 0, '未达阈值不应累计能量');
  assert.equal(eventsOfType(engine.drainEvents(), 'PRECISE_CATCH').length, 0);
});

test('special：Fever 能量满 100 自动进入暴走，伤害倍率 2×', () => {
  const engine = new GameEngine({
    level: buildLevel([[41, 36, makeNormalCell(99, 0)]], 'fever-activate'),
    rng: () => 0.5,
  });
  assert.ok(engine.releaseBall());

  const hits = FEVER_ENERGY_MAX / FEVER_ENERGY_PER_CATCH;
  for (let i = 0; i < hits; i++) engine.onPaddleHit(0.8);
  assert.equal(engine.feverSnapshot.energy, FEVER_ENERGY_MAX);
  assert.equal(engine.feverSnapshot.active, true);
  // Fever 的倍率走独立接口（只对「已受损砖」生效），全局倍率仍只由技能溢出决定。
  assert.equal(engine.damageMultiplier(), 1, 'Fever 不应改动全局（技能溢出）倍率');
  assert.equal(engine.feverDamageMultiplier(), FEVER_DAMAGE_MULTIPLIER);
  assert.equal(engine.feverSnapshot.damageMultiplier, FEVER_DAMAGE_MULTIPLIER);
  const activated = eventsOfType(engine.drainEvents(), 'FEVER_ACTIVATED');
  assert.equal(activated.length, 1);
  assert.equal(activated[0]!.durationSec, FEVER_DURATION_SEC);
});

test('special：Fever 持续约 6 秒后结束并清零能量', () => {
  const engine = new GameEngine({
    level: buildLevel([[41, 36, makeNormalCell(99, 0)]], 'fever-end'),
    rng: () => 0.5,
  });
  assert.ok(engine.releaseBall());
  const hits = FEVER_ENERGY_MAX / FEVER_ENERGY_PER_CATCH;
  for (let i = 0; i < hits; i++) engine.onPaddleHit(0.8);
  assert.equal(engine.feverSnapshot.active, true);
  engine.drainEvents();

  runSeconds(engine, FEVER_DURATION_SEC + 1.5);
  assert.equal(engine.feverSnapshot.active, false, 'Fever 应已结束');
  assert.equal(engine.feverSnapshot.energy, 0, '结束后能量应清零');
  assert.equal(engine.feverSnapshot.remainingSec, 0);
  assert.equal(engine.feverDamageMultiplier(), 1, '结束后 Fever 倍率回落到 1');
  assert.equal(engine.damageMultiplier(), 1, '结束后全局倍率回落到 1');
  assert.equal(eventsOfType(engine.drainEvents(), 'FEVER_ENDED').length, 1);
});

test('special：Fever 期间不再累计能量，且不发放全局穿透（守住 V1 回归红线）', () => {
  const engine = new GameEngine({
    level: buildLevel([[41, 36, makeNormalCell(99, 0)]], 'fever-active'),
    rng: () => 0.5,
  });
  assert.ok(engine.releaseBall());
  const hits = FEVER_ENERGY_MAX / FEVER_ENERGY_PER_CATCH;
  for (let i = 0; i < hits; i++) engine.onPaddleHit(0.8);
  assert.equal(engine.feverSnapshot.active, true);
  // Fever 只取「2× 伤害倍率」分支：不发放任何全场穿透，
  // 否则球不再在砖面反弹，千砖阵（第 18/19 关）破砖率会崩到 14%。
  for (const ball of engine.physics.balls) {
    assert.equal(ball.pierceCount, 0, 'Fever 不应给场上球发放穿透次数');
  }

  engine.onPaddleHit(0.9);
  assert.equal(engine.feverSnapshot.energy, FEVER_ENERGY_MAX, 'Fever 期间不再继续累计');
});

/* ------------------------------------------------------------------ */
/* Fever 伤害时序回归守卫（守住 V1 回归红线）                          */
/* ------------------------------------------------------------------ */

/**
 * 反复用一颗球正面撞击指定砖块，返回**击碎它所需的命中次数**。
 *
 * 每次命中前把球重新摆到砖块正下方并给一个向上的速度，
 * 因此击碎时序完全由 `PhysicsEngine.collideBricks` 的伤害结算决定。
 * 返回 -1 表示 `maxHits` 次内没打碎。
 */
function hitsToDestroy(engine: GameEngine, col: number, row: number, maxHits = 6): number {
  const target = cellCenter(engine, col, row);
  for (const b of engine.physics.balls) b.active = false;
  const ball = engine.physics.spawnBall(target.x, target.y + 120, 0, -BASE_BALL_SPEED);
  assert.ok(ball, '测试球应生成成功');

  for (let hit = 1; hit <= maxHits; hit++) {
    ball.x = target.x;
    ball.y = target.y + 120;
    ball.vx = 0;
    ball.vy = -BASE_BALL_SPEED;
    ball.pierceCount = 0;
    const before = engine.grid.at(col, row)!.hp;
    for (let step = 0; step < 30; step++) {
      engine.physics.step(FIXED_DT);
      const cell = engine.grid.at(col, row)!;
      if (cell.role === 'EMPTY' || cell.hp < before) break;
    }
    if (engine.grid.at(col, row)!.role === 'EMPTY') return hit;
  }
  return -1;
}

/** 构造一个只含单块指定血量普通砖的关卡，并进入 PLAYING。 */
function engineWithSingleBrick(hp: number, id: string): GameEngine {
  const engine = new GameEngine({
    level: buildLevel([[21, 10, makeNormalCell(hp, 0)]], id),
    rng: () => 0.5,
  });
  assert.ok(engine.releaseBall());
  for (const b of engine.physics.balls) b.active = false;
  return engine;
}

/** 把 Fever 能量打满并进入暴走。 */
function activateFever(engine: GameEngine): void {
  const hits = FEVER_ENERGY_MAX / FEVER_ENERGY_PER_CATCH;
  for (let i = 0; i < hits; i++) engine.onPaddleHit(0.8);
  assert.equal(engine.feverSnapshot.active, true, '应已进入 Fever 暴走');
}

test('special：Fever 对 1 血砖与基线等价（一击必碎）', () => {
  const engine = engineWithSingleBrick(1, 'fever-hp1');
  activateFever(engine);
  assert.equal(hitsToDestroy(engine, 21, 10), 1, '1 血砖在 Fever 下仍是一击必碎');
});

test('special：Fever 对 2 血砖不改变破碎时序（仍需两击）', () => {
  const engine = engineWithSingleBrick(2, 'fever-hp2');
  activateFever(engine);
  // 关键：Fever 的 2× 只对「已受损砖」生效，2 血砖仍是「一击掉到 1 血、第二击碎」。
  assert.equal(hitsToDestroy(engine, 21, 10), 2, '2 血砖在 Fever 下仍需两击（时序与基线一致）');
});

test('special：Fever 对 3 血砖加速（第 2 击即碎）', () => {
  const engine = engineWithSingleBrick(3, 'fever-hp3');
  activateFever(engine);
  // 3 血砖：第一击（满血，1×）→ 剩 2 血；第二击（已受损，2×）→ 直接击碎。
  assert.equal(hitsToDestroy(engine, 21, 10), 2, '3 血砖在 Fever 下第 2 击即碎（真实收益）');
});

test('special：Fever 期间连击计数翻倍（纯表现层，不影响物理）', () => {
  const normal = engineWithSingleBrick(1, 'combo-normal');
  assert.equal(hitsToDestroy(normal, 21, 10), 1);
  assert.equal(normal.combo, 1, '常规状态下击碎一块砖连击 +1');

  const fever = engineWithSingleBrick(1, 'combo-fever');
  activateFever(fever);
  assert.equal(hitsToDestroy(fever, 21, 10), 1);
  assert.equal(fever.combo, FEVER_COMBO_BONUS, 'Fever 期间击碎一块砖连击 +2');
});

test('special：restart() 重置 Fever 状态', () => {
  const engine = new GameEngine({
    level: buildLevel([[41, 36, makeNormalCell(99, 0)]], 'fever-restart'),
    rng: () => 0.5,
  });
  assert.ok(engine.releaseBall());
  const hits = FEVER_ENERGY_MAX / FEVER_ENERGY_PER_CATCH;
  for (let i = 0; i < hits; i++) engine.onPaddleHit(0.8);
  assert.equal(engine.feverSnapshot.active, true);

  engine.restart();
  assert.equal(engine.feverSnapshot.active, false);
  assert.equal(engine.feverSnapshot.energy, 0);
  assert.equal(engine.feverSnapshot.remainingSec, 0);
});

/* ------------------------------------------------------------------ */
/* 回归：既有普通砖与钢墙行为不变                                      */
/* ------------------------------------------------------------------ */

test('special：既有普通砖与钢墙行为不变（普通砖反弹、钢墙不可破）', () => {
  const engine = new GameEngine({
    level: buildLevel(
      [
        [21, 10, makeNormalCell(1, 0)],
        [30, 10, makeSteelCell(7)],
      ],
      'regression',
    ),
    rng: () => 0.5,
  });
  const normalBall = spawnUpwardBall(engine, 21, 10);
  assert.ok(stepUntil(engine, () => normalBall.vy > 0));
  assert.ok(normalBall.vy > 0, '普通砖应正常反弹');
  assert.equal(engine.grid.at(21, 10)!.role, 'EMPTY', '普通砖应被击碎');

  const steelBall = spawnUpwardBall(engine, 30, 10);
  assert.ok(stepUntil(engine, () => steelBall.vy > 0));
  assert.equal(engine.grid.at(30, 10)!.role, 'STEEL', '钢墙不应被破坏');
});
