/**
 * 《碎砖大裂变》(Brick Fission) — 同屏多球性能压测（Milestone 4）
 *
 * 目标：`docs/00_README_AND_EXECUTION_PLAYBOOK.md` 的 M4 完成标志
 * 「300 球同屏性能监控稳定 60 FPS」。
 *
 * ⚠️ 规格说明：内核物理池上限为 `MAX_PHYSICAL_BALLS = 200`
 * （`src/game/core/constants.ts`，来自 `docs/01` 物理规格），
 * 因此本脚本压测的是**引擎可达上限 200 球**；300 球超出内核池容量，
 * 属于文档之间的口径差，已在交付清单中如实标注。
 *
 * 用法：`npm run bench`
 */
import { performance } from 'node:perf_hooks';

import { BASE_BALL_SPEED, BALL_RADIUS, FIXED_DT, MAX_PHYSICAL_BALLS } from '../src/game/core/constants.js';
import { GameEngine } from '../src/game/core/GameEngine.js';
import { getBuiltinRuntimeConfig } from '../src/game/levels/builtinLevels.js';

/** 压测帧数（60 秒 @60FPS）。 */
const FRAMES = 3600;
/** 采样窗口：统计最近 N 帧的耗时分布。 */
const WARMUP = 600;

function main(): void {
  const engine = new GameEngine({ level: getBuiltinRuntimeConfig(0) });
  engine.releaseBall();

  // 填满物理池（200 球）。
  let spawned = 0;
  for (let i = 0; spawned < MAX_PHYSICAL_BALLS && i < 4000; i++) {
    const angle = (i / 4000) * Math.PI * 2;
    const ball = engine.physics.spawnBall(
      360 + Math.cos(angle) * 180,
      300 + Math.sin(angle) * 120,
      BASE_BALL_SPEED * Math.cos(angle),
      BASE_BALL_SPEED * Math.sin(angle),
      BALL_RADIUS,
    );
    if (ball) spawned += 1;
  }
  console.log(`压测球数：${spawned}（内核池上限 ${MAX_PHYSICAL_BALLS}）`);

  const samples: number[] = [];
  let nan = false;
  let replenished = 0;
  for (let frame = 0; frame < FRAMES; frame++) {
    // 稳态压测：每帧把球补齐回池上限，使碰撞/碎砖持续发生（最坏情况）。
    let guard = 0;
    while (engine.activeBallCount < MAX_PHYSICAL_BALLS && guard < 64) {
      const angle = ((replenished + guard) / 97) * Math.PI * 2;
      const ball = engine.physics.spawnBall(
        360 + Math.cos(angle) * 180,
        300 + Math.sin(angle) * 120,
        BASE_BALL_SPEED * Math.cos(angle),
        BASE_BALL_SPEED * Math.sin(angle),
        BALL_RADIUS,
      );
      if (!ball) break;
      replenished += 1;
      guard += 1;
    }

    const t0 = performance.now();
    engine.update(FIXED_DT);
    const cost = performance.now() - t0;
    if (frame >= WARMUP) samples.push(cost);
    if (!Number.isFinite(engine.paddle.x) || engine.physics.balls.some((b) => b.active && !Number.isFinite(b.x))) {
      nan = true;
      break;
    }
  }

  samples.sort((a, b) => a - b);
  const sum = samples.reduce((acc, v) => acc + v, 0);
  const avg = sum / samples.length;
  const p95 = samples[Math.floor(samples.length * 0.95)] ?? 0;
  const max = samples[samples.length - 1] ?? 0;

  console.log(`采样帧数：${samples.length}`);
  console.log(`补充球数（维持满池）：${replenished}`);
  console.log(`平均物理步耗时：${avg.toFixed(3)} ms`);
  console.log(`P95：${p95.toFixed(3)} ms`);
  console.log(`最大：${max.toFixed(3)} ms`);
  console.log(`等效帧率（仅物理步）：${(1000 / Math.max(avg, 0.0001)).toFixed(0)} FPS`);
  console.log(`残留球数：${engine.activeBallCount}`);
  console.log(`NaN 检测：${nan ? '异常' : '通过'}`);

  // 60 FPS 预算：单帧物理步必须 < 16.67ms（且渲染层还有余量）。
  const budget = 1000 / 60;
  if (avg > budget) {
    console.error(`未达标：平均 ${avg.toFixed(3)}ms > ${budget.toFixed(2)}ms`);
    process.exitCode = 1;
  } else {
    console.log(`达标：平均耗时低于 60 FPS 预算 ${budget.toFixed(2)}ms`);
  }
}

main();
