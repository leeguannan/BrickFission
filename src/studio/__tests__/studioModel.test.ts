import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createStudioState,
  createStudioStateFromCells,
  mirroredPositions,
  paintAt,
  clearGrid,
  countTiles,
  toDefinition,
  type StudioTool,
} from '../studioModel.js';
import { decodeRLE } from '../../game/levels/LevelSchema.js';
import { makeNormalCell, makeSteelCell } from '../../game/core/BrickGrid.js';

const COLS = 10;
const ROWS = 8;

describe('studioModel 纯逻辑模型', () => {
  test('createStudioState 初始化为全空且维度正确', () => {
    const s = createStudioState(COLS, ROWS);
    assert.equal(s.cells.length, COLS * ROWS);
    assert.equal(s.mirror, 'NONE');
    for (const cell of s.cells) assert.equal(cell.role, 'EMPTY');
  });

  test('NONE 模式落笔只改单格，NORMAL 带血量与颜色', () => {
    const s = createStudioState(COLS, ROWS);
    s.selectedHp = 3;
    s.selectedColorIndex = 2;
    paintAt(s, 4, 2, 'NORMAL');
    assert.equal(s.cells[2 * COLS + 4]!.role, 'NORMAL');
    assert.equal(s.cells[2 * COLS + 4]!.hp, 3);
    assert.equal(s.cells[2 * COLS + 4]!.colorIndex, 2);
    // 邻居不受影响
    assert.equal(s.cells[2 * COLS + 5]!.role, 'EMPTY');
  });

  test('STEEL 与 ERASE 笔刷正确', () => {
    const s = createStudioState(COLS, ROWS);
    paintAt(s, 1, 1, 'STEEL');
    assert.equal(s.cells[1 * COLS + 1]!.role, 'STEEL');
    paintAt(s, 1, 1, 'ERASE');
    assert.equal(s.cells[1 * COLS + 1]!.role, 'EMPTY');
  });

  test('越界落笔安全忽略', () => {
    const s = createStudioState(COLS, ROWS);
    assert.doesNotThrow(() => paintAt(s, -1, 0, 'NORMAL'));
    assert.doesNotThrow(() => paintAt(s, COLS, 0, 'NORMAL'));
    assert.doesNotThrow(() => paintAt(s, 0, ROWS, 'NORMAL'));
    assert.equal(countTiles(s).breakable, 0);
  });

  test('HORIZONTAL 镜像：落笔同步左右对称格', () => {
    const s = createStudioState(COLS, ROWS);
    s.mirror = 'HORIZONTAL';
    paintAt(s, 2, 3, 'NORMAL');
    // 左格 col2 与镜像 col7（cols-1-2=7）
    assert.equal(s.cells[3 * COLS + 2]!.role, 'NORMAL');
    assert.equal(s.cells[3 * COLS + 7]!.role, 'NORMAL');
  });

  test('QUAD 镜像：四象限同步', () => {
    const s = createStudioState(COLS, ROWS);
    s.mirror = 'QUAD';
    paintAt(s, 1, 1, 'NORMAL');
    const expected = [
      [1, 1],
      [8, 1],
      [1, 6],
      [8, 6],
    ];
    for (const [c, r] of expected) {
      assert.equal(s.cells[r! * COLS + c!]!.role, 'NORMAL', `(${c},${r}) 应被镜像写入`);
    }
  });

  test('mirroredPositions 去重：中轴格不重复', () => {
    // cols=10 无精确中轴；用奇数宽让中轴镜像落回自身
    const positions = mirroredPositions(11, 8, 5, 2, 'HORIZONTAL');
    assert.equal(positions.length, 1);
    const quad = mirroredPositions(11, 9, 5, 4, 'QUAD');
    assert.equal(quad.length, 1);
  });

  test('clearGrid 清空全部，countTiles 统计正确', () => {
    const s = createStudioState(COLS, ROWS);
    paintAt(s, 0, 0, 'NORMAL');
    paintAt(s, 1, 0, 'NORMAL');
    paintAt(s, 2, 0, 'STEEL');
    assert.deepEqual(countTiles(s), { breakable: 2, steel: 1 });
    clearGrid(s);
    assert.deepEqual(countTiles(s), { breakable: 0, steel: 0 });
  });

  test('createStudioStateFromCells 复制且与源隔离', () => {
    const source = Array.from({ length: COLS * ROWS }, () => makeNormalCell(1, 0));
    const s = createStudioStateFromCells(COLS, ROWS, source);
    assert.equal(s.cells[0]!.role, 'NORMAL');
    // 修改副本不影响源
    paintAt(s, 0, 0, 'ERASE');
    assert.equal(source[0]!.role, 'NORMAL');
    assert.equal(s.cells[0]!.role, 'EMPTY');
  });

  test('toDefinition 产出的定义可 RLE 无损往返（使用 schema 合法最小维度 28×24）', () => {
    const W = 28;
    const H = 24;
    const s = createStudioState(W, H);
    s.selectedHp = 2;
    paintAt(s, 0, 0, 'NORMAL');
    s.mirror = 'HORIZONTAL';
    paintAt(s, 1, 1, 'STEEL'); // 镜像到 col26
    const def = toDefinition(s, 'studio-1', '工作室关卡');
    assert.equal(def.id, 'studio-1');
    assert.equal(def.cols, W);
    assert.equal(def.rows, H);
    const { cells: back, warnings } = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
    assert.equal(warnings.length, 0);
    for (let i = 0; i < s.cells.length; i++) {
      assert.equal(back[i]!.role, s.cells[i]!.role, `格 ${i} role 不一致`);
      if (s.cells[i]!.role !== 'EMPTY') {
        assert.equal(back[i]!.hp, s.cells[i]!.hp, `格 ${i} hp 不一致`);
      }
    }
    // 镜像落点校验
    assert.equal(s.cells[1 * W + 1]!.role, 'STEEL');
    assert.equal(s.cells[1 * W + (W - 2)]!.role, 'STEEL');
  });

  test('笔刷血量/颜色被夹到合法区间', () => {
    const s = createStudioState(COLS, ROWS);
    s.selectedHp = 99;
    s.selectedColorIndex = -5;
    paintAt(s, 0, 0, 'NORMAL' as StudioTool);
    assert.equal(s.cells[0]!.hp, 4);
    assert.equal(s.cells[0]!.colorIndex, 0);
    // 钢墙不受血量/颜色影响（col1,row0 的线性索引为 1）
    paintAt(s, 1, 0, 'STEEL');
    assert.equal(s.cells[1]!.role, 'STEEL');
    assert.equal(makeSteelCell().hp, 9999);
  });
});
