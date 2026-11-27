/**
 * 内置关卡的机器人推荐打法（每关一条）—— **自动生成，请勿手工编辑**。
 *
 * 由 `scripts/calibrate-level-strategies.ts` 离线标定生成：
 * 对每关在「候选目标策略 × 候选残局阈值」的参数网格上各跑一次
 * 240s 虚拟时长的完整回归，取最快通关者。重生成命令：
 * `npx tsx scripts/calibrate-level-strategies.ts`
 *
 * 为什么残局阈值也要逐关标定：残局模式会把球群收缩到「单球精度」
 * （单球出射角误差 P90 只有 0.25°，12 球时高达 29°），精度大幅提升，
 * 但代价是吞吐下降。实测第 12 关在剩余 20% 时就需要收缩（0.12 时差 1 块
 * 没清掉，0.2 时立刻通关），而第 19 关能稳定打到 99%（0.2 时反而退回
 * 97.4%）—— 一个全局阈值对不同关卡并不通用。
 */
import type { BotStrategy } from '../ai/BotBrain.js';

export interface BuiltinLevelStrategy {
  /** 目标选取策略（见 `BotBrain` 的 `BotStrategy`）。 */
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
  { strategy: 'slanted', endgameRatio: 0.2, minGroupBalls: 32 },
  { strategy: 'gap', endgameRatio: 0.2, minGroupBalls: 32 },
  { strategy: 'deep', endgameRatio: 0.3, minGroupBalls: 16, aimWeight: 1 },
  { strategy: 'slanted', endgameRatio: 0.2, minGroupBalls: 24 },
  { strategy: 'onsight', endgameRatio: 0.08, minGroupBalls: 16 },
  { strategy: 'deep', endgameRatio: 0.05, minGroupBalls: 32, aimWeight: 1.5 },
  { strategy: 'widest', endgameRatio: 0.12, minGroupBalls: 16, aimWeight: 1.5 },
  { strategy: 'reflect', endgameRatio: 0.2, minGroupBalls: 8, aimWeight: 1 },
  { strategy: 'breach', endgameRatio: 0.05, minGroupBalls: 24, aimWeight: 1.5 },
  { strategy: 'reflect', endgameRatio: 0.2, minGroupBalls: 16, aimWeight: 1 },
  { strategy: 'slanted', endgameRatio: 0.12 },
  { strategy: 'slanted', endgameRatio: 0.08 },
  { strategy: 'reflect', endgameRatio: 0.08 },
  { strategy: 'reflect', endgameRatio: 0.08, minGroupBalls: 32, aimWeight: 1 },
  { strategy: 'reflect', endgameRatio: 0.12 },
  { strategy: 'reflect', endgameRatio: 0.12, minGroupBalls: 24 },
  { strategy: 'reflect', endgameRatio: 0.08, minGroupBalls: 24 },
  { strategy: 'widest', endgameRatio: 0.3 },
  { strategy: 'breach', endgameRatio: 0.1 },
  { strategy: 'deep', endgameRatio: 0.08 },
];

/** 取某关的推荐打法；越界或缺省时回退默认档。 */
export function getBuiltinLevelStrategy(index: number): BuiltinLevelStrategy {
  const picked = BUILTIN_LEVEL_STRATEGIES[index];
  if (!picked) return DEFAULT_BUILTIN_LEVEL_STRATEGY;
  return picked;
}
