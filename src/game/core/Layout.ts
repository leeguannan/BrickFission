/**
 * 《碎砖大裂变》(Brick Fission) — 舞台布局 / 安全区 / Banner 防误触（Milestone 4）
 *
 * 实现 `docs/04_WECHAT_ADAPTATION_AND_ROADMAP.md` §2.2「安全区与 Banner 广告防遮挡铁律」：
 *   - 安全区顶部必须避开微信右上角胶囊按钮（预留 `90~110px` 逻辑高度）；
 *   - 底部 Banner 广告高度约 `100~140px`，挡板操作线必须位于 Banner 上方 ≥ `80px`，
 *     防止玩家拖板误点广告被平台判定为「诱导点击」违规。
 *
 * 纯 TypeScript：只做数值推导，不引用任何宿主环境 API，
 * 便于在 Node 环境直接单测（渲染层与平台层只消费本模块的结论）。
 */
import {
  BANNER_RESERVED_HEIGHT,
  BANNER_SAFE_CLEARANCE,
  PADDLE_Y,
  SAFE_AREA_TOP_MAX,
  WORLD_HEIGHT,
} from './constants.js';

/** Banner 与安全区布局结论。 */
export interface BannerLayout {
  /** Banner 是否处于可见状态。 */
  visible: boolean;
  /** Banner 占位区顶部 Y（逻辑 px）；不可见时等于舞台底部。 */
  bannerTop: number;
  /** 挡板操作线允许的最大 Y（逻辑 px）：再往下就进入 Banner 防误触禁区。 */
  interactiveBottom: number;
  /** 挡板操作线与 Banner 上沿的实际间距（px）；Banner 不可见时为 null。 */
  clearance: number | null;
  /** 是否满足 docs/04 §2.2 的防误触铁律。 */
  compliant: boolean;
}

/** 安全区内边距结论（供 Web 壳层写入 CSS 变量）。 */
export interface SafeAreaPadding {
  /** 顶部内边距（逻辑/设备 px）：避开右上角胶囊按钮。 */
  top: number;
  /** 底部内边距（逻辑/设备 px）：避开底部 Home Indicator。 */
  bottom: number;
}

/**
 * 计算 Banner 布局。
 *
 * @param visible Banner 是否可见（`IPlatformAdapter.setBannerVisible` 的入参）。
 * @param paddleY 挡板操作线 Y（默认使用内核常量 `PADDLE_Y`）。
 */
export function computeBannerLayout(
  visible: boolean,
  paddleY: number = PADDLE_Y,
): BannerLayout {
  if (!visible) {
    return {
      visible: false,
      bannerTop: WORLD_HEIGHT,
      interactiveBottom: WORLD_HEIGHT,
      clearance: null,
      compliant: true,
    };
  }
  const bannerTop = WORLD_HEIGHT - BANNER_RESERVED_HEIGHT;
  // 挡板操作线的允许下界：既要落在 Banner 防误触禁区之上，也不能低于挡板实际位置。
  const interactiveBottom = Math.min(paddleY, bannerTop - BANNER_SAFE_CLEARANCE);
  const clearance = bannerTop - paddleY;
  return {
    visible: true,
    bannerTop,
    interactiveBottom,
    clearance,
    compliant: clearance >= BANNER_SAFE_CLEARANCE,
  };
}

/**
 * 校验当前挡板操作线在 Banner 可见时是否满足防误触铁律。
 *
 * 这是 docs/04 §2.2 的可执行断言，供单测与 CI 复核。
 */
export function verifyBannerClearance(paddleY: number = PADDLE_Y): boolean {
  return computeBannerLayout(true, paddleY).compliant;
}

/**
 * 由平台指标推导安全区内边距。
 *
 * - 顶部：取平台上报的安全区高度，并夹到 `[0, SAFE_AREA_TOP_MAX]`，
 *   避免异常设备（例如折叠屏展开态）把顶部 HUD 撑出屏幕；
 * - 底部：直接使用平台上报值，缺失时为 0。
 */
export function computeSafeAreaPadding(metrics: {
  safeAreaTop: number;
  safeAreaBottom: number;
}): SafeAreaPadding {
  const top = Number.isFinite(metrics.safeAreaTop) ? metrics.safeAreaTop : 0;
  const bottom = Number.isFinite(metrics.safeAreaBottom) ? metrics.safeAreaBottom : 0;
  return {
    top: Math.max(0, Math.min(top, SAFE_AREA_TOP_MAX)),
    bottom: Math.max(0, bottom),
  };
}
