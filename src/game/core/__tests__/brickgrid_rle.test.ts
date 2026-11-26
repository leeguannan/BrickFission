/**
 * Milestone 1 附加测试：砖块网格与 RLE 关卡格式
 *
 * 依据 `docs/03_LEVEL_TOOLING_AND_SCORING_SPEC.md` §1 的 RLE 契约：
 *   - 行以 `|` 分隔；`[数字]符号` 表示重复次数（数字可省略，省略为 1）；
 *   - `.` 表示空位，其余符号在 `palette` 中查表；
 *   - 解析必须补齐 / 截断到 `cols × rows`，并给出告警而不抛异常。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { BrickGrid, makeEmptyCell, makeNormalCell, makeSteelCell } from '../BrickGrid.js';
import type { RleSymbolSpec } from '../types.js';

const PALETTE: Record<string, RleSymbolSpec> = {
  R: { role: 'NORMAL', hp: 1, colorIndex: 0 },
  B: { role: 'NORMAL', hp: 2, colorIndex: 1 },
  S: { role: 'STEEL', colorIndex: 2 },
};

test('rle：解析数字重复与省略数字两种写法', () => {
  const result = BrickGrid.decodeRLE('3R|R|2B', 4, 3, PALETTE);

  assert.equal(result.cells.length, 12);
  assert.equal(result.cells[0]?.role, 'NORMAL');
  assert.equal(result.cells[0]?.hp, 1);
  assert.equal(result.cells[2]?.role, 'NORMAL', '3R 应占满前三格');
  assert.equal(result.cells[3]?.role, 'EMPTY', '第 4 格应为空');
  assert.equal(result.cells[4]?.role, 'NORMAL', '省略数字表示 1 次');
  assert.equal(result.cells[8]?.role, 'NORMAL');
  assert.equal(result.cells[8]?.hp, 2, 'B 的血量应来自 palette');
  assert.equal(result.cells[9]?.role, 'NORMAL');
  assert.equal(result.cells[10]?.role, 'EMPTY');
});

test('rle：`.` 表示空位，灰墙符号映射为 STEEL', () => {
  const result = BrickGrid.decodeRLE('.S.|..', 2, 2, PALETTE);
  assert.equal(result.cells[0]?.role, 'EMPTY');
  assert.equal(result.cells[1]?.role, 'STEEL');
  assert.equal(result.cells[3]?.role, 'EMPTY');
  assert.equal(result.cells[3]?.hp, 0);
});

test('rle：行数不足 / 超出行数时补齐或截断并给出告警', () => {
  const short = BrickGrid.decodeRLE('R|R', 3, 4, PALETTE);
  assert.equal(short.cells.length, 12);
  assert.equal(short.cells[8]?.role, 'EMPTY');
  assert.ok(short.warnings.length > 0, '缺少行应产生告警');

  const long = BrickGrid.decodeRLE('R|R|R|R|R', 3, 4, PALETTE);
  assert.equal(long.cells.length, 12);
  assert.ok(long.warnings.length > 0, '多余行应产生告警');
});

test('rle：未知符号按空位处理并告警，不抛异常', () => {
  const result = BrickGrid.decodeRLE('RX', 2, 1, PALETTE);
  assert.equal(result.cells[0]?.role, 'NORMAL');
  assert.equal(result.cells[1]?.role, 'EMPTY');
  assert.ok(result.warnings.some((w) => w.includes('未知符号')));
});

test('rle：encodeRLE 与 decodeRLE 互为逆运算', () => {
  const cells = [
    makeNormalCell(1, 0),
    makeNormalCell(1, 0),
    makeNormalCell(2, 1),
    makeEmptyCell(),
    makeSteelCell(3),
    makeSteelCell(3),
  ];
  const encoded = BrickGrid.encodeRLE(cells, 3, 2, PALETTE);
  assert.equal(encoded, '2RB|.2S');

  const decoded = BrickGrid.decodeRLE(encoded, 3, 2, PALETTE);
  assert.equal(decoded.cells[0]?.role, 'NORMAL');
  assert.equal(decoded.cells[1]?.role, 'NORMAL');
  assert.equal(decoded.cells[2]?.hp, 2);
  assert.equal(decoded.cells[3]?.role, 'EMPTY');
  assert.equal(decoded.cells[4]?.role, 'STEEL');
  assert.equal(decoded.cells[5]?.role, 'STEEL');
});

test('rle：全空网格编码为每行 `cols` 个空位（规范符号）', () => {
  const grid = new BrickGrid({ id: 'empty', cols: 6, rows: 2 });
  const encoded = BrickGrid.encodeRLE(
    Array.from({ length: 12 }, () => makeEmptyCell()),
    6,
    2,
  );
  assert.equal(encoded, '6.|6.');

  const decoded = BrickGrid.decodeRLE(encoded, 6, 2, PALETTE);
  assert.equal(decoded.cells.length, 12);
  assert.ok(decoded.cells.every((c) => c.role === 'EMPTY'));

  assert.equal(grid.remainingBreakable, 0);
  assert.equal(grid.totalBreakable, 0);
});

test('grid：网格几何自动适配居中，cellRect 与 colAt/rowAt 互洽', () => {
  const grid = new BrickGrid({ id: 'geo', cols: 42, rows: 38 });
  assert.equal(grid.cols, 42);
  assert.equal(grid.rows, 38);
  assert.ok(grid.cellSize > 0);
  assert.ok(grid.originX >= 0 && grid.originX + grid.width <= 720);

  const rect = grid.cellRect(21, 36);
  assert.equal(grid.colAt(rect.x + rect.width * 0.5), 21);
  assert.equal(grid.rowAt(rect.y + rect.height * 0.5), 36);
  assert.equal(grid.at(21, 36)?.role, 'EMPTY');
  assert.equal(grid.at(-1, 0), null);
  assert.equal(grid.at(0, 999), null);
});

test('grid：灰墙不计入可破坏砖，damage 对 STEEL 无效', () => {
  const grid = new BrickGrid({
    id: 'damage',
    cols: 42,
    rows: 38,
    cells: (() => {
      const list = new Array(42 * 38);
      for (let i = 0; i < list.length; i++) list[i] = { role: 'EMPTY', hp: 0, maxHp: 0, colorIndex: 0 };
      list[10 * 42 + 10] = makeNormalCell(1, 0);
      list[10 * 42 + 11] = makeSteelCell(2);
      return list;
    })(),
  });

  assert.equal(grid.totalBreakable, 1);
  assert.equal(grid.remainingBreakable, 1);

  const steel = grid.damage(11, 10, 9999);
  assert.equal(steel.damaged, false, '灰墙不可破坏');
  assert.equal(grid.at(11, 10)?.role, 'STEEL');

  const normal = grid.damage(10, 10, 1);
  assert.equal(normal.damaged, true);
  assert.equal(normal.destroyed, true);
  assert.equal(grid.remainingBreakable, 0);
  assert.equal(grid.remainingRatio, 0);
});
