/**
 * Milestone 1 附加测试：快进与残局收尾（`docs/01` §3.2 / §6）
 *
 *   - ×2 / ×3 快进必须**循环调用** N 次 `step(FIXED_DT)`，等价于 N 帧 ×1；
 *   - 残局：剩余可破坏砖 ≤ 3% 或 ≤ 12 块，且连续 6 秒无砖受击 → 激活
 *     `ENDGAME_ASSIST` 软追踪，撞墙 / 撞挡板时向最近剩余砖微调 ≤ 12°。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { ENDGAME_HOMING_DEG, ENDGAME_IDLE_SEC, FIXED_DT, WALL_TOP } from '../constants.js';
import { GameEngine } from '../GameEngine.js';
import { makeNormalCell } from '../BrickGrid.js';
import { levelWith } from './testkit.js';

/** 取活跃球的稳定快照（用于状态比对）。 */
function activeBalls(engine: GameEngine): Array<{
  x: number;
  y: number;
  vx: number;
  vy: number;
}> {
  const result: Array<{ x: number; y: number; vx: number; vy: number }> = [];
  for (const ball of engine.physics.balls) {
    if (!ball.active) continue;
    result.push({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy });
  }
  return result;
}

/** 航向角（度）：0 = 垂直向上，正值 = 朝右。 */
function headingDeg(vx: number, vy: number): number {
  return (Math.atan2(vx, -vy) * 180) / Math.PI;
}

/** 把角度差归一化到 [-180°, 180°)。 */
function wrapDeg(deg: number): number {
  return ((deg + 540) % 360) - 180;
}

/** 两个航向之间的夹角（度，0~180）。 */
function angleDiff(a: number, b: number): number {
  return Math.abs(wrapDeg(b - a));
}

test('fastforward：×3 快进 60 帧等价于 ×1 快进 180 帧', () => {
  const level = levelWith(
    [
      [21, 30, makeNormalCell(1, 0)],
      [21, 25, makeNormalCell(2, 1)],
      [21, 20, makeNormalCell(1, 2)],
    ],
    'ff-level',
  );

  const single = new GameEngine({ level, rng: () => 0.5 });
  const triple = new GameEngine({ level, rng: () => 0.5 });

  // 挡板保持静止，避免跟随速度差异干扰比对。
  single.setPaddleTargetX(single.paddle.x);
  triple.setPaddleTargetX(triple.paddle.x);

  single.releaseBall();
  triple.releaseBall();

  for (let i = 0; i < 180; i++) single.update(FIXED_DT);

  triple.setSpeedMultiplier(3);
  for (let i = 0; i < 60; i++) triple.update(FIXED_DT);

  assert.equal(triple.currentSpeedMultiplier, 3);
  assert.ok(
    Math.abs(single.elapsedTimeSec - triple.elapsedTimeSec) < 1e-9,
    `逻辑时长应一致：${single.elapsedTimeSec} vs ${triple.elapsedTimeSec}`,
  );
  assert.ok(
    Math.abs(triple.elapsedTimeSec - 180 * FIXED_DT) < 1e-9,
    '×3 快进应推进 3 个固定步长',
  );
  assert.equal(single.remainingBreakable, triple.remainingBreakable);
  assert.equal(single.currentPhase, triple.currentPhase);

  const a = activeBalls(single);
  const b = activeBalls(triple);
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.ok(Math.abs(a[i]!.x - b[i]!.x) < 1e-9, '球 X 应一致');
    assert.ok(Math.abs(a[i]!.y - b[i]!.y) < 1e-9, '球 Y 应一致');
    assert.ok(Math.abs(a[i]!.vx - b[i]!.vx) < 1e-9, '球 VX 应一致');
    assert.ok(Math.abs(a[i]!.vy - b[i]!.vy) < 1e-9, '球 VY 应一致');
  }
});

test('fastforward：×3 快进不会放大单步位移（按固定步长推进）', () => {
  const level = levelWith([[21, 30, makeNormalCell(1, 0)]], 'ff-displace');
  const engine = new GameEngine({ level, rng: () => 0.5 });
  engine.setPaddleTargetX(engine.paddle.x);
  engine.releaseBall();
  engine.setSpeedMultiplier(3);

  const before = activeBalls(engine)[0]!;
  engine.update(FIXED_DT);
  const after = activeBalls(engine)[0]!;

  const speed = Math.hypot(before.vx, before.vy);
  const travelled = Math.hypot(after.x - before.x, after.y - before.y);
  // 3 个固定子步，总位移上限 = speed * FIXED_DT * 3。
  assert.ok(travelled <= speed * FIXED_DT * 3 + 1e-6, `位移不应超过 3 个固定步长，实际 ${travelled}`);
});

