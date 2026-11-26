/**
 * 《碎砖大裂变》(Brick Fission) — 微信平台适配器（stub）单测（Milestone 4）
 *
 * 覆盖 `src/game/platform/WechatAdapter.stub.ts`：
 *   窗口指标（getWindowInfo）、存档（get/setStorageSync）、激励视频单例 + 完整观看判定 +
 *   防重入、前后台与音频打断回调、分享文案带品牌词、缺少宿主对象时报错。
 *
 * 用替身 API 对象测试，不依赖真实微信环境。
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  WECHAT_DEFAULT_SHARE_TITLE,
  WechatAdapter,
} from '../WechatAdapter.stub.js';
import type {
  WechatApi,
  WechatRewardedVideoAd,
  WechatWindowInfo,
} from '../WechatAdapter.stub.js';

interface FakeAdState {
  ad: WechatRewardedVideoAd;
  created: number;
  showCount: number;
  loadCount: number;
  closeCallback: ((res: { isEnded: boolean }) => void) | null;
}

/** 构造微信宿主替身。 */
function createFakeApi(options: { isEnded?: boolean } = {}): {
  api: WechatApi;
  storage: Map<string, unknown>;
  adState: FakeAdState;
  shared: Array<{ title: string; query?: string }>;
  lifecycle: Array<() => void>;
} {
  const storage = new Map<string, unknown>();
  const shared: Array<{ title: string; query?: string }> = [];
  const lifecycle: Array<() => void> = [];
  const adState: FakeAdState = {
    ad: null as unknown as WechatRewardedVideoAd,
    created: 0,
    showCount: 0,
    loadCount: 0,
    closeCallback: null,
  };

  adState.ad = {
    async load() {
      adState.loadCount += 1;
    },
    async show() {
      adState.showCount += 1;
      // 模拟广告播放后自动关闭。
      setTimeout(() => adState.closeCallback?.({ isEnded: options.isEnded ?? true }), 0);
    },
    onClose(cb) {
      adState.closeCallback = cb;
    },
    offClose(cb) {
      if (adState.closeCallback === cb) adState.closeCallback = null;
    },
  };

  const windowInfo: WechatWindowInfo = {
    windowWidth: 720,
    windowHeight: 1280,
    screenWidth: 720,
    screenHeight: 1280,
    pixelRatio: 3,
    safeArea: { top: 96, bottom: 1240, left: 0, right: 720 },
  };

  const api: WechatApi = {
    getWindowInfo: () => windowInfo,
    createCanvas: () => ({
      width: 0,
      height: 0,
      getContext: () => ({}),
    }),
    createWebAudioContext: () => ({}),
    createRewardedVideoAd: () => {
      adState.created += 1;
      return adState.ad;
    },
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => {
      storage.set(key, value);
    },
    removeStorageSync: (key) => {
      storage.delete(key);
    },
    vibrateShort: () => undefined,
    shareAppMessage: (opts) => {
      shared.push({ title: opts.title, query: opts.query });
    },
    onShow: (cb) => {
      lifecycle.push(cb as unknown as () => void);
    },
    offShow: () => undefined,
    onHide: (cb) => {
      lifecycle.push(cb as unknown as () => void);
    },
    offHide: () => undefined,
    onAudioInterruptionBegin: (cb) => {
      lifecycle.push(cb as unknown as () => void);
    },
    offAudioInterruptionBegin: () => undefined,
  };

  return { api, storage, adState, shared, lifecycle };
}

describe('platform / WechatAdapter 窗口与存档', () => {
  it('系统指标来自 getWindowInfo，并换算安全区', () => {
    const { api } = createFakeApi();
    const adapter = new WechatAdapter({ api });
    const metrics = adapter.getSystemMetrics();
    assert.equal(metrics.width, 720);
    assert.equal(metrics.height, 1280);
    assert.equal(metrics.dpr, 3);
    assert.equal(metrics.safeAreaTop, 96);
    assert.equal(metrics.safeAreaBottom, 40);
  });

  it('存档读写走微信同步存储，Key 与 Web 端一致', () => {
    const { api, storage } = createFakeApi();
    const adapter = new WechatAdapter({ api });
    const save = adapter.loadSaveData();
    assert.equal(save.coins, 0);
    save.coins = 88;
    adapter.writeSaveData(save);
    assert.ok(storage.has('brick_fission_save_v1'));
    assert.equal(adapter.loadSaveData().coins, 88);
  });

  it('平台名固定为 wechat', () => {
    const { api } = createFakeApi();
    assert.equal(new WechatAdapter({ api }).platformName, 'wechat');
  });
});

describe('platform / WechatAdapter 激励视频', () => {
  it('完整观看才发放奖励', async () => {
    const { api } = createFakeApi({ isEnded: true });
    const adapter = new WechatAdapter({ api });
    const result = await adapter.showRewardedVideo('REVIVE_KEEP_PROGRESS');
    assert.equal(result.rewarded, true);
  });

  it('中途退出不发放奖励', async () => {
    const { api } = createFakeApi({ isEnded: false });
    const adapter = new WechatAdapter({ api });
    const result = await adapter.showRewardedVideo('DOUBLE_CLEAR_REWARD');
    assert.equal(result.rewarded, false);
  });

  it('广告位单例复用', async () => {
    const { api, adState } = createFakeApi();
    const adapter = new WechatAdapter({ api });
    await adapter.showRewardedVideo('REVIVE_KEEP_PROGRESS');
    await adapter.showRewardedVideo('REFILL_SKILL_BLUE');
    assert.equal(adState.created, 1);
    assert.equal(adState.showCount, 2);
  });

  it('并发调用被防重入拦截', async () => {
    const { api } = createFakeApi();
    const adapter = new WechatAdapter({ api });
    const [first, second] = await Promise.all([
      adapter.showRewardedVideo('REVIVE_KEEP_PROGRESS'),
      adapter.showRewardedVideo('REVIVE_KEEP_PROGRESS'),
    ]);
    assert.equal(first.rewarded, true);
    assert.equal(second.rewarded, false);
  });
});

describe('platform / WechatAdapter 生命周期与分享', () => {
  it('切后台/音频打断派发 hide，切回派发 show', () => {
    const { api, lifecycle } = createFakeApi();
    const adapter = new WechatAdapter({ api });
    const states: string[] = [];
    adapter.onLifecycleChange((state) => states.push(state));

    // 注册顺序：onShow → onHide → onAudioInterruptionBegin
    lifecycle[0]?.();
    lifecycle[1]?.();
    lifecycle[2]?.();
    assert.deepEqual(states, ['show', 'hide', 'hide']);
  });

  it('默认分享文案带《碎砖大裂变》品牌词', () => {
    const { api, shared } = createFakeApi();
    const adapter = new WechatAdapter({ api });
    adapter.shareAppMessage({ title: '' });
    assert.equal(shared.length, 1);
    assert.ok((shared[0]?.title ?? '').includes('碎砖大裂变'));
    assert.equal(shared[0]?.title, WECHAT_DEFAULT_SHARE_TITLE);
  });

  it('缺少宿主对象时构造报错（提示注入 globalThis.wx）', () => {
    assert.throws(
      () => new WechatAdapter(),
      /globalThis\.wx|微信宿主对象/,
    );
  });
});
