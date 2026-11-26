# 《碎砖大裂变》（Brick Fission）— 架构总览、工程规范与 MiniMax 协作手册

> **正式名称**：中文名 **《碎砖大裂变》** / 英文名 **Brick Fission**（本地存档 Key 前缀统一使用 `brick_fission_`）。
> **文档定位**：本系列文档由技术负责人兼架构师编制，用于指导 **MiniMax** 进行高质量、模块化、零耦合的代码实现，并作为后续 **Code Review（代码审核）** 的唯一验收标准。
> **首期目标**：在当前 Vite + TypeScript Web 工程中跑通完整可玩、极度解压、手感丝滑的 **Web 预览版** 与 **可视化关卡工作台（Level Studio）**，同时保持核心引擎 **100% 脱离 DOM 与 React**，为下一阶段一键迁移至 **微信小游戏（WeChat Mini Game）** 做好完整架构铺垫。

---

## 1. 文档导航

| 文档 | 核心内容 | 适用阶段 |
| :--- | :--- | :--- |
| **`00_README_AND_EXECUTION_PLAYBOOK.md`** | 工程目录结构、架构红线、MiniMax 分阶段开发任务书与审核清单 | 全程必读 |
| **`01_CORE_ENGINE_AND_PHYSICS_SPEC.md`** | 逻辑坐标系、核心接口契约、`O(1)` 网格 + Sub-stepping 物理、瞄准与双技能系统 | Milestone 1 |
| **`02_RENDERER_AUDIO_AND_VISUAL_SPEC.md`** | 视觉规范、离屏分层 `IRenderer`、对象池规范、原创 WebAudio 音阶合成与动态 BGM | Milestone 2 |
| **`03_LEVEL_TOOLING_AND_SCORING_SPEC.md`** | 可扩展关卡 Schema、三大自动化生成器、Headless 难度打分引擎、Web 关卡工作台 | Milestone 3 |
| **`04_WECHAT_ADAPTATION_AND_ROADMAP.md`** | 微信小游戏适配层与商业化预留接口、合规清单、Step 1~4 独特性演进预埋 | Milestone 4 |

---

## 2. 推荐工程目录结构

项目在现有 Vite + React + Tailwind 工作区中演进，**严格划分“纯游戏内核（无框架）”与“Web 外壳/编辑器 UI（React）”**：

```text
src/
├── game/                          # 【核心游戏工程：零 React、零 DOM 强绑定、可直接迁移至微信小游戏】
│   ├── core/                      # 100% 纯 TypeScript（无 Canvas/Audio/window/wx 依赖，可在 Node 跑单测）
│   │   ├── types.ts               # 全局核心类型、状态机、事件总线定义
│   │   ├── constants.ts           # 逻辑分辨率(720x1280)、物理常量、技能默认参数
│   │   ├── BrickGrid.ts           # 网格数据结构、RLE 解析、邻域查询
│   │   ├── PhysicsEngine.ts       # Sub-stepping CCD、圆-格AABB碰撞、防卡死、反射角计算
│   │   ├── AimRaycaster.ts        # 虚线瞄准与一次反弹折线预测
│   │   ├── SkillSystem.ts         # 蓝标连发 / 橙标×3分裂 / 球数上限溢出转化
│   │   ├── GameEngine.ts          # 固定时间步长主控状态机、快进(1x/2x/3x)、胜负判定
│   │   └── __tests__/             # Node 原生 node:test 单元测试（物理边界、防穿透、RLE编解码）
│   ├── render/                    # 渲染抽象与 Canvas 2D 高性能实现
│   │   ├── IRenderer.ts           # 渲染后端抽象接口（后续可无缝替换为 WebGLRenderer）
│   │   ├── ParticlePool.ts        # 定长预分配粒子对象池（零 GC）
│   │   ├── SkinRegistry.ts        # 挡板与小球皮肤定义（默认胶囊、竹节、极简白等）
│   │   └── Canvas2DRenderer.ts    # 离屏静态砖块缓存 + 预烘焙精灵图集渲染器
│   ├── audio/                     # 原创程序化音频引擎
│   │   ├── IAudioEngine.ts        # 音频接口抽象
│   │   ├── AudioLimiter.ts        # 并发熔断与冷却节流器（防百球爆音）
│   │   ├── ProceduralSFX.ts       # WebAudio 五声音阶连击合成器（撞砖/撞板/分裂/爆破/过关）
│   │   └── AdaptiveBGM.ts         # 多轨分层音序器背景音乐（随场上球数动态叠轨）
│   ├── levels/                    # 关卡系统与自动化生成器（纯 TS，可被浏览器与 Node 共用）
│   │   ├── LevelSchema.ts         # 调色板 + RLE 压缩结构 + 扩展字段
│   │   ├── LevelGenerators.ts     # 图片/文字转关卡、对称图腾生成、迷宫掘进生成
│   │   ├── DifficultyScorer.ts    # 静态拓扑评分 + Headless 物理盲测评分引擎
│   │   └── builtinLevels.ts       # 首批精选 20~30 关内置关卡包
│   └── platform/                  # 平台适配层（Web 与 微信小游戏隔离）
│       ├── IPlatformAdapter.ts    # 存储、广告、社交、震动、生命周期统一接口
│       ├── WebAdapter.ts          # Web 浏览器实现（LocalStorage + 模拟广告回调弹窗）
│       └── WechatAdapter.stub.ts  # 微信小游戏 wx.* 规范实现模板（待真机接入）
├── studio/                        # 【Web 端关卡工作台 UI（React + Tailwind）】
│   ├── LevelStudioModal.tsx       # 画笔/镜像绘制、PNG/汉字一键生成、实时难度打分面板
│   └── LevelSimulatorRunner.ts    # 调用 core/ 进行一键试玩与评分校验
└── app/                           # 【Web 预览壳层（React + Tailwind）】
    ├── GameCanvasView.tsx         # 挂载 Canvas2DRenderer 与触摸/鼠标输入桥接
    ├── SkinSelectorModal.tsx      # 皮肤切换（展示胶囊/竹节/极简白皮肤效果）
    └── App.tsx                    # 选关/游戏/编辑器入口
```

