/**
 * Milestone 3 追加单测：每关机器人打法表、严格 4 邻域可达性、成段钢墙隔断布局。
 *
 * 背景（架构师拍板的三组调整）：
 *   1. 关卡与可达性修复：`computeReachable` 改严格 4 邻域（斜穿会把「两块
 *      STEEL 夹出的 1 格缝」误判成通路）；迷宫改用成段连续钢墙隔断，
 *      消除 1 格钢墙口袋；新手关闭内部锯齿描边。
 *   2. 每关机器人打法固化：单一策略通吃不了 20 关，改为离线标定表。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BUILTIN_LEVEL_STRATEGIES,
  getBuiltinLevelStrategy,
} from '../builtinLevelStrategies.js';
import { computeReachable } from '../DifficultyScorer.js';
import { generateExcavationMaze, generateSymmetricTotem } from '../LevelGenerators.js';
import { decodeRLE } from '../LevelSchema.js';
import { makeEmptyCell, makeSteelCell } from '../../core/BrickGrid.js';
import type { BrickCell } from '../../core/types.js';

const COLS = 42;
const ROWS = 38;

/** 合法策略名集合（与 `BotBrain.BotStrategy` 一致）。 */
const VALID_STRATEGIES = new Set([
  'widest',
  'dense',
  'gap',
  'breach',
  'deep',
  'onsight',
  'slanted',
  'reflect',
  'auto',
  'dense_gap',
]);

test('每关打法表：恰好 20 项且全部是合法策略名', () => {
  assert.equal(BUILTIN_LEVEL_STRATEGIES.length, 20);
  for (const [i, plan] of BUILTIN_LEVEL_STRATEGIES.entries()) {
    assert.ok(
      VALID_STRATEGIES.has(plan.strategy),
      `第 ${i + 1} 关的策略 "${plan.strategy}" 不在合法集合内`,
    );
    assert.ok(plan.endgameRatio > 0 && plan.endgameRatio <= 1, '残局阈值必须落在 (0, 1]');
  }
});

test('每关打法表：越界或负数索引回退默认档', () => {
  assert.deepEqual(getBuiltinLevelStrategy(0), BUILTIN_LEVEL_STRATEGIES[0]);
  assert.deepEqual(getBuiltinLevelStrategy(19), BUILTIN_LEVEL_STRATEGIES[19]);
  assert.equal(getBuiltinLevelStrategy(20).strategy, 'deep');
  assert.equal(getBuiltinLevelStrategy(-1).strategy, 'deep');
  assert.equal(getBuiltinLevelStrategy(Number.NaN).strategy, 'deep');
});

test('computeReachable：严格 4 邻域，斜穿的 1 格缝不算通路', () => {
  const cols = 5;
  const rows = 5;
  const cells: BrickCell[] = [];
  for (let i = 0; i < cols * rows; i++) cells.push(makeEmptyCell());
  // 中心 (2,2) 四周全是 STEEL，但四个斜角是空地 ——
  // 8 邻域会把斜穿的 1 格缝误判为通路，4 邻域必须判不可达。
  const set = (c: number, r: number, cell: BrickCell): void => {
    cells[r * cols + c] = cell;
  };
  set(2, 1, makeSteelCell(7));
  set(1, 2, makeSteelCell(7));
  set(3, 2, makeSteelCell(7));
  set(2, 3, makeSteelCell(7));
  const reachable = computeReachable(cells, cols, rows);
  assert.equal(reachable[2 * cols + 2], 0, '斜穿的 1 格缝不应被判为可达');
});

test('成段钢墙隔断：迷宫里不存在「左右都是钢墙的 1 格竖井」', () => {
  const def = generateExcavationMaze({ id: 'band-test', name: '带状钢墙', cols: COLS, rows: ROWS, seed: 5 });
  const { cells } = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
  let narrowShafts = 0;
  for (let r = 0; r < def.rows; r++) {
    for (let c = 1; c < def.cols - 1; c++) {
      const cur = cells[r * def.cols + c];
      if (!cur || cur.role !== 'EMPTY') continue;
      const left = cells[r * def.cols + (c - 1)];
      const right = cells[r * def.cols + (c + 1)];
      if (left?.role === 'STEEL' && right?.role === 'STEEL') narrowShafts++;
    }
  }
  assert.equal(narrowShafts, 0, '成段隔断不应制造 1 格宽竖井');
});

test('成段钢墙隔断：钢墙沿列成段分布（存在连续 4 格以上的竖直带）', () => {
  const def = generateExcavationMaze({ id: 'band-test-2', name: '带状钢墙 2', cols: COLS, rows: ROWS, seed: 9 });
  const { cells } = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
  let longestBand = 0;
  for (let c = 0; c < def.cols; c++) {
    let run = 0;
    for (let r = 0; r < def.rows; r++) {
      const cell = cells[r * def.cols + c];
      if (cell?.role === 'STEEL') {
        run++;
        longestBand = Math.max(longestBand, run);
      } else {
        run = 0;
      }
    }
  }
  assert.ok(longestBand >= 4, `钢墙应成段分布，实际最长连续段 ${longestBand}`);
});

test('图腾描边只作用于外轮廓：内部空洞不再被转成打不破的钢刺', () => {
  const def = generateSymmetricTotem({
    id: 'outline-test',
    name: '外轮廓描边',
    cols: COLS,
    rows: ROWS,
    seed: 3,
  });
  const { cells } = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);

  // 标记「与网格边界 4 邻域连通」的外部空地。
  const outside = new Uint8Array(def.cols * def.rows);
  const queue: number[] = [];
  const push = (c: number, r: number): void => {
    if (c < 0 || r < 0 || c >= def.cols || r >= def.rows) return;
    const idx = r * def.cols + c;
    if (outside[idx] === 1) return;
    const cell = cells[idx];
    if (!cell || cell.role !== 'EMPTY') return;
    outside[idx] = 1;
    queue.push(idx);
  };
  for (let c = 0; c < def.cols; c++) {
    push(c, 0);
    push(c, def.rows - 1);
  }
  for (let r = 0; r < def.rows; r++) {
    push(0, r);
    push(def.cols - 1, r);
  }
  while (queue.length > 0) {
    const idx = queue.pop()!;
    const c = idx % def.cols;
    const r = Math.floor(idx / def.cols);
    push(c + 1, r);
    push(c - 1, r);
    push(c, r + 1);
    push(c, r - 1);
  }

  // 每个 STEEL 格都应贴着「外部空地」（即它是一圈轮廓钢墙），
  // 而不是漂在砖阵内部形成打不破的孤立钢刺。
  let isolatedSpikes = 0;
  for (let r = 0; r < def.rows; r++) {
    for (let c = 0; c < def.cols; c++) {
      const cell = cells[r * def.cols + c];
      if (!cell || cell.role !== 'STEEL') continue;
      const touchesOutside =
        (r > 0 && outside[(r - 1) * def.cols + c] === 1) ||
        (r < def.rows - 1 && outside[(r + 1) * def.cols + c] === 1) ||
        (c > 0 && outside[r * def.cols + (c - 1)] === 1) ||
        (c < def.cols - 1 && outside[r * def.cols + (c + 1)] === 1);
      if (!touchesOutside) isolatedSpikes++;
    }
  }
  assert.equal(isolatedSpikes, 0, '描边不应在砖阵内部留下孤立钢刺');
});
