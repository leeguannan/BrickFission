/**
 * 《碎砖大裂变》(Brick Fission) — Canvas 2D 高性能渲染器
 *
 * 契约来源：`docs/02_RENDERER_AUDIO_AND_VISUAL_SPEC.md` §2。
 *
 * 四大性能铁律的落地方式：
 *   1. 静态砖块离屏缓存：`brickLayer` 离屏画布只在切关/重开时整层重绘，
 *      游戏中仅对 `dirtyBricks` 指向的单格 clearRect/重绘，
 *      主循环每帧对砖块层只有 **1 次 drawImage**（见 `debugCounters.brickLayerBlits`）；
 *   2. 精灵预烘焙：白球、高能球、瞄准圆点、3 款挡板、8 色碎块全部在初始化时
 *      画入离屏贴图，主循环只允许 drawImage，严禁 arc / shadowBlur / createLinearGradient；
 *   3. 粒子走 `ParticlePool` 定长 300 对象池，零运行期分配；
 *   4. DPR 封顶 2，避免高分屏过度填充。
 */
import {
  BALL_RADIUS,
  DEATH_LINE_Y,
  DEFAULT_BRICK_COLORS,
  HUD_TOP,
  WALL_LEFT,
  WALL_RIGHT,
  WALL_TOP,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../core/constants.js';
import type { BrickCell } from '../core/types.js';
import type { BrickGrid } from '../core/BrickGrid.js';
import type { IPlatformAdapter } from '../platform/IPlatformAdapter.js';
import type { AnyCanvas } from '../platform/AnyCanvas.js';
import {
  PARTICLES_PER_BRICK_MAX,
  PARTICLES_PER_BRICK_MIN,
  ParticlePool,
} from './ParticlePool.js';
import {
  PADDLE_SKIN_CAPSULE_BLUE,
  PADDLE_SKIN_IDS,
  SkinRegistry,
} from './SkinRegistry.js';
import type {
  DirtyBrickUpdate,
  GameSnapshot,
  IRenderer,
  RenderContextData,
} from './IRenderer.js';

/** 逻辑舞台尺寸（固定竖屏 9:16）。 */
const LOGICAL_WIDTH = WORLD_WIDTH;
const LOGICAL_HEIGHT = WORLD_HEIGHT;
/** DPR 封顶（铁律 4）。 */
const MAX_DPR = 2;
/** 精灵贴图超采样倍率（烘焙 2x，drawImage 缩回逻辑尺寸，边缘顺滑）。 */
const SPRITE_SCALE = 2;
/** 砖块格子间隙（px，像素格栅感）。 */
const BRICK_GAP = 1.2;

/** docs/02 §1.1 微砖块高对比色板（填充 + 内亮边）。 */
interface BrickPaint {
  fill: string;
  highlight: string;
}
const BRICK_PALETTE: readonly BrickPaint[] = [
  { fill: '#ef1d1d', highlight: '#ff5252' }, // 0 经典红
  { fill: '#00c82a', highlight: '#39ff5a' }, // 1 经典绿
  { fill: '#2f6fed', highlight: '#7ca2ff' }, // 2 蓝
  { fill: '#ffb800', highlight: '#ffd75e' }, // 3 金黄
  { fill: '#a855f7', highlight: '#c98cff' }, // 4 亮紫
  { fill: '#4ecdc4', highlight: '#8af0e8' }, // 5 青
  { fill: '#ff5c00', highlight: '#ff9a4d' }, // 6 橙红
  { fill: '#7d8594', highlight: '#9aa3b2' }, // 7 钢灰
];
const STEEL_PAINT: BrickPaint = { fill: '#7d8594', highlight: '#9aa3b2' };

/**
 * Milestone 5 / Step 2：特殊砖配色。
 *
 * 三种特殊砖除底色外**必须**带清晰图形徽记（炸弹引信 / 棱镜三角 / 核心方环），
 * 避免仅靠颜色区分（docs/02 高对比度要求）。
 * 徽记一律用 `fillRect` 像素块绘制，主循环链路（增量重绘）零路径 / 零 arc。
 */
const SPECIAL_BRICK_PAINT: Readonly<Record<'BOMB' | 'PRISM' | 'CORE', BrickPaint>> = {
  BOMB: { fill: '#232338', highlight: '#ff6b3d' },
  PRISM: { fill: '#0d3a52', highlight: '#7dd3fc' },
  CORE: { fill: '#5a3a05', highlight: '#f59e0b' },
};

/** Fever 拖尾最多渲染的球数（上限保护，避免 200 球满池时 blit 爆炸）。 */
const FEVER_TRAIL_MAX_BALLS = 48;
/** Fever 拖尾采样间距（逻辑像素）。 */
const FEVER_TRAIL_STEP = 8;

/** 调试计数（docs/02 §4.1 离屏画布真缓存验证）。 */
export interface RendererDebugCounters {
  /** 累计渲染帧数。 */
  frameCount: number;
  /** 砖块离屏层向主画布的 blit 次数（每帧至多 +1）。 */
  brickLayerBlits: number;
  /** 单格增量重绘次数（仅 dirtyBricks 触发）。 */
  dirtyCellRepaints: number;
  /** 砖块整层重建次数（切关/重开）。 */
  brickLayerRebuilds: number;
  /** 主循环内 arc 调用数（铁律：恒为 0）。 */
  mainThreadArcCalls: number;
}

export interface Canvas2DRendererOptions {
  adapter: IPlatformAdapter;
  /** 当前砖块网格访问器（重开后引擎会替换网格对象，故用函数取最新值）。 */
  gridProvider: () => BrickGrid;
  rng?: () => number;
}

type DrawCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export class Canvas2DRenderer implements IRenderer {
  private readonly adapter: IPlatformAdapter;
  private readonly gridProvider: () => BrickGrid;
  private readonly rng: () => number;
  private readonly skins = new SkinRegistry();
  private readonly particles = new ParticlePool();

  private mainCanvas: AnyCanvas | null = null;
  private mainCtx: DrawCtx | null = null;
  private dpr = 1;

  private brickLayer: AnyCanvas | null = null;
  private brickCtx: DrawCtx | null = null;
  private backgroundLayer: AnyCanvas | null = null;

  private ballWhiteSprite: AnyCanvas | null = null;
  private ballOverloadSprite: AnyCanvas | null = null;
  private aimDotSprite: AnyCanvas | null = null;
  /** Milestone 5 / Step 2：Fever 高能球 / 拖尾 / 四边光效贴图（预烘焙，运行期零渐变）。 */
  private feverBallSprite: AnyCanvas | null = null;
  private feverTrailSprite: AnyCanvas | null = null;
  private feverEdgeTop: AnyCanvas | null = null;
  private feverEdgeBottom: AnyCanvas | null = null;
  private feverEdgeLeft: AnyCanvas | null = null;
  private feverEdgeRight: AnyCanvas | null = null;
  private readonly paddleSprites = new Map<string, AnyCanvas>();
  private shardSprites: AnyCanvas[] = [];

  private currentSkinId = PADDLE_SKIN_CAPSULE_BLUE;
  private gridReference: BrickGrid | null = null;

  private shakeIntensity = 0;
  private shakeRemainingMs = 0;
  private shakeTotalMs = 0;

  private readonly debug: RendererDebugCounters = {
    frameCount: 0,
    brickLayerBlits: 0,
    dirtyCellRepaints: 0,
    brickLayerRebuilds: 0,
    mainThreadArcCalls: 0,
  };

  constructor(options: Canvas2DRendererOptions) {
    this.adapter = options.adapter;
    this.gridProvider = options.gridProvider;
    this.rng = options.rng ?? Math.random;
  }

  /* ---------------------------------------------------------------- */
  /* 生命周期                                                          */
  /* ---------------------------------------------------------------- */

  init(canvas: AnyCanvas, width: number, height: number, dpr: number): void {
    this.mainCanvas = canvas;
    this.dpr = Math.min(Math.max(1, dpr), MAX_DPR);
    this.configureMainCanvas(width, height);
    this.mainCtx = this.requireCtx(canvas);

    this.brickLayer = this.createLayer(width, height);
    this.brickCtx = this.requireCtx(this.brickLayer);
    this.backgroundLayer = this.createLayer(width, height);

    this.bakeSprites();
    this.bakeBackground();
    this.gridReference = null; // 首帧强制整层重建
  }

  resize(width: number, height: number, dpr: number): void {
    if (!this.mainCanvas) return;
    this.dpr = Math.min(Math.max(1, dpr), MAX_DPR);
    this.configureMainCanvas(width, height);
    this.brickLayer = this.createLayer(width, height);
    this.brickCtx = this.requireCtx(this.brickLayer);
    this.backgroundLayer = this.createLayer(width, height);
    this.bakeBackground();
    this.gridReference = null;
  }

  setSkin(paddleSkinId: string, _ballSkinId?: string): void {
    if (this.skins.has(paddleSkinId)) this.currentSkinId = paddleSkinId;
  }

  dispose(): void {
    this.particles.clear();
    this.paddleSprites.clear();
    this.shardSprites = [];
    this.brickLayer = null;
    this.brickCtx = null;
    this.backgroundLayer = null;
    this.ballWhiteSprite = null;
    this.ballOverloadSprite = null;
    this.aimDotSprite = null;
    this.feverBallSprite = null;
    this.feverTrailSprite = null;
    this.feverEdgeTop = null;
    this.feverEdgeBottom = null;
    this.feverEdgeLeft = null;
    this.feverEdgeRight = null;
    this.mainCtx = null;
    this.mainCanvas = null;
  }

  /* ---------------------------------------------------------------- */
  /* 对外特效入口                                                      */
  /* ---------------------------------------------------------------- */

  spawnBrickParticles(x: number, y: number, color: string, count: number): void {
    const colorIndex = Math.max(0, DEFAULT_BRICK_COLORS.indexOf(color));
    const clamped = Math.max(
      PARTICLES_PER_BRICK_MIN,
      Math.min(PARTICLES_PER_BRICK_MAX, count || PARTICLES_PER_BRICK_MIN),
    );
    this.particles.spawn(x, y, colorIndex, clamped);
  }

  /**
   * Milestone 5 / Step 2：特效爆发粒子。
   *
   * 与 `spawnBrickParticles` 共用同一个定长对象池（零分配），
   * 区别在于数量不再被 2~3 夹住，且颜色直接走预烘焙碎块索引。
   */
  spawnEffectBurst(x: number, y: number, colorIndex: number, count: number): void {
    const maxIndex = Math.max(0, this.shardSprites.length - 1);
    const index = Math.max(0, Math.min(maxIndex, Math.round(colorIndex)));
    const n = Math.max(1, Math.min(24, Math.round(count)));
    this.particles.spawn(x, y, index, n);
  }

  triggerScreenShake(intensity: number, durationMs: number): void {
    this.shakeIntensity = Math.max(0, intensity);
    this.shakeTotalMs = Math.max(0, durationMs);
    this.shakeRemainingMs = this.shakeTotalMs;
  }

  /** 调试计数只读快照（Code Review 验证离屏缓存真实性）。 */
  getDebugCounters(): Readonly<RendererDebugCounters> {
    return this.debug;
  }

  /** 测试/切关时重置计数。 */
  resetDebugCounters(): void {
    this.debug.frameCount = 0;
    this.debug.brickLayerBlits = 0;
    this.debug.dirtyCellRepaints = 0;
    this.debug.brickLayerRebuilds = 0;
    this.debug.mainThreadArcCalls = 0;
  }

  /* ---------------------------------------------------------------- */
  /* 主渲染入口                                                        */
  /* ---------------------------------------------------------------- */

  render(data: RenderContextData, dt: number): void {
    const ctx = this.mainCtx;
    if (!ctx || !this.brickLayer || !this.backgroundLayer) return;

    this.syncBrickLayer(data);
    this.particles.update(dt);
    this.updateShake(dt);

    const state = data.engineState;
    this.debug.frameCount++;

    ctx.save();
    // 静态背景（含星空与死亡线），烘焙层 1 次 blit
    this.blit(ctx, this.backgroundLayer, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    if (this.shakeRemainingMs > 0) {
      const ratio = this.shakeRemainingMs / Math.max(1, this.shakeTotalMs);
      const magnitude = this.shakeIntensity * ratio;
      ctx.translate((this.rng() - 0.5) * 2 * magnitude, (this.rng() - 0.5) * 2 * magnitude);
    }

    // 铁律 1：游戏中砖块每帧只有这 1 次 drawImage，绝无整阵循环重绘
    this.blit(ctx, this.brickLayer, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.debug.brickLayerBlits++;

    this.drawAim(ctx, state);
    this.drawPaddle(ctx, state);
    this.drawFeverFrame(ctx, state);
    this.drawBalls(ctx, state);
    this.drawParticles(ctx);

    ctx.restore();
  }

  /* ---------------------------------------------------------------- */
  /* 砖块离屏层同步                                                    */
  /* ---------------------------------------------------------------- */

  /**
   * 切关/重开（grid 引用变更或 fullRebuildBricks）→ 整层重建；
   * 否则只处理本帧 dirtyBricks 的单格增量。
   */
  private syncBrickLayer(data: RenderContextData): void {
    const grid = this.gridProvider();
    const gridChanged = grid !== this.gridReference;
    this.gridReference = grid;

    if (gridChanged || data.fullRebuildBricks) {
      this.rebuildBrickLayer(grid);
      return;
    }

    const dirty = data.dirtyBricks;
    for (let i = 0; i < dirty.length; i++) {
      this.paintDirtyCell(grid, dirty[i]!);
    }
  }

  private rebuildBrickLayer(grid: BrickGrid): void {
    const ctx = this.brickCtx;
    if (!ctx) return;
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.at(col, row);
        if (cell && cell.role !== 'EMPTY') {
          this.paintCell(ctx, grid.cellRect(col, row), cell);
        }
      }
    }
    this.debug.brickLayerRebuilds++;
  }

  private paintDirtyCell(grid: BrickGrid, update: DirtyBrickUpdate): void {
    const ctx = this.brickCtx;
    if (!ctx) return;
    const rect = grid.cellRect(update.col, update.row);
    // 多清 1px 余量，避免半透明边缘残留
    ctx.clearRect(rect.x - 1, rect.y - 1, rect.width + 2, rect.height + 2);
    if (update.cell.role !== 'EMPTY') {
      this.paintCell(ctx, rect, update.cell);
    }
    this.debug.dirtyCellRepaints++;
  }

  /** 单格砖块绘制（仅在离屏层调用，主循环不触发）。 */
  private paintCell(ctx: DrawCtx, rect: { x: number; y: number; width: number; height: number }, cell: BrickCell): void {
    const x = rect.x + BRICK_GAP * 0.5;
    const y = rect.y + BRICK_GAP * 0.5;
    const w = rect.width - BRICK_GAP;
    const h = rect.height - BRICK_GAP;

    if (cell.role === 'STEEL') {
      ctx.fillStyle = STEEL_PAINT.fill;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = STEEL_PAINT.highlight;
      ctx.fillRect(x, y, w, Math.max(1.5, h * 0.22));
      return;
    }

    // Milestone 5 / Step 2：特殊砖（炸弹 / 棱镜 / 核心）独立底色 + 图形徽记。
    if (cell.role === 'BOMB' || cell.role === 'PRISM' || cell.role === 'CORE') {
      const paint = SPECIAL_BRICK_PAINT[cell.role];
      ctx.fillStyle = paint.fill;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = paint.highlight;
      ctx.fillRect(x, y, w, 1.5);
      ctx.fillRect(x, y, 1.5, h);
      paintSpecialGlyph(ctx, cell.role, x, y, w, h);
      // 多血特殊砖（核心 5 血）同样显示血量刻点
      if (cell.maxHp > 1) {
        ctx.fillStyle = 'rgba(8,16,46,0.75)';
        const dot = 2;
        const gap = 1.5;
        const total = cell.maxHp * dot + (cell.maxHp - 1) * gap;
        let dx = x + (w - total) * 0.5;
        const dy = y + h - dot - 1.5;
        for (let i = 0; i < cell.maxHp; i++) {
          if (i < cell.hp) ctx.fillRect(dx, dy, dot, dot);
          dx += dot + gap;
        }
      }
      return;
    }

    const paint = BRICK_PALETTE[cell.colorIndex] ?? BRICK_PALETTE[0]!;
    ctx.fillStyle = paint.fill;
    ctx.fillRect(x, y, w, h);
    // 内亮边（L 形高光，像素质感）
    ctx.fillStyle = paint.highlight;
    ctx.fillRect(x, y, w, 1.5);
    ctx.fillRect(x, y, 1.5, h);

    // 多血砖：底部血量刻点
    if (cell.maxHp > 1) {
      ctx.fillStyle = 'rgba(8,16,46,0.75)';
      const dot = 2;
      const gap = 1.5;
      const total = cell.maxHp * dot + (cell.maxHp - 1) * gap;
      let dx = x + (w - total) * 0.5;
      const dy = y + h - dot - 1.5;
      for (let i = 0; i < cell.maxHp; i++) {
        if (i < cell.hp) ctx.fillRect(dx, dy, dot, dot);
        dx += dot + gap;
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* 主循环绘制（全部 drawImage，零路径/渐变/阴影调用）                 */
  /* ---------------------------------------------------------------- */

  private drawAim(ctx: DrawCtx, state: Readonly<GameSnapshot>): void {
    if (!state.aim || !this.aimDotSprite) return;
    const dot = this.aimDotSprite;
    const logicalDiameter = 7; // 半径 3.5px
    const aim = state.aim;
    for (let i = 0; i < aim.firstSegmentCount; i++) {
      const point = aim.firstSegment[i]!;
      ctx.globalAlpha = point.alpha;
      this.blit(ctx, dot, point.x - 3.5, point.y - 3.5, logicalDiameter, logicalDiameter);
    }
    for (let i = 0; i < aim.secondSegmentCount; i++) {
      const point = aim.secondSegment[i]!;
      ctx.globalAlpha = point.alpha * 0.8;
      this.blit(ctx, dot, point.x - 3.5, point.y - 3.5, logicalDiameter, logicalDiameter);
    }
    ctx.globalAlpha = 1;
  }

  private drawPaddle(ctx: DrawCtx, state: Readonly<GameSnapshot>): void {
    const sprite = this.paddleSprites.get(this.currentSkinId);
    if (!sprite) return;
    const p = state.paddle;
    this.blit(ctx, sprite, p.x - p.width * 0.5, p.y - p.height * 0.5, p.width, p.height);
  }

  private drawBalls(ctx: DrawCtx, state: Readonly<GameSnapshot>): void {
    const white = this.ballWhiteSprite;
    const overloaded = this.ballOverloadSprite;
    if (!white || !overloaded) return;
    const useOverload = state.damageMultiplier > 1;
    // Milestone 5 / Step 2：Fever 期间使用专属高能球贴图
    const feverOn = state.fever?.active === true;
    const sprite = feverOn
      ? (this.feverBallSprite ?? (useOverload ? overloaded : white))
      : (useOverload ? overloaded : white);
    const diameter = BALL_RADIUS * 2;
    const balls = state.balls;
    const trail = this.feverTrailSprite;
    let trailDrawn = 0;
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i]!;
      if (!ball.active) continue;
      // Fever 拖尾：沿速度方向回溯两段，零分配（复用同一贴图 + globalAlpha）
      if (feverOn && trail && trailDrawn < FEVER_TRAIL_MAX_BALLS) {
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed > 1) {
          const ux = ball.vx / speed;
          const uy = ball.vy / speed;
          ctx.globalAlpha = 0.3;
          this.blit(
            ctx,
            trail,
            ball.x - ux * FEVER_TRAIL_STEP - ball.radius,
            ball.y - uy * FEVER_TRAIL_STEP - ball.radius,
            diameter * 2.2,
            diameter * 2.2,
          );
          ctx.globalAlpha = 0.15;
          this.blit(
            ctx,
            trail,
            ball.x - ux * FEVER_TRAIL_STEP * 2 - ball.radius,
            ball.y - uy * FEVER_TRAIL_STEP * 2 - ball.radius,
            diameter * 1.8,
            diameter * 1.8,
          );
          ctx.globalAlpha = 1;
        }
        trailDrawn++;
      }
      this.blit(ctx, sprite, ball.x - ball.radius, ball.y - ball.radius, diameter, diameter);
    }
  }

  /**
   * Milestone 5 / Step 2：Fever 边框光效。
   *
   * 4 条预烘焙边贴图各 1 次 blit，强度随剩余时间呼吸，运行期零渐变 / 零 arc。
   */
  private drawFeverFrame(ctx: DrawCtx, state: Readonly<GameSnapshot>): void {
    const fever = state.fever;
    if (!fever || !fever.active) return;
    const top = this.feverEdgeTop;
    const bottom = this.feverEdgeBottom;
    const left = this.feverEdgeLeft;
    const right = this.feverEdgeRight;
    if (!top || !bottom || !left || !right) return;
    const duration = Math.max(0.001, fever.durationSec);
    // 剩余时间比例（1 → 0）+ 呼吸脉冲
    const fade = Math.min(1, Math.max(0, fever.remainingSec / duration));
    const pulse = 0.62 + 0.38 * Math.sin(fever.remainingSec * 11);
    ctx.globalAlpha = Math.min(1, fade * pulse);
    this.blit(ctx, top, 0, 0, LOGICAL_WIDTH, 26);
    this.blit(ctx, bottom, 0, LOGICAL_HEIGHT - 26, LOGICAL_WIDTH, 26);
    this.blit(ctx, left, 0, 0, 26, LOGICAL_HEIGHT);
    this.blit(ctx, right, LOGICAL_WIDTH - 26, 0, 26, LOGICAL_HEIGHT);
    ctx.globalAlpha = 1;
  }

  private drawParticles(ctx: DrawCtx): void {
    const list = this.particles.particles;
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      if (!p.active) continue;
      const sprite = this.shardSprites[p.colorIndex] ?? this.shardSprites[0];
      if (!sprite) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      this.blit(ctx, sprite, p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------------------------------------------------------- */
  /* 精灵烘焙（仅初始化/resize 时执行，允许渐变与路径）                */
  /* ---------------------------------------------------------------- */

  private bakeSprites(): void {
    this.ballWhiteSprite = this.bakeBallSprite(false);
    this.ballOverloadSprite = this.bakeBallSprite(true);
    this.aimDotSprite = this.bakeAimDotSprite();
    this.shardSprites = BRICK_PALETTE.map((paint) => this.bakeShardSprite(paint.fill, paint.highlight));

    // Milestone 5 / Step 2：Fever 相关贴图一次性烘焙（运行期只允许 drawImage）
    this.feverBallSprite = this.bakeFeverBallSprite();
    this.feverTrailSprite = this.bakeFeverTrailSprite();
    this.feverEdgeTop = this.bakeFeverEdge('top');
    this.feverEdgeBottom = this.bakeFeverEdge('bottom');
    this.feverEdgeLeft = this.bakeFeverEdge('left');
    this.feverEdgeRight = this.bakeFeverEdge('right');

    this.paddleSprites.clear();
    for (const id of PADDLE_SKIN_IDS) {
      this.paddleSprites.set(id, this.bakePaddleSprite(id));
    }
  }

  /** Fever 高能球贴图（玫红 → 金橙渐变，烘焙期创建渐变）。 */
  private bakeFeverBallSprite(): AnyCanvas {
    const logicalDiameter = BALL_RADIUS * 2;
    const size = Math.ceil(logicalDiameter * SPRITE_SCALE) + 4;
    const canvas = this.adapter.createOffscreenCanvas(size, size);
    const ctx = this.requireCtx(canvas);
    const center = size * 0.5;
    const radius = center - 2;
    const glow = ctx.createRadialGradient(center, center, radius * 0.2, center, center, radius);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.45, '#ffd7f0');
    glow.addColorStop(0.75, '#ff4d9d');
    glow.addColorStop(1, 'rgba(255,77,157,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  /** Fever 拖尾光斑贴图（柔和径向渐变，烘焙期一次创建）。 */
  private bakeFeverTrailSprite(): AnyCanvas {
    const logical = BALL_RADIUS * 3.2;
    const size = Math.ceil(logical * SPRITE_SCALE);
    const canvas = this.adapter.createOffscreenCanvas(size, size);
    const ctx = this.requireCtx(canvas);
    const center = size * 0.5;
    const radius = center - 1;
    const glow = ctx.createRadialGradient(center, center, 0, center, center, radius);
    glow.addColorStop(0, 'rgba(255,120,190,0.85)');
    glow.addColorStop(0.5, 'rgba(255,90,160,0.32)');
    glow.addColorStop(1, 'rgba(255,77,157,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  /** Fever 边框光效贴图（上下左右 4 条，运行期各 1 次 blit）。 */
  private bakeFeverEdge(edge: 'top' | 'bottom' | 'left' | 'right'): AnyCanvas {
    const thickness = 26;
    const horizontal = edge === 'top' || edge === 'bottom';
    // 渐变只沿"厚度方向"变化，因此垂直边只需烘焙 8px 高的色带、水平边只需 8px 宽的色带，
    // 运行期拉伸到全长即可（避免分配 720×26 / 26×1280 的大画布，利于微信端内存）。
    const band = 8 * SPRITE_SCALE;
    const canvas = this.adapter.createOffscreenCanvas(
      horizontal ? band : thickness * SPRITE_SCALE,
      horizontal ? thickness * SPRITE_SCALE : band,
    );
    const ctx = this.requireCtx(canvas);
    const w = canvas.width;
    const h = canvas.height;
    const gradient = horizontal
      ? ctx.createLinearGradient(0, 0, 0, h)
      : ctx.createLinearGradient(0, 0, w, 0);
    if (edge === 'top' || edge === 'left') {
      gradient.addColorStop(0, 'rgba(255,77,157,0.75)');
      gradient.addColorStop(0.55, 'rgba(255,140,60,0.22)');
      gradient.addColorStop(1, 'rgba(255,77,157,0)');
    } else {
      gradient.addColorStop(0, 'rgba(255,77,157,0)');
      gradient.addColorStop(0.45, 'rgba(255,140,60,0.22)');
      gradient.addColorStop(1, 'rgba(255,77,157,0.75)');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    return canvas;
  }

  private bakeBallSprite(overload: boolean): AnyCanvas {
    const logicalDiameter = BALL_RADIUS * 2;
    const size = Math.ceil(logicalDiameter * SPRITE_SCALE) + 4;
    const canvas = this.adapter.createOffscreenCanvas(size, size);
    const ctx = this.requireCtx(canvas);
    const center = size * 0.5;
    const radius = center - 2;

    // 烘焙期允许创建径向渐变（主循环内严禁）
    const glow = ctx.createRadialGradient(center, center, radius * 0.2, center, center, radius);
    if (overload) {
      glow.addColorStop(0, '#fff3c4');
      glow.addColorStop(0.45, '#ffb800');
      glow.addColorStop(0.8, '#ff5c00');
      glow.addColorStop(1, 'rgba(255,92,0,0)');
    } else {
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.62, '#ffffff');
      glow.addColorStop(0.85, '#dfe8ff');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  private bakeAimDotSprite(): AnyCanvas {
    const logicalDiameter = 7;
    const size = logicalDiameter * SPRITE_SCALE;
    const canvas = this.adapter.createOffscreenCanvas(size, size);
    const ctx = this.requireCtx(canvas);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }

  private bakeShardSprite(fill: string, highlight: string): AnyCanvas {
    const logical = 6;
    const size = logical * SPRITE_SCALE;
    const canvas = this.adapter.createOffscreenCanvas(size, size);
    const ctx = this.requireCtx(canvas);
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = highlight;
    ctx.fillRect(0, 0, size, Math.max(2, size * 0.25));
    return canvas;
  }

  private bakePaddleSprite(skinId: string): AnyCanvas {
    const logicalW = 116;
    const logicalH = 18;
    const canvas = this.adapter.createOffscreenCanvas(
      Math.ceil(logicalW * SPRITE_SCALE),
      Math.ceil(logicalH * SPRITE_SCALE),
    );
    const ctx = this.requireCtx(canvas);
    ctx.scale(SPRITE_SCALE, SPRITE_SCALE);
    this.skins.get(skinId).draw(ctx, logicalW, logicalH);
    return canvas;
  }

  /** 静态背景：深海夜空蓝底 + 稀疏星点 + 死亡线，全程只烘焙一次。 */
  private bakeBackground(): void {
    if (!this.backgroundLayer) return;
    const ctx = this.requireCtx(this.backgroundLayer);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#08102e';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // 星点（确定性伪随机，切关不闪烁）
    let seed = 20261126;
    const random = (): number => {
      // 线性同余，避免依赖注入 RNG 的状态
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 90; i++) {
      const x = random() * LOGICAL_WIDTH;
      const y = HUD_TOP + random() * (LOGICAL_HEIGHT - HUD_TOP - 60);
      const r = random() * 1.3 + 0.3;
      ctx.globalAlpha = 0.18 + random() * 0.4;
      ctx.fillStyle = '#a9c2ff';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 侧墙微光带与顶墙提示线
    ctx.fillStyle = 'rgba(124,162,255,0.10)';
    ctx.fillRect(0, WALL_TOP, WALL_LEFT, LOGICAL_HEIGHT - WALL_TOP);
    ctx.fillRect(WALL_RIGHT, WALL_TOP, LOGICAL_WIDTH - WALL_RIGHT, LOGICAL_HEIGHT - WALL_TOP);

    // 死亡线（暗红虚线）
    ctx.strokeStyle = 'rgba(239,29,29,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(WALL_LEFT, DEATH_LINE_Y);
    ctx.lineTo(WALL_RIGHT, DEATH_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /**
   * 跨端画布类型桥接：`AnyCanvas` 是结构类型，无法静态匹配 DOM lib 的
   * `CanvasImageSource` 联合；运行时 HTMLCanvasElement / OffscreenCanvas 均为
   * 合法 drawImage 源，断言集中在这一处，禁止散落各处。
   */
  private blit(
    ctx: DrawCtx,
    src: AnyCanvas,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void {
    ctx.drawImage(src as CanvasImageSource, dx, dy, dw, dh);
  }

  /* ---------------------------------------------------------------- */
  /* 基础设施                                                          */
  /* ---------------------------------------------------------------- */

  private createLayer(width: number, height: number): AnyCanvas {
    const canvas = this.adapter.createOffscreenCanvas(
      Math.round(width * this.dpr),
      Math.round(height * this.dpr),
    );
    const ctx = this.requireCtx(canvas);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    return canvas;
  }

  private configureMainCanvas(width: number, height: number): void {
    if (!this.mainCanvas) return;
    const canvas = this.mainCanvas as HTMLCanvasElement;
    canvas.width = Math.round(width * this.dpr);
    canvas.height = Math.round(height * this.dpr);
    const ctx = this.requireCtx(canvas);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private requireCtx(canvas: AnyCanvas): DrawCtx {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas2DRenderer: 2d 上下文不可用');
    return ctx;
  }

  private updateShake(dt: number): void {
    if (this.shakeRemainingMs <= 0) return;
    this.shakeRemainingMs = Math.max(0, this.shakeRemainingMs - dt * 1000);
    if (this.shakeRemainingMs === 0) this.shakeIntensity = 0;
  }
}

/* -------------------------------------------------------------------- */
/* 特殊砖徽记（仅在离屏砖块层调用，零路径 / 零 arc）                       */
/* -------------------------------------------------------------------- */

/**
 * 绘制特殊砖图形徽记。
 *
 * - 炸弹：圆形轮廓 + 引信 + 火花点
 * - 棱镜：阶梯三角
 * - 核心：方环 + 实心核
 *
 * 全部用 `fillRect` 像素块拼装，避免 `arc` / 路径调用（铁律：主循环链路零 arc）。
 */
function paintSpecialGlyph(
  ctx: DrawCtx,
  role: 'BOMB' | 'PRISM' | 'CORE',
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const t = Math.max(1, Math.round(Math.min(w, h) * 0.11));
  if (role === 'BOMB') {
    // 炸弹本体圆角方框
    const bx = x + w * 0.26;
    const by = y + h * 0.30;
    const bw = w * 0.44;
    const bh = h * 0.48;
    ctx.fillRect(bx, by, bw, t);
    ctx.fillRect(bx, by + bh - t, bw, t);
    ctx.fillRect(bx, by, t, bh);
    ctx.fillRect(bx + bw - t, by, t, bh);
    // 引信 + 火花
    ctx.fillRect(bx + bw - t, by - h * 0.16, t, h * 0.16);
    ctx.fillRect(bx + bw - t, by - h * 0.24, t * 2, t * 2);
    return;
  }
  if (role === 'PRISM') {
    // 阶梯三角（4 层横条）
    const barH = Math.max(1, h * 0.15);
    const widths = [0.26, 0.5, 0.74, 0.96];
    for (let i = 0; i < widths.length; i++) {
      const bw = w * widths[i]!;
      const by = y + h * 0.78 - barH * (i + 1);
      ctx.fillRect(x + (w - bw) * 0.5, by, bw, barH);
    }
    return;
  }
  // 核心：方环 + 实心核
  const ox = x + w * 0.24;
  const oy = y + h * 0.24;
  const ow = w * 0.52;
  const oh = h * 0.52;
  ctx.fillRect(ox, oy, ow, t);
  ctx.fillRect(ox, oy + oh - t, ow, t);
  ctx.fillRect(ox, oy, t, oh);
  ctx.fillRect(ox + ow - t, oy, t, oh);
  ctx.fillRect(x + w * 0.40, y + h * 0.40, w * 0.20, h * 0.20);
}
