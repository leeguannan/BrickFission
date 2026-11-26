/**
 * 内置精选关卡库（Milestone 3）。
 *
 * 数据由 scripts/probe-builtin.ts 离线筛选并写入 builtinLevelData.ts：
 *   - 共 20 关，难度分单调不减；
 *   - 1~3 新手(15~30)、4~10 钻洞(35~55)、11~20 高难(60~85)；
 *   - 每关都通过 BFS 死区/发球线封门校验与 GameEngine 盲测。
 *
 * 本模块只做加载期校验与运行时访问，不含生成逻辑，保证主包零评分开销。
 */
import type { LevelRuntimeConfig } from '../core/types.js';
import { BUILTIN_LEVEL_DATA } from './builtinLevelData.js';
import { toRuntimeConfig, validateDefinition, type LevelDefinition } from './LevelSchema.js';

/** 模块加载期一次性校验：静态数据若被破坏，立即 fail-fast，不把废关带进运行时。 */
const hydrated: readonly LevelDefinition[] = BUILTIN_LEVEL_DATA.map((def, index) => {
  const result = validateDefinition(def);
  if (result.errors.length > 0) {
    throw new Error(`内置关卡 #${index + 1}(${def.id}) 校验失败: ${result.errors.join('; ')}`);
  }
  return def;
});

/** 20 个精选关卡（只读）。 */
export const BUILTIN_LEVELS: readonly LevelDefinition[] = hydrated;

/** 内置关卡数量。 */
export const BUILTIN_LEVEL_COUNT: number = hydrated.length;

/**
 * 按索引取内置关卡，越界回退到第 0 关，保证 UI 与引擎永远拿到合法定义。
 */
export function getBuiltinLevel(index: number): LevelDefinition {
  const safe = Number.isInteger(index) && index >= 0 && index < hydrated.length ? index : 0;
  return hydrated[safe]!;
}

/**
 * 按索引取可直接喂给 GameEngine 的运行时配置（cells 路径，保留 dropTag）。
 */
export function getBuiltinRuntimeConfig(index: number): LevelRuntimeConfig {
  return toRuntimeConfig(getBuiltinLevel(index));
}
