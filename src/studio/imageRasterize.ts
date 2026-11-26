/**
 * Level Studio 图像/汉字二值化（DOM 层，仅在 src/studio 内使用）。
 *
 * 把文字或 PNG 渲染到离屏 canvas 并逐格采样，输出 levels 生成器需要的 BinaryGrid。
 * levels 核心模块保持无 DOM，所有 canvas/getImageData 都隔离在本文件。
 */
import type { BinaryGrid } from '../game/levels/LevelGenerators.js';

/** 二值化亮度阈值（0~255）：低于阈值的不透明像素视为前景。 */
const LUMINANCE_THRESHOLD = 140;
/** 文字 alpha 阈值。 */
const ALPHA_THRESHOLD = 128;

function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * 汉字（或任意短文本）→ 二值矩阵。文字居中铺满网格，按 alpha 采样。
 */
export function rasterizeTextToBinary(text: string, cols: number, rows: number): BinaryGrid {
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new Error('请输入要生成关卡的汉字或文本');

  const canvas = createOffscreenCanvas(cols, rows);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法创建 2D 画布上下文');

  // 白底黑字：与图片导入保持同一语义（暗像素=前景，亮像素=背景）。
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cols, rows);
  ctx.fillStyle = '#000000';
  // 用 measureText 迭代收缩字号，保证字形完整落在网格内（留 8% 边距）。
  const fontFamily = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", serif';
  const maxWidth = cols * 0.92;
  const maxHeight = rows * 0.92;
  let fontSize = Math.floor(Math.min(cols, rows));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 24; i++) {
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(trimmed);
    const textWidth = metrics.width;
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    if (textWidth <= maxWidth && textHeight <= maxHeight) break;
    fontSize = Math.max(4, Math.floor(fontSize * 0.9));
  }
  ctx.fillText(trimmed, cols / 2, rows / 2);

  return sampleBinary(ctx, cols, rows);
}

/**
 * 图片文件 → 二值矩阵。等比缩放到网格内（contain，留白），按亮度/alpha 采样。
 */
export async function rasterizeImageFileToBinary(
  file: File,
  cols: number,
  rows: number,
): Promise<BinaryGrid> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = createOffscreenCanvas(cols, rows);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('无法创建 2D 画布上下文');

    // 白底，避免透明区域被当成前景。
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cols, rows);

    // contain 等比缩放并居中。
    const scale = Math.min(cols / bitmap.width, rows / bitmap.height);
    const drawW = Math.max(1, Math.round(bitmap.width * scale));
    const drawH = Math.max(1, Math.round(bitmap.height * scale));
    const dx = Math.floor((cols - drawW) / 2);
    const dy = Math.floor((rows - drawH) / 2);
    ctx.drawImage(bitmap, dx, dy, drawW, drawH);

    return sampleBinary(ctx, cols, rows);
  } finally {
    bitmap.close();
  }
}

/** 逐格采样：透明或深色像素为前景(1)，亮底为背景(0)。 */
function sampleBinary(ctx: CanvasRenderingContext2D, cols: number, rows: number): BinaryGrid {
  const image = ctx.getImageData(0, 0, cols, rows);
  const data = new Uint8Array(cols * rows);
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    const r = image.data[p]!;
    const g = image.data[p + 1]!;
    const b = image.data[p + 2]!;
    const a = image.data[p + 3]!;
    if (a < ALPHA_THRESHOLD) {
      data[i] = 0;
      continue;
    }
    const luminance = (r + g + b) / 3;
    data[i] = luminance < LUMINANCE_THRESHOLD ? 1 : 0;
  }
  return { cols, rows, data };
}
