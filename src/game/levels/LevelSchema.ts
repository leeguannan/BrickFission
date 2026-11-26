/**
 * 《碎砖大裂变》(Brick Fission) — 关卡数据 Schema（Milestone 3，docs/03 §1）
 *
 * 数据形态：元数据 + 调色板字典（单字符符号 → 砖块属性）+ RLE 压缩网格。
 * 本模块同时承担：
 *   - 严格无损的 RLE 编解码（含多血砖与 dropTag，弥补 core RleSymbolSpec 不携带 dropTag 的局限）；
 *   - LevelDefinition 的构造、校验、JSON 序列化/反序列化；
 *   - 到 core `LevelRuntimeConfig` 的桥接（走 cells 路径，BrickCell.dropTag 完整保留）。
 *
 * 纯 TypeScript：禁止出现任何宿主环境 API（浏览器全局对象、Canvas/音频上下文、
 * 动画帧调度、前端框架运行时、小游戏宿主等），可在 Node 单测中直接 import。
 */
import {
  DEFAULT_BRICK_COLORS,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  MAX_COLS,
  MAX_ROWS,
  MIN_COLS,
  MIN_ROWS,
} from '../core/constants.js';
import { RLE_EMPTY_SYMBOL } from '../core/BrickGrid.js';
import type {
  BrickCell,
  BrickRole,
  LevelRuntimeConfig,
} from '../core/types.js';

/** Schema 版本号（Step 2~4 只允许追加可选字段，不得破坏本版本语义）。 */
export const SCHEMA_VERSION = 1 as const;

/* ------------------------------------------------------------------ */
/* §1 数据契约（docs/03 §1）                                            */
/* ------------------------------------------------------------------ */

/** 调色板字典项：单字符符号到砖块属性的映射。 */
export interface TilePaletteEntry {
  /** 单字符编码，仅限字母与空位 '.'，如 'R', 'G', 'S', 'D'（数字会与 RLE 计数前缀冲突，禁用）。 */
  symbol: string;
  role: BrickRole;
  /** 耐久度（NORMAL 可为 1,2,3...；STEEL 固定 9999；EMPTY 为 0）。 */
  hp: number;
  /** 十六进制填充色，如 '#ef1d1d'。 */
  color: string;
  /** 预留：击碎掉落标识（如 'skill_blue' | 'skill_orange' | 'buff_3choose1'）。 */
  dropTag?: string;
}

/** 关卡机制配置（含 Step 2~4 预留字段，V1 仅消费 defaultBallSpeed/initialSkills）。 */
export interface LevelMechanicsConfig {
  defaultBallSpeed?: number;
  initialSkills?: { multiLaunch: number; tripleSplit: number };
  // --- 预留 Step 2~4 扩展字段 ---
  rotationSpeedDegPerSec?: number; // 预留：如齿轮阵自转
  bossMode?: boolean; // 预留：Boss 像素体
  roguePoolId?: string; // 预留：三选一词条池
}

/** 难度评级。 */
export type DifficultyTier = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

/** 难度评分报告（DifficultyScorer 产出后回写 Definition.difficultyScore）。 */
export interface DifficultyReport {
  /** 0~100 综合难度分。 */
  totalScore: number;
  tier: DifficultyTier;
  /** 可破坏砖块数。 */
  breakableCount: number;
  /** 钢墙遮挡比（位于可碎砖下方的钢墙占比，0~1）。 */
  steelOcclusionRatio: number;
  /** 模拟前 20 秒平均清砖率（0~1）。 */
  simBreakRate20s: number;
  /** 是否存在封闭死区或默认发球线被钢墙封死（废关警告）。 */
  hasDeadZoneWarning: boolean;
}

/** 完整关卡定义（序列化与内置关卡库的唯一载体）。 */
export interface LevelDefinition {
  version: 1;
  id: string;
  name: string;
  /** 建议范围 28~48，默认 42。 */
  cols: number;
  /** 建议范围 24~42，默认 36。 */
  rows: number;
  palette: Record<string, TilePaletteEntry>;
  /** RLE 压缩网格，行间以 '|' 分隔，单格前带数字表示重复次数。 */
  rleGrid: string;
  difficultyScore?: DifficultyReport;
  mechanics?: LevelMechanicsConfig;
}

/* ------------------------------------------------------------------ */
/* 标准调色板与颜色工具                                                  */
/* ------------------------------------------------------------------ */

