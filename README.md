# 中国象棋

React Native + TypeScript 中国象棋对弈应用，支持 Android、iOS、Windows、macOS 和浏览器。
应用 ID：`com.zzxap.chinesechess`。

## 对弈功能

- 木质棋盘、立体棋子，支持红黑方向互换。
- 头部提供量居-家具定制、进销存、客服入口；移动端和 macOS 在应用内打开，Windows 使用系统浏览器。
- 双人对弈、人机对弈、合法落点提示、悔棋与重新开局。
- 每次落子后由 AI库分析当前局面，提示下一方建议走法。
- AI库以当前 FEN 为输入，单次默认思考 1000 ms；界面会丢弃过期结果，并校验返回着法是否合法。

## 开发

需要 Node.js 22、pnpm，以及适合当前平台的 AI库程序和模型文件。

```sh
pnpm install
pnpm dev
```

浏览器打开 http://127.0.0.1:16001/。开发服务器集成本机 AI库服务，默认从项目已有引擎资源中选择匹配 CPU 的程序。
首次使用需准备可执行文件；Intel Mac 可执行 `bash scripts/build-ai-engine-macos.sh`，M4 Mac 可执行 `bash scripts/build-ai-engine-m4.sh`。
也可通过 `AI_ENGINE_PATH` 指定可执行文件，通过 `AI_ENGINE_MODEL` 指定模型绝对路径。
棋局仅发送到本机分析服务。

原生项目开发：

```sh
bash scripts/build-ai-engine-libs.sh android
pnpm android
# Apple 先构建库，再安装 Pods
bash scripts/build-ai-engine-libs.sh apple
(cd ios && bundle exec pod install)
pnpm ios
# macOS 改为在 macos 目录安装 Pods，然后 pnpm macos
# Windows 先 powershell -File scripts/build-ai-engine-libs.ps1，再 pnpm windows
```

Android、iOS、macOS 和 Windows 通过原生接口在进程内调用 AI库，模型随应用打包，离线运行无需另装库包或启动后端。
Android 首次分析会把内置模型校验并复制到应用私有目录。浏览器开发版本仍通过本机服务计算。

iOS、Android、macOS 网页窗口使用原生 WebView；Windows 点击头部链接使用系统浏览器打开。新增依赖后需在 iOS / macOS 工程目录重新执行 `bundle exec pod install`，并重新编译原生应用。
浏览器版本使用内嵌网页，提供“在浏览器打开”入口。

依赖安装的 `postinstall` 会为 RN 0.81 的 Codegen 应用包名过滤兼容修正，防止 iOS 与 macOS 同名模块在 Xcode Generate Specs 阶段重复扫描。升级 RN 主版本时需一并检查该修正。

## 原生库

```sh
pnpm build:engine:libs
```

产物在 `AI/lib-dist`，包含 Apple XCFramework、Android 动态库、模型、许可证及对应源码。
Windows 在 Visual Studio 2022 环境运行 `scripts/build-ai-engine-libs.ps1`，生成 DLL、导入库和静态库。
详见 [AI库说明](native/ai-engine/README.md)。

## 发布与签名

推送 `v*` 版本 tag，GitHub Actions 自动构建四个平台应用及库包，并上传 GitHub Release。
用户只需下载对应平台的应用安装包；独立 AI库 ZIP 是供开发者复用的 SDK。Windows 提供包含运行文件和模型的安装 EXE 及便携 ZIP。
证书、私钥和密码通过 GitHub Actions Secrets 配置。
具体步骤见 [自动打包指南](docs/RELEASING.md)。

## 开源声明

项目自有代码采用 GPL-3.0-or-later，见 [LICENSE](LICENSE)。
第三方引擎的原始署名、项目来源、模型数据来源和许可说明保留在 [引擎声明](licenses/ENGINE_NOTICE.txt)、[作者清单](licenses/ENGINE_AUTHORS.txt)、[引擎许可证](licenses/ENGINE_LICENSE.txt) 与上游源码中。
详见 [开源发行说明](OPEN_SOURCE.md)。
