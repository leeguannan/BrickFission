/**
 * 《碎砖大裂变》(Brick Fission) — 微信小游戏运行时单测
 *
 * 在纯 Node 环境里构造一个**完整的 `globalThis.wx` 伪宿主**：
 *   - `createCanvas()` → 带 2D 上下文的画布（复用渲染层 mock）；
 *   - `createWebAudioContext()` → 伪 AudioContext（可挂起 / 恢复）；
 *   - `createRewardedVideoAd()` → 可「完整观看」的激励视频替身；
 *   - `getStorageSync / setStorageSync` → 内存存档；
 *   - `onTouchStart / onTouchMove / onTouchEnd` → 触摸回调；
 *   - `onShow / onHide / onAudioInterruptionBegin` → 前后台与音频打断。
 *
 * 然后直接驱动微信入口（`src/wechat/main.ts`）跑 300+ 帧，验证：
 *   启动发球 / 拖动控板 / 触发技能 / 点击 HUD 暂停·商店·结算复活 /
 *   切后台自动暂停并挂起音频，全程无异常。
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { makeMockCanvas, type MockCanvas } from '../../game/render/__tests__/mocks.js';
import { buildHudRegions } from '../../game/platform/CanvasHitTester.js';
import {
  WechatGameApp,
  type WechatTouchEvent,
} from '../main.js';
import type { WechatApi } from '../../game/platform/WechatAdapter.stub.js';
import type { WechatTouchApi } from '../main.js';

/* ------------------------------------------------------------------ */
/* 伪 WebAudio                                                         */
/* ------------------------------------------------------------------ */

interface FakeParam {
  value: number;
  setValueAtTime(v: number): void;
  linearRampToValueAtTime(v: number): void;
  exponentialRampToValueAtTime(v: number): void;
  setTargetAtTime(v: number): void;
  cancelScheduledValues(): void;
}

function createParam(initial: number): FakeParam {
  return {
    value: initial,
    setValueAtTime(v: number): void {
      this.value = v;
    },
    linearRampToValueAtTime(v: number): void {
      this.value = v;
    },
    exponentialRampToValueAtTime(v: number): void {
      this.value = v;
    },
    setTargetAtTime(v: number): void {
      this.value = v;
    },
    cancelScheduledValues(): void {
      /* no-op */
    },
  };
}

interface FakeNode {
  connect(): void;
  disconnect(): void;
}

interface FakeSourceNode extends FakeNode {
  start(when?: number): void;
  stop(when?: number): void;
  onended: (() => void) | null;
}

function createNode(extra: Record<string, unknown> = {}): FakeNode {
  return {
    connect(): void {
      /* no-op */
    },
    disconnect(): void {
      /* no-op */
    },
    ...extra,
  };
}

/** 音源节点（振荡器 / 缓冲源）：补齐 `start` / `stop` / `onended`。 */
function createSourceNode(extra: Record<string, unknown> = {}): FakeSourceNode {
  return {
    connect(): void {
      /* no-op */
    },
    disconnect(): void {
      /* no-op */
    },
    start(_when?: number): void {
      /* no-op */
    },
    stop(_when?: number): void {
      /* no-op */
    },
    onended: null,
    ...extra,
  };
}

interface FakeAudioContext {
  state: 'running' | 'suspended' | 'closed';
  currentTime: number;
  sampleRate: number;
  destination: FakeNode;
  createGain(): FakeNode;
  createBiquadFilter(): FakeNode;
  createDynamicsCompressor(): FakeNode;
  createOscillator(): FakeNode;
  createBufferSource(): FakeNode;
  createBuffer(channels: number, length: number, sampleRate: number): unknown;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  close(): Promise<void>;
  suspendCount: number;
}

function createFakeAudioContext(): FakeAudioContext {
  const ctx: FakeAudioContext = {
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    destination: createNode(),
    suspendCount: 0,
    createGain: () => createNode({ gain: createParam(1) }),
    createBiquadFilter: () =>
      createNode({
        type: 'lowpass',
        frequency: createParam(350),
        Q: createParam(1),
        gain: createParam(0),
        detune: createParam(0),
      }),
    createDynamicsCompressor: () =>
      createNode({
        threshold: createParam(-24),
        knee: createParam(30),
        ratio: createParam(12),
        attack: createParam(0.003),
        release: createParam(0.25),
        reduction: 0,
      }),
    createOscillator: () =>
      createSourceNode({ type: 'sine', frequency: createParam(440), detune: createParam(0) }),
    createBufferSource: () =>
      createSourceNode({ buffer: null, loop: false, playbackRate: createParam(1) }),
    createBuffer: (_channels: number, length: number, sampleRate: number) => ({
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length),
    }),
    resume: () => {
      ctx.state = 'running';
      return Promise.resolve();
    },
    suspend: () => {
      ctx.state = 'suspended';
      ctx.suspendCount += 1;
      return Promise.resolve();
    },
    close: () => {
      ctx.state = 'closed';
      return Promise.resolve();
    },
  };
  return ctx;
}

