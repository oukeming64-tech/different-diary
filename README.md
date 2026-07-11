# 不一样的日记

一个不催促、不打分，也不拿连续记录绑住你的本地优先生活日记。

还在为每天记录运动发愁？还在为了减肥、排名，把自己卷得够呛？担心吃多了会收到警告，运动不达标会被提醒，漏记一天又被催？来试试《不一样的日记》。

不想运动？没关系。只想坐着打游戏？也没关系。上班已经够消耗人了，就让健身达人们自己去卷吧。想吃一顿大餐，又想留下当时的状态？放心拍下来，先放在自己的设备里。图片问大模型和宽松热量估算会在后续版本加入；当前版本已经支持可选的文字 AI，而且只有你主动发送时才会请求 OpenRouter。

这个产品不会因为你吃了、歇了、漏记了，就跳出来警告你。作者是一边喝着全糖可乐，一边吃着汉堡王三层皇堡，一边把它搓出来的。

**反内卷。**

[直接在线体验](https://oukeming64-tech.github.io/different-diary/) · [下载单文件版](https://oukeming64-tech.github.io/different-diary/download.html) · [查看贡献说明](CONTRIBUTING.md) · [报告安全问题](SECURITY.md)

![不一样的日记：你这会儿，想从哪儿说起？](public/og.png)

## 它现在能做什么

- 从“想吃”“不想练”“刚练完很累”或“只是来坐坐”开始，先得到一句人工写好的本机回应。
- 记录文字、照片和运动；运动类型、时长、步数、距离与备注全部可以跳过。
- 按时间回看记录，单条删除、彻底清空，或导出 JSON 副本。
- 把今天保存过的状态与选择排成一张 3:4 PNG 海报。
- 自愿连接 OpenRouter Key，在明确确认后让 AI 回应当前文字；模型不可用或越过非审判规则时自动回到本机回应。
- 安装为 PWA；不登录、不连接 Key 时，基础体验依然完整可用。

## 隐私边界

身份、日记、照片与运动记录默认保存在当前浏览器的 IndexedDB 中。照片“只记录”时不识别、不上传；今日海报在浏览器里生成。OpenRouter Key 只留在当前页面内存中，只有用户点击发送后，当前状态、选择、本机回应和刚写的文字才会交给 OpenRouter。照片、历史记录、运动详情和身体资料不会随当前文字请求发送。

没有账户，没有云端副本，也没有遥测。清理浏览器数据、卸载应用或更换设备前，请先导出需要保留的记录。

## 使用

1. 打开[在线体验页](https://oukeming64-tech.github.io/different-diary/)，从首页挑一句最接近当前状态的话。
2. 选择这会儿希望怎样被陪伴，读完回应后可以直接离开，也可以留下文字、照片或运动记录。
3. 从首页“翻翻最近”回看和管理本机数据；有了当天记录后，也可以生成今日海报。
4. 想让 AI 再听听时，从回应页进入可选 AI，自行连接 OpenRouter Key，并在发送前再次确认。

手机浏览器可以把页面添加到主屏幕，之后像普通 App 一样打开。

## 如何把它装成 PWA

PWA 可以理解成“能装到桌面的网页”：不用经过应用商店，也不用下载安装包。先用浏览器打开网址，再把它添加到主屏幕，以后就能像普通 App 一样从桌面图标进入。

### iPhone / iPad

1. 一定要用 **Safari** 打开网址。
2. 点底部工具栏的“分享”按钮；如果没看到，先点“更多”，再点“分享”。
3. 在菜单里找到“添加到主屏幕”。
4. 打开“作为网页 App 打开”，然后点“添加”。

### Android 手机

1. 用 **Chrome** 打开网址。
2. 点右上角的三个点。
3. 选择“添加到主屏幕”，再点“安装”。有些手机会直接显示“安装应用”。

### 电脑

用 Chrome 打开网址，点右上角三个点，进入“投放、保存和分享”，选择“将网页安装为应用”。部分版本也会直接在地址栏右侧显示安装图标。

第一次打开仍需要网络。页面成功加载后，应用外壳可以离线打开；记录保存在安装时所用的浏览器和设备里，清理浏览器数据或卸载前请先导出需要保留的内容。

系统更新后，菜单名称可能略有变化。可以对照 [Apple 的官方说明](https://support.apple.com/guide/iphone/iphea86e5236/ios) 和 [Chrome 的官方说明](https://support.google.com/chrome/answer/9658361/use-progressive-web-apps-android)。

## 下载一个 HTML 文件离线打开

如果不想安装 PWA，也可以下载一个完整的 HTML 文件。它不需要解压，放在电脑里，双击就能打开：

- [打开下载与说明页面](https://oukeming64-tech.github.io/different-diary/download.html)
- [直接下载 `different-diary.html`](https://oukeming64-tech.github.io/different-diary/downloads/different-diary.html)

Windows 下载后，在“下载”文件夹双击它；如果系统询问用什么打开，选择 Chrome 或 Edge。Mac 下载后，在 Finder 的“下载”里双击；如果被文本编辑器打开，右键文件，选择“打开方式”，再选 Safari 或 Chrome。

下载版适合电脑离线使用。请把文件固定放在一个文件夹里，不要频繁改名或移动；浏览器可能会把不同文件路径当成不同的本机空间。下载版不能安装成 PWA，AI 联网也可能被浏览器限制；手机使用和 AI 功能优先选择上面的在线体验页。

## 本地开发

需要 Node.js 22.15 或更高版本。

```bash
npm install
npm run dev
```

完整验证：

```bash
npm run lint
npm test
```

## 想接手继续开发

想把项目拿走继续做，可以先在 GitHub 右上角点 **Fork**，把仓库复制到自己的账号，再把自己的副本下载到电脑：

```bash
git clone https://github.com/你的用户名/different-diary.git
cd different-diary
npm ci
npm run dev
```

主要界面和交互在 [`app/`](app/)；本机文字与数据库在 [`lib/stage1/`](lib/stage1/)，照片、运动、可选 AI 和今日海报依次在 [`lib/stage2/`](lib/stage2/)、[`lib/stage3/`](lib/stage3/)、[`lib/stage4/`](lib/stage4/) 和 [`lib/poster/`](lib/poster/)；回归测试在 [`tests/`](tests/)，产品、技术和架构说明在 [`docs/`](docs/)。GitHub Pages 使用 [`github-pages/`](github-pages/) 作为静态入口，并由 [`vite.pages.config.ts`](vite.pages.config.ts) 完成构建。

每次修改后，至少运行：

```bash
npm run lint
npm test
npm run build:pages
```

在自己的 GitHub 仓库中启用 Actions，并在 **Settings → Pages** 里选择 **GitHub Actions**，之后把通过检查的代码合并到 `main`，现有工作流就会自动发布网页和单文件下载版。如果更改了仓库名，需要同时修改 [`vite.pages.config.ts`](vite.pages.config.ts) 中的 `base`、[`scripts/build-standalone-html.mjs`](scripts/build-standalone-html.mjs) 中的 `basePath`，以及 README、下载页和分享图里的公开链接。

接手开发时请继续守住三个边界：无登录、无 Key 的基础路径必须可用；照片“只记录”不能调用模型或上传；数据库结构或导出格式发生变化时，要为已有本机记录提供迁移和回归测试。准备贡献回原项目时，再阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md) 和 [`docs/05-开放扩展接口规范.md`](docs/05-开放扩展接口规范.md)。

## 项目原则

- 诚实记录不会受到惩罚。
- 不用红色警告、失败评分、连续天数或补偿性运动制造压力。
- 登录、身体资料与模型 Key 都是可选项；无登录、无 Key 路径必须完整。
- AI 和云同步是可选适配器，不成为应用启动或核心体验的依赖。
- 照片是否交给模型，由用户在具体动作发生前决定。

## 当前状态

截至 2026-07-11，手机端核心陪伴、本机文字与照片记录、本机运动记录、时间线与数据管理、PWA、可选文字 AI、新手引导和今日海报均已通过用户体验验收。图片理解、运动消耗估算、Key 的本机加密长期保存、照片 ZIP 导出与本机图表仍是后续计划，不属于当前版本。

产品与技术边界见 [`docs/`](docs/)；开放扩展原则见 [`docs/05-开放扩展接口规范.md`](docs/05-开放扩展接口规范.md)。为避免已有用户的本机记录在品牌改名后看起来消失，数据库与部分内部存储标识暂时保留早期名称。

## 参与贡献

欢迎修复问题、补测试、改善无障碍体验，或提出符合非审判原则的新功能。提交前请阅读 [`CONTRIBUTING.md`](CONTRIBUTING.md)。安全问题请不要公开披露，处理方式见 [`SECURITY.md`](SECURITY.md)。

## License

Copyright (c) 2026 Keming Ou. 本项目基于 [MIT License](LICENSE) 开源。
