/**
 * Milestone 5 / Step 2 — Level Studio 特殊砖笔刷单测（纯逻辑，无 DOM）。
 *
 * 覆盖：
 *   - 新增「炸弹 / 棱镜 / 核心」三种笔刷写入正确的角色与血量；
 *   - 特殊砖与 `STANDARD_PALETTE` 的 M/L/K 完全对齐（保证 RLE 无损往返）；
 *   - 特殊砖计入可破坏砖统计、镜像模式同步对称格；
 *   - 橡皮可擦除特殊砖；导出 Definition 后 RLE 往返无损。
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { decodeRLE, STANDARD_PALETTE } from '../../game/levels/LevelSchema.js';
import {
  SPECIAL_BRICK_HP,
  countTiles,
  createStudioState,
  isSpecialTool,
  paintAt,
  toDefinition,
  type StudioTool,
} from '../studioModel.js';

const COLS = 10;
const ROWS = 8;

describe('step2 Studio 特殊砖笔刷', () => {
  test('三种特殊笔刷写入正确的角色与默认血量', () => {
    const state = createStudioState(COLS, ROWS);
    paintAt(state, 1, 1, 'BOMB');
    paintAt(state, 2, 1, 'PRISM');
    paintAt(state, 3, 1, 'CORE');

    const bomb = state.cells[1 * COLS + 1]!;
    const prism = state.cells[1 * COLS + 2]!;
    const core = state.cells[1 * COLS + 3]!;

    assert.equal(bomb.role, 'BOMB');
    assert.equal(bomb.hp, SPECIAL_BRICK_HP.BOMB);
    assert.equal(prism.role, 'PRISM');
    assert.equal(prism.hp, SPECIAL_BRICK_HP.PRISM);
    assert.equal(core.role, 'CORE');
    assert.equal(core.hp, SPECIAL_BRICK_HP.CORE);
    assert.equal(core.maxHp, SPECIAL_BRICK_HP.CORE);
  });

  test('特殊砖默认血量与 STANDARD_PALETTE 的 M/L/K 一致', () => {
    assert.equal(SPECIAL_BRICK_HP.BOMB, STANDARD_PALETTE.M!.hp);
    assert.equal(SPECIAL_BRICK_HP.PRISM, STANDARD_PALETTE.L!.hp);
    assert.equal(SPECIAL_BRICK_HP.CORE, STANDARD_PALETTE.K!.hp);
  });

  test('isSpecialTool 只认三种特殊笔刷', () => {
    assert.equal(isSpecialTool('BOMB'), true);
    assert.equal(isSpecialTool('PRISM'), true);
    assert.equal(isSpecialTool('CORE'), true);
    assert.equal(isSpecialTool('NORMAL'), false);
    assert.equal(isSpecialTool('STEEL'), false);
    assert.equal(isSpecialTool('ERASE'), false);
  });

  test('特殊砖计入可破坏砖统计（不计入钢墙）', () => {
    const state = createStudioState(COLS, ROWS);
    paintAt(state, 1, 1, 'BOMB');
    paintAt(state, 2, 1, 'PRISM');
    paintAt(state, 3, 1, 'CORE');
    paintAt(state, 4, 1, 'STEEL');

    const counts = countTiles(state);
    assert.equal(counts.breakable, 3, '三块特殊砖都算可破坏砖');
    assert.equal(counts.steel, 1);
  });

  test('镜像模式下特殊笔刷同步写入对称格', () => {
    const state = createStudioState(COLS, ROWS);
    state.mirror = 'HORIZONTAL';
    paintAt(state, 1, 2, 'BOMB');

    assert.equal(state.cells[2 * COLS + 1]!.role, 'BOMB');
    assert.equal(state.cells[2 * COLS + (COLS - 1 - 1)]!.role, 'BOMB');
  });

  test('橡皮可擦除特殊砖', () => {
    const state = createStudioState(COLS, ROWS);
    paintAt(state, 1, 1, 'CORE');
    assert.equal(state.cells[1 * COLS + 1]!.role, 'CORE');
    paintAt(state, 1, 1, 'ERASE');
    assert.equal(state.cells[1 * COLS + 1]!.role, 'EMPTY');
  });

  test('导出 Definition 后特殊砖 RLE 无损往返（使用 schema 合法最小维度 28×24）', () => {
    const W = 28;
    const H = 24;
    const state = createStudioState(W, H);
    const tools: StudioTool[] = ['BOMB', 'PRISM', 'CORE'];
    for (let i = 0; i < tools.length; i++) paintAt(state, 1 + i, 3, tools[i]!);

    const def = toDefinition(state, 'step2-studio', '特殊砖演示');
    const { cells, warnings } = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
    assert.deepEqual(warnings, []);

    assert.equal(cells[3 * W + 1]!.role, 'BOMB');
    assert.equal(cells[3 * W + 2]!.role, 'PRISM');
    assert.equal(cells[3 * W + 3]!.role, 'CORE');
    assert.equal(cells[3 * W + 3]!.hp, SPECIAL_BRICK_HP.CORE);
    // 特殊砖命中标准符号 M/L/K（colorIndex=0 与调色板一致）。
    assert.equal(def.palette.M!.role, 'BOMB');
    assert.equal(def.palette.L!.role, 'PRISM');
    assert.equal(def.palette.K!.role, 'CORE');
  });
});
