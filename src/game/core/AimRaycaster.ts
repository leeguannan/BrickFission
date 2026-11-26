/**
 * 《碎砖大裂变》(Brick Fission) — 瞄准线预测器
 *
 * 实现 `docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md` §4：
 *   - `READY_AIM` 阶段从发球点发射虚拟射线（步长 4px，最长 900px）；
 *   - 复刻 `PhysicsEngine` 的墙体与网格命中判定；
 *   - 记录第 1 段路径与第 1 个碰撞点，按法线反射延伸约 140px 的第 2 段折线预览；
 *   - 输出等距采样点数组（间距 22px）交由渲染层绘制。
 *
 * 纯 TypeScript：禁止出现任何宿主环境 API。
 */

import {
  AIM_ANGLE_MAX_DEG,
  AIM_ANGLE_MIN_DEG,
  AIM_DOT_FADE,
  AIM_DOT_SPACING,
  AIM_MAX_LENGTH,
  AIM_SECOND_SEGMENT_LENGTH,
  AIM_STEP,
  BALL_RADIUS,
  WALL_LEFT,
  WALL_RIGHT,
  WALL_TOP,
} from './constants.js';
import { BrickGrid } from './BrickGrid.js';
import type { AimDot, AimPrediction } from './types.js';

/** 射线命中信息。 */
interface RayHit {
  hit: boolean;
  x: number;
  y: number;
  /** 单位法线（由障碍指向射线入射侧）。 */
  nx: number;
  ny: number;
  /** 是否命中砖块（否则为世界墙）。 */
  brick: boolean;
}

export class AimRaycaster {
  private readonly grid: BrickGrid;
  private readonly step: number;
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

  constructor(
    grid: BrickGrid,
    options?: {
      step?: number;
      maxLength?: number;
      dotSpacing?: number;
      secondSegmentLength?: number;
      radius?: number;
    },
  ) {
    this.grid = grid;
    this.step = options?.step ?? AIM_STEP;
    this.maxLength = options?.maxLength ?? AIM_MAX_LENGTH;
    this.dotSpacing = options?.dotSpacing ?? AIM_DOT_SPACING;
    this.secondSegmentLength = options?.secondSegmentLength ?? AIM_SECOND_SEGMENT_LENGTH;
    this.radius = options?.radius ?? BALL_RADIUS;

    for (let i = 0; i < 160; i++) {
      this.firstBuffer.push({ x: 0, y: 0, alpha: 1 });
      this.secondBuffer.push({ x: 0, y: 0, alpha: 1 });
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

    const hit = this.castRay(originX, originY, dirX, dirY, this.maxLength);

    let endX: number;
    let endY: number;
    let hitPoint: { x: number; y: number } | null = null;
    let reflectX = dirX;
    let reflectY = dirY;

    if (hit.hit) {
      endX = hit.x;
      endY = hit.y;
      hitPoint = { x: hit.x, y: hit.y };
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
    if (hitPoint && hit.hit) {
      const secondHit = this.castRay(hitPoint.x, hitPoint.y, reflectX, reflectY, this.secondSegmentLength);
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
   */
  private castRay(originX: number, originY: number, dirX: number, dirY: number, maxLength: number): RayHit {
    const noHit: RayHit = { hit: false, x: 0, y: 0, nx: 0, ny: 0, brick: false };

    let travelled = 0;
    while (travelled <= maxLength) {
      const px = originX + dirX * travelled;
      const py = originY + dirY * travelled;

      // 世界三面墙
      if (px - this.radius < WALL_LEFT) {
        return { hit: true, x: px, y: py, nx: 1, ny: 0, brick: false };
      }
      if (px + this.radius > WALL_RIGHT) {
        return { hit: true, x: px, y: py, nx: -1, ny: 0, brick: false };
      }
      if (py - this.radius < WALL_TOP) {
        return { hit: true, x: px, y: py, nx: 0, ny: 1, brick: false };
      }

      // 砖块网格直查
      const col = this.grid.colAt(px);
      const row = this.grid.rowAt(py);
      if (this.grid.contains(col, row)) {
        const cell = this.grid.at(col, row);
        if (cell && cell.role !== 'EMPTY') {
          const rect = this.grid.cellRect(col, row);
          const centerX = rect.x + rect.width * 0.5;
          const centerY = rect.y + rect.height * 0.5;
          let nx = px - centerX;
          let ny = py - centerY;
          const len = Math.hypot(nx, ny);
          if (len < 1e-6) {
            nx = 0;
            ny = -1;
          } else {
            nx /= len;
            ny /= len;
          }
          // 碰撞点回退到球面接触处，避免圆点陷入砖内。
          return { hit: true, x: px - dirX * this.radius, y: py - dirY * this.radius, nx, ny, brick: true };
        }
      }

      travelled += this.step;
    }

    return noHit;
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
