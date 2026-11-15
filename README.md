# ChineseChess

React Native + TypeScript 四端原生项目，共享入口为 `App.tsx`。

项目自有代码按 GPL-3.0-or-later 开源，见 [开源发行说明](OPEN_SOURCE.md)。
Pikafish 原生库构建命令为 `pnpm build:engine:libs`，接口、各平台产物和集成状态见 [原生库说明](native/pikafish/README.md)。
应用标识统一为 `com.zzxap.chinesechess`。推送 `v*` tag 自动构建 Android、iOS、Windows、macOS 并发布 GitHub Release，签名 Secrets 和产物说明见 [自动打包指南](docs/RELEASING.md)。

- Android / iOS：React Native 0.81.5
- macOS：React Native macOS 0.81.0
- Windows：React Native Windows 0.81.0（C++ / WinAppSDK 新架构）

## 安装

需要 Node.js >= 20.19.4，建议使用 Node.js 22 LTS。

```sh
npm install
```

## 浏览器开发（先看棋盘）

```sh
pnpm install
pnpm dev
```

打开 http://localhost:16001/，显示可操作的象棋界面。
网页复用 `App.tsx` 和同一套棋规、建议搜索与棋子资源，通过 React Native Web 渲染。
`pnpm dev --port 16003` 可以临时指定其它端口。

如果此前终端正在运行旧的 Metro 服务，先按 Ctrl+C 停止，再运行 `pnpm dev`。

## 原生应用开发

`pnpm dev:native` 启动 Metro 打包服务；它的根地址不显示网页棋盘。
浏览器服务与原生服务共用 16001 端口，切换时先停止之前的服务。

首次启动 macOS 应用，先安装原生依赖：

```sh
bundle install
cd macos && bundle exec pod install && cd ..
pnpm dev:native
```

另开终端：

```sh
pnpm macos --no-packager
```

Windows 上运行 `pnpm windows`，Android / iOS 分别运行 `pnpm android` / `pnpm ios`。
在 Mac 上开发 Android / iOS 时，用 `pnpm start` 启动对应开发服务。

## Android

安装 JDK 17、Android Studio 和 Android SDK，配置 ANDROID_HOME。

```sh
npm start
npm run android
```

## iOS

需要 macOS、Xcode、Ruby Bundler 和 CocoaPods。

```sh
bundle install
cd ios && bundle exec pod install && cd ..
npm start
npm run ios
```

## macOS

需要 macOS 14+、Xcode 和 CocoaPods。macOS 使用独立 Metro 配置映射原生实现；切换平台时先停止已有 Metro。

```sh
bundle install
cd macos && bundle exec pod install && cd ..
npm run start:macos
```

另开终端：

```sh
npm run macos -- --no-packager
```

## Windows

必须在 Windows 上构建，安装 Visual Studio 2022、C++ 桌面开发工作负载、Windows SDK 以及 React Native Windows 所需组件。

```sh
npm install
npm start
npm run windows
```

## 静态检查

```sh
npm run typecheck
npm run lint
```

本仓库不包含测试示例、测试依赖或测试命令。

原生工程基于官方 community template、react-native-macos 和 react-native-windows 模板生成。

## 象棋界面与资源

- `assets/chess/`：原创木纹棋盘、桌面、14 种棋子，SVG 源文件及 PNG。
- `scripts/design-assets.py`：资源生成脚本，需要 Python 3 和 rsvg-convert。
- `src/chess/engine.ts`：基础走法、送将过滤、将帅照面、胜负和建议搜索。
- `src/components/ChessBoard.tsx`：跨平台棋盘、选子、合法落点和建议箭头。
- `App.tsx`：双人 / 人机切换、悔棋、重新开局和建议一步。

搜索采用迭代加深与 Alpha-Beta 剪枝，目标深度 6 个半回合（双方各约 3 手），
每次预算约 3 秒，界面显示实际完成深度，复杂局面不保证达到 6 层。
评估只结合当前局面的子力、活动空间、兵卒位置、子力照应与将帅安全，不保证全局最优。
搜索定期让出 JS 线程，切换局面会取消旧分析。
暂不含长将长捉、重复局面和棋裁定、联网、棋钟和棋谱存储。