/* ------------------------------------------------------------------ */
/* 伪微信宿主                                                          */
/* ------------------------------------------------------------------ */

const WINDOW_WIDTH = 375;
const WINDOW_HEIGHT = 812;
const SAFE_AREA_TOP = 44;

interface FakeWx {
  api: WechatApi;
  touch: WechatTouchApi;
  audio: FakeAudioContext;
  canvases: MockCanvas[];
  storage: Map<string, unknown>;
  vibrateCount: number;
  /** 触发一次「完整观看」的激励视频。 */
  completeRewardedAd(isEnded: boolean): void;
  /** 模拟切后台。 */
  emitHide(): void;
  /** 模拟回前台。 */
  emitShow(): void;
  /** 模拟音频被打断（来电 / 其他 App 抢占）。 */
  emitAudioInterruption(): void;
  /** 派发触摸事件。 */
  emitTouch(kind: 'start' | 'move' | 'end', x: number, y: number): void;
}

function createFakeWx(): FakeWx {
  const storage = new Map<string, unknown>();
  const canvases: MockCanvas[] = [];
  const audio = createFakeAudioContext();
  const showCbs: (() => void)[] = [];
  const hideCbs: (() => void)[] = [];
  const interruptCbs: (() => void)[] = [];
  const touchStartCbs: ((e: WechatTouchEvent) => void)[] = [];
  const touchMoveCbs: ((e: WechatTouchEvent) => void)[] = [];
  const touchEndCbs: ((e: WechatTouchEvent) => void)[] = [];
  const adCloseCbs: ((res: { isEnded: boolean }) => void)[] = [];
  let adIsEnded = true;
  let vibrateCount = 0;

  const ad = {
    load: () => Promise.resolve(),
    show: () => {
      // 真实广告是异步关闭的；这里用微任务模拟「播放完成后回调」。
      Promise.resolve().then(() => {
        for (const cb of adCloseCbs.slice()) cb({ isEnded: adIsEnded });
      });
      return Promise.resolve();
    },
    onClose: (cb: (res: { isEnded: boolean }) => void) => {
      adCloseCbs.push(cb);
    },
    offClose: (cb: (res: { isEnded: boolean }) => void) => {
      const index = adCloseCbs.indexOf(cb);
      if (index >= 0) adCloseCbs.splice(index, 1);
    },
  };

  const api = {
    getWindowInfo: () => ({
      windowWidth: WINDOW_WIDTH,
      windowHeight: WINDOW_HEIGHT,
      screenWidth: WINDOW_WIDTH,
      screenHeight: WINDOW_HEIGHT,
      pixelRatio: 2,
      safeArea: { top: SAFE_AREA_TOP, bottom: WINDOW_HEIGHT, left: 0, right: WINDOW_WIDTH },
    }),
    createCanvas: () => {
      const canvas = makeMockCanvas(WINDOW_WIDTH, WINDOW_HEIGHT);
      canvases.push(canvas);
      return canvas;
    },
    createWebAudioContext: () => audio,
    createRewardedVideoAd: () => ad,
    getStorageSync: (key: string) => storage.get(key),
    setStorageSync: (key: string, value: unknown) => {
      storage.set(key, value);
    },
    removeStorageSync: (key: string) => {
      storage.delete(key);
    },
    vibrateShort: () => {
      vibrateCount += 1;
    },
    shareAppMessage: () => undefined,
    onShow: (cb: () => void) => showCbs.push(cb),
    offShow: (cb: () => void) => {
      const i = showCbs.indexOf(cb);
      if (i >= 0) showCbs.splice(i, 1);
    },
    onHide: (cb: () => void) => hideCbs.push(cb),
    offHide: (cb: () => void) => {
      const i = hideCbs.indexOf(cb);
      if (i >= 0) hideCbs.splice(i, 1);
    },
    onAudioInterruptionBegin: (cb: () => void) => interruptCbs.push(cb),
    offAudioInterruptionBegin: (cb: () => void) => {
      const i = interruptCbs.indexOf(cb);
      if (i >= 0) interruptCbs.splice(i, 1);
    },
  } as unknown as WechatApi;

  const touch = {
    onTouchStart: (cb: (e: WechatTouchEvent) => void) => touchStartCbs.push(cb),
    onTouchMove: (cb: (e: WechatTouchEvent) => void) => touchMoveCbs.push(cb),
    onTouchEnd: (cb: (e: WechatTouchEvent) => void) => touchEndCbs.push(cb),
    offTouchStart: () => undefined,
    offTouchMove: () => undefined,
    offTouchEnd: () => undefined,
  } as unknown as WechatTouchApi;

  const emitTouch = (kind: 'start' | 'move' | 'end', x: number, y: number): void => {
    const event: WechatTouchEvent = {
      touches: [{ identifier: 1, clientX: x, clientY: y }],
      changedTouches: [{ identifier: 1, clientX: x, clientY: y }],
    };
    const list =
      kind === 'start' ? touchStartCbs : kind === 'move' ? touchMoveCbs : touchEndCbs;
    for (const cb of list.slice()) cb(event);
  };

  return {
    api,
    touch,
    audio,
    canvases,
    storage,
    get vibrateCount(): number {
      return vibrateCount;
    },
    completeRewardedAd(isEnded: boolean): void {
      adIsEnded = isEnded;
      for (const cb of adCloseCbs.slice()) cb({ isEnded });
    },
    emitHide(): void {
      for (const cb of hideCbs.slice()) cb();
    },
    emitShow(): void {
      for (const cb of showCbs.slice()) cb();
    },
    emitAudioInterruption(): void {
      for (const cb of interruptCbs.slice()) cb();
    },
    emitTouch,
  };
}

