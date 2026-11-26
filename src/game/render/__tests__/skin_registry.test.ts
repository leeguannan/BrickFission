/**
 * 《碎砖大裂变》(Brick Fission) — SkinRegistry 挡板皮肤单测
 *
 * 验证 docs/02 §4.4：三款内置皮肤（经典蓝胶囊 / 翠竹节 / 极简白）、
 * 未知 id 安全回退、draw 仅使用 2D 路径 API 且不改变碰撞尺寸语义。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { asSkinCtx, Mock2DCtx } from './mocks.js';
import {
  PADDLE_SKIN_BAMBOO_GREEN,
  PADDLE_SKIN_CAPSULE_BLUE,
  PADDLE_SKIN_IDS,
  PADDLE_SKIN_MINIMAL_WHITE,
  SkinRegistry,
} from '../SkinRegistry.js';

test('注册表内置恰好三款皮肤且 id 常量正确', () => {
  const registry = new SkinRegistry();
  assert.deepEqual([...registry.list().map((s) => s.id)], [
    PADDLE_SKIN_CAPSULE_BLUE,
    PADDLE_SKIN_BAMBOO_GREEN,
    PADDLE_SKIN_MINIMAL_WHITE,
  ]);
  assert.deepEqual([...PADDLE_SKIN_IDS], [
    'capsule_blue',
    'bamboo_green',
    'minimal_white',
  ]);
  for (const id of PADDLE_SKIN_IDS) {
    assert.equal(registry.has(id), true);
  }
  assert.equal(registry.has('not-exist'), false);
});

test('未知皮肤 id 回退到经典蓝胶囊而不抛错', () => {
  const registry = new SkinRegistry();
  const fallback = registry.get('unknown-skin');
  assert.equal(fallback.id, PADDLE_SKIN_CAPSULE_BLUE);
});

test('蓝胶囊绘制产生渐变与填充路径', () => {
  const registry = new SkinRegistry();
  const ctx = new Mock2DCtx();
  registry.get(PADDLE_SKIN_CAPSULE_BLUE).draw(asSkinCtx(ctx), 116, 18);
  assert.ok(ctx.counters.createLinearGradient >= 1);
  assert.ok(ctx.counters.beginPath >= 1);
  assert.ok(ctx.counters.fill >= 1);
});

test('翠竹节绘制包含竹节线（stroke）与填充', () => {
  const registry = new SkinRegistry();
  const ctx = new Mock2DCtx();
  registry.get(PADDLE_SKIN_BAMBOO_GREEN).draw(asSkinCtx(ctx), 116, 18);
  assert.ok(ctx.counters.stroke >= 1);
  assert.ok(ctx.counters.fill >= 1);
});

test('极简白以锐利矩形填充，无渐变', () => {
  const registry = new SkinRegistry();
  const ctx = new Mock2DCtx();
  registry.get(PADDLE_SKIN_MINIMAL_WHITE).draw(asSkinCtx(ctx), 116, 18);
  assert.ok(ctx.counters.fillRect >= 1);
  assert.equal(ctx.counters.createLinearGradient, 0);
});

test('三款皮肤在统一 116×18 画布尺寸下绘制均不抛错（碰撞尺寸不受皮肤影响）', () => {
  const registry = new SkinRegistry();
  for (const id of PADDLE_SKIN_IDS) {
    const ctx = new Mock2DCtx();
    assert.doesNotThrow(() => registry.get(id).draw(asSkinCtx(ctx), 116, 18));
  }
});