参考：https://github.com/kongyijilafumi/zh-chess （MIT）。
参考其规则与渲染分离的思路；未复制该仓库源码或界面素材。

## 当前验证状态

受当前环境 npm DNS 限制，尚未安装 npm / Pods 依赖，也未构建四端应用。
引擎完成 TypeScript 严格静态检查；界面完成语法检查。

## 当前局面独立计算

推荐引擎只接收当前 90 格棋子位置和当前行棋方。
历史记录仅用于悔棋、手数显示及上一手高亮，不传入搜索。
已移除历史走子次数惩罚、按已走步数变化的开局权重、棋谱推荐和棋谱加分。
`src/chess/openings.ts` 仅保留为开局资料，不再由引擎引用。

每个候选从当前布局展开，比较对方应对和后续吃子交换；
在同一完整深度中选择评分最高的一着，显示前三个候选和得失子风险。
评分包含当前子力、活动空间、兵卒位置、受攻与保护、炮的支援和将帅安全。
将军时只比较合法解将方案。

搜索使用迭代加深、Alpha-Beta 和吃子延伸。
仅在单次分析内部缓存相同棋子布局、行棋方、剩余深度与搜索层数的结果，
每次局面变化都会新建缓存，不沿用上一轮分析。
时间不足时保留最近算完的完整深度；尚未完成一层时明确标注“战术初筛”。

目标为 6 层，约 3 秒深搜预算；复杂局面可能提前结束。
同一局面在相同深度下采用相同评分规则；不同机器负载可能使完成深度不同。
限时启发式搜索不代表已经证明全局最优，亦不含依赖历史的长将长捉裁定。

## Fairy-Stockfish WASM 网页引擎

网页端默认使用官方 `fairy-stockfish-nnue.wasm` 1.1.12 的本地运行文件，
位于 `public/engines/fairy-stockfish/`，无需额外 pnpm 安装、云端请求或运行时 CDN。
本次以经典评估接入（Use NNUE=false），未加载中国象棋 NNUE 模型。

```sh
# 停止已有服务后重启，使跨源隔离响应头生效
pnpm dev
```

打开 http://localhost:16001/，点击“开始对弈”。
分析面板应显示 `Fairy-Stockfish WASM 1.1.12 · 经典评估`，显示实际搜索深度与节点数。
引擎按 3 秒思考预算搜索，不以旧引擎的 6 层为硬上限。
支持 MultiPV=3，返回建议箭头、评分和候选变化。

- 通过当前布局生成 FEN，不传入先前着法；每次分析使用独立 Worker / 引擎实例。
- 红方映射为 FEN 的白方；UCI 坐标采用 a1..i10。
- 收到的走法在交给棋盘前做坐标映射及本地合法性过滤。
- 新局面、悔棋或取消时终止旧 Worker，丢弃过期结果。
- 初始化、跨源隔离或运行失败时明确显示错误，不自动切回自写算法。
- 浏览器需要支持 WASM SIMD、多线程和 SharedArrayBuffer。
- Vite 已设置 COOP=same-origin、COEP=require-corp；正式托管也需要设置这些响应头。
- 原生 RN 平台仍使用旧 TypeScript 引擎，本次只接入网页端。

运行文件保持上游原样；GPL-3.0 许可证、作者信息、准确源码版本和下载来源
见 `public/engines/fairy-stockfish/Copying.txt`、`AUTHORS`、`SOURCE.md`。
本次验证为 TypeScript / JavaScript 静态检查及包完整性核对，未运行测试或实战验证。

## WASM / ChessDB 在线切换

分析面板支持“WASM 本地”和“ChessDB 在线”，切换后重新分析当前局面。
每次落子、悔棋和切换模式都会取消旧任务，只展示当前布局的结果。
“重新分析当前局面”可重试超时或刷新云库结果。

在线模式将当前 FEN 发往 https://www.chessdb.cn/chessdb.php，
并行读取 queryall、querybest、querypv，learn=0，不提交 queue/store。
优先采用 queryall 原始返回顺序中的首条已知合法着法，与官网列表一致；
不自行按 rank 或 score 重排，querybest 仅在没有可用列表时兜底。
未知评分 ?? 不作 0 分处理。
WASM 坐标为 a1..i10，ChessDB 为 a0..i9，分别转换并校验合法性。

