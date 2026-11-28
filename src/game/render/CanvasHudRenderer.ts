/**
 * 《碎砖大裂变》(Brick Fission) — 微信小游戏 Canvas HUD 渲染器
 *
 * Milestone 6 需求：微信端**没有任何 DOM / CSS**，
 * 因此 Web 端的 `HudController`（DOM HUD）在微信端不可用，
 * 这里用同一套语义在 Canvas 上重画：
 *   - 顶部状态栏：关卡、剩余砖数、金币、暂停 / 倍速 / 商店按钮；
 *   - Fever 能量条（Milestone 5 / Step 2）；
 *   - 底部蓝 / 橙技能按钮（含余量角标）；
 *   - READY_AIM 瞄准提示；
 *   - 弹窗面板：暂停 / 选关、过关结算（含翻倍激励按钮）、失败复活；
 *   - 皮肤商店：3 款皮肤的切换 / 金币解锁 / 试用。
 *
 * 纪律：
 *   1. **零 arc / 零渐变 / 零路径**：全部用 `fillRect` + `fillText` 拼装，
 *      与 `Canvas2DRenderer` 的「精灵预烘焙」铁律同源；
 *   2. **零运行期分配**：数值到字符串的转换做了脏值缓存，
 *      只有数值真的变化时才重建字符串；
 *   3. **布局与命中区同源**：直接复用 `CanvasHitTester` 导出的布局常量，
 *      画的和点的永远是同一块区域。
 */
import type { FeverSnapshot, GamePhase } from '../core/types.js';
import {
  HUD_ACTION_ROW_HEIGHT,
  HUD_HORIZONTAL_INSET,
  HUD_TITLE_ROW_HEIGHT,
  MODAL_ACTION_GAP,
  MODAL_ACTION_HEIGHT,
  MODAL_ACTION_WIDTH,
  MODAL_ACTION_TOP_OFFSET,
  MODAL_PANEL,
  SHOP_ACTION_HEIGHT,
  SHOP_ACTION_WIDTH,
  SHOP_PANEL,
  SHOP_ROW_GAP,
  SHOP_ROW_HEIGHT,
  SHOP_ROW_TOP_OFFSET,
  SIDE_BUTTON_SIZE,
  feverBarRect,
  hudActionRowTop,
  skillButtonCenterY,
  skillButtonRects,
  type HudLayout,
} from '../platform/CanvasHitTester.js';

/* ------------------------------------------------------------------ */
/* 数据模型                                                            */
/* ------------------------------------------------------------------ */

/** 弹窗动作按钮。 */
export interface CanvasModalAction {
  id: string;
  label: string;
  primary?: boolean;
}

/** 通用弹窗模型。 */
export interface CanvasModalModel {
  title: string;
  body: string;
  actions: readonly CanvasModalAction[];
}

/** 皮肤商店条目。 */
export interface CanvasShopEntry {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  equipped: boolean;
  canTrial: boolean;
}

/** 皮肤商店模型。 */
export interface CanvasShopModel {
  entries: readonly CanvasShopEntry[];
}

/** Canvas HUD 的完整只读状态。 */
export interface CanvasHudModel {
  phase: GamePhase;
  levelNo: number;
  levelName: string;
  remainingBreakable: number;
  totalBreakable: number;
  coins: number;
  speedMultiplier: number;
  muted: boolean;
  paused: boolean;
  fever: FeverSnapshot;
  multiLaunchCount: number;
  tripleSplitCount: number;
  /** READY_AIM 阶段的提示文案（空串表示不显示）。 */
  aimHint: string;
  modal: CanvasModalModel | null;
  shop: CanvasShopModel | null;
}

/* ------------------------------------------------------------------ */
/* 配色                                                                */
/* ------------------------------------------------------------------ */

