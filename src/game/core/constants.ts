/**
 * 《碎砖大裂变》(Brick Fission) — 逻辑常量
 *
 * 全部数值来自 `docs/01_CORE_ENGINE_AND_PHYSICS_SPEC.md`。
 * 纯 TypeScript：禁止出现任何宿主环境 API。
 */

/* ------------------------------------------------------------------ */
/* §1 逻辑坐标系与舞台布局                                             */
/* ------------------------------------------------------------------ */

/** 逻辑画布宽度（固定竖屏 9:16）。 */
export const WORLD_WIDTH = 720;
/** 逻辑画布高度。 */
export const WORLD_HEIGHT = 1280;

/** 顶部 HUD 区底部边界。 */
export const HUD_TOP = 110;
/** 砖块矩阵区顶部。 */
export const ARENA_TOP = 120;
/** 砖块矩阵区底部。 */
export const ARENA_BOTTOM = 780;
/** 砖块矩阵区水平边距。 */
export const ARENA_PADDING_X = 24;
/** 砖块矩阵区可用宽度（672）。 */
export const ARENA_WIDTH = 672;
/** 砖块矩阵区可用高度（660）。 */
export const ARENA_HEIGHT = 660;

/** 挡板中心线 Y。 */
export const PADDLE_Y = 1090;
/** 死亡底线 Y（球心 `y - radius > DEATH_LINE_Y` 判定出界）。 */
export const DEATH_LINE_Y = 1190;

/** 左边界墙。 */
export const WALL_LEFT = 16;
/** 右边界墙。 */
export const WALL_RIGHT = 704;
/** 顶部边界墙。 */
export const WALL_TOP = 112;

/** 默认网格列数。 */
export const DEFAULT_COLS = 42;
/** 默认网格行数。 */
export const DEFAULT_ROWS = 38;
/** 默认单格边长。 */
export const CELL_SIZE = 16;
/** 关卡自定义列数下限。 */
export const MIN_COLS = 28;
/** 关卡自定义列数上限。 */
export const MAX_COLS = 48;
/** 关卡自定义行数下限。 */
export const MIN_ROWS = 24;
/** 关卡自定义行数上限。 */
export const MAX_ROWS = 42;

/* ------------------------------------------------------------------ */
/* §3 物理常量                                                          */
/* ------------------------------------------------------------------ */

/** 基础球速（px/s）。 */
export const BASE_BALL_SPEED = 680;
/** 球半径（px）。 */
export const BALL_RADIUS = 6.5;
/** 固定逻辑帧长（1/60 s）。 */
export const FIXED_DT = 1 / 60;

/** Sub-stepping：单子步位移不得超过半径的该比例，彻底杜绝穿墙。 */
export const SUBSTEP_DISPLACEMENT_RATIO = 0.45;

/** 挡板最大出射偏转角（68°，以垂直向上为 0°）。 */
export const PADDLE_MAX_DEFLECT_DEG = 68;

/** 防水平死循环：反弹后 |vy| 低于 speed * 该比例即视为过于水平。 */
export const MIN_VERTICAL_RATIO = 0.18;
/** 防水平死循环：强行抬升到的 |vy| 下限比例。 */
export const MIN_VERTICAL_RATIO_ENFORCED = 0.22;

/** 久未破砖自救触发阈值（累计撞击灰墙/顶边墙次数）。 */
export const DEADLOCK_BOUNCE_LIMIT = 18;
/** 自救随机偏转角下限（度）。 */
export const DEADLOCK_JITTER_DEG_MIN = 6;
/** 自救随机偏转角上限（度）。 */
export const DEADLOCK_JITTER_DEG_MAX = 12;

/** 挡板默认宽度。 */
export const PADDLE_WIDTH = 116;
/** 挡板默认高度。 */
export const PADDLE_HEIGHT = 18;
/** 挡板跟随指针的最大速度（px/s），用于 targetX → x 的平滑插值。 */
export const PADDLE_FOLLOW_SPEED = 1600;

/* ------------------------------------------------------------------ */
/* §4 瞄准                                                              */
/* ------------------------------------------------------------------ */

/** 瞄准角下限（度）。 */
export const AIM_ANGLE_MIN_DEG = -72;
/** 瞄准角上限（度）。 */
export const AIM_ANGLE_MAX_DEG = 72;
/** 射线步进长度（px）。 */
export const AIM_STEP = 4;
/**
 * 射线**碰撞检测**子步长（px）。
 *
 * 球半径 6.5px 时，沿射线方向的接触窗口宽约 13px；
 * 若沿用 4px 粗步检测会跳过浅接触窗口（表现为瞄准线"扎进"砖块），
 * 故碰撞检测收敛到 1px 子步，圆点采样仍按 `AIM_DOT_SPACING` 等距输出。
 */
export const AIM_DETECT_STEP = 1;
/** 射线最大长度（px）。 */
export const AIM_MAX_LENGTH = 900;
/** 第二段折线预览长度（px）。 */
export const AIM_SECOND_SEGMENT_LENGTH = 140;
/** 瞄准圆点采样间距（px）。 */
export const AIM_DOT_SPACING = 22;
/** 瞄准圆点末端透明度衰减比例。 */
export const AIM_DOT_FADE = 0.4;

