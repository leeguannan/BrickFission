/**
 * 《碎砖大裂变》(Brick Fission) — 指针输入控制器
 *
 * 契约来源：`docs/02_RENDERER_AUDIO_AND_VISUAL_SPEC.md` §4.2。
 *   - 相对位移 ΔX 控板：手指无需精确按在挡板上，屏幕下半区任意位置左右滑动
 *     即可带动挡板，滑动量按画布显示比例换算回逻辑坐标；
 *   - READY_AIM 阶段：按下后指针位置实时决定瞄准角，松手即发球；
 *   - 顶部栏 / 技能列 / 底栏是独立 DOM 层，事件不会落到画布，
 *     另加坐标护栏双保险，杜绝点击技能引发挡板跳变或误发球；
 *   - 统一 Pointer Events，鼠标 / 触摸 / 触控笔同一套逻辑。
 */
import { HUD_TOP, WORLD_HEIGHT, WORLD_WIDTH } from '../game/core/constants.js';

export interface InputHandlers {
  /** 挡板相对位移（逻辑像素，已做显示比例换算）。 */
  onPaddleDelta(dxLogical: number): void;
  /** READY_AIM 跟手瞄准：指针的逻辑坐标。 */
  onAimPoint(xLogical: number, yLogical: number): void;
  /** 松手发球请求（仅 READY_AIM 阶段由引擎决定是否生效）。 */
  onRelease(): void;
  /** 首次手势：用于音频上下文解锁。 */
  onUnlock(): void;
}

export class InputController {
  private readonly canvas: HTMLCanvasElement;
  private readonly handlers: InputHandlers;
  private dragging = false;
  private lastClientX = 0;
  private unlocked = false;

  constructor(canvas: HTMLCanvasElement, handlers: InputHandlers) {
    this.canvas = canvas;
    this.handlers = handlers;
  }

  attach(): void {
    this.canvas.addEventListener('pointerdown', this.handleDown);
    this.canvas.addEventListener('pointermove', this.handleMove);
    this.canvas.addEventListener('pointerup', this.handleUp);
    this.canvas.addEventListener('pointercancel', this.handleCancel);
  }

  detach(): void {
    this.canvas.removeEventListener('pointerdown', this.handleDown);
    this.canvas.removeEventListener('pointermove', this.handleMove);
    this.canvas.removeEventListener('pointerup', this.handleUp);
    this.canvas.removeEventListener('pointercancel', this.handleCancel);
  }

  /* ---------------------------------------------------------------- */

  private readonly handleDown = (event: PointerEvent): void => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (!this.unlocked) {
      this.unlocked = true;
      this.handlers.onUnlock();
    }
    const p = this.toLogical(event);
    if (!p) return;
    // 坐标护栏：HUD 顶栏范围内的按压不视为游戏手势
    if (p.y < HUD_TOP) return;

    this.dragging = true;
    this.lastClientX = event.clientX;
    this.canvas.setPointerCapture?.(event.pointerId);
    this.handlers.onAimPoint(p.x, p.y);
  };

  private readonly handleMove = (event: PointerEvent): void => {
    if (!this.dragging) return;
    const p = this.toLogical(event);
    if (!p) return;

    const scale = this.logicalScaleX();
    const dx = (event.clientX - this.lastClientX) * scale;
    this.lastClientX = event.clientX;

    if (dx !== 0) this.handlers.onPaddleDelta(dx);
    this.handlers.onAimPoint(p.x, p.y);
  };

  private readonly handleUp = (event: PointerEvent): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.handlers.onRelease();
  };

  private readonly handleCancel = (): void => {
    this.dragging = false;
  };

  /** 客户端坐标 → 720×1280 逻辑坐标；画布未布局时返回 null。 */
  private toLogical(event: PointerEvent): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * WORLD_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * WORLD_HEIGHT,
    };
  }

  /** CSS 像素 → 逻辑像素的水平缩放（竖屏等比缩放，X/Y 一致，取 X 即可）。 */
  private logicalScaleX(): number {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0) return 1;
    return WORLD_WIDTH / rect.width;
  }
}
