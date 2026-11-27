/**
 * 《碎砖大裂变》(Brick Fission) — 每关机器人打法离线标定
 *
 * 目的：20 关回归机器人实测发现**没有任何单一策略能通吃全部关卡**
 * （`deep` 通 {01,02,03,05,19,20}、`dense` 通 {01,02,04,05,07,18}、
 * `breach` 通 {01,02,03,07,11,18,19}、`gap` 通 {01,03,04,18}、
 * `slanted` 通 {01,03,05,12,18}、`onsight` 通 {01,02,04,18}），
 * 差异来自关卡结构（实心阵 / 随机通道阵 / 悬空图案）。
 *
 * 「每球使用不同策略」实测更差（第 06 关 90.8% → 39.9%），因此把
 * 「这关该怎么打」固化为关卡元数据。
 *
 * **两个维度都要标定**：
 *   1. 目标策略（deep / gap / breach / …）；
 *   2. 残局阈值 endgameRatio —— 残局模式把球群收缩到单球（出射角精度
 *      大幅提升但吞吐下降），而不同关卡需要收缩的时机不同
 *      （第 12 关剩 20% 就得收缩，第 19 关能稳定打到 99% 反而不能早收缩）。
 *
 * 本脚本对每关在参数网格上各跑一次 240s 虚拟时长的完整回归，
 * 取**最快通关**者写入 `src/game/levels/builtinLevelStrategies.ts`。
 *
 * 用法：`npx tsx scripts/calibrate-level-strategies.ts`
 * 环境变量：
 *   BF_CALIB_LEVELS      只标定指定关卡（逗号分隔的 1 基下标）
 *   BF_CALIB_STRATEGIES  候选策略（逗号分隔，默认 8 种）
 *   BF_CALIB_RATIOS      候选残局阈值（逗号分隔，默认 0.08,0.12,0.2,0.3）
 *   BF_CALIB_JOBS        并发进程数（默认 4）
 *   BF_CALIB_FULL        设为 1 时跑「策略 × 阈值」全网格（640 次，很慢）；
 *                        默认只固定每关现有策略、只扫阈值（80 次）
 *   BF_CALIB_DRY         设为 1 时只打印结果、不写文件
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BUILTIN_LEVEL_STRATEGIES } from '../src/game/levels/builtinLevelStrategies.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TSX = path.join(ROOT, 'node_modules', '.bin', 'tsx');
const RUNNER = path.join(ROOT, 'scripts', 'test-levels-playthrough.ts');
const OUTPUT = path.join(ROOT, 'src', 'game', 'levels', 'builtinLevelStrategies.ts');

const CANDIDATES = (
  process.env['BF_CALIB_STRATEGIES'] ?? 'deep,gap,widest,breach,dense,onsight,slanted,reflect'
)
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const RATIOS = (process.env['BF_CALIB_RATIOS'] ?? '0.08,0.12,0.2,0.3')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0 && n <= 1);

/**
 * 候选「目标球群规模下限」（逗号分隔）。
 *
 * 球群规模是第三个影响通关的维度：实测第 16 关在 `deep` + 16 球时能通关，
 * 而 40 球时只有 77.6% —— 球太多接不住（漏球 → 球群塌缩），球太少清不完千砖关。
 */
