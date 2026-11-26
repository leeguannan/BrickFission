/**
 * 《碎砖大裂变》(Brick Fission) — 商业化进度纯逻辑（Milestone 4）
 *
 * 实现 `docs/04_WECHAT_ADAPTATION_AND_ROADMAP.md` §3.1「商业化三循环」中的
 * **结算 / 商店 / 技能补给** 侧规则：
 *   - 过关结算：基础金币 + 剩余比例奖励 + 首通奖励 + 全清奖励；
 *   - 激励广告「双倍金币」：结算金额翻倍（由调用方在看完广告后调用）；
 *   - 皮肤解锁：用金币永久解锁，或用激励广告免费试用 1 局；
 *   - 技能补给：激励广告补给库存（全局存档口径）。
 *
 * 本模块是纯函数 + 纯数据，**不触碰宿主环境 API**，也不 import 渲染层，
 * 因此可以在 Node 环境直接单测（微信端与 Web 端共用同一份规则）。
 */
import type { PlayerSaveData } from './IPlatformAdapter.js';
import { createDefaultSaveData } from './IPlatformAdapter.js';

/** 挡板皮肤 ID（与 `src/game/render/SkinRegistry.ts` 的 ID 一致，但此处不 import 渲染层）。 */
export type PaddleSkinId = 'capsule_blue' | 'bamboo_green' | 'minimal_white';

/** 皮肤目录条目。 */
export interface SkinCatalogEntry {
  /** 皮肤 ID。 */
  id: PaddleSkinId;
  /** 展示名。 */
  displayName: string;
  /** 永久解锁所需金币（0 表示默认解锁）。 */
  price: number;
  /** 是否可用激励广告免费试用。 */
  trialAvailable: boolean;
}

/** 内置皮肤目录（价格由本项目标定，docs/04 只要求「用金币解锁竹节/极简白」）。 */
export const SKIN_CATALOG: readonly SkinCatalogEntry[] = [
  { id: 'capsule_blue', displayName: '经典蓝胶囊', price: 0, trialAvailable: false },
  { id: 'bamboo_green', displayName: '翠竹节', price: 120, trialAvailable: true },
  { id: 'minimal_white', displayName: '极简白', price: 200, trialAvailable: true },
];

/** 默认皮肤（一定处于已解锁集合内）。 */
export const DEFAULT_SKIN_ID: PaddleSkinId = 'capsule_blue';

/** 过关基础金币。 */
export const CLEAR_BASE_COINS = 10;
/** 过关按剩余比例追加的金币系数（剩余比例 × 20，最多 +20）。 */
export const CLEAR_REMAINING_COIN_FACTOR = 20;
/** 首次通关额外金币。 */
export const CLEAR_FIRST_CLEAR_BONUS = 20;
/** 全清（剩余可破坏砖为 0）额外金币。 */
export const CLEAR_PERFECT_BONUS = 10;

/** 皮肤目录查询（未知 ID 返回 null）。 */
export function findSkin(id: string): SkinCatalogEntry | null {
  for (const entry of SKIN_CATALOG) {
    if (entry.id === id) return entry;
  }
  return null;
}

/**
 * 存档规范化：把任意来源（localStorage / wx storage / 旧版本）的数据合并成合法存档。
 *
 * 该函数是存档唯一事实源，WebAdapter 与 WechatAdapter 都复用它。
 */
export function normalizeSaveData(raw: unknown): PlayerSaveData {
  const base = createDefaultSaveData();
  if (!raw || typeof raw !== 'object') return base;
  const input = raw as Partial<PlayerSaveData> & Record<string, unknown>;

  const unlockedLevel = Number(input.unlockedLevel);
  if (Number.isFinite(unlockedLevel) && unlockedLevel >= 1) {
    base.unlockedLevel = Math.floor(unlockedLevel);
  }

  const coins = Number(input.coins);
  if (Number.isFinite(coins) && coins >= 0) {
    base.coins = Math.floor(coins);
  }

  const multiLaunchStock = Number(input.multiLaunchStock);
  if (Number.isFinite(multiLaunchStock) && multiLaunchStock >= 0) {
    base.multiLaunchStock = Math.floor(multiLaunchStock);
  }

  const tripleSplitStock = Number(input.tripleSplitStock);
  if (Number.isFinite(tripleSplitStock) && tripleSplitStock >= 0) {
    base.tripleSplitStock = Math.floor(tripleSplitStock);
  }

  if (typeof input.muted === 'boolean') {
    base.muted = input.muted;
  }

  const selectedSkin = input.selectedPaddleSkin;
  if (typeof selectedSkin === 'string') {
    base.selectedPaddleSkin = selectedSkin as PlayerSaveData['selectedPaddleSkin'];
  }

  if (Array.isArray(input.unlockedSkins)) {
    const skins = new Set<string>([DEFAULT_SKIN_ID]);
    for (const id of input.unlockedSkins) {
      if (typeof id === 'string' && findSkin(id)) skins.add(id);
    }
    base.unlockedSkins = Array.from(skins);
  }

  // 旧存档迁移（无 saveVersion）：Milestone 4 之前不存在皮肤解锁机制，
  // 旧默认存档把三款皮肤全部解锁，这些并非玩家赚取到的资产，
  // 因此在迁移时回收为「仅基础皮肤」，保证 M4 商业化起点一致。
  const legacy = typeof input.saveVersion !== 'number';
  if (legacy) {
    base.unlockedSkins = [DEFAULT_SKIN_ID];
  }

  if (input.bestTimesSec && typeof input.bestTimesSec === 'object') {
    const times: Record<string, number> = {};
    for (const [key, value] of Object.entries(input.bestTimesSec as Record<string, unknown>)) {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds > 0) {
        times[key] = seconds;
      }
    }
    base.bestTimesSec = times;
  }

  // 选中的皮肤必须处于已解锁集合内，否则回退默认皮肤。
  if (!base.unlockedSkins.includes(base.selectedPaddleSkin)) {
    base.selectedPaddleSkin = DEFAULT_SKIN_ID;
  }

  return base;
}

