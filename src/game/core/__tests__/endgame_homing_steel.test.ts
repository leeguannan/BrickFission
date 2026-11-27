/**
 * Milestone 1 附加测试：残局软追踪的**防吸墙**行为。
 *
 * 背景（架构师 Code Review 2026-11-27）：
 * 残局软追踪会把球朝「最近剩余可碎砖」偏转，若该方向紧邻着 STEEL 钢墙，
 * 硬偏转只会让球贴着钢墙来回弹，破砖率归零。
 *
 * 期望行为：
 *   - 目标方向被钢墙挡住 → 改沿**切向**微幅脱困（切向上限 = ENDGAME_HOMING_DEG ×
 *     SOFT_HOMING_TANGENT_FACTOR），且切向本身也不能指向钢墙；
 *   - 两侧切向都被钢墙挡住 → 本次**不偏转**，保持当前航向。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ENDGAME_HOMING_DEG,
  ENDGAME_IDLE_SEC,
  FIXED_DT,
  SOFT_HOMING_TANGENT_FACTOR,
} from '../constants.js';
import { GameEngine } from '../GameEngine.js';
import { makeNormalCell, makeSteelCell } from '../BrickGrid.js';
import type { Ball } from '../types.js';
import { levelWith } from './testkit.js';

/** 切向脱困的角度上限（度）。 */
const TANGENT_LIMIT_DEG = ENDGAME_HOMING_DEG * SOFT_HOMING_TANGENT_FACTOR;

/** 航向角（度）：0 = 垂直向上，正值 = 朝右。 */
function headingDeg(vx: number, vy: number): number {
  return (Math.atan2(vx, -vy) * 180) / Math.PI;
}

/**
 * 构造一个已进入残局软追踪状态的引擎，并返回一个停在指定位置的球。
 *
 * 网格坐标（42×38，cellSize=16，originX=24，originY=146）：
 *   - col 21 → x 360..376（中心 368）
 *   - col 22 → x 376..392（中心 384）
 *   - col 23 → x 392..408（中心 400）
 *   - row 2  → y 178..194（中心 186）
 *   - row 6  → y 242..258
 *   - row 7  → y 258..274（中心 266）
 */
function buildEndgameEngine(
  specs: Array<[number, number, ReturnType<typeof makeNormalCell> | ReturnType<typeof makeSteelCell>]>,
  id: string,
): { engine: GameEngine; ball: Ball } {
  const engine = new GameEngine({ level: levelWith(specs, id), rng: () => 0.5 });

  // 残局软追踪只在 PLAYING 阶段且 endgameAssistActive 时生效：
  // 剩余砖数 ≤ ENDGAME_REMAINING_COUNT 且连续 ENDGAME_IDLE_SEC 秒无砖受击。
  engine.releaseBall();
  const frames = Math.ceil((ENDGAME_IDLE_SEC + 1) / FIXED_DT);
  for (let i = 0; i < frames; i += 1) {
    // 把球钉在战场底部，避免干扰「无砖受击」的空闲计时。
    for (const b of engine.physics.balls) {
      if (!b.active) continue;
      b.x = 368;
      b.y = 1100;
      b.vx = 0;
      b.vy = 0;
    }
    engine.update(FIXED_DT);
  }
  assert.equal(engine.isEndgameAssistActive, true, '应已进入残局辅助状态');

  const ball = engine.physics.balls.find((b) => b.active);
  assert.ok(ball, '应仍有活跃球');
  return { engine, ball };
}

test('endgame：目标方向紧邻 STEEL 时改走切向脱困，不朝钢墙硬偏转', () => {
  // 目标砖在 (23,2)（中心 400,186）；球在 (21,7)（中心 368,266）→ 期望方向约 21.8°。
  // STEEL(21,6) 恰好挡在目标方向上 → 软追踪不得把球直接推向钢墙。
  const { engine, ball } = buildEndgameEngine(
    [
      [23, 2, makeNormalCell(1, 0)],
      [21, 6, makeSteelCell(7)],
    ],
    'homing-steel-tangent',
  );

  ball.x = 368;
  ball.y = 266;
  ball.vx = 0;
  ball.vy = -600;
  engine.onBoundaryBounce(ball);

  const heading = headingDeg(ball.vx, ball.vy);
  assert.ok(ball.vy < 0, '球应继续向上');
  assert.ok(
    Math.abs(heading) <= TANGENT_LIMIT_DEG + 1e-6,
    `被钢墙挡住时应走切向（≤ ${TANGENT_LIMIT_DEG}°），实际偏转 ${heading}°`,
  );
  // 反证：若未做防吸墙处理，偏转会接近期望方向（约 21.8°）。
  assert.ok(
    Math.abs(heading) < 15,
    `不应朝钢墙方向偏转到 15° 以上，实际 ${heading}°`,
  );
});

test('endgame：两侧切向都被 STEEL 挡住时保持原航向，不偏转', () => {
  // STEEL(21,6) 与 STEEL(22,6) 同时挡住目标方向与两个切向 → 本次不偏转。
  const { engine, ball } = buildEndgameEngine(
    [
      [23, 2, makeNormalCell(1, 0)],
      [21, 6, makeSteelCell(7)],
      [22, 6, makeSteelCell(7)],
    ],
    'homing-steel-boxed',
  );

  ball.x = 368;
  ball.y = 266;
  ball.vx = 0;
  ball.vy = -600;
  engine.onBoundaryBounce(ball);

  assert.equal(ball.vx, 0, '两侧都被钢墙挡住时应保持垂直航向');
  assert.ok(ball.vy < 0, '球应继续向上');
});

test('endgame：无钢墙阻挡时软追踪仍按 ENDGAME_HOMING_DEG 上限朝目标偏转', () => {
  const { engine, ball } = buildEndgameEngine([[23, 2, makeNormalCell(1, 0)]], 'homing-open');

  ball.x = 368;
  ball.y = 266;
  ball.vx = 0;
  ball.vy = -600;
  engine.onBoundaryBounce(ball);

  const heading = headingDeg(ball.vx, ball.vy);
  assert.ok(heading > 0, '应朝右上方目标偏转');
  assert.ok(
    heading <= ENDGAME_HOMING_DEG + 1e-6,
    `偏转应 ≤ ${ENDGAME_HOMING_DEG}°，实际 ${heading}°`,
  );
});
