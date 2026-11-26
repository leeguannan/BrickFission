/**
 * Level Studio 纯逻辑模型（无 DOM、无宿主 API，可在 node:test 中单测）。
 *
 * 负责网格编辑状态、笔刷写入与镜像对称；DOM 渲染与事件绑定见 StudioController。
 * 编辑器不是游戏主循环，笔刷按用户操作低频触发，允许就地替换单元格，
 * 不套用主循环的对象池红线。
 */
import { makeEmptyCell, makeNormalCell, makeSteelCell } from '../game/core/BrickGrid.js';
import type { BrickCell } from '../game/core/types.js';
import { definitionFromCells, type LevelDefinition, type LevelMechanicsConfig } from '../game/levels/LevelSchema.js';

/** 笔刷工具：普通砖 / 钢墙 / 橡皮。 */
export type StudioTool = 'NORMAL' | 'STEEL' | 'ERASE';

/** 镜像模式：不镜像 / 左右镜像 / 四象限镜像。 */
export type MirrorMode = 'NONE' | 'HORIZONTAL' | 'QUAD';

export interface StudioState {
  cols: number;
  rows: number;
  cells: BrickCell[];
  mirror: MirrorMode;
  /** 普通砖血量（1~4）。 */
  selectedHp: number;
  /** 普通砖颜色索引（0~7）。 */
  selectedColorIndex: number;
}

/** 新建空白编辑状态。 */
export function createStudioState(cols: number, rows: number): StudioState {
  const cells: BrickCell[] = new Array<BrickCell>(cols * rows);
  for (let i = 0; i < cells.length; i++) cells[i] = makeEmptyCell();
  return {
    cols,
    rows,
    cells,
    mirror: 'NONE',
    selectedHp: 1,
    selectedColorIndex: 0,
  };
}

/** 从已有单元格数组复制一份编辑状态（Studio 导入/试玩的入口）。 */
export function createStudioStateFromCells(
  cols: number,
  rows: number,
  source: readonly BrickCell[],
): StudioState {
  const state = createStudioState(cols, rows);
  const count = Math.min(state.cells.length, source.length);
  for (let i = 0; i < count; i++) {
    const src = source[i]!;
    // 浅拷贝即可：BrickCell 为扁平数据，编辑时整体替换而非就地改字段。
    state.cells[i] = { ...src };
  }
  return state;
}

/** 计算某格在当前镜像模式下需要同步写入的所有坐标（含自身），去重。 */
export function mirroredPositions(
  cols: number,
  rows: number,
  col: number,
  row: number,
  mirror: MirrorMode,
): Array<{ col: number; row: number }> {
  const positions: Array<{ col: number; row: number }> = [{ col, row }];
  const seen = new Set<number>([row * cols + col]);
  const push = (c: number, r: number): void => {
    if (c < 0 || c >= cols || r < 0 || r >= rows) return;
    const key = r * cols + c;
    if (seen.has(key)) return;
    seen.add(key);
    positions.push({ col: c, row: r });
  };
  if (mirror === 'HORIZONTAL' || mirror === 'QUAD') {
    push(cols - 1 - col, row);
  }
  if (mirror === 'QUAD') {
    push(col, rows - 1 - row);
    push(cols - 1 - col, rows - 1 - row);
  }
  return positions;
}

/** 按当前笔刷与镜像模式在 (col,row) 落笔（同步对称格）。 */
export function paintAt(state: StudioState, col: number, row: number, tool: StudioTool): void {
  if (col < 0 || col >= state.cols || row < 0 || row >= state.rows) return;
  const positions = mirroredPositions(state.cols, state.rows, col, row, state.mirror);
  for (const p of positions) {
    state.cells[p.row * state.cols + p.col] = createBrushCell(state, tool);
  }
}

function createBrushCell(state: StudioState, tool: StudioTool): BrickCell {
  if (tool === 'STEEL') return makeSteelCell();
  if (tool === 'ERASE') return makeEmptyCell();
  const hp = Math.max(1, Math.min(4, Math.round(state.selectedHp)));
  const colorIndex = Math.max(0, Math.min(7, Math.round(state.selectedColorIndex)));
  return makeNormalCell(hp, colorIndex);
}

/** 整阵清空。 */
export function clearGrid(state: StudioState): void {
  for (let i = 0; i < state.cells.length; i++) state.cells[i] = makeEmptyCell();
}

/** 统计当前可破坏砖与钢墙数量（供 HUD 显示）。 */
export function countTiles(state: StudioState): { breakable: number; steel: number } {
  let breakable = 0;
  let steel = 0;
  for (const cell of state.cells) {
    if (cell.role === 'STEEL') steel++;
    else if (cell.role !== 'EMPTY') breakable++;
  }
  return { breakable, steel };
}

/** 把编辑结果转成可序列化/可评分的关卡定义。 */
export function toDefinition(
  state: StudioState,
  id: string,
  name: string,
  mechanics?: LevelMechanicsConfig,
): LevelDefinition {
  return definitionFromCells({
    id,
    name,
    cells: state.cells,
    cols: state.cols,
    rows: state.rows,
    ...(mechanics ? { mechanics } : {}),
  });
}