const COLOR_PANEL = 'rgba(9, 12, 24, 0.78)';
const COLOR_PANEL_SOLID = 'rgba(14, 19, 34, 0.96)';
const COLOR_EDGE = 'rgba(150, 190, 255, 0.45)';
const COLOR_TEXT = '#f2f6ff';
const COLOR_TEXT_DIM = '#9fb2d8';
const COLOR_ACCENT = '#4ecdc4';
const COLOR_GOLD = '#f4b740';
const COLOR_SKILL_BLUE = '#2f6fed';
const COLOR_SKILL_ORANGE = '#ff7b54';
const COLOR_DANGER = '#ef1d1d';
const COLOR_FEVER = '#ff4f8b';

/* ------------------------------------------------------------------ */
/* 渲染器                                                              */
/* ------------------------------------------------------------------ */

export interface CanvasHudRendererOptions {
  /** 布局（与命中区检测器保持同一份）。 */
  layout: HudLayout;
}

/**
 * Canvas 版 HUD 渲染器。
 *
 * 每帧调用 `draw()` 一次；内部对所有会转成字符串的数值做脏值缓存，
 * 避免每帧重复拼接（微信端低端机上字符串拼接是可见开销）。
 */
export class CanvasHudRenderer {
  readonly layout: HudLayout;

  // —— 脏值缓存 ——
  private lastLevelNo = -1;
  private lastRemaining = -1;
  private lastTotal = -1;
  private lastCoins = -1;
  private lastSpeed = -1;
  private lastMuted = false;
  private lastPaused = false;
  private lastFeverPercent = -1;
  private lastFeverActive = false;
  private lastMulti = -1;
  private lastTriple = -1;

  // —— 文本缓存 ——
  private levelText = '';
  private remainingText = '';
  private coinsText = '';
  private speedText = '';
  private feverText = '';
  private multiBadge = '';
  private tripleBadge = '';

  constructor(options: CanvasHudRendererOptions) {
    this.layout = options.layout;
  }

  /* ---------------------------------------------------------------- */
  /* 主入口                                                            */
  /* ---------------------------------------------------------------- */

  draw(ctx: CanvasRenderingContext2D, model: CanvasHudModel): void {
    this.syncTextCache(model);
    this.drawTopBar(ctx, model);
    this.drawFeverBar(ctx, model);
    this.drawSkillButtons(ctx, model);
    this.drawAimHint(ctx, model);
    if (model.shop) this.drawShop(ctx, model.shop);
    else if (model.modal) this.drawModal(ctx, model.modal);
  }

  /* ---------------------------------------------------------------- */
  /* 文本缓存                                                          */
  /* ---------------------------------------------------------------- */

  private syncTextCache(model: CanvasHudModel): void {
    if (model.levelNo !== this.lastLevelNo) {
      this.lastLevelNo = model.levelNo;
      this.levelText = `${model.levelNo} 关`;
    }
    if (model.remainingBreakable !== this.lastRemaining || model.totalBreakable !== this.lastTotal) {
      this.lastRemaining = model.remainingBreakable;
      this.lastTotal = model.totalBreakable;
      this.remainingText = `${model.remainingBreakable}/${model.totalBreakable}`;
    }
    if (model.coins !== this.lastCoins) {
      this.lastCoins = model.coins;
      this.coinsText = `币 ${model.coins}`;
    }
    if (model.speedMultiplier !== this.lastSpeed) {
      this.lastSpeed = model.speedMultiplier;
      this.speedText = `${model.speedMultiplier}×`;
    }
    if (model.multiLaunchCount !== this.lastMulti) {
      this.lastMulti = model.multiLaunchCount;
      this.multiBadge = `${model.multiLaunchCount}`;
    }
    if (model.tripleSplitCount !== this.lastTriple) {
      this.lastTriple = model.tripleSplitCount;
      this.tripleBadge = `${model.tripleSplitCount}`;
    }
    const percent = model.fever.maxEnergy > 0
      ? Math.round((model.fever.energy / model.fever.maxEnergy) * 100)
      : 0;
    if (percent !== this.lastFeverPercent || model.fever.active !== this.lastFeverActive) {
      this.lastFeverPercent = percent;
      this.lastFeverActive = model.fever.active;
      this.feverText = model.fever.active
        ? `FEVER ${model.fever.remainingSec.toFixed(1)}s`
        : 'FEVER';
    }
    this.lastMuted = model.muted;
    this.lastPaused = model.paused;
  }

