/**
 * 《碎砖大裂变》(Brick Fission) — 浏览器端到端测试（Playwright）
 *
 * 覆盖 5 条端到端链路：
 *   1. 启动健康度：零 console.error / pageerror、Canvas 非空白、离屏砖层仅首帧重建；
 *   2. 输入链路：拖动瞄准松手发球（READY_AIM → PLAYING）、拖动控板、点击技能区与顶栏不误触挡板；
 *   3. 玩法链路：蓝标连发、橙标分裂、1x/2x/3x 快进、暂停冻结、重开不回满已耗库存；
 *   4. 商业化链路（`?e2e=1` 造局）：失败复活保留残局 + 3 球、过关翻倍后重显结算窗、皮肤商店解锁并刷新持久化；
 *   5. Level Studio：输入汉字生成关卡 → 自动评分出结果 → 一键试玩进入游戏。
 *
 * 说明：测试用状态快照来自 `window.__BF_TEST__`（仅 `?e2e=1` 时挂载，
 * 正常访问不挂载，不存在作弊后门）。
 */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { E2ETestState } from '../../src/app/e2eProbe.js';

const LOGICAL_WIDTH = 720;
const LOGICAL_HEIGHT = 1280;

/** 读取只读状态快照。 */
async function readState(page: Page): Promise<E2ETestState> {
  return page.evaluate(() => {
    const api = window.__BF_TEST__;
    if (!api) throw new Error('__BF_TEST__ 未挂载（缺少 ?e2e=1）');
    return api.state();
  });
}

/** 逻辑坐标（720×1280）→ 页面客户端坐标。 */
async function toClient(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('#game-canvas').boundingBox();
  if (!box) throw new Error('找不到 #game-canvas');
  return {
    x: box.x + (x / LOGICAL_WIDTH) * box.width,
    y: box.y + (y / LOGICAL_HEIGHT) * box.height,
  };
}

/** 在画布上按下并移动到指定逻辑坐标（不松手）。 */
async function pressAt(page: Page, x: number, y: number): Promise<void> {
  const point = await toClient(page, x, y);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
}

/** 移动指针到指定逻辑坐标（保持按下）。 */
async function dragTo(page: Page, x: number, y: number): Promise<void> {
  const point = await toClient(page, x, y);
  await page.mouse.move(point.x, point.y, { steps: 8 });
}

/** 松开指针（触发发球）。 */
async function release(page: Page): Promise<void> {
  await page.mouse.up();
}

/** 打开页面并等待首帧渲染完成。 */
async function boot(page: Page, options: { seedSave?: unknown } = {}): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  if (options.seedSave) {
    const payload = JSON.stringify(options.seedSave);
    // 仅在存档不存在时播种：addInitScript 会在每次导航（含 reload）执行，
    // 若无条件覆盖就会抹掉游戏运行期写入的存档，使「刷新后持久化」断言失真。
    await page.addInitScript((data: string) => {
      if (!window.localStorage.getItem('brick_fission_save_v1')) {
        window.localStorage.setItem('brick_fission_save_v1', data);
      }
    }, payload);
  }

  await page.goto('/?e2e=1');
  await page.waitForFunction(() => Boolean(window.__BF_TEST__));
  // 等首帧砖层绘制完成
  await page.waitForFunction(() => (window.__BF_TEST__?.state().debugCounters.frameCount ?? 0) > 2);
  return errors;
}

