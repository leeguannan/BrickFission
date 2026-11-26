/**
 * 《碎砖大裂变》(Brick Fission) — 跨端画布抽象类型
 *
 * Web 端 `HTMLCanvasElement` 与 `OffscreenCanvas` 的结构化联合类型，
 * 微信小游戏端（Milestone 4）的 `wx.createCanvas()` 同样满足该结构。
 * 渲染层只依赖本类型，不直接引用具体宿主构造器。
 */
export interface AnyCanvas {
  readonly width: number;
  readonly height: number;
  getContext(contextId: '2d'): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
}
