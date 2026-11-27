/**
 * 《碎砖大裂变》(Brick Fission) — 三大自动化关卡生成器（Milestone 3，docs/03 §2）
 *
 *   A. fromBinaryGrid / binaryGridFromAsciiArt：图片/文字二值矩阵 → 正负空间关卡，
 *      支持自动 STEEL 外框包边与底部居中 6~8 格发球入口；
 *   B. generateSymmetricTotem：极坐标 1/4 或 1/8 基础扇区决策 + 全象限镜像，
 *      STEEL 轮廓描边，强制底部中央 >=3 格引流通道直通中心空腔；
 *   C. generateExcavationMaze：矩形铺满 + Random Walk Carver 自底向上挖 1~2 条
 *      2~3 格宽曲折通道通盲盒空腔，嵌**成段连续钢墙隔断**
 *      （'scatter' 旧版随机散点会在砖阵里留下 1 格宽钢壁口袋，小球挤进去后死循环）。
 *
 * 纯 TypeScript：图片像素读取与汉字字形栅格化属于宿主职责，在 src/studio 完成后
 * 以 BinaryGrid 形式喂入本模块；本文件不引用任何宿主环境 API。
 */
import { DEFAULT_COLS, DEFAULT_ROWS, MIN_COLS, MIN_ROWS, MAX_COLS, MAX_ROWS } from '../core/constants.js';
import { makeEmptyCell, makeNormalCell, makeSteelCell } from '../core/BrickGrid.js';
import type { BrickCell } from '../core/types.js';
import {
  clampDimension,
  definitionFromCells,
  type LevelDefinition,
  type LevelMechanicsConfig,
} from './LevelSchema.js';
import { computeReachable } from './DifficultyScorer.js';

/** 与 M2 测试关一致的默认开局技能。 */
export const DEFAULT_MECHANICS: LevelMechanicsConfig = {
  initialSkills: { multiLaunch: 3, tripleSplit: 2 },
};

/* ------------------------------------------------------------------ */
/* 共享工具                                                             */
/* ------------------------------------------------------------------ */

/** mulberry32 确定性 PRNG：同 seed 产出完全一致的序列，保证关卡可复现。 */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 二值矩阵（1=前景），图片/文字栅格化与生成器之间的纯数据契约。 */
export interface BinaryGrid {
  cols: number;
  rows: number;
  /** 行优先，长度 = cols * rows，取值 0/1。 */
  data: Uint8Array;
}

/** 分配全空格子数组。 */
export function createEmptyCells(cols: number, rows: number): BrickCell[] {
  const cells = new Array<BrickCell>(cols * rows);
  for (let i = 0; i < cells.length; i++) cells[i] = makeEmptyCell();
  return cells;
}

/** 越界安全写格。 */
function put(cells: BrickCell[], cols: number, rows: number, col: number, row: number, cell: BrickCell): void {
  if (col < 0 || col >= cols || row < 0 || row >= rows) return;
  cells[row * cols + col] = cell;
}

/**
 * ASCII 字符画 → 二值矩阵。空格与 '.' 为背景，其余字符为前景；
 * 行宽以最长行为准，短行右侧补背景。
 */
export function binaryGridFromAsciiArt(lines: readonly string[]): BinaryGrid {
  if (lines.length === 0) throw new Error('binaryGridFromAsciiArt 收到空字符画');
  let cols = 0;
  for (const line of lines) cols = Math.max(cols, line.length);
  const rows = lines.length;
  const data = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const line = lines[r]!;
    for (let c = 0; c < line.length; c++) {
      const ch = line.charAt(c);
      if (ch !== ' ' && ch !== '.') data[r * cols + c] = 1;
    }
  }
  return { cols, rows, data };
}

/**
 * 四周加一圈 STEEL 外框，底边中央留 `gap` 格发球入口（docs/03：6~8 格）。
 * 直接原地修改 cells 并返回同一引用。
 */