test.describe('碎砖大裂变 · 端到端', () => {
  test('1. 启动健康度：零报错、Canvas 非空白、砖层仅首帧重建', async ({ page }) => {
    const errors = await boot(page);

    const state = await readState(page);
    expect(state.phase).toBe('READY_AIM');
    expect(state.totalBreakable).toBeGreaterThan(0);
    // 离屏砖层：首帧整层重建一次，之后只做 dirty 单格重绘
    expect(state.debugCounters.brickLayerRebuilds).toBe(1);
    expect(state.debugCounters.brickLayerBlits).toBeGreaterThan(0);
    // 主循环禁止 arc（球与粒子必须是预烘焙精灵）
    expect(state.debugCounters.mainThreadArcCalls).toBe(0);

    // Canvas 非空白：采样若干像素，至少存在两种不同颜色
    const distinctColors = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const seen = new Set<string>();
      for (let i = 0; i < data.length; i += 4 * 977) {
        seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      }
      return seen.size;
    });
    expect(distinctColors).toBeGreaterThan(1);

    expect(errors).toEqual([]);
  });

  test('2. 输入链路：拖动瞄准松手发球、拖板控板、技能区与顶栏不误触', async ({ page }) => {
    await boot(page);

    // 2.1 拖动瞄准并松手发球
    const before = await readState(page);
    expect(before.phase).toBe('READY_AIM');
    await pressAt(page, 520, 300);
    await dragTo(page, 520, 300);
    await release(page);
    await page.waitForFunction(() => window.__BF_TEST__?.state().phase === 'PLAYING');
    const afterShot = await readState(page);
    expect(afterShot.activeBallCount).toBeGreaterThan(0);

    // 2.2 拖动控板：挡板目标 X 与实际 X 都必须变化
    const paddleBefore = afterShot.paddleX;
    const targetBefore = afterShot.paddleTargetX;
    await pressAt(page, 200, 700);
    await dragTo(page, 460, 700);
    await release(page);
    await page.waitForFunction(
      (previous) => Math.abs((window.__BF_TEST__?.state().paddleTargetX ?? previous) - previous) > 4,
      targetBefore,
    );
    const afterDrag = await readState(page);
    expect(Math.abs(afterDrag.paddleTargetX - targetBefore)).toBeGreaterThan(4);
    // 等挡板跟到目标位（否则后续对比会被「挡板仍在移动」污染）
    await page.waitForFunction(
      () => {
        const state = window.__BF_TEST__?.state();
        return state ? Math.abs(state.paddleX - state.paddleTargetX) < 1 : false;
      },
      undefined,
      { timeout: 15_000 },
    );

    // 2.3 点击技能区与顶栏不得引发挡板跳变（目标位与实际位都不许动）
    const stable = await readState(page);
    await page.locator('#btn-skill-blue').click();
    await page.locator('#btn-speed').click();
    await page.locator('#btn-pause').click();
    await page.locator('#btn-pause').click();
    await page.waitForTimeout(400);
    const afterClicks = await readState(page);
    expect(Math.abs(afterClicks.paddleTargetX - stable.paddleTargetX)).toBeLessThan(2);
    expect(Math.abs(afterClicks.paddleX - stable.paddleX)).toBeLessThan(2);
  });

  test('3. 玩法链路：连发/分裂/快进/暂停冻结/重开不回满库存', async ({ page }) => {
    await boot(page);

    // 3.1 蓝标连发：场上球数增加、库存减少
    const blueBefore = (await readState(page)).skills.multiLaunchCount;
    await page.locator('#btn-skill-blue').click();
    await page.waitForTimeout(200);
    const afterBlue = await readState(page);
    expect(afterBlue.skills.multiLaunchCount).toBe(blueBefore - 1);
    expect(afterBlue.activeBallCount).toBeGreaterThanOrEqual(5);

    // 3.2 橙标分裂
    const orangeBefore = (await readState(page)).skills.tripleSplitCount;
    const ballsBefore = (await readState(page)).activeBallCount;
    await page.locator('#btn-skill-orange').click();
    await page.waitForTimeout(200);
    const afterOrange = await readState(page);
    expect(afterOrange.skills.tripleSplitCount).toBe(orangeBefore - 1);
    expect(afterOrange.activeBallCount).toBeGreaterThan(ballsBefore);

    // 3.3 快进循环 1x → 2x → 3x
    expect((await readState(page)).speedMultiplier).toBe(1);
    await page.locator('#btn-speed').click();
    expect((await readState(page)).speedMultiplier).toBe(2);
    await page.locator('#btn-speed').click();
    expect((await readState(page)).speedMultiplier).toBe(3);
    await page.locator('#btn-speed').click();
    expect((await readState(page)).speedMultiplier).toBe(1);

    // 3.4 暂停冻结：模拟时间不再推进
    await page.locator('#btn-pause').click();
    await page.waitForFunction(() => window.__BF_TEST__?.state().phase === 'PAUSED');
    const pausedAt = (await readState(page)).elapsedSec;
    await page.waitForTimeout(600);
    expect((await readState(page)).elapsedSec).toBeCloseTo(pausedAt, 3);
    await page.locator('#btn-pause').click();
    await page.waitForFunction(() => window.__BF_TEST__?.state().phase === 'PLAYING');
    await page.waitForTimeout(400);
    expect((await readState(page)).elapsedSec).toBeGreaterThan(pausedAt);

    // 3.5 重开：本关配额重置，但全局额外库存不得回满
    // 初始库存 = 本关配额 3 + 全局额外库存 3 = 6；
    // 3.1 已消耗 1 次配额（剩配额 2），此后再点 4 次 → 配额耗尽并扣掉 2 个全局库存
    const beforeRestart = await readState(page);
    expect(beforeRestart.skills.multiLaunchCount).toBe(5);
    for (let i = 0; i < 4; i++) await page.locator('#btn-skill-blue').click();
    const consumed = await readState(page);
    expect(consumed.skills.multiLaunchCount).toBe(beforeRestart.skills.multiLaunchCount - 4);
    const savedStock = await page.evaluate(() => {
      const raw = window.localStorage.getItem('brick_fission_save_v1');
      return raw ? (JSON.parse(raw) as { multiLaunchStock: number }).multiLaunchStock : null;
    });
    expect(savedStock).toBe(1); // 全局库存 3 - 本轮扣掉的 2 = 1，且已落盘

    await page.locator('#btn-restart').click();
    await page.waitForTimeout(300);
    const afterRestart = await readState(page);
    expect(afterRestart.phase).toBe('READY_AIM');
    // 重开后 = 本关配额 3（重置） + 全局剩余 1 = 4，绝不能回到 6
    expect(afterRestart.skills.multiLaunchCount).toBe(4);
    const stockAfterRestart = await page.evaluate(() => {
      const raw = window.localStorage.getItem('brick_fission_save_v1');
      return raw ? (JSON.parse(raw) as { multiLaunchStock: number }).multiLaunchStock : null;
    });
    expect(stockAfterRestart).toBe(1);
  });

  test('4. 商业化链路：失败复活保留残局、过关翻倍重显结算窗、皮肤解锁持久化', async ({ page }) => {
    // 预置存档：500 金币 + 只解锁默认皮肤
    const errors = await boot(page, {
      seedSave: {
        saveVersion: 1,
        unlockedLevel: 1,
        selectedPaddleSkin: 'capsule_blue',
        unlockedSkins: ['capsule_blue'],
        multiLaunchStock: 0,
        tripleSplitStock: 0,
        coins: 500,
        muted: false,
        bestTimesSec: {},
      },
    });

    // 4.1 过关翻倍：只留一块砖 → 瞄准它 → 打通 → 看激励视频翻倍 → 结算窗重显「下一关」
    await page.evaluate(() => window.__BF_TEST__?.leaveOneBrick());
    const leftover = await readState(page);
    expect(leftover.remainingBreakable).toBe(1);
    expect(leftover.aimTarget).not.toBeNull();
    const target = leftover.aimTarget!;
    await pressAt(page, target.x, target.y);
    await dragTo(page, target.x, target.y);
    await release(page);
    await page.waitForFunction(() => window.__BF_TEST__?.state().phase === 'WON', undefined, {
      timeout: 60_000,
    });
    await expect(page.locator('#modal-title')).toHaveText(/通关/);
    const coinsBeforeDouble = (await readState(page)).coins;
    await page.getByRole('button', { name: /金币翻倍/ }).click();
    // 激励视频结束后结算窗重显（只剩「重开本关」「下一关」）
    await expect(page.getByRole('button', { name: '下一关' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /金币翻倍/ })).toHaveCount(0);
    expect((await readState(page)).coins).toBeGreaterThan(coinsBeforeDouble);

    // 4.2 失败复活：重开本关 → 移除全部球 → LOST → 复活保留残局 + 3 球
    await page.getByRole('button', { name: '重开本关' }).click();
    await page.waitForFunction(() => window.__BF_TEST__?.state().phase === 'READY_AIM');
    await page.evaluate(() => window.__BF_TEST__?.forceLost());
    await page.waitForFunction(() => window.__BF_TEST__?.state().phase === 'LOST');
    await expect(page.locator('#modal-mask')).toBeVisible();
    await page.getByRole('button', { name: /复活续关/ }).click();
    // 激励视频 2 秒倒计时
    await page.waitForFunction(() => window.__BF_TEST__?.state().phase === 'PLAYING', undefined, {
      timeout: 30_000,
    });
    const revived = await readState(page);
    expect(revived.activeBallCount).toBe(3);
    expect(revived.remainingBreakable).toBeGreaterThan(0);

    // 4.3 皮肤商店：解锁后刷新页面仍持久化
    await page.locator('#btn-shop').click();
    await expect(page.locator('#shop-panel')).toBeVisible();
    const coinsBeforeShop = (await readState(page)).coins;
    expect(coinsBeforeShop).toBeGreaterThan(500); // 通关结算 + 翻倍奖励已入账
    await page.getByRole('button', { name: '解锁 120' }).click();
    await page.waitForTimeout(300);
    const saved = await page.evaluate(() => {
      const raw = window.localStorage.getItem('brick_fission_save_v1');
      return raw ? (JSON.parse(raw) as { unlockedSkins: string[]; coins: number }) : null;
    });
    expect(saved?.unlockedSkins).toContain('bamboo_green');
    expect(saved?.coins).toBe(coinsBeforeShop - 120); // 仅扣皮肤定价

    await page.reload();
    await page.waitForFunction(() => Boolean(window.__BF_TEST__));
    const afterReload = await page.evaluate(() => {
      const raw = window.localStorage.getItem('brick_fission_save_v1');
      return raw ? (JSON.parse(raw) as { unlockedSkins: string[] }) : null;
    });
    expect(afterReload?.unlockedSkins).toContain('bamboo_green');

    expect(errors).toEqual([]);
  });

  test('5. Level Studio：汉字生成关卡 → 自动评分 → 一键试玩', async ({ page }) => {
    await boot(page);

    await page.locator('#btn-studio').click();
    await expect(page.locator('.studio-overlay')).toBeVisible();

    await page.locator('.studio-input').fill('破');
    await page.getByRole('button', { name: '生成汉字关卡' }).click();
    await page.waitForTimeout(300);
    // 计数条应显示有可破坏砖
    await expect(page.locator('.studio-counter')).toContainText('可破坏砖');

    await page.getByRole('button', { name: '自动评分' }).click();
    await expect(page.locator('.studio-score')).toContainText('综合难度');

    await page.getByRole('button', { name: '一键试玩' }).click();
    // Studio 关闭，游戏进入自定义关卡
    await expect(page.locator('.studio-overlay')).toHaveCount(0);
    const state = await readState(page);
    expect(['READY_AIM', 'PLAYING']).toContain(state.phase);
    expect(state.totalBreakable).toBeGreaterThan(0);
  });

  test('6. Step2 状态探针：Fever 只读状态可读、能量条常驻 DOM、特殊砖笔刷存在', async ({ page }) => {
    const errors = await boot(page);

    // Fever 只读状态（探针暴露，供验证用）
    const state = await readState(page);
    expect(state.fever.energy).toBe(0);
    expect(state.fever.maxEnergy).toBe(100);
    expect(state.fever.active).toBe(false);
    expect(state.fever.remainingSec).toBe(0);

    // Fever 能量条常驻 DOM（未激活时隐藏，激活时显示）
    await expect(page.locator('#fever-bar')).toHaveCount(1);
    await expect(page.locator('#fever-fill')).toHaveCount(1);
    await expect(page.locator('#fever-bar')).not.toHaveClass(/visible/);

    // Level Studio 新增三种特殊砖笔刷
    await page.locator('#btn-studio').click();
    await expect(page.locator('.studio-overlay')).toBeVisible();
    await expect(page.locator('.studio-tool[data-tool="BOMB"]')).toHaveCount(1);
    await expect(page.locator('.studio-tool[data-tool="PRISM"]')).toHaveCount(1);
    await expect(page.locator('.studio-tool[data-tool="CORE"]')).toHaveCount(1);
    // 演示关一键载入
    await page.getByRole('button', { name: '载入 Step2 演示关' }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('.studio-counter')).toContainText('可破坏砖');

    expect(errors).toEqual([]);
  });
});
