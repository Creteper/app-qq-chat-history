# QQ Chat History

基于 Tauri 2、React、Tailwind CSS v4 与 shadcn/ui 的 QQ 风格自定义聊天记录桌面应用。

## 功能

- Tauri 2 自定义标题栏、窗口拖拽与最小化/最大化/关闭控制
- QQ 风格一级导航、会话列表、聊天头部与静态输入区
- 官方 shadcn/ui `Message`、`Bubble`、`MessageScroller`、`Marker` 与
  `Attachment` 组合
- 文字、图片、日期和撤回/提示类系统消息
- 设置页可修改联系人的 QQ 号、头像来源、名称、最近消息、时间、免打扰和未读数
- 联系人资料使用 `localStorage` 自动持久化，可一键恢复默认数据
- QQ 头像由 Tauri Rust 后端受控抓取并转换为 Base64，规避 qlogo2
  反盗链；不存在的 QQ 会回退为 shadcn `AvatarFallback`

## 开发

```bash
pnpm install
pnpm tauri dev
```

仅启动 Web 预览：

```bash
pnpm dev
```

## 验证与构建

```bash
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
pnpm tauri build
```
