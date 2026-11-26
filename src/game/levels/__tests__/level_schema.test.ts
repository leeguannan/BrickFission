/**
 * Milestone 3 — LevelSchema 单测：调色板字典、RLE 严格无损、数字符号防御、桥接与校验。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeNormalCell, makeSteelCell } from '../../core/BrickGrid.js';
import type { BrickCell } from '../../core/types.js';
import {
  STANDARD_PALETTE,
  SCHEMA_VERSION,
  definitionFromCells,
  encodeRLE,
  decodeRLE,
  toRuntimeConfig,
  validateDefinition,
  serializeDefinition,
  parseDefinition,
  type LevelDefinition,
  type TilePaletteEntry,
} from '../LevelSchema.js';
import { createEmptyCells } from '../LevelGenerators.js';

const COLS = 42;
const ROWS = 38;

/** 角色与血量比对（STEEL 的 colorIndex 会被调色板归一化到 7，故不参与逐格比对）。 */
function roleHpEqual(a: BrickCell, b: BrickCell): boolean {
  return a.role === b.role && a.hp === b.hp && (a.role === 'STEEL' || a.colorIndex === b.colorIndex);
}

test('STANDARD_PALETTE 只使用字母与空位符号，绝不含数字符号', () => {
  for (const symbol of Object.keys(STANDARD_PALETTE)) {
    assert.ok(/^[.A-Za-z]$/.test(symbol), `调色板符号 "${symbol}" 必须是字母或空位 '.'`);
    assert.equal(STANDARD_PALETTE[symbol]!.symbol, symbol);
  }
  // 多血砖符号已字母化（回归：历史上曾用 '2'/'3'/'4' 与 RLE 计数前缀冲突）。
  assert.equal(STANDARD_PALETTE.D!.hp, 2);
  assert.equal(STANDARD_PALETTE.E!.hp, 3);
  assert.equal(STANDARD_PALETTE.F!.hp, 4);
});

test('RLE 严格无损往返：STEEL/多血/多色/空位逐格还原', () => {
  const cells = createEmptyCells(COLS, ROWS);
  for (let r = 2; r < 12; r++) {
    for (let c = 2; c < 40; c++) {
      const idx = r * COLS + c;
      if (r === 2 || c === 2 || c === 39) cells[idx] = makeSteelCell(7);
      else cells[idx] = makeNormalCell(1 + ((r + c) % 3), (r * 3 + c) % 7);
    }
  }
  const def = definitionFromCells({ id: 'rle', name: '无损', cells, cols: COLS, rows: ROWS });

  // 动态分配的符号也必须全是字母。
  for (const symbol of Object.keys(def.palette)) {
    assert.ok(/^[.A-Za-z]$/.test(symbol), `动态符号 "${symbol}" 不能为数字`);
  }

  const { cells: back, warnings } = decodeRLE(def.rleGrid, COLS, ROWS, def.palette);
  assert.deepEqual(warnings, []);
  let mismatch = 0;
  for (let i = 0; i < cells.length; i++) {
    if (!roleHpEqual(cells[i]!, back[i]!)) mismatch++;
  }
  assert.equal(mismatch, 0);
});

test('多位数 run（如 19 连砖）编码后可正确往返，不与符号解析混淆', () => {
  const cells = createEmptyCells(COLS, ROWS);
  for (let c = 10; c < 29; c++) cells[3 * COLS + c] = makeNormalCell(1, 0); // 连续 19 块
  const def = definitionFromCells({ id: 'run', name: '连砖', cells, cols: COLS, rows: ROWS });
  assert.ok(def.rleGrid.split('|')[3]!.includes('19'), '应出现多位数计数 19');
  const { cells: back, warnings } = decodeRLE(def.rleGrid, COLS, ROWS, def.palette);
  assert.deepEqual(warnings, []);
  for (let c = 10; c < 29; c++) assert.equal(back[3 * COLS + c]!.role, 'NORMAL');
  assert.equal(back[3 * COLS + 9]!.role, 'EMPTY');
  assert.equal(back[3 * COLS + 29]!.role, 'EMPTY');
});

test('全空网格编码为纯空位行，跨行不合并', () => {
  const cells = createEmptyCells(COLS, ROWS);
  const def = definitionFromCells({ id: 'empty', name: '空', cells, cols: COLS, rows: ROWS });
  const lines = def.rleGrid.split('|');
  assert.equal(lines.length, ROWS);
  for (const line of lines) assert.match(line, /^[.0-9]+$/); // 仅空位与计数
  const { cells: back } = decodeRLE(def.rleGrid, COLS, ROWS, def.palette);
  assert.ok(back.every((c) => c.role === 'EMPTY'));
});

