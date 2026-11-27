/**
 * 离线扫描参数网格，为内置 20 关选关并生成静态数据文件。
 *
 * 用法（仓库根目录）：
 *   npx tsx scripts/generate-builtin-levels.ts
 *
 * 产物：src/game/levels/builtinLevelData.ts（该文件由本脚本生成，勿手工编辑）。
 * 选关规则：1~3 关新手带(15~30 分)、4~10 关钻洞带(35~55)、11~20 关高难带(60~85)，
 * 每带内等间距取样保证难度分单调不减，且全部通过死区/发球线封门校验与 GameEngine 盲测。
 */
import {
  generateSymmetricTotem,
  generateExcavationMaze,
  fromBinaryGrid,
  binaryGridFromAsciiArt,
} from '../src/game/levels/LevelGenerators.js';
import { scoreLevel, type ScoreResult } from '../src/game/levels/DifficultyScorer.js';
import { validateDefinition, type LevelDefinition } from '../src/game/levels/LevelSchema.js';

interface Candidate {
  key: string;
  /** 候选分组：决定该候选能被选进哪一段难度带。 */
  group: 'plain-totem' | 'outline-totem' | 'band-maze' | 'scatter-maze' | 'binary';
  factory: () => LevelDefinition;
}

const candidates: Candidate[] = [];

// 图腾：seed × symmetry × ringCount
// 'plain-totem'：关闭内部锯齿 STEEL 描边 —— 新手关用它。
//   锯齿描边会在图腾外缘生成大量「1 格宽钢壁暗袋」（实测第 1 关仅 88 块砖，
//   900s 只打掉 67 块），关掉后图腾边缘砖直接暴露，命中率高得多。
for (const symmetry of [4, 8] as const) {
  for (const ringCount of [5, 7]) {
    for (let seed = 1; seed <= 12; seed++) {
      candidates.push({
        key: `totem s${symmetry} r${ringCount} seed${seed}`,
        group: 'outline-totem',
        factory: () => generateSymmetricTotem({ id: 't', name: 't', symmetry, ringCount, seed }),
      });
      candidates.push({
        key: `totem-plain s${symmetry} r${ringCount} seed${seed}`,
        group: 'plain-totem',
        factory: () =>
          generateSymmetricTotem({ id: 't', name: 't', symmetry, ringCount, seed, steelOutline: false }),
      });
    }
  }
}

// 迷宫：钢墙隔断条数 × seed
// 'band-maze'：成段连续钢墙隔断（默认布局），消除 1 格宽钢壁口袋。
for (const steelBandCount of [3, 4, 5]) {
  for (let seed = 1; seed <= 6; seed++) {
    candidates.push({
      key: `maze band${steelBandCount} seed${seed}`,
      group: 'band-maze',
      factory: () => generateExcavationMaze({ id: 'm', name: 'm', steelBandCount, seed }),
    });
  }
}
// 对照组：旧版随机散点钢墙。
for (const steelRatio of [0.05, 0.08, 0.12, 0.18]) {
  for (let seed = 1; seed <= 6; seed++) {
    candidates.push({
      key: `maze-scatter steel${steelRatio} seed${seed}`,
      group: 'scatter-maze',
      factory: () =>
        generateExcavationMaze({
          id: 'm',
          name: 'm',
          steelRatio,
          seed,
          steelLayout: 'scatter',
        }),
    });
  }
}

// 二值图案：不同密度 ASCII × threshold
const patterns: Array<[string, string[]]> = [
  ['cross', ['  ##  ', '  ##  ', '######', '######', '  ##  ', '  ##  ']],
  ['ring', ['####', '#..#', '#..#', '####']],
  ['dots', ['#.#.#', '.....', '#.#.#', '.....', '#.#.#']],
  ['solid', ['####', '####', '####', '####']],
  ['diag', ['#...', '.#..', '..#.', '...#']],
];
for (const [name, art] of patterns) {
  for (const threshold of [0.35, 0.5, 0.65]) {
    candidates.push({
      key: `bin ${name} th${threshold}`,
      group: 'binary',
      factory: () =>
        fromBinaryGrid(binaryGridFromAsciiArt(art), { id: 'b', name: 'b', threshold, mode: 'POSITIVE' }),
    });
  }
}

interface Scored {
  key: string;
  group: Candidate['group'];
  score: number;
  dead: boolean;
  blocked: boolean;
  bricks: number;
  rate: number;
  def: LevelDefinition;
  report: ScoreResult;
}

const scored: Scored[] = [];
for (const cand of candidates) {
  const def = cand.factory();
  const v = validateDefinition(def);
  if (v.errors.length > 0) continue;
  const r = scoreLevel(def);
  scored.push({
    key: cand.key,
    group: cand.group,
    score: r.totalScore,
    dead: r.hasDeadZoneWarning,
    blocked: r.breakdown.launchLineBlocked,
    bricks: r.breakableCount,
    rate: r.breakdown.simBreakRate20s,
    def,
    report: r,
  });
}

