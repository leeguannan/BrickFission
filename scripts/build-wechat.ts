/**
 * 《碎砖大裂变》(Brick Fission) — 微信小游戏打包脚本
 *
 * 目标：把微信端入口 `src/wechat/main.ts` 打成**单文件** `dist-wechat/game.js`
 * （IIFE，可直接被微信小游戏 JS 运行时执行），并输出微信开发者工具需要的
 * `game.json` / `project.config.json` / `README_WECHAT.md`。
 *
 * 脚本内置**守门检查**（任一不通过即以非 0 退出码失败）：
 *   1. `game.js` 体积必须 < 500KB（目标区间 150KB ~ 300KB）；
 *   2. 产物内不得出现 `document.` / `HTMLCanvasElement` / `localStorage` /
 *      `eval(` / `new Function(`（微信端无 DOM，且禁止 eval 类动态执行）；
 *   3. 产物内不得出现 `window.`（避免误用浏览器全局）。
 *
 * 用法：`npm run build:wechat`
 */
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const outDir = resolve(projectRoot, 'dist-wechat');
const entryFile = resolve(projectRoot, 'src/wechat/main.ts');

/** 体积硬上限（字节）。微信小游戏主包建议 < 4MB，本项目目标更严：< 500KB。 */
const MAX_BUNDLE_BYTES = 500 * 1024;
/** 目标区间（仅用于提示，不作为失败条件）。 */
const TARGET_MIN_BYTES = 150 * 1024;
const TARGET_MAX_BYTES = 300 * 1024;

/** 产物内绝对禁止出现的字符串。 */
const FORBIDDEN_PATTERNS: ReadonlyArray<{ pattern: string; reason: string }> = [
  { pattern: 'document.', reason: '微信小游戏无 DOM，产物不得访问 document' },
  { pattern: 'HTMLCanvasElement', reason: '微信小游戏无 DOM 类型，产物不得引用 HTMLCanvasElement' },
  { pattern: 'localStorage', reason: '微信端存档走 wx.setStorageSync，产物不得使用 localStorage' },
  { pattern: 'eval(', reason: '微信审核禁止 eval 动态执行' },
  { pattern: 'new Function(', reason: '微信审核禁止 new Function 动态执行' },
  { pattern: 'window.', reason: '微信小游戏无 window 全局' },
];

const GAME_JSON = {
  deviceOrientation: 'portrait',
  showStatusBar: false,
  networkTimeout: {
    request: 10000,
  },
  subpackages: [],
  workers: '',
  openDataContext: '',
};

const PROJECT_CONFIG_JSON = {
  appid: 'touristappid',
  projectname: '砖石大裂变',
  description: '《碎砖大裂变》微信小游戏（Milestone 6 无 DOM 运行时）',
  setting: {
    urlCheck: false,
    es6: true,
    minified: false,
    postcss: false,
    minifyWXSS: false,
  },
  compileType: 'game',
  libVersion: '3.5.0',
  packOptions: {
    ignore: [],
  },
  condition: {},
};