网页通过 Vite 的 /api/chessdb 代理访问，避免浏览器 CORS 限制；
正式托管需要把同一路径反向代理到 ChessDB 的 /chessdb.php，
同时保留 WASM 所需 COOP / COEP 响应头。原生端直接请求 HTTPS API。
修改 Vite 配置后请停止旧服务，再运行 pnpm dev。

云库读取已有分析；未知局面可能无结果，后台分析可能有延迟，
不是每次 API 调用都会即时算出新局面。不会在无结果时悄悄切换计算来源，
页面会提示改用本地 WASM。云库未提供深度时不显示为 0 层搜索。

文档：
- https://www.chessdb.cn/cloudbook_api.html
- https://www.chessdb.cn/cloudbook_info.html

已读取实际初始局面 API 响应核对格式，并完成静态检查；未运行回归测试。

## 橘中秘 / 梅花谱短开局

默认启用“经典橘梅”，点“开局”按钮可依次切换橘中秘、梅花谱、自由计算。
收录当前已核对的三个短起手：
- 橘中秘第一局顺炮横车的前三回合。
- 梅花谱屏风马对中炮直车的前四回合。
- 梅花谱屏风马对巡河车的前四回合。

这里只收录开局片段，不是两部古谱的全本库。
止于后续弃子与带有劣着评注的变化之前，不把古谱排演当作最优着证明。
匹配完整当前 FEN 和行棋方，不根据历史步数硬套；支持左右镜像。
构建时逐手过滤非法着，推荐前检查直接得失子，明显不安全时交给引擎。
命中时优先按所选古谱起手；未命中、谱段结束或选择自由计算时，
使用所选 WASM / ChessDB 来源继续独立分析当前局面。

数据见 src/chess/classicOpenings.ts，出处：
https://hi8.com/qipu/xiangqi/juzhongmi-01-shunpao-hengche-po-zhiche
https://zh.wikisource.org/zh-hans/梅花譜

经典开局可能与实时引擎最优推荐不同；局面代码可查看当前 FEN。

## 与 ChessDB 官网首行对齐

已查看 https://www.chessdb.cn/query/file/xiangqi.js：
AsyncUpdateMoves 使用 queryall、learn=1、showall=1；DTM 使用默认值，
DTC 额外传 egtbmetric=dtc。GetMoveList 按返回行顺序渲染，没有客户端排序。
自动走棋另以 POST 请求 querybest（合理着法模式请求 query）。

本应用在线模式使用 queryall、showall=1、egtbmetric=dtm，保持服务器顺序。
learn=0 避免只读查询自动提交学习；在线模式不再被橘梅本地开局覆盖。
古谱选项仅影响本地模式。分析细节仍保持隐藏。

按用户截图着法还原的 FEN：
2bakabr1/r6c1/1cn3n2/p1p1p3p/9/1C3NR2/P1P1P3P/4C4/9/RNBAKAB2 b

实际 API 首条返回：move:d9e8,score:0,rank:2,note:! (23-02)，即黑士4进5。
querybest 对同局面亦返回 move:d9e8。

## 云库无结果时由常驻 Pikafish 补算

`pnpm dev` 现在包含 Node 后端中间件，仍使用 http://localhost:16001/。
重启开发服务后，自动启动本项目 `Pikafish/Pikafish-MacOS-universal`，
加载同目录 `pikafish.nnue`，保持进程和模型常驻。Windows / Linux 自动选择同目录对应文件。
可通过 PIKAFISH_PATH、PIKAFISH_NNUE 指定其他程序或模型路径。

查询流程：
1. 后端只读请求 ChessDB，已知着法保持官网原始顺序。
2. queryall / querybest 返回 unknown 或 nobestmove，调用本地 Pikafish。
3. 单个常驻子进程通过 stdin/stdout 通信，依次发送：

```text
ucinewgame
isready
# 收到 readyok 后
position fen <当前局面完整 FEN>
go movetime 1000
# 读取 info 和 bestmove
```

