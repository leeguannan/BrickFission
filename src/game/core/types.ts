/**
 * 《碎砖大裂变》(Brick Fission) — 核心类型契约
 *
 * 纯 TypeScript 模块：严禁引用任何宿主环境 API
 * （浏览器全局对象、Canvas / 音频上下文、动画帧调度、前端框架运行时、小游戏宿主等一律禁止）。
 * 本文件是 Milestone 1（`01_CORE_ENGINE_AND_PHYSICS_SPEC.md` §2）的类型落地面。
 *
 * 扩展策略：Step 2~4 特性只允许追加**可选**字段或**新的联合成员**，
 * 不得破坏既有字段语义（见 `docs/00_README_AND_EXECUTION_PLAYBOOK.md` §2）。
 */

/* ------------------------------------------------------------------ */
/* 游戏状态机                                                          */
/* ------------------------------------------------------------------ */

export type GamePhase =
  | 'READY_AIM'   // 开局或等待发球：球停靠在挡板上，玩家拖动瞄准并松手发射
  | 'PLAYING'     // 球飞行战斗中
  | 'PAUSED'      // 暂停
  | 'WON'         // 所有可破坏砖块清零
  | 'LOST';       // 所有活跃球出界（可触发复活或重开）

/* ------------------------------------------------------------------ */
/* 砖块                                                                */
/* ------------------------------------------------------------------ */

export type BrickRole =
  | 'EMPTY'       // 0: 空位
  | 'NORMAL'      // 1: 普通可破坏砖块（1血或多血）
  | 'STEEL'       // 2: 不可破坏灰墙（阻挡反射，不计入过关目标）
  // --- 以下为 Step 2~3 预留扩展角色，V1 解析时可先按 NORMAL 或空位降级/预留钩子 ---
  | 'BOMB'        // 炸弹砖
  | 'PRISM'       // 折射分裂砖
  | 'CORE';       // 特殊核心砖

export interface BrickCell {
  role: BrickRole;
  hp: number;
  maxHp: number;
  colorIndex: number;
  dropTag?: string;   // 预留掉落物标识
}

/* ------------------------------------------------------------------ */
/* 球与挡板                                                            */
/* ------------------------------------------------------------------ */

export interface Ball {
  id: number;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pierceCount: number; // 预留穿透次数（V1 默认 0）
  bouncesSinceBrick: number; // 连续未击碎砖块的反弹计数（防死循环用）
}

export interface Paddle {
  x: number;         // 中心 X
  y: number;         // 固定 Y = 1090
  width: number;     // 默认 116
  height: number;    // 默认 18
  targetX: number;   // 目标平滑位置
}

/* ------------------------------------------------------------------ */
/* 技能                                                                */
/* ------------------------------------------------------------------ */

export interface SkillInventory {
  multiLaunchCount: number; // 蓝标（...）：从挡板额外连发一波小球
  tripleSplitCount: number; // 橙标（品字三点）：场上现有小球全部一分为三
}

/* ------------------------------------------------------------------ */
/* 事件总线                                                            */
/* ------------------------------------------------------------------ */

export type GameEvent =
  | { type: 'BRICK_HIT'; col: number; row: number; x: number; y: number; color: string; destroyed: boolean; combo: number }
  | { type: 'WALL_HIT'; x: number; y: number }
  | { type: 'PADDLE_HIT'; x: number; y: number; offsetRatio: number }
  | { type: 'SKILL_USED'; skill: 'MULTI_LAUNCH' | 'TRIPLE_SPLIT'; spawnedCount: number }
  | { type: 'BALL_LOST'; remainingBalls: number }
  | { type: 'GAME_WON'; levelId: string; elapsedSec: number }
  | { type: 'GAME_LOST'; levelId: string; remainingRatio: number }
  // --- 追加扩展（不破坏既有成员语义）：技能溢出与残局辅助 ---
  | { type: 'DAMAGE_OVERLOAD'; multiplier: number; expiresInSec: number }
  | { type: 'ENDGAME_ASSIST'; targetCol: number; targetRow: number }
  | { type: 'SKILL_GRANTED'; skill: 'MULTI_LAUNCH' | 'TRIPLE_SPLIT'; total: number }
  // --- 追加扩展（Milestone 4 商业化预留）：复活续关 ---
  | { type: 'REVIVED'; ballCount: number };

