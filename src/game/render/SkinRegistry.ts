/**
 * 《碎砖大裂变》(Brick Fission) — 挡板皮肤注册表
 *
 * 契约来源：`docs/02_RENDERER_AUDIO_AND_VISUAL_SPEC.md` §1.3。
 * V1 内置 3 款高辨识度皮肤：
 *   1. `capsule_blue`  经典蓝胶囊（默认）：#7ca2ff → #5b84f5 圆角渐变 + 顶部高光；
 *   2. `bamboo_green`  翠竹节：#16e325 竹节造型 + #e5b80b 金色竹节箍 + 翠绿竹叶；
 *   3. `minimal_white` 极简白条：纯白锐利矩形。
 *
 * 绘制函数只操作传入的 2D 上下文，由 `Canvas2DRenderer` 在初始化时
 * 一次性预烘焙为精灵贴图；主循环内只做 `drawImage`，不再走路径绘制。
 */

/** 两款 Canvas 2D 上下文的结构化联合（主画布 / 离屏画布通用）。 */
export type SkinDrawContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface PaddleSkin {
  id: string;
  displayName: string;
  /**
   * 在 `(0, 0, width, height)` 矩形内绘制皮肤。
   * 调用方保证已按精灵烘焙倍率缩放上下文，函数内只使用逻辑尺寸。
   */
  draw(ctx: SkinDrawContext, width: number, height: number): void;
}

export const PADDLE_SKIN_CAPSULE_BLUE = 'capsule_blue';
export const PADDLE_SKIN_BAMBOO_GREEN = 'bamboo_green';
export const PADDLE_SKIN_MINIMAL_WHITE = 'minimal_white';

/** 内置皮肤 id 顺序（与下拉选择器一致）。 */
export const PADDLE_SKIN_IDS: readonly string[] = [
  PADDLE_SKIN_CAPSULE_BLUE,
  PADDLE_SKIN_BAMBOO_GREEN,
  PADDLE_SKIN_MINIMAL_WHITE,
];

/* ------------------------------------------------------------------ */
/* 皮肤绘制实现                                                        */
/* ------------------------------------------------------------------ */

const capsuleBlue: PaddleSkin = {
  id: PADDLE_SKIN_CAPSULE_BLUE,
  displayName: '经典蓝胶囊',
  draw(ctx, width, height) {
    const radius = height * 0.5;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#7ca2ff');
    gradient.addColorStop(1, '#5b84f5');
    ctx.fillStyle = gradient;
    roundedRectPath(ctx, 0, 0, width, height, radius);
    ctx.fill();

    // 微弱顶部高光（烘焙期一次性创建渐变，主循环零开销）
    const highlight = ctx.createLinearGradient(0, 0, 0, height * 0.5);
    highlight.addColorStop(0, 'rgba(255,255,255,0.45)');
    highlight.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlight;
    roundedRectPath(ctx, 2, 1.5, width - 4, height * 0.42, radius * 0.7);
    ctx.fill();
  },
};

const bambooGreen: PaddleSkin = {
  id: PADDLE_SKIN_BAMBOO_GREEN,
  displayName: '翠竹节',
  draw(ctx, width, height) {
    const radius = height * 0.32;

    // 竹节主体
    const body = ctx.createLinearGradient(0, 0, 0, height);
    body.addColorStop(0, '#2bf038');
    body.addColorStop(1, '#16e325');
    ctx.fillStyle = body;
    roundedRectPath(ctx, 0, 0, width, height, radius);
    ctx.fill();

    // 竹节分隔线（两节）
    ctx.strokeStyle = 'rgba(0,90,10,0.55)';
    ctx.lineWidth = 1.5;
    const third = width / 3;
    ctx.beginPath();
    ctx.moveTo(third, 2);
    ctx.lineTo(third, height - 2);
    ctx.moveTo(third * 2, 2);
    ctx.lineTo(third * 2, height - 2);
    ctx.stroke();

    // 左右金色竹节箍
    const bandW = Math.max(5, height * 0.34);
    ctx.fillStyle = '#e5b80b';
    roundedRectPath(ctx, 1, 1, bandW, height - 2, radius * 0.6);
    ctx.fill();
    roundedRectPath(ctx, width - bandW - 1, 1, bandW, height - 2, radius * 0.6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(2.5, 2.5, bandW - 3, 2);

    // 下方偏左伸出一片翠绿竹叶
    ctx.fillStyle = '#0fae1c';
    ctx.beginPath();
    const leafBaseX = width * 0.24;
    const leafBaseY = height - 1;
    ctx.moveTo(leafBaseX, leafBaseY);
    ctx.quadraticCurveTo(leafBaseX - 16, leafBaseY + 9, leafBaseX - 26, leafBaseY + 4);
    ctx.quadraticCurveTo(leafBaseX - 14, leafBaseY + 1, leafBaseX, leafBaseY);
    ctx.fill();
  },
};

const minimalWhite: PaddleSkin = {
  id: PADDLE_SKIN_MINIMAL_WHITE,
  displayName: '极简白条',
  draw(ctx, width, height) {
    // 锐利矩形（无圆角），硬核极简
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    // 极细暗边保证白色挡板在亮粒子上仍有轮廓
    ctx.strokeStyle = 'rgba(8,16,46,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  },
};

const SKINS: Readonly<Record<string, PaddleSkin>> = {
  [PADDLE_SKIN_CAPSULE_BLUE]: capsuleBlue,
  [PADDLE_SKIN_BAMBOO_GREEN]: bambooGreen,
  [PADDLE_SKIN_MINIMAL_WHITE]: minimalWhite,
};

export class SkinRegistry {
  /** 取皮肤定义；未知 id 回退默认蓝胶囊。 */
  get(id: string): PaddleSkin {
    return SKINS[id] ?? capsuleBlue;
  }

  has(id: string): boolean {
    return id in SKINS;
  }

  /** 全部内置皮肤（注册表顺序）。 */
  list(): readonly PaddleSkin[] {
    return PADDLE_SKIN_IDS.map((id) => SKINS[id]!);
  }
}

/** 圆角矩形路径工具（兼容无 `roundRect` 的旧运行时）。 */
export function roundedRectPath(
  ctx: SkinDrawContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