export function frameWithSteel(
  cells: BrickCell[],
  cols: number,
  rows: number,
  gap: number,
): BrickCell[] {
  const steel = makeSteelCell(7);
  const half = Math.floor(gap / 2);
  const centerCol = Math.floor(cols / 2);
  const gapLeft = centerCol - half;
  const gapRight = centerCol + half + (gap % 2 === 0 ? 0 : 1) - 1;
  for (let c = 0; c < cols; c++) {
    put(cells, cols, rows, c, 0, steel);
    if (c < gapLeft || c > gapRight) put(cells, cols, rows, c, rows - 1, steel);
  }
  for (let r = 0; r < rows; r++) {
    put(cells, cols, rows, 0, r, steel);
    put(cells, cols, rows, cols - 1, r, steel);
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/* 生成器 A：二值矩阵（图片/文字）一键转关卡                              */
/* ------------------------------------------------------------------ */

export type SpaceMode = 'POSITIVE' | 'NEGATIVE';

export interface FromBinaryOptions {
  id: string;
  name: string;
  cols?: number;
  rows?: number;
  /** 下采样块内前景占比阈值（0~1），默认 0.5。 */
  threshold?: number;
  /** POSITIVE=前景为砖；NEGATIVE=背景铺满砖、前景镂空为通道。 */
  mode?: SpaceMode;
  /** 是否自动加 STEEL 外框（底部留发球入口），默认 true。 */
  frame?: boolean;
  /** 底部发球入口宽度（格），夹到 6~8，默认 7。 */
  frameGap?: number;
  /** 前景/背景砖属性（血量与色板索引）。 */
  brickHp?: number;
  brickColorIndex?: number;
}

/**
 * 二值矩阵下采样二值化到目标网格并转正负空间关卡。
 * 源矩阵的图片读取/汉字字形栅格化由 studio 层完成，本函数保持纯 TS 可单测。
 */
export function fromBinaryGrid(source: BinaryGrid, options: FromBinaryOptions): LevelDefinition {
  const cols = clampDimension(options.cols ?? DEFAULT_COLS, MIN_COLS, MAX_COLS, DEFAULT_COLS);
  const rows = clampDimension(options.rows ?? DEFAULT_ROWS, MIN_ROWS, MAX_ROWS, DEFAULT_ROWS);
  const threshold = clamp01(options.threshold ?? 0.5);
  const mode: SpaceMode = options.mode === 'NEGATIVE' ? 'NEGATIVE' : 'POSITIVE';
  const hp = options.brickHp && options.brickHp >= 1 ? Math.round(options.brickHp) : 1;
  const colorIndex = options.brickColorIndex ?? 0;
  const brick = (): BrickCell => makeNormalCell(hp, colorIndex);

  const cells = createEmptyCells(cols, rows);
  const sampled: Uint8Array = new Uint8Array(cols * rows);

  // 块均值下采样：源格按 (src.cols/cols) × (src.rows/rows) 分块聚合。
  for (let r = 0; r < rows; r++) {
    const srcRow0 = Math.floor((r * source.rows) / rows);
    const srcRow1 = Math.max(srcRow0 + 1, Math.floor(((r + 1) * source.rows) / rows));
    for (let c = 0; c < cols; c++) {
      const srcCol0 = Math.floor((c * source.cols) / cols);
      const srcCol1 = Math.max(srcCol0 + 1, Math.floor(((c + 1) * source.cols) / cols));
      let sum = 0;
      let count = 0;
      for (let sr = srcRow0; sr < srcRow1; sr++) {
        for (let sc = srcCol0; sc < srcCol1; sc++) {
          sum += source.data[sr * source.cols + sc] ?? 0;
          count++;
        }
      }
      const ratio = count > 0 ? sum / count : 0;
      if (ratio >= threshold) sampled[r * cols + c] = 1;
    }
  }

  if (mode === 'POSITIVE') {
    for (let i = 0; i < sampled.length; i++) {
      if (sampled[i] === 1) cells[i] = brick();
    }
  } else {
    // NEGATIVE：先铺满，再把前景（笔画/图案）镂空为通道。
    for (let i = 0; i < cells.length; i++) cells[i] = brick();
    for (let i = 0; i < sampled.length; i++) {
      if (sampled[i] === 1) cells[i] = makeEmptyCell();
    }
  }

  if (options.frame !== false) {
    const gap = clampInt(options.frameGap ?? 7, 6, 8);
    frameWithSteel(cells, cols, rows, gap);
  }
  sanitizeUnreachable(cells, cols, rows);
  // 死角开凿：随机 STEEL 可能围出四面封闭的空格（球进去即卡死），
  // 把相邻钢墙改成普通砖打开缺口，总砖量不减。
  openSealedPockets(cells, cols, rows);

  return definitionFromCells({
    id: options.id,
    name: options.name,
    cells,
    cols,
    rows,
    mechanics: DEFAULT_MECHANICS,
  });
}

/* ------------------------------------------------------------------ */
/* 生成器 B：对称几何图腾                                                */
/* ------------------------------------------------------------------ */

export interface TotemOptions {
  id: string;
  name: string;
  cols?: number;
  rows?: number;
  seed?: number;
  /** 对称象限数：4=左右+上下镜像（1/4 决策区），8=额外对角线镜像（1/8 决策区）。 */
  symmetry?: 4 | 8;
  /** 极坐标环带数，默认 5。 */
  ringCount?: number;
  /** 每环带在基础扇区内的角度桶数，默认 6。 */
  angleBins?: number;
  /** 轮廓边缘是否镶嵌 STEEL 描边，默认 true。 */
  steelOutline?: boolean;
  /** 底部引流通道宽度（格），强制 >=3，默认 4。 */
  channelWidth?: number;
  /** 普通砖最大血量（1~3），默认 2。 */
  maxHp?: number;
}

/**
 * 对称图腾生成：
 * 决策只在基础扇区（1/4 或 1/8）做一次，按极坐标 (ring, angleBin) 查表，
 * 全象限共享同一决策 → 严格镜像；中心留空腔；底部引流通道直通空腔。
 */
export function generateSymmetricTotem(options: TotemOptions): LevelDefinition {
  const cols = clampDimension(options.cols ?? DEFAULT_COLS, MIN_COLS, MAX_COLS, DEFAULT_COLS);
  const rows = clampDimension(options.rows ?? DEFAULT_ROWS, MIN_ROWS, MAX_ROWS, DEFAULT_ROWS);
  const rng = createSeededRng(options.seed ?? 20261126);
  const symmetry = options.symmetry === 8 ? 8 : 4;
  const sectorAngle = symmetry === 8 ? Math.PI / 4 : Math.PI / 2;
  const ringCount = clampInt(options.ringCount ?? 5, 2, 9);
  const angleBins = clampInt(options.angleBins ?? 6, 2, 12);
  const channelWidth = Math.max(3, options.channelWidth ?? 4);
  const maxHp = clampInt(options.maxHp ?? 2, 1, 3);

  const cells = createEmptyCells(cols, rows);
  const centerCol = (cols - 1) / 2;
  // 图腾整体偏上，给挡板上方留出开放战场。
  const centerRow = rows * 0.42;
  const maxRadius = Math.min(centerCol, centerRow) - 1;
  const innerRadius = Math.max(2, Math.round(maxRadius * 0.16));

  // 规范扇区决策缓存：键 = ring*angleBins+bin。
  // 对称等价格（含 hp/color）必须共享同一决策，故 rng 只在首次访问某个规范键时调用一次。
  interface TotemDecision {
    fill: boolean;
    hp: number;
    colorIndex: number;
  }
  const decisionCache = new Map<number, TotemDecision>();
  const densityAt = (ring: number): number => Math.max(0.35, 0.82 - ring * 0.07);

  const battlefieldBottom = centerRow + maxRadius * 0.55;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r > battlefieldBottom) continue; // 下部开放战场不放砖
      const dx = c - centerCol;
      const dy = r - centerRow;
      const radius = Math.sqrt(dx * dx + dy * dy);
      if (radius < innerRadius || radius > maxRadius) continue;
      const ring = Math.min(ringCount - 1, Math.floor((radius / maxRadius) * ringCount));
      // 反射折叠到规范扇区：先取绝对值把任意象限映到第一象限 [0,π/2]，
      // 8 象限时再关于对角线反射到 [0,π/4]。镜像等价格的 |dx|、|dy| 相同 → 规范角严格相等。
      let canonical = Math.atan2(Math.abs(dy), Math.abs(dx));
      if (symmetry === 8 && canonical > Math.PI / 4) canonical = Math.PI / 2 - canonical;
      const bin = Math.min(angleBins - 1, Math.floor((canonical / sectorAngle) * angleBins));
      const key = ring * angleBins + bin;
      let decision = decisionCache.get(key);
      if (!decision) {
        decision = {
          fill: rng() < densityAt(ring),
          hp: 1 + Math.floor(rng() * maxHp),
          colorIndex: Math.floor(rng() * 7),
        };
        decisionCache.set(key, decision);
      }
      if (!decision.fill) continue;
      cells[r * cols + c] = makeNormalCell(decision.hp, decision.colorIndex);
    }
  }

  // STEEL 轮廓描边：4 邻域贴空的普通砖改钢墙（通道 pass 在其后执行，保证不封门）。
  if (options.steelOutline !== false) {
    applySteelOutline(cells, cols, rows);
  }

  carveCentralChannel(cells, cols, rows, channelWidth);
  sanitizeUnreachable(cells, cols, rows);
  // 死角开凿：随机 STEEL 可能围出四面封闭的空格（球进去即卡死），
  // 把相邻钢墙改成普通砖打开缺口，总砖量不减。
  openSealedPockets(cells, cols, rows);
  // 死砖开凿（仅图腾关）：描边钢墙会把翼尖处的普通砖挡在砖阵内侧，
  // 球永远打不到（实测第 06 / 08 关各有 30~40 块死砖）→ 打通竖直通路。
  openThreeSidedPockets(cells, cols, rows);
  openBlockedBricks(cells, cols, rows);
  openThreeSidedPockets(cells, cols, rows);

  return definitionFromCells({
    id: options.id,
    name: options.name,
    cells,
    cols,
    rows,
    mechanics: DEFAULT_MECHANICS,
  });
}

