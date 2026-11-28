/**
 * 《碎砖大裂变》(Brick Fission) — 微信小游戏无 DOM 启动入口
 *
 * 对应 `docs/04_WECHAT_ADAPTATION_AND_ROADMAP.md` §1.3 与 Milestone 6 需求：
 * 微信小游戏运行时**没有 DOM / CSS**，因此 Web 端的 `index.html` + `HudController` +
 * `InputController` 全部不可用。本文件提供微信端的等价壳层：
 *
 *   - **画布**：`wx.createCanvas()` 第一次调用是「屏幕主画布」，第二次是「逻辑画布」
 *     （交给 `Canvas2DRenderer` 渲染 720×1280 的游戏画面）；
 *     每帧把逻辑画布整体 blit 到主画布（等比 contain），HUD 直接画在逻辑画布上。
 *   - **输入**：`wx.onTouchStart / onTouchMove / onTouchEnd`；先走 `CanvasHitTester`
 *     判断是否点中了 HUD / 弹窗（UI 点击被消费，不触发战场拖动），否则才是拖动控板 / 瞄准。
 *   - **音频**：`wx.createWebAudioContext()` 通过 `contextFactory` 注入 `WebAudioEngine`；
 *     `wx.onShow / onHide / onAudioInterruptionBegin` → 自动暂停物理并挂起音频。
 *   - **存档**：走 `WechatAdapter`（`wx.getStorageSync` / `setStorageSync`）。
 *
 * 纪律：
 *   1. **零 DOM**：本文件不出现 window / document / navigator / localStorage；
 *   2. **零运行期分配**：快照与脏砖缓冲跨帧复用；
 *   3. **可测**：帧循环、触摸回调都可通过构造参数注入，Node 里可用伪宿主直接驱动。
 */
