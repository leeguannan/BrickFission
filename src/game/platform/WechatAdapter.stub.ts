/**
 * 《碎砖大裂变》(Brick Fission) — 微信小游戏平台适配器（Stub 模板）
 *
 * 实现 `docs/04_WECHAT_ADAPTATION_AND_ROADMAP.md` §1.3「微信端对接清单」：
 *   - 窗口信息用 `wx.getWindowInfo()`（不再使用已废弃的 `wx.getSystemInfoSync`）；
 *   - 离屏画布用 `wx.createCanvas()`；
 *   - 音频用 `wx.createWebAudioContext()`（小程序 WebAudioContext 兼容层）；
 *   - 激励视频 `wx.createRewardedVideoAd()` **单例复用**，`onClose(res => res.isEnded)` 判定是否完整观看，并做**防重入**；
 *   - 前后台 `wx.onShow` / `wx.onHide`，音频被打断时 `wx.onAudioInterruptionBegin` 挂起音频；
 *   - 转发文案默认带《碎砖大裂变》品牌词；
 *   - 存档走 `wx.getStorageSync` / `wx.setStorageSync`，Key 与 Web 端一致（`brick_fission_save_v1`）。
 *
 * ⚠️ 本文件是 **stub 模板**：它只在运行时通过 `globalThis.wx` 探测宿主对象，
 * 因此在 Web 构建 / TypeScript 编译期 **不会**引入任何微信全局类型报错，
 * 也不会让 Web 端打包体积变大（仅在真正切换到微信端时注入 `wx` 即可）。
 *
 * 接入微信端时的最小步骤：
 *   1. `game.json` / 项目配置里注册 `wx.createRewardedVideoAd` 的广告位 ID；
 *   2. 在微信开发者工具中把 `new WechatAdapter({ adUnitId: 'adunit-xxxx' })` 作为平台适配器注入；
 *   3. 用 `wx.onShareAppMessage` 注册分享（见下方 `shareAppMessage`）。
 */
import type { AnyCanvas } from './AnyCanvas.js';
import { SAVE_DATA_KEY } from './IPlatformAdapter.js';
import type {
  AdPlacement,
  IPlatformAdapter,
  PlayerSaveData,
  SystemMetrics,
} from './IPlatformAdapter.js';
import { normalizeSaveData, recordBestTime } from './Progression.js';

/* ------------------------------------------------------------------ */
/* 微信宿主 API 的最小结构类型（不引用任何全局类型）                     */
/* ------------------------------------------------------------------ */

/** `wx.getWindowInfo()` 返回值。 */
export interface WechatWindowInfo {
  windowWidth: number;
  windowHeight: number;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  safeArea: { top: number; bottom: number; left: number; right: number };
}

/** 微信 2D 画布上下文（本 stub 只声明用到的方法）。 */
export interface WechatCanvasContext {
  // 具体绘制方法由渲染层按需扩展；此处仅保留结构性占位。
  [key: string]: unknown;
}

/** 微信画布对象。 */
export interface WechatCanvas {
  width: number;
  height: number;
  getContext(type: '2d'): WechatCanvasContext | null;
}

/** 激励视频广告位。 */
export interface WechatRewardedVideoAd {
  load(): Promise<void>;
  show(): Promise<void>;
  onClose(cb: (res: { isEnded: boolean }) => void): void;
  offClose(cb: (res: { isEnded: boolean }) => void): void;
}

/** 微信宿主对象（只列本项目用到的 API）。 */
export interface WechatApi {
  getWindowInfo(): WechatWindowInfo;
  createCanvas(): WechatCanvas;
  createWebAudioContext(): unknown;
  createRewardedVideoAd(options: { adUnitId: string }): WechatRewardedVideoAd;
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: unknown): void;
  removeStorageSync(key: string): void;
  vibrateShort(options: { type: 'light' | 'medium' | 'heavy' }): void;
  shareAppMessage(options: { title: string; imageUrl?: string; query?: string }): void;
  onShow(cb: (res: { scene?: number }) => void): void;
  offShow(cb: (res: { scene?: number }) => void): void;
  onHide(cb: () => void): void;
  offHide(cb: () => void): void;
  onAudioInterruptionBegin(cb: () => void): void;
  offAudioInterruptionBegin(cb: () => void): void;
}

