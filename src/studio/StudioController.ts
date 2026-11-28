/**
 * Level Studio 可视化工作台控制器（DOM 层）。
 *
 * 功能（docs/03 §4）：
 *   1. 画笔编辑（普通砖/钢墙/橡皮）+ 左右/四象限镜像；
 *   2. 汉字/PNG 一键导入（正负空间），底层走 levels 生成器；
 *   3. 实时评分（DifficultyScorer）与死区/封门提示；
 *   4. 一键注入引擎试玩、JSON 导出。
 *
 * 纯逻辑在 studioModel，DOM/canvas 隔离在本文件；全程 createElement，禁用 innerHTML。
 */
import { DEFAULT_BRICK_COLORS, DEFAULT_COLS, DEFAULT_ROWS } from '../game/core/constants.js';
import type { LevelRuntimeConfig } from '../game/core/types.js';
import {
  DEFAULT_MECHANICS,
  fromBinaryGrid,
  type BinaryGrid,
  type SpaceMode,
} from '../game/levels/LevelGenerators.js';
import {
  serializeDefinition,
  toRuntimeConfig,
  decodeRLE,
  type LevelDefinition,
} from '../game/levels/LevelSchema.js';
import { STEP2_DEMO_LEVEL } from '../game/levels/step2DemoLevel.js';
import { scoreLevel, type ScoreResult } from '../game/levels/DifficultyScorer.js';
import { rasterizeImageFileToBinary, rasterizeTextToBinary } from './imageRasterize.js';
import {
  clearGrid,
  countTiles,
  createStudioState,
  createStudioStateFromCells,
  paintAt,
  toDefinition,
  type MirrorMode,
  type StudioState,
  type StudioTool,
} from './studioModel.js';

/** 每格显示像素（逻辑网格放大绘制）。 */
const CELL_PX = 12;
const STUDIO_LEVEL_ID = 'studio-custom';
const STUDIO_LEVEL_NAME = '工作室自定义关卡';

export interface StudioCallbacks {
  /** 一键试玩：把自定义关卡的运行时配置注入游戏。 */
  onPlay: (config: LevelRuntimeConfig) => void;
  /** 关闭工作台。 */
  onClose: () => void;
}

export class StudioController {
  private readonly callbacks: StudioCallbacks;
  private state: StudioState;
  private tool: StudioTool = 'NORMAL';
  private overlay: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private painting = false;
  private scoreOutput: HTMLElement | null = null;
  private tileCounter: HTMLElement | null = null;
  private textInput: HTMLInputElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private modeSelect: HTMLSelectElement | null = null;

  constructor(callbacks: StudioCallbacks) {
    this.callbacks = callbacks;
    this.state = createStudioState(DEFAULT_COLS, DEFAULT_ROWS);
  }

  /** 构建并挂载全屏工作台覆盖层。 */
  open(): void {
    if (this.overlay) return;
    const overlay = el('div', 'studio-overlay');
    const panel = el('div', 'studio-panel');

    panel.appendChild(this.buildHeader());
    const body = el('div', 'studio-body');
    body.appendChild(this.buildEditor());
    body.appendChild(this.buildControls());
    panel.appendChild(body);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.redraw();
    this.updateCounter();
  }

  close(): void {
    window.removeEventListener('pointerup', this.onPointerUp);
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
    this.painting = false;
  }

  /* ---------------- DOM 构建 ---------------- */

  private buildHeader(): HTMLElement {
    const header = el('div', 'studio-header');
    const title = el('div', 'studio-title');
    title.textContent = 'Level Studio 关卡工作台';
    const closeBtn = el('button', 'studio-btn');
    closeBtn.textContent = '关闭 ✕';
    closeBtn.addEventListener('click', () => {
      this.close();
      this.callbacks.onClose();
    });
    header.appendChild(title);
    header.appendChild(closeBtn);
    return header;
  }

  private buildEditor(): HTMLElement {
    const wrap = el('div', 'studio-editor-wrap');
    const canvas = document.createElement('canvas');
    canvas.className = 'studio-canvas';
    canvas.width = this.state.cols * CELL_PX;
    canvas.height = this.state.rows * CELL_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Studio 无法创建画布上下文');
    this.canvas = canvas;
    this.ctx = ctx;

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', this.onPointerUp);
    wrap.appendChild(canvas);
    return wrap;
  }

