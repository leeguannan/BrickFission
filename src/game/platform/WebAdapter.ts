/**
 * 《碎砖大裂变》(Brick Fission) — Web 平台适配器
 *
 * 实现 `docs/04_WECHAT_ADAPTATION_AND_ROADMAP.md` §1 的 Web 端行为：
 *   - 存档走浏览器本地存储（Key = `brick_fission_save_v1`），损坏/缺字段自动回退合并；
 *   - 离屏画布优先 `OffscreenCanvas`，老环境回退普通 canvas 元素；
 *   - 激励位为 2 秒倒计时的非阻塞模拟弹窗（可由外壳注入自定义呈现器）；
 *   - 震动尝试 `navigator.vibrate`，不支持时静默容错；
 *   - 前后台切换通过 `visibilitychange` 派发。
 *
 * 本文件是唯一允许直接触碰浏览器宿主 API 的平台层模块之一，
 * `src/game/core/` 永远不会 import 它。
 */
import type { AnyCanvas } from './AnyCanvas.js';
import {
  createDefaultSaveData,
  SAVE_DATA_KEY,
} from './IPlatformAdapter.js';
import type {
  AdPlacement,
  IPlatformAdapter,
  PlayerSaveData,
  SystemMetrics,
} from './IPlatformAdapter.js';

/** 激励视频呈现器：外壳可注入与游戏视觉统一的弹窗；返回是否完整观看。 */
export type RewardedVideoPresenter = (placement: AdPlacement) => Promise<boolean>;

export interface WebAdapterOptions {
  /** 自定义激励弹窗（默认使用内置 DOM 倒计时弹窗）。 */
  rewardedVideo?: RewardedVideoPresenter;
  /** 注入式本地存储（默认取全局 localStorage，便于测试替身）。 */
  storage?: Storage;
}

const VIBRATE_MS: Readonly<Record<NonNullable<Parameters<IPlatformAdapter['vibrateShort']>[0]>, number>> = {
  light: 10,
  medium: 20,
  heavy: 35,
};

/** DPR 封顶 2，防止高分屏填充像素拖垮帧率（docs/02 §2.2 铁律 4）。 */
const MAX_DPR = 2;

export class WebAdapter implements IPlatformAdapter {
  readonly platformName = 'web' as const;

  private readonly storage: Storage | null;
  private readonly rewardedVideo: RewardedVideoPresenter;
  private readonly lifecycleCbs = new Set<(state: 'show' | 'hide') => void>();
  private readonly onVisibility = (): void => {
    const state: 'show' | 'hide' = document.visibilityState === 'hidden' ? 'hide' : 'show';
    this.lifecycleCbs.forEach((cb) => cb(state));
  };

  constructor(options: WebAdapterOptions = {}) {
    this.storage = options.storage ?? WebAdapter.resolveStorage();
    this.rewardedVideo = options.rewardedVideo ?? defaultRewardedVideoPresenter;
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', this.onVisibility);
    }
  }

  getSystemMetrics(): SystemMetrics {
    const width = typeof window !== 'undefined' ? window.innerWidth : 720;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1280;
    const nativeDpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    return {
      width,
      height,
      dpr: Math.min(nativeDpr, MAX_DPR),
      safeAreaTop: 0,
      safeAreaBottom: 0,
    };
  }

  createOffscreenCanvas(width: number, height: number): AnyCanvas {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    const OffscreenCtor = (globalThis as { OffscreenCanvas?: typeof OffscreenCanvas }).OffscreenCanvas;
    if (typeof OffscreenCtor === 'function') {
      return new OffscreenCtor(w, h);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  loadSaveData(): PlayerSaveData {
    const fallback = createDefaultSaveData();
    if (!this.storage) return fallback;
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(SAVE_DATA_KEY);
    } catch {
      return fallback; // 隐私模式等场景访问抛错，静默回退
    }
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
      return normalizeSaveData(parsed, fallback);
    } catch {
      return fallback; // 存档损坏：不阻断游戏，回退默认档
    }
  }

  writeSaveData(data: PlayerSaveData): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(SAVE_DATA_KEY, JSON.stringify(data));
    } catch {
      // 配额满 / 隐私模式：静默失败，本局体验不受影响
    }
  }

  vibrateShort(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    const nav = (globalThis as { navigator?: Navigator }).navigator;
    const vibrate = nav?.vibrate?.bind(nav);
    if (typeof vibrate === 'function') {
      try {
        vibrate(VIBRATE_MS[type]);
      } catch {
        /* 不支持则忽略 */
      }
    }
  }

  showRewardedVideo(placement: AdPlacement): Promise<{ rewarded: boolean }> {
    return this.rewardedVideo(placement).then(
      (rewarded) => ({ rewarded: Boolean(rewarded) }),
      () => ({ rewarded: false }),
    );
  }

  setBannerVisible(_visible: boolean): void {
    // Web 试玩版无 Banner 广告位，保留接口钩子（Milestone 4 接入）。
  }

  shareAppMessage(params: { title: string; query?: string }): void {
    const nav = (globalThis as { navigator?: Navigator }).navigator;
    const share = nav?.share?.bind(nav);
    const url = params.query ? `${location.origin}${location.pathname}?${params.query}` : location.href;
    if (typeof share === 'function') {
      share({ title: params.title, url }).catch(() => this.fallbackCopy(url));
    } else {
      this.fallbackCopy(url);
    }
  }

  submitRankScore(levelId: string, timeSec: number): void {
    const data = this.loadSaveData();
    const prev = data.bestTimesSec[levelId];
    if (prev === undefined || timeSec < prev) {
      data.bestTimesSec[levelId] = timeSec;
      this.writeSaveData(data);
    }
  }

  onLifecycleChange(cb: (state: 'show' | 'hide') => void): void {
    this.lifecycleCbs.add(cb);
  }

  dispose(): void {
    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
    this.lifecycleCbs.clear();
  }

  private fallbackCopy(text: string): void {
    const nav = (globalThis as { navigator?: Navigator }).navigator;
    const write = nav?.clipboard?.writeText?.bind(nav.clipboard);
    if (typeof write === 'function') {
      write(text).catch(() => undefined);
    }
  }

  private static resolveStorage(): Storage | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      // 探测一次：某些浏览器在同源策略下访问即抛错
      const probeKey = '__bf_probe__';
      localStorage.setItem(probeKey, '1');
      localStorage.removeItem(probeKey);
      return localStorage;
    } catch {
      return null;
    }
  }
}

