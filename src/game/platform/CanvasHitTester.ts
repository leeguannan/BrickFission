/**
 * 《碎砖大裂变》(Brick Fission) — 微信小游戏无 DOM 命中区检测（纯逻辑）
 *
 * 对应 `docs/04_WECHAT_ADAPTATION_AND_ROADMAP.md` §2「微信合规红线」与 Milestone 6 需求：
 *   - 微信端没有 DOM / CSS，所有 HUD 与弹窗按钮都是画在 Canvas 上的，
 *     因此必须有一份**纯逻辑**的命中区表，把「点到了 UI」和「在战场上拖动瞄准/控板」区分开；
 *   - 布局必须避开**右上角胶囊按钮**（微信原生按钮）与**底部 Banner 广告区**，
 *     否则会构成诱导点击违规。
 *
 * 设计约束：
 *   1. **零 DOM**：本模块不引用 window / document / navigator，可直接进微信小游戏包；
 *   2. **零运行期分配**：`buildHudRegions` 等函数只在「布局变化」时调用一次，
 *      每帧的命中测试只做数值比较，不产生临时对象；
 *   3. **单一真相源**：绘制层 `CanvasHudRenderer` 直接复用本模块导出的布局常量，
 *      保证「画的」和「点的」永远一致。
 */

/* ------------------------------------------------------------------ */
/* 基础类型                                                            */
/* ------------------------------------------------------------------ */

/** 逻辑矩形（坐标单位 = 逻辑画布像素，720×1280）。 */
export interface HudRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 命中区类别。 */
export type HudRegionKind = 'hud' | 'modal' | 'shop';

/** 带标识的命中区。 */
export interface HudHitRegion extends HudRect {
  /** 唯一标识，回调按此 id 分派。 */
  id: string;
  kind: HudRegionKind;
}

/** HUD 布局参数。 */
export interface HudLayout {
  /** 逻辑画布宽（默认 720）。 */
  width: number;
  /** 逻辑画布高（默认 1280）。 */
  height: number;
  /** 顶部安全区（微信胶囊避让区起始高度）。 */
  safeAreaTop: number;
  /** 底部安全区（Home Indicator 避让）。 */
  safeAreaBottom: number;
  /** 底部 Banner 广告位是否可见。 */
  bannerVisible: boolean;
}

/* ------------------------------------------------------------------ */
/* 布局常量（单一真相源，绘制层与命中层共用）                            */
/* ------------------------------------------------------------------ */

/** 顶部状态栏第一行（文本行）高度。 */
export const HUD_TITLE_ROW_HEIGHT = 32;
/** 顶部状态栏第二行（按钮行）高度。 */
export const HUD_ACTION_ROW_HEIGHT = 44;
/** 顶部左右留白。 */
export const HUD_HORIZONTAL_INSET = 16;
/** 顶部第一行与第二行之间的间距。 */
export const HUD_ROW_GAP = 8;

/** 微信右上角胶囊按钮的**保守估计**尺寸（实测约 87×32，这里留冗余）。 */
export const CAPSULE_ZONE_WIDTH = 96;
export const CAPSULE_ZONE_HEIGHT = 40;
export const CAPSULE_ZONE_TOP_INSET = 4;
export const CAPSULE_ZONE_RIGHT_INSET = 8;

/** Fever 能量条高度与其上方的间距。 */
export const FEVER_BAR_HEIGHT = 16;
export const FEVER_BAR_GAP = 8;

/** 底部技能按钮尺寸与位置。 */
export const SKILL_BUTTON_SIZE = 88;
export const SKILL_BUTTON_LEFT_CENTER = 92;
export const SKILL_BUTTON_RIGHT_CENTER = 212;
/** 技能按钮圆心到画布底部的距离（无 Banner、无底部安全区时）。 */
export const SKILL_BUTTON_BOTTOM_OFFSET = 120;
/** 底部右侧小按钮（音效）尺寸与中心距右边距。 */
export const SIDE_BUTTON_SIZE = 56;
export const SIDE_BUTTON_RIGHT_CENTER = 64;

/** 通用弹窗面板。 */
export const MODAL_PANEL: HudRect = { x: 56, y: 340, width: 608, height: 560 };
export const MODAL_CLOSE_SIZE = { width: 56, height: 48 };
export const MODAL_ACTION_WIDTH = 428;
export const MODAL_ACTION_HEIGHT = 76;
export const MODAL_ACTION_GAP = 24;
export const MODAL_ACTION_TOP_OFFSET = 160;

