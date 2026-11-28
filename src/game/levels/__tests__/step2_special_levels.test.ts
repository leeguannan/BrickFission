/**
 * Milestone 5 / Step 2 — 特殊砖关卡 Schema 与评分单测。
 *
 * 覆盖：
 *   - STANDARD_PALETTE 预留的 M/L/K 特殊砖符号（炸弹 / 棱镜 / 核心）；
 *   - 特殊砖的 RLE 严格无损往返（含 dropTag）；
 *   - validateDefinition 对特殊砖血量的合法性校验；
 *   - toRuntimeConfig / serializeDefinition / parseDefinition 保留特殊砖语义；
 *   - DifficultyScorer 把特殊砖视为可破坏砖参与可达性与评分。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeNormalCell, makeSteelCell } from '../../core/BrickGrid.js';
import type { BrickCell } from '../../core/types.js';
import {
  STANDARD_PALETTE,
  SPECIAL_BRICK_ROLES,
  definitionFromCells,
  decodeRLE,
  isSpecialRole,
  parseDefinition,
  serializeDefinition,
  toRuntimeConfig,
  validateDefinition,
} from '../LevelSchema.js';
import { analyzeStructure, computeReachable, detectLaunchLineBlocked, scoreLevel } from '../DifficultyScorer.js';
import { createEmptyCells } from '../LevelGenerators.js';
import { STEP2_DEMO_LEVEL } from '../step2DemoLevel.js';

const COLS = 42;
const ROWS = 38;

/** 特殊砖夹具：BOMB 1 血、PRISM 1 血、CORE 5 血。 */
function specialCell(role: 'BOMB' | 'PRISM' | 'CORE', hp: number, colorIndex = 0): BrickCell {
  return { role, hp, maxHp: hp, colorIndex };
}

test('step2：STANDARD_PALETTE 预留炸弹 / 棱镜 / 核心符号', () => {
  assert.equal(STANDARD_PALETTE.M!.role, 'BOMB');
  assert.equal(STANDARD_PALETTE.L!.role, 'PRISM');
  assert.equal(STANDARD_PALETTE.K!.role, 'CORE');
  assert.equal(STANDARD_PALETTE.M!.hp, 1);
  assert.equal(STANDARD_PALETTE.L!.hp, 1);
  assert.equal(STANDARD_PALETTE.K!.hp, 5);
  for (const symbol of ['M', 'L', 'K']) {
    assert.ok(/^[.A-Za-z]$/.test(symbol), `特殊砖符号 "${symbol}" 必须是字母或空位`);
  }
});

test('step2：SPECIAL_BRICK_ROLES 与 isSpecialRole 语义一致', () => {
  assert.deepEqual([...SPECIAL_BRICK_ROLES], ['BOMB', 'PRISM', 'CORE']);
  assert.equal(isSpecialRole('BOMB'), true);
  assert.equal(isSpecialRole('PRISM'), true);
  assert.equal(isSpecialRole('CORE'), true);
  assert.equal(isSpecialRole('NORMAL'), false);
  assert.equal(isSpecialRole('STEEL'), false);
  assert.equal(isSpecialRole('EMPTY'), false);
});

test('step2：特殊砖 RLE 严格无损往返（BOMB / PRISM / CORE）', () => {
  const cells = createEmptyCells(COLS, ROWS);
  cells[5 * COLS + 5] = specialCell('BOMB', 1);
  cells[6 * COLS + 6] = specialCell('PRISM', 1);
  cells[7 * COLS + 7] = specialCell('CORE', 5);
  cells[8 * COLS + 8] = specialCell('CORE', 3); // 非标准血量 → 动态符号
  const def = definitionFromCells({ id: 'special', name: '特殊砖', cells, cols: COLS, rows: ROWS });

  const { cells: back, warnings } = decodeRLE(def.rleGrid, COLS, ROWS, def.palette);
  assert.deepEqual(warnings, []);
  assert.equal(back[5 * COLS + 5]!.role, 'BOMB');
  assert.equal(back[5 * COLS + 5]!.hp, 1);
  assert.equal(back[6 * COLS + 6]!.role, 'PRISM');
  assert.equal(back[6 * COLS + 6]!.hp, 1);
  assert.equal(back[7 * COLS + 7]!.role, 'CORE');
  assert.equal(back[7 * COLS + 7]!.hp, 5);
  assert.equal(back[8 * COLS + 8]!.role, 'CORE');
  assert.equal(back[8 * COLS + 8]!.hp, 3);
});