  /* ---------------------------------------------------------------- */
  /* 顶部状态栏                                                        */
  /* ---------------------------------------------------------------- */

  private drawTopBar(ctx: CanvasRenderingContext2D, _model: CanvasHudModel): void {
    const { width, safeAreaTop } = this.layout;
    const top = safeAreaTop - 6;
    const height = HUD_TITLE_ROW_HEIGHT + HUD_ACTION_ROW_HEIGHT + 24;
    ctx.fillStyle = COLOR_PANEL;
    ctx.fillRect(0, top, width, height);

    // 第一行：关卡 / 剩余砖数 / 金币（全部避开右上角胶囊）
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = COLOR_TEXT;
    ctx.fillText(this.levelText, HUD_HORIZONTAL_INSET, safeAreaTop + 14);

    ctx.textAlign = 'center';
    ctx.font = '24px sans-serif';
    ctx.fillStyle = COLOR_TEXT_DIM;
    ctx.fillText(this.remainingText, width / 2, safeAreaTop + 14);

    ctx.textAlign = 'right';
    ctx.fillStyle = COLOR_GOLD;
    ctx.fillText(this.coinsText, width - HUD_HORIZONTAL_INSET - 110, safeAreaTop + 14);

    // 第二行：暂停 / 倍速 / 商店
    const rowTop = hudActionRowTop(this.layout);
    const btnWidth = 76;
    const btnGap = 8;
    this.drawChip(ctx, HUD_HORIZONTAL_INSET, rowTop, btnWidth, HUD_ACTION_ROW_HEIGHT, '暂停', false);
    this.drawChip(
      ctx,
      HUD_HORIZONTAL_INSET + (btnWidth + btnGap),
      rowTop,
      btnWidth,
      HUD_ACTION_ROW_HEIGHT,
      this.speedText,
      false,
    );
    this.drawChip(
      ctx,
      HUD_HORIZONTAL_INSET + (btnWidth + btnGap) * 2,
      rowTop,
      btnWidth,
      HUD_ACTION_ROW_HEIGHT,
      '商店',
      false,
    );

    // 静音标记（右上角胶囊左侧，避免与微信原生按钮重叠）
    ctx.textAlign = 'right';
    ctx.font = '22px sans-serif';
    ctx.fillStyle = this.lastMuted ? COLOR_DANGER : COLOR_TEXT_DIM;
    ctx.fillText(this.lastMuted ? '静音' : '有声', width - HUD_HORIZONTAL_INSET - 110, rowTop + 22);

    // 暂停标记（后台自动暂停 / 玩家主动暂停都走这里）
    if (this.lastPaused) {
      ctx.fillStyle = COLOR_DANGER;
      ctx.fillText('暂停中', width - HUD_HORIZONTAL_INSET - 170, rowTop + 22);
    }
  }