/**
 * 标记「与网格外部连通」的 EMPTY 格（4 邻域 flood fill）。
 *
 * 用于区分图腾的**外部空间**（轮廓之外 + 下方战场）与**内部空洞**
 * （被图腾砖包围的随机空隙）。内部空洞是球可以进去的通道，
 * 不能被描边转成钢墙。
 */
function markOutsideEmpty(cells: readonly BrickCell[], cols: number, rows: number): Uint8Array {
  const outside = new Uint8Array(cols * rows);
  const queue: number[] = [];
  const push = (idx: number): void => {
    if (outside[idx] === 1) return;
    if (cells[idx]!.role !== 'EMPTY') return;
    outside[idx] = 1;
    queue.push(idx);
  };
  for (let c = 0; c < cols; c++) {
    push(c);
    push((rows - 1) * cols + c);
  }
  for (let r = 0; r < rows; r++) {
    push(r * cols);
    push(r * cols + cols - 1);
  }
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++]!;
    const col = idx % cols;
    const row = (idx / cols) | 0;
    if (col > 0) push(idx - 1);
    if (col < cols - 1) push(idx + 1);
    if (row > 0) push(idx - cols);
    if (row < rows - 1) push(idx + cols);
  }
  return outside;
}

/**
 * 轮廓描边：与**外部空间**相邻的普通砖改为 STEEL（原地）。
 *
 * 两条关键约束：
 *
 * 1. **只描外部轮廓**：图腾内部有随机空洞（旧实现会把紧邻空洞的砖也转成
 *    STEEL，于是内部多出一堆**打不破的孤立钢刺**）——它们把内部通道彻底堵死，
 *    并制造 1 格宽竖井（实测第 07 关有 4 处，机器人卡在 61% 破砖率）。
 *    判据改为「邻居是否是外部连通空间」，内部空洞保持为可通行通道。
 *
 * 2. **底边开口**：若该砖下方邻格为空（朝挡板战场的收口面），保留 NORMAL
 *    不转 STEEL。否则圆盘外缘会被描成闭合钢壳、内环又封死中心空腔，
 *    BFS 沿引流通道进入空腔后无法穿透钢壳，壳内全部 NORMAL 会被
 *    sanitizeUnreachable 判死区清空（图腾被掏空）。
 */