/**
 * 标准调色板：覆盖 V1 全部物理角色（EMPTY/NORMAL/STEEL）与 Step2~3 预留角色。
 * 动态生成的额外 (role,hp,color,dropTag) 组合由 `definitionFromCells` 自动分配新符号。
 */
export const STANDARD_PALETTE: Readonly<Record<string, TilePaletteEntry>> = {
  '.': { symbol: '.', role: 'EMPTY', hp: 0, color: '#000000' },
  S: { symbol: 'S', role: 'STEEL', hp: 9999, color: '#9aa4b2' },
  // 七色 1 血普通砖（颜色与 core DEFAULT_BRICK_COLORS 索引 0~6 对齐）
  R: { symbol: 'R', role: 'NORMAL', hp: 1, color: '#ef1d1d' },
  G: { symbol: 'G', role: 'NORMAL', hp: 1, color: '#41b06e' },
  B: { symbol: 'B', role: 'NORMAL', hp: 1, color: '#2f6fed' },
  Y: { symbol: 'Y', role: 'NORMAL', hp: 1, color: '#f4b740' },
  P: { symbol: 'P', role: 'NORMAL', hp: 1, color: '#b06ab3' },
  C: { symbol: 'C', role: 'NORMAL', hp: 1, color: '#4ecdc4' },
  O: { symbol: 'O', role: 'NORMAL', hp: 1, color: '#ff7b54' },
  // 多血砖（符号刻意只用字母：数字会与 RLE 的十进制 run 计数前缀词法冲突，
  // 裸数字符号在 count=1 省略时会被解码器误吞为计数，导致整行错位。D=2血/E=3血/F=4血）
  D: { symbol: 'D', role: 'NORMAL', hp: 2, color: '#f4b740' },
  E: { symbol: 'E', role: 'NORMAL', hp: 3, color: '#b06ab3' },
  F: { symbol: 'F', role: 'NORMAL', hp: 4, color: '#ff7b54' },
  // Step2~3 预留角色（V1 物理按 NORMAL 语义处理前先保留 Schema 表达力）
  M: { symbol: 'M', role: 'BOMB', hp: 1, color: '#111111' },
  L: { symbol: 'L', role: 'PRISM', hp: 1, color: '#7dd3fc' },
  K: { symbol: 'K', role: 'CORE', hp: 5, color: '#f59e0b' },
};

/**
 * 动态符号分配池（单字符，排除空位符号 '.'）。
 * 仅使用字母：数字符号会与 RLE run 计数前缀冲突（见 STANDARD_PALETTE 多血砖注释），
 * 52 个字母足以覆盖 (role,hp,colorIndex,dropTag) 的实际组合上限（NORMAL 4 血量 × 8 色 + 特殊角色）。
 */
const DYNAMIC_SYMBOL_POOL = (() => {
  const pool: string[] = [];
  for (let code = 65; code <= 90; code++) pool.push(String.fromCharCode(code)); // A-Z
  for (let code = 97; code <= 122; code++) pool.push(String.fromCharCode(code)); // a-z
  return pool;
})();

/** 颜色字符串归一化（小写、去空白），失败返回空串。 */
export function normalizeHexColor(color: string): string {
  if (typeof color !== 'string') return '';
  const trimmed = color.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(trimmed) ? trimmed : '';
}

/** 十六进制颜色 → core 调色板索引（未知颜色回退：钢墙 7，其余 0）。 */
export function colorIndexOf(color: string, role: BrickRole): number {
  const normalized = normalizeHexColor(color);
  if (!normalized) return role === 'STEEL' ? 7 : 0;
  const index = DEFAULT_BRICK_COLORS.indexOf(normalized);
  if (index >= 0) return index;
  return role === 'STEEL' ? 7 : 0;
}

