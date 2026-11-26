/**
 * 《碎砖大裂变》(Brick Fission) — Web 平台适配器单测（Milestone 4）
 *
 * 覆盖 `src/game/platform/WebAdapter.ts`：
 *   本地存档读写与损坏回退 / 最佳秒数只写更快 / Banner 状态广播 / 激励呈现器注入。
 *
 * 用注入式 Storage 替身，避免依赖浏览器环境。
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { WebAdapter } from '../WebAdapter.js';
import { SAVE_DATA_KEY } from '../IPlatformAdapter.js';

/** 内存版 Storage 替身。 */
class FakeStorage implements Storage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('platform / WebAdapter 存档', () => {
  it('无存档时返回默认数据', () => {
    const adapter = new WebAdapter({ storage: new FakeStorage() });
    const save = adapter.loadSaveData();
    assert.equal(save.unlockedLevel, 1);
    assert.equal(save.coins, 0);
  });

  it('写入后可读回，且使用约定的 Key', () => {
    const storage = new FakeStorage();
    const adapter = new WebAdapter({ storage });
    const save = adapter.loadSaveData();
    save.coins = 42;
    save.unlockedLevel = 5;
    adapter.writeSaveData(save);

    assert.ok(storage.getItem(SAVE_DATA_KEY), '应写入 brick_fission_save_v1');
    const loaded = adapter.loadSaveData();
    assert.equal(loaded.coins, 42);
    assert.equal(loaded.unlockedLevel, 5);
  });

  it('存档损坏时静默回退默认数据', () => {
    const storage = new FakeStorage();
    storage.setItem(SAVE_DATA_KEY, '{not-json');
    const adapter = new WebAdapter({ storage });
    const save = adapter.loadSaveData();
    assert.equal(save.coins, 0);
    assert.equal(save.unlockedLevel, 1);
  });

  it('最佳秒数只写更快成绩', () => {
    const storage = new FakeStorage();
    const adapter = new WebAdapter({ storage });
    adapter.submitRankScore('level-1', 30);
    assert.equal(adapter.loadSaveData().bestTimesSec['level-1'], 30);
    adapter.submitRankScore('level-1', 45);
    assert.equal(adapter.loadSaveData().bestTimesSec['level-1'], 30);
    adapter.submitRankScore('level-1', 12);
    assert.equal(adapter.loadSaveData().bestTimesSec['level-1'], 12);
  });
});

describe('platform / WebAdapter Banner 与激励', () => {
  it('Banner 状态可查询并广播变化', () => {
    const adapter = new WebAdapter({ storage: new FakeStorage() });
    const seen: boolean[] = [];
    adapter.onBannerVisibilityChange((visible) => seen.push(visible));
    assert.equal(adapter.isBannerVisible, false);
    adapter.setBannerVisible(true);
    assert.equal(adapter.isBannerVisible, true);
    adapter.setBannerVisible(false);
    assert.equal(adapter.isBannerVisible, false);
    assert.deepEqual(seen, [true, false]);
  });

  it('激励呈现器返回 false 时不发放奖励', async () => {
    const adapter = new WebAdapter({
      storage: new FakeStorage(),
      rewardedVideo: async () => false,
    });
    const result = await adapter.showRewardedVideo('REVIVE_KEEP_PROGRESS');
    assert.equal(result.rewarded, false);
  });

  it('激励呈现器返回 true 时发放奖励', async () => {
    const placements: string[] = [];
    const adapter = new WebAdapter({
      storage: new FakeStorage(),
      rewardedVideo: async (placement) => {
        placements.push(placement);
        return true;
      },
    });
    const result = await adapter.showRewardedVideo('REFILL_SKILL_BLUE');
    assert.equal(result.rewarded, true);
    assert.deepEqual(placements, ['REFILL_SKILL_BLUE']);
  });
});
