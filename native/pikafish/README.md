# Pikafish 原生库

固定上游版本：Pikafish `Pikafish-2026-09-06`，https://github.com/official-pikafish/Pikafish 。
封装及修改按 GPL-3.0-or-later 发布。库直接调用 C++ Engine，不使用子进程、stdin/stdout 或 Node 服务。

## 构建

在项目根目录执行 `bash scripts/build-pikafish-libs.sh all`，或单独使用 `apple` / `android`。
需要 Xcode、CMake、Ninja、Python 3；Android 默认使用 NDK 28.2.13676358，可通过 `ANDROID_NDK_HOME` 指定。
全部中间文件和产物位于外设的 `Pikafish/lib-build`、`Pikafish/lib-dist`。

- Apple：`Pikafish.xcframework`，包含 iOS arm64、模拟器 arm64/x86_64、macOS arm64/x86_64 静态库；链接 C++ 标准库。
- Android：`android/jniLibs/{arm64-v8a,x86_64}/libpikafish.so` 与 `libc++_shared.so`，最低 API 24，16 KB ELF 页对齐。RN 打包时应复用同一 NDK 的 C++ 运行库，避免重复打包。
- Windows：安装 Visual Studio 2022 C++ x64 工具后执行 `powershell -File scripts/build-pikafish-libs.ps1`，生成 DLL、导入库与 `pikafish-static.lib` 静态库。tag 工作流也会在 Windows runner 构建并上传库包；当前 Mac 不交叉编译 Windows 库。

模型是独立文件 `pikafish.nnue`，应用须随安装包附带：iOS 取 Bundle 资源路径，Android 将 assets 文件复制到应用私有目录后传入绝对路径。不得把桌面可执行文件当作移动端库。

## 接口与集成状态

头文件 `include/pikafish.h` 提供 `pf_create`、`pf_analyze`、`pf_stop`、`pf_destroy`。
创建时建议 Threads=2、Hash=32 MB；分析在后台线程执行，传入当前 FEN 和 1000 ms。
返回 `bestmove` 使用 UCI 象棋坐标 a0–i9，与现有后端一致。评分为当前行棋方视角。
每次分析清理搜索历史，不传入之前着法。棋盘规则校验、过期请求丢弃仍由应用层负责。
同一个 handle 禁止并行 analyze；stop 可以从其他线程调用。destroy 必须等 analyze 返回。

当前为 C ABI 库构建层；RN 的 Objective-C++ / JNI 桥接和原生模式切换尚未接入，现有 Web Pikafish 仍使用服务器进程。

## 对上游的库专用修改

`prepare.py` 在各构建目录暂存源码，未改动原始源文件：

1. NNUE 验证失败改为抛出异常，由 C API 返回错误，避免 exit 终止宿主应用。
2. 关闭跨进程共享内存，使用上游进程内内存回退，适应移动端沙盒。
3. 排除 main / universal 分发入口，导出稳定 C 接口；ARM64 使用基础 NEON，x86_64 使用 SSE2，不要求 M4 / AVX 指令。

## 开源发行与商店

库包含 GPL 正文、上游 AUTHORS/README、固定模型和对应引擎源码、封装、构建脚本。
引擎源码包中的构建默认路径应通过 `-DPIKAFISH_SOURCE=<解压目录>/upstream/src` 指定。
这只是引擎的源码包；正式发行链接该库的 App 时，还须提供整个覆盖作品的对应源码、依赖版本与必要构建说明。
项目中其他第三方代码、图片及字体仍按各自许可证处理；模型的来源和授权说明见上游 README 的 NNUE 章节，正式提交前需核对适用的模型授权材料。

用户已同意开源。仓库 https://github.com/zzxap/chinesechess ，应用标识 `com.zzxap.chinesechess`。
tag 工作流与签名 Secrets 见 `docs/RELEASING.md`；商店元数据与实际提交尚未配置。
GPL 的禁止附加限制要求与 App Store 分发条款仍需核对；开源授权本身不代表已解决分发兼容性。
若无法确认，应让 iOS 使用自有服务端引擎，或取得适用的额外授权；Google Play 本地引擎发行也须履行 GPL 源码义务。

资料：
- https://www.gnu.org/licenses/gpl-3.0.html
- https://www.gnu.org/licenses/gpl-faq.html
- https://developer.apple.com/support/terms/apple-developer-program-license-agreement/
- https://developer.android.com/guide/practices/page-sizes

仅做编译和静态检查；未执行引擎搜索、运行测试或提交商店审核。