/** 合并外部存档与默认值，保证字段完整、类型可信。 */
function normalizeSaveData(parsed: Partial<PlayerSaveData>, fallback: PlayerSaveData): PlayerSaveData {
  const bestTimes =
    parsed.bestTimesSec && typeof parsed.bestTimesSec === 'object' ? parsed.bestTimesSec : {};
  const skins = Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length > 0
    ? parsed.unlockedSkins
    : fallback.unlockedSkins;
  return {
    unlockedLevel: Number.isFinite(parsed.unlockedLevel) ? Number(parsed.unlockedLevel) : fallback.unlockedLevel,
    selectedPaddleSkin: typeof parsed.selectedPaddleSkin === 'string'
      ? parsed.selectedPaddleSkin
      : fallback.selectedPaddleSkin,
    unlockedSkins: skins,
    multiLaunchStock: Number.isFinite(parsed.multiLaunchStock)
      ? Number(parsed.multiLaunchStock)
      : fallback.multiLaunchStock,
    tripleSplitStock: Number.isFinite(parsed.tripleSplitStock)
      ? Number(parsed.tripleSplitStock)
      : fallback.tripleSplitStock,
    coins: Number.isFinite(parsed.coins) ? Number(parsed.coins) : fallback.coins,
    muted: typeof parsed.muted === 'boolean' ? parsed.muted : fallback.muted,
    bestTimesSec: bestTimes as Record<string, number>,
  };
}

/* ------------------------------------------------------------------ */
/* 默认激励弹窗：2 秒倒计时、非阻塞、无外部依赖                          */
/* ------------------------------------------------------------------ */

const REWARD_COPY: Readonly<Record<AdPlacement, string>> = {
  REVIVE_KEEP_PROGRESS: '复活续关（保留砖块进度 + 赠 3 球）',
  REFILL_SKILL_BLUE: '领取蓝标技能 +2',
  REFILL_SKILL_ORANGE: '领取橙标技能 +2',
  DOUBLE_CLEAR_REWARD: '过关奖励翻倍',
  TRIAL_SKIN: '免费试用皮肤 1 局',
};

const defaultRewardedVideoPresenter: RewardedVideoPresenter = (placement) =>
  new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }
    const mask = document.createElement('div');
    mask.className = 'bf-reward-mask';
    const card = document.createElement('div');
    card.className = 'bf-reward-card';
    const title = document.createElement('h3');
    title.textContent = '模拟激励广告';
    const body = document.createElement('p');
    body.textContent = REWARD_COPY[placement];
    const countdown = document.createElement('span');
    countdown.className = 'bf-reward-countdown';
    const btnClose = document.createElement('button');
    btnClose.type = 'button';
    btnClose.className = 'bf-reward-skip';
    btnClose.textContent = '跳过';
    card.append(title, body, countdown, btnClose);
    mask.appendChild(card);
    document.body.appendChild(mask);

    let remaining = 2;
    countdown.textContent = `${remaining}s 后可领取`;
    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        finish(true);
        return;
      }
      countdown.textContent = `${remaining}s 后可领取`;
    }, 1000);

    btnClose.addEventListener('click', () => finish(false), { once: true });

    function finish(rewarded: boolean): void {
      clearInterval(timer);
      mask.remove();
      resolve(rewarded);
    }
  });