/** 默认分享文案（带品牌词，符合 docs/04 §1.3 要求）。 */
export const WECHAT_DEFAULT_SHARE_TITLE = '《碎砖大裂变》— 一杆清空，裂变到底！';

export interface WechatAdapterOptions {
  /** 注入宿主对象（默认从 `globalThis.wx` 读取，便于测试替身）。 */
  api?: WechatApi;
  /** 激励视频广告位 ID（微信后台申请）。 */
  adUnitId?: string;
  /** 自定义分享文案（默认带《碎砖大裂变》品牌词）。 */
  shareTitle?: string;
}

/**
 * 微信小游戏平台适配器（stub 模板）。
 *
 * 与 WebAdapter 的差异：
 *   - 存档走微信同步存储（换设备不同步，但读取同步）；
 *   - 激励视频是真实广告位，单例复用 + 完整观看判定；
 *   - 切后台 / 音频被打断时统一派发 `'hide'`，由外壳暂停物理并挂起音频。
 */
export class WechatAdapter implements IPlatformAdapter {
  readonly platformName = 'wechat' as const;

  private readonly api: WechatApi;
  private readonly adUnitId: string;
  private readonly shareTitle: string;
  private readonly lifecycleCbs = new Set<(state: 'show' | 'hide') => void>();
  private readonly bannerCbs = new Set<(visible: boolean) => void>();
  private bannerVisible = false;

  /** 激励视频广告位单例（微信侧要求复用同一实例）。 */
  private rewardedAd: WechatRewardedVideoAd | null = null;
  /** 防重入：同一时刻只允许一次激励视频流程。 */
  private adPending = false;

  private readonly onShow = (): void => {
    this.lifecycleCbs.forEach((cb) => cb('show'));
  };
  private readonly onHide = (): void => {
    this.lifecycleCbs.forEach((cb) => cb('hide'));
  };
  private readonly onAudioInterruption = (): void => {
    // 音频被打断：按「切后台」处理 —— 外壳暂停物理并挂起音频。
    this.lifecycleCbs.forEach((cb) => cb('hide'));
  };

  constructor(options: WechatAdapterOptions = {}) {
    this.api = options.api ?? WechatAdapter.resolveApi();
    this.adUnitId = options.adUnitId ?? 'adunit-brick-fission-rewarded';
    this.shareTitle = options.shareTitle ?? WECHAT_DEFAULT_SHARE_TITLE;
    this.api.onShow(this.onShow);
    this.api.onHide(this.onHide);
    this.api.onAudioInterruptionBegin(this.onAudioInterruption);
  }

  getSystemMetrics(): SystemMetrics {
    const info = this.api.getWindowInfo();
    const safeAreaBottom = Math.max(0, info.windowHeight - info.safeArea.bottom);
    return {
      width: info.windowWidth,
      height: info.windowHeight,
      dpr: info.pixelRatio > 0 ? info.pixelRatio : 1,
      safeAreaTop: Math.max(0, info.safeArea.top),
      safeAreaBottom,
    };
  }

  createOffscreenCanvas(width: number, height: number): AnyCanvas {
    const canvas = this.api.createCanvas();
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    return canvas as unknown as AnyCanvas;
  }

  /**
   * 创建微信 WebAudio 上下文。
   *
   * 微信小游戏的 WebAudio 与浏览器 WebAudio 不完全一致，
   * 必须由 `wx.createWebAudioContext()` 提供；该方法作为
   * `contextFactory` 注入 `WebAudioEngine`（见 `src/wechat/main.ts`）。
   */
  createAudioContext(): unknown {
    try {
      return this.api.createWebAudioContext();
    } catch {
      return null;
    }
  }