/** 事件类型名联合，便于消费方做 switch 穷尽检查。 */
export type GameEventType = GameEvent['type'];

/* ------------------------------------------------------------------ */
/* 几何与瞄准                                                          */
/* ------------------------------------------------------------------ */

/** 轴对齐矩形（逻辑坐标系）。 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 瞄准虚线上的一个采样圆点。 */
export interface AimDot {
  x: number;
  y: number;
  /** 0~1，越接近末端越低（渲染层做轻微透明度衰减）。 */
  alpha: number;
}

/** 一次反弹的折线瞄准预测结果。 */
export interface AimPrediction {
  originX: number;
  originY: number;
  angleDeg: number;
  /** 第一段路径采样点（从发球点出发）；数组为复用缓冲，有效点数见 `firstSegmentCount`。 */
  firstSegment: AimDot[];
  /** 第一段有效圆点数量（`firstSegment` 的前 N 个元素有效）。 */
  firstSegmentCount: number;
  /** 第一个碰撞点；未命中任何障碍时为 null。 */
  hitPoint: { x: number; y: number } | null;
  /** 碰撞后的第二段折线预览（法线反射方向）；有效点数见 `secondSegmentCount`。 */
  secondSegment: AimDot[];
  /** 第二段有效圆点数量。 */
  secondSegmentCount: number;
}

/* ------------------------------------------------------------------ */
/* 关卡运行时输入                                                      */
/* ------------------------------------------------------------------ */

/**
 * RLE 符号表项：`BrickGrid` 解析 RLE 时把单字符符号翻译成格子属性。
 * 与 Milestone 3 的 `LevelSchema.TilePaletteEntry` 对齐（此处只取内核需要的最小字段集）。
 */
export interface RleSymbolSpec {
  role: BrickRole;
  hp?: number;
  colorIndex?: number;
}

/** Milestone 1 内核直接消费的关卡描述（不依赖 Milestone 3 的 `LevelSchema.ts`）。 */
export interface LevelRuntimeConfig {
  id: string;
  name?: string;
  cols: number;
  rows: number;
  /** 直接给定的扁平格子（长度 = cols * rows，行优先）。 */
  cells?: BrickCell[];
  /** RLE 压缩网格，形如 `"42.|10S22R10S|..."`。 */
  rle?: string;
  /** RLE 符号表。 */
  palette?: Record<string, RleSymbolSpec>;
  /** 开局技能存量。 */
  initialSkills?: Partial<SkillInventory>;
}

/* ------------------------------------------------------------------ */
/* 内部辅助类型                                                        */
/* ------------------------------------------------------------------ */

/** 一次砖块扣血的结果。 */
export interface BrickDamageResult {
  /** 本次是否真的造成了扣血（空位 / 已清空 / STEEL 返回 false）。 */
  damaged: boolean;
  /** 扣血后是否被击碎。 */
  destroyed: boolean;
  /** 扣血后的剩余血量。 */
  hp: number;
}

/** 球与格子 AABB 的碰撞解算结果。 */
export interface CircleAabbHit {
  /** 单位外法线（由格子指向球心方向）。 */
  nx: number;
  ny: number;
  /** 穿透深度（> 0）。 */
  depth: number;
  /** 分离轴（Ghost Vertex 防护：只在单轴上结算一次反弹）。 */
  axis: 'x' | 'y';
  /** 正面度：1 表示完全迎面撞击，0 表示擦边。 */
  frontality: number;
}