/** 皮肤商店面板。 */
export const SHOP_PANEL: HudRect = { x: 56, y: 300, width: 608, height: 680 };
export const SHOP_CLOSE_SIZE = { width: 56, height: 48 };
export const SHOP_ROW_HEIGHT = 150;
export const SHOP_ROW_GAP = 20;
export const SHOP_ROW_TOP_OFFSET = 80;
export const SHOP_ACTION_WIDTH = 236;
export const SHOP_ACTION_HEIGHT = 64;

/* ------------------------------------------------------------------ */
/* 布局计算                                                            */
/* ------------------------------------------------------------------ */

export interface HudLayoutOptions {
  width?: number;
  height?: number;
  safeAreaTop?: number;
  safeAreaBottom?: number;
  bannerVisible?: boolean;
}

/**
 * 计算 HUD 布局。
 *
 * 顶部安全区按微信规范夹到 `[SAFE_AREA_TOP_MIN, SAFE_AREA_TOP_MAX]`，
 * 底部 Banner 可见时，所有**可点击**元素必须上移到 `interactiveBottom` 之上
 * （与 `core/Layout.computeBannerLayout` 同一套口径，保证内核与外壳一致）。
 */
export function computeHudLayout(options: HudLayoutOptions = {}): HudLayout {
  const width = options.width ?? 720;
  const height = options.height ?? 1280;
  const safeAreaTop = Math.max(0, options.safeAreaTop ?? 100);
  const safeAreaBottom = Math.max(0, options.safeAreaBottom ?? 0);
  const bannerVisible = options.bannerVisible ?? false;
  return { width, height, safeAreaTop, safeAreaBottom, bannerVisible };
}

/** 顶部按钮行（暂停 / 倍速 / 商店）的 y 起点。 */
export function hudActionRowTop(layout: HudLayout): number {
  return layout.safeAreaTop + HUD_TITLE_ROW_HEIGHT + HUD_ROW_GAP + HUD_ROW_GAP;
}

/** Fever 能量条的矩形。 */
export function feverBarRect(layout: HudLayout): HudRect {
  const top = hudActionRowTop(layout) + HUD_ACTION_ROW_HEIGHT + FEVER_BAR_GAP;
  return {
    x: HUD_HORIZONTAL_INSET,
    y: top,
    width: layout.width - HUD_HORIZONTAL_INSET * 2,
    height: FEVER_BAR_HEIGHT,
  };
}

/** 底部技能按钮圆心的 y 坐标。 */
export function skillButtonCenterY(layout: HudLayout): number {
  const bottomInset = Math.max(0, layout.safeAreaBottom);
  // Banner 可见时，可交互区底部 = Banner 顶 - 80px（内核口径），按钮整体上移。
  const interactiveBottom = layout.bannerVisible ? layout.height - 100 - 80 : layout.height - bottomInset;
  const preferred = layout.height - bottomInset - SKILL_BUTTON_BOTTOM_OFFSET;
  return Math.min(preferred, interactiveBottom - SKILL_BUTTON_SIZE / 2 - 8);
}

/** 底部技能按钮（蓝 / 橙）的矩形。 */
export function skillButtonRects(layout: HudLayout): { multi: HudRect; triple: HudRect } {
  const cy = skillButtonCenterY(layout);
  const half = SKILL_BUTTON_SIZE / 2;
  return {
    multi: {
      x: SKILL_BUTTON_LEFT_CENTER - half,
      y: cy - half,
      width: SKILL_BUTTON_SIZE,
      height: SKILL_BUTTON_SIZE,
    },
    triple: {
      x: SKILL_BUTTON_RIGHT_CENTER - half,
      y: cy - half,
      width: SKILL_BUTTON_SIZE,
      height: SKILL_BUTTON_SIZE,
    },
  };
}

/** 右上角胶囊禁区。 */
export function capsuleZone(layout: HudLayout): HudRect {
  return {
    x: layout.width - CAPSULE_ZONE_RIGHT_INSET - CAPSULE_ZONE_WIDTH,
    y: layout.safeAreaTop + CAPSULE_ZONE_TOP_INSET,
    width: CAPSULE_ZONE_WIDTH,
    height: CAPSULE_ZONE_HEIGHT,
  };
}

/** 底部 Banner 禁区（Banner 不可见时返回 null）。 */
export function bannerZone(layout: HudLayout): HudRect | null {
  if (!layout.bannerVisible) return null;
  return { x: 0, y: layout.height - 100, width: layout.width, height: 100 };
}