/* ------------------------------------------------------------------ */
/* §5 技能                                                              */
/* ------------------------------------------------------------------ */

/** 物理渲染最大同屏球数（对象池固定容量）。 */
export const MAX_PHYSICAL_BALLS = 200;

/** 蓝标连发：扇形角度（度），相对垂直向上。 */
export const MULTI_LAUNCH_FAN_ANGLES: readonly number[] = [-15, -7.5, 0, 7.5, 15];
/** 蓝标连发：单次发射球数。 */
export const MULTI_LAUNCH_COUNT = 5;
/** 蓝标连发：球在挡板上的水平散布间距（px）。 */
export const MULTI_LAUNCH_SPACING = 18;
/** 蓝标连发：连续两发的间隔（ms，备用队列模式）。 */
export const MULTI_LAUNCH_INTERVAL_MS = 80;

/** 橙标分裂：新球相对原球的偏转角（度）。 */
export const TRIPLE_SPLIT_SPREAD_DEG = 22;

/** 溢出伤害转化：基础倍率。 */
export const OVERLOAD_DAMAGE_MULTIPLIER = 2;
/** 溢出伤害转化：溢出量超过该比例时升级到高倍率。 */
export const OVERLOAD_DAMAGE_MULTIPLIER_HIGH = 3;
/** 溢出伤害转化：高倍率的溢出量比例阈值（相对 MAX_PHYSICAL_BALLS）。 */
export const OVERLOAD_HIGH_RATIO = 0.5;
/** 高能破甲持续时间（秒）。 */
export const OVERLOAD_DURATION_SEC = 8;

/** 连发充能：每击碎多少块砖奖励一次技能。 */
export const SKILL_CHARGE_EVERY_BRICKS = 150;

/* ------------------------------------------------------------------ */
/* §6 残局防垃圾时间                                                     */
/* ------------------------------------------------------------------ */

/** 残局辅助：剩余可破坏砖比例阈值。 */
export const ENDGAME_REMAINING_RATIO = 0.03;
/** 残局辅助：剩余可破坏砖数量阈值。 */
export const ENDGAME_REMAINING_COUNT = 12;
/** 残局辅助：连续无砖块受击的静默时长（秒）。 */
export const ENDGAME_IDLE_SEC = 6;
/** 残局辅助：软追踪偏转角（度）。 */
export const ENDGAME_HOMING_DEG = 12;

/* ------------------------------------------------------------------ */
/* §7 商业化与安全区（Milestone 4，docs/04 §2）                        */
/* ------------------------------------------------------------------ */

/** 微信右上角胶囊按钮占用高度区间（逻辑 px）：安全区顶部必须避开该区间。 */
export const SAFE_AREA_TOP_MIN = 90;
export const SAFE_AREA_TOP_MAX = 110;

/**
 * 底部 Banner 广告预留高度（逻辑 px）。
 * 取 docs/04 §2.2 给出的区间下限 `100px`，确保挡板操作线仍在广告上方留足安全间距。
 */
export const BANNER_RESERVED_HEIGHT = 100;

/** 挡板操作线与 Banner 上沿之间的最小安全间距（逻辑 px），防止误触广告被判违规。 */
export const BANNER_SAFE_CLEARANCE = 80;

/** 失败复活赠送的球数。 */
export const REVIVE_BALL_COUNT = 3;

/** 激励广告补给技能时赠送的次数。 */
export const SKILL_REFILL_COUNT = 2;

/** 复活时新球相对垂直向上的扇形角度（度）。 */
export const REVIVE_FAN_ANGLES: readonly number[] = [-12, -4, 4, 12];

/* ------------------------------------------------------------------ */
/* 物理工具常量                                                        */
/* ------------------------------------------------------------------ */
/** 位置推出时附加的微小间隙，避免下一帧立即重复接触。 */
export const CONTACT_EPSILON = 1e-3;
/** 挡板顶面推出后的间隙（防止连续两帧重复吸附）。 */
export const PADDLE_CONTACT_GAP = 0.1;
/** 角度归一化到 (-180, 180] 的容差。 */
export const ANGLE_EPSILON = 1e-9;

/* ------------------------------------------------------------------ */
/* 默认调色板（内核事件需要输出颜色字符串；具体关卡调色板由 levels 层覆盖） */
/* ------------------------------------------------------------------ */

export const DEFAULT_BRICK_COLORS: readonly string[] = [
  '#ef1d1d', // 0 红
  '#41b06e', // 1 绿
  '#2f6fed', // 2 蓝
  '#f4b740', // 3 黄
  '#b06ab3', // 4 紫
  '#4ecdc4', // 5 青
  '#ff7b54', // 6 橙
  '#9aa4b2', // 7 钢灰
];

/** 按调色板索引取颜色（越界回退到灰色）。 */
export function brickColorAt(colorIndex: number): string {
  const palette = DEFAULT_BRICK_COLORS;
  if (!Number.isFinite(colorIndex) || colorIndex < 0 || colorIndex >= palette.length) {
    return palette[palette.length - 1]!;
  }
  return palette[Math.floor(colorIndex)]!;
}