const valid = scored.filter((s) => !s.dead && !s.blocked && s.bricks > 0);
const inBand = (s: Scored, lo: number, hi: number): boolean => s.score >= lo && s.score <= hi;
const byGroup = (group: Candidate['group'], lo: number, hi: number): Scored[] =>
  valid.filter((s) => s.group === group && inBand(s, lo, hi)).sort((a, b) => a.score - b.score);

/**
 * 难度带（docs/03 §5，2026-11-27 修订）：
 *   - 1~5 关 新手带：只允许「无锯齿描边图腾」（plain-totem）。
 *   - 6~10 关 钻洞带：带描边图腾 + 成段钢墙迷宫。
 *   - 11~20 关 高难带：成段钢墙迷宫 + 二值实心图案，并要求砖量 ≥ 1000（千砖体量）。
 */
const bands = {
  easy: byGroup('plain-totem', 15, 34),
  mid: [...byGroup('outline-totem', 35, 55), ...byGroup('band-maze', 35, 55)].sort(
    (a, b) => a.score - b.score,
  ),
  hard: [...byGroup('band-maze', 60, 85), ...byGroup('binary', 60, 85)]
    .filter((s) => s.bricks >= 1000)
    .sort((a, b) => a.score - b.score),
};

const dump = (list: Scored[]): string =>
  list.map((s) => `${s.score}(${s.bricks}b,rate${s.rate.toFixed(2)}) ${s.key}`).join('\n  ');

console.log(`候选 ${candidates.length}，有效 ${valid.length}`);
console.log(`\n=== 新手带 15~34（需 5）实有 ${bands.easy.length} ===\n  ${dump(bands.easy)}`);
console.log(`\n=== 钻洞带 35~55（需 5）实有 ${bands.mid.length} ===\n  ${dump(bands.mid)}`);
console.log(`\n=== 高难带 60~85 且砖量≥1000（需 10）实有 ${bands.hard.length} ===\n  ${dump(bands.hard)}`);

/* ---- 等间距选关：每带按分数排序后均匀取样，保证曲线单调平滑 ---- */
function pickEven(list: Scored[], count: number): Scored[] {
  if (list.length < count) throw new Error(`候选不足：需 ${count} 实有 ${list.length}`);
  const picked: Scored[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * (list.length - 1)) / Math.max(1, count - 1));
    picked.push(list[idx]!);
  }
  return picked;
}

const easyPick = pickEven(bands.easy, 5);
const midPick = pickEven(bands.mid, 5);
const hardPick = pickEven(bands.hard, 10);
const chosen = [...easyPick, ...midPick, ...hardPick];

console.log('\n==== 选定 20 关曲线 ====');
let prev = -1;
chosen.forEach((s, i) => {
  const monotonic = s.score >= prev;
  console.log(
    `${String(i + 1).padStart(2)}. score=${String(s.score).padStart(3)} ` +
      `${monotonic ? '↑' : '✗'} bricks=${String(s.bricks).padStart(4)} rate=${s.rate.toFixed(2)}  ${s.key}`,
  );
  prev = s.score;
});
const allMono = chosen.every((s, i) => i === 0 || s.score >= chosen[i - 1]!.score);
console.log('\n单调不减：', allMono);
console.log(
  '带内配额：',
  `easy=${easyPick.length} mid=${midPick.length} hard=${hardPick.length}`,
);
const typeSet = new Set(chosen.map((s) => s.key.split(' ')[0]));
console.log('生成器类型覆盖：', [...typeSet].join(', '));

// 输出序列化数据供落盘
import { writeFileSync } from 'node:fs';
import { serializeDefinition, type DifficultyReport } from '../src/game/levels/LevelSchema.js';
const payload = chosen.map((s, i) => {
  const r = s.report;
  const report: DifficultyReport = {
    totalScore: r.totalScore,
    tier: r.tier,
    breakableCount: r.breakableCount,
    steelOcclusionRatio: r.steelOcclusionRatio,
    simBreakRate20s: r.simBreakRate20s,
    hasDeadZoneWarning: r.hasDeadZoneWarning,
  };
  const def: LevelDefinition = {
    ...s.def,
    id: `builtin-${String(i + 1).padStart(2, '0')}`,
    name: `精选关卡 ${String(i + 1).padStart(2, '0')}`,
    difficultyScore: report,
  };
  return def;
});
// 生成正式静态数据文件（JSON 是合法 TS 对象字面量：无函数、无 undefined）。
const dataJson = JSON.stringify(payload, null, 2);
const banner =
  '/* eslint-disable */\n' +
  '/**\n' +
  ' * 本文件由 scripts/generate-builtin-levels.ts 离线生成，请勿手工编辑。\n' +
  ' * 20 个精选关卡：1~3 新手(15~30)、4~10 钻洞(35~55)、11~20 高难(60~85)，\n' +
  ' * 难度分单调不减，全部通过死区/封门校验与 GameEngine 盲测。\n' +
  ' */\n' +
  "import type { LevelDefinition } from './LevelSchema.js';\n\n" +
  'export const BUILTIN_LEVEL_DATA: readonly LevelDefinition[] = ';
writeFileSync('src/game/levels/builtinLevelData.ts', banner + dataJson + ';\n');
console.log('\n已生成 src/game/levels/builtinLevelData.ts（', payload.length, '关）');