test('step2：特殊砖 dropTag 在 RLE 往返中无损保留', () => {
  const cells = createEmptyCells(COLS, ROWS);
  cells[4 * COLS + 4] = { ...specialCell('BOMB', 1), dropTag: 'reward_gem' };
  const def = definitionFromCells({ id: 'tag', name: '特殊砖掉落', cells, cols: COLS, rows: ROWS });
  const { cells: back } = decodeRLE(def.rleGrid, COLS, ROWS, def.palette);
  assert.equal(back[4 * COLS + 4]!.role, 'BOMB');
  assert.equal(back[4 * COLS + 4]!.dropTag, 'reward_gem');
});

test('step2：validateDefinition 拦截特殊砖 hp<1，放行合法特殊砖', () => {
  const cells = createEmptyCells(COLS, ROWS);
  cells[5 * COLS + 5] = specialCell('BOMB', 1);
  const def = definitionFromCells({ id: 'ok', name: '合法', cells, cols: COLS, rows: ROWS });
  assert.deepEqual(validateDefinition(def).errors, []);

  const broken = {
    ...def,
    palette: {
      ...def.palette,
      M: { symbol: 'M', role: 'BOMB' as const, hp: 0, color: '#111111' },
    },
  };
  assert.ok(
    validateDefinition(broken).errors.some((e) => e.includes('特殊砖') && e.includes('BOMB')),
    '特殊砖 hp=0 应报错',
  );
});

test('step2：toRuntimeConfig 保留特殊砖角色与血量', () => {
  const cells = createEmptyCells(COLS, ROWS);
  cells[5 * COLS + 5] = specialCell('BOMB', 1);
  cells[6 * COLS + 6] = specialCell('PRISM', 1);
  cells[7 * COLS + 7] = specialCell('CORE', 5);
  const def = definitionFromCells({ id: 'rt', name: '运行时', cells, cols: COLS, rows: ROWS });
  const cfg = toRuntimeConfig(def);
  assert.equal(cfg.cells![5 * COLS + 5]!.role, 'BOMB');
  assert.equal(cfg.cells![6 * COLS + 6]!.role, 'PRISM');
  assert.equal(cfg.cells![7 * COLS + 7]!.role, 'CORE');
  assert.equal(cfg.cells![7 * COLS + 7]!.hp, 5);
});

test('step2：serialize / parse 往返保留特殊砖调色板语义', () => {
  const cells = createEmptyCells(COLS, ROWS);
  cells[5 * COLS + 5] = specialCell('BOMB', 1);
  cells[6 * COLS + 6] = specialCell('PRISM', 1);
  const def = definitionFromCells({ id: 'json', name: '序列化', cells, cols: COLS, rows: ROWS });
  const parsed = parseDefinition(serializeDefinition(def));
  assert.equal(parsed.palette.M!.role, 'BOMB');
  assert.equal(parsed.palette.L!.role, 'PRISM');
  assert.equal(parsed.rleGrid, def.rleGrid);
  assert.deepEqual(validateDefinition(parsed).errors, []);
});

test('step2：DifficultyScorer 把特殊砖计入可破坏砖数量', () => {
  const cells = createEmptyCells(COLS, ROWS);
  cells[10 * COLS + 10] = specialCell('BOMB', 1);
  cells[10 * COLS + 11] = specialCell('PRISM', 1);
  cells[10 * COLS + 12] = specialCell('CORE', 5);
  cells[10 * COLS + 13] = makeNormalCell(1, 0);
  cells[10 * COLS + 14] = makeSteelCell(7);

  const analysis = analyzeStructure(cells, COLS, ROWS);
  assert.equal(analysis.breakableCount, 4, '3 块特殊砖 + 1 块普通砖');
  assert.equal(analysis.steelCount, 1);
  assert.equal(analysis.totalHp, 1 + 1 + 5 + 1);
});

