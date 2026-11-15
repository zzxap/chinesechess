# GitHub tag 自动打包

应用 ID：`com.zzxap.chinesechess`。工作流：`.github/workflows/release.yml`。

推送 `v主版本.次版本.修订版本` tag 后，Actions 在各平台原生 runner 编译，成功后自动创建 GitHub Release 并上传产物与 SHA256 清单：

```sh
git tag -a v0.0.2 -m "Release 0.0.2"
git push origin v0.0.2
```

也可在 Actions → Tag release → Run workflow 输入版本，只构建并保存 Actions artifacts，不发布 Release。
不要覆盖已经发行的 tag；修改后使用新版本。当前配置只打包，不自动提交 App Store / Google Play。

## 签名文件与 Secrets

在仓库 **Settings → Secrets and variables → Actions → New repository secret** 中添加下列值。
证书、keystore、密码不要写进 YAML、仓库、Issue 或聊天。
Base64 仅用于把二进制文件保存成文本，不是加密；GitHub Secrets 负责保存。
macOS 可用以下命令直接复制文件的 Base64，不输出到终端：

```sh
base64 < /path/to/distribution.p12 | tr -d '\n' | pbcopy
```

更换输入路径即可处理 keystore 和 mobileprovision。将剪贴板内容粘贴到对应 Secret，之后清空剪贴板。
密码填写原始文本，不转 Base64。密钥原件应另行安全备份，尤其 Android 上传密钥。

### Android

| Secret | 内容 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | 正式上传 keystore 的 Base64 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore 密码 |
| `ANDROID_KEY_ALIAS` | 上传密钥别名 |
| `ANDROID_KEY_PASSWORD` | 该密钥密码 |

四项全部配置后生成正式签名的 APK、AAB。使用 Google Play App Signing 时，这里放上传密钥，不需要下载商店保管的应用签名密钥。
全部缺省时生成 `unsigned` APK/AAB；配置不完整会明确失败，不回退到调试签名。

### iOS

| Secret | 内容 |
| --- | --- |
| `APPLE_TEAM_ID` | Apple Developer Team ID |
| `IOS_CERTIFICATE_BASE64` | 含私钥的 Apple Distribution `.p12` Base64 |
| `IOS_CERTIFICATE_PASSWORD` | 导出 `.p12` 时设置的密码 |
| `IOS_PROVISION_PROFILE_BASE64_chanesechess` | App Store Connect 分发描述文件 Base64 |

描述文件必须属于该 Team，且 application-identifier 为 `TEAMID.com.zzxap.chinesechess`，并包含与证书匹配的分发授权。
只提供 `.cer` 不够，需要包含私钥的 `.p12`。
配置齐全后导出 App Store IPA；未配置时生成 `ios-unsigned.ipa` 和 `.xcarchive.zip`，未签名 IPA 不能直接安装。
这里不需要 Apple ID 密码，也没有设置自动上传 App Store Connect。

### macOS

| Secret | 内容 |
| --- | --- |
| `MACOS_CERTIFICATE_BASE64` | 含私钥的 Developer ID Application `.p12` Base64 |
| `MACOS_CERTIFICATE_PASSWORD` | `.p12` 密码 |
| `MACOS_SIGN_IDENTITY` | 完整签名身份，如 `Developer ID Application: Your Name (TEAMID)` |

缺省使用 ad-hoc 签名，生成 universal ZIP、DMG。正式证书配置后进行 Developer ID 签名。
当前未配置 notarization，正式签名也不代表已完成公证；该 DMG 路径用于独立分发，不是 Mac App Store 上传包。

Windows 当前生成未签名 x64 portable ZIP。Windows 商店身份、代码签名与 MSIX 发布尚未配置。

## 临时文件与上传范围

- 签名文件只在 runner 临时目录中解码；Apple 使用一次性钥匙串。
- 工作流在 `always()` 清理步骤中删除证书、profile 临时文件和钥匙串，Android 也有退出清理与兜底清理。
- 上传仅限 `release-artifacts` 下明确生成的安装包、应用归档和库压缩包。不会上传整个工作目录、临时目录、证书或 keystore。
- IPA / app 内部的正常签名和 embedded provisioning profile 属于安装包签名的一部分，不包含分发私钥。
- 工作流不在 PR 或 fork 事件执行，默认只有只读仓库权限；最终 Release job 单独获得 contents 写权限。

## 产物

| 平台 | 应用 | AI库 |
| --- | --- | --- |
| Android | APK + AAB，arm64 / x86_64 | 两个架构 `.so`，附 C++ runtime、模型及对应源码 |
| iOS | IPA + xcarchive ZIP | XCFramework 中的 iOS arm64 与模拟器库 |
| macOS | universal app ZIP + DMG | XCFramework 中的 macOS arm64 / x86_64 库 |
| Windows | x64 portable ZIP | `ai_engine.dll`、`ai_engine.lib`（DLL 导入库）、`ai_engine-static.lib`（静态库） |

AI库的 C ABI 封装与库包已准备；RN 原生桥接尚未接入，当前原生 App 仍访问配置的本机后端。
因此打包成功不代表本地引擎在手机里已可用。
库包附许可证与对应引擎源码；整个应用源码由发行 tag 提供。
App Store 分发与 GPL 兼容性仍需确认，不能把“已经开源/签名成功”视为已具备上架条件。

参考：
- https://docs.github.com/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions
- https://docs.github.com/actions/use-cases-and-examples/deploying/installing-an-apple-certificate-on-macos-runners-for-xcode-development
- https://developer.android.com/studio/publish/app-signing
