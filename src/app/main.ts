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
  IRenderer,
  RenderContextData,
} from '../game/render/IRenderer.js';
import { WebAdapter } from '../game/platform/WebAdapter.js';
import type { PlayerSaveData } from '../game/platform/IPlatformAdapter.js';
import type { LevelRuntimeConfig } from '../game/core/types.js';
import {
  BUILTIN_LEVELS,
  BUILTIN_LEVEL_COUNT,
  getBuiltinRuntimeConfig,
} from '../game/levels/builtinLevels.js';
import { StudioController } from '../studio/StudioController.js';
import '../studio/studio.css';
import { HudController } from './HudController.js';
import { InputController } from './InputController.js';

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
  private readonly renderer: IRenderer;
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
  private readonly studio: StudioController;

  /** 跨帧复用的脏砖缓冲（避免每帧分配，零 GC 红线在外壳层同样遵守）。 */
  private readonly dirtyBricks: DirtyBrickUpdate[] = [];
  private snapshot: GameSnapshot | null = null;
  private readonly canvas: HTMLCanvasElement;

  constructor() {
    this.save = this.adapter.loadSaveData();
    this.muted = this.save.muted;

    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.engine = new GameEngine({ level: getBuiltinRuntimeConfig(0) });

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
    this.renderer.setSkin(this.save.selectedPaddleSkin);

    this.hud.fillLevelSelect(
      BUILTIN_LEVELS.map((d) => d.name),
      this.levelIndex,
    );
    this.hud.fillSkinSelect(SKIN_LABELS, this.save.selectedPaddleSkin);
    this.bindStudioButton();
    this.hud.setLevelNo(1);
    this.hud.setSpeedLabel(1);
    this.hud.setSoundLabel(this.muted);
    this.audio.setMuted(this.muted);

    this.input.attach();
    this.adapter.onLifecycleChange((state) => {
      this.audio.setBackground(state === 'hide');
      if (state === 'hide') {
        this.engine.pause();
        this.audio.setPaused(true);
        this.hud.setPausedLabel(true);
      }
    });

    this.lastFrameAt = performance.now();
    this.rafId = requestAnimationFrame(this.frame);

    window.addEventListener('pagehide', this.dispose, { once: true });
  }

  /** 页面卸载时停止循环并释放音频/输入资源。 */
  private readonly dispose = (): void => {
    cancelAnimationFrame(this.rafId);
    this.input.detach();
    void this.audio.dispose();
  };

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
      paddleSkinId: this.save.selectedPaddleSkin,
      muted: this.muted,
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
        break; // HUD 每帧同步库存，无需额外处理
      default:
        break;
    }
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
    this.engine.useMultiLaunch();
  }

  private useTripleSplit(): void {
    this.engine.useTripleSplit();
  }

  private switchLevel(index: number): void {
    const safe = Math.max(0, Math.min(BUILTIN_LEVEL_COUNT - 1, index));
    this.levelIndex = safe;
    this.playingCustom = false;
    this.engine = new GameEngine({ level: getBuiltinRuntimeConfig(safe) });
    this.afterLevelReload();
  }

  /** Studio 一键试玩：注入自定义关卡运行时配置并立即开局。 */
  private loadCustomLevel(config: LevelRuntimeConfig): void {
    this.playingCustom = true;
    this.engine = new GameEngine({ level: config });
    this.afterLevelReload();
  }

  private bindStudioButton(): void {
    const btn = document.getElementById('btn-studio');
    btn?.addEventListener('click', () => this.studio.open());
  }

  private restartLevel(): void {
    this.engine.restart();
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
    this.adapter.submitRankScore(this.engine.levelId, elapsedSec);
    const hasNext = !this.playingCustom && this.levelIndex + 1 < BUILTIN_LEVEL_COUNT;
    this.hud.showModal(
      '通关！',
      `用时 ${elapsedSec.toFixed(1)} 秒 · 剩余灰墙不计入目标`,
      [
        { label: '重开本关', onClick: () => this.restartLevel() },
        ...(hasNext
          ? [{
              label: '下一关',
              primary: true,
              onClick: () => this.switchLevel(this.levelIndex + 1),
            }]
          : []),
      ],
    );
  }

  private onLevelLost(remainingRatio: number): void {
    if (this.resultShown) return;
    this.resultShown = true;
    this.hud.showModal(
      '球全部出界',
      `剩余可破坏砖块 ${(remainingRatio * 100).toFixed(1)}%`,
      [{ label: '重开本关', primary: true, onClick: () => this.restartLevel() }],
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
  }
}

// module 脚本默认 defer，DOM 已就绪
new GameApp().start();