/** 维度夹取到 docs/03 建议范围。 */
export function clampDimension(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

/* ------------------------------------------------------------------ */
/* 格子 ↔ 调色板项                                                      */
/* ------------------------------------------------------------------ */

/** 调色板项 → 运行时格子（STEEL 血量强制 9999，EMPTY 血量强制 0）。 */
export function cellFromPaletteEntry(entry: TilePaletteEntry): BrickCell {
  const colorIndex = colorIndexOf(entry.color, entry.role);
  if (entry.role === 'EMPTY') {
    return { role: 'EMPTY', hp: 0, maxHp: 0, colorIndex };
  }
  if (entry.role === 'STEEL') {
    const cell: BrickCell = { role: 'STEEL', hp: 9999, maxHp: 9999, colorIndex: 7 };
    if (entry.dropTag) cell.dropTag = entry.dropTag;
    return cell;
  }
  const hp = Number.isFinite(entry.hp) && entry.hp >= 1 ? Math.round(entry.hp) : 1;
  const cell: BrickCell = { role: entry.role, hp, maxHp: hp, colorIndex };
  if (entry.dropTag) cell.dropTag = entry.dropTag;
  return cell;
}

/** 格子属性键：同键格子共享一个 RLE 符号（dropTag 参与区分，保证无损）。 */
function cellKey(cell: BrickCell): string {
  return `${cell.role}|${cell.hp}|${cell.colorIndex}|${cell.dropTag ?? ''}`;
}

/** 调色板项属性键（与 cellKey 同构）。 */
function entryKey(entry: TilePaletteEntry): string {
  return `${entry.role}|${entry.hp}|${colorIndexOf(entry.color, entry.role)}|${entry.dropTag ?? ''}`;
}

/* ------------------------------------------------------------------ */
/* RLE 编解码（严格无损）                                                */
/* ------------------------------------------------------------------ */

/**
 * 将扁平格子数组编码为 RLE 字符串。
 *
 * 格式（与 core `BrickGrid.encodeRLE` 同构）：
 *   - 行之间以 `'|'` 分隔，跨行 run 不合并；
 *   - 每行由若干 `[数字]符号` 组成，数字为重复次数（=1 时省略，数字必须 >=1）；
 *   - 连续同符号格子合并计数。
 *
 * `palette` 必须覆盖网格中出现的每一种格子属性，否则抛错（杜绝静默丢属性）。
 */
export function encodeRLE(
  cells: readonly BrickCell[],
  cols: number,
  rows: number,
  palette: Record<string, TilePaletteEntry>,
): string {
  const keyToSymbol = new Map<string, string>();
  for (const symbol of Object.keys(palette)) {
    const entry = palette[symbol];
    if (!entry) continue;
    if (symbol.length !== 1) throw new Error(`RLE 调色板符号必须为单字符，收到 "${symbol}"`);
    if (isDigit(symbol.charCodeAt(0))) {
      throw new Error(
        `RLE 调色板符号 "${symbol}" 不能为数字：数字在 RLE 词法中是 run 计数前缀，` +
          '裸数字符号在 count=1 省略时会被误吞为计数导致整行错位，请改用字母符号',
      );
    }
    keyToSymbol.set(entryKey(entry), symbol);
  }

  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    let runSymbol = '';
    let runCount = 0;
    const flush = (): void => {
      if (runCount === 0) return;
      line += runCount > 1 ? `${runCount}${runSymbol}` : runSymbol;
      runCount = 0;
      runSymbol = '';
    };
    for (let c = 0; c < cols; c++) {
      const cell = cells[r * cols + c];
      if (!cell) throw new Error(`RLE 编码网格缺格：(col=${c}, row=${r})`);
      const symbol = keyToSymbol.get(cellKey(cell));
      if (symbol === undefined) {
        throw new Error(
          `RLE 调色板未覆盖格子属性 ${cellKey(cell)}（col=${c}, row=${r}），请先用 definitionFromCells 构造完整调色板`,
        );
      }
      if (symbol === runSymbol) {
        runCount++;
      } else {
        flush();
        runSymbol = symbol;
        runCount = 1;
      }
    }
    flush();
    lines.push(line);
  }
  return lines.join('|');
}

/** RLE 解码结果。 */
export interface LevelRleDecodeResult {
  cells: BrickCell[];
  /** 容错告警（不抛异常：未知符号按空位、不足补齐、超长截断）。 */
  warnings: string[];
}

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

/**
 * 解析 RLE 字符串为扁平格子数组（`encodeRLE` 的逆运算）。
 *
 * 容错策略与 core `BrickGrid.decodeRLE` 对齐：
 *   - 未知符号 → 告警并按空位处理；
 *   - 行数不足/单行格数不足 → 空位补齐；超长 → 截断；
 *   - 数字必须 >=1，`0S` 这类按重复 1 处理并由调用方通过 warnings 感知。
 */