function applySteelOutline(cells: BrickCell[], cols: number, rows: number): void {
  const snapshot = cells.slice();
  const steel = makeSteelCell(7);
  const outside = markOutsideEmpty(snapshot, cols, rows);
  const offsets = [-1, 1, -cols, cols] as const;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const cell = snapshot[idx]!;
      if (cell.role !== 'NORMAL') continue;
      const below = r < rows - 1 ? snapshot[idx + cols] : null;
      // 朝战场的底边收口面保留为可破坏砖，杜绝闭合钢壳。
      if (below?.role === 'EMPTY') continue;
      let touchesOutside = false;
      for (let k = 0; k < offsets.length; k++) {
        const nIdx = idx + offsets[k]!;
        if (nIdx < 0 || nIdx >= snapshot.length) continue;
        const neighbor = snapshot[nIdx]!;
        if (neighbor.role !== 'EMPTY') continue;
        if (outside[nIdx] === 1) {
          touchesOutside = true;
          break;
        }
      }
      if (!touchesOutside) continue;
      // 三面钢墙口袋保护：若某个空格的**唯一**非钢墙邻居就是本砖，
      // 本砖正是那个空格的逃生口 —— 转成钢墙会把它封成死袋（实测第 06 关
      // 描边后钢墙 110 块 vs 普通砖 218 块，且产生大量倒 U 口袋）。
      // 此时保留为可破坏砖。
      if (isLastOpeningOfPocket(snapshot, cols, idx)) continue;
      cells[idx] = steel;
    }
  }
}

/**
 * 判断 `idx` 是否是某个空格的**唯一**非钢墙邻居（即该空格的逃生口）。
 *
 * 典型场景：图腾内部某个空格的左 / 右 / 上都是钢墙，只有下方这一格是普通砖；
 * 若把这一格描成钢墙，空格就变成三面（甚至四面）钢墙的死袋，
 * 球弹进去后再也出不来。
 */
function isLastOpeningOfPocket(
  cells: readonly BrickCell[],
  cols: number,
  idx: number,
): boolean {
  const offsets = [-1, 1, -cols, cols] as const;
  const col = idx % cols;
  const row = (idx / cols) | 0;
  for (let k = 0; k < offsets.length; k++) {
    const nIdx = idx + offsets[k]!;
    if (nIdx < 0 || nIdx >= cells.length) continue;
    // 邻居必须是空格子才可能是口袋。
    if (cells[nIdx]!.role !== 'EMPTY') continue;
    let openCount = 0;
    for (let j = 0; j < offsets.length; j++) {
      const mIdx = nIdx + offsets[j]!;
      if (mIdx < 0 || mIdx >= cells.length) continue;
      if (cells[mIdx]!.role !== 'STEEL') openCount += 1;
    }
    // 该空格只有 idx 这一个非钢墙邻居 → idx 是它最后的逃生口。
    if (openCount === 1) return true;
  }
  void col;
  void row;
  return false;
}