import { GameEngine } from '../game/core/GameEngine.js';
import {
  FIXED_DT,
  REVIVE_BALL_COUNT,
  SKILL_REFILL_COUNT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../game/core/constants.js';
import type { GameEvent, LevelRuntimeConfig } from '../game/core/types.js';
import {
  BUILTIN_LEVEL_COUNT,
  getBuiltinLevel,
  getBuiltinRuntimeConfig,
} from '../game/levels/builtinLevels.js';
import type { IAudioEngine } from '../game/audio/IAudioEngine.js';
import { WebAudioEngine } from '../game/audio/WebAudioEngine.js';
import {
  CanvasHitTester,
  buildModalRegions,
  buildShopRegions,
  computeHudLayout,
  type HudHitRegion,
  type HudLayout,
  type ShopRowState,
} from '../game/platform/CanvasHitTester.js';
import type { AnyCanvas } from '../game/platform/AnyCanvas.js';
import type { PlayerSaveData } from '../game/platform/IPlatformAdapter.js';
import {
  SKIN_CATALOG,
  canAffordSkin,
  canTrialSkin,
  consumeSkillCredit,
  findSkin,
  grantClearReward,
  isSkinUnlocked,
  recordBestTime,
  unlockNextLevel,
  unlockSkin,
} from '../game/platform/Progression.js';
import { WechatAdapter, type WechatApi, type WechatCanvas } from '../game/platform/WechatAdapter.stub.js';
import { Canvas2DRenderer } from '../game/render/Canvas2DRenderer.js';
import {
  CanvasHudRenderer,
  type CanvasHudModel,
  type CanvasModalAction,
  type CanvasModalModel,
  type CanvasShopEntry,
  type CanvasShopModel,
} from '../game/render/CanvasHudRenderer.js';
import type { DirtyBrickUpdate, GameSnapshot, RenderContextData } from '../game/render/IRenderer.js';

/* ------------------------------------------------------------------ */
/* 触摸事件结构（不引用任何 wx 全局类型）                                */
/* ------------------------------------------------------------------ */

/** 单个触点。 */
export interface WechatTouchPoint {
  identifier?: number;
  clientX: number;
  clientY: number;
}

/** 微信触摸事件。 */
export interface WechatTouchEvent {
  touches?: WechatTouchPoint[];
  changedTouches?: WechatTouchPoint[];
}

/**
 * 微信触摸 API（与 `WechatApi` 分开声明，
 * 避免改动既有 `WechatApi` 契约而破坏现有单测的替身实现）。
 */
export interface WechatTouchApi {
  onTouchStart(cb: (event: WechatTouchEvent) => void): void;
  onTouchMove(cb: (event: WechatTouchEvent) => void): void;
  onTouchEnd(cb: (event: WechatTouchEvent) => void): void;
  offTouchStart(cb: (event: WechatTouchEvent) => void): void;
  offTouchMove(cb: (event: WechatTouchEvent) => void): void;
  offTouchEnd(cb: (event: WechatTouchEvent) => void): void;
}

/* ------------------------------------------------------------------ */
/* 启动参数                                                            */
/* ------------------------------------------------------------------ */

export interface WechatGameOptions {
  /** 微信宿主对象（默认从 `globalThis.wx` 读取）。 */
  api?: WechatApi;
  /** 触摸宿主（默认从 `globalThis.wx` 读取）。 */
  touchApi?: WechatTouchApi;
  /** 激励视频广告位 ID。 */
  adUnitId?: string;
  /** 帧循环调度（默认 `globalThis.requestAnimationFrame`）。 */
  raf?: (cb: (time: number) => void) => number;
  /** 帧循环取消。 */
  caf?: (id: number) => void;
  /** 高精度时间（默认 `globalThis.performance.now`）。 */
  now?: () => number;
  /** 构造后是否自动 `start()`（默认 true）。 */
  autoStart?: boolean;
}

/** 单帧 dt 上限：切后台回来后不出现超大跳步。 */
const MAX_FRAME_DT = 1 / 20;
/** 击碎单砖的粒子数（与 Web 端口径一致）。 */
const PARTICLE_COUNTS = [2, 3] as const;

/* ------------------------------------------------------------------ */
/* 应用主体                                                            */
/* ------------------------------------------------------------------ */

/**
 * 微信端游戏壳层。
 *
 * 与 Web 端 `GameApp`（`src/app/main.ts`）共享同一套内核与商业化口径，
 * 差别只在外壳：没有 DOM，所有 UI 都是 Canvas 绘制 + 命中区检测。
 */
export class WechatGameApp {
  private readonly api: WechatApi;
  private readonly touchApi: WechatTouchApi;
  private readonly adapter: WechatAdapter;
  private readonly audio: IAudioEngine;
  private readonly renderer: Canvas2DRenderer;

  private hud: CanvasHudRenderer;
  private hitTester: CanvasHitTester;
  private layout: HudLayout;

  private engine: GameEngine;
  private readonly save: PlayerSaveData;

  private levelIndex = 0;
  private muted = false;
  private resultShown = false;
  /** 激励广告免费试用的皮肤 ID（仅本局有效，不写入存档）。 */
  private trialSkinId: string | null = null;
  /** 本关初始技能配额（每关重置，不写盘）。 */
  private levelQuota = { multi: 0, triple: 0 };
  /** 全局额外技能库存（写盘，跨关保留）。 */
  private extraStock = { multi: 0, triple: 0 };
  /** 最近一次通关的基础金币（翻倍时复用）。 */
  private winBaseCoins = 0;
  private winElapsedSec = 0;

  /** 跨帧复用的脏砖缓冲（零 GC）。 */
  private readonly dirtyBricks: DirtyBrickUpdate[] = [];
  /** 跨帧复用的快照对象（零 GC）。 */
  private readonly snapshot: GameSnapshot;

  private modal: CanvasModalModel | null = null;
  private readonly modalHandlers: (() => void)[] = [];
  private shop: CanvasShopModel | null = null;
  private readonly shopRows: ShopRowState[] = [];

  /** 弹窗是否因为 UI 而暂停了物理（关闭时需要恢复）。 */
  private pausedByUi = false;

  private screenWidth = 0;
  private screenHeight = 0;
  private dpr = 1;
  /** 逻辑画布到屏幕的等比缩放与偏移（contain）。 */
  private viewScale = 1;
  private viewOffsetX = 0;
  private viewOffsetY = 0;

  private mainCanvas: WechatCanvas | null = null;
  private mainCtx: CanvasRenderingContext2D | null = null;
  private logicCanvas: WechatCanvas | null = null;
  private logicCtx: CanvasRenderingContext2D | null = null;

  private dragging = false;
  private lastTouchX = 0;
  private unlocked = false;

  private rafId = 0;
  private lastFrameAt = 0;
  private running = false;

  private readonly raf: (cb: (time: number) => void) => number;
  private readonly caf: (id: number) => void;
  private readonly now: () => number;

  constructor(options: WechatGameOptions = {}) {
    const host = (globalThis as { wx?: WechatApi & WechatTouchApi }).wx;
    this.api = options.api ?? (host as WechatApi);
    this.touchApi = options.touchApi ?? (host as unknown as WechatTouchApi);
    if (!this.api) {
      throw new Error('微信入口需要宿主对象：请注入 options.api，或在微信环境提供 globalThis.wx。');
    }
    this.raf =
      options.raf ??
      ((cb: (time: number) => void) =>
        (globalThis as unknown as { requestAnimationFrame: (c: (t: number) => void) => number })
          .requestAnimationFrame(cb));
    this.caf =
      options.caf ??
      ((id: number) => {
        const g = globalThis as unknown as { cancelAnimationFrame?: (i: number) => void };
        g.cancelAnimationFrame?.(id);
      });
    this.now =
      options.now ??
      (() => {
        const g = globalThis as unknown as { performance?: { now(): number } };
        return g.performance ? g.performance.now() : Date.now();
      });

    this.adapter = new WechatAdapter({ api: this.api, adUnitId: options.adUnitId });
    this.audio = new WebAudioEngine({
      contextFactory: () => this.adapter.createAudioContext() as unknown as AudioContext,
    });
    this.save = this.adapter.loadSaveData();
    this.muted = this.save.muted;
    this.engine = this.createEngine(getBuiltinRuntimeConfig(0));

    this.renderer = new Canvas2DRenderer({
      adapter: this.adapter,
      gridProvider: () => this.engine.grid,
    });

    const metrics = this.adapter.getSystemMetrics();
    this.layout = computeHudLayout({
      safeAreaTop: metrics.safeAreaTop,
      safeAreaBottom: metrics.safeAreaBottom,
    });
    this.hud = new CanvasHudRenderer({ layout: this.layout });
    this.hitTester = new CanvasHitTester(this.layout);

    this.snapshot = {
      phase: 'READY_AIM',
      levelId: this.engine.levelId,
      levelNo: 1,
      paddle: this.engine.paddle,
      balls: this.engine.physics.balls,
      activeBallCount: 0,
      aim: null,
      combo: 0,
      remainingBreakable: 0,
      totalBreakable: 0,
      speedMultiplier: 1,
      damageMultiplier: 1,
      endgameAssist: false,
      paddleSkinId: this.effectiveSkinId,
      muted: this.muted,
    };

    if (options.autoStart !== false) this.start();
  }

  /* ---------------------------------------------------------------- */
  /* 生命周期                                                          */
  /* ---------------------------------------------------------------- */

  /** 启动：建画布、渲染层、绑定触摸与前后台监听、起帧循环。 */
  start(): void {
    if (this.running) return;
    const metrics = this.adapter.getSystemMetrics();
    this.screenWidth = metrics.width;
    this.screenHeight = metrics.height;
    this.dpr = metrics.dpr > 0 ? metrics.dpr : 1;

    // 第 1 次 createCanvas → 屏幕主画布；第 2 次 → 逻辑画布。
    this.mainCanvas = this.api.createCanvas();
    this.mainCanvas.width = Math.max(1, Math.round(this.screenWidth * this.dpr));
    this.mainCanvas.height = Math.max(1, Math.round(this.screenHeight * this.dpr));
    this.mainCtx = this.mainCanvas.getContext('2d') as unknown as CanvasRenderingContext2D | null;
    this.mainCtx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.logicCanvas = this.api.createCanvas();
    this.logicCtx = this.logicCanvas.getContext('2d') as unknown as CanvasRenderingContext2D | null;
    this.renderer.init(this.logicCanvas as unknown as AnyCanvas, WORLD_WIDTH, WORLD_HEIGHT, 1);
    this.renderer.setSkin(this.effectiveSkinId);
    this.updateViewTransform();

    this.touchApi.onTouchStart(this.onTouchStart);
    this.touchApi.onTouchMove(this.onTouchMove);
    this.touchApi.onTouchEnd(this.onTouchEnd);

    this.adapter.onLifecycleChange((state) => {
      // 切后台 / 音频被打断：自动暂停物理并挂起音频（docs/04 §2 合规红线）。
      this.audio.setBackground(state === 'hide');
      if (state === 'hide') {
        this.engine.pause();
        this.audio.setPaused(true);
      }
    });
    // 注意：这里只重建布局，不回灌适配器，避免 setBannerVisible ↔ onBannerVisibilityChange 互相递归。
    this.adapter.onBannerVisibilityChange((visible) => this.applyBannerLayout(visible));

    this.audio.setMuted(this.muted);
    this.adapter.writeSaveData(this.save);

    this.running = true;
    this.lastFrameAt = this.now();
    this.rafId = this.raf(this.frame);
  }

  /** 停止帧循环并释放监听（离场 / 单元测试收尾）。 */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.caf(this.rafId);
    this.touchApi.offTouchStart(this.onTouchStart);
    this.touchApi.offTouchMove(this.onTouchMove);
    this.touchApi.offTouchEnd(this.onTouchEnd);
  }

  /** 释放全部资源（渲染层、音频、适配器）。 */
  dispose(): void {
    this.stop();
    this.renderer.dispose();
    this.audio.dispose();
    this.adapter.dispose();
  }

  /* ---------------------------------------------------------------- */
  /* 主循环                                                            */
  /* ---------------------------------------------------------------- */

  private readonly frame = (time: number): void => {
    if (!this.running) return;
    this.rafId = this.raf(this.frame);
    const dt = Math.min(MAX_FRAME_DT, (time - this.lastFrameAt) / 1000 || FIXED_DT);
    this.lastFrameAt = time;

    this.engine.update(dt);
    this.consumeEvents();
    this.renderFrame(dt);

    this.audio.setIntensity(this.engine.activeBallCount, this.engine.currentSpeedMultiplier);
    this.audio.update(dt);
  };

  /**
   * 手动推进一帧（测试用：注入伪宿主时不必依赖真实 rAF）。
   *
   * @param dtSec 本帧时长（秒）。
   */
  stepFrame(dtSec: number = FIXED_DT): void {
    this.engine.update(dtSec);
    this.consumeEvents();
    this.renderFrame(dtSec);
    this.audio.setIntensity(this.engine.activeBallCount, this.engine.currentSpeedMultiplier);
    this.audio.update(dtSec);
  }

  private renderFrame(dt: number): void {
    const e = this.engine;
    this.dirtyBricks.length = 0;

    const s = this.snapshot;
    s.phase = e.currentPhase;
    s.levelId = e.levelId;
    s.levelNo = this.levelIndex + 1;
    s.paddle = e.paddle;
    s.balls = e.physics.balls;
    s.activeBallCount = e.activeBallCount;
    s.aim = e.currentPhase === 'READY_AIM' ? e.predictAim() : null;
    s.combo = e.combo;
    s.remainingBreakable = e.remainingBreakable;
    s.totalBreakable = e.grid.totalBreakable;
    s.speedMultiplier = e.currentSpeedMultiplier;
    s.damageMultiplier = e.damageMultiplier();
    s.endgameAssist = e.isEndgameAssistActive;
    s.paddleSkinId = this.effectiveSkinId;
    s.muted = this.muted;
    s.fever = e.feverSnapshot;

    const data: RenderContextData = {
      engineState: s,
      dirtyBricks: this.dirtyBricks,
      fullRebuildBricks: false,
    };
    this.renderer.render(data, dt);

    // HUD 画在逻辑画布上（与游戏画面同一张画布）。
    if (this.logicCtx) {
      this.hud.draw(this.logicCtx, this.buildHudModel());
    }

    // 逻辑画布整体 blit 到屏幕主画布（等比 contain）。
    this.presentToScreen();
  }

  /** 把逻辑画布缩放绘制到屏幕主画布。 */
  private presentToScreen(): void {
    const ctx = this.mainCtx;
    const canvas = this.logicCanvas;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);
    const drawWidth = WORLD_WIDTH * this.viewScale;
    const drawHeight = WORLD_HEIGHT * this.viewScale;
    ctx.drawImage(
      canvas as unknown as CanvasImageSource,
      this.viewOffsetX,
      this.viewOffsetY,
      drawWidth,
      drawHeight,
    );
  }

  /** 计算逻辑画布到屏幕的等比缩放与居中偏移。 */
  private updateViewTransform(): void {
    const scale = Math.min(this.screenWidth / WORLD_WIDTH, this.screenHeight / WORLD_HEIGHT);
    this.viewScale = scale > 0 ? scale : 1;
    this.viewOffsetX = (this.screenWidth - WORLD_WIDTH * this.viewScale) / 2;
    this.viewOffsetY = (this.screenHeight - WORLD_HEIGHT * this.viewScale) / 2;
  }

  /* ---------------------------------------------------------------- */
  /* 事件路由                                                          */
  /* ---------------------------------------------------------------- */

  private consumeEvents(): void {
    const events = this.engine.drainEvents();
    for (let i = 0; i < events.length; i += 1) {
      this.routeEvent(events[i]!);
    }
  }

  private routeEvent(event: GameEvent): void {
    switch (event.type) {
      case 'BRICK_HIT': {
        this.audio.playBrickHit(event.combo);
        const cell = this.engine.grid.at(event.col, event.row);
        this.dirtyBricks.push({
          col: event.col,
          row: event.row,
          cell: cell ?? { role: 'EMPTY', hp: 0, maxHp: 0, colorIndex: 0 },
          destroyed: event.destroyed,
        });
        if (event.destroyed) {
          const count = PARTICLE_COUNTS[Math.floor(Math.random() * PARTICLE_COUNTS.length)]!;
          this.renderer.spawnBrickParticles(event.x, event.y, event.color, count);
        }
        break;
      }
      case 'WALL_HIT':
        this.audio.playWallHit();
        break;
      case 'PADDLE_HIT':
        this.audio.playPaddleHit(event.offsetRatio);
        this.adapter.vibrateShort('light');
        break;
      case 'SKILL_USED':
        if (event.skill === 'MULTI_LAUNCH') this.audio.playMultiLaunch();
        else this.audio.playTripleSplit();
        this.adapter.vibrateShort('medium');
        this.renderer.triggerScreenShake(6, 180);
        break;
      case 'DAMAGE_OVERLOAD':
        this.renderer.triggerScreenShake(10, 260);
        this.adapter.vibrateShort('heavy');
        break;
      case 'ENDGAME_ASSIST':
        this.renderer.triggerScreenShake(4, 160);
        break;
      case 'BALL_LOST':
        this.adapter.vibrateShort('light');
        break;
      case 'GAME_WON':
        this.audio.playWin();
        this.onLevelWon(event.elapsedSec);
        break;
      case 'GAME_LOST':
        this.audio.playLose();
        this.onLevelLost(event.remainingRatio);
        break;
      case 'SKILL_GRANTED':
        break;
      /* ---------------- Milestone 5 / Step 2 ---------------- */
      case 'BOMB_EXPLODED':
        this.audio.playBombExplosion();
        this.renderer.triggerScreenShake(12, 320);
        this.adapter.vibrateShort('heavy');
        this.spawnBurstParticles(event.x, event.y, event.affectedCount + 6, 6);
        break;
      case 'PRISM_SPLIT':
        this.audio.playPrismSplit();
        this.spawnBurstParticles(event.x, event.y, 6, 5);
        break;
      case 'CORE_GRANTED':
        this.audio.playCoreGrant();
        this.renderer.triggerScreenShake(6, 180);
        this.spawnBurstParticles(event.x, event.y, 8, 3);
        break;
      case 'PRECISE_CATCH':
        this.audio.playPreciseCatch();
        break;
      case 'FEVER_ACTIVATED':
        this.audio.playFeverActivate();
        this.audio.setFever(true);
        this.renderer.triggerScreenShake(16, 420);
        this.adapter.vibrateShort('heavy');
        break;
      case 'FEVER_ENDED':
        this.audio.playFeverEnd();
        this.audio.setFever(false);
        break;
      default:
        break;
    }
  }

  private spawnBurstParticles(
    x: number,
    y: number,
    count: number,
    colorIndex: number,
  ): void {
    const total = Math.max(1, Math.min(24, Math.round(count)));
    this.renderer.spawnEffectBurst?.(x, y, colorIndex, total);
  }

  /* ---------------------------------------------------------------- */
  /* 触摸                                                              */
  /* ---------------------------------------------------------------- */

  /** 触摸开始：先判 UI（消费点击），否则进入战场拖动。 */
  readonly onTouchStart = (event: WechatTouchEvent): void => {
    if (!this.unlocked) {
      this.unlocked = true;
      void this.audio.unlock();
    }
    const touch = firstTouch(event);
    if (!touch) return;
    const logical = this.toLogical(touch.clientX, touch.clientY);
    if (!logical) return;

    const region = this.hitTester.hitTest(logical.x, logical.y);
    if (region) {
      this.handleRegionTap(region);
      return;
    }
    this.dragging = true;
    this.lastTouchX = touch.clientX;
    this.handleAimPoint(logical.x, logical.y);
  };

  /** 触摸移动：相对位移控板（READY_AIM 时同时跟手瞄准）。 */
  readonly onTouchMove = (event: WechatTouchEvent): void => {
    if (!this.dragging) return;
    const touch = firstTouch(event);
    if (!touch) return;
    const dx = (touch.clientX - this.lastTouchX) / this.viewScale;
    this.lastTouchX = touch.clientX;
    if (dx !== 0) this.handlePaddleDelta(dx);
    const logical = this.toLogical(touch.clientX, touch.clientY);
    if (logical) this.handleAimPoint(logical.x, logical.y);
  };

  /** 触摸结束：READY_AIM 阶段松手发球。 */
  readonly onTouchEnd = (event: WechatTouchEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    const touch = firstTouch(event);
    if (touch) {
      const logical = this.toLogical(touch.clientX, touch.clientY);
      if (logical) this.handleAimPoint(logical.x, logical.y);
    }
    this.handleRelease();
  };

  /** 屏幕坐标 → 逻辑画布坐标（超出画布返回 null）。 */
  private toLogical(clientX: number, clientY: number): { x: number; y: number } | null {
    const x = (clientX - this.viewOffsetX) / this.viewScale;
    const y = (clientY - this.viewOffsetY) / this.viewScale;
    if (x < 0 || x > WORLD_WIDTH || y < 0 || y > WORLD_HEIGHT) return null;
    return { x, y };
  }

  private handlePaddleDelta(dx: number): void {
    this.engine.setPaddleTargetX(this.engine.paddle.targetX + dx);
  }

  private handleAimPoint(x: number, y: number): void {
    if (this.engine.currentPhase !== 'READY_AIM') return;
    const docked = this.engine.dockedBallPosition;
    const angleDeg = (Math.atan2(x - docked.x, -(y - docked.y)) * 180) / Math.PI;
    this.engine.setAimAngle(angleDeg);
  }

  private handleRelease(): void {
    if (this.engine.currentPhase !== 'READY_AIM') return;
    this.engine.releaseBall();
  }

  /* ---------------------------------------------------------------- */
  /* 命中区分发                                                        */
  /* ---------------------------------------------------------------- */

  private handleRegionTap(region: HudHitRegion): void {
    if (region.kind === 'hud') {
      switch (region.id) {
        case 'hud.pause':
          this.openPauseModal();
          break;
        case 'hud.speed':
          this.cycleSpeed();
          break;
        case 'hud.shop':
          this.openShop();
          break;
        case 'hud.skill.multi':
          this.useMultiLaunch();
          break;
        case 'hud.skill.triple':
          this.useTripleSplit();
          break;
        case 'hud.sound':
          this.toggleMuted();
          break;
        default:
          break;
      }
      return;
    }
    if (region.kind === 'modal') {
      if (region.id === 'modal.close') {
        this.closeModal();
        return;
      }
      const index = Number(region.id.slice('modal.action.'.length));
      const handler = Number.isInteger(index) ? this.modalHandlers[index] : undefined;
      if (handler) handler();
      return;
    }
    // 商店
    if (region.id === 'shop.close') {
      this.closeShop();
      return;
    }
    const parts = region.id.split('.');
    if (parts.length === 3 && parts[0] === 'shop') {
      const skinId = parts[1]!;
      const action = parts[2]!;
      if (action === 'equip') this.equipSkin(skinId);
      else if (action === 'unlock') void this.buySkin(skinId);
      else if (action === 'trial') void this.trialSkin(skinId);
    }
  }

  /* ---------------------------------------------------------------- */
  /* HUD 动作                                                          */
  /* ---------------------------------------------------------------- */

  private cycleSpeed(): void {
    const next = this.engine.currentSpeedMultiplier >= 3 ? 1 : this.engine.currentSpeedMultiplier + 1;
    this.engine.setSpeedMultiplier(next);
  }

  private toggleMuted(): void {
    this.muted = !this.muted;
    this.audio.setMuted(this.muted);
    this.save.muted = this.muted;
    this.adapter.writeSaveData(this.save);
  }

  private useMultiLaunch(): void {
    if (this.engine.skillInventory.multiLaunchCount <= 0) {
      void this.refillSkill('MULTI_LAUNCH');
      return;
    }
    const result = this.engine.useMultiLaunch();
    if (!result.used) return;
    this.consumeSkillCredit('MULTI_LAUNCH');
  }

  private useTripleSplit(): void {
    if (this.engine.skillInventory.tripleSplitCount <= 0) {
      void this.refillSkill('TRIPLE_SPLIT');
      return;
    }
    const result = this.engine.useTripleSplit();
    if (!result.used) return;
    this.consumeSkillCredit('TRIPLE_SPLIT');
  }

  /* ---------------------------------------------------------------- */
  /* 弹窗                                                              */
  /* ---------------------------------------------------------------- */

  /** 打开弹窗（暂停物理，模态屏蔽 HUD）。 */
  private showModal(title: string, body: string, actions: CanvasModalAction[], handlers: (() => void)[]): void {
    if (this.engine.currentPhase === 'PLAYING') {
      this.engine.pause();
      this.audio.setPaused(true);
      this.pausedByUi = true;
    }
    this.modal = { title, body, actions };
    this.modalHandlers.length = 0;
    for (let i = 0; i < handlers.length; i += 1) this.modalHandlers.push(handlers[i]!);
    this.hitTester.setOverlay(buildModalRegions(this.layout, actions.length));
  }

  /** 关闭弹窗（若因 UI 暂停了物理则恢复）。 */
  private closeModal(): void {
    this.modal = null;
    this.modalHandlers.length = 0;
    this.hitTester.setOverlay(null);
    if (this.pausedByUi) {
      this.pausedByUi = false;
      if (this.engine.currentPhase === 'PAUSED') {
        this.engine.resume();
        this.audio.setPaused(false);
      }
    }
  }

  /** 暂停弹窗（含「选关」入口）。 */
  private openPauseModal(): void {
    const level = getBuiltinLevel(this.levelIndex);
    this.showModal(
      '已暂停',
      `第 ${this.levelIndex + 1} 关 · ${level.name}`,
      [
        { id: 'resume', label: '继续游戏', primary: true },
        { id: 'levels', label: '选关' },
        { id: 'restart', label: '重开本关' },
      ],
      [
        () => this.closeModal(),
        () => this.openLevelSelectModal(),
        () => {
          this.closeModal();
          this.restartLevel();
        },
      ],
    );
  }

  /** 选关弹窗（上一关 / 下一关 / 返回）。 */
  private openLevelSelectModal(): void {
    const level = getBuiltinLevel(this.levelIndex);
    const hasPrev = this.levelIndex > 0;
    const hasNext = this.levelIndex + 1 < BUILTIN_LEVEL_COUNT;
    this.showModal(
      '选关',
      `当前：第 ${this.levelIndex + 1} 关 · ${level.name}（已解锁 ${this.save.unlockedLevel} 关）`,
      [
        { id: 'prev', label: '上一关' },
        { id: 'next', label: '下一关' },
        { id: 'back', label: '返回', primary: true },
      ],
      [
        () => {
          if (hasPrev) this.switchLevel(this.levelIndex - 1);
          this.openLevelSelectModal();
        },
        () => {
          if (hasNext) this.switchLevel(this.levelIndex + 1);
          this.openLevelSelectModal();
        },
        () => this.openPauseModal(),
      ],
    );
  }

  /** 通关结算弹窗（含金币翻倍激励）。 */
  private showWinModal(elapsedSec: number, baseCoins: number, doubled: boolean): void {
    const hasNext = this.levelIndex + 1 < BUILTIN_LEVEL_COUNT;
    const body = doubled
      ? `基础奖励 ${baseCoins} 金币已翻倍，额外到账 ${baseCoins} 金币（当前 ${this.save.coins} 金币）`
      : `用时 ${elapsedSec.toFixed(1)} 秒 · 获得 ${baseCoins} 金币`;
    const actions: CanvasModalAction[] = [];
    const handlers: (() => void)[] = [];
    if (!doubled) {
      actions.push({ id: 'double', label: '金币翻倍（观看激励）', primary: true });
      handlers.push(() => void this.watchDoubleCoins(baseCoins));
    }
    actions.push({ id: 'restart', label: '重开本关' });
    handlers.push(() => {
      this.closeModal();
      this.restartLevel();
    });
    if (hasNext) {
      actions.push({ id: 'next', label: '下一关' });
      handlers.push(() => {
        this.closeModal();
        this.switchLevel(this.levelIndex + 1);
      });
    }
    this.showModal('通关！', body, actions, handlers);
  }

  /** 失败复活弹窗。 */
  private showLoseModal(remainingRatio: number): void {
    this.showModal(
      '球全部出界',
      `剩余可破坏砖块 ${(remainingRatio * 100).toFixed(1)}%`,
      [
        { id: 'revive', label: `复活续关（保留进度 + ${REVIVE_BALL_COUNT} 球）`, primary: true },
        { id: 'restart', label: '直接重开' },
      ],
      [
        () => void this.watchRevive(),
        () => {
          this.closeModal();
          this.restartLevel();
        },
      ],
    );
  }

  /* ---------------------------------------------------------------- */
  /* 皮肤商店                                                          */
  /* ---------------------------------------------------------------- */

  private openShop(): void {
    const entries: CanvasShopEntry[] = SKIN_CATALOG.map((skin) => ({
      id: skin.id,
      name: skin.displayName,
      price: skin.price,
      unlocked: isSkinUnlocked(this.save, skin.id),
      equipped: this.effectiveSkinId === skin.id,
      canTrial: canTrialSkin(skin.id),
    }));
    this.shop = { entries };
    this.shopRows.length = 0;
    for (const entry of entries) {
      const action: ShopRowState['action'] = entry.unlocked
        ? 'equip'
        : canAffordSkin(this.save, entry.id)
          ? 'unlock'
          : 'trial';
      this.shopRows.push({ id: entry.id, action });
    }
    if (this.engine.currentPhase === 'PLAYING') {
      this.engine.pause();
      this.audio.setPaused(true);
      this.pausedByUi = true;
    }
    this.modal = null;
    this.hitTester.setOverlay(buildShopRegions(this.layout, this.shopRows));
  }

  private closeShop(): void {
    this.shop = null;
    this.shopRows.length = 0;
    this.hitTester.setOverlay(null);
    if (this.pausedByUi) {
      this.pausedByUi = false;
      if (this.engine.currentPhase === 'PAUSED') {
        this.engine.resume();
        this.audio.setPaused(false);
      }
    }
  }

  /** 装备已解锁皮肤。 */
  private equipSkin(skinId: string): void {
    if (!isSkinUnlocked(this.save, skinId)) {
      this.openShop();
      return;
    }
    this.trialSkinId = null;
    this.renderer.setSkin(skinId);
    this.save.selectedPaddleSkin = skinId;
    this.adapter.writeSaveData(this.save);
    this.openShop();
  }

  /** 金币解锁皮肤（永久拥有）。 */
  private async buySkin(skinId: string): Promise<void> {
    const entry = findSkin(skinId);
    if (!entry) return;
    if (isSkinUnlocked(this.save, skinId)) {
      this.equipSkin(skinId);
      return;
    }
    if (!canAffordSkin(this.save, skinId)) return;
    if (!unlockSkin(this.save, skinId)) return;
    this.adapter.writeSaveData(this.save);
    this.trialSkinId = null;
    this.renderer.setSkin(skinId);
  }

  /** 激励广告免费试用皮肤（仅本局有效）。 */
  private async trialSkin(skinId: string): Promise<void> {
    const entry = findSkin(skinId);
    if (!entry || !canTrialSkin(skinId)) return;
    const { rewarded } = await this.adapter.showRewardedVideo('TRIAL_SKIN');
    if (!rewarded) return;
    this.trialSkinId = skinId;
    this.renderer.setSkin(skinId);
  }

  /* ---------------------------------------------------------------- */
  /* 商业化循环                                                        */
  /* ---------------------------------------------------------------- */

  /** 技能补给：观看激励 → 发放全局库存（期间自动暂停物理）。 */
  private async refillSkill(skill: 'MULTI_LAUNCH' | 'TRIPLE_SPLIT'): Promise<void> {
    const placement = skill === 'MULTI_LAUNCH' ? 'REFILL_SKILL_BLUE' : 'REFILL_SKILL_ORANGE';
    const wasPlaying = this.engine.currentPhase === 'PLAYING';
    if (wasPlaying) {
      this.engine.pause();
      this.audio.setPaused(true);
    }
    try {
      const { rewarded } = await this.adapter.showRewardedVideo(placement);
      if (rewarded) {
        this.engine.grantSkill(skill, SKILL_REFILL_COUNT);
        if (skill === 'MULTI_LAUNCH') {
          this.extraStock.multi += SKILL_REFILL_COUNT;
          this.save.multiLaunchStock = this.extraStock.multi;
        } else {
          this.extraStock.triple += SKILL_REFILL_COUNT;
          this.save.tripleSplitStock = this.extraStock.triple;
        }
        this.adapter.writeSaveData(this.save);
      }
    } finally {
      if (wasPlaying && this.engine.currentPhase === 'PAUSED') {
        this.engine.resume();
        this.audio.setPaused(false);
      }
    }
  }

  /** 失败复活：观看激励 → 保留进度 + 赠送 3 颗球。 */
  private async watchRevive(): Promise<void> {
    const { rewarded } = await this.adapter.showRewardedVideo('REVIVE_KEEP_PROGRESS');
    if (!rewarded) return;
    const ok = this.engine.revive(REVIVE_BALL_COUNT);
    if (!ok) return;
    this.resultShown = false;
    this.closeModal();
    this.audio.setPaused(false);
  }

  /** 过关金币翻倍：看完激励再发一份基础奖励，并重新弹出结算窗。 */
  private async watchDoubleCoins(baseCoins: number): Promise<void> {
    const { rewarded } = await this.adapter.showRewardedVideo('DOUBLE_CLEAR_REWARD');
    if (!rewarded) return;
    this.save.coins += baseCoins;
    this.adapter.writeSaveData(this.save);
    this.showWinModal(this.winElapsedSec, baseCoins, true);
  }

  /* ---------------------------------------------------------------- */
  /* 关卡与皮肤                                                        */
  /* ---------------------------------------------------------------- */

  private createEngine(level: LevelRuntimeConfig): GameEngine {
    this.levelQuota = {
      multi: level.initialSkills?.multiLaunchCount ?? 0,
      triple: level.initialSkills?.tripleSplitCount ?? 0,
    };
    this.extraStock = {
      multi: this.save.multiLaunchStock,
      triple: this.save.tripleSplitStock,
    };
    return new GameEngine({
      level,
      initialSkills: {
        multiLaunchCount: this.levelQuota.multi + this.extraStock.multi,
        tripleSplitCount: this.levelQuota.triple + this.extraStock.triple,
      },
    });
  }

  private persistSkillStock(): void {
    this.save.multiLaunchStock = this.extraStock.multi;
    this.save.tripleSplitStock = this.extraStock.triple;
    this.adapter.writeSaveData(this.save);
  }

  private consumeSkillCredit(skill: 'MULTI_LAUNCH' | 'TRIPLE_SPLIT'): void {
    const isBlue = skill === 'MULTI_LAUNCH';
    const next = consumeSkillCredit({
      quota: isBlue ? this.levelQuota.multi : this.levelQuota.triple,
      extra: isBlue ? this.extraStock.multi : this.extraStock.triple,
    });
    if (isBlue) {
      this.levelQuota.multi = next.quota;
      this.extraStock.multi = next.extra;
      if (next.usedExtra) {
        this.save.multiLaunchStock = next.extra;
        this.adapter.writeSaveData(this.save);
      }
    } else {
      this.levelQuota.triple = next.quota;
      this.extraStock.triple = next.extra;
      if (next.usedExtra) {
        this.save.tripleSplitStock = next.extra;
        this.adapter.writeSaveData(this.save);
      }
    }
  }

  /** 切换关卡（未解锁则忽略）。 */
  private switchLevel(index: number): void {
    const safe = Math.max(0, Math.min(BUILTIN_LEVEL_COUNT - 1, index));
    if (safe + 1 > this.save.unlockedLevel) return;
    this.persistSkillStock();
    this.levelIndex = safe;
    this.trialSkinId = null;
    this.engine = this.createEngine(getBuiltinRuntimeConfig(safe));
    this.renderer.setSkin(this.effectiveSkinId);
    this.afterLevelReload();
  }

  /** 重开本关。 */
  private restartLevel(): void {
    this.persistSkillStock();
    this.trialSkinId = null;
    this.engine = this.createEngine(getBuiltinRuntimeConfig(this.levelIndex));
    this.renderer.setSkin(this.effectiveSkinId);
    this.afterLevelReload();
  }

  private afterLevelReload(): void {
    this.resultShown = false;
    this.dirtyBricks.length = 0;
    this.modal = null;
    this.shop = null;
    this.modalHandlers.length = 0;
    this.shopRows.length = 0;
    this.hitTester.setOverlay(null);
    this.pausedByUi = false;
    this.audio.setPaused(false);
  }

  /** 当前生效皮肤（试用优先于存档选中项）。 */
  private get effectiveSkinId(): string {
    return this.trialSkinId ?? this.save.selectedPaddleSkin;
  }

  /* ---------------------------------------------------------------- */
  /* 结算                                                              */
  /* ---------------------------------------------------------------- */

  private onLevelWon(elapsedSec: number): void {
    if (this.resultShown) return;
    this.resultShown = true;
    const levelId = this.engine.levelId;
    const firstClear = this.save.bestTimesSec[levelId] === undefined;
    recordBestTime(this.save, levelId, elapsedSec);
    unlockNextLevel(this.save, this.levelIndex);

    const remainingRatio = 1 - this.engine.remainingRatio;
    const baseCoins = grantClearReward(this.save, {
      remainingRatio: Math.max(0, Math.min(1, remainingRatio)),
      firstClear,
      doubled: false,
    });
    this.persistSkillStock();
    this.adapter.writeSaveData(this.save);

    this.winElapsedSec = elapsedSec;
    this.winBaseCoins = baseCoins;
    this.showWinModal(elapsedSec, baseCoins, false);
  }

  private onLevelLost(remainingRatio: number): void {
    if (this.resultShown) return;
    this.resultShown = true;
    this.persistSkillStock();
    this.showLoseModal(remainingRatio);
  }

  /* ---------------------------------------------------------------- */
  /* HUD 模型                                                         */
  /* ---------------------------------------------------------------- */

  private buildHudModel(): CanvasHudModel {
    const inv = this.engine.skillInventory;
    const fever = this.engine.feverSnapshot;
    return {
      phase: this.engine.currentPhase,
      levelNo: this.levelIndex + 1,
      levelName: getBuiltinLevel(this.levelIndex).name,
      remainingBreakable: this.engine.remainingBreakable,
      totalBreakable: this.engine.grid.totalBreakable,
      coins: this.save.coins,
      speedMultiplier: this.engine.currentSpeedMultiplier,
      muted: this.muted,
      paused: this.engine.currentPhase === 'PAUSED',
      fever,
      multiLaunchCount: inv.multiLaunchCount,
      tripleSplitCount: inv.tripleSplitCount,
      aimHint: this.engine.currentPhase === 'READY_AIM' ? '拖动瞄准，松手发球' : '',
      modal: this.modal,
      shop: this.shop,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Banner / 布局                                                     */
  /* ---------------------------------------------------------------- */

  /**
   * Banner 广告位可见性变化：底部可点击元素整体上移，
   * 避免落在 Banner 禁区内（微信合规红线）。
   */
  setBannerVisible(visible: boolean): void {
    this.applyBannerLayout(visible);
    this.adapter.setBannerVisible(visible);
  }

  /**
   * 只按 Banner 可见性重建 HUD 布局与命中区。
   *
   * 与 {@link setBannerVisible} 分开，是为了断开「外壳广播 → 适配器 → 外壳回调」
   * 的环形引用：适配器的 `onBannerVisibilityChange` 只走这里，不再回灌适配器。
   */
  private applyBannerLayout(visible: boolean): void {
    this.layout = computeHudLayout({
      safeAreaTop: this.layout.safeAreaTop,
      safeAreaBottom: this.layout.safeAreaBottom,
      bannerVisible: visible,
    });
    this.hud = new CanvasHudRenderer({ layout: this.layout });
    this.hitTester = new CanvasHitTester(this.layout);
    if (this.modal) {
      this.hitTester.setOverlay(buildModalRegions(this.layout, this.modal.actions.length));
    } else if (this.shop) {
      this.hitTester.setOverlay(buildShopRegions(this.layout, this.shopRows));
    }
  }

  /* ---------------------------------------------------------------- */
  /* 只读状态（供测试与调试）                                          */
  /* ---------------------------------------------------------------- */

  /** 当前引擎（只读用途）。 */
  get currentEngine(): GameEngine {
    return this.engine;
  }

  /** 当前弹窗标题（空串表示无弹窗）。 */
  get currentModalTitle(): string {
    return this.modal?.title ?? '';
  }

  /** 当前商店条目数（0 表示未打开）。 */
  get currentShopEntryCount(): number {
    return this.shop?.entries.length ?? 0;
  }

  /** 当前命中的 HUD 布局（供测试断言）。 */
  get currentLayout(): HudLayout {
    return this.layout;
  }

  /**
   * 命中测试（只读）：返回命中区域的 id，未命中返回 null。
   *
   * 供单测与调试使用，**不改变任何游戏状态**。
   */
  hitTest(x: number, y: number): string | null {
    const region = this.hitTester.hitTest(x, y);
    return region ? region.id : null;
  }

  /** 逻辑坐标 → 屏幕坐标（测试与调试用，便于构造触摸点）。 */
  toClient(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.viewScale + this.viewOffsetX,
      y: y * this.viewScale + this.viewOffsetY,
    };
  }

  /** 最近一次通关基础金币。 */
  get lastWinBaseCoins(): number {
    return this.winBaseCoins;
  }
}

