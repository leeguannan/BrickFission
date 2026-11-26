/**
 * 《碎砖大裂变》(Brick Fission) — 砖块网格
 *
 * 职责（`docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md` §3.3 / `docs/00` §2）：
 *   - 行优先扁平网格数据结构，$O(1)$ 索引访问；
 *   - RLE 压缩网格解析（与 Milestone 3 的 `LevelSchema.rleGrid` 格式一致）；
 *   - 邻域查询 / 最近可破坏砖查询；
 *   - 砖块扣血与摧毁 bookkeeping（剩余可破坏砖计数）。
 *
 * 纯 TypeScript：禁止出现任何宿主环境 API。
 */

import {
  ARENA_HEIGHT,
  ARENA_PADDING_X,
  ARENA_TOP,
  ARENA_WIDTH,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  MAX_COLS,
  MAX_ROWS,
  MIN_COLS,
  MIN_ROWS,
} from './constants.js';
import type {
  BrickCell,
  BrickDamageResult,
  BrickRole,
  LevelRuntimeConfig,
  Rect,
  RleSymbolSpec,
} from './types.js';

/** RLE 中的空位符号。 */
export const RLE_EMPTY_SYMBOL = '.';

/** 角色是否为"可破坏"（计入过关目标，且可被子弹打碎）。 */
export function isBreakableRole(role: BrickRole): boolean {
  return role !== 'EMPTY' && role !== 'STEEL';
}

/** 构造空白格子。 */
export function makeEmptyCell(colorIndex = 0): BrickCell {
  return { role: 'EMPTY', hp: 0, maxHp: 0, colorIndex };
}

/** 构造普通砖块。 */
export function makeNormalCell(hp = 1, colorIndex = 0): BrickCell {
  return { role: 'NORMAL', hp, maxHp: hp, colorIndex };
}

/** 构造不可破坏钢墙。 */
export function makeSteelCell(colorIndex = 0): BrickCell {
  return { role: 'STEEL', hp: 9999, maxHp: 9999, colorIndex };
}

/** RLE 解析结果。 */
export interface RleDecodeResult {
  cells: BrickCell[];
  /** 解析过程中的告警（不抛异常，保持内核健壮）。 */
  warnings: string[];
}

export class BrickGrid {
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly originX: number;
  readonly originY: number;
  readonly width: number;
  readonly height: number;

  /** 行优先扁平格子数组（长度 = cols * rows）。 */
  private readonly cells: BrickCell[];

  /** 可破坏砖的紧凑索引列表（swap-remove 维护）。 */
  private readonly destructible: number[] = [];
  /** 格子索引 → destructible 列表中的位置（-1 表示不可破坏）。 */
  private readonly destructibleSlot: Int32Array;

  private remainingBreakableCount = 0;
  private readonly totalBreakableCount: number;

  /** 4 邻域查询的复用缓冲（零 GC）。 */
  private readonly neighborScratch: number[] = [];

  constructor(config: LevelRuntimeConfig) {
    this.cols = clampInt(config.cols, MIN_COLS, MAX_COLS, DEFAULT_COLS);
    this.rows = clampInt(config.rows, MIN_ROWS, MAX_ROWS, DEFAULT_ROWS);

    // 居中自动适配 cellSize：砖块矩阵完整落在砖块区内。
    this.cellSize = Math.min(ARENA_WIDTH / this.cols, ARENA_HEIGHT / this.rows);
    this.width = this.cols * this.cellSize;
    this.height = this.rows * this.cellSize;
    this.originX = ARENA_PADDING_X + (ARENA_WIDTH - this.width) / 2;
    this.originY = ARENA_TOP + (ARENA_HEIGHT - this.height) / 2;

    const total = this.cols * this.rows;
    this.cells = new Array<BrickCell>(total);
    this.destructibleSlot = new Int32Array(total).fill(-1);

    if (config.cells && config.cells.length > 0) {
      for (let i = 0; i < total; i++) {
        const src = config.cells[i];
        this.cells[i] = src ? { ...src } : makeEmptyCell();
      }
    } else if (config.rle) {
      const decoded = BrickGrid.decodeRLE(config.rle, this.cols, this.rows, config.palette ?? {});
      for (let i = 0; i < total; i++) {
        const src = decoded.cells[i];
        this.cells[i] = src ? { ...src } : makeEmptyCell();
      }
    } else {
      for (let i = 0; i < total; i++) {
        this.cells[i] = makeEmptyCell();
      }
    }

    // 建立可破坏砖索引表与计数。
    for (let i = 0; i < total; i++) {
      const cell = this.cells[i]!;
      if (isBreakableRole(cell.role)) {
        this.destructibleSlot[i] = this.destructible.length;
        this.destructible.push(i);
      }
    }
    this.remainingBreakableCount = this.destructible.length;
    this.totalBreakableCount = this.destructible.length;
  }

