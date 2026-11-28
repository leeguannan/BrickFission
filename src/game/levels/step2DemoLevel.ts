/**
 * Milestone 5 / Step 2 — 特殊砖演示关卡模板。
 *
 * 用途：在不改动 V1 内置 20 关（`BUILTIN_LEVEL_DATA`）的前提下，
 * 提供一个确定性的「炸弹 / 棱镜 / 核心」三合一演示关：
 *   - Level Studio 可一键载入并试玩；
 *   - 单元测试以其为夹具验证特殊砖的 Schema / 评分 / 物理行为。
 *
 * 布局原则：
 *   - 底部 6 行为空（发球与挡板操作区，不封死发球线）；
 *   - 三层特殊砖居中成组，便于肉眼分辨三种砖的行为差异；
 *   - 少量 STEEL 钢墙做视觉锚点（不做封闭盒，避免死区）。
 */
import { makeNormalCell, makeSteelCell } from '../core/BrickGrid.js';
import type { BrickCell } from '../core/types.js';
import { definitionFromCells, type LevelDefinition } from './LevelSchema.js';

const COLS = 42;
const ROWS = 38;

function emptyCells(): BrickCell[] {
  const cells = new Array<BrickCell>(COLS * ROWS);
  for (let i = 0; i < cells.length; i++) {
    cells[i] = { role: 'EMPTY', hp: 0, maxHp: 0, colorIndex: 0 };
  }
  return cells;
}

function special(role: 'BOMB' | 'PRISM' | 'CORE', hp: number): BrickCell {
  return { role, hp, maxHp: hp, colorIndex: 0 };
}

/**
 * 构建 Step 2 演示关的 Definition（确定性，无随机）。
 */
export function buildStep2DemoDefinition(): LevelDefinition {
  const cells = emptyCells();
  const at = (col: number, row: number): number => row * COLS + col;

  // 第 2 行：炸弹砖排成上下两段，中间留出缺口便于观察冲击波。
  for (let col = 2; col <= 16; col++) cells[at(col, 2)] = special('BOMB', 1);
  for (let col = 25; col <= 39; col++) cells[at(col, 2)] = special('BOMB', 1);

  // 第 4 行：棱镜砖（击碎时分裂子球）。
  for (let col = 4; col <= 38; col += 6) cells[at(col, 4)] = special('PRISM', 1);

  // 第 6 行：核心砖（发放技能充能 + 穿透）。
  for (let col = 18; col <= 23; col++) cells[at(col, 6)] = special('CORE', 5);

  // 第 8~12 行：普通砖背景（七色轮转）。
  for (let row = 8; row <= 12; row++) {
    for (let col = 2; col <= 39; col++) {
      if ((col + row) % 5 === 0) continue; // 挖出透气孔，避免整片死板
      cells[at(col, row)] = makeNormalCell(1, (col * 3 + row) % 7);
    }
  }

  // 两根钢墙立柱（视觉锚点，不封闭）。
  for (let row = 8; row <= 14; row++) {
    cells[at(1, row)] = makeSteelCell(7);
    cells[at(40, row)] = makeSteelCell(7);
  }

  return definitionFromCells({
    id: 'step2-demo',
    name: 'Step2 特殊砖演示',
    cells,
    cols: COLS,
    rows: ROWS,
  });
}

/** Step 2 演示关（模块加载期构建一次，只读使用）。 */
export const STEP2_DEMO_LEVEL: LevelDefinition = buildStep2DemoDefinition();
