/**
 * 《碎砖大裂变》(Brick Fission) — Canvas2DRenderer 性能铁律单测
 *
 * 验证 docs/02 §2.2 / §4.1：
 *   1. 砖块离屏层：切关整层重建、进行中仅 dirty 单格重绘，主画布每帧恰 1 次砖层 blit；
 *   2. 主循环零 arc / 零渐变创建（精灵全部预烘焙）；
 *   3. 球按 active 过滤、高能倍率切换贴图不改变绘制次数；
 *   4. DPR 封顶 2；粒子颜色映射与数量夹取；调试计数可重置。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BALL_RADIUS,
  DEFAULT_BRICK_COLORS,
  PADDLE_HEIGHT,
  PADDLE_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../../core/constants.js';
import { BrickGrid, makeNormalCell, makeSteelCell } from '../../core/BrickGrid.js';
import type { AimPrediction, Ball, BrickCell, Paddle } from '../../core/types.js';
import { TEST_COLS, TEST_ROWS, emptyLevel, levelWith } from '../../core/__tests__/testkit.js';
import { Canvas2DRenderer } from '../Canvas2DRenderer.js';
import type { GameSnapshot, RenderContextData } from '../IRenderer.js';
import { makeMockAdapter, makeMockCanvas, type MockCanvas, type Mock2DCtx } from './mocks.js';

const PADDLE_Y = 1090;

function makePaddle(): Paddle {
  return {
    x: WORLD_WIDTH * 0.5,
    y: PADDLE_Y,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    targetX: WORLD_WIDTH * 0.5,
  };
}

function makeBall(id: number, active: boolean, x = 360, y = 600): Ball {
  return {
    id,
    active,
    x,
    y,
    vx: 0,
    vy: -600,
    radius: BALL_RADIUS,
    pierceCount: 0,
    bouncesSinceBrick: 0,
  };
}

function makeSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    phase: 'PLAYING',
    levelId: 'test-level',
    levelNo: 1,
    paddle: makePaddle(),
    balls: [],
    activeBallCount: 0,
    aim: null,
    combo: 0,
    remainingBreakable: 0,
    totalBreakable: 0,
    speedMultiplier: 1,
    damageMultiplier: 1,
    endgameAssist: false,
    paddleSkinId: 'capsule_blue',
    muted: false,
    ...overrides,
  };
}

function makeAim(firstCount: number, secondCount: number): AimPrediction {
  const dot = (i: number) => ({ x: 100 + i * 20, y: 400 + i * 10, alpha: 1 });
  const firstSegment = Array.from({ length: 160 }, (_, i) => dot(i));
  const secondSegment = Array.from({ length: 160 }, (_, i) => dot(i + 50));
  return {
    originX: 360,
    originY: 1080,
    angleDeg: 0,
    firstSegment,
    firstSegmentCount: firstCount,
    hitPoint: { x: 360, y: 200 },
    secondSegment,
    secondSegmentCount: secondCount,
  };
}

interface Harness {
  adapter: ReturnType<typeof makeMockAdapter> & { canvases: MockCanvas[] };
  mainCanvas: MockCanvas;
  mainCtx: Mock2DCtx;
  renderer: Canvas2DRenderer;
  grid: BrickGrid;
  renderFrame: (overrides?: {
    dirty?: RenderContextData['dirtyBricks'];
    fullRebuild?: boolean;
    snapshot?: Partial<GameSnapshot>;
  }) => void;
}

function createHarness(cells: Array<[number, number, BrickCell]> = []): Harness {
  const adapter = makeMockAdapter() as ReturnType<typeof makeMockAdapter> & { canvases: MockCanvas[] };
  // holder 让 gridProvider 闭包能感知测试中的网格替换（模拟切关/重开）
  const holder = { grid: new BrickGrid(cells.length ? levelWith(cells) : emptyLevel()) };
  const renderer = new Canvas2DRenderer({ adapter, gridProvider: () => holder.grid, rng: () => 0.5 });
  const mainCanvas = makeMockCanvas(WORLD_WIDTH, WORLD_HEIGHT);
  renderer.init(mainCanvas, WORLD_WIDTH, WORLD_HEIGHT, 1);
  const mainCtx = mainCanvas.ctx;

  const renderFrame: Harness['renderFrame'] = (overrides = {}) => {
    const data: RenderContextData = {
      engineState: makeSnapshot(overrides.snapshot),
      dirtyBricks: overrides.dirty ?? [],
      fullRebuildBricks: overrides.fullRebuild ?? false,
    };
    renderer.render(data, 1 / 60);
  };
  return {
    adapter,
    mainCanvas,
    mainCtx,
    renderer,
    get grid(): BrickGrid {
      return holder.grid;
    },
    set grid(value: BrickGrid) {
      holder.grid = value;
    },
    renderFrame,
  };
}

test('首帧触发砖块整层重建，且每帧砖层 blit 恰 1 次', () => {
  const h = createHarness([
    [10, 5, makeNormalCell(1, 0)],
    [20, 6, makeSteelCell()],
  ]);
  h.renderFrame();
  const counters = h.renderer.getDebugCounters();
  assert.equal(counters.frameCount, 1);
  assert.equal(counters.brickLayerRebuilds, 1);
  assert.equal(counters.brickLayerBlits, 1);
  assert.equal(counters.dirtyCellRepaints, 0);

  // 连续两帧无 dirty、同 grid 引用：不再重建，每帧仍恰 1 次砖层 blit
  h.renderFrame();
  h.renderFrame();
  const c2 = h.renderer.getDebugCounters();
  assert.equal(c2.frameCount, 3);
  assert.equal(c2.brickLayerRebuilds, 1);
  assert.equal(c2.brickLayerBlits, 3);
  assert.equal(c2.dirtyCellRepaints, 0);
});

test('主循环零 arc / 零渐变创建（精灵预烘焙铁律）', () => {
  const h = createHarness([[10, 5, makeNormalCell(1, 0)]]);
  for (let i = 0; i < 5; i++) h.renderFrame();
  assert.equal(h.mainCtx.counters.arc, 0);
  assert.equal(h.mainCtx.counters.createLinearGradient, 0);
  assert.equal(h.mainCtx.counters.createRadialGradient, 0);
  // 护栏字段保持恒 0
  assert.equal(h.renderer.getDebugCounters().mainThreadArcCalls, 0);
});

test('每帧主画布对全屏离屏层（背景+砖层）恰 2 次 blit，尺寸为逻辑舞台大小', () => {
  const h = createHarness();
  h.renderFrame();
  h.renderFrame();
  const fullScreenBlits = h.mainCtx.drawImageSources.filter((src) => src.width === WORLD_WIDTH);
  assert.equal(fullScreenBlits.length, 4); // 2 帧 × (背景 1 + 砖层 1)
});

test('dirtyBricks 走单格增量重绘，不触发整层重建', () => {
  const h = createHarness([[10, 5, makeNormalCell(1, 0)]]);
  h.renderFrame(); // 首帧整层
  // 注意：getDebugCounters() 返回内部活引用，必须当场拷贝原始数值
  const rebuildsBefore = h.renderer.getDebugCounters().brickLayerRebuilds;
  const blitsBefore = h.renderer.getDebugCounters().brickLayerBlits;

  const empty: BrickCell = { role: 'EMPTY', hp: 0, maxHp: 0, colorIndex: 0 };
  h.renderFrame({ dirty: [{ col: 10, row: 5, cell: empty, destroyed: true }] });
  const after = h.renderer.getDebugCounters();
  assert.equal(after.brickLayerRebuilds, rebuildsBefore);
  assert.equal(after.dirtyCellRepaints, 1);
  assert.equal(after.brickLayerBlits, blitsBefore + 1);
});

test('grid 引用替换（切关/重开）自动触发整层重建', () => {
  const h = createHarness();
  h.renderFrame();
  const before = h.renderer.getDebugCounters().brickLayerRebuilds;

  const nextGrid = new BrickGrid(emptyLevel('next-level'));
  h.grid = nextGrid; // holder 赋值，gridProvider 下一帧读到新引用
  h.renderFrame();
  assert.equal(h.renderer.getDebugCounters().brickLayerRebuilds, before + 1);
});

test('球池按 active 过滤绘制，高能倍率只换贴图不换次数', () => {
  const h = createHarness();
  h.renderFrame();
  const baseline = h.mainCtx.counters.drawImage;

  const balls = [makeBall(0, true, 300, 600), makeBall(1, false, 360, 700), makeBall(2, true, 400, 800)];
  h.renderFrame({ snapshot: { balls, activeBallCount: 2 } });
  // 每帧固定基础 blit=3（背景+砖层+挡板），另加 2 个活跃球 → 帧增量 5
  assert.equal(h.mainCtx.counters.drawImage - baseline, 5);

  const baseline2 = h.mainCtx.counters.drawImage;
  h.renderFrame({ snapshot: { balls, activeBallCount: 2, damageMultiplier: 2 } });
  // 高能倍率只切换球贴图来源，blit 次数不变
  assert.equal(h.mainCtx.counters.drawImage - baseline2, 5);
});

test('瞄准预测按段计数 blit 圆点', () => {
  const h = createHarness();
  h.renderFrame();
  const baseline = h.mainCtx.counters.drawImage;
  h.renderFrame({ snapshot: { aim: makeAim(3, 2), phase: 'READY_AIM' } });
  // 基础 3 + 首段 3 圆点 + 次段 2 圆点
  assert.equal(h.mainCtx.counters.drawImage - baseline, 8);
});

test('粒子：未知颜色回退色板 0，数量夹在 2~3，生命周期结束自动停绘', () => {
  const h = createHarness();
  h.renderFrame(); // 静止基线帧：背景 1 + 砖层 1 + 挡板 1 = 3 blit
  const t1 = h.mainCtx.counters.drawImage;

  // count=99 被夹到 3；未知颜色字符串不抛错（内部回退 colorIndex 0）
  h.renderer.spawnBrickParticles(100, 100, '#not-a-real-color', 99);
  h.renderFrame();
  // 基础 3 + 3 个新生粒子
  assert.equal(h.mainCtx.counters.drawImage - t1, 6);
  const t2 = h.mainCtx.counters.drawImage;

  // 显式 count=1 同样夹到下限 2；上一批 3 个仍活跃，本帧共 5 个粒子
  h.renderer.spawnBrickParticles(1, 1, DEFAULT_BRICK_COLORS[0]!, 1);
  h.renderFrame();
  assert.equal(h.mainCtx.counters.drawImage - t2, 8); // 基础 3 + 粒子 5

  // 推进超过最大粒子寿命 0.55s（40 帧 ≈ 0.67s），全部失活
  for (let i = 0; i < 40; i++) {
    h.renderer.render({ engineState: makeSnapshot(), dirtyBricks: [], fullRebuildBricks: false }, 1 / 60);
  }
  const afterLife = h.mainCtx.counters.drawImage;
  h.renderFrame();
  // 粒子全失活后回到静止帧固定增量 3，不再有碎块 blit
  assert.equal(h.mainCtx.counters.drawImage - afterLife, 3);
});

test('DPR 封顶 2，低于 1 时抬到 1', () => {
  const adapter = makeMockAdapter() as ReturnType<typeof makeMockAdapter> & { canvases: MockCanvas[] };
  const grid = new BrickGrid(emptyLevel());
  const r3 = new Canvas2DRenderer({ adapter, gridProvider: () => grid });
  const c3 = makeMockCanvas(WORLD_WIDTH, WORLD_HEIGHT);
  r3.init(c3, WORLD_WIDTH, WORLD_HEIGHT, 3);
  assert.equal(c3.width, WORLD_WIDTH * 2);
  assert.equal(c3.height, WORLD_HEIGHT * 2);

  const r1 = new Canvas2DRenderer({ adapter, gridProvider: () => grid });
  const c1 = makeMockCanvas(WORLD_WIDTH, WORLD_HEIGHT);
  r1.init(c1, WORLD_WIDTH, WORLD_HEIGHT, 0.5);
  assert.equal(c1.width, WORLD_WIDTH);
  assert.equal(c1.height, WORLD_HEIGHT);
});

test('震屏不影响 blit 计数，resetDebugCounters 归零全部计数', () => {
  const h = createHarness();
  h.renderer.triggerScreenShake(8, 200);
  h.renderFrame();
  assert.doesNotThrow(() => h.renderFrame());
  assert.equal(h.renderer.getDebugCounters().brickLayerBlits, 2);

  h.renderer.resetDebugCounters();
  const c = h.renderer.getDebugCounters();
  assert.equal(c.frameCount, 0);
  assert.equal(c.brickLayerBlits, 0);
  assert.equal(c.dirtyCellRepaints, 0);
  assert.equal(c.brickLayerRebuilds, 0);
});

test('网格尺寸契约：42×38 网格的 cellRect 与逻辑舞台对齐', () => {
  const grid = new BrickGrid(emptyLevel());
  assert.equal(grid.cols, TEST_COLS);
  assert.equal(grid.rows, TEST_ROWS);
  const rect = grid.cellRect(0, 0);
  assert.ok(rect.width > 0 && rect.height > 0);
  const last = grid.cellRect(TEST_COLS - 1, TEST_ROWS - 1);
  assert.ok(last.x + last.width <= WORLD_WIDTH + 1e-6);
  assert.ok(last.y + last.height <= WORLD_HEIGHT + 1e-6);
});
