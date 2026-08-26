# dsh-packages — DSH Web 插件聚合生态包

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 浏览器界面
（`web` profile）的**客户端插件聚合 monorepo**。每个插件包以 npm 包的形式发布，
用户通过 `dsh plugin --profile web add <pkg>` 一行安装即可增强 DSH Web 界面：
侧边栏、设置页、会话头部、输入区、消息操作、主题等都可以扩展。

> 当前为**基础框架**（scaffold）：工程结构、构建管线、插件契约、一键脚手架与
> 完整示例插件均已就绪并通过验证。

---

## 📖 文档索引

| 文档 | 读者 | 内容 |
| --- | --- | --- |
| **本文 README** | 所有人 | 使用流程 / 开发流程 / FAQ |
| [docs/adding-a-plugin.md](docs/adding-a-plugin.md) | 插件作者 | 从零新增插件的**分步教程**（5 分钟走完） |
| [docs/plugin-authoring.md](docs/plugin-authoring.md) | 插件作者 | 插件契约 / Slot API / 服务 / 主题 / 本地化 / 发布 |
| [docs/slot-catalog.md](docs/slot-catalog.md) | 插件作者 | 全部 Slot 座位目录（含注册参数与 owner props） |

---

## 一、作为使用者（安装生态插件）

### 1. 安装插件（推荐用本仓库脚本，自动处理两个坑）

```bash
# 本仓库本地开发版（file: 协议，无需发布；自动追加 roster 条目）
pnpm install:profile sample-greeter                    # profile 省略时默认 web
# 等价于：node scripts/install-to-profile.mjs web sample-greeter

# 如果 profile 里有无法解析的 workspace: 残留依赖（如 snake 示例），加上：
pnpm install:profile web sample-greeter --fix-workspace

# 发布到 npm 后，标准安装方式：
dsh plugin --profile web add @dsh-ecosystem/sample-greeter
# （npx 启动也一样，dsh 来自 @deepseek-ai/dsh@latest 即可）
npx @deepseek-ai/dsh@latest plugin --profile web add @dsh-ecosystem/sample-greeter
```

### 2. 重启生效

```bash
npx @deepseek-ai/dsh@latest web        # 或：dsh --profile web
```

### 3. 加载机制（为什么这样能生效）

客户端插件要进浏览器，需要满足**两条**（缺一不可）：

1. **包被装进 profile**：`dsh plugin` 把包装到 `~/.dsh/profiles/web/node_modules`
   （loader 的 baseUrl 是 profile 目录，父级回溯可解析到）
2. **一条 browser-roster loader 条目**：`dsh-client-modules` 只扫描 loader 条目，
   需要在 profile 的 `cordis.patch.yml` 里加一条 **`insert:` 块**（与官方 bundle
   里每个 `dsh.client` 插件一行的做法一致）。注意：必须用 `insert:` 块——
   裸行 `- id: … / name: …` 会被引导代码当作"覆盖已有条目"而**静默跳过**：

   ```yaml
   - insert:
       - id: sample-greeter
         name: "@dsh-ecosystem/sample-greeter"
   ```

   `scripts/install-to-profile.mjs` 会在安装成功后**自动追加**（幂等，且会清理旧格式行）。

> ⚠ 两个常见坑（脚本已自动处理，手动操作时注意）：
> - 本机 web profile 的 `package.json` 里有一个 `@deepseek-ai/dsh-client-ui-snake:
>   "workspace:^"` 残留依赖，会导致任何 `pnpm add` 报
>   `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`。`--fix-workspace` 会备份后自动清理
>   （生成 `package.json.bak` / `cordis.patch.yml.bak`）。
> - 只装包不追加 roster 行，插件不会加载。

### 4. 验证 / 卸载

- 侧边栏底部（设置入口旁）出现插件的操作项；DevTools Console 无报错
- 卸载：`npx @deepseek-ai/dsh@latest plugin --profile web remove @dsh-ecosystem/sample-greeter`
  （同时手动删除 cordis.patch.yml 里对应的 roster 行）

---

## 二、作为开发者（新增/维护插件）

### 1. 环境准备

```bash
pnpm install        # 安装依赖
pnpm build          # 冒烟：构建所有插件（产物为各包 lib/client.js）
pnpm typecheck      # 全仓类型检查
```

### 2. 一键生成新插件骨架

```bash
pnpm create:plugin <plugin-name>   # 如：pnpm create:plugin session-stats
pnpm install                       # 让 pnpm 识别新工作区包
```

生成 `packages/<plugin-name>/`（契约齐全、可直接构建安装的骨架），详见
[教程](docs/adding-a-plugin.md) 第 1 步。

### 3. 日常开发循环

