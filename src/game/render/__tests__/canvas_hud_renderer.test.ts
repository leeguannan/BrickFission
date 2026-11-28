/**
 * 《碎砖大裂变》 — 微信端 Canvas HUD 渲染器单测
 *
 * 覆盖 Milestone 6 的 HUD 契约：
 *   1. **零 arc / 零渐变**（与 Canvas2DRenderer 同一条铁律，微信端同样不能破）；
 *   2. 顶部状态栏 / Fever 条 / 技能按钮角标 / READY_AIM 提示都要真的画出来；
 *   3. 弹窗与皮肤商店的文案齐全；
 *   4. 脏值缓存生效：数值不变时不重建文本（每帧 fillText 次数稳定）。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { FeverSnapshot, GamePhase } from '../../core/types.js';
import { computeHudLayout, feverBarRect } from '../../platform/CanvasHitTester.js';
import { CanvasHudRenderer, type CanvasHudModel } from '../CanvasHudRenderer.js';
import { makeMockCanvas, type Mock2DCtx } from './mocks.js';

function makeFever(overrides: Partial<FeverSnapshot> = {}): FeverSnapshot {
  return {
    energy: 0,
    maxEnergy: 100,
    active: false,
    remainingSec: 0,
    durationSec: 6,
    damageMultiplier: 1,
    ...overrides,
  };
}

function makeModel(overrides: Partial<CanvasHudModel> = {}): CanvasHudModel {
  return {
    phase: 'PLAYING',
    levelNo: 3,
    levelName: '钻洞',
    remainingBreakable: 120,
    totalBreakable: 340,
    coins: 88,
    speedMultiplier: 2,
    muted: false,
    paused: false,
    fever: makeFever(),
    multiLaunchCount: 2,
    tripleSplitCount: 1,
    aimHint: '',
    modal: null,
    shop: null,
    ...overrides,
  };
}

function makeRenderer(): { renderer: CanvasHudRenderer; ctx: Mock2DCtx } {
  const canvas = makeMockCanvas(720, 1280);
  const renderer = new CanvasHudRenderer({ layout: computeHudLayout({ safeAreaTop: 100 }) });
  return { renderer, ctx: canvas.ctx };
}

function textOf(ctx: Mock2DCtx): string[] {
  return ctx.textCalls.map((c) => c.text);
}

test('Canvas HUD · 绘制过程零 arc / 零渐变（微信端同守铁律）', () => {
  const { renderer, ctx } = makeRenderer();
  renderer.draw(ctx as unknown as CanvasRenderingContext2D, makeModel());
  assert.equal(ctx.counters.arc, 0);
  assert.equal(ctx.counters.createLinearGradient, 0);
  assert.equal(ctx.counters.createRadialGradient, 0);
  assert.ok(ctx.counters.fillRect > 0);
});

test('Canvas HUD · 顶部状态栏绘制关卡 / 剩余砖数 / 金币', () => {
  const { renderer, ctx } = makeRenderer();
  renderer.draw(ctx as unknown as CanvasRenderingContext2D, makeModel());
  const texts = textOf(ctx);
  assert.ok(texts.includes('3 关'));
  assert.ok(texts.includes('120/340'));
  assert.ok(texts.includes('币 88'));
});

test('Canvas HUD · 暂停 / 倍速 / 商店按钮文案存在', () => {
  const { renderer, ctx } = makeRenderer();
  renderer.draw(ctx as unknown as CanvasRenderingContext2D, makeModel({ speedMultiplier: 3 }));
  const texts = textOf(ctx);
  assert.ok(texts.includes('暂停'));
  assert.ok(texts.includes('3×'));
  assert.ok(texts.includes('商店'));
});

test('Canvas HUD · Fever 能量条随能量填充宽度变化', () => {
  const layout = computeHudLayout({ safeAreaTop: 100 });
  const bar = feverBarRect(layout);
  const { renderer, ctx } = makeRenderer();
  renderer.draw(ctx as unknown as CanvasRenderingContext2D, makeModel({ fever: makeFever({ energy: 50 }) }));
  // 半能量：能量条上应出现一段宽度为一半的填充
  assert.ok(
    ctx.fillRects.some((r) => r.y === bar.y && r.width === Math.round(bar.width * 0.5)),
    '半能量时缺少 50% 宽度的填充段',
  );
  const { renderer: r2, ctx: c2 } = makeRenderer();
  r2.draw(c2 as unknown as CanvasRenderingContext2D, makeModel({ fever: makeFever({ energy: 100 }) }));
  // 满能量：填充段铺满整条
  assert.ok(
    c2.fillRects.some((r) => r.y === bar.y && r.width === bar.width),
    '满能量时缺少铺满的填充段',
  );
});

test('Canvas HUD · Fever 激活时显示剩余时间文案', () => {
  const { renderer, ctx } = makeRenderer();
  renderer.draw(
    ctx as unknown as CanvasRenderingContext2D,
    makeModel({ fever: makeFever({ energy: 100, active: true, remainingSec: 3.24 }) }),
  );
  assert.ok(textOf(ctx).some((t) => t.startsWith('FEVER') && t.includes('3.2')));
});

test('Canvas HUD · 技能按钮余量角标绘制数量', () => {
  const { renderer, ctx } = makeRenderer();
  renderer.draw(ctx as unknown as CanvasRenderingContext2D, makeModel({ multiLaunchCount: 4, tripleSplitCount: 7 }));
  const texts = textOf(ctx);
  assert.ok(texts.includes('4'));
  assert.ok(texts.includes('7'));
  assert.ok(texts.includes('蓝'));
  assert.ok(texts.includes('橙'));
});

test('Canvas HUD · READY_AIM 阶段绘制瞄准提示', () => {
  const { renderer, ctx } = makeRenderer();
  renderer.draw(
    ctx as unknown as CanvasRenderingContext2D,
    makeModel({ phase: 'READY_AIM' as GamePhase, aimHint: '拖动瞄准，松手发球' }),
  );
  assert.ok(textOf(ctx).includes('拖动瞄准，松手发球'));
});

test('Canvas HUD · 弹窗绘制标题 / 正文 / 动作按钮', () => {
  const { renderer, ctx } = makeRenderer();
  renderer.draw(
    ctx as unknown as CanvasRenderingContext2D,
    makeModel({
      modal: {
        title: '通关！',
        body: '用时 42.0 秒',
        actions: [
          { id: 'double', label: '金币翻倍（观看激励）' },
          { id: 'restart', label: '重开本关' },
          { id: 'next', label: '下一关', primary: true },
        ],
      },
    }),
  );
  const texts = textOf(ctx);
  assert.ok(texts.includes('通关！'));
  assert.ok(texts.includes('用时 42.0 秒'));
  assert.ok(texts.includes('金币翻倍（观看激励）'));
  assert.ok(texts.includes('重开本关'));
  assert.ok(texts.includes('下一关'));
});

test('Canvas HUD · 皮肤商店绘制 3 款皮肤与状态', () => {
  const { renderer, ctx } = makeRenderer();
  renderer.draw(
    ctx as unknown as CanvasRenderingContext2D,
    makeModel({
      shop: {
        entries: [
          { id: 'capsule_blue', name: '经典蓝胶囊', price: 0, unlocked: true, equipped: true, canTrial: false },
          { id: 'bamboo_green', name: '翠竹节', price: 120, unlocked: false, equipped: false, canTrial: true },
          { id: 'minimal_white', name: '极简白', price: 200, unlocked: false, equipped: false, canTrial: true },
        ],
      },
    }),
  );
  const texts = textOf(ctx);
  assert.ok(texts.includes('皮肤商店'));
  assert.ok(texts.includes('经典蓝胶囊'));
  assert.ok(texts.includes('翠竹节'));
  assert.ok(texts.includes('极简白'));
  assert.ok(texts.includes('已装备'));
  assert.ok(texts.includes('120 金币'));
});

test('Canvas HUD · 脏值缓存：数值不变时不再重建文本', () => {
  const { renderer, ctx } = makeRenderer();
  const model = makeModel();
  renderer.draw(ctx as unknown as CanvasRenderingContext2D, model);
  const first = ctx.counters.fillText;
  renderer.draw(ctx as unknown as CanvasRenderingContext2D, model);
  const second = ctx.counters.fillText;
  // 每帧固定绘制的文案数量应保持一致（缓存命中，不产生额外文本调用）
  assert.equal(second - first, first);
});