  /* ---------------------------------------------------------------- */
  /* 基础访问                                                          */
  /* ---------------------------------------------------------------- */

  /** 扁平索引。 */
  static flatIndex(col: number, row: number, cols: number): number {
    return row * cols + col;
  }

  /** 越界安全访问。 */
  at(col: number, row: number): BrickCell | null {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return this.cells[row * this.cols + col] ?? null;
  }

  /** 是否在网格范围内。 */
  contains(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  /** 格子对应的世界矩形。 */
  cellRect(col: number, row: number): Rect {
    return {
      x: this.originX + col * this.cellSize,
      y: this.originY + row * this.cellSize,
      width: this.cellSize,
      height: this.cellSize,
    };
  }

  /** 世界坐标 → 列索引（可能越界，调用方需自行判断）。 */
  colAt(x: number): number {
    return Math.floor((x - this.originX) / this.cellSize);
  }

  /** 世界坐标 → 行索引（可能越界，调用方需自行判断）。 */
  rowAt(y: number): number {
    return Math.floor((y - this.originY) / this.cellSize);
  }

  /** 剩余可破坏砖数量。 */
  get remainingBreakable(): number {
    return this.remainingBreakableCount;
  }

  /** 初始可破坏砖总数（用于计算剩余比例）。 */
  get totalBreakable(): number {
    return this.totalBreakableCount;
  }

  /** 剩余可破坏砖比例（0~1）。 */
  get remainingRatio(): number {
    if (this.totalBreakableCount <= 0) return 0;
    return this.remainingBreakableCount / this.totalBreakableCount;
  }

  /* ---------------------------------------------------------------- */
  /* 邻域查询                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * 4 邻域（上下左右）的格子索引，写入复用缓冲并返回。
   * 缓冲长度恒为 4，调用方需在消费完毕后立即使用。
   */
  neighbors4(col: number, row: number): readonly number[] {
    const scratch = this.neighborScratch;
    scratch.length = 0;
    const cols = this.cols;
    if (col > 0) scratch.push((row * cols + (col - 1)) | 0);
    if (col < cols - 1) scratch.push((row * cols + (col + 1)) | 0);
    if (row > 0) scratch.push(((row - 1) * cols + col) | 0);
    if (row < this.rows - 1) scratch.push(((row + 1) * cols + col) | 0);
    return scratch;
  }

  /**
   * 8 邻域中**可破坏**砖的索引，写入复用缓冲并返回。
   */
  destructibleNeighbors8(col: number, row: number): readonly number[] {
    const scratch = this.neighborScratch;
    scratch.length = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nc = col + dc;
        const nr = row + dr;
        if (!this.contains(nc, nr)) continue;
        const idx = nr * this.cols + nc;
        if ((this.destructibleSlot[idx] ?? -1) >= 0) scratch.push(idx);
      }
    }
    return scratch;
  }

  /**
   * 距离 (x, y) 最近的可破坏砖（残局软追踪用）。
   * 返回 null 表示场上已无可破坏砖。
   */
  nearestDestructible(x: number, y: number): { col: number; row: number; index: number; distance: number } | null {
    let bestIndex = -1;
    let bestDistSq = Number.POSITIVE_INFINITY;
    const list = this.destructible;
    for (let i = 0; i < list.length; i++) {
      const idx = list[i]!;
      const col = idx % this.cols;
      const row = (idx / this.cols) | 0;
      const rect = this.cellRect(col, row);
      const cx = rect.x + rect.width * 0.5;
      const cy = rect.y + rect.height * 0.5;
      const dx = cx - x;
      const dy = cy - y;
      const d = dx * dx + dy * dy;
      if (d < bestDistSq) {
        bestDistSq = d;
        bestIndex = idx;
      }
    }
    if (bestIndex < 0) return null;
    const col = bestIndex % this.cols;
    const row = (bestIndex / this.cols) | 0;
    return { col, row, index: bestIndex, distance: Math.sqrt(bestDistSq) };
  }

  /* ---------------------------------------------------------------- */
  /* 伤害与摧毁                                                        */
  /* ---------------------------------------------------------------- */

  /**
   * 对格子扣血。
   * - `EMPTY` / `STEEL`：不扣血；
   * - 扣血后 `hp <= 0`：置为 `EMPTY`，剩余可破坏砖计数 -1。
   */
  damage(col: number, row: number, amount: number): BrickDamageResult {
    const cell = this.at(col, row);
    if (!cell || cell.role === 'EMPTY' || cell.role === 'STEEL') {
      return { damaged: false, destroyed: false, hp: cell ? cell.hp : 0 };
    }
    const dmg = amount > 0 ? amount : 0;
    if (dmg === 0) return { damaged: false, destroyed: false, hp: cell.hp };

    cell.hp -= dmg;
    if (cell.hp <= 0) {
      cell.hp = 0;
      cell.role = 'EMPTY';
      this.remainingBreakableCount--;
      this.removeDestructible(row * this.cols + col);
      return { damaged: true, destroyed: true, hp: 0 };
    }
    return { damaged: true, destroyed: false, hp: cell.hp };
  }

  /** 从可破坏砖列表中移除（swap-remove，保持 O(1)）。 */
  private removeDestructible(flatIndex: number): void {
    const slot = this.destructibleSlot[flatIndex] ?? -1;
    if (slot < 0) return;
    const last = this.destructible.pop();
    if (last !== undefined) {
      this.destructible[slot] = last;
      this.destructibleSlot[last] = slot;
    }
    this.destructibleSlot[flatIndex] = -1;
  }

  /* ---------------------------------------------------------------- */
  /* RLE 编解码                                                        */
  /* ---------------------------------------------------------------- */

  /**
   * 解析 RLE 压缩网格。
   *
   * 格式（与 `docs/03_LEVEL_TOOLING_AND_SCORING_SPEC.md` §1 一致）：
   *   - 行之间以 `'|'` 分隔；
   *   - 每行由若干 `[数字]符号` 组成，数字为重复次数（省略时为 1，数字需 >= 1）；
   *   - `'.'` 表示空位，其余符号在 `palette` 中查表。
   *
   * 解析结果永远补齐到 `cols * rows`，多余部分截断并记入 warnings（内核不抛异常）。
   */
  static decodeRLE(
    rle: string,
    cols: number,
    rows: number,
    palette: Record<string, RleSymbolSpec>,
  ): RleDecodeResult {
    const warnings: string[] = [];
    const total = cols * rows;
    const cells: BrickCell[] = new Array<BrickCell>(total);
    for (let i = 0; i < total; i++) cells[i] = makeEmptyCell();

    const lines = rle.split('|');
    if (lines.length > rows) {
      warnings.push(`RLE 行数 ${lines.length} 超过 rows=${rows}，多余行已截断`);
    }

    const lineCount = Math.min(lines.length, rows);
    for (let r = 0; r < lineCount; r++) {
      const line = lines[r] ?? '';
      let col = 0;
      let i = 0;
      while (i < line.length && col < cols) {
        let count = 0;
        let hasDigit = false;
        while (i < line.length && isDigit(line.charCodeAt(i))) {
          hasDigit = true;
          count = count * 10 + (line.charCodeAt(i) - 48);
          i++;
        }
        if (i >= line.length) {
          if (hasDigit) warnings.push(`RLE 第 ${r} 行以数字结尾，已忽略`);
          break;
        }
        const symbol = line.charAt(i);
        i++;
        const repeat = hasDigit ? (count >= 1 ? count : 1) : 1;
        const spec = symbol === RLE_EMPTY_SYMBOL ? undefined : palette[symbol];
        if (symbol !== RLE_EMPTY_SYMBOL && !spec) {
          warnings.push(`RLE 第 ${r} 行出现未知符号 "${symbol}"，按空位处理`);
        }
        for (let k = 0; k < repeat && col < cols; k++) {
          const flat = r * cols + col;
          if (flat >= 0 && flat < total) {
            cells[flat] = spec
              ? {
                  role: spec.role,
                  hp: spec.hp ?? (spec.role === 'STEEL' ? 9999 : 1),
                  maxHp: spec.hp ?? (spec.role === 'STEEL' ? 9999 : 1),
                  colorIndex: spec.colorIndex ?? 0,
                }
              : makeEmptyCell();
          }
          col++;
        }
      }
      if (col < cols) {
        warnings.push(`RLE 第 ${r} 行仅填充 ${col}/${cols} 格，其余按空位补齐`);
      }
    }
    if (lines.length < rows) {
      warnings.push(`RLE 行数 ${lines.length} 少于 rows=${rows}，缺失行按空位补齐`);
    }

    return { cells, warnings };
  }

  /**
   * 将网格编码回 RLE（`decodeRLE` 的逆运算）。
   * 连续"角色 + 血量 + 颜色索引"相同的格子合并计数，计数为 1 时省略数字。
   *
   * 传入 `palette` 时按关卡调色板输出符号（与 `docs/03` 的关卡文件格式一致，
   * 与 `decodeRLE` 构成无损往返）；缺省时输出内置规范符号：
   * `.`=空、`S`=灰墙、`B`=炸弹、`P`=棱镜、`C`=核心、`1`~`4`=普通砖血量。
   */
  static encodeRLE(
    cells: readonly BrickCell[],
    cols: number,
    rows: number,
    palette?: Record<string, RleSymbolSpec>,
  ): string {
    const lookup = palette ? buildPaletteLookup(palette) : null;
    const parts: string[] = [];
    for (let r = 0; r < rows; r++) {
      let part = '';
      let runSymbol = '';
      let runCount = 0;
      const flush = (): void => {
        if (runCount === 0) return;
        part += runCount > 1 ? `${runCount}${runSymbol}` : runSymbol;
        runCount = 0;
        runSymbol = '';
      };
      for (let c = 0; c < cols; c++) {
        const cell = cells[r * cols + c];
        const symbol = cell ? symbolOfCell(cell, lookup) : RLE_EMPTY_SYMBOL;
        if (symbol === runSymbol) {
          runCount++;
        } else {
          flush();
          runSymbol = symbol;
          runCount = 1;
        }
      }
      flush();
      parts.push(part);
    }
    return parts.join('|');
  }
}

