/**
 * 《碎砖大裂变》(Brick Fission) — 商业化进度规则单测（Milestone 4）
 *
 * 覆盖 `src/game/platform/Progression.ts`：
 *   存档规范化 / 皮肤解锁与试用 / 过关结算金币 / 关卡解锁 / 技能库存 / 最佳秒数。
 *
 * 纯逻辑测试：不触碰任何宿主环境 API。
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  CLEAR_BASE_COINS,
  CLEAR_FIRST_CLEAR_BONUS,
  CLEAR_PERFECT_BONUS,
  DEFAULT_SKIN_ID,
  SKIN_CATALOG,
  canAffordSkin,
  canTrialSkin,
  clearRewardCoins,
  consumeSkillCredit,
  consumeSkillStock,
  findSkin,
  grantClearReward,
  grantSkillStock,
  impliedExtraStock,
  isSkinUnlocked,
  normalizeSaveData,
  recordBestTime,
  unlockNextLevel,
  unlockSkin,
} from '../Progression.js';
import { createDefaultSaveData, SAVE_VERSION } from '../IPlatformAdapter.js';

describe('platform / 存档规范化', () => {
  it('空输入回退默认存档', () => {
    const save = normalizeSaveData(null);
    assert.equal(save.unlockedLevel, 1);
    assert.equal(save.coins, 0);
    assert.equal(save.multiLaunchStock, 3);
    assert.equal(save.tripleSplitStock, 2);
    assert.equal(save.muted, false);
  });

  it('脏数据被净化（负数 / 非数字 / 非法皮肤）', () => {
    const save = normalizeSaveData({
      unlockedLevel: -3,
      coins: Number.NaN,
      multiLaunchStock: 'abc',
      tripleSplitStock: 2.9,
      unlockedSkins: ['not-a-skin', 'bamboo_green'],
      selectedPaddleSkin: 'not-a-skin',
      bestTimesSec: { a: -1, b: 12.5, c: 'x' },
    });
    assert.equal(save.unlockedLevel, 1);
    assert.equal(save.coins, 0);
    assert.equal(save.multiLaunchStock, 3);
    assert.equal(save.tripleSplitStock, 2);
    assert.ok(save.unlockedSkins.includes(DEFAULT_SKIN_ID));
    assert.equal(save.selectedPaddleSkin, DEFAULT_SKIN_ID);
    assert.deepEqual(save.bestTimesSec, { b: 12.5 });
  });

  it('旧存档（无 saveVersion）迁移：多余皮肤被回收为仅基础皮肤', () => {
    const save = normalizeSaveData({
      unlockedSkins: ['capsule_blue', 'bamboo_green', 'minimal_white'],
      selectedPaddleSkin: 'minimal_white',
      coins: 300,
    });
    assert.deepEqual(save.unlockedSkins, [DEFAULT_SKIN_ID]);
    assert.equal(save.selectedPaddleSkin, DEFAULT_SKIN_ID);
    // 其它资产不受迁移影响。
    assert.equal(save.coins, 300);
    assert.equal(save.saveVersion, SAVE_VERSION);
  });

  it('新存档（带 saveVersion）保留玩家已解锁的皮肤', () => {
    const save = normalizeSaveData({
      saveVersion: SAVE_VERSION,
      unlockedSkins: ['capsule_blue', 'bamboo_green'],
      selectedPaddleSkin: 'bamboo_green',
    });
    assert.deepEqual(save.unlockedSkins.sort(), ['bamboo_green', 'capsule_blue']);
    assert.equal(save.selectedPaddleSkin, 'bamboo_green');
  });

  it('选中的皮肤未解锁时回退默认皮肤', () => {
    const save = normalizeSaveData({
      unlockedSkins: ['capsule_blue'],
      selectedPaddleSkin: 'minimal_white',
    });
    assert.equal(save.selectedPaddleSkin, DEFAULT_SKIN_ID);
  });
});

describe('platform / 皮肤解锁与试用', () => {
  it('目录含三款皮肤，竹节与极简白可试用', () => {
    assert.equal(SKIN_CATALOG.length, 3);
    assert.equal(canTrialSkin('bamboo_green'), true);
    assert.equal(canTrialSkin('minimal_white'), true);
    assert.equal(canTrialSkin('capsule_blue'), false);
    assert.equal(findSkin('unknown'), null);
  });

  it('金币不足时解锁失败', () => {
    const save = createDefaultSaveData();
    save.coins = 10;
    assert.equal(canAffordSkin(save, 'bamboo_green'), false);
    assert.equal(unlockSkin(save, 'bamboo_green'), false);
    assert.equal(isSkinUnlocked(save, 'bamboo_green'), false);
    assert.equal(save.coins, 10);
  });

  it('金币足够时解锁：扣币 + 加入解锁集合 + 自动选中', () => {
    const save = createDefaultSaveData();
    save.coins = 200;
    assert.equal(unlockSkin(save, 'bamboo_green'), true);
    assert.equal(save.coins, 200 - (findSkin('bamboo_green')?.price ?? 0));
    assert.equal(isSkinUnlocked(save, 'bamboo_green'), true);
    assert.equal(save.selectedPaddleSkin, 'bamboo_green');
  });

  it('已解锁的皮肤再次解锁只切换选中、不重复扣币', () => {
    const save = createDefaultSaveData();
    save.coins = 500;
    unlockSkin(save, 'minimal_white');
    const coinsAfter = save.coins;
    assert.equal(unlockSkin(save, 'minimal_white'), true);
    assert.equal(save.coins, coinsAfter);
  });
});

describe('platform / 过关结算金币', () => {
  it('基础奖励 + 剩余比例 + 首通 + 全清', () => {
    const coins = clearRewardCoins({ remainingRatio: 0.5, firstClear: true, doubled: false });
    assert.equal(coins, CLEAR_BASE_COINS + 10 + CLEAR_FIRST_CLEAR_BONUS);
  });

  it('全清（剩余 0）额外加分', () => {
    const coins = clearRewardCoins({ remainingRatio: 0, firstClear: false, doubled: false });
    assert.equal(coins, CLEAR_BASE_COINS + CLEAR_PERFECT_BONUS);
  });

  it('激励广告翻倍', () => {
    const base = clearRewardCoins({ remainingRatio: 0.25, firstClear: false, doubled: false });
    const doubled = clearRewardCoins({ remainingRatio: 0.25, firstClear: false, doubled: true });
    assert.equal(doubled, base * 2);
  });

  it('发放奖励会累加到存档金币', () => {
    const save = createDefaultSaveData();
    save.coins = 30;
    const granted = grantClearReward(save, { remainingRatio: 0.5, firstClear: false, doubled: false });
    assert.equal(save.coins, 30 + granted);
  });
});

describe('platform / 关卡解锁与技能库存', () => {
  it('解锁下一关只增不减', () => {
    const save = createDefaultSaveData();
    assert.equal(unlockNextLevel(save, 0), 2);
    assert.equal(unlockNextLevel(save, 0), 2);
    assert.equal(unlockNextLevel(save, 4), 6);
  });

  it('消耗技能库存：库存为 0 时拒绝', () => {
    const save = createDefaultSaveData();
    save.multiLaunchStock = 1;
    assert.equal(consumeSkillStock(save, 'multiLaunchStock'), true);
    assert.equal(save.multiLaunchStock, 0);
    assert.equal(consumeSkillStock(save, 'multiLaunchStock'), false);
  });

  it('发放技能库存累加', () => {
    const save = createDefaultSaveData();
    const total = grantSkillStock(save, 'tripleSplitStock', 2);
    assert.equal(total, save.tripleSplitStock);
    assert.equal(save.tripleSplitStock, 4);
  });
});

describe('platform / 最佳秒数', () => {
  it('只保留更快成绩', () => {
    const save = createDefaultSaveData();
    assert.equal(recordBestTime(save, 'level-1', 30), true);
    assert.equal(save.bestTimesSec['level-1'], 30);
    assert.equal(recordBestTime(save, 'level-1', 40), false);
    assert.equal(save.bestTimesSec['level-1'], 30);
    assert.equal(recordBestTime(save, 'level-1', 20), true);
    assert.equal(save.bestTimesSec['level-1'], 20);
  });

  it('非法成绩被忽略', () => {
    const save = createDefaultSaveData();
    assert.equal(recordBestTime(save, 'level-1', 0), false);
    assert.equal(recordBestTime(save, 'level-1', Number.NaN), false);
    assert.equal(save.bestTimesSec['level-1'], undefined);
  });
});

describe('platform / 技能额度记账（本关配额 vs 全局额外库存）', () => {
  it('优先消耗本关配额，不动全局额外库存', () => {
    const next = consumeSkillCredit({ quota: 3, extra: 2 });
    assert.equal(next.quota, 2);
    assert.equal(next.extra, 2);
    assert.equal(next.usedExtra, false);
  });

  it('本关配额耗尽后才扣全局额外库存并标记 usedExtra', () => {
    const next = consumeSkillCredit({ quota: 0, extra: 2 });
    assert.equal(next.quota, 0);
    assert.equal(next.extra, 1);
    assert.equal(next.usedExtra, true);
  });

  it('配额与额外库存皆为 0 时不产生消耗', () => {
    const next = consumeSkillCredit({ quota: 0, extra: 0 });
    assert.equal(next.quota, 0);
    assert.equal(next.extra, 0);
    assert.equal(next.usedExtra, false);
  });

  it('连续消耗：配额 2 + 额外 1 时，第三次才动全局库存', () => {
    let state = { quota: 2, extra: 1 };
    let usedExtraFlags: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      const next = consumeSkillCredit(state);
      state = { quota: next.quota, extra: next.extra };
      usedExtraFlags.push(next.usedExtra);
    }
    assert.deepEqual(usedExtraFlags, [false, false, true]);
    assert.equal(state.quota, 0);
    assert.equal(state.extra, 0);
  });

  it('重开不把已耗尽的全局库存回满（配额重置但额外库存保持剩余）', () => {
    // 场景：本关配额 3 + 全局库存 1，用掉 4 次后全局库存应为 0。
    let state = { quota: 3, extra: 1 };
    for (let i = 0; i < 4; i++) {
      const next = consumeSkillCredit(state);
      state = { quota: next.quota, extra: next.extra };
    }
    assert.equal(state.quota, 0);
    assert.equal(state.extra, 0);
    // 重开：本关配额恢复初始值，但全局库存仍是 0，不会被回满。
    const rebuilt = { quota: 3, extra: state.extra };
    assert.equal(rebuilt.quota, 3);
    assert.equal(rebuilt.extra, 0);
  });

  it('impliedExtraStock 只给出校验上界（引擎库存 - 本关配额）', () => {
    assert.equal(impliedExtraStock(5, 3), 2);
    assert.equal(impliedExtraStock(2, 3), 0);
    assert.equal(impliedExtraStock(5, 0), 5);
    assert.equal(impliedExtraStock(Number.NaN, 3), 0);
    assert.equal(impliedExtraStock(5, Number.NaN), 5);
  });
});