  private drawChip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    primary: boolean,
  ): void {
    ctx.fillStyle = primary ? COLOR_ACCENT : 'rgba(38, 52, 84, 0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = COLOR_EDGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = COLOR_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '22px sans-serif';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  /* ---------------------------------------------------------------- */
  /* Fever 能量条                                                      */
  /* ---------------------------------------------------------------- */

  private drawFeverBar(ctx: CanvasRenderingContext2D, _model: CanvasHudModel): void {
    const rect = feverBarRect(this.layout);
    ctx.fillStyle = 'rgba(30, 38, 62, 0.92)';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    const percent = this.lastFeverPercent < 0 ? 0 : this.lastFeverPercent;
    const width = Math.round((rect.width * percent) / 100);
    if (width > 0) {
      ctx.fillStyle = this.lastFeverActive ? COLOR_GOLD : COLOR_FEVER;
      ctx.fillRect(rect.x, rect.y, width, rect.height);
    }
    if (this.lastFeverActive) {
      ctx.strokeStyle = COLOR_GOLD;
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x - 1, rect.y - 1, rect.width + 2, rect.height + 2);
    }
    ctx.fillStyle = COLOR_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(this.feverText, rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  /* ---------------------------------------------------------------- */
  /* 底部技能按钮                                                      */
  /* ---------------------------------------------------------------- */

  private drawSkillButtons(ctx: CanvasRenderingContext2D, _model: CanvasHudModel): void {
    const rects = skillButtonRects(this.layout);
    this.drawSkillButton(ctx, rects.multi, COLOR_SKILL_BLUE, '蓝', this.multiBadge);
    this.drawSkillButton(ctx, rects.triple, COLOR_SKILL_ORANGE, '橙', this.tripleBadge);

    // 音效按钮（右下角小方块）
    const sideHalf = SIDE_BUTTON_SIZE / 2;
    const cy = skillButtonCenterY(this.layout);
    const sx = this.layout.width - 64 - sideHalf;
    ctx.fillStyle = 'rgba(38, 52, 84, 0.9)';
    ctx.fillRect(sx, cy - sideHalf, SIDE_BUTTON_SIZE, SIDE_BUTTON_SIZE);
    ctx.strokeStyle = COLOR_EDGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, cy - sideHalf + 1, SIDE_BUTTON_SIZE - 2, SIDE_BUTTON_SIZE - 2);
    ctx.fillStyle = COLOR_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '20px sans-serif';
    ctx.fillText(this.lastMuted ? '静' : '声', sx + sideHalf, cy);
  }

  private drawSkillButton(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; width: number; height: number },
    color: string,
    label: string,
    badge: string,
  ): void {
    ctx.fillStyle = color;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = COLOR_EDGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2);
    ctx.fillStyle = COLOR_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);

    // 余量角标（右上角小方块）
    const badgeSize = 26;
    const bx = rect.x + rect.width - badgeSize;
    const by = rect.y;
    ctx.fillStyle = 'rgba(9, 12, 24, 0.88)';
    ctx.fillRect(bx, by, badgeSize, badgeSize);
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(badge, bx + badgeSize / 2, by + badgeSize / 2);
  }

  /* ---------------------------------------------------------------- */
  /* READY_AIM 提示                                                    */
  /* ---------------------------------------------------------------- */

  private drawAimHint(ctx: CanvasRenderingContext2D, model: CanvasHudModel): void {
    if (!model.aimHint) return;
    ctx.fillStyle = 'rgba(9, 12, 24, 0.6)';
    ctx.fillRect(120, 300, 480, 48);
    ctx.fillStyle = COLOR_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '24px sans-serif';
    ctx.fillText(model.aimHint, 360, 324);
  }

  /* ---------------------------------------------------------------- */
  /* 通用弹窗                                                          */
  /* ---------------------------------------------------------------- */

  private drawModal(ctx: CanvasRenderingContext2D, modal: CanvasModalModel): void {
    this.drawScrim(ctx);
    ctx.fillStyle = COLOR_PANEL_SOLID;
    ctx.fillRect(MODAL_PANEL.x, MODAL_PANEL.y, MODAL_PANEL.width, MODAL_PANEL.height);
    ctx.strokeStyle = COLOR_EDGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(MODAL_PANEL.x + 1, MODAL_PANEL.y + 1, MODAL_PANEL.width - 2, MODAL_PANEL.height - 2);

    ctx.fillStyle = COLOR_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(modal.title, 360, MODAL_PANEL.y + 32);

    ctx.fillStyle = COLOR_TEXT_DIM;
    ctx.font = '22px sans-serif';
    ctx.fillText(modal.body, 360, MODAL_PANEL.y + 92);

    const actionX = Math.round((this.layout.width - MODAL_ACTION_WIDTH) / 2);
    for (let i = 0; i < modal.actions.length && i < 3; i += 1) {
      const action = modal.actions[i]!;
      const y = MODAL_PANEL.y + MODAL_ACTION_TOP_OFFSET + i * (MODAL_ACTION_HEIGHT + MODAL_ACTION_GAP);
      this.drawChip(ctx, actionX, y, MODAL_ACTION_WIDTH, MODAL_ACTION_HEIGHT, action.label, !!action.primary);
    }

    this.drawCloseChip(ctx, MODAL_PANEL.x + MODAL_PANEL.width - 64, MODAL_PANEL.y + 12);
  }

  private drawCloseChip(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = 'rgba(38, 52, 84, 0.95)';
    ctx.fillRect(x, y, 56, 48);
    ctx.strokeStyle = COLOR_EDGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, 54, 46);
    ctx.fillStyle = COLOR_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '24px sans-serif';
    ctx.fillText('×', x + 28, y + 24);
  }

  /* ---------------------------------------------------------------- */
  /* 皮肤商店                                                          */
  /* ---------------------------------------------------------------- */

  private drawShop(ctx: CanvasRenderingContext2D, shop: CanvasShopModel): void {
    this.drawScrim(ctx);
    ctx.fillStyle = COLOR_PANEL_SOLID;
    ctx.fillRect(SHOP_PANEL.x, SHOP_PANEL.y, SHOP_PANEL.width, SHOP_PANEL.height);
    ctx.strokeStyle = COLOR_EDGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(SHOP_PANEL.x + 1, SHOP_PANEL.y + 1, SHOP_PANEL.width - 2, SHOP_PANEL.height - 2);

    ctx.fillStyle = COLOR_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('皮肤商店', 360, SHOP_PANEL.y + 26);

    const actionX = SHOP_PANEL.x + SHOP_PANEL.width - 16 - SHOP_ACTION_WIDTH;
    for (let i = 0; i < shop.entries.length && i < 3; i += 1) {
      const entry = shop.entries[i]!;
      const rowTop = SHOP_PANEL.y + SHOP_ROW_TOP_OFFSET + i * (SHOP_ROW_HEIGHT + SHOP_ROW_GAP);
      ctx.fillStyle = 'rgba(30, 40, 66, 0.92)';
      ctx.fillRect(SHOP_PANEL.x + 16, rowTop, SHOP_PANEL.width - 32, SHOP_ROW_HEIGHT);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = COLOR_TEXT;
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(entry.name, SHOP_PANEL.x + 36, rowTop + 24);

      ctx.fillStyle = COLOR_TEXT_DIM;
      ctx.font = '20px sans-serif';
      const status = entry.equipped
        ? '已装备'
        : entry.unlocked
          ? '已解锁'
          : `${entry.price} 金币`;
      ctx.fillText(status, SHOP_PANEL.x + 36, rowTop + 66);

      const action = entry.equipped ? 'equip' : entry.unlocked ? 'equip' : entry.canTrial ? 'trial' : 'unlock';
      const label = action === 'equip' ? '装备' : action === 'trial' ? '试用' : '解锁';
      this.drawChip(
        ctx,
        actionX,
        rowTop + Math.round((SHOP_ROW_HEIGHT - SHOP_ACTION_HEIGHT) / 2),
        SHOP_ACTION_WIDTH,
        SHOP_ACTION_HEIGHT,
        label,
        action === 'equip',
      );
    }

    this.drawCloseChip(ctx, SHOP_PANEL.x + SHOP_PANEL.width - 64, SHOP_PANEL.y + 12);
  }

  private drawScrim(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(4, 6, 14, 0.72)';
    ctx.fillRect(0, 0, this.layout.width, this.layout.height);
  }
}
