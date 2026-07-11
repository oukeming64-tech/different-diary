# Changelog

本项目的重要变化记录在这里，版本号遵循语义化版本。

## [0.1.0] - 2026-07-11

### Added

- 四个非审判状态入口与本机回应。
- 本机文字、照片和可选运动记录，包含时间线、单条删除、清空与 JSON 导出。
- PWA 安装与离线应用壳。
- 会话级 OpenRouter 文字回应、发送确认、规则检查和本机降级。
- 三步新手引导与本机今日海报。
- GitHub Pages 在线体验和可下载的单文件 HTML。

### Architecture

- 页面入口、状态控制、产品文案、首页、对话页和本机记录页按职责拆分。
- 开发、测试与公开发布统一为 React + TypeScript + Vite 静态应用链路。
- 自动化覆盖本机数据迁移、零网络照片记录、运动记录、AI 降级、PWA、海报和界面结构边界。

### Known limitations

- 图片理解、运动消耗估算和 Key 的本机加密长期保存尚未实现。
- 单文件下载版不能安装为 PWA，浏览器也可能限制其中的 AI 联网。
- 照片文件尚不能随 JSON 一起导出为 ZIP。

[0.1.0]: https://github.com/oukeming64-tech/different-diary/releases/tag/v0.1.0