  private buildControls(): HTMLElement {
    const controls = el('div', 'studio-controls');

    // 工具选择
    controls.appendChild(section('笔刷工具'));
    const toolRow = el('div', 'studio-row');
    for (const tool of [
      ['NORMAL', '普通砖'],
      ['STEEL', '钢墙'],
      ['ERASE', '橡皮'],
      ['BOMB', '炸弹'],
      ['PRISM', '棱镜'],
      ['CORE', '核心'],
    ] as Array<[StudioTool, string]>) {
      const btn = el('button', 'studio-btn studio-tool') as HTMLButtonElement;
      btn.dataset.tool = tool[0];
      btn.textContent = tool[1];
      btn.addEventListener('click', () => this.selectTool(tool[0], btn));
      toolRow.appendChild(btn);
    }
    controls.appendChild(toolRow);

    // 镜像模式
    controls.appendChild(section('镜像模式'));
    const mirrorRow = el('div', 'studio-row');
    for (const mirror of [
      ['NONE', '不镜像'],
      ['HORIZONTAL', '左右镜像'],
      ['QUAD', '四象限'],
    ] as Array<[MirrorMode, string]>) {
      const btn = el('button', 'studio-btn studio-mirror') as HTMLButtonElement;
      btn.dataset.mirror = mirror[0];
      btn.textContent = mirror[1];
      btn.addEventListener('click', () => this.selectMirror(mirror[0], btn));
      mirrorRow.appendChild(btn);
    }
    controls.appendChild(mirrorRow);

    // 血量与颜色
    const propRow = el('div', 'studio-row');
    propRow.appendChild(labeledSelect('血量', ['1', '2', '3', '4'], (v) => {
      this.state.selectedHp = Number(v);
    }));
    const colorOptions = DEFAULT_BRICK_COLORS.map((_, i) => `颜色 ${i + 1}`);
    propRow.appendChild(labeledSelect('颜色', colorOptions, (v) => {
      this.state.selectedColorIndex = Number(v);
    }));
    controls.appendChild(propRow);

    // 汉字导入
    controls.appendChild(section('汉字 / 文本导入'));
    this.textInput = el('input', 'studio-input') as HTMLInputElement;
    this.textInput.type = 'text';
    this.textInput.placeholder = '输入汉字，如：碎砖';
    controls.appendChild(this.textInput);
    controls.appendChild(this.buildImportRow('生成汉字关卡', () => this.importText()));

    // PNG 导入
    controls.appendChild(section('PNG 图片导入'));
    this.fileInput = el('input', 'studio-file') as HTMLInputElement;
    this.fileInput.type = 'file';
    this.fileInput.accept = 'image/png,image/*';
    controls.appendChild(this.fileInput);
    controls.appendChild(this.buildImportRow('生成图片关卡', () => void this.importImage()));

    // 正负空间模式
    this.modeSelect = el('select', 'studio-select') as HTMLSelectElement;
    for (const mode of [
      ['POSITIVE', '正空间（笔画为砖）'],
      ['NEGATIVE', '负空间（镂空成形）'],
    ] as Array<[SpaceMode, string]>) {
      const opt = document.createElement('option');
      opt.value = mode[0];
      opt.textContent = mode[1];
      this.modeSelect.appendChild(opt);
    }
    controls.appendChild(this.modeSelect);

    // 评分与操作
    controls.appendChild(section('评分与操作'));
    const actionRow = el('div', 'studio-row studio-actions');
    actionRow.appendChild(actionButton('自动评分', () => this.runScore()));
    actionRow.appendChild(actionButton('清空', () => {
      clearGrid(this.state);
      this.redraw();
      this.updateCounter();
    }));
    actionRow.appendChild(actionButton('一键试玩', () => this.play()));
    actionRow.appendChild(actionButton('导出 JSON', () => this.exportJson()));
    actionRow.appendChild(actionButton('载入 Step2 演示关', () => this.loadStep2Demo()));
    controls.appendChild(actionRow);

    this.tileCounter = el('div', 'studio-counter');
    controls.appendChild(this.tileCounter);
    this.scoreOutput = el('div', 'studio-score');
    controls.appendChild(this.scoreOutput);

    this.selectTool('NORMAL', toolRow.querySelector('[data-tool="NORMAL"]') as HTMLButtonElement);
    this.selectMirror('NONE', mirrorRow.querySelector('[data-mirror="NONE"]') as HTMLButtonElement);
    return controls;
  }

