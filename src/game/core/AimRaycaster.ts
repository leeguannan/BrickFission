/**
 * 《碎砖大裂变》(Brick Fission) — 瞄准线预测器
 *
 * 实现 `docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md` §4：
 *   - `READY_AIM` 阶段从发球点发射虚拟射线（最长 900px）；
 *   - 复刻 `PhysicsEngine` 的墙体与网格命中判定（圆 vs AABB 精确检测 +
 *     最小分离轴法线），保证"预测轨迹 = 实际弹道"；
 *   - 记录第 1 段路径与第 1 个碰撞点，按法线反射延伸约 140px 的第 2 段折线预览；
 *   - 输出等距采样点数组（间距 22px）交由渲染层绘制。
 *
 * 纯 TypeScript：禁止出现任何宿主环境 API。
 */

import {
  AIM_ANGLE_MAX_DEG,
  AIM_ANGLE_MIN_DEG,
  AIM_DETECT_STEP,
  AIM_DOT_FADE,
  AIM_DOT_SPACING,
  AIM_MAX_LENGTH,
  AIM_SECOND_SEGMENT_LENGTH,
  BALL_RADIUS,
  CONTACT_EPSILON,
  WALL_LEFT,
  WALL_RIGHT,
  WALL_TOP,
} from './constants.js';
import { BrickGrid } from './BrickGrid.js';
import type { AimDot, AimPrediction } from './types.js';

/** 射线命中信息。 */
interface RayHit {
  hit: boolean;
  /**
   * 命中后的球心位置（已沿分离法线推出到 `radius + CONTACT_EPSILON`）。
   *
   * 该语义保证第二段射线从命中点出发时不会在原点立刻再次碰撞，
   * 从而折线预览不会"凭空消失"。
   */
  x: number;
  y: number;
  /** 单位法线（由障碍指向射线入射侧）。 */
  nx: number;
  ny: number;
  /** 是否命中砖块（否则为世界墙）。 */
  brick: boolean;
}

/** 砖块候选（预分配槽位，运行期零分配）。 */
interface BrickCandidate {
  col: number;
  row: number;
  nx: number;
  ny: number;
  depth: number;
  frontality: number;
}

export class AimRaycaster {
  private readonly grid: BrickGrid;
  /** 碰撞检测子步长（px）。 */
  private readonly detectStep: number;
  private readonly maxLength: number;
  private readonly dotSpacing: number;
  private readonly secondSegmentLength: number;
  private readonly radius: number;

  /** 复用的采样点缓冲（零 GC：每次 predict 复用同一批对象）。 */
  private readonly firstBuffer: AimDot[] = [];
  private readonly secondBuffer: AimDot[] = [];
  /** 两段轨迹的有效圆点数量（缓冲数组长度固定为池容量）。 */
  private firstCount = 0;
  private secondCount = 0;

  /** 预分配的命中结果与命中点（零 GC）。 */
  private readonly firstHit: RayHit = { hit: false, x: 0, y: 0, nx: 0, ny: 0, brick: false };
  private readonly secondHit: RayHit = { hit: false, x: 0, y: 0, nx: 0, ny: 0, brick: false };
  private readonly hitPointBuffer: { x: number; y: number } = { x: 0, y: 0 };
  /** 预分配的砖块候选槽（同时接触的格子最多 4 个）。 */
  private readonly brickCandidates: BrickCandidate[] = [];

  constructor(
    grid: BrickGrid,
    options?: {
      /** 碰撞检测子步长（px），默认 `AIM_DETECT_STEP`。 */
      step?: number;
      maxLength?: number;
      dotSpacing?: number;
      secondSegmentLength?: number;
      radius?: number;
    },
  ) {
    this.grid = grid;
    this.detectStep = options?.step ?? AIM_DETECT_STEP;
    this.maxLength = options?.maxLength ?? AIM_MAX_LENGTH;
    this.dotSpacing = options?.dotSpacing ?? AIM_DOT_SPACING;
    this.secondSegmentLength = options?.secondSegmentLength ?? AIM_SECOND_SEGMENT_LENGTH;
    this.radius = options?.radius ?? BALL_RADIUS;

    for (let i = 0; i < 160; i++) {
      this.firstBuffer.push({ x: 0, y: 0, alpha: 1 });
      this.secondBuffer.push({ x: 0, y: 0, alpha: 1 });
    }
    for (let i = 0; i < 4; i++) {
      this.brickCandidates.push({ col: -1, row: -1, nx: 0, ny: 0, depth: 0, frontality: 0 });
    }
  }