test('endgame：连续 ENDGAME_IDLE_SEC 秒无砖受击且剩余 ≤ 12 块时激活软追踪', () => {
  // 仅剩 1 块砖，且位置远离球的运动区域，保证阈值时间内不会击中砖块。
  const level = levelWith([[38, 2, makeNormalCell(1, 0)]], 'endgame-level');
  const engine = new GameEngine({ level, rng: () => 0.5 });

  engine.setPaddleTargetX(100);
  for (let i = 0; i < 30; i++) engine.update(FIXED_DT); // 让挡板移动到位
  engine.releaseBall();

  // 空闲阈值前 0.1 秒：尚未达到 ENDGAME_IDLE_SEC 空闲阈值。
  const idleFrames = Math.round((ENDGAME_IDLE_SEC - 0.1) / FIXED_DT);
  for (let i = 0; i < idleFrames; i++) engine.update(FIXED_DT);
  assert.equal(engine.isEndgameAssistActive, false, '未满空闲阈值不应激活残局辅助');
  assert.equal(engine.remainingBreakable, 1);

  // 继续推进到空闲阈值之后。
  for (let i = 0; i < 60; i++) engine.update(FIXED_DT);
  assert.equal(engine.isEndgameAssistActive, true, '满空闲阈值无砖受击应激活残局辅助');
  assert.deepEqual(engine.endgameTarget, { col: 38, row: 2 });

  const events = engine.drainEvents();
  const assist = events.find((event) => event.type === 'ENDGAME_ASSIST');
  assert.ok(assist, '应发出 ENDGAME_ASSIST 事件');
  assert.equal(assist.type === 'ENDGAME_ASSIST' ? assist.targetCol : -1, 38);
});

test('endgame：软追踪偏转不超过 ENDGAME_HOMING_DEG，且方向指向目标砖', () => {
  const level = levelWith([[38, 2, makeNormalCell(1, 0)]], 'endgame-homing');
  const engine = new GameEngine({ level, rng: () => 0.5 });

  engine.setPaddleTargetX(100);
  for (let i = 0; i < 30; i++) engine.update(FIXED_DT);
  engine.releaseBall();

  for (let i = 0; i < 420; i++) engine.update(FIXED_DT);
  assert.equal(engine.isEndgameAssistActive, true);

  const targetRect = engine.grid.cellRect(38, 2);
  const targetX = targetRect.x + targetRect.width * 0.5;
  const targetY = targetRect.y + targetRect.height * 0.5;

  // 等待下一次顶墙反弹：竖直速度变号且球面贴住顶墙。
  let observed = false;
  for (let i = 0; i < 240 && !observed; i++) {
    const before = engine.physics.balls.find((b) => b.active);
    if (!before) break;
    const headingBefore = headingDeg(before.vx, before.vy);
    const vyBefore = before.vy;

    // 挡板跟随球，保证球能持续弹跳（软追踪会把球推向右侧）。
    engine.setPaddleTargetX(before.x);
    engine.update(FIXED_DT);

    const after = engine.physics.balls.find((b) => b.active);
    if (!after) break;
    const isTopWallBounce =
      vyBefore < 0 && after.vy > 0 && after.y - after.radius <= WALL_TOP + 40;
    if (!isTopWallBounce) continue;

    observed = true;
    // 顶墙是水平面：vy 反号、vx 不变 → 纯反射航向 = 180° - 反弹前航向。
    const pure = 180 - headingBefore;
    const actual = headingDeg(after.vx, after.vy);
    const deviation = wrapDeg(actual - pure);
    assert.ok(
      Math.abs(deviation) <= ENDGAME_HOMING_DEG + 1e-6,
      `软追踪偏转应 ≤ ${ENDGAME_HOMING_DEG}°，实际 ${deviation}`,
    );

    // 软追踪应让球更靠近目标砖方向。
    const desired = headingDeg(targetX - after.x, -(targetY - after.y));
    assert.ok(
      angleDiff(actual, desired) <= angleDiff(pure, desired) + 1e-9,
      '软追踪后球应不比纯反射更偏离目标砖',
    );
  }
  assert.ok(observed, '应观测到一次顶墙反弹');
});
