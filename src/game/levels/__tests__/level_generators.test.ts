/**
 * Milestone 3 — 三大关卡生成器单测：确定性、正负空间、镜像、引流通道、死区净化、外框入口。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSeededRng,
  binaryGridFromAsciiArt,
  fromBinaryGrid,
  generateSymmetricTotem,
  generateExcavationMaze,
  createEmptyCells,
  openSealedPockets,
} from '../LevelGenerators.js';
import { decodeRLE, validateDefinition } from '../LevelSchema.js';
import { analyzeStructure, computeReachable } from '../DifficultyScorer.js';
import { makeEmptyCell, makeNormalCell, makeSteelCell } from '../../core/BrickGrid.js';

const COLS = 42;
const ROWS = 38;

/** 把 Definition 还原成 cells 并跑结构分析。 */
function analyze(def: ReturnType<typeof fromBinaryGrid>) {
  const { cells } = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
  return { cells, analysis: analyzeStructure(cells, def.cols, def.rows) };
}

test('createSeededRng 同 seed 序列完全一致、异 seed 不同', () => {
  const a = createSeededRng(123);
  const b = createSeededRng(123);
  const c = createSeededRng(999);
  const seqA = Array.from({ length: 16 }, () => a());
  const seqB = Array.from({ length: 16 }, () => b());
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, Array.from({ length: 16 }, () => c()));
  assert.ok(seqA.every((v) => v >= 0 && v < 1));
});

test('binaryGridFromAsciiArt 空格与点为背景、其余为前景，行宽取最长', () => {
  const grid = binaryGridFromAsciiArt(['##.', ' #', '']);
  assert.equal(grid.cols, 3);
  assert.equal(grid.rows, 3);
  assert.equal(grid.data[0], 1);
  assert.equal(grid.data[2], 0); // '.'
  assert.equal(grid.data[3], 0); // 空格
  assert.equal(grid.data[4], 1);
  assert.equal(grid.data[6], 0); // 短行补背景
});

test('fromBinaryGrid POSITIVE：前景成砖、外框底部留 6~8 格入口、无死区', () => {
  const art = ['####', '#..#', '#..#', '####'];
  const source = binaryGridFromAsciiArt(art);
  const def = fromBinaryGrid(source, { id: 'bp', name: '正空间', cols: COLS, rows: ROWS, mode: 'POSITIVE' });
  assert.deepEqual(validateDefinition(def).errors, []);
  const { cells, analysis } = analyze(def);
  assert.equal(analysis.hasDeadZoneWarning, false);
  assert.equal(analysis.launchLineBlocked, false);
  assert.ok(analysis.breakableCount > 0);

  // 底行中央入口：统计底行连续非 STEEL 宽度，应在 6~8。
  const bottom = ROWS - 1;
  let opening = 0;
  for (let c = 0; c < COLS; c++) if (cells[bottom * COLS + c]!.role !== 'STEEL') opening++;
  assert.ok(opening >= 6 && opening <= 8, `底入口宽度 ${opening} 不在 6~8`);
  // 外框顶角是 STEEL。
  assert.equal(cells[0]!.role, 'STEEL');
});

test('fromBinaryGrid NEGATIVE：铺满砖后把前景镂空为通道', () => {
  const source = binaryGridFromAsciiArt(['....', '####', '....']);
  const def = fromBinaryGrid(source, { id: 'bn', name: '负空间', cols: COLS, rows: ROWS, mode: 'NEGATIVE' });
  const { analysis } = analyze(def);
  assert.equal(analysis.hasDeadZoneWarning, false);
  // 负空间铺满，可破坏砖数量显著多于正空间小图案。
  assert.ok(analysis.breakableCount > 300);
});

test('generateSymmetricTotem 严格左右镜像、引流通道贯通、无死区且内容不被掏空', () => {
  const def = generateSymmetricTotem({ id: 'tot', name: '图腾', cols: COLS, rows: ROWS, seed: 7, symmetry: 4 });
  const { cells, analysis } = analyze(def);
  assert.deepEqual(validateDefinition(def).errors, []);
  assert.equal(analysis.hasDeadZoneWarning, false);
  assert.equal(analysis.launchLineBlocked, false);

  // 左右镜像：cells[r][c] === cells[r][cols-1-c]。
  let symmetryBreaks = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS / 2; c++) {
      const left = cells[r * COLS + c]!;
      const right = cells[r * COLS + (COLS - 1 - c)]!;
      if (left.role !== right.role || left.hp !== right.hp) symmetryBreaks++;
    }
  }
  assert.equal(symmetryBreaks, 0);

  // 引流通道：默认 channelWidth=4 → 中央 19/20 两列自底到顶无 STEEL。
  for (let r = 0; r < ROWS; r++) {
    for (const c of [19, 20]) {
      assert.notEqual(cells[r * COLS + c]!.role, 'STEEL', `通道 (r${r},c${c}) 不应有 STEEL`);
    }
  }
  // 防过度净化回归：描边留口后图腾必须保留足量内容。
  assert.ok(analysis.breakableCount >= 80, `图腾砖数 ${analysis.breakableCount} 过少，疑似被死区净化掏空`);
});

