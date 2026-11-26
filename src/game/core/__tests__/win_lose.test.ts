/**
 * Milestone 1 验收测试 ④：胜负判定
 *
 * 依据 `docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md` §7.4 / §2：
 *   - 可破坏砖清零（灰墙不计入）→ `WON`；
 *   - 所有球越过死亡线 `DEATH_LINE_Y = 1190` → `LOST`。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { DEATH_LINE_Y, FIXED_DT } from '../constants.js';
import { GameEngine } from '../GameEngine.js';
import { makeNormalCell, makeSteelCell } from '../BrickGrid.js';
import { levelWith } from './testkit.js';

test('win：清空全部 NORMAL 砖（仍有 STEEL 灰墙）→ WON', () => {
  const level = levelWith(
    [
      [5, 5, makeNormalCell(1, 0)],
      [6, 5, makeNormalCell(1, 1)],
      [7, 5, makeSteelCell(2)],
    ],
    'win-level',
  );
  const engine = new GameEngine({ level, rng: () => 0.5 });

  assert.ok(engine.releaseBall(), '应能发出第一颗球');
  assert.equal(engine.currentPhase, 'PLAYING');
  assert.equal(engine.remainingBreakable, 2);

  // 摧毁全部普通砖，灰墙保留。
  engine.grid.damage(5, 5, 999);
  engine.grid.damage(6, 5, 999);
  assert.equal(engine.remainingBreakable, 0, '可破坏砖应清零');
  assert.equal(engine.grid.at(7, 5)?.role, 'STEEL', '灰墙应仍然存在');

  engine.update(FIXED_DT);

  assert.equal(engine.currentPhase, 'WON');
  const won = engine.drainEvents().find((e) => e.type === 'GAME_WON');
  assert.ok(won, '应发出 GAME_WON 事件');
  assert.ok(won.type === 'GAME_WON');
  assert.equal(won.levelId, 'win-level');
});

test('win：胜负判定后不再推进物理', () => {
  const level = levelWith([[5, 5, makeNormalCell(1, 0)]], 'win-level-2');
  const engine = new GameEngine({ level, rng: () => 0.5 });
  engine.releaseBall();
  engine.grid.damage(5, 5, 999);
  engine.update(FIXED_DT);
  assert.equal(engine.currentPhase, 'WON');

  const elapsed = engine.elapsedTimeSec;
  for (let i = 0; i < 10; i++) engine.update(FIXED_DT);
  assert.equal(engine.elapsedTimeSec, elapsed, 'WON 之后逻辑时间不应继续推进');
});

test('lose：所有球越过死亡线 → LOST，并带上剩余砖比例', () => {
  const level = levelWith(
    [
      [5, 5, makeNormalCell(1, 0)],
      [6, 5, makeNormalCell(1, 1)],
      [20, 10, makeNormalCell(1, 2)],
    ],
    'lose-level',
  );
  const engine = new GameEngine({ level, rng: () => 0.5 });

  assert.ok(engine.releaseBall());
  assert.equal(engine.activeBallCount, 1);

  // 把球放到死亡线以下（并保持向下运动），物理层应判定出界并移除。
  const ball = engine.physics.balls[0]!;
  ball.x = 360;
  ball.y = DEATH_LINE_Y + ball.radius + 1;
  ball.vx = 0;
  ball.vy = 600;
  engine.update(FIXED_DT);

  assert.equal(engine.activeBallCount, 0);
  assert.equal(engine.currentPhase, 'LOST');

  const lost = engine.drainEvents().find((e) => e.type === 'GAME_LOST');
  assert.ok(lost, '应发出 GAME_LOST 事件');
  assert.ok(lost.type === 'GAME_LOST');
  assert.equal(lost.levelId, 'lose-level');
  assert.ok(lost.remainingRatio > 0 && lost.remainingRatio <= 1, '剩余砖比例应在 (0,1] 区间');
});

test('lose：球自然掉落出界同样触发 LOST', () => {
  const level = levelWith([[5, 5, makeNormalCell(1, 0)]], 'lose-level-2');
  const engine = new GameEngine({ level, rng: () => 0.5 });
  engine.releaseBall();

  const ball = engine.physics.balls[0]!;
  ball.x = 360;
  ball.y = 1150;
  ball.vx = 0;
  ball.vy = 600;

  for (let i = 0; i < 120 && engine.currentPhase === 'PLAYING'; i++) {
    engine.update(FIXED_DT);
  }

  assert.equal(engine.activeBallCount, 0);
  assert.equal(engine.currentPhase, 'LOST');
});

test('win/lose：restart 后回到 READY_AIM 且砖块与技能复位', () => {
  const level = levelWith(
    [
      [5, 5, makeNormalCell(1, 0)],
      [6, 5, makeSteelCell(1)],
    ],
    'restart-level',
  );
  const engine = new GameEngine({
    level,
    rng: () => 0.5,
    initialSkills: { multiLaunchCount: 1, tripleSplitCount: 1 },
  });

  engine.releaseBall();
  engine.grid.damage(5, 5, 999);
  engine.update(FIXED_DT);
  assert.equal(engine.currentPhase, 'WON');

  engine.restart();

  assert.equal(engine.currentPhase, 'READY_AIM');
  assert.equal(engine.activeBallCount, 0);
  assert.equal(engine.remainingBreakable, 1, '砖块应复原');
  assert.equal(engine.skillInventory.multiLaunchCount, 1);
  assert.equal(engine.skillInventory.tripleSplitCount, 1);
  assert.equal(engine.elapsedTimeSec, 0);
});

test('engine：暂停时物理与逻辑时间均不推进，恢复后继续', () => {
  const level = levelWith([[5, 5, makeNormalCell(1, 0)]], 'pause-level');
  const engine = new GameEngine({ level, rng: () => 0.5 });
  engine.releaseBall();

  engine.pause();
  assert.equal(engine.currentPhase, 'PAUSED');
  const elapsed = engine.elapsedTimeSec;
  for (let i = 0; i < 30; i++) engine.update(FIXED_DT);
  assert.equal(engine.elapsedTimeSec, elapsed, '暂停期间逻辑时间不应推进');

  engine.resume();
  assert.equal(engine.currentPhase, 'PLAYING');
  engine.update(FIXED_DT);
  assert.ok(engine.elapsedTimeSec > elapsed, '恢复后应继续推进');
});
