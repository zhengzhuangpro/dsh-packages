# Slot 目录（快照）

> 来源：运行中的 DSH Web 界面（`cordis_inspect` → Slots.listSubTree），版本
> `0.1.1-rc.2`。Shell 升级后可能变化——需要精确信息时，直接在界面中查询实时目录。
>
> 风险标记：`none` = 加性扩展（推荐）；`shadows-shipped-ui` = 单座位，注册即覆盖官方 UI（慎用）。

## 总览

```
root（single）
├── sidebar（single，shadows）
│   ├── sidebar.brand.mark（single）
│   ├── sidebar.brand.name（single）
│   ├── sidebar.workspaces（single）
│   │   └── sidebar.workspaces.directoryFlow（single）
│   ├── sidebar.settings（single）
│   │   ├── settings.trigger（single）
│   │   ├── settings.header（single）
│   │   ├── settings.action（list，none）
│   │   ├── settings.close（single）
│   │   ├── settings.section（list，none）
│   │   │   ├── settings.general.item（list，none）
│   │   │   └── settings.plugins.tab（list，none）
│   │   │       └── settings.plugin.item（keyed）
│   │   └── settings.onboarding（list，none）
│   └── sidebar.footer.action（list，none）
├── conversation（single，shadows）
│   ├── conversation.hero.brand.mark（single）
│   ├── conversation.session（single，shadows）
│   │   └── conversation.view（list，none）
│   │       └── conversation.chat.node（keyed，shadows）
│   │           ├── conversation.chat.commandview（keyed，none）
│   │           ├── conversation.chat.turnTail（chain，none）
│   │           ├── conversation.chat.assistant-actions（list，none）
│   │           └── tool.call.toolview（keyed，shadows）
│   │               └── tool.view.cordis（keyed，none）
│   ├── conversation.session.header（single，shadows）
│   │   ├── conversation.session.header.utilities（list，none）
│   │   ├── conversation.session.header.lineage（single）
│   │   └── conversation.session.header.actions（list，none）
│   ├── conversation.composer（chain，none）
│   │   └── conversation.composer.bar（single，shadows）
│   │       ├── conversation.input.attachments（single）
│   │       ├── conversation.input.plan（single）
│   │       └── conversation.input.model（single）
│   ├── conversation.input.overlay（list，none）
│   ├── conversation.input.dock（list，none）
│   ├── conversation.composer.dock（list，none）
│   ├── conversation.input.left（list，none）
│   ├── conversation.input.right（list，none）
│   ├── conversation.hero.workspace（single）
│   │   └── conversation.hero.workspace.directoryFlow（single）
│   └── conversation.hero.agentPreset（single）
├── details（single，session 作用域）
│   └── conversation.details.tool（single）
└── shell.overlay（list，none）
```

## 推荐扩展点（list / keyed / chain，`replaceRisk: none`）

所有 list 座位注册参数一致：

```ts
{ id: string; order?: number; label?: string | (() => string) }
```

| 座位 | 作用域 | owner props | 用途 |
| --- | --- | --- | --- |
| `sidebar.footer.action` | root | `{ wide: boolean }` | 侧边栏底部操作项（设置入口旁） |
| `settings.action` | root | — | 设置内容列头部操作（Close 之前） |
| `settings.section` | root | — | 一个设置页 |
| `settings.general.item` | root | — | 无需独立页面的单个设置行 |
| `settings.plugins.tab` | root | — | 插件设置区内的一个页签 |
| `settings.onboarding` | root | — | 设置功能贡献的开屏步骤 |
| `conversation.session.header.actions` | session | — | 会话头部按钮（标题旁） |
| `conversation.session.header.utilities` | session | — | 会话头部右侧工具（不参与排序） |
| `conversation.input.left` / `.right` | session | `{ session, input }` | 输入框工具行内控件 |
| `conversation.input.dock` | session | `{ session, input }` | 输入区上方整行（队列、待办条） |
| `conversation.composer.dock` | session | `{ session, input }` | 输入区下方信息条（会话统计等） |
| `conversation.input.overlay` | session | — | InputBar 浮层锚点 |
| `conversation.chat.assistant-actions` | session | — | 助手消息 IconActions 操作条 |
| `conversation.chat.turnTail` | chain | — | 完成的 Turn Node 扩展链（`select(owner)`） |
| `conversation.chat.commandview` | keyed | — | 命令行视图（键 = 命令名，开放域） |
| `tool.call.toolview` | keyed | — | 工具调用卡片（键 = 工具名；已占用：ask_user_question, bash, cordis_*, edit, glob, grep, read, skill, todo_write, web_fetch, web_search, write） |
| `tool.view.cordis` | keyed | — | 动态插件 Run 卡片内区域（键固定为 `self`） |
| `shell.overlay` | root | — | 全局浮层（默认 click-through） |

## 标准 props（list 座位组件可获得）

- `t`：注册 spec 声明 `locale` 时注入的翻译函数（`TranslateNS<'你的命名空间'>`）
- `useSessions` / `useWorkspaces`：会话/工作区快照 hooks
- `sessionId` / `useSession` / `useProjection` / `useInput` / `inputActions`：
  session 作用域座位可用

## 主题 token（`--dsw-*`）

| token | 说明 |
| --- | --- |
| `--dsw-alias-bg-base` / `-layer-1` / `-layer-2` / `-overlay` | 背景层级 |
| `--dsw-alias-border-l1` / `-l2` | 边框层级 |
| `--dsw-alias-brand-primary` | 品牌色 |
| `--dsw-alias-label-primary` / `-secondary` | 文本层级 |
| `--dsw-alias-state-error-primary` / `-success-primary` / `-warn-primary` | 状态色 |
| `--dsw-specific-sidebar-fill` | 侧边栏背景 |

（完整列表可在界面中通过主题检查器查询；以上均为亮/暗双值 token。）

## 客户端服务（`ctx.*`，需在入口 `inject` 中声明）

| 服务 | 关键方法 |
| --- | --- |
| `slots` | `inject(key, cb)` / `register(spec, Component)` / `entries(key)` / `spec(key)` |
| `locale` | `register(ns, dicts)` / `bind(ns)` / `setLocale(id)` / `getLocale()` |
| `theme` | `register(def)` / `overrideTokens(source, tokens)` / `setTheme(id)` |
| `sessions` | `open(id)` / `fork(opts)` / `search(query, signal)` / `scope(id)` / `binding(id)` |
| `workspaces` | `create({path})` / `connectWorkspace(id)` / `startSession(id?)` / `rename` / `delete` |
| `layout` | `toggleSidebar()` / `openDetails()` / `closeDetails()` |
| `timer` | `timeout(fn, ms)` / `interval(fn, ms)` / `throttle(fn, ms)` / `debounce(fn, ms)` |

## 客户端事件

| 事件 | 说明 |
| --- | --- |
| `slots/changed(key)` | 某 Slot 的定义或注册集变化 |
| `connection/reset` | 连接代际重建（wire 缓存需重拉） |
| `agent-preset/selected`（`ctx.remote.$on`） | 代理预设被选中 |