---

## 3. 架构师硬性红线（MiniMax 编码禁止触犯，Code Review 必查）

1. **物理与视图严格隔离**：`src/game/core/` 内**严禁**出现 `document`、`window`、`HTMLCanvasElement`、`AudioContext`、`requestAnimationFrame`、`React` 或 `wx`。必须做到纯 Node.js 环境可直接 `import` 并运行测试。
2. **主循环零 GC 原则**：在 `GameEngine.step(dt)` 和 `IRenderer.render()` 的高频每帧路径中，**严禁**频繁 `new` 对象、使用 `.filter()` / `.map()` / 展开运算符 `[...arr]` 产生临时垃圾数组。粒子、球池、碰撞候选列表必须复用定长数组或对象池。
3. **微信安全规范红线**：全项目禁止使用 `eval()`、`new Function()`、动态脚本注入及任何依赖浏览器专属 `innerHTML` 的游戏内 UI。
4. **物理防穿透铁律**：绝对禁止“单帧一次性 `x += vx * dt`”的朴素碰撞，必须严格按 `01` 号文档执行 **Sub-stepping（步长细分）+ 网格直接索引**。
5. **音频防爆音铁律**：所有撞击音效必须经过 `AudioLimiter` 冷却节流，不允许未限流直接触发 WebAudio 节点。
6. **禁止大包大揽式一次性生成**：必须严格按照下方 4 个 Milestone 分步提交给 MiniMax，每完成一个 Milestone 必须先经架构师 Code Review 通过后再进入下一阶段。

---

## 4. MiniMax 分阶段开发与审核执行路线（Execution Playbook）

### Milestone 1：纯 TS 物理内核与自动化单元测试
* **指令范围**：依据 `01_CORE_ENGINE_AND_PHYSICS_SPEC.md`，实现 `src/game/core/` 全部模块及 `node:test` 单元测试。
* **完成标志**：不依赖浏览器，在终端通过 `npx tsx --test src/game/core/__tests__/*.test.ts` 验证：
  * `×3` 快进下小球撞击 1 格厚灰墙不穿透；
  * 水平死循环自动扰动逃逸；
  * 蓝标连发与橙标 `×3` 分裂（含达到 200 球上限后的伤害溢出倍率转化）精确无误。
* **Code Review 重点**：Sub-stepping 步进边界、圆与多格交界角点碰撞法线是否出现鬼影反弹（Ghost Vertex）。

### Milestone 2：离屏 Canvas 2D 渲染器、皮肤与原创 WebAudio 引擎 + Web 试玩闭环
* **指令范围**：依据 `02_RENDERER_AUDIO_AND_VISUAL_SPEC.md`，实现 `src/game/render/`、`src/game/audio/`、`src/game/platform/WebAdapter.ts` 及 `src/app/` 基础试玩界面。
* **完成标志**：打开网页即可上手玩通 3 个内置示例关（包含齿轮挖洞关、汉字“干”关、双列框体关），支持鼠标/触摸平滑拖板、虚线折射瞄准、蓝/橙技能触发、`1x/2x/3x` 快进、竹节皮肤切换、以及清脆上升音阶音效与动态 BGM。
* **Code Review 重点**：静态砖块是否真正在离屏 Canvas 缓存（而非每帧循环画 2000 次 `fillRect`）；粒子对象池是否存在数组泄漏；音频在百球钻洞时是否不破音、不卡顿。

### Milestone 3：自动化关卡工具、难度评分器与 20+ 精选关卡库
* **指令范围**：依据 `03_LEVEL_TOOLING_AND_SCORING_SPEC.md`，实现 `src/game/levels/` 与 `src/studio/`，内置至少 20 关由浅入深的精选关卡（覆盖对称图腾、汉字、迷宫挖洞）。
* **完成标志**：可在 Web 端打开 Level Studio，上传图片或输入汉字一键生成关卡，点击“自动评分”可在 300ms 内输出 0~100 难度分与盲测挖洞率，并一键试玩。
* **Code Review 重点**：RLE 编解码无损性；Headless 模拟器是否真正与游戏物理共用同一套 `GameEngine`（禁止写两套物理代码）。

### Milestone 4：商业化预留接口、微信适配层规范与整体压测
* **指令范围**：依据 `04_WECHAT_ADAPTATION_AND_ROADMAP.md`，补全 `IPlatformAdapter` 的广告复活/技能补给/双倍结算流程（Web 端用可控调试弹窗模拟）、本地存档持久化、`WechatAdapter.stub.ts` 完整对接代码，以及残局防枯燥加速逻辑。
* **完成标志**：`npm run lint`（`tsc --noEmit`）零报错、`npm run build` 成功，300 球同屏性能监控稳定 60 FPS，所有 Step 2~4 扩展位接口清晰。