  /**
   * 计算一次反弹的折线瞄准预测。
   *
   * @param originX 发球点 X
   * @param originY 发球点 Y
   * @param angleDeg 发射角（0° = 垂直向上，范围 [-72°, +72°]）
   */
  predict(originX: number, originY: number, angleDeg: number): AimPrediction {
    const angle = clamp(angleDeg, AIM_ANGLE_MIN_DEG, AIM_ANGLE_MAX_DEG);
    const rad = (angle * Math.PI) / 180;
    const dirX = Math.sin(rad);
    const dirY = -Math.cos(rad);

    this.castRay(originX, originY, dirX, dirY, this.maxLength, this.firstHit);
    const hit = this.firstHit;

    let endX: number;
    let endY: number;
    let hitPoint: { x: number; y: number } | null = null;
    let reflectX = dirX;
    let reflectY = dirY;

    if (hit.hit) {
      endX = hit.x;
      endY = hit.y;
      this.hitPointBuffer.x = hit.x;
      this.hitPointBuffer.y = hit.y;
      hitPoint = this.hitPointBuffer;
      // 法线反射：dir' = dir - 2(dir·n)n
      const dot = dirX * hit.nx + dirY * hit.ny;
      reflectX = dirX - 2 * dot * hit.nx;
      reflectY = dirY - 2 * dot * hit.ny;
    } else {
      endX = originX + dirX * this.maxLength;
      endY = originY + dirY * this.maxLength;
    }

    this.firstCount = this.fillDots(this.firstBuffer, originX, originY, endX, endY);

    this.secondCount = 0;
    if (hitPoint) {
      this.castRay(hitPoint.x, hitPoint.y, reflectX, reflectY, this.secondSegmentLength, this.secondHit);
      const secondHit = this.secondHit;
      const secondEndX = secondHit.hit ? secondHit.x : hitPoint.x + reflectX * this.secondSegmentLength;
      const secondEndY = secondHit.hit ? secondHit.y : hitPoint.y + reflectY * this.secondSegmentLength;
      this.secondCount = this.fillDots(this.secondBuffer, hitPoint.x, hitPoint.y, secondEndX, secondEndY);
    }

    return {
      originX,
      originY,
      angleDeg: angle,
      firstSegment: this.firstBuffer,
      firstSegmentCount: this.firstCount,
      hitPoint,
      secondSegment: this.secondBuffer,
      secondSegmentCount: this.secondCount,
    };
  }

  /* ---------------------------------------------------------------- */
  /* 内部实现                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * 沿方向发射虚拟射线，复刻物理层的墙体与网格命中判定。
   *
   * 命中点统一返回**反弹后的球心位置**（距障碍面 `radius + CONTACT_EPSILON`），
   * 保证第二段射线从命中点出发时不会在原点立刻再次碰撞。
   */
  private castRay(
    originX: number,
    originY: number,
    dirX: number,
    dirY: number,
    maxLength: number,
    out: RayHit,
  ): void {
    const r = this.radius;

    let travelled = 0;
    while (travelled <= maxLength) {
      const px = originX + dirX * travelled;
      const py = originY + dirY * travelled;

      // 世界三面墙：命中点回退到球面接触处（球心距墙面 radius + EPS）。
      if (px - r < WALL_LEFT) {
        this.fillWallHit(out, WALL_LEFT + r + CONTACT_EPSILON, py, 1, 0);
        return;
      }
      if (px + r > WALL_RIGHT) {
        this.fillWallHit(out, WALL_RIGHT - r - CONTACT_EPSILON, py, -1, 0);
        return;
      }
      if (py - r < WALL_TOP) {
        this.fillWallHit(out, px, WALL_TOP + r + CONTACT_EPSILON, 0, 1);
        return;
      }

      // 砖块：邻域圈选 + 圆 vs AABB 精确检测（与物理层同一套判定）。
      if (this.detectBrick(px, py, dirX, dirY, out)) return;

      travelled += this.detectStep;
    }

    out.hit = false;
    out.x = 0;
    out.y = 0;
    out.nx = 0;
    out.ny = 0;
    out.brick = false;
  }

  /** 写入墙面命中结果。 */
  private fillWallHit(out: RayHit, x: number, y: number, nx: number, ny: number): void {
    out.hit = true;
    out.x = x;
    out.y = y;
    out.nx = nx;
    out.ny = ny;
    out.brick = false;
  }