/* ------------------------------------------------------------------ */
/* 辅助                                                                */
/* ------------------------------------------------------------------ */

/** 逻辑坐标 → 屏幕坐标（与微信端 contain 缩放口径一致）。 */
function toClient(logicalX: number, logicalY: number): { x: number; y: number } {
  const scale = Math.min(WINDOW_WIDTH / 720, WINDOW_HEIGHT / 1280);
  const offsetX = (WINDOW_WIDTH - 720 * scale) / 2;
  const offsetY = (WINDOW_HEIGHT - 1280 * scale) / 2;
  return { x: logicalX * scale + offsetX, y: logicalY * scale + offsetY };
}

/** HUD 命中区矩形中心（逻辑坐标）。 */
function hudCenter(app: WechatGameApp, id: string): { x: number; y: number } {
  const regions = buildHudRegions(app.currentLayout);
  const region = regions.find((r) => r.id === id);
  assert.ok(region, `未找到命中区 ${id}`);
  return { x: region.x + region.width / 2, y: region.y + region.height / 2 };
}

/** 等待若干个微任务 + 一个宏任务（等激励视频异步链路走完）。 */
async function flushAsync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 5));
}

/** 造一个已启动的微信端应用（不自动驱动帧循环，由测试手动 stepFrame）。 */
function createApp(): { app: WechatGameApp; wx: FakeWx } {
  const wx = createFakeWx();
  const app = new WechatGameApp({
    api: wx.api,
    touchApi: wx.touch,
    raf: () => 0,
    caf: () => undefined,
    now: () => 0,
  });
  return { app, wx };
}

/* ------------------------------------------------------------------ */
/* 测试                                                                */
/* ------------------------------------------------------------------ */