  private buildImportRow(label: string, onClick: () => void): HTMLElement {
    const row = el('div', 'studio-row');
    row.appendChild(actionButton(label, onClick));
    return row;
  }

  /* ---------------- 交互 ---------------- */

  private selectTool(tool: StudioTool, btn: HTMLButtonElement): void {
    this.tool = tool;
    this.markActive('.studio-tool', btn);
  }

  private selectMirror(mirror: MirrorMode, btn: HTMLButtonElement): void {
    this.state.mirror = mirror;
    this.markActive('.studio-mirror', btn);
  }

  private markActive(selector: string, active: HTMLButtonElement): void {
    const root = this.overlay;
    if (!root) return;
    root.querySelectorAll(selector).forEach((node) => node.classList.remove('is-active'));
    active.classList.add('is-active');
  }

  private cellFromEvent(e: PointerEvent): { col: number; row: number } | null {
    const canvas = this.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * this.state.cols);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * this.state.rows);
    if (col < 0 || col >= this.state.cols || row < 0 || row >= this.state.rows) return null;
    return { col, row };
  }

  private onPointerDown(e: PointerEvent): void {
    this.painting = true;
    canvasSetPointerCapture(this.canvas, e);
    const cell = this.cellFromEvent(e);
    if (cell) {
      paintAt(this.state, cell.col, cell.row, this.tool);
      this.redraw();
      this.updateCounter();
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.painting) return;
    const cell = this.cellFromEvent(e);
    if (cell) {
      paintAt(this.state, cell.col, cell.row, this.tool);
      this.redraw();
      this.updateCounter();
    }
  }

  private readonly onPointerUp = (): void => {
    this.painting = false;
  };

  /* ---------------- 导入 / 评分 / 试玩 / 导出 ---------------- */

  private currentSpaceMode(): SpaceMode {
    return (this.modeSelect?.value as SpaceMode) ?? 'POSITIVE';
  }

  private applyBinary(binary: BinaryGrid): void {
    const def = fromBinaryGrid(binary, {
      id: STUDIO_LEVEL_ID,
      name: STUDIO_LEVEL_NAME,
      cols: this.state.cols,
      rows: this.state.rows,
      mode: this.currentSpaceMode(),
      frame: true,
    });
    this.loadDefinition(def);
  }

  private importText(): void {
    const text = this.textInput?.value ?? '';
    try {
      const binary = rasterizeTextToBinary(text, this.state.cols, this.state.rows);
      this.applyBinary(binary);
      this.flashMessage(`已按「${this.currentSpaceMode()}」生成汉字关卡`);
    } catch (err) {
      this.flashMessage((err as Error).message, true);
    }
  }

  private async importImage(): Promise<void> {
    const file = this.fileInput?.files?.[0];
    if (!file) {
      this.flashMessage('请先选择 PNG 图片', true);
      return;
    }
    try {
      const binary = await rasterizeImageFileToBinary(file, this.state.cols, this.state.rows);
      this.applyBinary(binary);
      this.flashMessage(`已按「${this.currentSpaceMode()}」生成图片关卡`);
    } catch (err) {
      this.flashMessage(`图片导入失败: ${(err as Error).message}`, true);
    }
  }

  private loadDefinition(def: LevelDefinition): void {
    // 用生成结果重建编辑状态，保留当前镜像/笔刷设置。
    const runtime = toRuntimeConfig(def);
    const cells = runtime.cells;
    if (!cells) throw new Error('生成关卡缺少 cells 数据');
    const mirror = this.state.mirror;
    const selectedHp = this.state.selectedHp;
    const selectedColorIndex = this.state.selectedColorIndex;
    this.state = {
      cols: def.cols,
      rows: def.rows,
      cells: cells.map((c) => ({ ...c })),
      mirror,
      selectedHp,
      selectedColorIndex,
    };
    this.resizeCanvas();
    this.redraw();
    this.updateCounter();
  }

  private runScore(): void {
    try {
      const def = toDefinition(this.state, STUDIO_LEVEL_ID, STUDIO_LEVEL_NAME, DEFAULT_MECHANICS);
      const result: ScoreResult = scoreLevel(def);
      const b = result.breakdown;
      this.scoreOutput!.replaceChildren(); // 红线：禁 innerHTML，统一用 DOM API 清空
      const lines = [
        `综合难度：${result.totalScore}（${result.tier}）`,
        `可破坏砖：${result.breakableCount}　钢墙遮挡：${(result.steelOcclusionRatio * 100).toFixed(1)}%`,
        `20 秒盲测清砖率：${(result.simBreakRate20s * 100).toFixed(1)}%　耗时 ${b.simElapsedMs.toFixed(1)}ms`,
        `死区警告：${result.hasDeadZoneWarning ? '是 ⚠' : '否'}　发球线封死：${b.launchLineBlocked ? '是 ⚠' : '否'}`,
        `死区砖数：${b.deadZoneBrickCount}　底部入口宽：${b.entranceWidth} 格`,
      ];
      for (const line of lines) {
        const div = el('div', result.hasDeadZoneWarning || b.launchLineBlocked ? 'studio-warn' : '');
        div.textContent = line;
        this.scoreOutput!.appendChild(div);
      }
    } catch (err) {
      this.flashMessage(`评分失败: ${(err as Error).message}`, true);
    }
  }

  private play(): void {
    try {
      const def = toDefinition(this.state, STUDIO_LEVEL_ID, STUDIO_LEVEL_NAME, DEFAULT_MECHANICS);
      const config = toRuntimeConfig(def);
      this.close();
      this.callbacks.onPlay(config);
    } catch (err) {
      this.flashMessage(`无法试玩: ${(err as Error).message}`, true);
    }
  }

  /** 载入 Step 2 特殊砖演示关（炸弹 / 棱镜 / 核心），用于快速体验与教学。 */
  private loadStep2Demo(): void {
    const def = STEP2_DEMO_LEVEL;
    const { cells } = decodeRLE(def.rleGrid, def.cols, def.rows, def.palette);
    const next = createStudioStateFromCells(def.cols, def.rows, cells);
    next.mirror = this.state.mirror;
    this.state = next;
    this.redraw();
    this.updateCounter();
    this.flashMessage('已载入 Step 2 特殊砖演示关');
  }

  private exportJson(): void {
    try {
      const def = toDefinition(this.state, STUDIO_LEVEL_ID, STUDIO_LEVEL_NAME, DEFAULT_MECHANICS);
      const json = serializeDefinition(def);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${STUDIO_LEVEL_ID}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.flashMessage('已导出 JSON 文件');
    } catch (err) {
      this.flashMessage(`导出失败: ${(err as Error).message}`, true);
    }
  }

  /* ---------------- 渲染 ---------------- */

  private resizeCanvas(): void {
    if (!this.canvas) return;
    this.canvas.width = this.state.cols * CELL_PX;
    this.canvas.height = this.state.rows * CELL_PX;
  }

  private redraw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { cols, rows, cells } = this.state;
    ctx.clearRect(0, 0, cols * CELL_PX, rows * CELL_PX);
    // 背景
    ctx.fillStyle = '#0b1538';
    ctx.fillRect(0, 0, cols * CELL_PX, rows * CELL_PX);
    // 网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      ctx.moveTo(c * CELL_PX + 0.5, 0);
      ctx.lineTo(c * CELL_PX + 0.5, rows * CELL_PX);
    }
    for (let r = 0; r <= rows; r++) {
      ctx.moveTo(0, r * CELL_PX + 0.5);
      ctx.lineTo(cols * CELL_PX, r * CELL_PX + 0.5);
    }
    ctx.stroke();
    // 砖块
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r * cols + c]!;
        if (cell.role === 'EMPTY') continue;
        const x = c * CELL_PX + 1;
        const y = r * CELL_PX + 1;
        const size = CELL_PX - 2;
        if (cell.role === 'STEEL') {
          ctx.fillStyle = '#7d8594';
          ctx.fillRect(x, y, size, size);
        } else if (cell.role === 'BOMB' || cell.role === 'PRISM' || cell.role === 'CORE') {
          // 特殊砖：与普通砖靠「底色 + 徽记」区分，不靠纯色。
          ctx.fillStyle = SPECIAL_BRICK_STUDIO_FILL[cell.role];
          ctx.fillRect(x, y, size, size);
          ctx.fillStyle = SPECIAL_BRICK_STUDIO_MARK[cell.role];
          drawSpecialGlyph(ctx, cell.role, x, y, size);
        } else {
          ctx.fillStyle = DEFAULT_BRICK_COLORS[cell.colorIndex] ?? DEFAULT_BRICK_COLORS[0]!;
          ctx.fillRect(x, y, size, size);
        }
        if (cell.maxHp > 1) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x + 1, y + size - 3, (size - 2) * (cell.hp / cell.maxHp), 2);
        }
      }
    }
  }

  private updateCounter(): void {
    if (!this.tileCounter) return;
    const { breakable, steel } = countTiles(this.state);
    this.tileCounter.textContent = `当前：可破坏砖 ${breakable}　钢墙 ${steel}　网格 ${this.state.cols}×${this.state.rows}`;
  }

  private flashMessage(message: string, isError = false): void {
    if (!this.scoreOutput) return;
    this.scoreOutput.replaceChildren();
    const div = el('div', isError ? 'studio-warn' : 'studio-info');
    div.textContent = message;
    this.scoreOutput.appendChild(div);
  }
}

