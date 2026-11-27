/**
 * 《碎砖大裂变》(Brick Fission) — Playwright 端到端测试配置
 *
 * 自动拉起 Vite dev server（127.0.0.1:5173），用 Chromium headless 跑
 * `tests/e2e/game.spec.ts` 的 5 条端到端链路。
 *
 * 本地运行需要指定浏览器目录（沙箱环境不能写用户缓存）：
 *   PLAYWRIGHT_BROWSERS_PATH=/tmp/dsh-pw-browsers npx playwright test
 */
import { defineConfig, devices } from '@playwright/test';

const HOST = '127.0.0.1';
const PORT = 5173;
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  // 单条用例包含激励视频倒计时（2s）与关卡切换，给足超时。
  timeout: 120_000,
  expect: { timeout: 15_000 },
  // 串行执行：dev server 单实例 + 存档共享（localStorage 按 origin 隔离，但串行更稳）。
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    // 与真机试玩一致的竖屏比例（720×1280 逻辑坐标等比缩放）。
    viewport: { width: 480, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 480, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: `npx vite --host ${HOST} --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
