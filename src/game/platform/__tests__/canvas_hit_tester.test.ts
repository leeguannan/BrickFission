/**
 * 《碎砖大裂变》 — 微信端 Canvas 命中区检测单测
 *
 * 覆盖 Milestone 6 的硬约束：
 *   1. HUD / 弹窗 / 商店的所有热区**两两不重叠**（点 A 不会误触 B）；
 *   2. 热区**不落入微信右上角胶囊区**（避免与原生按钮抢点击）；
 *   3. 热区**不落入底部 Banner 禁区**（避免诱导点击违规）；
 *   4. 命中检测区分「UI 点击消费」与「战场拖动」——未命中返回 null。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CanvasHitTester,
  buildHudRegions,
  buildModalRegions,
  buildShopRegions,
  computeHudLayout,
  feverBarRect,
  hudActionRowTop,
  skillButtonCenterY,
  skillButtonRects,
  type HudHitRegion,
} from '../CanvasHitTester.js';

const WIDTH = 720;
const HEIGHT = 1280;

function ids(regions: readonly HudHitRegion[]): string[] {
  return regions.map((r) => r.id);
}

test('命中区 · HUD 常驻区数量与 id 稳定', () => {
  const tester = new CanvasHitTester({ safeAreaTop: 100 });
  assert.deepEqual(ids(tester.hud), [
    'hud.pause',
    'hud.speed',
    'hud.shop',
    'hud.skill.multi',
    'hud.skill.triple',
    'hud.sound',
  ]);
});

test('命中区 · HUD 热区两两不重叠', () => {
  const tester = new CanvasHitTester({ safeAreaTop: 100 });
  const result = tester.validate();
  assert.deepEqual(result.overlaps, []);
});

test('命中区 · HUD 热区不落入右上角胶囊区', () => {
  const tester = new CanvasHitTester({ safeAreaTop: 100 });
  const capsule = tester.capsule;
  assert.ok(capsule.x > 0 && capsule.y > 0);
  for (const region of tester.hud) {
    const overlaps =
      region.x < capsule.x + capsule.width &&
      capsule.x < region.x + region.width &&
      region.y < capsule.y + capsule.height &&
      capsule.y < region.y + region.height;
    assert.equal(overlaps, false, `${region.id} 压到了胶囊区`);
  }
  assert.deepEqual(tester.validate().forbidden, []);
});

test('命中区 · Banner 可见时技能按钮上移且不落入 Banner 禁区', () => {
  const withoutBanner = computeHudLayout({ safeAreaTop: 100, bannerVisible: false });
  const withBanner = computeHudLayout({ safeAreaTop: 100, bannerVisible: true });
  assert.ok(skillButtonCenterY(withBanner) < skillButtonCenterY(withoutBanner));
  // Banner 顶 = 高度 - 100，热区底必须在其上方 80px 以上
  const rects = skillButtonRects(withBanner);
  const multiBottom = rects.multi.y + rects.multi.height;
  assert.ok(multiBottom <= HEIGHT - 100 - 80, `技能按钮底 ${multiBottom} 侵入了 Banner 禁区`);

  const tester = new CanvasHitTester({ safeAreaTop: 100, bannerVisible: true });
  assert.ok(tester.banner);
  assert.deepEqual(tester.validate().forbidden, []);
});

test('命中区 · Banner 不可见时不存在底部禁区', () => {
  const tester = new CanvasHitTester({ safeAreaTop: 100, bannerVisible: false });
  assert.equal(tester.banner, null);
  assert.equal(tester.isInBannerZone(360, HEIGHT - 10), false);
});

test('命中区 · 命中测试返回区域，未命中返回 null（交战场拖动）', () => {
  const tester = new CanvasHitTester({ safeAreaTop: 100 });
  const pause = tester.hud.find((r) => r.id === 'hud.pause');
  assert.ok(pause);
  const hit = tester.hitTest(pause.x + pause.width / 2, pause.y + pause.height / 2);
  assert.ok(hit);
  assert.equal(hit.id, 'hud.pause');
  // 战场中部没有任何 UI
  assert.equal(tester.hitTest(360, 600), null);
});

test('命中区 · 弹窗覆盖层打开后屏蔽 HUD', () => {
  const tester = new CanvasHitTester({ safeAreaTop: 100 });
  const modal = buildModalRegions(tester.layout, 2);
  tester.setOverlay(modal);
  const pause = tester.hud.find((r) => r.id === 'hud.pause');
  assert.ok(pause);
  // 暂停按钮此刻点不到（弹窗是模态）
  assert.equal(tester.hitTest(pause.x + 5, pause.y + 5), null);
  const action = modal.find((r) => r.id === 'modal.action.0');
  assert.ok(action);
  const hit = tester.hitTest(action.x + 4, action.y + 4);
  assert.ok(hit);
  assert.equal(hit.id, 'modal.action.0');
  assert.deepEqual(tester.validate().overlaps, []);
});

test('命中区 · 关闭弹窗后恢复 HUD 命中', () => {
  const tester = new CanvasHitTester({ safeAreaTop: 100 });
  tester.setOverlay(buildModalRegions(tester.layout, 1));
  tester.setOverlay(null);
  const pause = tester.hud.find((r) => r.id === 'hud.pause');
  assert.ok(pause);
  const hit = tester.hitTest(pause.x + 2, pause.y + 2);
  assert.ok(hit);
  assert.equal(hit.id, 'hud.pause');
});

test('命中区 · 弹窗动作按钮最多 3 个且互不重叠', () => {
  const layout = computeHudLayout({ safeAreaTop: 100 });
  const modal = buildModalRegions(layout, 5);
  const actions = modal.filter((r) => r.id.startsWith('modal.action.'));
  assert.equal(actions.length, 3);
  for (let i = 0; i < actions.length; i += 1) {
    for (let j = i + 1; j < actions.length; j += 1) {
      const a = actions[i]!;
      const b = actions[j]!;
      const overlap =
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      assert.equal(overlap, false, `${a.id} 与 ${b.id} 重叠`);
    }
  }
});

test('命中区 · 皮肤商店 3 行各自一个动作按钮且互不重叠', () => {
  const layout = computeHudLayout({ safeAreaTop: 100 });
  const shop = buildShopRegions(layout, [
    { id: 'capsule_blue', action: 'equip' },
    { id: 'bamboo_green', action: 'unlock' },
    { id: 'minimal_white', action: 'trial' },
  ]);
  const actions = shop.filter((r) => r.id.startsWith('shop.') && !r.id.endsWith('close'));
  assert.equal(actions.length, 3);
  const tester = new CanvasHitTester({ safeAreaTop: 100 });
  tester.setOverlay(shop);
  const result = tester.validate();
  assert.deepEqual(result.overlaps, []);
  assert.deepEqual(result.forbidden, []);
});

test('命中区 · 顶部安全区越大，Fever 条与按钮行整体下移', () => {
  const small = computeHudLayout({ safeAreaTop: 90 });
  const large = computeHudLayout({ safeAreaTop: 110 });
  assert.ok(hudActionRowTop(large) > hudActionRowTop(small));
  assert.ok(feverBarRect(large).y > feverBarRect(small).y);
});

test('命中区 · 底部安全区越大，技能按钮越靠上', () => {
  const none = computeHudLayout({ safeAreaTop: 100, safeAreaBottom: 0 });
  const inset = computeHudLayout({ safeAreaTop: 100, safeAreaBottom: 40 });
  assert.ok(skillButtonCenterY(inset) < skillButtonCenterY(none));
});

test('命中区 · buildHudRegions 产出的区域与检测器内部一致', () => {
  const layout = computeHudLayout({ safeAreaTop: 100 });
  const regions = buildHudRegions(layout);
  const tester = new CanvasHitTester({ safeAreaTop: 100 });
  assert.deepEqual(ids(regions), ids(tester.hud));
  assert.equal(layout.width, WIDTH);
  assert.equal(layout.height, HEIGHT);
});