test('encodeRLE 对数字符号调色板直接抛错（词法歧义防御）', () => {
  const cells = createEmptyCells(4, 2);
  cells[0] = makeNormalCell(2, 0);
  const badPalette: Record<string, TilePaletteEntry> = {
    '.': { symbol: '.', role: 'EMPTY', hp: 0, color: '#000000' },
    '5': { symbol: '5', role: 'NORMAL', hp: 2, color: '#f4b740' },
  };
  assert.throws(() => encodeRLE(cells, 4, 2, badPalette), /不能为数字/);
});

test('dropTag 在 RLE 往返中无损保留', () => {
  const cells = createEmptyCells(COLS, ROWS);
  const bomb: BrickCell = { role: 'BOMB', hp: 1, maxHp: 1, colorIndex: 0, dropTag: 'reward_gem' };
  cells[5 * COLS + 5] = bomb;
  const def = definitionFromCells({ id: 'tag', name: '掉落', cells, cols: COLS, rows: ROWS });
  const { cells: back } = decodeRLE(def.rleGrid, COLS, ROWS, def.palette);
  assert.equal(back[5 * COLS + 5]!.dropTag, 'reward_gem');
  assert.equal(back[5 * COLS + 5]!.role, 'BOMB');
});

test('toRuntimeConfig 映射 mechanics.initialSkills 到 core 字段名', () => {
  const cells = createEmptyCells(COLS, ROWS);
  cells[2 * COLS + 2] = makeNormalCell(1, 0);
  const def = definitionFromCells({
    id: 'cfg',
    name: '配置',
    cells,
    cols: COLS,
    rows: ROWS,
    mechanics: { initialSkills: { multiLaunch: 3, tripleSplit: 2 } },
  });
  const cfg = toRuntimeConfig(def);
  assert.equal(cfg.initialSkills?.multiLaunchCount, 3);
  assert.equal(cfg.initialSkills?.tripleSplitCount, 2);
  assert.equal(cfg.cells!.length, COLS * ROWS);
});

test('validateDefinition 拦截废件、放行合法件', () => {
  const cells = createEmptyCells(COLS, ROWS);
  cells[2 * COLS + 2] = makeNormalCell(1, 0);
  const def = definitionFromCells({ id: 'ok', name: '合法', cells, cols: COLS, rows: ROWS });
  assert.deepEqual(validateDefinition(def).errors, []);

  const bad = { ...def, version: 999 } as unknown as LevelDefinition;
  assert.ok(validateDefinition(bad).errors.some((e) => e.includes('version')));
  const noId = { ...def, id: '' };
  assert.ok(validateDefinition(noId).errors.some((e) => e.includes('id')));
});

test('serialize/parse 往返一致，坏 JSON 与废件抛错', () => {
  const cells = createEmptyCells(COLS, ROWS);
  cells[2 * COLS + 2] = makeSteelCell(7);
  const def = definitionFromCells({ id: 'json', name: '序列化', cells, cols: COLS, rows: ROWS });
  const text = serializeDefinition(def);
  const parsed = parseDefinition(text);
  assert.equal(parsed.id, def.id);
  assert.equal(parsed.rleGrid, def.rleGrid);
  assert.equal(parsed.version, SCHEMA_VERSION);
  assert.throws(() => parseDefinition('{not json'));
});

test('decodeRLE 容错：未知符号按空位并告警，不足补齐、超长截断', () => {
  const palette: Record<string, TilePaletteEntry> = {
    '.': { symbol: '.', role: 'EMPTY', hp: 0, color: '#000000' },
    R: { symbol: 'R', role: 'NORMAL', hp: 1, color: '#ef1d1d' },
  };
  // 一行只给 2 格，其余应补齐；含未知符号 Z。
  const rle = `RZ|${'R'.repeat(COLS + 3)}`;
  const { cells, warnings } = decodeRLE(rle, COLS, 2, palette);
  assert.equal(cells.length, COLS * 2);
  assert.equal(cells[0]!.role, 'NORMAL');
  assert.equal(cells[1]!.role, 'EMPTY'); // 未知 Z 按空
  assert.ok(warnings.some((w) => w.includes('未知符号')));
  assert.ok(warnings.some((w) => w.includes('补齐') || w.includes('截断')));
});