/* ------------------------------------------------------------------ */
/* 内部工具                                                            */
/* ------------------------------------------------------------------ */

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

/** 调色板符号查找表（精确匹配优先，退化为角色 + 血量匹配）。 */
interface PaletteLookup {
  exact: Map<string, string>;
  loose: Map<string, string>;
}

/** 建立调色板 → 符号的查找表。 */
function buildPaletteLookup(palette: Record<string, RleSymbolSpec>): PaletteLookup {
  const exact = new Map<string, string>();
  const loose = new Map<string, string>();
  for (const symbol of Object.keys(palette)) {
    const spec = palette[symbol];
    if (!spec) continue;
    const hp = spec.hp ?? (spec.role === 'STEEL' ? 9999 : 1);
    const colorIndex = spec.colorIndex ?? 0;
    const exactKey = `${spec.role}|${hp}|${colorIndex}`;
    if (!exact.has(exactKey)) exact.set(exactKey, symbol);
    const looseKey = `${spec.role}|${hp}`;
    if (!loose.has(looseKey)) loose.set(looseKey, symbol);
  }
  return { exact, loose };
}

/** 由格子属性反推编码符号（编码侧使用单字符，超出范围时退化为占位符）。 */
function symbolOfCell(cell: BrickCell, lookup: PaletteLookup | null): string {
  if (lookup) {
    const exact = lookup.exact.get(`${cell.role}|${cell.hp}|${cell.colorIndex}`);
    if (exact) return exact;
    const loose = lookup.loose.get(`${cell.role}|${cell.hp}`);
    if (loose) return loose;
  }
  if (cell.role === 'EMPTY') return RLE_EMPTY_SYMBOL;
  if (cell.role === 'STEEL') return 'S';
  if (cell.role === 'BOMB') return 'B';
  if (cell.role === 'PRISM') return 'P';
  if (cell.role === 'CORE') return 'C';
  // NORMAL 砖按血量编码：1 血 → '1'，2 血 → '2'，3 血 → '3'，更多 → '4'
  const hp = cell.hp <= 0 ? 1 : cell.hp;
  return String(Math.min(4, hp));
}