不同请求串行处理，同一局面的并发补算合并；不混用不同局面的 bestmove。
进程保留在内存，但每次 ucinewgame 清除搜索缓存，不传入历史着法。
底层通过 spawn(..., shell:false) 启动，不把 FEN 拼进 Shell 命令。
引擎超时或异常退出时释放进程，下次请求重新启动；服务停止时终止子进程。

querypv 单独无数据时，不因为缺少变化而覆盖云库已有最佳着法。
网络超时、限流和 invalid board 不冒充“云库未收录”，会明确报错。
本地结果按 ChessDB 着法格式返回，并附 X-Analysis-Source: pikafish 等响应头，
前端沿用 0–9 行坐标映射和合法性校验，不悄悄使用 WASM 代替后端补算。

可独立运行后端：

```sh
pnpm backend
```

默认仅监听 127.0.0.1:16002，提供 /api/chessdb；部署时将前端同名路径代理到它。
原生端若要使用该补算能力，需要将 cloudEndpoint.ts 指向可访问的此后端地址，
不再直连 ChessDB。当前自动接入的是网页端的同源后端。
Pikafish 程序与模型来自用户提供目录，保留目录内 GPL / NNUE 许可证。

本次完成 Node / TypeScript 静态检查，未运行测试或引擎实战验证。

## 独立 Pikafish 模式

分析面板现提供 WASM、在线云库、Pikafish 三种来源。
选择 Pikafish 后直接请求本地后端，既不访问 ChessDB，也不走橘梅古谱。
通过常驻进程按当前 FEN 执行 go movetime 1000，支持人机落子与建议箭头。
无需等云库 unknown 才能使用；模式切换会取消旧结果。

开发网页重启 pnpm dev 后即可选择。原生桌面调试需先 pnpm backend，
默认地址为 http://127.0.0.1:16002/api/chessdb；手机需将 pikafishEndpoint.ts
配置为设备可访问的后端地址，并按平台设置本地网络访问。
界面保持隐藏分析过程，局面代码弹窗可查看实际计算来源。

## Intel Mac 的 SIGILL 兼容修复

官方 Mac 通用版在当前 MacBookPro15,1 上于初始化阶段触发 SIGILL。
已在外设 Pikafish/source 下用同版本源码编译 x86-64 / SSE2 兼容程序：
Pikafish/Pikafish-MacOS-x86-64-compatible。
后端在 Intel Mac 上优先选择该文件；PIKAFISH_PATH 显式设置仍优先。

停止旧开发服务后重新 pnpm dev，使后端重新选择程序并启动常驻进程。
终端启动日志会列出实际程序路径。若此前设置 PIKAFISH_PATH 指向通用版，
请清除该变量或改为兼容程序路径。

复现编译：bash scripts/build-pikafish-macos.sh。
源码、构建日志、来源与校验值见 Pikafish/BUILD-x86-64.md。
本次为编译和静态核对，未运行引擎启动或实战验证。

## Pikafish 退出码 1：NNUE 损坏

已定位原 pikafish.nnue 解压失败，模型 SHA256 与官方同版本发布包不同。
已保留损坏文件为 Pikafish/pikafish.nnue.corrupt-backup，重新提取官方模型至原路径。
恢复后的模型通过 Zstandard 解压完整性检查，详情见 Pikafish/MODEL-RECOVERY.md。
后端现在同时收集 stdout 中的模型错误，避免只显示“退出（1）”。
重启 pnpm dev，确保常驻进程重新加载恢复后的模型。

## Apple M4 专用程序

已在外设交叉编译 Pikafish/Pikafish-MacOS-arm64-M4，要求 Apple M4 系列及 macOS 15+。
与当前已恢复完整性的 pikafish.nnue 放在同一目录即可运行。
编译采用 ARM64、apple-m4 CPU 调优、NEON dot-product，不使用通用版动态分发。
后端在原生 ARM64 Node 且 CPU 型号识别为 Apple M4 时优先选择它；
Intel Mac 仍使用 x86-64-compatible。可以通过 PIKAFISH_PATH 显式指定文件。

本机为 Intel，只完成交叉编译、架构与链接依赖核对，未在 M4 上验证实际运行。
复现脚本：scripts/build-pikafish-m4.sh；详细来源及校验值：Pikafish/BUILD-M4.md。
