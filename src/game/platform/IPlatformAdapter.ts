/**
 * 《碎砖大裂变》(Brick Fission) — 平台适配抽象层
 *
 * 契约来源：`docs/04_WECHAT_ADAPTATION_AND_ROADMAP.md` §1。
 * 游戏内核、渲染与音频只通过本接口与宿主通信，绝不直接触碰
 * 浏览器本地存储、小游戏全局对象或广告 SDK。
 */
import type { AnyCanvas } from './AnyCanvas.js';

/** 存档结构（存档 Key 由各端适配器统一为 `brick_fission_save_v1`）。 */
export interface PlayerSaveData {
  /** 存档结构版本：Milestone 4 引入商业化时升级为 1（见 `Progression.normalizeSaveData` 的迁移逻辑）。 */
  saveVersion: number;
  unlockedLevel: number;
  selectedPaddleSkin: string;
  unlockedSkins: string[];
  /** 蓝标技能全局余量。 */
  multiLaunchStock: number;
  /** 橙标技能全局余量。 */
  tripleSplitStock: number;
  coins: number;
  muted: boolean;
  /** 每关最佳通关耗时（为后续竞速榜做准备）。 */
  bestTimesSec: Record<string, number>;
}

/** 激励广告位语义。 */
export type AdPlacement =
  | 'REVIVE_KEEP_PROGRESS' // 失败复活（保留场上已打碎的砖块进度 + 赠送 3 颗球）
  | 'REFILL_SKILL_BLUE' // 局内免费领蓝标技能
  | 'REFILL_SKILL_ORANGE' // 局内免费领橙标技能
  | 'DOUBLE_CLEAR_REWARD' // 过关双倍金币/技能奖励
  | 'TRIAL_SKIN'; // 局前免费试用皮肤

export interface SystemMetrics {
  width: number;
  height: number;
  dpr: number;
  safeAreaTop: number;
  safeAreaBottom: number;
}

export interface IPlatformAdapter {
  readonly platformName: 'web' | 'wechat';
  getSystemMetrics(): SystemMetrics;
  createOffscreenCanvas(width: number, height: number): AnyCanvas;
  loadSaveData(): PlayerSaveData;
  writeSaveData(data: PlayerSaveData): void;
  vibrateShort(type?: 'light' | 'medium' | 'heavy'): void;
  /** 商业化预留：激励视频（Web 端为可控模拟弹窗）。 */
  showRewardedVideo(placement: AdPlacement): Promise<{ rewarded: boolean }>;
  setBannerVisible(visible: boolean): void;
  shareAppMessage(params: { title: string; query?: string }): void;
  submitRankScore(levelId: string, timeSec: number): void;
  /** 前后台切换回调（'show' 回到前台 / 'hide' 切到后台）。 */
  onLifecycleChange(cb: (state: 'show' | 'hide') => void): void;
}

/** 存档版本化 Key（docs/04 §1 双端统一）。 */
export const SAVE_DATA_KEY = 'brick_fission_save_v1';

/** 当前存档结构版本。 */
export const SAVE_VERSION = 1;

/** 新建账号的默认存档。 */
export function createDefaultSaveData(): PlayerSaveData {
  return {
    saveVersion: SAVE_VERSION,
    unlockedLevel: 1,
    selectedPaddleSkin: 'capsule_blue',
    // Milestone 4 商业化：默认只解锁基础皮肤，翠竹节 / 极简白需金币解锁或激励广告试用。
    unlockedSkins: ['capsule_blue'],
    multiLaunchStock: 3,
    tripleSplitStock: 2,
    coins: 0,
    muted: false,
    bestTimesSec: {},
  };
}