describe('微信小游戏运行时（无 DOM 宿主）', () => {
  it('启动后进入 READY_AIM，且不抛异常', () => {
    const { app } = createApp();
    assert.equal(app.currentEngine.currentPhase, 'READY_AIM');
    app.stop();
  });

  it('连续跑 320 帧不抛异常（帧循环 + 渲染 + 音频更新）', () => {
    const { app } = createApp();
    for (let i = 0; i < 320; i += 1) {
      app.stepFrame(1 / 60);
    }
    assert.equal(app.currentEngine.elapsedTimeSec >= 0, true);
    app.stop();
  });

  it('战场拖动瞄准 + 松手发球', () => {
    const { app } = createApp();
    const start = toClient(360, 600);
    app.onTouchStart({ touches: [{ clientX: start.x, clientY: start.y }] });
    const moved = toClient(480, 500);
    app.onTouchMove({ touches: [{ clientX: moved.x, clientY: moved.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: moved.x, clientY: moved.y }] });
    assert.equal(app.currentEngine.currentPhase, 'PLAYING');
    assert.equal(app.currentEngine.activeBallCount, 1);
    app.stop();
  });

  it('拖动控板：相对位移改变挡板目标位置', () => {
    const { app } = createApp();
    const start = toClient(300, 900);
    app.onTouchStart({ touches: [{ clientX: start.x, clientY: start.y }] });
    const before = app.currentEngine.paddle.targetX;
    const moved = toClient(420, 900);
    app.onTouchMove({ touches: [{ clientX: moved.x, clientY: moved.y }] });
    assert.ok(
      Math.abs(app.currentEngine.paddle.targetX - before) > 1,
      '拖动后挡板目标位置未变化',
    );
    app.stop();
  });

  it('点击底部蓝技能按钮触发多球发射（UI 点击被消费）', () => {
    const { app } = createApp();
    app.currentEngine.grantSkill('MULTI_LAUNCH', 3);
    const start = toClient(360, 600);
    app.onTouchStart({ touches: [{ clientX: start.x, clientY: start.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: start.x, clientY: start.y }] });
    const before = app.currentEngine.activeBallCount;

    const center = hudCenter(app, 'hud.skill.multi');
    const client = toClient(center.x, center.y);
    assert.equal(app.hitTest(center.x, center.y), 'hud.skill.multi');
    app.onTouchStart({ touches: [{ clientX: client.x, clientY: client.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: client.x, clientY: client.y }] });
    assert.ok(app.currentEngine.activeBallCount > before, '技能未生效');
    app.stop();
  });

  it('点击暂停按钮弹出暂停面板并暂停物理', () => {
    const { app } = createApp();
    // 先发球进入 PLAYING：READY_AIM 阶段本来就没有物理可暂停。
    const start = toClient(360, 600);
    app.onTouchStart({ touches: [{ clientX: start.x, clientY: start.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: start.x, clientY: start.y }] });
    assert.equal(app.currentEngine.currentPhase, 'PLAYING');

    const center = hudCenter(app, 'hud.pause');
    const client = toClient(center.x, center.y);
    app.onTouchStart({ touches: [{ clientX: client.x, clientY: client.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: client.x, clientY: client.y }] });
    assert.equal(app.currentModalTitle, '已暂停');
    assert.equal(app.currentEngine.currentPhase, 'PAUSED');
    app.stop();
  });

  it('UI 点击不会误触发战场拖动（挡板目标位置不变）', () => {
    const { app } = createApp();
    const before = app.currentEngine.paddle.targetX;
    const center = hudCenter(app, 'hud.pause');
    const client = toClient(center.x, center.y);
    app.onTouchStart({ touches: [{ clientX: client.x, clientY: client.y }] });
    app.onTouchMove({ touches: [{ clientX: client.x + 120, clientY: client.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: client.x + 120, clientY: client.y }] });
    assert.equal(app.currentEngine.paddle.targetX, before);
    app.stop();
  });

  it('暂停面板可进入选关面板', () => {
    const { app } = createApp();
    const pause = hudCenter(app, 'hud.pause');
    const pauseClient = toClient(pause.x, pause.y);
    app.onTouchStart({ touches: [{ clientX: pauseClient.x, clientY: pauseClient.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: pauseClient.x, clientY: pauseClient.y }] });
    assert.equal(app.currentModalTitle, '已暂停');

    // 弹窗第 2 个动作按钮 = 「选关」
    const layout = app.currentLayout;
    const actionY = 340 + 160 + 1 * (76 + 24) + 38;
    const actionX = Math.round((layout.width - 428) / 2) + 214;
    const client = toClient(actionX, actionY);
    assert.equal(app.hitTest(actionX, actionY), 'modal.action.1');
    app.onTouchStart({ touches: [{ clientX: client.x, clientY: client.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: client.x, clientY: client.y }] });
    assert.equal(app.currentModalTitle, '选关');
    app.stop();
  });

  it('点击商店按钮打开皮肤商店（3 款皮肤）', () => {
    const { app } = createApp();
    const center = hudCenter(app, 'hud.shop');
    const client = toClient(center.x, center.y);
    app.onTouchStart({ touches: [{ clientX: client.x, clientY: client.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: client.x, clientY: client.y }] });
    assert.equal(app.currentShopEntryCount, 3);
    assert.equal(app.currentModalTitle, '');
    app.stop();
  });

  it('商店行的试用 / 解锁按钮可命中', () => {
    const { app } = createApp();
    const center = hudCenter(app, 'hud.shop');
    const client = toClient(center.x, center.y);
    app.onTouchStart({ touches: [{ clientX: client.x, clientY: client.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: client.x, clientY: client.y }] });
    // 第 2 行 = 翠竹节（bamboo_green，未解锁但可试用）
    const rowTop = 300 + 80 + 1 * (150 + 20);
    const actionX = 56 + 608 - 16 - 236 + 118;
    const actionY = rowTop + Math.round((150 - 64) / 2) + 32;
    assert.equal(app.hitTest(actionX, actionY), 'shop.bamboo_green.trial');
    app.stop();
  });

  it('球全部出界后弹出复活面板，点击复活恢复游戏', async () => {
    const { app, wx } = createApp();
    const start = toClient(360, 600);
    app.onTouchStart({ touches: [{ clientX: start.x, clientY: start.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: start.x, clientY: start.y }] });
    assert.equal(app.currentEngine.activeBallCount, 1);

    // 把球直接送出底线，触发 GAME_LOST
    const ball = app.currentEngine.physics.balls.find((b) => b.active);
    assert.ok(ball);
    ball.y = 1250;
    ball.vy = 900;
    ball.vx = 0;
    app.stepFrame(1 / 60);
    assert.equal(app.currentModalTitle, '球全部出界');

    // 弹窗第 1 个动作 = 复活续关
    const layout = app.currentLayout;
    const actionY = 340 + 160 + 38;
    const actionX = Math.round((layout.width - 428) / 2) + 214;
    const client = toClient(actionX, actionY);
    assert.equal(app.hitTest(actionX, actionY), 'modal.action.0');
    app.onTouchStart({ touches: [{ clientX: client.x, clientY: client.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: client.x, clientY: client.y }] });
    await flushAsync();
    assert.equal(app.currentEngine.activeBallCount, 3);
    assert.equal(app.currentEngine.currentPhase, 'PLAYING');
    assert.ok(wx.storage.size >= 0);
    app.stop();
  });

  it('切后台自动暂停物理并挂起音频', () => {
    const { app, wx } = createApp();
    const start = toClient(360, 600);
    app.onTouchStart({ touches: [{ clientX: start.x, clientY: start.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: start.x, clientY: start.y }] });
    assert.equal(wx.audio.state, 'running');
    wx.emitHide();
    assert.equal(app.currentEngine.currentPhase, 'PAUSED');
    assert.equal(wx.audio.state, 'suspended');
    wx.emitShow();
    app.stop();
  });

  it('音频被打断（来电）同样按切后台处理', () => {
    const { app, wx } = createApp();
    const start = toClient(360, 600);
    app.onTouchStart({ touches: [{ clientX: start.x, clientY: start.y }] });
    app.onTouchEnd({ changedTouches: [{ clientX: start.x, clientY: start.y }] });
    wx.emitAudioInterruption();
    assert.equal(app.currentEngine.currentPhase, 'PAUSED');
    assert.equal(wx.audio.state, 'suspended');
    app.stop();
  });

  it('Banner 可见时底部技能按钮上移，避开广告禁区', () => {
    const { app } = createApp();
    const before = hudCenter(app, 'hud.skill.multi').y;
    app.setBannerVisible(true);
    const after = hudCenter(app, 'hud.skill.multi').y;
    assert.ok(after < before, `Banner 可见后按钮未上移（${before} → ${after}）`);
    assert.ok(after + 44 <= 1280 - 100, '技能按钮落入 Banner 禁区');
    app.stop();
  });

  it('存档通过 wx.setStorageSync 落盘（微信存储键一致）', () => {
    const { app, wx } = createApp();
    app.onTouchStart({ touches: [{ clientX: 10, clientY: 10 }] });
    app.onTouchEnd({ changedTouches: [{ clientX: 10, clientY: 10 }] });
    assert.equal(wx.storage.has('brick_fission_save_v1'), true);
    app.stop();
  });
});
