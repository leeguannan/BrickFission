/**
 * 《碎砖大裂变》(Brick Fission) — Milestone 2 Web 试玩壳层装配入口
 *
 * 原生 TypeScript + DOM（无框架依赖，贴合微信迁端与极小包体目标）：
 *   GameEngine（纯逻辑） + Canvas2DRenderer（离屏缓存渲染）
 *   + WebAudioEngine（程序化音频） + WebAdapter（存档/震动/生命周期）
 *   + InputController（相对位移控板） + HudController（DOM HUD）。
 */
import {
  FIXED_DT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../game/core/constants.js';
import { GameEngine } from '../game/core/GameEngine.js';
import type { GameEvent } from '../game/core/types.js';
import { WebAudioEngine } from '../game/audio/WebAudioEngine.js';
import type { IAudioEngine } from '../game/audio/IAudioEngine.js';
import {
  PADDLE_SKIN_BAMBOO_GREEN,
  PADDLE_SKIN_CAPSULE_BLUE,
  PADDLE_SKIN_MINIMAL_WHITE,
} from '../game/render/SkinRegistry.js';
import { Canvas2DRenderer } from '../game/render/Canvas2DRenderer.js';
import type {
  DirtyBrickUpdate,
  GameSnapshot,
  RenderContextData,
} from '../game/render/IRenderer.js';
import { WebAdapter } from '../game/platform/WebAdapter.js';
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
import type { LevelRuntimeConfig } from '../game/core/types.js';
import { REVIVE_BALL_COUNT, SKILL_REFILL_COUNT, BANNER_RESERVED_HEIGHT } from '../game/core/constants.js';
import { computeBannerLayout, computeSafeAreaPadding } from '../game/core/Layout.js';
import type { SystemMetrics } from '../game/platform/IPlatformAdapter.js';
import {
  BUILTIN_LEVELS,
  BUILTIN_LEVEL_COUNT,
  getBuiltinRuntimeConfig,
} from '../game/levels/builtinLevels.js';
import { StudioController } from '../studio/StudioController.js';
import '../studio/studio.css';
import { HudController } from './HudController.js';
import type { ModalAction } from './HudController.js';
import { InputController } from './InputController.js';
import { installE2EProbe } from './e2eProbe.js';

const SKIN_LABELS: Readonly<Record<string, string>> = {
  [PADDLE_SKIN_CAPSULE_BLUE]: '经典蓝胶囊',
  [PADDLE_SKIN_BAMBOO_GREEN]: '翠竹节',
  [PADDLE_SKIN_MINIMAL_WHITE]: '极简白',
};

/** 单帧 dt 上限：防止切后台回来后 rAF 大跳步。 */
const MAX_FRAME_DT = 1 / 20;
/** 击碎单砖的粒子数（docs/02 §2.2：2~3 粒）。 */
const PARTICLE_COUNTS = [2, 3] as const;

class GameApp {
  private readonly adapter = new WebAdapter();
  private readonly audio: IAudioEngine = new WebAudioEngine();
  private readonly renderer: Canvas2DRenderer;
  private readonly hud: HudController;
  private readonly input: InputController;
  private readonly save: PlayerSaveData;

  private engine: GameEngine;
  private levelIndex = 0;
  private muted = false;
  private rafId = 0;
  private lastFrameAt = 0;
  private resultShown = false;
  /** 是否正在试玩 Studio 自定义关（切内置关时清除）。 */
  private playingCustom = false;
  /** 激励广告免费试用的皮肤 ID（仅本局有效，不写入存档）。 */
  private trialSkinId: string | null = null;
  /** 本关初始技能配额（每关重置，不写盘；来源为关卡配置）。 */
  private levelQuota = { multi: 0, triple: 0 };
  /** 全局额外技能库存（广告/购买获得，写盘；跨关保留且可被真实扣减）。 */
  private extraStock = { multi: 0, triple: 0 };
  /** 当前试玩的 Studio 自定义关卡运行时配置（重开时复用）。 */
  private customConfig: LevelRuntimeConfig | null = null;
  /** 最近一次通关用时（翻倍后重显结算窗时复用）。 */
  private winElapsedSec = 0;
  private readonly studio: StudioController;

  /** 跨帧复用的脏砖缓冲（避免每帧分配，零 GC 红线在外壳层同样遵守）。 */
  private readonly dirtyBricks: DirtyBrickUpdate[] = [];
  private snapshot: GameSnapshot | null = null;
  private readonly canvas: HTMLCanvasElement;

  constructor() {
    this.save = this.adapter.loadSaveData();
    this.muted = this.save.muted;

    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.engine = this.createEngine(getBuiltinRuntimeConfig(0));

    this.studio = new StudioController({
      onPlay: (config) => this.loadCustomLevel(config),
      onClose: () => undefined,
    });

    this.renderer = new Canvas2DRenderer({
      adapter: this.adapter,
      gridProvider: () => this.engine.grid,
    });

    this.hud = new HudController({
      onSpeedCycle: () => this.cycleSpeed(),
      onRestart: () => this.restartLevel(),
      onPauseToggle: () => this.togglePause(),
      onSoundToggle: () => this.toggleMuted(),
      onMultiLaunch: () => this.useMultiLaunch(),
      onTripleSplit: () => this.useTripleSplit(),
      onLevelChange: (i) => this.switchLevel(i),
      onSkinChange: (id) => this.switchSkin(id),
      onShopOpen: () => this.openShop(),
    });

    this.input = new InputController(this.canvas, {
      onPaddleDelta: (dx) => this.handlePaddleDelta(dx),
      onAimPoint: (x, y) => this.handleAimPoint(x, y),
      onRelease: () => this.handleRelease(),
      onUnlock: () => void this.audio.unlock(),
    });
  }

  start(): void {
    const metrics = this.adapter.getSystemMetrics();
    this.renderer.init(this.canvas, WORLD_WIDTH, WORLD_HEIGHT, metrics.dpr);
    this.renderer.setSkin(this.effectiveSkinId);
    this.applySafeArea(metrics);

    this.hud.fillLevelSelect(
      BUILTIN_LEVELS.map((d) => d.name),
      this.levelIndex,
      this.save.unlockedLevel,
    );
    this.hud.fillSkinSelect(SKIN_LABELS, this.save.selectedPaddleSkin, this.save.unlockedSkins);
    this.bindStudioButton();
    this.hud.setLevelNo(1);
    this.hud.setSpeedLabel(1);
    this.hud.setSoundLabel(this.muted);
    this.hud.setCoins(this.save.coins);
    this.audio.setMuted(this.muted);

    // 存档迁移落盘：旧存档经 `normalizeSaveData` 升级后立即写回，避免重复迁移。
    this.adapter.writeSaveData(this.save);

    this.input.attach();
    this.adapter.onLifecycleChange((state) => {
      this.audio.setBackground(state === 'hide');
      if (state === 'hide') {
        this.engine.pause();
        this.audio.setPaused(true);
        this.hud.setPausedLabel(true);
      }
    });
    this.adapter.onBannerVisibilityChange((visible) => this.applyBannerLayout(visible));

    this.lastFrameAt = performance.now();
    this.rafId = requestAnimationFrame(this.frame);

    this.installTestProbe();

    window.addEventListener('pagehide', this.dispose, { once: true });
  }

  /**
   * 安装端到端测试探针。
   *
   * 仅当 URL 带 `?e2e=1` 时才在 `window.__BF_TEST__` 暴露只读快照与造局助手；
   * 正常访问不挂载任何全局变量（无作弊后门）。
   */
  private installTestProbe(): void {
    installE2EProbe({
      getEngine: () => this.engine,
      getCoins: () => this.save.coins,
      getLevelIndex: () => this.levelIndex,
      getDebugCounters: () => {
        const counters = this.renderer.getDebugCounters();
        return {
          frameCount: counters.frameCount,
          brickLayerBlits: counters.brickLayerBlits,
          dirtyCellRepaints: counters.dirtyCellRepaints,
          brickLayerRebuilds: counters.brickLayerRebuilds,
          mainThreadArcCalls: counters.mainThreadArcCalls,
        };
      },
      getBalls: () => this.engine.physics.balls,
    });
  }

  /** 页面卸载时停止循环并释放音频/输入资源。 */
  private readonly dispose = (): void => {
    cancelAnimationFrame(this.rafId);
    this.input.detach();
    void this.audio.dispose();
  };

  /**
   * 安全区适配（`docs/04` §2：顶部避让胶囊 90~110px，底部避让 Banner/手势条）。
   *
   * 写入 CSS 变量 `--safe-top` / `--safe-bottom`，由 `styles.css` 的 HUD 层消费。
   */
  private applySafeArea(metrics: SystemMetrics): void {
    const padding = computeSafeAreaPadding({
      safeAreaTop: metrics.safeAreaTop,
      safeAreaBottom: metrics.safeAreaBottom,
    });
    const frame = document.getElementById('stage-frame');
    if (!frame) return;
    frame.style.setProperty('--safe-top', `${padding.top}px`);
    frame.style.setProperty('--safe-bottom', `${padding.bottom}px`);
  }

  /**
   * Banner 广告位预留（`docs/04` §2：Banner 高 100~140px 时，挡板操作线须在其上方 ≥80px）。
   *
   * Web 试玩版没有真 Banner，但保留完整钩子：外壳模拟 `setBannerVisible(true)` 时，
   * 底栏整体上移，避免误触；核心间距由 `computeBannerLayout` 统一校验。
   */
  private applyBannerLayout(visible: boolean): void {
    const layout = computeBannerLayout(visible);
    const frame = document.getElementById('stage-frame');
    if (!frame) return;
    frame.style.setProperty('--banner-reserve', visible ? `${BANNER_RESERVED_HEIGHT}px` : '0px');
    frame.classList.toggle('banner-visible', layout.visible);
  }

  /* ---------------------------------------------------------------- */
  /* 主循环                                                            */
  /* ---------------------------------------------------------------- */

  private readonly frame = (now: number): void => {
    this.rafId = requestAnimationFrame(this.frame);
    const dt = Math.min(MAX_FRAME_DT, (now - this.lastFrameAt) / 1000 || FIXED_DT);
    this.lastFrameAt = now;

    this.engine.update(dt);
    this.consumeEvents();
    this.renderFrame(dt);

    this.audio.setIntensity(this.engine.activeBallCount, this.engine.currentSpeedMultiplier);
    this.audio.update(dt);
    this.syncHud();
  };

  private renderFrame(dt: number): void {
    const e = this.engine;
    this.dirtyBricks.length = 0;
    // 脏砖在 consumeEvents 中已填充；快照直接引用引擎内部缓冲，不拷贝
    this.snapshot = {
      phase: e.currentPhase,
      levelId: e.levelId,
      levelNo: this.levelIndex + 1,
      paddle: e.paddle,
      balls: e.physics.balls,
      activeBallCount: e.activeBallCount,
      aim: e.currentPhase === 'READY_AIM' ? e.predictAim() : null,
      combo: e.combo,
      remainingBreakable: e.remainingBreakable,
      totalBreakable: e.grid.totalBreakable,
      speedMultiplier: e.currentSpeedMultiplier,
      damageMultiplier: e.damageMultiplier(),
      endgameAssist: e.isEndgameAssistActive,
      paddleSkinId: this.effectiveSkinId,
      muted: this.muted,
      // Milestone 5 / Step 2：Fever 快照（可选字段，渲染层据此绘制拖尾与边框光效）
      fever: e.feverSnapshot,
    };
    const data: RenderContextData = {
      engineState: this.snapshot,
      dirtyBricks: this.dirtyBricks,
      fullRebuildBricks: false,
    };
    this.renderer.render(data, dt);
  }

  /* ---------------------------------------------------------------- */
  /* 事件 → 音频 / 粒子 / 震屏 / 结算                                   */
  /* ---------------------------------------------------------------- */

  private consumeEvents(): void {
    const events = this.engine.drainEvents();
    for (const event of events) {
      this.routeEvent(event);
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
        // 关内击碎砖块充能得到的技能属于**关内收益**，不写入全局存档，
        // 因此这里只依赖 HUD 每帧同步库存，不做任何账本操作。
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

  /**
   * Milestone 5 / Step 2：特殊砖爆破 / 分裂 / 充能的粒子爆发。
   *
   * 复用 `ParticlePool` 定长对象池（零运行期分配），
   * 颜色直接用预烘焙碎块贴图索引区分语义。
   */
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
  /* 输入回调                                                           */
  /* ---------------------------------------------------------------- */

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
  /* HUD 动作                                                           */
  /* ---------------------------------------------------------------- */

  private cycleSpeed(): void {
    const next = this.engine.currentSpeedMultiplier >= 3 ? 1 : this.engine.currentSpeedMultiplier + 1;
    this.engine.setSpeedMultiplier(next);
    this.hud.setSpeedLabel(next as 1 | 2 | 3);
  }

  private togglePause(): void {
    this.engine.togglePause();
    const paused = this.engine.currentPhase === 'PAUSED';
    this.audio.setPaused(paused);
    this.hud.setPausedLabel(paused);
  }

  private toggleMuted(): void {
    this.muted = !this.muted;
    this.audio.setMuted(this.muted);
    this.hud.setSoundLabel(this.muted);
    this.save.muted = this.muted;
    this.adapter.writeSaveData(this.save);
  }

  private useMultiLaunch(): void {
    // 库存为 0 → 进入「观看激励（模拟）补给」流程，而不是禁用按钮。
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
  /* 商业化循环（docs/04 §3.1）                                        */
  /* ---------------------------------------------------------------- */

  /**
   * 技能补给（商业化循环 ②）：观看激励广告 → 发放库存。
   *
   * 观看期间**自动暂停物理**，领完立刻恢复（`docs/04` 明确要求）。
   */
  private async refillSkill(skill: 'MULTI_LAUNCH' | 'TRIPLE_SPLIT'): Promise<void> {
    const placement = skill === 'MULTI_LAUNCH' ? 'REFILL_SKILL_BLUE' : 'REFILL_SKILL_ORANGE';
    const wasPlaying = this.engine.currentPhase === 'PLAYING';
    if (wasPlaying) {
      this.engine.pause();
      this.audio.setPaused(true);
      this.hud.setPausedLabel(true);
    }
    try {
      const { rewarded } = await this.adapter.showRewardedVideo(placement);
      if (rewarded) {
        // 广告补给属于**全局额外库存**：引擎发放的同时记入 extraStock 并写盘，
        // 使用时优先扣本关配额，配额耗尽后才会真实扣减这份全局库存。
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
        this.hud.setPausedLabel(false);
      }
    }
  }

  /** 失败复活（商业化循环 ①）：观看激励 → 保留已碎砖块进度 + 赠送 3 颗球。 */
  private async watchRevive(): Promise<void> {
    const { rewarded } = await this.adapter.showRewardedVideo('REVIVE_KEEP_PROGRESS');
    if (!rewarded) return;
    const ok = this.engine.revive(REVIVE_BALL_COUNT);
    if (!ok) return;
    this.resultShown = false; // 复活后若再次失败，仍可弹复活窗
    this.hud.setPausedLabel(false);
    this.audio.setPaused(false);
  }

  /** 过关双倍金币（商业化循环 ①的结算分支）：看完激励再发一份基础奖励。 */
  private async watchDoubleCoins(baseCoins: number): Promise<void> {
    const { rewarded } = await this.adapter.showRewardedVideo('DOUBLE_CLEAR_REWARD');
    if (!rewarded) return;
    this.save.coins += baseCoins;
    this.adapter.writeSaveData(this.save);
    this.hud.setCoins(this.save.coins);
    // 看完激励广告后必须**重新弹出结算窗**：
    // 原实现看完只加金币，弹窗已被隐藏 → 玩家看不到翻倍结果，也没有下一步入口。
    this.showWinModal(this.winElapsedSec, baseCoins, true);
  }

  /**
   * 通关结算弹窗。
   *
   * @param doubled 是否已通过激励广告把金币翻倍（翻倍后不再提供"翻倍"入口）。
   */
  private showWinModal(elapsedSec: number, baseCoins: number, doubled: boolean): void {
    const hasNext = !this.playingCustom && this.levelIndex + 1 < BUILTIN_LEVEL_COUNT;
    const body = doubled
      ? `基础奖励 ${baseCoins} 金币已翻倍，额外到账 ${baseCoins} 金币（当前 ${this.save.coins} 金币）`
      : `用时 ${elapsedSec.toFixed(1)} 秒 · 获得 ${baseCoins} 金币 · 剩余灰墙不计入目标`;
    const actions: ModalAction[] = [];
    if (!doubled) {
      actions.push({ label: '金币翻倍（观看激励）', onClick: () => void this.watchDoubleCoins(baseCoins) });
    }
    actions.push({ label: '重开本关', onClick: () => this.restartLevel() });
    if (hasNext) {
      actions.push({
        label: '下一关',
        primary: true,
        onClick: () => this.switchLevel(this.levelIndex + 1),
      });
    }
    this.hud.showModal('通关！', body, actions);
  }

  /** 皮肤商店（商业化循环 ③）。 */
  private openShop(): void {
    const entries = SKIN_CATALOG.map((skin) => ({
      id: skin.id,
      name: skin.displayName,
      price: skin.price,
      unlocked: isSkinUnlocked(this.save, skin.id),
      equipped: this.effectiveSkinId === skin.id,
      canTrial: canTrialSkin(skin.id),
    }));
    this.hud.showSkinShop(entries, {
      onUnlock: (id) => void this.buySkin(id),
      onTrial: (id) => void this.trialSkin(id),
      onEquip: (id) => this.switchSkin(id),
      onClose: () => undefined,
    });
  }

  /** 金币解锁皮肤（永久拥有）。 */
  private async buySkin(skinId: string): Promise<void> {
    const entry = findSkin(skinId);
    if (!entry) return;
    if (isSkinUnlocked(this.save, skinId)) {
      this.switchSkin(skinId);
      return;
    }
    if (!canAffordSkin(this.save, skinId)) {
      this.hud.showModal('金币不足', `「${entry.displayName}」需要 ${entry.price} 金币`, [
        { label: '知道了', primary: true, onClick: () => undefined },
      ]);
      return;
    }
    if (!unlockSkin(this.save, skinId)) return;
    this.adapter.writeSaveData(this.save);
    this.trialSkinId = null;
    this.renderer.setSkin(skinId);
    this.hud.setCoins(this.save.coins);
    this.hud.fillSkinSelect(SKIN_LABELS, this.save.selectedPaddleSkin, this.save.unlockedSkins);
    this.hud.showModal('解锁成功', `已永久解锁「${entry.displayName}」`, [
      { label: '继续游戏', primary: true, onClick: () => undefined },
    ]);
  }

  /** 激励广告免费试用皮肤（仅本局有效）。 */
  private async trialSkin(skinId: string): Promise<void> {
    const entry = findSkin(skinId);
    if (!entry || !canTrialSkin(skinId)) return;
    const { rewarded } = await this.adapter.showRewardedVideo('TRIAL_SKIN');
    if (!rewarded) return;
    this.trialSkinId = skinId;
    this.renderer.setSkin(skinId);
    this.hud.showModal('试用中', `「${entry.displayName}」本局免费试用`, [
      { label: '开始体验', primary: true, onClick: () => undefined },
    ]);
  }

  /** 当前生效的皮肤（试用优先于存档选中项）。 */
  private get effectiveSkinId(): string {
    return this.trialSkinId ?? this.save.selectedPaddleSkin;
  }

  /**
   * 用「本关配额 + 全局额外库存」构造引擎。
   *
   * 两类库存严格分离：
   *   - `levelQuota`：本关初始配额，每关重置，**不写盘**；
   *   - `extraStock`：广告/购买获得的全局额外库存，跨关保留、**写盘**。
   *
   * 引擎库存 = 本关配额 + 全局额外库存（关内击碎砖块充能另计，属关内收益）。
   */
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

  /**
   * 把**全局额外库存的真实剩余**写回存档。
   *
   * 关键：写回的是 `extraStock` 本身，而不是"引擎当前库存"，
   * 否则玩家用完的全局库存会在重开时被 `Math.max` 回满（刷技能漏洞）。
   */
  private persistSkillStock(): void {
    this.save.multiLaunchStock = this.extraStock.multi;
    this.save.tripleSplitStock = this.extraStock.triple;
    this.adapter.writeSaveData(this.save);
  }

  /**
   * 消耗一次技能额度：优先扣本关配额，配额耗尽才扣全局额外库存。
   *
   * 只有真正动用了全局库存时才写盘（配额是本关收益，不入存档）。
   */
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

  private switchLevel(index: number): void {
    const safe = Math.max(0, Math.min(BUILTIN_LEVEL_COUNT - 1, index));
    if (safe + 1 > this.save.unlockedLevel) {
      this.hud.showModal('关卡未解锁', '请先通关前面的关卡，或点击 🛍 商店赚取金币。', [
        { label: '知道了', primary: true, onClick: () => undefined },
      ]);
      this.hud.fillLevelSelect(
        BUILTIN_LEVELS.map((d) => d.name),
        this.levelIndex,
        this.save.unlockedLevel,
      );
      return;
    }
    this.persistSkillStock();
    this.levelIndex = safe;
    this.playingCustom = false;
    this.customConfig = null;
    this.trialSkinId = null;
    this.engine = this.createEngine(getBuiltinRuntimeConfig(safe));
    this.renderer.setSkin(this.effectiveSkinId);
    this.afterLevelReload();
  }

  /** Studio 一键试玩：注入自定义关卡运行时配置并立即开局。 */
  private loadCustomLevel(config: LevelRuntimeConfig): void {
    this.persistSkillStock();
    this.playingCustom = true;
    this.customConfig = config;
    this.trialSkinId = null;
    this.engine = this.createEngine(config);
    this.renderer.setSkin(this.effectiveSkinId);
    this.afterLevelReload();
  }

  private bindStudioButton(): void {
    const btn = document.getElementById('btn-studio');
    btn?.addEventListener('click', () => this.studio.open());
  }

  private restartLevel(): void {
    this.persistSkillStock();
    this.trialSkinId = null;
    // 重建引擎：本关配额重置为关卡初始值，
    // 全局额外库存保持真实剩余（已用掉的不会被"重开即回满"）。
    const level =
      this.playingCustom && this.customConfig
        ? this.customConfig
        : getBuiltinRuntimeConfig(this.levelIndex);
    this.engine = this.createEngine(level);
    this.renderer.setSkin(this.effectiveSkinId);
    this.afterLevelReload();
  }

  /** 重开/换关后的公共复位（renderer 靠 grid 引用变化自动整层重建）。 */
  private afterLevelReload(): void {
    this.resultShown = false;
    this.dirtyBricks.length = 0;
    this.hud.setLevelNo(this.levelIndex + 1);
    this.hud.setSpeedLabel(1);
    this.hud.setPausedLabel(false);
    this.audio.setPaused(false);
  }

  private switchSkin(skinId: string): void {
    if (!isSkinUnlocked(this.save, skinId)) {
      // 未解锁：引导到商店（金币解锁 / 激励试用）。
      this.hud.fillSkinSelect(SKIN_LABELS, this.save.selectedPaddleSkin, this.save.unlockedSkins);
      this.openShop();
      return;
    }
    this.trialSkinId = null;
    this.renderer.setSkin(skinId);
    this.save.selectedPaddleSkin = skinId;
    this.adapter.writeSaveData(this.save);
  }

  /* ---------------------------------------------------------------- */
  /* 结算                                                               */
  /* ---------------------------------------------------------------- */

  private onLevelWon(elapsedSec: number): void {
    if (this.resultShown) return;
    this.resultShown = true;
    const levelId = this.engine.levelId;

    // 最佳秒数（WebAdapter.submitRankScore 已写盘，这里同步到内存存档用于首通判定）。
    const firstClear = this.save.bestTimesSec[levelId] === undefined;
    recordBestTime(this.save, levelId, elapsedSec);

    // 解锁下一关（Studio 自定义关不参与解锁）。
    if (!this.playingCustom) unlockNextLevel(this.save, this.levelIndex);

    // 过关结算金币（基础奖励）。
    const remainingRatio = 1 - this.engine.remainingRatio;
    const baseCoins = grantClearReward(this.save, {
      remainingRatio: Math.max(0, Math.min(1, remainingRatio)),
      firstClear,
      doubled: false,
    });
    this.persistSkillStock();
    this.adapter.writeSaveData(this.save);
    this.hud.setCoins(this.save.coins);
    this.hud.fillLevelSelect(
      BUILTIN_LEVELS.map((d) => d.name),
      this.levelIndex,
      this.save.unlockedLevel,
    );

    this.winElapsedSec = elapsedSec;
    this.showWinModal(elapsedSec, baseCoins, false);
  }

  private onLevelLost(remainingRatio: number): void {
    if (this.resultShown) return;
    this.resultShown = true;
    this.persistSkillStock();
    this.hud.showModal(
      '球全部出界',
      `剩余可破坏砖块 ${(remainingRatio * 100).toFixed(1)}%`,
      [
        {
          label: `复活续关（保留进度 + ${REVIVE_BALL_COUNT} 球）`,
          primary: true,
          onClick: () => void this.watchRevive(),
        },
        { label: '直接重开', onClick: () => this.restartLevel() },
      ],
    );
  }

  /* ---------------------------------------------------------------- */
  /* HUD 每帧同步（技能库存 / 暂停态）                                   */
  /* ---------------------------------------------------------------- */

  private syncHud(): void {
    const inv = this.engine.skillInventory;
    this.hud.setSkillCounts(inv.multiLaunchCount, inv.tripleSplitCount);
    // 暂停态每帧同步（含后台自动暂停/恢复），保证按钮图标与真实状态一致。
    this.hud.setPausedLabel(this.engine.currentPhase === 'PAUSED');
    this.hud.setCoins(this.save.coins);
    // Milestone 5 / Step 2：Fever 能量条
    const fever = this.engine.feverSnapshot;
    this.hud.setFever(fever.energy, fever.maxEnergy, fever.active);
  }
}

// module 脚本默认 defer，DOM 已就绪
new GameApp().start();