export function decodeRLE(
  rle: string,
  cols: number,
  rows: number,
  palette: Record<string, TilePaletteEntry>,
): LevelRleDecodeResult {
  const warnings: string[] = [];
  const total = cols * rows;
  const cells: BrickCell[] = new Array<BrickCell>(total);
  const emptyEntry = palette[RLE_EMPTY_SYMBOL];
  const emptyCell: BrickCell = emptyEntry
    ? cellFromPaletteEntry(emptyEntry)
    : { role: 'EMPTY', hp: 0, maxHp: 0, colorIndex: 0 };
  for (let i = 0; i < total; i++) cells[i] = { ...emptyCell };

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
      const entry = symbol === RLE_EMPTY_SYMBOL ? undefined : palette[symbol];
      if (symbol !== RLE_EMPTY_SYMBOL && !entry) {
        warnings.push(`RLE 第 ${r} 行出现未知符号 "${symbol}"，按空位处理`);
      }
      const parsed: BrickCell = entry ? cellFromPaletteEntry(entry) : { ...emptyCell };
      for (let k = 0; k < repeat && col < cols; k++) {
        const flat = r * cols + col;
        if (flat >= 0 && flat < total) cells[flat] = { ...parsed };
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

/* ------------------------------------------------------------------ */
/* Definition 构造 / 桥接 / 校验 / 序列化                                */
/* ------------------------------------------------------------------ */

/** definitionFromCells 的入参。 */
export interface BuildDefinitionOptions {
  id: string;
  name: string;
  cells: readonly BrickCell[];
  cols: number;
  rows: number;
  mechanics?: LevelMechanicsConfig;
  difficultyScore?: DifficultyReport;
}

/**
 * 从扁平格子数组构造完整 Definition：
 *   - 以标准调色板为基础，对未覆盖的属性组合自动分配单字符符号；
 *   - 自动夹取维度到建议范围；
 *   - 调 encodeRLE 产出压缩网格。
 */
export function definitionFromCells(options: BuildDefinitionOptions): LevelDefinition {
  const cols = clampDimension(options.cols, MIN_COLS, MAX_COLS, DEFAULT_COLS);
  const rows = clampDimension(options.rows, MIN_ROWS, MAX_ROWS, DEFAULT_ROWS);
  const total = cols * rows;
  if (options.cells.length < total) {
    throw new Error(`definitionFromCells 格子数 ${options.cells.length} < cols*rows=${total}`);
  }

  const palette: Record<string, TilePaletteEntry> = {};
  for (const symbol of Object.keys(STANDARD_PALETTE)) {
    const entry = STANDARD_PALETTE[symbol]!;
    palette[symbol] = { ...entry };
  }

  const usedSymbols = new Set<string>(Object.keys(palette));
  const knownKeys = new Set<string>();
  for (const symbol of Object.keys(palette)) {
    knownKeys.add(entryKey(palette[symbol]!));
  }
  let dynamicCursor = 0;

  for (let i = 0; i < total; i++) {
    const cell = options.cells[i]!;
    const key = cellKey(cell);
    if (knownKeys.has(key)) continue;
    // 分配下一个未占用符号
    while (dynamicCursor < DYNAMIC_SYMBOL_POOL.length && usedSymbols.has(DYNAMIC_SYMBOL_POOL[dynamicCursor]!)) {
      dynamicCursor++;
    }
    if (dynamicCursor >= DYNAMIC_SYMBOL_POOL.length) {
      throw new Error('调色板符号池（62 个单字符）已耗尽，无法表达当前关卡的砖块种类');
    }
    const symbol = DYNAMIC_SYMBOL_POOL[dynamicCursor]!;
    dynamicCursor++;
    usedSymbols.add(symbol);
    const color = DEFAULT_BRICK_COLORS[cell.colorIndex] ?? '#9aa4b2';
    const entry: TilePaletteEntry = {
      symbol,
      role: cell.role,
      hp: cell.hp,
      color,
    };
    if (cell.dropTag) entry.dropTag = cell.dropTag;
    palette[symbol] = entry;
    knownKeys.add(key);
  }

  const rleGrid = encodeRLE(options.cells, cols, rows, palette);
  const def: LevelDefinition = {
    version: SCHEMA_VERSION,
    id: options.id,
    name: options.name,
    cols,
    rows,
    palette,
    rleGrid,
  };
  if (options.mechanics) def.mechanics = options.mechanics;
  if (options.difficultyScore) def.difficultyScore = options.difficultyScore;
  return def;
}

/**
 * Definition → core 运行时配置。
 * 走 cells 路径（而非 rle+palette）以完整保留 BrickCell.dropTag，
 * 并把 docs/03 的 mechanics.initialSkills 映射为 core 的 SkillInventory 字段名。
 */
export function toRuntimeConfig(def: LevelDefinitionConfigLike): LevelRuntimeConfig {
  const { cells } = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
  const config: LevelRuntimeConfig = {
    id: def.id,
    name: def.name,
    cols: def.cols,
    rows: def.rows,
    cells,
  };
  const skills = def.mechanics?.initialSkills;
  if (skills) {
    config.initialSkills = {
      multiLaunchCount: skills.multiLaunch,
      tripleSplitCount: skills.tripleSplit,
    };
  }
  return config;
}

/** 桥接函数接受的最小 Definition 形状（便于测试与局部构造）。 */
interface LevelDefinitionConfigLike {
  id: string;
  name: string;
  cols: number;
  rows: number;
  palette: Record<string, TilePaletteEntry>;
  rleGrid: string;
  mechanics?: LevelMechanicsConfig;
}

/** 校验结果。 */
export interface DefinitionValidation {
  errors: string[];
  warnings: string[];
}

/** 全量校验 Definition（errors 非空即废件，禁止入库）。 */
export function validateDefinition(def: LevelDefinition): DefinitionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!def || typeof def !== 'object') {
    return { errors: ['Definition 不是对象'], warnings };
  }
  if (def.version !== SCHEMA_VERSION) errors.push(`version 必须为 ${SCHEMA_VERSION}，收到 ${String(def.version)}`);
  if (!def.id || typeof def.id !== 'string') errors.push('id 必须为非空字符串');
  if (!def.name || typeof def.name !== 'string') errors.push('name 必须为非空字符串');

  if (!Number.isFinite(def.cols) || def.cols < MIN_COLS || def.cols > MAX_COLS) {
    errors.push(`cols 必须在 ${MIN_COLS}~${MAX_COLS} 之间，收到 ${String(def.cols)}`);
  }
  if (!Number.isFinite(def.rows) || def.rows < MIN_ROWS || def.rows > MAX_ROWS) {
    errors.push(`rows 必须在 ${MIN_ROWS}~${MAX_ROWS} 之间，收到 ${String(def.rows)}`);
  }

  if (!def.palette || typeof def.palette !== 'object') {
    errors.push('palette 缺失或不是对象');
  } else {
    if (!def.palette[RLE_EMPTY_SYMBOL]) errors.push('palette 必须包含空位符号 "."');
    const seenKeys = new Set<string>();
    for (const symbol of Object.keys(def.palette)) {
      const entry = def.palette[symbol]!;
      if (symbol.length !== 1) errors.push(`调色板符号必须单字符，收到 "${symbol}"`);
      if (entry.symbol !== symbol) errors.push(`调色板键 "${symbol}" 与 entry.symbol "${entry.symbol}" 不一致`);
      const key = entryKey(entry);
      if (seenKeys.has(key)) errors.push(`调色板存在重复砖块属性：${key}`);
      seenKeys.add(key);
      if (entry.role === 'STEEL' && entry.hp !== 9999) {
        warnings.push(`符号 "${symbol}" 为 STEEL 但 hp=${entry.hp}，解码时会强制为 9999`);
      }
    }
  }

  if (typeof def.rleGrid !== 'string' || def.rleGrid.length === 0) {
    errors.push('rleGrid 缺失或为空字符串');
  } else if (!errors.some((e) => e.startsWith('cols') || e.startsWith('rows') || e.startsWith('palette'))) {
    const decoded = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
    warnings.push(...decoded.warnings);
    let breakable = 0;
    for (const cell of decoded.cells) {
      if (cell.role !== 'EMPTY' && cell.role !== 'STEEL') breakable++;
    }
    if (breakable === 0) warnings.push('关卡不含任何可破坏砖块，无法形成有效回合');
  }

  if (def.difficultyScore) {
    const score = def.difficultyScore;
    if (!Number.isFinite(score.totalScore) || score.totalScore < 0 || score.totalScore > 100) {
      errors.push('difficultyScore.totalScore 必须在 0~100 之间');
    }
  }

  return { errors, warnings };
}

/** JSON 序列化（纯数据，不含函数/循环引用）。 */
export function serializeDefinition(def: LevelDefinition): string {
  return JSON.stringify(def, null, 2);
}

/** JSON 反序列化 + 全量校验（有 error 直接抛错，warnings 挂在 error 上供上层感知）。 */
export function parseDefinition(text: string): LevelDefinition {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new Error(`关卡 JSON 解析失败：${(cause as Error).message}`);
  }
  const def = parsed as LevelDefinition;
  const validation = validateDefinition(def);
  if (validation.errors.length > 0) {
    throw new Error(`关卡校验失败：${validation.errors.join('；')}`);
  }
  return def;
}