/* ------------------------------------------------------------------ */
/* 辅助函数                                                            */
/* ------------------------------------------------------------------ */

/** 取第一个触点（优先 changedTouches）。 */
function firstTouch(event: WechatTouchEvent): WechatTouchPoint | null {
  const changed = event.changedTouches;
  if (changed && changed.length > 0) return changed[0] ?? null;
  const touches = event.touches;
  if (touches && touches.length > 0) return touches[0] ?? null;
  return null;
}

/**
 * 微信小游戏启动入口。
 *
 * 宿主对象缺失时**不抛错**（例如在浏览器里误打开产物），
 * 只打印提示，避免白屏崩溃。
 */
export function bootstrapWechatGame(): WechatGameApp | null {
  const host = (globalThis as { wx?: WechatApi & WechatTouchApi }).wx;
  if (!host) {
    // eslint-disable-next-line no-console
    console.warn('[BrickFission] 未检测到微信宿主 globalThis.wx，跳过启动。');
    return null;
  }
  return new WechatGameApp({ api: host, touchApi: host });
}

/*
 * 打包入口：`scripts/build-wechat.ts` 以本文件为唯一入口打成单文件 IIFE，
 * 微信小游戏加载 `game.js` 时即执行此行，自动启动游戏。
 * Node 测试环境没有 `globalThis.wx`，此处会自动跳过（只打印一行提示）。
 */
bootstrapWechatGame();
