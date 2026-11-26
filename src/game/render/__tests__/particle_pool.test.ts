/**
 * 《碎砖大裂变》(Brick Fission) — ParticlePool 定长对象池单测
 *
 * 验证 docs/02 §2.2 铁律 3：MAX_PARTICLES=300 预分配、环形覆盖、
 * 运行期数组长度永不增长、生命到期自动失活。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_PARTICLES,
  PARTICLES_PER_BRICK_MAX,
  PARTICLES_PER_BRICK_MIN,
  ParticlePool,
} from '../ParticlePool.js';

test('构造即预分配 300 个粒子且全部失活', () => {
  const pool = new ParticlePool();
  assert.equal(pool.particles.length, MAX_PARTICLES);
  assert.equal(MAX_PARTICLES, 300);
  assert.equal(pool.activeCount, 0);
  for (const p of pool.particles) {
    assert.equal(p.active, false);
  }
});

test('spawn 激活指定数量并写入位置/寿命/速度', () => {
  const pool = new ParticlePool(() => 0.5);
  pool.spawn(100, 200, 2, 3);
  assert.equal(pool.activeCount, 3);
  const active = pool.particles.filter((p) => p.active);
  assert.equal(active.length, 3);
  for (const p of active) {
    assert.equal(p.x, 100);
    assert.equal(p.y, 200);
    assert.equal(p.colorIndex, 2);
    assert.ok(p.life > 0 && p.life === p.maxLife);
    assert.ok(Math.hypot(p.vx, p.vy) > 0);
  }
});

test('单砖碎裂粒子数被夹在 2~3 区间（由渲染层负责，常量契约校验）', () => {
  assert.equal(PARTICLES_PER_BRICK_MIN, 2);
  assert.equal(PARTICLES_PER_BRICK_MAX, 3);
});

test('池满后环形覆盖最老粒子，数组长度永不增长', () => {
  const pool = new ParticlePool(() => 0.5);
  // 每次 1 个，连续灌满 300 次
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pool.spawn(i, i, 0, 1);
  }
  assert.equal(pool.particles.length, MAX_PARTICLES);
  assert.equal(pool.activeCount, MAX_PARTICLES);

  // 再爆发 10 个：仍为 300 容量，且新位置写入成功（覆盖最老槽位）
  pool.spawn(700, 800, 5, 10);
  assert.equal(pool.particles.length, MAX_PARTICLES);
  assert.equal(pool.activeCount, MAX_PARTICLES);
  const atNewPos = pool.particles.filter((p) => p.x === 700 && p.y === 800);
  assert.equal(atNewPos.length, 10);
});

test('update 推进生命与重力，超过最大寿命后全部失活', () => {
  const pool = new ParticlePool(() => 0.5);
  pool.spawn(50, 50, 0, 3);
  const before = pool.particles.filter((p) => p.active);
  const vyBefore = before.map((p) => p.vy);

  // 单步 0.01s：生命下降、重力累加到 vy
  pool.update(0.01);
  assert.equal(pool.activeCount, 3);
  before.forEach((p, i) => {
    assert.ok(p.vy > vyBefore[i]!);
  });

  // 寿命上限 0.55s，推进 1s 后必然全部失活
  pool.update(1);
  assert.equal(pool.activeCount, 0);
  assert.equal(pool.particles.length, MAX_PARTICLES); // 失活不缩容
});

test('非正 dt 不推进，clear 一次性清空且游标归零', () => {
  const pool = new ParticlePool();
  pool.spawn(1, 1, 0, 3);
  pool.update(0);
  assert.equal(pool.activeCount, 3);

  pool.clear();
  assert.equal(pool.activeCount, 0);
  for (const p of pool.particles) assert.equal(p.active, false);

  // clear 后仍可正常分配
  pool.spawn(2, 2, 1, 2);
  assert.equal(pool.activeCount, 2);
});
