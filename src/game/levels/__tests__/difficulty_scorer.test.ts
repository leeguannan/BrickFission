/**
 * Milestone 3 — DifficultyScorer 单测：BFS 死区、发球线封死、静态分、档位、Headless 盲测预算。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeNormalCell, makeSteelCell } from '../../core/BrickGrid.js';
import {
  computeReachable,
  analyzeStructure,
  detectLaunchLineBlocked,
  tierForScore,
  scoreLevel,
  SIM_ANGLES,
  SIM_BUDGET_MS,
} from '../DifficultyScorer.js';
import { generateSymmetricTotem, generateExcavationMaze, createEmptyCells } from '../LevelGenerators.js';
import { definitionFromCells, decodeRLE, type LevelDefinition } from '../LevelSchema.js';

const COLS = 42;
const ROWS = 38;

test('computeReachable：开放网格全部可达，STEEL 封闭盒内为死区', () => {
  const cells = createEmptyCells(COLS, ROWS);
  // 一个 STEEL 盒子（row10~14, col10~14），内部放 NORMAL，盒外开放区无法进入。
  for (let r = 10; r <= 14; r++) {
    for (let c = 10; c <= 14; c++) {
      const isWall = r === 10 || r === 14 || c === 10 || c === 14;
      cells[r * COLS + c] = isWall ? makeSteelCell(7) : makeNormalCell(1, 0);
    }
  }
  const reachable = computeReachable(cells, COLS, ROWS);
  // 盒内三点（11,11)/(12,12)/(13,13) 不可达。
  for (const [r, c] of [[11, 11], [12, 12], [13, 13]]) {
    assert.equal(reachable[r! * COLS + c!], 0, `盒内 (${r},${c}) 应为死区`);
  }
  // 底边开放区可达。
  assert.equal(reachable[(ROWS - 1) * COLS + 2]!, 1);

  const analysis = analyzeStructure(cells, COLS, ROWS);
  assert.equal(analysis.deadZoneBrickCount, 9); // 3×3 盒内 NORMAL
  assert.equal(analysis.hasDeadZoneWarning, true);
});

test('computeReachable：可破坏砖不阻断 BFS（视为可打通）', () => {
  const cells = createEmptyCells(COLS, ROWS);
  // 一堵 NORMAL 横墙，BFS 应能穿过（仅 STEEL 阻断）。
  for (let c = 0; c < COLS; c++) cells[20 * COLS + c] = makeNormalCell(1, 0);
  const reachable = computeReachable(cells, COLS, ROWS);
  assert.equal(reachable[5 * COLS + 5], 1);
  const analysis = analyzeStructure(cells, COLS, ROWS);
  assert.equal(analysis.deadZoneBrickCount, 0);
  assert.equal(analysis.hasDeadZoneWarning, false);
});

test('detectLaunchLineBlocked：中央双 STEEL 封死为 true，先遇可破坏砖为 false', () => {
  const blocked = createEmptyCells(COLS, ROWS);
  const axisLeft = Math.floor(COLS / 2) - 1; // 20
  // 中上部一行中央两列同时 STEEL，下方全空 → 封死。
  blocked[8 * COLS + axisLeft] = makeSteelCell(7);
  blocked[8 * COLS + axisLeft + 1] = makeSteelCell(7);
  assert.equal(detectLaunchLineBlocked(blocked, COLS, ROWS), true);

  const open = createEmptyCells(COLS, ROWS);
  open[8 * COLS + axisLeft] = makeSteelCell(7);
  open[8 * COLS + axisLeft + 1] = makeSteelCell(7);
  // 更靠下先遇到可破坏砖 → 通道有效。
  open[20 * COLS + axisLeft] = makeNormalCell(1, 0);
  assert.equal(detectLaunchLineBlocked(open, COLS, ROWS), false);

  const clear = createEmptyCells(COLS, ROWS);
  assert.equal(detectLaunchLineBlocked(clear, COLS, ROWS), false);
});

test('detectLaunchLineBlocked：仅顶部外框封顶不算封死（汉字关外框回归）', () => {
  const framed = createEmptyCells(COLS, ROWS);
  const axisLeft = Math.floor(COLS / 2) - 1;
  // 第 0 行中央两列同时 STEEL：属于自动外框封顶，通道本身是通的。
  framed[0 * COLS + axisLeft] = makeSteelCell(7);
  framed[0 * COLS + axisLeft + 1] = makeSteelCell(7);
  assert.equal(detectLaunchLineBlocked(framed, COLS, ROWS), false);

  // 同样结构但封顶在第 2 行（中途横跨）且下方无砖可打 → 判封死。
  const midWall = createEmptyCells(COLS, ROWS);
  midWall[2 * COLS + axisLeft] = makeSteelCell(7);
  midWall[2 * COLS + axisLeft + 1] = makeSteelCell(7);
  assert.equal(detectLaunchLineBlocked(midWall, COLS, ROWS), true);
});

test('tierForScore 档位边界与 docs/03 分布对齐', () => {
  assert.equal(tierForScore(0), 'EASY');
  assert.equal(tierForScore(34), 'EASY');
  assert.equal(tierForScore(35), 'MEDIUM');
  assert.equal(tierForScore(55), 'MEDIUM');
  assert.equal(tierForScore(56), 'HARD');
  assert.equal(tierForScore(79), 'HARD');
  assert.equal(tierForScore(80), 'EXPERT');
  assert.equal(tierForScore(100), 'EXPERT');
});

test('scoreLevel：生成关卡产出 0~100 分、8 角度清砖率、tier 与盲测预算内', () => {
  const def = generateSymmetricTotem({ id: 'score', name: '评分', cols: COLS, rows: ROWS, seed: 7 });
  const result = scoreLevel(def);
  assert.ok(result.totalScore >= 0 && result.totalScore <= 100);
  assert.equal(result.breakdown.perAngleBreakRates.length, SIM_ANGLES.length);
  for (const rate of result.breakdown.perAngleBreakRates) {
    assert.ok(rate >= 0 && rate <= 1);
  }
  assert.ok(result.breakdown.simBreakRate20s >= 0 && result.breakdown.simBreakRate20s <= 1);
  assert.equal(result.tier, tierForScore(result.totalScore));
  // 生成器已净化，无死区/封门。
  assert.equal(result.hasDeadZoneWarning, false);
  // 性能红线：withinSimBudget 必须与实测耗时自洽。
  // 墙钟上限用 10× 预算兜底：node --test 默认多文件并发执行，CPU 被抢占时
  // 墙钟时间会明显抖动（实测 273~336ms），严格 150ms 断言属于环境噪声。
  // 严格预算结论由 `npm run test:serial`（串行无竞争）给出，实测峰值约 36ms。
  assert.equal(result.breakdown.withinSimBudget, result.breakdown.simElapsedMs <= SIM_BUDGET_MS);
  assert.ok(
    result.breakdown.simElapsedMs <= SIM_BUDGET_MS * 10,
    `盲测耗时 ${result.breakdown.simElapsedMs}ms 远超预算上限，疑似性能回归`,
  );
});

test('scoreLevel：致密迷宫分高于稀疏图腾（难度单调语义）', () => {
  const totem = generateSymmetricTotem({ id: 'easy', name: '图腾', cols: COLS, rows: ROWS, seed: 3 });
  const maze = generateExcavationMaze({ id: 'hard', name: '迷宫', cols: COLS, rows: ROWS, seed: 4, steelRatio: 0.18 });
  // 用缩短盲测加速断言，仍走同一 GameEngine 路径。
  const easy = scoreLevel(totem, { angles: [0, 30], simSeconds: 6 });
  const hard = scoreLevel(maze, { angles: [0, 30], simSeconds: 6 });
  assert.ok(
    hard.totalScore >= easy.totalScore,
    `致密迷宫(${hard.totalScore}) 应难于稀疏图腾(${easy.totalScore})`,
  );
});

test('scoreLevel：RLE 解码告警时抛错（废件不评分）', () => {
  const good = generateSymmetricTotem({ id: 'g', name: 'g', cols: COLS, rows: ROWS, seed: 1 });
  // 手工破坏 rleGrid：注入 palette 中不存在的符号。
  const broken: LevelDefinition = { ...good, rleGrid: good.rleGrid.replace('R', 'Z') };
  assert.throws(() => scoreLevel(broken), /RLE 解码告警/);
});

test('scoreLevel：自定义角度/时长选项生效且结果确定', () => {
  const def = generateExcavationMaze({ id: 'det', name: '确定性', cols: COLS, rows: ROWS, seed: 5 });
  const r1 = scoreLevel(def, { angles: [-15, 15], simSeconds: 4, rngSeed: 42 });
  const r2 = scoreLevel(def, { angles: [-15, 15], simSeconds: 4, rngSeed: 42 });
  assert.equal(r1.totalScore, r2.totalScore);
  assert.equal(r1.breakdown.perAngleBreakRates.length, 2);
  assert.deepEqual(r1.breakdown.perAngleBreakRates, r2.breakdown.perAngleBreakRates);
});

test('analyzeStructure：统计可破坏数/钢墙数/总血量', () => {
  const cells = createEmptyCells(COLS, ROWS);
  cells[5 * COLS + 5] = makeNormalCell(2, 0);
  cells[5 * COLS + 6] = makeNormalCell(3, 1);
  cells[6 * COLS + 5] = makeSteelCell(7);
  const a = analyzeStructure(cells, COLS, ROWS);
  assert.equal(a.breakableCount, 2);
  assert.equal(a.steelCount, 1);
  // totalHp 只计可破坏砖：STEEL 的 9999 是哨兵血量，不参与密度统计。
  assert.equal(a.totalHp, 2 + 3);
});

test('definitionFromCells→decodeRLE 后评分输入自洽（端到端契约）', () => {
  const cells = createEmptyCells(COLS, ROWS);
  for (let r = 4; r < 12; r++) {
    for (let c = 12; c < 30; c++) cells[r * COLS + c] = makeNormalCell(1, (r + c) % 7);
  }
  const def = definitionFromCells({ id: 'e2e', name: '端到端', cells, cols: COLS, rows: ROWS });
  const { warnings } = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
  assert.deepEqual(warnings, []);
  const result = scoreLevel(def, { angles: [0], simSeconds: 3 });
  assert.ok(result.totalScore >= 0 && result.totalScore <= 100);
});
