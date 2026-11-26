/**
 * 《碎砖大裂变》(Brick Fission) — Milestone 4 商业化内核测试
 *
 * 覆盖：
 *   - `GameEngine.revive()`：失败复活（保留已碎砖块进度 + 赠送球数 + 阶段回到 PLAYING）；
 *   - `GameEngine.grantSkill()`：技能补给（激励广告发放库存）；
 *   - `Layout.ts`：Banner 预留与安全区间距（`docs/04` §2 合规红线）。
 *
 * 纯 TypeScript：禁止出现任何宿主环境 API。
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  BANNER_RESERVED_HEIGHT,
  BANNER_SAFE_CLEARANCE,
  FIXED_DT,
  PADDLE_Y,
  REVIVE_BALL_COUNT,
  SAFE_AREA_TOP_MAX,
  SKILL_REFILL_COUNT,
} from '../constants.js';
import { GameEngine } from '../GameEngine.js';
import { makeNormalCell } from '../BrickGrid.js';
import { computeBannerLayout, computeSafeAreaPadding, verifyBannerClearance } from '../Layout.js';
import { levelWith } from './testkit.js';

/**
 * 构造一个「有砖但打不穿、且不在球道上」的关卡：
 * 99 血砖位于左侧远处，保证长时间轰击也不会清空；
 * 因此球出界时判定为 LOST 而不是 WON。
 */
function oneBrickLevel(): ReturnType<typeof levelWith> {
  return levelWith([[2, 5, makeNormalCell(99, 0)]], 'commercial-level');
}

/** 发球并推进到「所有球出界」的失败态。 */
function driveToLost(engine: GameEngine): void {
  engine.releaseBall();
  for (let i = 0; i < 6000; i++) {
    engine.update(FIXED_DT);
    if (engine.currentPhase === 'LOST') return;
  }
}

describe('core / 复活续关', () => {
  it('未失败时拒绝复活', () => {
    const engine = new GameEngine({ level: oneBrickLevel() });
    assert.equal(engine.currentPhase, 'READY_AIM');
    assert.equal(engine.revive(), false);
  });

  it('失败后复活：阶段回到 PLAYING 并补发默认球数', () => {
    const engine = new GameEngine({ level: oneBrickLevel() });
    driveToLost(engine);
    assert.equal(engine.currentPhase, 'LOST');

    const ok = engine.revive();
    assert.equal(ok, true);
    assert.equal(engine.currentPhase, 'PLAYING');
    assert.equal(engine.activeBallCount, REVIVE_BALL_COUNT);
  });

  it('复活保留已碎砖块进度（不重建网格）', () => {
    const engine = new GameEngine({ level: oneBrickLevel() });
    driveToLost(engine);
    const remainingBefore = engine.remainingBreakable;

    assert.equal(engine.revive(), true);
    assert.equal(engine.remainingBreakable, remainingBefore);
    assert.ok(engine.remainingBreakable > 0);
  });

  it('复活时发出 REVIVED 事件', () => {
    const engine = new GameEngine({ level: oneBrickLevel() });
    driveToLost(engine);
    engine.drainEvents();
    engine.revive();
    const events = engine.drainEvents();
    const revived = events.find((e) => e.type === 'REVIVED');
    assert.ok(revived, '应发出 REVIVED 事件');
    assert.equal(revived.type === 'REVIVED' ? revived.ballCount : -1, REVIVE_BALL_COUNT);
  });

  it('复活球从挡板上方扇形发出且速度朝上', () => {
    const engine = new GameEngine({ level: oneBrickLevel() });
    driveToLost(engine);
    engine.revive();
    const active = engine.physics.balls.filter((b) => b.active);
    assert.equal(active.length, REVIVE_BALL_COUNT);
    for (const ball of active) {
      assert.ok(ball.vy < 0, '复活球必须向上发射');
      assert.ok(ball.y < PADDLE_Y, '复活球应在挡板上方');
    }
    // 3 颗球左右对称（中轴一颗）。
    const vxs = active.map((b) => b.vx);
    assert.ok(vxs.some((vx) => Math.abs(vx) < 1e-6), '应包含一颗垂直向上的球');
  });

  it('复活次数非法（0 / 负数）时拒绝', () => {
    const engine = new GameEngine({ level: oneBrickLevel() });
    driveToLost(engine);
    assert.equal(engine.revive(0), false);
    assert.equal(engine.revive(-3), false);
    assert.equal(engine.currentPhase, 'LOST');
  });
});

