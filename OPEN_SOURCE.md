# 开源发行说明

本项目自行编写的代码以 GPL-3.0-or-later 发行，正文见 `LICENSE`。第三方代码和资源保留原有授权。
用户已同意开源。公开仓库：https://github.com/zzxap/chinesechess 。发行源码以对应 tag 为准。

Pikafish 固定版本 `Pikafish-2026-09-06`（GPLv3），上游 https://github.com/official-pikafish/Pikafish 。
其作者、许可、模型训练数据来源声明保存在原始源码的 AUTHORS、Copying.txt、README.md 中。
其中模型使用来自 Pika Xiangqi Zero 项目的数据训练，上游标注数据按 ODbL 提供；请保留此归属说明与链接。
原生库封装、修改列表与构建方法见 `native/pikafish/README.md`。
Fairy-Stockfish 的许可与源码信息见 `public/engines/fairy-stockfish`；React Native 等依赖保留其软件包内许可证。

公开发布前应：

- 将完整应用源码、锁文件、原生桥接与构建配置放入公开仓库，记录与发行版本对应的标签。
- 随安装包提供开源声明和对应源码入口，保留 GPL 与第三方声明。
- 排除签名证书、密钥、私有配置、node_modules、构建中间文件与损坏模型备份。
- 核对图片、字体和其他素材的发行权；不能只给 Pikafish 源码代替整个应用的对应源码。
- 单独核对 App Store 条款与 GPL 的兼容性，不能以“已经开源”作为可上架的结论。

本文件不代表已完成原生桥接、签名、商店提交或审核。