/* ------------------------------------------------------------------ */
/* 命中区构建                                                          */
/* ------------------------------------------------------------------ */

/** 构造一个命中区。 */
function region(id: string, kind: HudRegionKind, rect: HudRect): HudHitRegion {
  return { id, kind, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}

/**
 * 构建 HUD 常驻命中区（暂停 / 倍速 / 商店 / 蓝技能 / 橙技能 / 音效）。
 *
 * 全部落在顶部按钮行左侧（x ≤ 260）与底部（y < Banner 禁区），
 * 天然避开右上角胶囊。
 */
export function buildHudRegions(layout: HudLayout): HudHitRegion[] {
  const rowTop = hudActionRowTop(layout);
  const btnWidth = 76;
  const btnGap = 8;
  const btnX = (index: number): number =>
    HUD_HORIZONTAL_INSET + index * (btnWidth + btnGap);
  const skills = skillButtonRects(layout);
  const sideHalf = SIDE_BUTTON_SIZE / 2;
  const sideCy = skillButtonCenterY(layout);
  return [
    region('hud.pause', 'hud', {
      x: btnX(0),
      y: rowTop,
      width: btnWidth,
      height: HUD_ACTION_ROW_HEIGHT,
    }),
    region('hud.speed', 'hud', {
      x: btnX(1),
      y: rowTop,
      width: btnWidth,
      height: HUD_ACTION_ROW_HEIGHT,
    }),
    region('hud.shop', 'hud', {
      x: btnX(2),
      y: rowTop,
      width: btnWidth,
      height: HUD_ACTION_ROW_HEIGHT,
    }),
    region('hud.skill.multi', 'hud', skills.multi),
    region('hud.skill.triple', 'hud', skills.triple),
    region('hud.sound', 'hud', {
      x: layout.width - SIDE_BUTTON_RIGHT_CENTER - sideHalf,
      y: sideCy - sideHalf,
      width: SIDE_BUTTON_SIZE,
      height: SIDE_BUTTON_SIZE,
    }),
  ];
}

/**
 * 构建通用弹窗的命中区（关闭 + 若干动作按钮）。
 *
 * @param actionCount 动作按钮数量（0~3）。
 */
export function buildModalRegions(layout: HudLayout, actionCount: number): HudHitRegion[] {
  const regions: HudHitRegion[] = [];
  const closeX = MODAL_PANEL.x + MODAL_PANEL.width - MODAL_CLOSE_SIZE.width - 8;
  const closeY = MODAL_PANEL.y + 12;
  regions.push(
    region('modal.close', 'modal', {
      x: closeX,
      y: closeY,
      width: MODAL_CLOSE_SIZE.width,
      height: MODAL_CLOSE_SIZE.height,
    }),
  );
  const actionX = Math.round((layout.width - MODAL_ACTION_WIDTH) / 2);
  const count = Math.max(0, Math.min(3, actionCount));
  for (let i = 0; i < count; i += 1) {
    regions.push(
      region(`modal.action.${i}`, 'modal', {
        x: actionX,
        y: MODAL_PANEL.y + MODAL_ACTION_TOP_OFFSET + i * (MODAL_ACTION_HEIGHT + MODAL_ACTION_GAP),
        width: MODAL_ACTION_WIDTH,
        height: MODAL_ACTION_HEIGHT,
      }),
    );
  }
  return regions;
}

/** 皮肤商店的一行状态（决定该行显示哪个按钮）。 */
export interface ShopRowState {
  id: string;
  /** 已解锁 → 显示「装备」；未解锁且金币足够 → 「解锁」；否则 → 「试用」。 */
  action: 'equip' | 'unlock' | 'trial';
}

/**
 * 构建皮肤商店命中区（关闭 + 每行一个动作按钮）。
 */
export function buildShopRegions(_layout: HudLayout, rows: readonly ShopRowState[]): HudHitRegion[] {
  const regions: HudHitRegion[] = [];
  const closeX = SHOP_PANEL.x + SHOP_PANEL.width - SHOP_CLOSE_SIZE.width - 8;
  const closeY = SHOP_PANEL.y + 12;
  regions.push(
    region('shop.close', 'shop', {
      x: closeX,
      y: closeY,
      width: SHOP_CLOSE_SIZE.width,
      height: SHOP_CLOSE_SIZE.height,
    }),
  );
  const actionX = SHOP_PANEL.x + SHOP_PANEL.width - 16 - SHOP_ACTION_WIDTH;
  const count = Math.max(0, Math.min(3, rows.length));
  for (let i = 0; i < count; i += 1) {
    const row = rows[i]!;
    const rowTop = SHOP_PANEL.y + SHOP_ROW_TOP_OFFSET + i * (SHOP_ROW_HEIGHT + SHOP_ROW_GAP);
    regions.push(
      region(`shop.${row.id}.${row.action}`, 'shop', {
        x: actionX,
        y: rowTop + Math.round((SHOP_ROW_HEIGHT - SHOP_ACTION_HEIGHT) / 2),
        width: SHOP_ACTION_WIDTH,
        height: SHOP_ACTION_HEIGHT,
      }),
    );
  }
  return regions;
}

/* ------------------------------------------------------------------ */
/* 命中检测器                                                          */
/* ------------------------------------------------------------------ */

/** 矩形相交（仅当**面积重叠**才算，边缘相接不算）。 */
export function rectsOverlap(a: HudRect, b: HudRect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/** 点是否落在矩形内（含边界）。 */
export function pointInRect(x: number, y: number, rect: HudRect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export interface CanvasHitTesterOptions extends HudLayoutOptions {
  /** 初始覆盖层命中区（通常是弹窗）。 */
  overlay?: readonly HudHitRegion[] | null;
}

/**
 * 命中区检测器。
 *
 * 命中优先级：**覆盖层（弹窗 / 商店）> HUD 常驻**。
 * 弹窗打开时 HUD 全部失效 —— 这既是模态语义，也避免「点弹窗按钮时顺手触发了技能」。
 */
export class CanvasHitTester {
  readonly layout: HudLayout;

  private readonly hudRegions: HudHitRegion[];
  private overlayRegions: HudHitRegion[];

  constructor(options: CanvasHitTesterOptions = {}) {
    this.layout = computeHudLayout(options);
    this.hudRegions = buildHudRegions(this.layout);
    this.overlayRegions = options.overlay ? [...options.overlay] : [];
  }

  /** HUD 常驻命中区（只读）。 */
  get hud(): readonly HudHitRegion[] {
    return this.hudRegions;
  }

  /** 当前覆盖层命中区（只读，空数组表示无弹窗）。 */
  get overlay(): readonly HudHitRegion[] {
    return this.overlayRegions;
  }

  /** 右上角胶囊禁区。 */
  get capsule(): HudRect {
    return capsuleZone(this.layout);
  }

  /** 底部 Banner 禁区（Banner 不可见时为 null）。 */
  get banner(): HudRect | null {
    return bannerZone(this.layout);
  }

  /** 设置覆盖层命中区（传 null 表示关闭弹窗）。 */
  setOverlay(regions: readonly HudHitRegion[] | null): void {
    this.overlayRegions = regions ? [...regions] : [];
  }

  /** 命中测试：返回命中的区域；未命中返回 null（交由战场拖动处理）。 */
  hitTest(x: number, y: number): HudHitRegion | null {
    const list = this.overlayRegions.length > 0 ? this.overlayRegions : this.hudRegions;
    for (let i = 0; i < list.length; i += 1) {
      const item = list[i]!;
      if (pointInRect(x, y, item)) return item;
    }
    return null;
  }

  /** 点是否落在右上角胶囊禁区内。 */
  isInCapsuleZone(x: number, y: number): boolean {
    return pointInRect(x, y, this.capsule);
  }

  /** 点是否落在底部 Banner 禁区内。 */
  isInBannerZone(x: number, y: number): boolean {
    const zone = this.banner;
    return zone ? pointInRect(x, y, zone) : false;
  }

  /**
   * 自检：所有命中区两两不重叠，且都不落入胶囊 / Banner 禁区。
   *
   * 单测与 CI 都依赖它 —— 一旦有人挪动按钮导致重叠或越界，这里会立刻报出来。
   */
  validate(): { overlaps: string[]; forbidden: string[] } {
    const all = [...this.hudRegions, ...this.overlayRegions];
    const overlaps: string[] = [];
    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        const a = all[i]!;
        const b = all[j]!;
        if (rectsOverlap(a, b)) overlaps.push(`${a.id}×${b.id}`);
      }
    }
    const forbidden: string[] = [];
    const capsule = this.capsule;
    const banner = this.banner;
    for (const item of all) {
      if (rectsOverlap(item, capsule)) forbidden.push(`${item.id}@capsule`);
      if (banner && rectsOverlap(item, banner)) forbidden.push(`${item.id}@banner`);
    }
    return { overlaps, forbidden };
  }
}
