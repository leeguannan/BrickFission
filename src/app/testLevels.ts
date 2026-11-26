/**
 * 《碎砖大裂变》(Brick Fission) — Milestone 2 试玩壳层内置 3 个测试关
 *
 * 三关主题（对应任务书 m00471）：
 *   1. 对称齿轮阵：8 齿钢墙齿轮 + 同心彩色环，中心多血砖；
 *   2. 汉字「干」镂空阵：三笔笔画分层配色，笔画围合区镂空；
 *   3. 双列框体绿砖门：左右钢墙框体夹中部门洞，门闩绿砖。
 *
 * 本模块只产出内核可直接消费的 `LevelRuntimeConfig`（扁平 cells），
 * 不涉及 Milestone 3 的 `LevelSchema` / 生成器 / 难度评分体系。
 */
import { DEFAULT_COLS, DEFAULT_ROWS } from '../game/core/constants.js';
import type { BrickCell, LevelRuntimeConfig } from '../game/core/types.js';

export interface TestLevelDef {
  id: string;
  name: string;
  config: LevelRuntimeConfig;
}

const COLS = DEFAULT_COLS; // 42
const ROWS = DEFAULT_ROWS; // 38

function makeCell(role: BrickCell['role'], hp: number, colorIndex: number): BrickCell {
  return { role, hp, maxHp: hp, colorIndex };
}

function emptyGrid(): BrickCell[] {
  const cells = new Array<BrickCell>(COLS * ROWS);
  const empty = makeCell('EMPTY', 0, 0);
  for (let i = 0; i < cells.length; i++) cells[i] = { ...empty };
  return cells;
}

function put(cells: BrickCell[], col: number, row: number, cell: BrickCell): void {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  cells[row * COLS + col] = cell;
}

function fillRect(
  cells: BrickCell[],
  col0: number,
  row0: number,
  col1: number,
  row1: number,
  cell: BrickCell,
): void {
  for (let r = row0; r <= row1; r++) {
    for (let c = col0; c <= col1; c++) put(cells, c, r, cell);
  }
}

/* ------------------------------------------------------------------ */
/* 关卡 1：对称齿轮阵（程序化生成，保证中心对称）                        */
/* ------------------------------------------------------------------ */