test('generateSymmetricTotem symmetry=8 额外满足对角镜像', () => {
  const def = generateSymmetricTotem({ id: 'tot8', name: '八象', cols: COLS, rows: ROWS, seed: 11, symmetry: 8 });
  const { cells, analysis } = analyze(def);
  assert.equal(analysis.hasDeadZoneWarning, false);
  // 关于垂直中轴的镜像仍须成立。
  let breaks = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS / 2; c++) {
      if (cells[r * COLS + c]!.role !== cells[r * COLS + (COLS - 1 - c)]!.role) breaks++;
    }
  }
  assert.equal(breaks, 0);
});

test('generateExcavationMaze 无死区、发球线不封、保留足量砖', () => {
  const def = generateExcavationMaze({ id: 'maze', name: '迷宫', cols: COLS, rows: ROWS, seed: 4, steelRatio: 0.18 });
  const { analysis } = analyze(def);
  assert.deepEqual(validateDefinition(def).errors, []);
  assert.equal(analysis.hasDeadZoneWarning, false);
  assert.equal(analysis.launchLineBlocked, false);
  assert.ok(analysis.breakableCount > 500, `迷宫砖数 ${analysis.breakableCount} 过少`);
  assert.ok(analysis.steelCount > 0);
});

test('高 steelRatio 迷宫经净化后依然零死区（回归 sanitize 失效缺陷）', () => {
  const def = generateExcavationMaze({ id: 'maze-hard', name: '硬迷宫', cols: COLS, rows: ROWS, seed: 4, steelRatio: 0.32 });
  const { analysis } = analyze(def);
  assert.equal(analysis.deadZoneBrickCount, 0);
  assert.equal(analysis.hasDeadZoneWarning, false);
});

test('三生成器产出 RLE 往返均无损且无校验 error', () => {
  const defs = [
    fromBinaryGrid(binaryGridFromAsciiArt(['##', '##']), { id: 'a', name: 'a' }),
    generateSymmetricTotem({ id: 'b', name: 'b', seed: 3 }),
    generateExcavationMaze({ id: 'c', name: 'c', seed: 5 }),
  ];
  for (const def of defs) {
    const r1 = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
    const r2 = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
    assert.equal(r1.cells.length, def.cols * def.rows);
    for (let i = 0; i < r1.cells.length; i++) {
      assert.equal(r1.cells[i]!.role, r2.cells[i]!.role);
      assert.equal(r1.cells[i]!.hp, r2.cells[i]!.hp);
    }
    assert.deepEqual(validateDefinition(def).errors, []);
  }
});

test('createEmptyCells 产出全 EMPTY 且尺寸正确', () => {
  const cells = createEmptyCells(28, 24);
  assert.equal(cells.length, 28 * 24);
  assert.ok(cells.every((c) => c.role === 'EMPTY'));
});

test('openSealedPockets 把四面钢墙的封闭格开凿成缺口（砖量不减反增）', () => {
  const cols = 12;
  const rows = 9;
  const cells = createEmptyCells(cols, rows);
  // 造一个 3×3 的钢墙盒子，中间 (5,4) 全封闭
  for (let r = 3; r <= 5; r += 1) {
    for (let c = 4; c <= 6; c += 1) {
      cells[r * cols + c] = makeSteelCell();
    }
  }
  // 盒子中心留一个空格子：它四面都是钢墙 → 典型死角
  cells[4 * cols + 5] = makeEmptyCell();
  const before = cells.filter((c) => c.role !== 'EMPTY').length;
  const opened = openSealedPockets(cells, cols, rows);
  assert.ok(opened >= 1, '至少应开凿一处');
  const after = cells.filter((c) => c.role !== 'EMPTY').length;
  assert.equal(after, before, '钢墙转普通砖，总格数不变');
  const breakable = cells.filter((c) => c.role !== 'STEEL' && c.role !== 'EMPTY').length;
  assert.ok(breakable >= 1, '开凿后至少留下一块可破坏砖');
});

test('openSealedPockets 开凿后该格不再被判为死区', () => {
  const cols = 12;
  const rows = 9;
  const cells = createEmptyCells(cols, rows);
  for (let r = 3; r <= 5; r += 1) {
    for (let c = 4; c <= 6; c += 1) {
      cells[r * cols + c] = makeSteelCell();
    }
  }
  cells[4 * cols + 5] = makeEmptyCell();
  const before = computeReachable(cells, cols, rows);
  const deadBefore = before.filter((v) => v === 0).length;
  openSealedPockets(cells, cols, rows);
  const after = computeReachable(cells, cols, rows);
  const deadAfter = after.filter((v) => v === 0).length;
  assert.ok(deadAfter <= deadBefore, '开凿后死区数不应增加');
});

test('openSealedPockets 没有封闭死角时不改动任何格子', () => {
  const cols = 10;
  const rows = 8;
  const cells = createEmptyCells(cols, rows);
  cells[2 * cols + 2] = makeNormalCell(1, 0);
  const snapshot = cells.map((c) => `${c.role}:${c.hp}:${c.colorIndex}`).join('|');
  const opened = openSealedPockets(cells, cols, rows);
  assert.equal(opened, 0);
  assert.equal(
    cells.map((c) => `${c.role}:${c.hp}:${c.colorIndex}`).join('|'),
    snapshot,
    '无死角时网格必须逐格不变',
  );
});
