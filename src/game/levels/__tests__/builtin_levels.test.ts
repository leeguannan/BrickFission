import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../../core/GameEngine.js';
import {
  BUILTIN_LEVELS,
  BUILTIN_LEVEL_COUNT,
  getBuiltinLevel,
  getBuiltinRuntimeConfig,
} from '../builtinLevels.js';

describe('builtinLevels 精选关卡库', () => {
  test('恰好 20 关且 COUNT 常量一致', () => {
    assert.equal(BUILTIN_LEVELS.length, 20);
    assert.equal(BUILTIN_LEVEL_COUNT, 20);
  });

  test('id/name 唯一且按序号命名', () => {
    const ids = new Set<string>();
    BUILTIN_LEVELS.forEach((def, i) => {
      ids.add(def.id);
      assert.equal(def.id, `builtin-${String(i + 1).padStart(2, '0')}`);
      assert.ok(def.name.length > 0);
      assert.ok(def.difficultyScore, `关卡 ${def.id} 必须内嵌难度评分`);
    });
    assert.equal(ids.size, 20);
  });

  test('难度分单调不减且符合三带配额（docs/03 §5）', () => {
    const scores = BUILTIN_LEVELS.map((d) => d.difficultyScore!.totalScore);
    for (let i = 1; i < scores.length; i++) {
      assert.ok(scores[i]! >= scores[i - 1]!, `第 ${i + 1} 关分数回落`);
    }
    // 1~5 新手 15~30（纯图腾，无内部钢墙）
    for (let i = 0; i < 5; i++) assert.ok(scores[i]! >= 15 && scores[i]! <= 30);
    // 6~10 钻洞 35~55（图腾 + 带状钢墙迷宫）
    for (let i = 5; i < 10; i++) assert.ok(scores[i]! >= 35 && scores[i]! <= 55);
    // 11~20 高难 60~85（千砖迷宫 / 实心阵）
    for (let i = 10; i < 20; i++) assert.ok(scores[i]! >= 60 && scores[i]! <= 85);
  });

  test('tier 与分数带一致', () => {
    for (const def of BUILTIN_LEVELS) {
      const score = def.difficultyScore!.totalScore;
      const expected = score < 35 ? 'EASY' : score < 56 ? 'MEDIUM' : score < 80 ? 'HARD' : 'EXPERT';
      assert.equal(def.difficultyScore!.tier, expected);
    }
  });

  test('全部内嵌评分无死区/封门警告且含可破坏砖', () => {
    for (const def of BUILTIN_LEVELS) {
      const report = def.difficultyScore!;
      assert.equal(report.hasDeadZoneWarning, false, `${def.id} 存在死区`);
      assert.ok(report.breakableCount > 0, `${def.id} 无可破坏砖`);
      assert.ok(report.simBreakRate20s >= 0 && report.simBreakRate20s <= 1);
    }
  });

  test('getBuiltinLevel 越界与非法入参回退第 0 关', () => {
    assert.equal(getBuiltinLevel(0), BUILTIN_LEVELS[0]);
    assert.equal(getBuiltinLevel(19), BUILTIN_LEVELS[19]);
    assert.equal(getBuiltinLevel(20), BUILTIN_LEVELS[0]);
    assert.equal(getBuiltinLevel(-1), BUILTIN_LEVELS[0]);
    assert.equal(getBuiltinLevel(Number.NaN), BUILTIN_LEVELS[0]);
  });

  test('每关 RuntimeConfig 都能被 GameEngine 构造并推进一帧', () => {
    for (let i = 0; i < BUILTIN_LEVEL_COUNT; i++) {
      const engine = new GameEngine({ level: getBuiltinRuntimeConfig(i), rng: () => 0.5 });
      assert.equal(engine.grid.totalBreakable, BUILTIN_LEVELS[i]!.difficultyScore!.breakableCount);
      engine.setAimAngle(0);
      engine.releaseBall();
      engine.update(1 / 60);
      assert.equal(engine.currentPhase, 'PLAYING');
      assert.ok(engine.activeBallCount >= 1);
    }
  });
});