/**
 * 底部中央引流通道：从底边向上清空 channelWidth 列，直到中心空腔区域。
 * 通道内任何砖/钢墙一律移除，确保默认发球线不被封死。
 */
function carveCentralChannel(
  cells: BrickCell[],
  cols: number,
  rows: number,
  channelWidth: number,
): void {
  const centerCol = Math.floor(cols / 2);
  const half = Math.floor(channelWidth / 2);
  const left = centerCol - half;
  const right = centerCol + half + (channelWidth % 2 === 0 ? 0 : 1) - 1;
  // 通道自网格顶一路清空到底：封门检测沿中央两列整列扫描，只清到空腔顶会在更高处被描边双 STEEL 封死。
  const top = 0;
  for (let r = top; r < rows; r++) {
    for (let c = left; c <= right; c++) {
      if (c < 0 || c >= cols) continue;
      cells[r * cols + c] = makeEmptyCell();
    }
  }
}

/**
 * 死区净化：把从挡板开放区不可达的可破坏砖清空（与 DifficultyScorer 共用同一套 BFS 事实源），
 * 保证生成器产出的关卡 hasDeadZoneWarning 不因封闭砖误报。STEEL 保留（不纳入死区砖计数）。
 * 返回被移除的死区砖数量。
 */
function sanitizeUnreachable(cells: BrickCell[], cols: number, rows: number): number {
  const reachable = computeReachable(cells, cols, rows);
  let removed = 0;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    if (cell.role === 'EMPTY' || cell.role === 'STEEL') continue;
    if (!reachable[i]) {
      cells[i] = makeEmptyCell();
      removed++;
    }
  }
  return removed;
}

/**
 * 死角开凿：随机嵌 STEEL 会在壁垒之间留下「四面全是钢墙」的孤立空格，
 * 球一旦被弹进去就永远出不来（实测第 19 关有 2 处，卡死后破砖率从 67% 掉到 19%）。
 *
 * 修法：把死角朝向最近可通行区域的那一格 STEEL **改成普通砖**（STEEL → NORMAL），
 * 既打开了缺口，又**不减少总砖量**（钢墙变成可破坏砖，砖数只增不减）。
 * 返回被开凿的死角数量。
 */
