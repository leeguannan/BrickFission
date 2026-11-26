/**
 * 《碎砖大裂变》(Brick Fission) — 定长预分配粒子对象池
 *
 * 契约来源：`docs/02_RENDERER_AUDIO_AND_VISUAL_SPEC.md` §2.2 铁律 3。
 * 容量固定 `MAX_PARTICLES = 300`，构造时一次性分配全部粒子对象，
 * 运行期只通过 `active` 标记与环形游标复用，**永不 push / 永不 new**，
 * 主循环内零临时对象、零数组伸缩（无 GC 压力、无数组泄漏）。
 */

export const MAX_PARTICLES = 300;

/** 单块微砖块碎裂时生成的粒子数区间（2~3 个微型像素块）。 */
export const PARTICLES_PER_BRICK_MIN = 2;
export const PARTICLES_PER_BRICK_MAX = 3;

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 剩余生命（秒）。 */
  life: number;
  /** 总生命（秒），用于 alpha 衰减。 */
  maxLife: number;
  size: number;
  /** 颜色字符串索引（由渲染器映射到预烘焙碎块贴图）。 */
  colorIndex: number;
  rotation: number;
  rotationSpeed: number;
}

/** 粒子默认重力（px/s²，碎裂像素块轻微下坠）。 */
const PARTICLE_GRAVITY = 520;
/** 粒子寿命区间（秒）。 */
const LIFE_MIN = 0.28;
const LIFE_MAX = 0.55;
/** 粒子像素块边长区间（逻辑 px）。 */
const SIZE_MIN = 3;
const SIZE_MAX = 6;
/** 初速度区间（px/s）。 */
const SPEED_MIN = 60;
const SPEED_MAX = 240;

export class ParticlePool {
  /** 定长缓冲，构造后长度恒为 MAX_PARTICLES。 */
  readonly particles: Particle[] = [];
  /** 环形分配游标：池满时覆盖最老粒子。 */
  private cursor = 0;
  private readonly rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: SIZE_MIN,
        colorIndex: 0,
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  /** 当前活跃粒子数（调试/测试用）。 */
  get activeCount(): number {
    let n = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.particles[i]!.active) n++;
    }
    return n;
  }

  /**
   * 在 `(x, y)` 处爆发 `count` 个碎块粒子。
   * 池满时环形覆盖最老粒子，保证数组长度永不增长。
   */
  spawn(x: number, y: number, colorIndex: number, count: number): void {
    const n = Math.max(0, Math.min(MAX_PARTICLES, Math.floor(count)));
    for (let i = 0; i < n; i++) {
      const particle = this.particles[this.cursor]!;
      this.cursor = (this.cursor + 1) % MAX_PARTICLES;

      const angle = this.rng() * Math.PI * 2;
      const speed = SPEED_MIN + this.rng() * (SPEED_MAX - SPEED_MIN);
      const maxLife = LIFE_MIN + this.rng() * (LIFE_MAX - LIFE_MIN);
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 60; // 略微向上炸出
      particle.life = maxLife;
      particle.maxLife = maxLife;
      particle.size = SIZE_MIN + Math.floor(this.rng() * (SIZE_MAX - SIZE_MIN + 1));
      particle.colorIndex = colorIndex;
      particle.rotation = this.rng() * Math.PI * 2;
      particle.rotationSpeed = (this.rng() - 0.5) * 12;
    }
  }

  /** 推进全部活跃粒子（定长遍历，无分配）。 */
  update(dt: number): void {
    if (dt <= 0) return;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i]!;
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += PARTICLE_GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;
    }
  }

  /** 清空全部粒子（切关/重开时调用）。 */
  clear(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i]!.active = false;
    }
    this.cursor = 0;
  }
}