function buildGearLevel(): BrickCell[] {
  const cells = emptyGrid();
  const centerCol = 21;
  const centerRow = 12;
  const steel = makeCell('STEEL', 1, 7);

  for (let row = 1; row <= 24; row++) {
    for (let col = 2; col <= 39; col++) {
      const dx = col - centerCol;
      const dy = row - centerRow;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // 外齿圈：r≈8 的环上，每 45° 一个方位角做钢墙轮齿
      const sector = Math.round((angle * 180) / Math.PI / 45) * 45;
      const sectorRad = (sector * Math.PI) / 180;
      const angularGap = Math.abs(
        ((angle - sectorRad + Math.PI * 3) % (Math.PI * 2)) - Math.PI,
      );
      const isTooth = dist >= 6.8 && dist <= 8.6 && angularGap < 0.32;
      // 齿圈之间的钢墙环体
      const isRingBody = dist >= 6.8 && dist <= 7.8 && angularGap >= 0.32;
      // 中轴发球通道：正上/正下方位为默认垂直发球预留入口。
      // 球心初始 x=360 恰好压在 col20/21 分界，球 AABB 只跨这两列；
      // 若外环钢墙封死该通道，球会在「钢墙 ↔ 挡板中心」间二点弹跳，
      // 而规格 §3.5 的自救计数会被挡板反弹清零（永不达 18 次阈值）。
      const onAxisChannel = col === centerCol - 1 || col === centerCol;
      if ((isTooth || isRingBody) && onAxisChannel) {
        continue;
      }
      if (isTooth || isRingBody) {
        put(cells, col, row, steel);
        continue;
      }

      // 中环：r 4.6~5.8，按方位角轮换 4 色（1 血）
      if (dist >= 4.6 && dist <= 5.8) {
        const colorIndex = ((Math.floor((angle + Math.PI * 2) / (Math.PI / 4)) % 4) + 4) % 4;
        put(cells, col, row, makeCell('NORMAL', 1, colorIndex));
        continue;
      }

      // 内环：r 2.6~3.6，橙红 2 血
      if (dist >= 2.6 && dist <= 3.6) {
        put(cells, col, row, makeCell('NORMAL', 2, 6));
        continue;
      }

      // 轴心：亮紫 3 血
      if (dist <= 1.8) {
        put(cells, col, row, makeCell('NORMAL', 3, 4));
      }
    }
  }

  // 四角钢墙铆钉，强化机械对称感
  for (const [c, r] of [
    [3, 2],
    [38, 2],
    [3, 23],
    [38, 23],
  ] as const) {
    put(cells, c, r, steel);
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/* 关卡 2：汉字「干」镂空阵（字符画栅格化）                              */
/* ------------------------------------------------------------------ */

/**
 * 字符表：. 空 / S 钢墙 / R 红1血 / G 绿1血 / B 蓝1血 /
 *         Y 金黄2血 / P 亮紫3血 / C 青1血 / O 橙红2血
 * 每行必须严格 42 字符，rasterize 时校验。
 */
const GAN_ART: readonly string[] = [
  '..........................................',
  '..........................................',
  '............RRRRRRRRRRRRRRRR..............',
  '............RYYYYYYYYYYYYYYR..............',
  '............RRRRRRRRRRRRRRRR..............',
  '...................YY.....................',
  '...................YY.....................',
  '.....BB............YY............BB.......',
  '.....BB............YY............BB.......',
  '.......RRRRRRRRRRRRYYRRRRRRRRRRRR.........',
  '.......RYOOOOOOOOOYYOOOOOOOOOOYR..........',
  '.......RRRRRRRRRRRRYYRRRRRRRRRRRR.........',
  '...................YY.....................',
  '...................YY.....................',
  '...................YY.....................',
  '...................YY.....................',
  '...................YY.....................',
  '...................YY.....................',
  '...................YY.....................',
  '...................YY.....................',
  '...................YY.....................',
  '...................YY.....................',
  '..............CC..........CC..............',
  '.............CCCC........CCCC.............',
  '..........................................',
  '..........................................',
];

const ART_CELLS: Readonly<Record<string, BrickCell>> = {
  S: makeCell('STEEL', 1, 7),
  R: makeCell('NORMAL', 1, 0),
  G: makeCell('NORMAL', 1, 1),
  B: makeCell('NORMAL', 1, 2),
  Y: makeCell('NORMAL', 2, 3),
  P: makeCell('NORMAL', 3, 4),
  C: makeCell('NORMAL', 1, 5),
  O: makeCell('NORMAL', 2, 6),
};

function rasterize(art: readonly string[], topRow: number): BrickCell[] {
  const cells = emptyGrid();
  for (let r = 0; r < art.length; r++) {
    const line = art[r]!;
    if (line.length !== COLS) {
      throw new Error(`测试关字符画第 ${r} 行宽度 ${line.length} ≠ ${COLS}`);
    }
    for (let c = 0; c < COLS; c++) {
      const ch = line[c]!;
      if (ch === '.') continue;
      const cell = ART_CELLS[ch];
      if (!cell) throw new Error(`测试关字符画含未知符号 '${ch}'`);
      put(cells, c, topRow + r, { ...cell });
    }
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/* 关卡 3：双列框体绿砖门                                               */
/* ------------------------------------------------------------------ */

function buildGateLevel(): BrickCell[] {
  const cells = emptyGrid();
  const steel = makeCell('STEEL', 1, 7);
  const green = makeCell('NORMAL', 1, 1);
  const green2 = makeCell('NORMAL', 2, 1);

  // 左右两个框体：col 4~17 与 col 24~37，row 2~20
  for (const [left, right] of [
    [4, 17],
    [24, 37],
  ] as const) {
    // 钢墙边框：底边只保留两端门墩，中央留入口让球能打进框体内部
    fillRect(cells, left, 2, right, 2, steel);
    put(cells, left, 20, steel);
    put(cells, left + 1, 20, steel);
    put(cells, right - 1, 20, steel);
    put(cells, right, 20, steel);
    fillRect(cells, left, 2, left, 20, steel);
    fillRect(cells, right, 2, right, 20, steel);
    // 内部绿砖填充，每 3 行留一条横向镂空
    for (let r = 4; r <= 18; r++) {
      for (let c = left + 2; c <= right - 2; c++) {
        if (r % 3 === 0) continue; // 镂空缝
        put(cells, c, r, (r + c) % 5 === 0 ? green2 : green);
      }
    }
  }

  // 门洞顶梁（col 18~23）与门柱脚
  fillRect(cells, 18, 2, 23, 2, steel);
  put(cells, 18, 20, steel);
  put(cells, 23, 20, steel);

  // 门闩：中轴两列绿砖，隔行排布
  for (const r of [6, 10, 14, 18]) {
    put(cells, 20, r, green2);
    put(cells, 21, r, green2);
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/* 导出                                                                */
/* ------------------------------------------------------------------ */

function toConfig(id: string, name: string, cells: BrickCell[]): LevelRuntimeConfig {
  return {
    id,
    name,
    cols: COLS,
    rows: ROWS,
    cells,
    initialSkills: { multiLaunchCount: 3, tripleSplitCount: 2 },
  };
}

export const TEST_LEVELS: readonly TestLevelDef[] = [
  {
    id: 'm2-gear',
    name: '对称齿轮阵',
    config: toConfig('m2-gear', '对称齿轮阵', buildGearLevel()),
  },
  {
    id: 'm2-gan',
    name: '汉字「干」镂空阵',
    config: toConfig('m2-gan', '汉字「干」镂空阵', rasterize(GAN_ART, 2)),
  },
  {
    id: 'm2-gate',
    name: '双列框体绿砖门',
    config: toConfig('m2-gate', '双列框体绿砖门', buildGateLevel()),
  },
];