/* ---------------- DOM 小工具（集中管理，禁 innerHTML 注入业务字符串） ---------------- */

/** 特殊砖在工作台里的底色（与游戏内贴图徽记风格呼应）。 */
const SPECIAL_BRICK_STUDIO_FILL: Record<'BOMB' | 'PRISM' | 'CORE', string> = {
  BOMB: '#1b1b2f',
  PRISM: '#123a4d',
  CORE: '#5a3a05',
};

/** 特殊砖徽记颜色。 */
const SPECIAL_BRICK_STUDIO_MARK: Record<'BOMB' | 'PRISM' | 'CORE', string> = {
  BOMB: '#ff6b3d',
  PRISM: '#7dd3fc',
  CORE: '#f59e0b',
};

/** 绘制特殊砖徽记（炸弹引信点 / 棱镜三角 / 核心方环）。 */
function drawSpecialGlyph(
  ctx: CanvasRenderingContext2D,
  role: 'BOMB' | 'PRISM' | 'CORE',
  x: number,
  y: number,
  size: number,
): void {
  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  if (role === 'BOMB') {
    ctx.fillRect(cx - 1.5, y + size * 0.18, 3, 3);
    ctx.fillRect(cx - 0.5, cy - 1, 1, size * 0.55);
    return;
  }
  if (role === 'PRISM') {
    ctx.beginPath();
    ctx.moveTo(cx, y + size * 0.2);
    ctx.lineTo(x + size * 0.78, y + size * 0.78);
    ctx.lineTo(x + size * 0.22, y + size * 0.78);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.fillStyle = SPECIAL_BRICK_STUDIO_MARK[role];
  ctx.fillRect(cx - size * 0.26, cy - size * 0.26, size * 0.52, size * 0.52);
  ctx.fillStyle = SPECIAL_BRICK_STUDIO_FILL[role];
  ctx.fillRect(cx - size * 0.12, cy - size * 0.12, size * 0.24, size * 0.24);
}

function el(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function section(title: string): HTMLElement {
  const node = el('div', 'studio-section-title');
  node.textContent = title;
  return node;
}

function actionButton(label: string, onClick: () => void): HTMLButtonElement {
  const btn = el('button', 'studio-btn studio-action') as HTMLButtonElement;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function labeledSelect(
  label: string,
  options: readonly string[],
  onChange: (value: string) => void,
): HTMLElement {
  const wrap = el('label', 'studio-labeled');
  const text = el('span', 'studio-label');
  text.textContent = label;
  const select = document.createElement('select');
  select.className = 'studio-select';
  options.forEach((optText, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = optText;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => onChange(select.value));
  wrap.appendChild(text);
  wrap.appendChild(select);
  return wrap;
}

function canvasSetPointerCapture(canvas: HTMLCanvasElement | null, e: PointerEvent): void {
  if (!canvas) return;
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    // 某些环境不支持 pointer capture，忽略即可，pointerup 仍在 window 上兜底。
  }
}