export function openSealedPockets(cells: BrickCell[], cols: number, rows: number): number {
  const isSteel = (c: number, r: number): boolean =>
    c < 0 || r < 0 || c >= cols || r >= rows || cells[r * cols + c]!.role === 'STEEL';

  let opened = 0;
  // 反复扫描：每次开凿可能让相邻的死角变成可通行，需要迭代到收敛。
  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;
    for (let r = 1; r < rows - 1; r += 1) {
      for (let c = 1; c < cols - 1; c += 1) {
        const idx = r * cols + c;
        if (cells[idx]!.role === 'STEEL') continue;
        // 四面都是钢墙 = 死角
        if (!isSteel(c - 1, r) || !isSteel(c + 1, r) || !isSteel(c, r - 1) || !isSteel(c, r + 1)) {
          continue;
        }
        // 找朝向「最近可通行区域」的方向，改那一格钢墙
        let bestDir: { dc: number; dr: number; distance: number } | null = null;
        const dirs = [
          { dc: -1, dr: 0 },
          { dc: 1, dr: 0 },
          { dc: 0, dr: -1 },
          { dc: 0, dr: 1 },
        ];
        for (const dir of dirs) {
          let step = 1;
          let cc = c + dir.dc;
          let rr = r + dir.dr;
          while (step < 12 && isSteel(cc, rr)) {
            step += 1;
            cc += dir.dc;
            rr += dir.dr;
          }
          if (step >= 12) continue; // 该方向 12 格外仍是钢墙，不适合开凿
          if (!bestDir || step < bestDir.distance) {
            bestDir = { dc: dir.dc, dr: dir.dr, distance: step };
          }
        }
        if (!bestDir) continue;
        const openCol = c + bestDir.dc;
        const openRow = r + bestDir.dr;
        cells[openRow * cols + openCol] = makeNormalCell(1, 0);
        opened += 1;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return opened;
}

/**
 * 死砖开凿：把**打不到的可破坏砖**从钢墙里挖出来。
 *
 * 图腾描边会在外缘留下一圈 STEEL，翼尖处的普通砖因此被钢墙挡在
 * 「砖阵内侧」—— 球从下方过来先撞钢墙，那块砖永远打不到
 * （实测第 06 / 08 关各有 30~40 块这样的死砖，破砖率卡在 82%~88%）。
 *
 * 判据：某块普通砖的正下方是 STEEL，且这块 STEEL 的左右都不是 STEEL
 * （成段的钢墙隔断不属于描边，不动它）→ 把这块 STEEL 改成普通砖，
 * 给翼尖砖开一条竖直通路。
 *
 * 钢墙 → 普通砖，**总砖量不减**（可破坏砖变多），而原本打不到的砖
 * 变得可打，破砖率随之提升。
 */
function openBlockedBricks(cells: BrickCell[], cols: number, rows: number): number {
  const isSteel = (c: number, r: number): boolean =>
    c < 0 || r < 0 || c >= cols || r >= rows || cells[r * cols + c]!.role === 'STEEL';

  let opened = 0;
  for (let r = 1; r < rows - 2; r += 1) {
    for (let c = 1; c < cols - 1; c += 1) {
      const idx = r * cols + c;
      if (cells[idx]!.role !== 'NORMAL') continue;
      // 正下方是钢墙 → 这块砖被挡住（球自下方来，先撞墙）。
      if (!isSteel(c, r + 1)) continue;
      // 成段钢墙（左右也是钢墙）属于刻意布局，不开凿。
      if (isSteel(c - 1, r + 1) || isSteel(c + 1, r + 1)) continue;
      cells[(r + 1) * cols + c] = makeNormalCell(1, 0);
      opened += 1;
    }
  }
  return opened;
}

/**
 * U 形（三面钢墙）口袋开凿。
 *
 * 四面钢墙死角由上面的循环处理，但还有一类「倒 U 口袋」：
 * 某个空格的左 / 右 / 上是钢墙、只有下方开口 —— 球从下方弹进去后
 * 被三面钢墙围住，只能原路退出，机器人与玩家都拿它没办法
 * （实测第 06~10 关描边后大量出现）。
 *
 * 修法：把开口方向**两侧**的某一格钢墙改成普通砖，给凹槽开一个侧向出口；
 * 优先开凿内部钢墙（外侧不是外部连通空地），不动刻意设置的外轮廓。
 * 总砖量不减（钢墙 → 可破坏砖）。
 */
function openThreeSidedPockets(cells: BrickCell[], cols: number, rows: number): number {
  const outside = markOutsideEmpty(cells, cols, rows);
  const offsets = [
    { dc: -1, dr: 0 },
    { dc: 1, dr: 0 },
    { dc: 0, dr: -1 },
    { dc: 0, dr: 1 },
  ] as const;

  const isSteel = (c: number, r: number): boolean =>
    c < 0 || r < 0 || c >= cols || r >= rows || cells[r * cols + c]!.role === 'STEEL';

  let opened = 0;
  for (let r = 1; r < rows - 1; r += 1) {
    for (let c = 1; c < cols - 1; c += 1) {
      const idx = r * cols + c;
      if (cells[idx]!.role !== 'EMPTY') continue;

      // 统计 4 邻域的钢墙数与开口方向。
      let steelCount = 0;
      let openDir = -1;
      for (let k = 0; k < offsets.length; k += 1) {
        const dir = offsets[k]!;
        if (isSteel(c + dir.dc, r + dir.dr)) steelCount += 1;
        else openDir = k;
      }
      if (steelCount !== 3 || openDir < 0) continue;

      // 开口方向的左右两侧：开凿其中「更靠内部」的一侧。
      const sideDirs = [openDir - 1, openDir + 1].map((k) => (k + 4) % 4);
      // 优先开凿内部钢墙（外侧不是外部连通空地），外轮廓砖最后才动。
      let best: { c: number; r: number } | null = null;
      let fallback: { c: number; r: number } | null = null;
      for (const k of sideDirs) {
        const dir = offsets[k]!;
        const sc = c + dir.dc;
        const sr = r + dir.dr;
        if (!isSteel(sc, sr)) continue;
        const outerC = sc - dir.dc;
        const outerR = sr - dir.dr;
        const isOutline =
          outerC >= 0 &&
          outerC < cols &&
          outerR >= 0 &&
          outerR < rows &&
          outside[outerR * cols + outerC] === 1;
        if (isOutline) {
          // 外轮廓砖：留作最后手段（宁可轮廓有缺口，也不要死袋）。
          if (!fallback) fallback = { c: sc, r: sr };
          continue;
        }
        best = { c: sc, r: sr };
        break;
      }
      if (!best) best = fallback;
      if (!best) continue;
      cells[best.r * cols + best.c] = makeNormalCell(1, 0);
      opened += 1;
    }
  }
  return opened;
}

/* ------------------------------------------------------------------ */
/* 生成器 C：迷宫挖洞通道                                                */
/* ------------------------------------------------------------------ */

export interface MazeOptions {
  id: string;
  name: string;
  cols?: number;
  rows?: number;
  seed?: number;
  /** 掘进通道条数（1~2），默认 1。 */
  channelCount?: 1 | 2;
  /** 通道宽度（2~3 格），默认 3。 */
  channelWidth?: 2 | 3;
  /** 壁垒嵌 STEEL 比例（0~1），默认 0.18。 */
  steelRatio?: number;
  /**
   * 钢墙布局：
   *   - 'bands'（默认）：少数成段连续钢墙隔断，带间净距 ≥3 格；
   *   - 'scatter'：旧版随机散点撒 STEEL（会在砖阵里留下 1 格宽钢壁口袋）。
   */
  steelLayout?: 'bands' | 'scatter';
  /** 'bands' 布局下的钢墙隔断条数，默认 4。 */
  steelBandCount?: number;
  /** 'bands' 布局下两条钢墙带之间的最小列距（格），默认 4（净距 ≥3 格）。 */
  steelBandMinGap?: number;
  /** 盲盒空腔半径（格），默认 3。 */
  cavityRadius?: number;
  /** 普通砖最大血量，默认 2。 */
  maxHp?: number;
}

/**
 * 迷宫挖洞关：矩形铺满 NORMAL → Random Walk Carver 自底向上挖曲折通道 →
 * 顶部盲盒空腔 → 按比例在壁垒嵌 STEEL（通道/空腔/默认发球线白名单保护）。
 */
export function generateExcavationMaze(options: MazeOptions): LevelDefinition {
  const cols = clampDimension(options.cols ?? DEFAULT_COLS, MIN_COLS, MAX_COLS, DEFAULT_COLS);
  const rows = clampDimension(options.rows ?? DEFAULT_ROWS, MIN_ROWS, MAX_ROWS, DEFAULT_ROWS);
  const rng = createSeededRng(options.seed ?? 20261126);
  const channelCount = options.channelCount === 2 ? 2 : 1;
  const channelWidth = options.channelWidth === 2 ? 2 : 3;
  const steelRatio = clamp01(options.steelRatio ?? 0.18);
  const steelLayout = options.steelLayout === 'scatter' ? 'scatter' : 'bands';
  const steelBandCount = clampInt(options.steelBandCount ?? 4, 0, 12);
  const steelBandMinGap = Math.max(3, Math.round(options.steelBandMinGap ?? 4));
  const cavityRadius = clampInt(options.cavityRadius ?? 3, 2, 6);
  const maxHp = clampInt(options.maxHp ?? 2, 1, 3);

  const cells = createEmptyCells(cols, rows);
  const protected_ = new Uint8Array(cols * rows); // 通道/空腔/发球线白名单
  const fillTop = 2;
  const fillBottom = rows - 3;
  const fillLeft = 1;
  const fillRight = cols - 2;

  // 1. 矩形区域铺满普通砖（少量多血/多色变化）。
  for (let r = fillTop; r <= fillBottom; r++) {
    for (let c = fillLeft; c <= fillRight; c++) {
      const hp = 1 + Math.floor(rng() * maxHp);
      const colorIndex = Math.floor(rng() * 7);
      cells[r * cols + c] = makeNormalCell(hp, colorIndex);
    }
  }

  // 2. 盲盒空腔（上部居中）。
  const cavityCol = Math.floor(cols / 2);
  const cavityRow = fillTop + cavityRadius + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = c - cavityCol;
      const dy = r - cavityRow;
      if (dx * dx + dy * dy <= cavityRadius * cavityRadius) {
        protected_[r * cols + c] = 1;
        cells[r * cols + c] = makeEmptyCell();
      }
    }
  }

  // 3. Random Walk Carver：自底边向上挖 channelWidth 宽曲折通道。
  const startOffsets = channelCount === 1 ? [0] : [-8, 8];
  for (const offset of startOffsets) {
    let col = clampInt(cavityCol + offset, fillLeft + 2, fillRight - 2);
    for (let row = fillBottom; row >= cavityRow + cavityRadius; row--) {
      carveWidth(cells, protected_, cols, rows, col, row, channelWidth);
      // 有向随机游走：以向上为主，水平小幅摆动。
      const roll = rng();
      if (roll < 0.33) col -= 1;
      else if (roll > 0.67) col += 1;
      col = clampInt(col, fillLeft + 1, fillRight - 1);
    }
  }

  // 4. 默认发球线（中央两列）全程保护，绝不允许 STEEL 封死。
  const axisLeft = Math.floor(cols / 2) - 1;
  for (let r = 0; r < rows; r++) {
    for (let c = axisLeft; c <= axisLeft + 1; c++) {
      protected_[r * cols + c] = 1;
    }
  }

  // 5. 嵌 STEEL。
  //    - 'bands'（默认）：少数成段连续钢墙隔断。随机散点会在砖阵里留下
  //      「1 格宽」的钢壁口袋（两块 STEEL 之间夹一格空隙），小球（直径 13px）
  //      挤进去后只能垂直弹跳，形成死循环；成段隔断不会产生这种缝。
  //    - 'scatter'：旧版随机散点，保留用于对照实验。
  const steel = makeSteelCell(7);
  if (steelLayout === 'bands') {
    applySteelBands(
      cells,
      protected_,
      cols,
      rng,
      steelBandCount,
      steelBandMinGap,
      fillTop,
      fillBottom,
      fillLeft,
      fillRight,
    );
  } else {
    for (let r = fillTop; r <= fillBottom; r++) {
      for (let c = fillLeft; c <= fillRight; c++) {
        const idx = r * cols + c;
        if (protected_[idx] === 1) continue;
        if (cells[idx]!.role !== 'NORMAL') continue;
        if (rng() < steelRatio) cells[idx] = steel;
      }
    }
  }

  // 6. 死区净化：封闭在 STEEL 壁垒后的不可达砖一律移除，保证入库关卡无死区警告。
  sanitizeUnreachable(cells, cols, rows);
  // 死角开凿：随机 STEEL 可能围出四面封闭的空格（球进去即卡死），
  // 把相邻钢墙改成普通砖打开缺口，总砖量不减。
  openSealedPockets(cells, cols, rows);

  return definitionFromCells({
    id: options.id,
    name: options.name,
    cells,
    cols,
    rows,
    mechanics: DEFAULT_MECHANICS,
  });
}