  /**
   * 砖块命中检测：圈选球心邻域 → 圆 vs AABB 最近点检测 → 最小分离轴法线。
   *
   * 与 `PhysicsEngine.detectCircleAabb` 保持同一套规则：
   *   - 穿透深度最大者优先，深度持平时取与射线方向正面度最高者（Ghost Vertex 防护）；
   *   - 法线为轴向分离法线 `(±1, 0)` / `(0, ±1)`，**不使用径向法线**。
   */
  private detectBrick(px: number, py: number, dirX: number, dirY: number, out: RayHit): boolean {
    const grid = this.grid;
    const r = this.radius;

    let colMin = grid.colAt(px - r);
    let colMax = grid.colAt(px + r);
    let rowMin = grid.rowAt(py - r);
    let rowMax = grid.rowAt(py + r);
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
        const candidate = this.brickCandidates[count];
        if (!candidate) break;
        if (!this.detectCircleAabb(px, py, col, row, candidate)) continue;
        candidate.col = col;
        candidate.row = row;
        candidate.frontality = -(candidate.nx * dirX + candidate.ny * dirY);
        count++;
      }
    }
    if (count === 0) return false;

    // ---- Ghost Vertex 防护：选唯一"主碰撞面"（与物理层一致）----
    let best = this.brickCandidates[0]!;
    for (let i = 1; i < count; i++) {
      const cand = this.brickCandidates[i]!;
      if (cand.depth > best.depth + 1e-6) {
        best = cand;
      } else if (cand.depth > best.depth - 1e-6 && cand.frontality > best.frontality) {
        best = cand;
      }
    }

    out.hit = true;
    out.nx = best.nx;
    out.ny = best.ny;
    out.brick = true;
    // 沿分离法线推出完整穿透深度 → 球心距砖面 radius + EPS。
    out.x = px + best.nx * (best.depth + CONTACT_EPSILON);
    out.y = py + best.ny * (best.depth + CONTACT_EPSILON);
    return true;
  }

  /**
   * 圆心 vs 格子 AABB 的精确检测 + 最小分离轴求解（复刻物理层规则）。
   */
  private detectCircleAabb(px: number, py: number, col: number, row: number, out: BrickCandidate): boolean {
    const rect = this.grid.cellRect(col, row);
    const rectLeft = rect.x;
    const rectRight = rect.x + rect.width;
    const rectTop = rect.y;
    const rectBottom = rect.y + rect.height;
    const r = this.radius;

    // 精确圆检测：圆心到 AABB 最近点的距离。
    const closestX = px < rectLeft ? rectLeft : px > rectRight ? rectRight : px;
    const closestY = py < rectTop ? rectTop : py > rectBottom ? rectBottom : py;
    const dx = px - closestX;
    const dy = py - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= r * r) return false;

    // 分离轴（以球包围盒近似球体，沿轴取完整重叠深度）。
    const overlapX = Math.min(px + r, rectRight) - Math.max(px - r, rectLeft);
    const overlapY = Math.min(py + r, rectBottom) - Math.max(py - r, rectTop);
    if (overlapX <= 0 || overlapY <= 0) return false;

    const axis: 'x' | 'y' = overlapX < overlapY ? 'x' : 'y';
    const depth = Math.min(overlapX, overlapY);

    let nx = 0;
    let ny = 0;
    if (axis === 'x') {
      nx = px < (rectLeft + rectRight) * 0.5 ? -1 : 1;
    } else {
      ny = py < (rectTop + rectBottom) * 0.5 ? -1 : 1;
    }

    out.nx = nx;
    out.ny = ny;
    out.depth = depth;
    return true;
  }

  /**
   * 在两点之间按固定间距填充采样圆点（末端透明度轻微衰减）。
   *
   * 缓冲区容量固定（对象池），每次预测只改写对象内容并返回有效数量，
   * 避免 `array.length = 0` 破坏预分配容量，也避免每帧分配新数组。
   */
  private fillDots(buffer: AimDot[], fromX: number, fromY: number, toX: number, toY: number): number {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.hypot(dx, dy);
    if (length <= 1e-6) return 0;

    const ux = dx / length;
    const uy = dy / length;
    const count = Math.min(buffer.length, Math.floor(length / this.dotSpacing));
    if (count <= 0) return 0;

    for (let i = 0; i < count; i++) {
      const dot = buffer[i]!;
      const distance = i * this.dotSpacing;
      dot.x = fromX + ux * distance;
      dot.y = fromY + uy * distance;
      dot.alpha = count > 1 ? 1 - AIM_DOT_FADE * (i / (count - 1)) : 1;
    }
    return count;
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
