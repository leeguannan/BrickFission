/**
 * 《碎砖大裂变》(Brick Fission) — 物理引擎
 *
 * 实现 `docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md` §3 的全部要点：
 *   - §3.2 Sub-stepping（步长细分）铁律：单子步位移 ≤ 半径 × 0.45，杜绝穿墙；
 *   - §3.3 $O(1)$ 网格空间碰撞：包围盒 → 网格索引直查（通常 1~4 格）；
 *   - §3.3 Ghost Vertex 防护：主碰撞面选择 + 单次轴向反弹 + 完全推出；
 *   - §3.4 挡板 68° 偏转角映射（禁止纯镜面 `vy = -vy`）；
 *   - §3.5 最小垂直分量保护 + 久未破砖自救偏转。
 *
 * 纯 TypeScript：禁止出现任何宿主环境 API。
 */

import {
  ANGLE_EPSILON,
  BALL_RADIUS,
  BASE_BALL_SPEED,
  CONTACT_EPSILON,
  DEADLOCK_BOUNCE_LIMIT,
  DEADLOCK_JITTER_DEG_MAX,
  DEADLOCK_JITTER_DEG_MIN,
  DEATH_LINE_Y,
  FEVER_COMBO_BONUS,
  MAX_PHYSICAL_BALLS,
  MIN_VERTICAL_RATIO,
  MIN_VERTICAL_RATIO_ENFORCED,
  PADDLE_CONTACT_GAP,
  PADDLE_MAX_DEFLECT_DEG,
  SUBSTEP_DISPLACEMENT_RATIO,
  WALL_LEFT,
  WALL_RIGHT,
  WALL_TOP,
  brickColorAt,
} from './constants.js';
import { BrickGrid } from './BrickGrid.js';
import type { Ball, BrickCell, GameEvent, Paddle } from './types.js';

/**
 * 物理世界宿主接口。
 * 由 `GameEngine` 实现；内核物理层不直接依赖引擎，便于 Headless 盲测复用。
 */
export interface PhysicsWorld {
  readonly grid: BrickGrid;
  readonly paddle: Paddle;
  /** 当前全局伤害倍率（技能溢出时 > 1）。 */
  damageMultiplier(): number;
  /** 事件出口。 */
  emit(event: GameEvent): void;
  /** 砖块被击碎后的回调（用于胜负判定）。 */
  onBrickDestroyed(col: number, row: number): void;
  /** 撞击墙面或挡板后的回调（残局软追踪用）。 */
  onBoundaryBounce(ball: Ball): void;
  /**
   * Fever 暴走的伤害倍率（Milestone 5 / Step 2）。
   *
   * 未开启 Fever 时必须返回 1（默认值）。物理层只把该倍率施加给
   * **已受损的砖**，以保证 1 血 / 2 血砖的破碎时序与基线完全一致
   * （详见 `constants.ts` 中 `FEVER_DAMAGE_MULTIPLIER` 的说明）。
   */
  feverDamageMultiplier?(): number;
  /**
   * 特殊砖（BOMB / PRISM / CORE）被击碎后的回调（Milestone 5 / Step 2）。
   *
   * 可选实现：未提供时特殊砖退化为「仅摧毁」的普通砖，行为向后兼容。
   */
  onSpecialBrickDestroyed?(
    role: 'BOMB' | 'PRISM' | 'CORE',
    col: number,
    row: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
  ): void;
  /** 挡板有效回弹回调（精准接球 / Fever 能量累计用）。 */
  onPaddleHit?(offsetRatio: number): void;
}

/** 候选碰撞的复用对象（零 GC）。 */
interface CandidateHit {
  col: number;
  row: number;
  /** 分离轴法线（单位向量，仅在单轴上有分量）。 */
  nx: number;
  ny: number;
  /** 穿透深度（沿分离轴）。 */
  depth: number;
  /** 分离轴。 */
  axis: 'x' | 'y';
  /** 正面度：1 = 迎面撞击，0 = 擦边。 */
  frontality: number;
  cell: BrickCell;
}

export class PhysicsEngine {
  /** 固定容量球池（对象复用，零 GC）。 */
  readonly balls: Ball[];
  /** 最大同屏物理球数。 */
  readonly maxBalls: number;