const GROUP_SIZES = (process.env['BF_CALIB_GROUP_SIZES'] ?? '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);

/**
 * 候选「瞄准权重」（逗号分隔）。
 *
 * 瞄准权重决定接球决策里「接住更多球」与「把球打向目标」之间的取舍：
 * 权重低 → 更偏接球（吞吐高但打不中），权重高 → 更偏瞄准（精度高但漏球多）。
 */
const AIM_WEIGHTS = (process.env['BF_CALIB_AIM_WEIGHTS'] ?? '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);

const JOBS = Number(process.env['BF_CALIB_JOBS'] ?? 4);
const DRY = process.env['BF_CALIB_DRY'] === '1';
const FULL = process.env['BF_CALIB_FULL'] === '1';
const LEVELS = (process.env['BF_CALIB_LEVELS'] ?? '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0);

interface Attempt {
  level: number;
  strategy: string;
  endgameRatio: number;
  minGroupBalls: number;
  aimWeight: number;
  won: boolean;
  seconds: number;
  destroyed: number;
  total: number;
  ratio: number;
}

/** 解析单关输出行：`第 07 关 builtin-07   ✔ 通关 用时    241s 破砖   198/  198 (100.0%) ...` */
function parseLine(line: string): Attempt | null {
  const m = /^第\s+(\d+)\s+关\s+\S+\s+([✔·✘])\s*(通关|未通关|失败)\s+用时\s+([\d.]+)s\s+破砖\s+(\d+)\/\s*(\d+)/.exec(
    line,
  );
  if (!m) return null;
  const destroyed = Number(m[5]);
  const total = Number(m[6]);
  return {
    level: Number(m[1]),
    strategy: '',
    endgameRatio: 0,
    won: m[2] === '✔',
    seconds: Number(m[4]),
    destroyed,
    total,
    ratio: total > 0 ? destroyed / total : 0,
  };
}

function runOne(
  level: number,
  strategy: string,
  endgameRatio: number,
  minGroupBalls: number,
  aimWeight: number,
): Promise<Attempt | null> {
  return new Promise((resolve) => {
    const child = spawn(
      TSX,
      [RUNNER],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          BF_BOT_LEVELS: String(level),
          BF_BOT_STRATEGY: strategy,
          BF_BOT_ENDGAME_SWITCH_RATIO: String(endgameRatio),
          BF_BOT_MIN_GROUP_BALLS: String(minGroupBalls),
          BF_BOT_AIM_WEIGHT: String(aimWeight),
          BF_BOT_REQUIRE_ALL_WON: '0',
          BF_BOT_MIN_PROGRESS: '0',
        },
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    let out = '';
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString();
    });
    child.on('close', () => {
      for (const line of out.split('\n')) {
        const parsed = parseLine(line);
        if (parsed) {
          parsed.strategy = strategy;
          parsed.endgameRatio = endgameRatio;
          parsed.minGroupBalls = minGroupBalls;
          parsed.aimWeight = aimWeight;
          resolve(parsed);
          return;
        }
      }
      resolve(null);
    });
  });
}

async function main(): Promise<void> {
  const levelList = LEVELS.length > 0 ? LEVELS : Array.from({ length: 20 }, (_, i) => i + 1);
  const targets: Array<{
    level: number;
    strategy: string;
    ratio: number;
    group: number;
    aim: number;
  }> = [];
  const groups = GROUP_SIZES.length > 0 ? GROUP_SIZES : [0];
  const aims = AIM_WEIGHTS.length > 0 ? AIM_WEIGHTS : [0];
  for (const level of levelList) {
    const plan = BUILTIN_LEVEL_STRATEGIES[level - 1];
    const knownStrategy = plan?.strategy ?? 'deep';
    const knownRatio = plan?.endgameRatio ?? 0.12;
    if (FULL) {
      // 全策略扫描：固定该关**当前**残局阈值，只换目标策略
      // （阈值维度由「阈值扫描模式」单独标定，避免组合爆炸）。
      for (const strategy of CANDIDATES) {
        for (const group of groups) {
          for (const aim of aims) targets.push({ level, strategy, ratio: knownRatio, group, aim });
        }
      }
    } else if (groups.length > 1 && RATIOS.length > 1) {
      // 扫「残局阈值 × 球群规模」：固定该关现有策略。
      for (const ratio of RATIOS) {
        for (const group of groups) {
          targets.push({ level, strategy: knownStrategy, ratio, group, aim: 0 });
        }
      }
    } else if (groups.length > 1 || aims.length > 1) {
      // 扫「球群规模 × 瞄准权重」：固定该关现有策略与残局阈值。
      for (const group of groups) {
        for (const aim of aims) {
          targets.push({ level, strategy: knownStrategy, ratio: knownRatio, group, aim });
        }
      }
    } else {
      // 默认：固定该关现有策略，只扫残局阈值。
      for (const ratio of RATIOS) targets.push({ level, strategy: knownStrategy, ratio, group: 0, aim: 0 });
    }
  }

  const results: Attempt[] = [];
  let cursor = 0;
  let done = 0;
  const workers = Array.from({ length: Math.max(1, JOBS) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= targets.length) return;
      const target = targets[index]!;
      const attempt = await runOne(
        target.level,
        target.strategy,
        target.ratio,
        target.group,
        target.aim,
      );
      done++;
      if (attempt) {
        results.push(attempt);
        process.stdout.write(
          `[${done}/${targets.length}] 第 ${attempt.level} 关 ${attempt.strategy.padEnd(9)} ` +
            `r=${attempt.endgameRatio} g=${attempt.minGroupBalls} a=${attempt.aimWeight} ` +
            `${attempt.won ? '✔ 通关' : '· 未通关'} ` +
            `${attempt.seconds.toFixed(1)}s ${attempt.destroyed}/${attempt.total} ` +
            `(${(attempt.ratio * 100).toFixed(1)}%)\n`,
        );
      } else {
        process.stdout.write(`[${done}/${targets.length}] 第 ${target.level} 关 解析失败\n`);
      }
    }
  });
  await Promise.all(workers);

  // 每关取最优：先看是否通关，再看破砖率，最后看用时。
  const best = new Map<number, Attempt>();
  for (const attempt of results) {
    const current = best.get(attempt.level);
    if (!current) {
      best.set(attempt.level, attempt);
      continue;
    }
    const better =
      attempt.won !== current.won
        ? attempt.won
        : Math.abs(attempt.ratio - current.ratio) > 1e-9
          ? attempt.ratio > current.ratio
          : attempt.seconds < current.seconds;
    if (better) best.set(attempt.level, attempt);
  }

  const wonLevels = Array.from(best.values()).filter((a) => a.won).length;
  process.stdout.write(`\n标定结果：${wonLevels}/${best.size} 关在候选参数中存在通关解\n`);
  for (const level of levelList) {
    const attempt = best.get(level);
    process.stdout.write(
      `  第 ${String(level).padStart(2, '0')} 关 → ` +
        (attempt
          ? `${attempt.strategy.padEnd(9)} r=${attempt.endgameRatio} ` +
            `${attempt.won ? '✔ 通关' : '· 未通关'} ${(attempt.ratio * 100).toFixed(1)}%`
          : '· 无数据') +
        '\n',
    );
  }

  if (DRY) {
    process.stdout.write('\nBF_CALIB_DRY=1，未写入文件。\n');
    return;
  }

  // 与旧表合并：本轮没跑到的关卡保留原条目（避免局部标定把表写残）。
  const merged = BUILTIN_LEVEL_STRATEGIES.slice();
  for (const level of levelList) {
    const attempt = best.get(level);
    const previous = merged[level - 1];
    const strategy = attempt?.strategy ?? previous?.strategy ?? 'deep';
    const ratio = attempt?.endgameRatio ?? previous?.endgameRatio ?? 0.12;
    // group / aim 为 0 表示「本轮没扫这个维度」→ 沿用旧表的值。
    const group = attempt && attempt.minGroupBalls > 0 ? attempt.minGroupBalls : (previous?.minGroupBalls ?? 0);
    const aim = attempt && attempt.aimWeight > 0 ? attempt.aimWeight : (previous?.aimWeight ?? 0);
    merged[level - 1] = { strategy, endgameRatio: ratio, minGroupBalls: group, aimWeight: aim };
  }
  const body = merged
    .map((plan) => {
      const extras: string[] = [];
      if (plan.minGroupBalls && plan.minGroupBalls > 0) extras.push(`minGroupBalls: ${plan.minGroupBalls}`);
      if (plan.aimWeight && plan.aimWeight > 0) extras.push(`aimWeight: ${plan.aimWeight}`);
      const suffix = extras.length > 0 ? `, ${extras.join(', ')}` : '';
      return `  { strategy: '${plan.strategy}', endgameRatio: ${plan.endgameRatio}${suffix} },`;
    })
    .join('\n');
  const file = `/**
 * 内置关卡的机器人推荐打法（每关一条）—— **自动生成，请勿手工编辑**。
 *
 * 由 \`scripts/calibrate-level-strategies.ts\` 离线标定生成：
 * 对每关在「候选目标策略 × 候选残局阈值」的参数网格上各跑一次
 * 240s 虚拟时长的完整回归，取最快通关者。重生成命令：
 * \`npx tsx scripts/calibrate-level-strategies.ts\`
 *
 * 为什么残局阈值也要逐关标定：残局模式会把球群收缩到「单球精度」
 * （单球出射角误差 P90 只有 0.25°，12 球时高达 29°），精度大幅提升，
 * 但代价是吞吐下降。实测第 12 关在剩余 20% 时就需要收缩（0.12 时差 1 块
 * 没清掉，0.2 时立刻通关），而第 19 关能稳定打到 99%（0.2 时反而退回
 * 97.4%）—— 一个全局阈值对不同关卡并不通用。
 */
import type { BotStrategy } from '../ai/BotBrain.js';

export interface BuiltinLevelStrategy {
  /** 目标选取策略（见 \`BotBrain\` 的 \`BotStrategy\`）。 */
  strategy: BotStrategy;
  /** 进入残局（单球精度）模式的剩余砖比例阈值。 */
  endgameRatio: number;
  /** 目标球群规模（块）。缺省时按砖量自动折算。 */
  minGroupBalls?: number;
  /** 瞄准权重（接球 vs 瞄准的取舍）。缺省时用脚本默认值 1.5。 */
  aimWeight?: number;
}

/** 越界或缺省时的兜底打法。 */
export const DEFAULT_BUILTIN_LEVEL_STRATEGY: BuiltinLevelStrategy = {
  strategy: 'deep',
  endgameRatio: 0.12,
};

export const BUILTIN_LEVEL_STRATEGIES: readonly BuiltinLevelStrategy[] = [
${body}
];

/** 取某关的推荐打法；越界或缺省时回退默认档。 */
export function getBuiltinLevelStrategy(index: number): BuiltinLevelStrategy {
  const picked = BUILTIN_LEVEL_STRATEGIES[index];
  if (!picked) return DEFAULT_BUILTIN_LEVEL_STRATEGY;
  return picked;
}
`;
  writeFileSync(OUTPUT, file, 'utf8');
  process.stdout.write(`\n已写入 ${path.relative(ROOT, OUTPUT)}\n`);
}

void main();