  loadSaveData(): PlayerSaveData {
    try {
      const raw = this.api.getStorageSync(SAVE_DATA_KEY);
      if (raw === undefined || raw === null || raw === '') {
        return normalizeSaveData(null);
      }
      if (typeof raw === 'string') {
        return normalizeSaveData(JSON.parse(raw));
      }
      return normalizeSaveData(raw);
    } catch {
      return normalizeSaveData(null);
    }
  }

  writeSaveData(data: PlayerSaveData): void {
    try {
      this.api.setStorageSync(SAVE_DATA_KEY, JSON.stringify(data));
    } catch {
      // 存储配额异常：静默失败，不阻断游戏
    }
  }

  vibrateShort(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    try {
      this.api.vibrateShort({ type });
    } catch {
      /* 部分机型不支持震动 */
    }
  }

  /**
   * 激励视频：单例复用 + 完整观看判定 + 防重入。
   *
   * 只有 `onClose` 回调里 `res.isEnded === true` 才算「完整观看」，
   * 中途退出（isEnded=false）不发放奖励。
   */
  showRewardedVideo(placement: AdPlacement): Promise<{ rewarded: boolean }> {
    if (this.adPending) {
      return Promise.resolve({ rewarded: false });
    }
    this.adPending = true;
    return new Promise<{ rewarded: boolean }>((resolve) => {
      const ad = this.ensureRewardedAd();
      let settled = false;
      const finish = (rewarded: boolean): void => {
        if (settled) return;
        settled = true;
        this.adPending = false;
        ad.offClose(onClose);
        resolve({ rewarded });
      };
      const onClose = (res: { isEnded: boolean }): void => {
        finish(Boolean(res && res.isEnded));
      };
      ad.onClose(onClose);
      // 记录语义位（微信侧埋点可用；本 stub 仅保留引用避免未使用告警）。
      void placement;
      ad.load()
        .then(() => ad.show())
        .catch(() => finish(false));
    });
  }

  setBannerVisible(visible: boolean): void {
    // 微信小游戏的 Banner 广告位由平台 SDK 控制，本适配器只负责把状态广播给外壳。
    this.bannerVisible = visible;
    this.bannerCbs.forEach((cb) => cb(visible));
  }

  /** 当前 Banner 是否可见。 */
  get isBannerVisible(): boolean {
    return this.bannerVisible;
  }

  /** 订阅 Banner 可见性变化。 */
  onBannerVisibilityChange(cb: (visible: boolean) => void): void {
    this.bannerCbs.add(cb);
  }

  shareAppMessage(params: { title: string; query?: string }): void {
    try {
      this.api.shareAppMessage({
        title: params.title || this.shareTitle,
        query: params.query ?? '',
      });
    } catch {
      /* 分享失败不阻断游戏 */
    }
  }

  submitRankScore(levelId: string, timeSec: number): void {
    const data = this.loadSaveData();
    if (recordBestTime(data, levelId, timeSec)) {
      this.writeSaveData(data);
    }
  }

  onLifecycleChange(cb: (state: 'show' | 'hide') => void): void {
    this.lifecycleCbs.add(cb);
  }

  /** 释放生命周期监听（微信端切页面时调用）。 */
  dispose(): void {
    this.api.offShow(this.onShow);
    this.api.offHide(this.onHide);
    this.api.offAudioInterruptionBegin(this.onAudioInterruption);
    this.lifecycleCbs.clear();
    this.bannerCbs.clear();
    this.rewardedAd = null;
    this.adPending = false;
  }

  /** 激励视频广告位单例（首次调用时创建）。 */
  private ensureRewardedAd(): WechatRewardedVideoAd {
    if (!this.rewardedAd) {
      this.rewardedAd = this.api.createRewardedVideoAd({ adUnitId: this.adUnitId });
    }
    return this.rewardedAd;
  }

  /** 从全局对象读取微信宿主（编译期不依赖任何 wx 类型声明）。 */
  private static resolveApi(): WechatApi {
    const host = (globalThis as { wx?: WechatApi }).wx;
    if (!host) {
      throw new Error(
        'WechatAdapter 需要微信宿主对象：请在微信小游戏环境注入 globalThis.wx，或通过 new WechatAdapter({ api }) 注入替身。',
      );
    }
    return host;
  }
}