  private readonly world: PhysicsWorld;
  private nextBallId = 1;
  /** 候选碰撞对象池（每次碰撞检测复用，最多 4~9 个）。 */
  private readonly candidates: CandidateHit[] = [];
  /** 连续击碎砖块的连击数。 */
  private combo = 0;
  /** 随机源（可注入，便于确定性测试）。 */
  private readonly rng: () => number;

  constructor(world: PhysicsWorld, options?: { maxBalls?: number; rng?: () => number }) {
    this.world = world;
    this.maxBalls = Math.max(1, Math.min(options?.maxBalls ?? MAX_PHYSICAL_BALLS, MAX_PHYSICAL_BALLS));
    this.rng = options?.rng ?? Math.random;

    for (let i = 0; i < MAX_PHYSICAL_BALLS; i++) {
      this.candidates.push({
        col: 0,
        row: 0,
        nx: 0,
        ny: 0,
        depth: 0,
        axis: 'x',
        frontality: 0,
        cell: { role: 'EMPTY', hp: 0, maxHp: 0, colorIndex: 0 },
      });
    }

    this.balls = new Array<Ball>(MAX_PHYSICAL_BALLS);
    for (let i = 0; i < MAX_PHYSICAL_BALLS; i++) {
      this.balls[i] = {
        id: 0,
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        pierceCount: 0,
        bouncesSinceBrick: 0,
      };
    }
  }

  /* ---------------------------------------------------------------- */
  /* 球池                                                              */
  /* ---------------------------------------------------------------- */