describe('core / 技能补给', () => {
  it('发放蓝标库存并返回新总数', () => {
    const engine = new GameEngine({ level: oneBrickLevel() });
    const before = engine.skillInventory.multiLaunchCount;
    const total = engine.grantSkill('MULTI_LAUNCH', SKILL_REFILL_COUNT);
    assert.equal(total, before + SKILL_REFILL_COUNT);
    assert.equal(engine.skillInventory.multiLaunchCount, before + SKILL_REFILL_COUNT);
  });

  it('发放橙标库存并返回新总数', () => {
    const engine = new GameEngine({ level: oneBrickLevel() });
    const before = engine.skillInventory.tripleSplitCount;
    const total = engine.grantSkill('TRIPLE_SPLIT', SKILL_REFILL_COUNT);
    assert.equal(total, before + SKILL_REFILL_COUNT);
    assert.equal(engine.skillInventory.tripleSplitCount, before + SKILL_REFILL_COUNT);
  });

  it('发放时发出 SKILL_GRANTED 事件', () => {
    const engine = new GameEngine({ level: oneBrickLevel() });
    engine.drainEvents();
    engine.grantSkill('MULTI_LAUNCH', 2);
    const events = engine.drainEvents();
    const granted = events.find((e) => e.type === 'SKILL_GRANTED');
    assert.ok(granted, '应发出 SKILL_GRANTED 事件');
    assert.equal(granted.type === 'SKILL_GRANTED' ? granted.skill : '', 'MULTI_LAUNCH');
  });
});

describe('core / Banner 与安全区布局', () => {
  it('Banner 可见时挡板操作线在其上方 ≥80px', () => {
    const layout = computeBannerLayout(true);
    assert.equal(layout.visible, true);
    assert.equal(layout.bannerTop, 1280 - BANNER_RESERVED_HEIGHT);
    assert.ok(layout.clearance !== null);
    assert.ok((layout.clearance ?? 0) >= BANNER_SAFE_CLEARANCE);
    assert.equal(layout.compliant, true);
    assert.ok(layout.interactiveBottom <= PADDLE_Y);
  });

  it('Banner 不可见时不需要预留', () => {
    const layout = computeBannerLayout(false);
    assert.equal(layout.visible, false);
    assert.equal(layout.clearance, null);
    assert.equal(layout.compliant, true);
  });

  it('挡板过于靠近 Banner 时判定不合规', () => {
    assert.equal(verifyBannerClearance(PADDLE_Y), true);
    assert.equal(verifyBannerClearance(1280 - BANNER_RESERVED_HEIGHT - 10), false);
  });

  it('安全区 padding 夹在 [0, SAFE_AREA_TOP_MAX]', () => {
    assert.equal(computeSafeAreaPadding({ safeAreaTop: 40, safeAreaBottom: 10 }).top, 40);
    assert.equal(computeSafeAreaPadding({ safeAreaTop: 400, safeAreaBottom: 0 }).top, SAFE_AREA_TOP_MAX);
    assert.equal(computeSafeAreaPadding({ safeAreaTop: -5, safeAreaBottom: -8 }).top, 0);
    assert.equal(computeSafeAreaPadding({ safeAreaTop: 90, safeAreaBottom: 34 }).bottom, 34);
  });
});