/**
 * 成段连续钢墙隔断（'bands' 布局）。
 *
 * 背景：旧版按 `steelRatio` 随机撒 STEEL，会在砖阵里制造「1 格宽」的钢壁口袋 ——
 * 两块相邻 STEEL 之间夹一格空隙，小球（直径 13px）挤进去后只能垂直弹跳，
 * 出不来也打不到旁边的砖，实测第 19/20 关破砖率因此卡在 10%~67%。
 *
 * 这里改成「少数成段连续钢墙隔断」：
 *   - 每条带是 1 格宽的连续竖直段（带宽 = 1 格，不产生空腔，只产生墙）；
 *   - 带与带的列距 ≥ `minGap`（默认 4 → 净距 ≥3 格），保证通道不会缩窄成 1 格；
 *   - 通道 / 盲盒空腔 / 默认发球线（protected_ 白名单）一律不落钢墙；
 *   - 各带的高度与起始行随机错开，避免形成整齐栅栏把砖阵切成互不连通的碎片。
 */
function applySteelBands(
  cells: BrickCell[],
  protected_: Uint8Array,
  cols: number,
  rng: () => number,
  bandCount: number,
  minGap: number,
  fillTop: number,
  fillBottom: number,
  fillLeft: number,
  fillRight: number,
): void {
  if (bandCount <= 0) return;
  const steel = makeSteelCell(7);

  // 可用作钢墙带的列：整段都不与受保护格（通道/空腔/发球线）相交。
  const candidateCols: number[] = [];
  for (let c = fillLeft; c <= fillRight; c++) {
    let blocked = false;
    for (let r = fillTop; r <= fillBottom; r++) {
      if (protected_[r * cols + c] === 1) {
        blocked = true;
        break;
      }
    }
    if (!blocked) candidateCols.push(c);
  }
  if (candidateCols.length === 0) return;

  const placed: number[] = [];
  const attempts = Math.max(12, bandCount * 16);
  for (let i = 0; i < attempts && placed.length < bandCount; i++) {
    const col = candidateCols[Math.floor(rng() * candidateCols.length)]!;
    if (placed.some((p) => Math.abs(p - col) < minGap)) continue;
    placed.push(col);
  }
  placed.sort((a, b) => a - b);

  for (const col of placed) {
    const span = fillBottom - fillTop + 1;
    const bandHeight = clampInt(6 + Math.floor(rng() * 9), 4, Math.max(4, span - 2));
    const maxStart = Math.max(fillTop, fillBottom - bandHeight + 1);
    const start = fillTop + Math.floor(rng() * (maxStart - fillTop + 1));
    for (let r = start; r < Math.min(fillBottom + 1, start + bandHeight); r++) {
      const idx = r * cols + col;
      if (protected_[idx] === 1) continue;
      if (cells[idx]!.role !== 'NORMAL') continue;
      cells[idx] = steel;
    }
  }
}

/** 以 (col,row) 为中心挖 channelWidth 格宽的横条，标记白名单并清空。 */
function carveWidth(
  cells: BrickCell[],
  protected_: Uint8Array,
  cols: number,
  rows: number,
  col: number,
  row: number,
  channelWidth: number,
): void {
  const half = Math.floor(channelWidth / 2);
  const left = col - half;
  const right = col + half + (channelWidth % 2 === 0 ? 0 : 1) - 1;
  for (let c = left; c <= right; c++) {
    if (c < 0 || c >= cols || row < 0 || row >= rows) continue;
    const idx = row * cols + c;
    protected_[idx] = 1;
    cells[idx] = makeEmptyCell();
  }
}

/* ------------------------------------------------------------------ */
/* 内部数值工具                                                          */
/* ------------------------------------------------------------------ */

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const rounded = Math.round(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}