  /** 激活一颗球；池满时返回 null（调用方负责溢出处理）。 */
  spawnBall(x: number, y: number, vx: number, vy: number, radius = BALL_RADIUS): Ball | null {
    if (this.activeBallCount >= this.maxBalls) return null;
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      if (!ball || ball.active) continue;
      ball.active = true;
      ball.id = this.nextBallId++;
      ball.x = x;
      ball.y = y;
      ball.vx = vx;
      ball.vy = vy;
      ball.radius = radius;
      ball.pierceCount = 0;
      ball.bouncesSinceBrick = 0;
      return ball;
    }
    return null;
  }

  /** 当前活跃球数量。 */
  get activeBallCount(): number {
    let count = 0;
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      if (ball && ball.active) count++;
    }
    return count;
  }

  /** 池中剩余可用槽位。 */
  get freeSlots(): number {
    return this.maxBalls - this.activeBallCount;
  }

  /** 清空所有球。 */
  reset(): void {
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      if (ball) ball.active = false;
    }
    this.combo = 0;
  }

  /** 当前连击数。 */
  get currentCombo(): number {
    return this.combo;
  }

  /* ---------------------------------------------------------------- */
  /* 主循环                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * 推进一个逻辑帧。
   *
   * Sub-stepping（§3.2）：
   *   `maxDisp = speed * dt`，`subSteps = max(1, ceil(maxDisp / (radius * 0.45)))`，
   *   每子步位移不超过半径的 45%，杜绝任何角度的穿墙。
   */
  step(dt: number): void {
    if (!(dt > 0)) return;
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      if (!ball || !ball.active) continue;

      const speed = Math.hypot(ball.vx, ball.vy);
      const maxDisp = speed * dt;
      const safeDisp = ball.radius * SUBSTEP_DISPLACEMENT_RATIO;
      let subSteps = 1;
      if (safeDisp > 0 && maxDisp > 0) {
        subSteps = Math.max(1, Math.ceil(maxDisp / safeDisp));
      }
      const subDt = dt / subSteps;

      for (let s = 0; s < subSteps; s++) {
        if (!ball.active) break;
        ball.x += ball.vx * subDt;
        ball.y += ball.vy * subDt;

        this.collideWalls(ball);
        this.collideBricks(ball);
        this.collidePaddle(ball);

        if (ball.y - ball.radius > DEATH_LINE_Y) {
          this.killBall(ball);
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* 世界三面墙                                                        */
  /* ---------------------------------------------------------------- */

  private collideWalls(ball: Ball): void {
    let hit = false;

    if (ball.x - ball.radius < WALL_LEFT) {
      ball.x = WALL_LEFT + ball.radius + CONTACT_EPSILON;
      ball.vx = Math.abs(ball.vx);
      hit = true;
      this.world.emit({ type: 'WALL_HIT', x: ball.x, y: ball.y });
    } else if (ball.x + ball.radius > WALL_RIGHT) {
      ball.x = WALL_RIGHT - ball.radius - CONTACT_EPSILON;
      ball.vx = -Math.abs(ball.vx);
      hit = true;
      this.world.emit({ type: 'WALL_HIT', x: ball.x, y: ball.y });
    }

    if (ball.y - ball.radius < WALL_TOP) {
      ball.y = WALL_TOP + ball.radius + CONTACT_EPSILON;
      ball.vy = Math.abs(ball.vy);
      hit = true;
      // 顶边墙计入"久未破砖自救"计数。
      ball.bouncesSinceBrick++;
      this.world.emit({ type: 'WALL_HIT', x: ball.x, y: ball.y });
      this.applyDeadlockEscape(ball);
    }

    if (hit) {
      this.applyMinimumVerticalComponent(ball);
      this.world.onBoundaryBounce(ball);
    }
  }

  /* ---------------------------------------------------------------- */
  /* 砖块碰撞（$O(1)$ 网格直查）                                       */
  /* ---------------------------------------------------------------- */

  private collideBricks(ball: Ball): void {
    const grid = this.world.grid;
    const r = ball.radius;

    // 包围盒 → 网格索引范围（通常 1~4 格）
    let colMin = grid.colAt(ball.x - r);
    let colMax = grid.colAt(ball.x + r);
    let rowMin = grid.rowAt(ball.y - r);
    let rowMax = grid.rowAt(ball.y + r);
    if (colMax < colMin) colMax = colMin;
    if (rowMax < rowMin) rowMax = rowMin;
    if (colMin < 0) colMin = 0;
    if (rowMin < 0) rowMin = 0;
    if (colMax > grid.cols - 1) colMax = grid.cols - 1;
    if (rowMax > grid.rows - 1) rowMax = grid.rows - 1;

    let count = 0;
    for (let row = rowMin; row <= rowMax; row++) {
      for (let col = colMin; col <= colMax; col++) {
        const cell = grid.at(col, row);
        if (!cell || cell.role === 'EMPTY') continue;
        const candidate = this.candidates[count];
        if (!candidate) break;
        if (!this.detectCircleAabb(ball, cell, col, row, candidate)) continue;
        candidate.col = col;
        candidate.row = row;
        candidate.cell = cell;
        count++;
      }
    }
    if (count === 0) return;

    // ---- Ghost Vertex 防护：选择唯一"主碰撞面" ----
    // 规则（§3.3）：穿透深度最大者优先；深度持平时取与速度方向正面度最高者。
    let best = this.candidates[0]!;
    for (let i = 1; i < count; i++) {
      const cand = this.candidates[i]!;
      if (cand.depth > best.depth + 1e-6) {
        best = cand;
      } else if (cand.depth > best.depth - 1e-6 && cand.frontality > best.frontality) {
        best = cand;
      }
    }

    // ---- 材质判定前置：先决定本次是「反弹」还是「穿透」 ----
    const cell = best.cell;
    /** 击碎前先记录角色（`grid.damage` 摧毁时会把角色改写为 EMPTY）。 */
    const role = cell.role;
    /** 球自身携带的穿透次数（由 CORE 砖击碎时授予）。 */
    const hasPierce = ball.pierceCount > 0;
    /** 钢墙永不参与穿透：撞 STEEL 仍正常反弹，且不消耗穿透次数。 */
    const piercing = role !== 'STEEL' && hasPierce;
    /**
     * 击碎前的**入射方向**。
     *
     * 棱镜砖的折射子球要沿"来向"分叉（而不是反弹后的方向），
     * 因此这里在反弹改写速度之前先把入射向量留存下来。
     */
    const inVx = ball.vx;
    const inVy = ball.vy;

    // ---- 单次轴向反弹（避免同一角点连弹两次导致速度反转失效）----
    if (!piercing) {
      if (best.axis === 'x') {
        ball.vx = -ball.vx;
      } else {
        ball.vy = -ball.vy;
      }

      // ---- Push-out：沿分离轴推出完整穿透深度 ----
      ball.x += best.nx * (best.depth + CONTACT_EPSILON);
      ball.y += best.ny * (best.depth + CONTACT_EPSILON);

      // ---- 其余重叠格只做位置修正，不再反弹（彻底脱离接触区）----
      this.resolveRemainingOverlaps(ball, colMin, colMax, rowMin, rowMax, count);
    }

    // ---- 材质结算 ----
    if (role === 'STEEL') {
      // 灰墙：只反弹不扣血，不计 Combo，计入"久未破砖自救"计数。
      ball.bouncesSinceBrick++;
      this.world.emit({ type: 'WALL_HIT', x: ball.x, y: ball.y });
      this.applyDeadlockEscape(ball);
    } else {
      // 伤害结算：
      //   · `baseDamage` = 技能溢出倍率（既有机制，语义不变）；
      //   · `feverMultiplier` = Fever 暴走倍率，**只对已受损的砖生效**，
      //     从而保证 1 血 / 2 血砖的破碎时序与基线逐帧一致（V1 回归红线）。
      const baseDamage = this.world.damageMultiplier();
      const feverMultiplier = this.world.feverDamageMultiplier?.() ?? 1;
      const isDamaged = cell.maxHp > 0 && cell.hp < cell.maxHp;
      const damage = isDamaged ? Math.max(baseDamage, feverMultiplier) : baseDamage;
      const result = grid.damage(best.col, best.row, damage);
      if (result.damaged) {
        if (result.destroyed) {
          // Fever 期间连击计数翻倍（连击是纯表现层数值，不参与物理判定）。
          this.combo += feverMultiplier > 1 ? FEVER_COMBO_BONUS : 1;
          ball.bouncesSinceBrick = 0;
          this.world.onBrickDestroyed(best.col, best.row);
          if (role === 'BOMB' || role === 'PRISM' || role === 'CORE') {
            this.world.onSpecialBrickDestroyed?.(
              role,
              best.col,
              best.row,
              ball.x,
              ball.y,
              inVx,
              inVy,
            );
          }
        }
        this.world.emit({
          type: 'BRICK_HIT',
          col: best.col,
          row: best.row,
          x: ball.x,
          y: ball.y,
          color: brickColorAt(cell.colorIndex),
          destroyed: result.destroyed,
          combo: this.combo,
        });
      }
      if (piercing) {
        // 穿透：消耗一次自身穿透次数（Fever 加成不消耗），并沿速度方向推出砖块，
        // 避免同一子步内对同一格重复结算伤害。
        if (hasPierce) ball.pierceCount -= 1;
        this.advanceThroughBrick(ball, best.col, best.row);
      }
    }

    this.applyMinimumVerticalComponent(ball);
    this.world.onBoundaryBounce(ball);
  }

  /**
   * 穿透推进：沿当前速度方向把球推出目标砖块。
   *
   * 若不推进，球会一直卡在砖内被反复判定命中（多血砖会被瞬间打空），
   * 因此这里按"球心离开砖块外扩边界"所需的最小距离推进一次。
   */
  private advanceThroughBrick(ball: Ball, col: number, row: number): void {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed <= ANGLE_EPSILON) return;
    const rect = this.world.grid.cellRect(col, row);
    const r = ball.radius;
    const ux = ball.vx / speed;
    const uy = ball.vy / speed;

    let tx = Number.POSITIVE_INFINITY;
    let ty = Number.POSITIVE_INFINITY;
    if (ux > 0) tx = (rect.x + rect.width + r - ball.x) / ux;
    else if (ux < 0) tx = (rect.x - r - ball.x) / ux;
    if (uy > 0) ty = (rect.y + rect.height + r - ball.y) / uy;
    else if (uy < 0) ty = (rect.y - r - ball.y) / uy;

    const t = Math.min(tx, ty);
    if (!Number.isFinite(t) || t <= 0) return;
    ball.x += ux * t;
    ball.y += uy * t;
  }

  /**
   * 圆 vs 格子 AABB 碰撞检测 + 分离轴求解。
   *
   * 命中判定使用圆心到 AABB 最近点的精确圆检测（§3.3）；
   * 反弹轴使用**最小分离轴**（Ghost Vertex 防护的核心）：
   * 角点同时命中多个格子时只在单轴结算一次，避免两个相反法线叠加。
   */
  private detectCircleAabb(
    ball: Ball,
    cell: BrickCell,
    col: number,
    row: number,
    out: CandidateHit,
  ): boolean {
    const rect = this.world.grid.cellRect(col, row);
    const rectLeft = rect.x;
    const rectRight = rect.x + rect.width;
    const rectTop = rect.y;
    const rectBottom = rect.y + rect.height;
    const r = ball.radius;

    // 精确圆检测：圆心到 AABB 最近点的距离。
    const closestX = ball.x < rectLeft ? rectLeft : ball.x > rectRight ? rectRight : ball.x;
    const closestY = ball.y < rectTop ? rectTop : ball.y > rectBottom ? rectBottom : ball.y;
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= r * r) return false;

    // 分离轴（以球包围盒近似球体，沿轴取完整重叠深度）。
    const overlapX = Math.min(ball.x + r, rectRight) - Math.max(ball.x - r, rectLeft);
    const overlapY = Math.min(ball.y + r, rectBottom) - Math.max(ball.y - r, rectTop);
    if (overlapX <= 0 || overlapY <= 0) return false;

    const axis: 'x' | 'y' = overlapX < overlapY ? 'x' : 'y';
    const depth = Math.min(overlapX, overlapY);

    let nx = 0;
    let ny = 0;
    if (axis === 'x') {
      nx = ball.x < (rectLeft + rectRight) * 0.5 ? -1 : 1;
    } else {
      ny = ball.y < (rectTop + rectBottom) * 0.5 ? -1 : 1;
    }

    const speed = Math.hypot(ball.vx, ball.vy);
    const frontality = speed > 0 ? -(nx * ball.vx + ny * ball.vy) / speed : 0;

    out.nx = nx;
    out.ny = ny;
    out.depth = depth;
    out.axis = axis;
    out.frontality = frontality;
    void cell;
    return true;
  }

  /**
   * 主碰撞结算之后，把球从其余仍重叠的格子中**纯位置**推出（不再反弹）。
   * 这是"避免在同一角点连弹两次导致速度反转失效"的关键补强。
   */
  private resolveRemainingOverlaps(
    ball: Ball,
    colMin: number,
    colMax: number,
    rowMin: number,
    rowMax: number,
    candidateCount: number,
  ): void {
    if (candidateCount <= 1) return;
    const grid = this.world.grid;
    const r = ball.radius;

    for (let iter = 0; iter < 4; iter++) {
      let resolvedAny = false;
      for (let row = rowMin; row <= rowMax; row++) {
        for (let col = colMin; col <= colMax; col++) {
          const cell = grid.at(col, row);
          if (!cell || cell.role === 'EMPTY') continue;
          const rect = grid.cellRect(col, row);
          const closestX = ball.x < rect.x ? rect.x : ball.x > rect.x + rect.width ? rect.x + rect.width : ball.x;
          const closestY = ball.y < rect.y ? rect.y : ball.y > rect.y + rect.height ? rect.y + rect.height : ball.y;
          const dx = ball.x - closestX;
          const dy = ball.y - closestY;
          if (dx * dx + dy * dy >= r * r) continue;

          const overlapX = Math.min(ball.x + r, rect.x + rect.width) - Math.max(ball.x - r, rect.x);
          const overlapY = Math.min(ball.y + r, rect.y + rect.height) - Math.max(ball.y - r, rect.y);
          if (overlapX <= 0 || overlapY <= 0) continue;

          if (overlapX <= overlapY) {
            const dir = ball.x < (rect.x + rect.width * 0.5) ? -1 : 1;
            ball.x += dir * (overlapX + CONTACT_EPSILON);
          } else {
            const dir = ball.y < (rect.y + rect.height * 0.5) ? -1 : 1;
            ball.y += dir * (overlapY + CONTACT_EPSILON);
          }
          resolvedAny = true;
        }
      }
      if (!resolvedAny) return;
    }
  }

  /* ---------------------------------------------------------------- */
  /* 挡板                                                              */
  /* ---------------------------------------------------------------- */

  /**
   * 挡板反弹角度映射（§3.4，手感灵魂）：
   *   `offset = clamp((ball.x - paddle.x) / (paddle.width / 2), -1, 1)`
   *   `θ = offset × 68°`
   *   `vx = speed · sin θ`，`vy = -speed · cos θ`
   */
  private collidePaddle(ball: Ball): void {
    const paddle = this.world.paddle;
    const halfWidth = paddle.width * 0.5;
    const top = paddle.y - paddle.height * 0.5;

    if (ball.vy <= 0) return;
    if (ball.y + ball.radius < top) return;
    if (ball.y > top + ball.radius) return;   // 已穿过顶面太深，不再吸附
    if (ball.x < paddle.x - halfWidth - ball.radius) return;
    if (ball.x > paddle.x + halfWidth + ball.radius) return;

    const offset = clamp((ball.x - paddle.x) / halfWidth, -1, 1);
    const theta = (offset * PADDLE_MAX_DEFLECT_DEG * Math.PI) / 180;
    const speed = Math.hypot(ball.vx, ball.vy);

    ball.vx = speed * Math.sin(theta);
    ball.vy = -speed * Math.cos(theta);
    // 夹紧到挡板顶面之上，防止连续两帧重复吸附。
    ball.y = top - ball.radius - PADDLE_CONTACT_GAP;
    ball.bouncesSinceBrick = 0;

    this.world.emit({ type: 'PADDLE_HIT', x: ball.x, y: top, offsetRatio: offset });
    // 精准接球 / Fever 能量累计（Milestone 5 / Step 2）。
    // 这里的回弹一定是「向下击中挡板」的有效战斗回弹（上方已过滤 vy <= 0）。
    this.world.onPaddleHit?.(offset);
    this.applyMinimumVerticalComponent(ball);
    this.world.onBoundaryBounce(ball);
  }

  /* ---------------------------------------------------------------- */
  /* 防死循环微扰（§3.5）                                              */
  /* ---------------------------------------------------------------- */

  /**
   * 最小垂直分量保护：反弹后角度过于水平（|vy| < speed × 0.18）时，
   * 保持 vy 符号不变，强行把 |vy| 抬升到 speed × 0.22 并重新归一化。
   */
  private applyMinimumVerticalComponent(ball: Ball): void {
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed <= ANGLE_EPSILON) return;
    if (Math.abs(ball.vy) >= speed * MIN_VERTICAL_RATIO) return;

    const sign = ball.vy < 0 ? -1 : 1;
    const lifted = sign * speed * MIN_VERTICAL_RATIO_ENFORCED;
    const norm = Math.hypot(ball.vx, lifted);
    if (norm <= ANGLE_EPSILON) return;
    ball.vx = (ball.vx / norm) * speed;
    ball.vy = (lifted / norm) * speed;
  }

  /**
   * 久未破砖自救：撞击灰墙/顶边墙累计达到 18 次仍未碰到可破坏砖时，
   * 向速度向量注入 ±6°~±12° 的随机偏转，帮助球跳出死循环腔室。
   */
  private applyDeadlockEscape(ball: Ball): void {
    if (ball.bouncesSinceBrick < DEADLOCK_BOUNCE_LIMIT) return;
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed <= ANGLE_EPSILON) return;

    const minRad = (DEADLOCK_JITTER_DEG_MIN * Math.PI) / 180;
    const maxRad = (DEADLOCK_JITTER_DEG_MAX * Math.PI) / 180;
    const magnitude = minRad + this.rng() * (maxRad - minRad);
    const sign = this.rng() < 0.5 ? -1 : 1;
    const angle = magnitude * sign;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const vx = ball.vx * cos - ball.vy * sin;
    const vy = ball.vx * sin + ball.vy * cos;
    ball.vx = vx;
    ball.vy = vy;
    ball.bouncesSinceBrick = 0;
  }

  /* ---------------------------------------------------------------- */
  /* 出界                                                              */
  /* ---------------------------------------------------------------- */

  private killBall(ball: Ball): void {
    ball.active = false;
    this.combo = 0;
    const remaining = this.activeBallCount;
    this.world.emit({ type: 'BALL_LOST', remainingBalls: remaining });
  }
}

/* ------------------------------------------------------------------ */
/* 内部工具                                                            */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** 供外部复用的基础球速（技能系统发射新球时使用）。 */
export const DEFAULT_BALL_SPEED = BASE_BALL_SPEED;
