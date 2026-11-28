/**
 * 《碎砖大裂变》(Brick Fission) — 渲染层单测共享 mock
 *
 * 纯 Node 环境（无 DOM）下模拟 Canvas 2D 上下文与离屏画布，
 * 记录主上下文的全部绘制调用，用于验证：
 *   - 主循环零 arc / 零渐变创建（精灵预烘焙铁律）；
 *   - 砖块离屏层每帧恰好 1 次 drawImage blit；
 *   - 离屏层重建与单格增量重绘的计数行为。
 */
import type { AnyCanvas } from '../../platform/AnyCanvas.js';
import type { IPlatformAdapter } from '../../platform/IPlatformAdapter.js';
import type { SkinDrawContext } from '../SkinRegistry.js';

export interface MockCtxCounters {
  drawImage: number;
  arc: number;
  fillRect: number;
  strokeRect: number;
  clearRect: number;
  beginPath: number;
  fill: number;
  stroke: number;
  createLinearGradient: number;
  createRadialGradient: number;
  fillText: number;
}

export class Mock2DCtx {
  readonly counters: MockCtxCounters = {
    drawImage: 0,
    arc: 0,
    fillRect: 0,
    strokeRect: 0,
    clearRect: 0,
    beginPath: 0,
    fill: 0,
    stroke: 0,
    createLinearGradient: 0,
    createRadialGradient: 0,
    fillText: 0,
  };
  /** drawImage 的第一个参数（源画布）按调用次序记录。 */
  readonly drawImageSources: MockCanvas[] = [];
  /** fillText 的文本与坐标按调用次序记录（CanvasHudRenderer 断言用）。 */
  readonly textCalls: { text: string; x: number; y: number }[] = [];
  /** fillRect 的矩形参数按调用次序记录（宽度/高度断言用）。 */
  readonly fillRects: { x: number; y: number; width: number; height: number }[] = [];
  font = '10px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  fillStyle: string | CanvasGradient = '#000000';
  strokeStyle: string | CanvasGradient = '#000000';
  lineWidth = 1;
  globalAlpha = 1;
  globalCompositeOperation = 'source-over';
  lineCap: CanvasLineCap = 'butt';
  lineJoin: CanvasLineJoin = 'miter';

  drawImage(src: unknown, ..._rest: number[]): void {
    this.counters.drawImage++;
    this.drawImageSources.push(src as MockCanvas);
  }
  arc(..._args: number[]): void {
    this.counters.arc++;
  }
  arcTo(..._args: number[]): void {}
  quadraticCurveTo(..._args: number[]): void {}
  beginPath(): void {
    this.counters.beginPath++;
  }
  closePath(): void {}
  moveTo(..._args: number[]): void {}
  lineTo(..._args: number[]): void {}
  fill(): void {
    this.counters.fill++;
  }
  stroke(): void {
    this.counters.stroke++;
  }
  fillRect(x: number, y: number, width: number, height: number): void {
    this.counters.fillRect++;
    this.fillRects.push({ x, y, width, height });
  }
  strokeRect(..._args: number[]): void {
    this.counters.strokeRect++;
  }
  clearRect(..._args: number[]): void {
    this.counters.clearRect++;
  }
  fillText(text: string, x: number, y: number): void {
    this.counters.fillText++;
    this.textCalls.push({ text, x, y });
  }
  save(): void {}
  restore(): void {}
  translate(..._args: number[]): void {}
  scale(..._args: number[]): void {}
  setTransform(..._args: number[]): void {}
  setLineDash(_dash: number[]): void {}
  createLinearGradient(..._args: number[]): CanvasGradient {
    this.counters.createLinearGradient++;
    return { addColorStop(): void {} } as unknown as CanvasGradient;
  }
  createRadialGradient(..._args: number[]): CanvasGradient {
    this.counters.createRadialGradient++;
    return { addColorStop(): void {} } as unknown as CanvasGradient;
  }
}

export interface MockCanvas extends AnyCanvas {
  readonly id: number;
  width: number;
  height: number;
  /** 测试侧直接读取计数器用的 mock 上下文（渲染器侧走 getContext 的联合类型）。 */
  readonly ctx: Mock2DCtx;
}

let nextCanvasId = 1;

export function makeMockCanvas(width: number, height: number): MockCanvas {
  const ctx = new Mock2DCtx();
  return {
    id: nextCanvasId++,
    width,
    height,
    ctx,
    // mock 只实现渲染器实际调用的 2D 方法子集，宿主类型断言集中在这一处
    getContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
      return ctx as unknown as CanvasRenderingContext2D;
    },
  };
}

/** 皮肤绘制测试的边界转换：Mock2DCtx → SkinDrawContext（断言集中，禁止散落）。 */
export function asSkinCtx(ctx: Mock2DCtx): SkinDrawContext {
  return ctx as unknown as SkinDrawContext;
}

/** 模拟平台适配器：离屏画布全部由 mock 承载。 */
export function makeMockAdapter(): IPlatformAdapter {
  const canvases: MockCanvas[] = [];
  const adapter = {
    platformName: 'web' as const,
    canvases,
    createOffscreenCanvas(width: number, height: number): MockCanvas {
      const canvas = makeMockCanvas(width, height);
      canvases.push(canvas);
      return canvas;
    },
    getSystemMetrics(): { width: number; height: number; dpr: number; safeAreaTop: number; safeAreaBottom: number } {
      return { width: 720, height: 1280, dpr: 1, safeAreaTop: 0, safeAreaBottom: 0 };
    },
  };
  return adapter as unknown as IPlatformAdapter & { canvases: MockCanvas[] };
}