```bash
pnpm --filter <pkg> typecheck    # 类型检查（改代码后必跑）
pnpm build:watch                 # 常驻监听 src/ 自动重建（可选）
pnpm install:profile <plugin-name>                # 安装到本地 DSH（自动追加 roster 行）
npx @deepseek-ai/dsh@latest web  # 重启验证
```

### 4. 提交前检查清单

- [ ] `pnpm typecheck` 全绿
- [ ] `pnpm build` 产物正常（`lib/client.js` 为 `__ModuleLoader__` 格式）
- [ ] 插件 README 已写（功能 / 开发命令 / 安装命令）
- [ ] 契约自检通过（见 [plugin-authoring.md](docs/plugin-authoring.md#8-构建与产物验证)）

### 5. 发布

```bash
cd packages/<plugin-name>
pnpm publish --access public
```

---

## 生态包能做什么

DSH Web 界面由 Cordis 插件组合而成，客户端（浏览器）侧通过 **Slot** 系统向外开放
扩展点。生态包里的每个插件都可以：

| 扩展点（Slot） | 用途 |
| --- | --- |
| `sidebar.footer.action` | 侧边栏底部操作项（在设置入口旁边） |
| `settings.section` / `settings.general.item` | 新增设置页 / 通用设置行 |
| `conversation.session.header.actions` / `.utilities` | 会话头部按钮 / 右侧工具 |
| `conversation.input.left` / `.right` | 输入框工具行内的控件 |
| `conversation.input.dock` / `conversation.composer.dock` | 输入区上方/下方信息条 |
| `conversation.chat.assistant-actions` | 助手消息的操作条 |
| `tool.call.toolview` | 自定义工具调用的消息卡片视图 |
| `shell.overlay` | 全局浮层 |
| 主题 token 覆盖 | 通过 `theme` 服务定制外观 |

完整目录见 [docs/slot-catalog.md](docs/slot-catalog.md)。

## 仓库结构

```
dsh-packages/
├── package.json              # 根工程（pnpm workspaces）
├── pnpm-workspace.yaml
├── tsconfig.base.json        # 共享 TS 配置
├── scripts/
│   ├── create-plugin.mjs     # 一键生成新插件骨架 ← 新插件从这里开始
│   ├── build-client.mjs      # 构建管线：src/client/ + index.ts + invariant.ts → lib/ 三产物
│   └── install-to-profile.mjs# 一键安装插件到本地 DSH profile
├── docs/
│   ├── adding-a-plugin.md    # 从零分步教程
│   ├── plugin-authoring.md   # 开发指南（契约 / Slot / 服务 / 主题 / 发布）
│   └── slot-catalog.md       # Slot 目录快照
└── packages/
    └── sample-greeter/       # 示例插件（i18n + 双 Slot + CSS 注入 + 实时时钟）
```

## FAQ

**装完没生效？**
① 确认 `npx @deepseek-ai/dsh@latest plugin --profile web list` 里能看到该包；
② 确认 `cordis.patch.yml` 里有对应的 roster 条目（`- insert:` 块，含 `name: "<包名>"`）；
③ 确认重启的是同一个 profile；④ 打开 DevTools Console 看有没有 fiber 报错。

**改了源码怎么生效？**
`file:` 安装是**拷贝**而非链接：重新 `pnpm build` 后要**重跑
`pnpm install:profile <pkg>`**，再刷新页面（HMR 按产物
rev 重新拉取）。

**插件包名空间是什么？**
本仓库约定 `@dsh-ecosystem/*`；想换 scope 时，改根目录各包 `package.json` 的
`name` 与 `scripts/create-plugin.mjs` 里的 `pkgName` 即可。

**只想用某个插件，不想克隆整个仓库？**
该插件发布到 npm 后直接 `dsh plugin --profile web add <pkg>`。

## 插件清单

| 包 | 状态 | 说明 |
| --- | --- | --- |
| `@zhengzhuangpro/dsh-hotnews` | ✅ 可用 | **真实生态插件**：DSH Web 内查看 hotnews 热门新闻（百度/微博/抖音/虎扑/知乎/掘金/36氪/GitHub），Host 端打包 hotnews v0.1.6 抓取逻辑 |
| `@dsh-ecosystem/sample-greeter` | ✅ 可用 | 示例：侧边栏问候开关 + 输入区问候条（i18n / 时钟 / 主题） |

## 路线图（建议）

- [x] 首个真实生态插件（@zhengzhuangpro/dsh-hotnews：热门新闻页签）
- [ ] 插件清单自动生成（扫描 packages/ 生成 catalog）
- [ ] CI：构建 + 类型检查 + 契约校验
- [ ] 发布脚本（changesets / pnpm publish 多包发布）

## 许可

[MIT](LICENSE)