/** 皮肤是否已解锁。 */
export function isSkinUnlocked(save: PlayerSaveData, skinId: string): boolean {
  return save.unlockedSkins.includes(skinId as PaddleSkinId);
}

/** 金币是否足以解锁该皮肤。 */
export function canAffordSkin(save: PlayerSaveData, skinId: string): boolean {
  const entry = findSkin(skinId);
  if (!entry) return false;
  return save.coins >= entry.price;
}

/**
 * 用金币永久解锁皮肤并立即选中。
 *
 * @returns 是否解锁成功（已解锁 / 金币不足 / 未知皮肤时为 false）。
 */
export function unlockSkin(save: PlayerSaveData, skinId: string): boolean {
  const entry = findSkin(skinId);
  if (!entry) return false;
  if (isSkinUnlocked(save, skinId)) {
    save.selectedPaddleSkin = entry.id;
    return true;
  }
  if (save.coins < entry.price) return false;
  save.coins -= entry.price;
  save.unlockedSkins = Array.from(new Set([...save.unlockedSkins, entry.id]));
  save.selectedPaddleSkin = entry.id;
  return true;
}

/** 试用皮肤（不写入存档，由调用方在本次会话内使用）。 */
export function canTrialSkin(skinId: string): boolean {
  const entry = findSkin(skinId);
  return entry !== null && entry.trialAvailable;
}

/** 过关结算参数。 */
export interface ClearRewardOptions {
  /** 本局剩余可破坏砖比例（0~1）。 */
  remainingRatio: number;
  /** 是否首次通关该关卡。 */
  firstClear: boolean;
  /** 是否通过激励广告翻倍。 */
  doubled: boolean;
}

/** 计算过关金币奖励（不修改存档）。 */
export function clearRewardCoins(options: ClearRewardOptions): number {
  const ratio = Number.isFinite(options.remainingRatio)
    ? Math.max(0, Math.min(options.remainingRatio, 1))
    : 0;
  let coins = CLEAR_BASE_COINS + Math.round(ratio * CLEAR_REMAINING_COIN_FACTOR);
  if (options.firstClear) coins += CLEAR_FIRST_CLEAR_BONUS;
  if (ratio <= 0) coins += CLEAR_PERFECT_BONUS;
  if (options.doubled) coins *= 2;
  return Math.max(0, Math.floor(coins));
}

/** 结算：发放金币并返回实际发放数量。 */
export function grantClearReward(
  save: PlayerSaveData,
  options: ClearRewardOptions,
): number {
  const coins = clearRewardCoins(options);
  save.coins += coins;
  return coins;
}

/** 解锁下一关（只增不减）。 */
export function unlockNextLevel(save: PlayerSaveData, clearedLevelIndex: number): number {
  const next = clearedLevelIndex + 2; // 关卡号从 1 开始
  if (next > save.unlockedLevel) {
    save.unlockedLevel = next;
  }
  return save.unlockedLevel;
}

/** 技能类型（与内核 `MULTI_LAUNCH` / `TRIPLE_SPLIT` 对应）。 */
export type SkillStockKey = 'multiLaunchStock' | 'tripleSplitStock';

/** 消耗一次全局技能库存。 */
export function consumeSkillStock(save: PlayerSaveData, key: SkillStockKey): boolean {
  if (save[key] <= 0) return false;
  save[key] -= 1;
  return true;
}

/** 发放技能库存（激励广告补给），返回发放后的总数。 */
export function grantSkillStock(save: PlayerSaveData, key: SkillStockKey, count: number): number {
  if (!Number.isFinite(count) || count <= 0) return save[key];
  save[key] += Math.floor(count);
  return save[key];
}

/** 记录每关最佳秒数（只保留更快成绩），返回是否刷新纪录。 */
export function recordBestTime(
  save: PlayerSaveData,
  levelId: string,
  elapsedSec: number,
): boolean {
  if (!Number.isFinite(elapsedSec) || elapsedSec <= 0) return false;
  const current = save.bestTimesSec[levelId];
  if (current !== undefined && current <= elapsedSec) return false;
  save.bestTimesSec[levelId] = elapsedSec;
  return true;
}