const README = `# 《碎砖大裂变》微信小游戏打包产物

本目录由 \`npm run build:wechat\` 自动生成，**不要手工改写**（重新执行打包命令即可覆盖）。

## 目录内容

| 文件 | 说明 |
| --- | --- |
| \`game.js\` | 微信小游戏入口（单文件 IIFE，由 \`src/wechat/main.ts\` 打包而来） |
| \`game.json\` | 小游戏配置（\`deviceOrientation: "portrait"\` 竖屏） |
| \`project.config.json\` | 微信开发者工具项目配置模板 |
| \`README_WECHAT.md\` | 本文件（导入步骤与合规要点） |

## 导入步骤（微信开发者工具）

1. 打开「微信开发者工具」→ 新建/导入项目；
2. **项目目录**选择本目录（\`dist-wechat/\`），**AppID** 填自己的小游戏 AppID
   （模板里的 \`touristappid\` 是游客占位，导入后请在工具里替换）；
3. 后台「小游戏」→ 「开发设置」→ 把「游戏相关域名」留空即可（本项目不请求任何网络域名）；
4. 点击「编译」，模拟器里应看到竖屏游戏画面：顶部状态栏、砖阵、挡板；
5. 真机预览：点击「预览」扫码，确认触摸拖动能控板、底部技能按钮可点。

## 合规要点（与 \`docs/04_WECHAT_ADAPTATION_AND_ROADMAP.md\` §2 对齐）

- **无 DOM**：本产物不引用 \`document\` / \`window\` / \`HTMLCanvasElement\`，
  HUD 与弹窗全部用 Canvas 绘制（\`src/game/render/CanvasHudRenderer.ts\`）。
- **无 eval**：产物不含 \`eval(\` / \`new Function(\`。
- **安全区**：顶部预留 \`safeAreaTop\`（默认 90~110 逻辑像素）避开右上角胶囊按钮；
  底部 Banner 可见时，技能按钮整体上移并保证操作线在 Banner 上方 ≥80px。
- **切后台**：\`wx.onHide\` / \`wx.onAudioInterruptionBegin\` 自动暂停物理并挂起音频，
  回前台由玩家点击继续。
- **主包体积**：打包脚本内置守门，\`game.js\` 必须 < 500KB（目标 150KB~300KB）。

## 本地自检

\`\`\`bash
npm run build:wechat   # 重新打包 + 守门检查（体积 / 禁用字符串）
\`\`\`
`;

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)}KB`;
}

async function main(): Promise<void> {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  process.stdout.write('[build:wechat] 正在打包 src/wechat/main.ts → dist-wechat/game.js …\n');
  await build({
    configFile: false,
    logLevel: 'warn',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    build: {
      outDir,
      emptyOutDir: false,
      target: 'es2015',
      minify: 'esbuild',
      sourcemap: false,
      lib: {
        entry: entryFile,
        name: 'BrickFissionWechat',
        formats: ['iife'],
        fileName: () => 'game.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  const bundlePath = resolve(outDir, 'game.js');
  const bundle = await readFile(bundlePath, 'utf8');
  const bytes = (await stat(bundlePath)).size;

  await writeFile(resolve(outDir, 'game.json'), `${JSON.stringify(GAME_JSON, null, 2)}\n`, 'utf8');
  await writeFile(
    resolve(outDir, 'project.config.json'),
    `${JSON.stringify(PROJECT_CONFIG_JSON, null, 2)}\n`,
    'utf8',
  );
  await writeFile(resolve(outDir, 'README_WECHAT.md'), README, 'utf8');

  /* --------------------------- 守门检查 --------------------------- */
  const failures: string[] = [];

  if (bytes > MAX_BUNDLE_BYTES) {
    failures.push(
      `产物体积 ${formatKb(bytes)} 超过上限 ${formatKb(MAX_BUNDLE_BYTES)}（微信主包建议 < 4MB，本项目目标更严）`,
    );
  }
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (bundle.includes(pattern)) {
      failures.push(`产物内出现禁用串 \`${pattern}\`：${reason}`);
    }
  }

  process.stdout.write(`[build:wechat] game.js 体积：${formatKb(bytes)}\n`);
  process.stdout.write(
    `[build:wechat] 目标区间：${formatKb(TARGET_MIN_BYTES)} ~ ${formatKb(TARGET_MAX_BYTES)}\n`,
  );
  for (const { pattern } of FORBIDDEN_PATTERNS) {
    process.stdout.write(
      `[build:wechat] 禁用串 \`${pattern}\`：${bundle.includes(pattern) ? '命中（失败）' : '未命中'}\n`,
    );
  }

  if (failures.length > 0) {
    process.stderr.write('[build:wechat] ✗ 守门检查未通过：\n');
    for (const failure of failures) {
      process.stderr.write(`  - ${failure}\n`);
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `[build:wechat] ✓ 守门检查通过（${formatKb(bytes)} < ${formatKb(MAX_BUNDLE_BYTES)}，无禁用串）\n`,
  );
  process.stdout.write('[build:wechat] 产物目录：dist-wechat/（game.js / game.json / project.config.json / README_WECHAT.md）\n');
}

main().catch((error: unknown) => {
  process.stderr.write(`[build:wechat] ✗ 打包失败：${String(error)}\n`);
  process.exitCode = 1;
});