test('step2：特殊砖不阻断可达性 BFS（与普通砖一致）', () => {
  const cells = createEmptyCells(COLS, ROWS);
  for (let c = 0; c < COLS; c++) cells[20 * COLS + c] = specialCell('BOMB', 1);
  const reachable = computeReachable(cells, COLS, ROWS);
  assert.equal(reachable[5 * COLS + 5], 1, '特殊砖墙不应被视为死区');
  assert.equal(reachable[20 * COLS + 21], 1);
});

test('step2：scoreLevel 可对含特殊砖关卡正常评分', () => {
  const cells = createEmptyCells(COLS, ROWS);
  for (let r = 4; r < 12; r++) {
    for (let c = 4; c < 38; c++) {
      const idx = r * COLS + c;
      if (r === 4) cells[idx] = specialCell('BOMB', 1);
      else if (r === 5 && c % 7 === 0) cells[idx] = specialCell('PRISM', 1);
      else if (r === 6 && c % 9 === 0) cells[idx] = specialCell('CORE', 5);
      else cells[idx] = makeNormalCell(1, (r + c) % 7);
    }
  }
  const def = definitionFromCells({ id: 'score', name: '评分', cells, cols: COLS, rows: ROWS });
  const result = scoreLevel(def, { simSeconds: 2 });
  assert.ok(Number.isFinite(result.totalScore), '总分必须是有限数');
  assert.ok(result.totalScore >= 0 && result.totalScore <= 100);
  assert.ok(result.breakableCount > 0);
});

test('step2：演示关卡通过 Schema 校验并同时包含三种特殊砖', () => {
  const result = validateDefinition(STEP2_DEMO_LEVEL);
  assert.deepEqual(result.errors, [], '演示关不应有校验错误');
  const roles = new Set(
    decodeRLE(STEP2_DEMO_LEVEL.rleGrid, STEP2_DEMO_LEVEL.cols, STEP2_DEMO_LEVEL.rows, STEP2_DEMO_LEVEL.palette)
      .cells.map((c) => c.role),
  );
  assert.ok(roles.has('BOMB'), '演示关应包含炸弹砖');
  assert.ok(roles.has('PRISM'), '演示关应包含棱镜砖');
  assert.ok(roles.has('CORE'), '演示关应包含核心砖');
});

test('step2：演示关卡无死区、发球线未被封死，且可正常评分', () => {
  const cells = decodeRLE(
    STEP2_DEMO_LEVEL.rleGrid,
    STEP2_DEMO_LEVEL.cols,
    STEP2_DEMO_LEVEL.rows,
    STEP2_DEMO_LEVEL.palette,
  ).cells;
  const analysis = analyzeStructure(cells, STEP2_DEMO_LEVEL.cols, STEP2_DEMO_LEVEL.rows);
  assert.equal(analysis.hasDeadZoneWarning, false, '演示关不应存在死区');
  assert.equal(analysis.deadZoneBrickCount, 0);
  assert.equal(detectLaunchLineBlocked(cells, STEP2_DEMO_LEVEL.cols, STEP2_DEMO_LEVEL.rows), false);
  assert.ok(analysis.breakableCount > 0);

  const score = scoreLevel(STEP2_DEMO_LEVEL, { simSeconds: 2 });
  assert.ok(Number.isFinite(score.totalScore));
});

test('step2：演示关卡运行时配置保留特殊砖语义', () => {
  const cfg = toRuntimeConfig(STEP2_DEMO_LEVEL);
  const roles = new Set(cfg.cells!.map((c) => c.role));
  assert.ok(roles.has('BOMB'));
  assert.ok(roles.has('PRISM'));
  assert.ok(roles.has('CORE'));
  const core = cfg.cells!.find((c) => c.role === 'CORE');
  assert.equal(core!.hp, 5);
});
