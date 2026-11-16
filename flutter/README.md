# 中国象棋 · Flutter

独立 Flutter 工程，包名 `com.zzxap.chinesechess`。Android、iOS、macOS、Windows 共用 Dart 界面；通过 C ABI 和 Dart FFI 调用本地 AI库，后台 Isolate 常驻引擎，不使用 HTTP 后端。

## 功能

木质棋盘和棋子、合法落点提示、红黑翻转、双人/人机对弈、悔棋、重新开局、每步 AI 提示、复制 FEN、外部网站入口。长将长捉、联网与对局计时尚未实现。

## 准备

工程骨架来自 Flutter 3.47.7 SDK，请使用该版本或更新版本与匹配 Dart SDK。原生库只支持 64 位目标。模型与库是生成文件，不提交到 Git。

```sh
cd flutter
bash tool/setup.sh
flutter run -d macos
```

`setup.sh` 依次准备库/模型、获取依赖、运行 `ffigen`、格式化 Dart、执行静态分析，不运行测试。

默认先使用父工程 `AI/lib-dist`，也能复用本机已有的旧版 SDK 目录，C ABI 一致。可显式指定 SDK：

```sh
bash tool/setup.sh --sdk /path/to/lib-dist
```

Windows 在安装 Flutter、LLVM 与 Visual Studio 后执行：

```powershell
powershell -File tool/setup.ps1 --sdk C:/path/to/lib-dist
flutter run -d windows
```

SDK 未包含 Windows DLL 时，需要先在父工程 Windows 环境运行 `scripts/build-ai-engine-libs.ps1`，或下载并解压 Windows AI SDK。不能把 macOS 静态库当成 Windows DLL 使用。

## FFI 接口生成

`native/include/ai_engine.h` 是接口来源，`ffigen.yaml` 是生成配置：

```sh
flutter pub get
dart run ffigen --config ffigen.yaml
```

输出为 `lib/ai/bindings.dart`，上层只依赖 `AiBindings`、`pf_engine`、`pf_result`，可直接重新生成。需安装 LLVM/libclang；macOS 可用 `brew install llvm`，Windows 安装 LLVM。

本次受限环境中 Dart VM 在 CPU 初始化阶段退出，尚未能实际执行 ffigen 和 Flutter analyze。当前 `bindings.dart` 明确标注为与头文件一致的启动绑定，运行上面的命令将其替换为真正的 ffigen 生成结果，不能把当前文件当作已经过生成器验证的输出。

## 原生打包

- Android：插件携带两种架构的动态库和 C++ 运行时，模型作为 Flutter asset。首次运行校验模型后复制到应用私有目录。
- Apple：插件内的 XCFramework 参与静态链接，通过保留与导出 C 符号供 `DynamicLibrary.process()` 查找；不在运行时启动子进程。安装 Pods 前先准备 native artifacts。
- Windows：插件 CMake 将 DLL 安装到程序目录，Dart 从可执行文件旁加载。
- 只有后台 Isolate 持有引擎指针；每次仅传当前 FEN、思考时间与普通结果数据，UI 不传递裸指针。

```sh
flutter build apk --release --target-platform android-arm64,android-x64
flutter build appbundle --release --target-platform android-arm64,android-x64
flutter build ios --release
flutter build macos --release
flutter build windows --release
```

`.github/workflows/flutter-static.yml` 在 Linux 上获取依赖、实际运行 ffigen、执行 Flutter 静态分析，并在通过后回写生成文件及格式化后的 Dart 源码，不运行测试。

此工程尚未接入父工程的 GitHub tag 打包工作流，也未单独配置正式签名。请在发布前配置相应平台的签名信息。

界面资源为父工程的图片与“将 + AI”图标副本。代码采用 GPL-3.0-or-later，原始引擎署名与许可保存在 `licenses/`，对应源码在父工程和发行 tag 中提供。
