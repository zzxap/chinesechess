# AI库

AI库直接封装 C++ 象棋引擎，提供跨平台 C 接口。该封装按 GPL-3.0-or-later 发行。
原始引擎署名、来源、模型数据说明与许可保留在项目根目录的 `licenses` TXT 文件和上游源码中。

## 构建

在项目根目录执行：

```sh
bash scripts/build-ai-engine-libs.sh all
# 也可分别使用 apple 或 android
```

需要 Xcode、CMake、Ninja、Python 3；Android 默认使用与 RN 工程一致的 NDK 27.1.12297006，可通过 `ANDROID_NDK_HOME` 指定。
源码位置可用 `AI_ENGINE_SOURCE` 指定。中间文件与产物均保存在项目目录的 `AI/build`、`AI/lib-dist` 中。

- Apple：`AIEngine.xcframework`，包括 iOS arm64、模拟器 arm64/x86_64、macOS arm64/x86_64 静态库。
- Android：`android/jniLibs` 中包含 arm64-v8a/x86_64 的 `libai_engine.so` 与 C++ 运行库，最低 API 24，16 KB 页对齐。
- Windows：在 Visual Studio 2022 C++ x64 环境执行 `powershell -File scripts/build-ai-engine-libs.ps1`，生成 `ai_engine.dll`、导入库 `ai_engine.lib`、静态库 `ai_engine-static.lib`。

独立模型为库包内的 `model.nnue`。iOS 将模型作为 Bundle 资源，Android 将 assets 复制到应用私有目录，再把绝对路径传给库。

## C 接口

公共头文件为 `include/ai_engine.h`，提供 `pf_create`、`pf_analyze`、`pf_stop`、`pf_destroy`。
建议 Threads=2、Hash=32 MB，后台线程调用分析接口，默认思考 1000 ms。
输入当前 FEN，返回最佳着法、评分、深度和主变化；着法坐标为 a0–i9，评分为当前行棋方视角。
每次分析清理搜索历史，不传入先前着法。同一 handle 不可并行分析；stop 可由其他线程调用，destroy 须等待分析结束。

暂存源码时将模型验证失败改为异常返回，关闭跨进程共享内存，使用基础 NEON / SSE2 指令，并排除可执行文件入口。
修改仅作用于构建目录中的暂存副本，保留上游源文件。
暂存阶段还会将位棋盘到布尔值的隐式转换改为显式零值比较，兼容 MSVC 的 128 位整数类型。

## 集成与发行

Web 开发模式通过本机常驻进程调用 AI库。原生应用通过 Android JNI、Apple 原生模块、Windows 原生模块在后台线程调用 C 接口。
Apple 静态库与模型资源由本地 Pod 接入；Android 动态库由 CMake 导入，模型随 assets 打包；Windows 安装包包含 DLL 和模型。
每个平台均缓存进程内引擎，串行分析当前 FEN，默认思考 1000 ms。JS 校验返回局面和合法着法，丢弃过期结果。
库包含模型、许可证、作者与来源声明、对应源码、封装及构建脚本；发行完整 App 时仍需提供整个覆盖作品的对应源码。
发行流程与签名 Secrets 见 [自动打包指南](../../docs/RELEASING.md)。
