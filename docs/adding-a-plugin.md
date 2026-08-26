# 从零新增一个插件（分步教程）

本文用一个具体例子（`session-stats`）走完"生成骨架 → 编写 → 构建 → 验证 →
安装 → 调试"的完整流程。全程约 5 分钟。

## 第 0 步：准备

```bash
# 确保依赖已安装、示例插件可构建（冒烟测试）
pnpm install
pnpm build
```

## 第 1 步：生成骨架

```bash
pnpm create:plugin session-stats
```

脚本会创建 `packages/session-stats/`，包含：

| 文件 | 说明 |
| --- | --- |
| `package.json` | 插件契约：`dsh.client` 声明、`exports`（`.` / `./invariant` / `./client`）、构建/类型检查脚本 |
| `tsconfig.json` | 继承根配置 |
| `src/index.ts` | Host 侧空入口（Loader 挂载条目必需，构建为 `lib/index.js`） |
| `src/invariant.ts` | invariant 伴生模块（官方约定，构建为 `lib/invariant.js`） |
| `src/client/index.ts` | 浏览器侧入口：`inject` + `apply`，已注册两个示例 Slot |
| `src/client/i18n.ts` | 中英文字典 + `LocaleNamespaceMap` 类型增强 |
| `src/client/components.tsx` | 两个示例组件（footer action / composer dock） |
| `src/client/style.ts` | CSS 注入辅助（`data-plugin-css` 去重） |
| `src/client/session-stats.css` | 样式（主题 token） |
| `src/client/css.d.ts` | `*.css` 模块声明 |
| `README.md` | 插件自述（含开发/安装命令） |

```bash
# 让 pnpm 识别新工作区包
pnpm install
```

## 第 2 步：确认骨架可构建

```bash
pnpm --filter @dsh-ecosystem/session-stats typecheck
pnpm --filter @dsh-ecosystem/session-stats bundle
```

期望输出三个产物：`lib/client.js`（浏览器侧）、`lib/index.js`（Host 空入口）、
`lib/invariant.js`（invariant 伴生）。

## 第 3 步：改成你的插件

打开 `src/client/index.ts`，按需修改：

- **换 Slot**：把 `ctx.slots.inject(...)` 的 `name` / `id` 换成
  [docs/slot-catalog.md](slot-catalog.md) 里你想要的座位；
  换座位后记得同步 `package.json` 的 devDependencies 与 client 入口顶部的
  空类型导入（座位声明方包）——例如想用 `settings.section` 就引入
  `@deepseek-ai/dsh-client-ui-settings/client`
- **加字典键**：在 `src/client/i18n.ts` 的 `Dict` 接口里加键（zh/en 都要补）
- **加服务**：要用 `theme` / `sessions` / `workspaces` 等服务时，
  入口 `inject` 数组加上服务名，并确认对应 DSH 包已列入
  `package.json` 的 `dsh.client.inject`
- **加交互**：仿照 `packages/sample-greeter/src/client/store.ts` 的模块级 store
  模式（记得用 `ctx.effect` 在卸载时复位）

改完跑一遍 `typecheck && bundle`。

## 第 4 步：本地安装到 DSH（无需发布）

```bash
# 本机 profile 有 snake 的 workspace: 残留依赖时需加 --fix-workspace（自动备份清理）
pnpm install:profile session-stats --fix-workspace
```

脚本会做三件事：以 `file:` 协议把包装进 `~/.dsh/profiles/web/node_modules`
（本地包会先 remove 再 add，强制刷新为新构建）；清理阻塞安装的 workspace 残留
依赖（如有）；**自动向 `cordis.patch.yml` 追加 browser-roster 条目（`insert:` 块）**
（`dsh-client-modules` 只扫描 loader 条目，这步不能省；裸行格式会被静默跳过）。

## 第 5 步：重启并验证

```bash
npx @deepseek-ai/dsh@latest web        # 或 dsh --profile web
```

- 侧边栏底部（设置图标旁边）应出现 ✨ 操作项
- 输入区下方应出现信息条
- 浏览器 DevTools → Console：无报错即成功

## 常见调试

| 现象 | 排查 |
| --- | --- |
| 界面上没出现 | ① 确认 `cordis.patch.yml` 里有 roster 条目（`- insert:` 块，`name: "..."` 指向你的包）② 确认 `package.json` 的 `dsh.client.platform === "web"` 与 `exports["./client"]` ③ 确认装的是最新构建（`lib/client.js` **和 `lib/index.js`**——后者是 Loader 挂载条目的 Host 空入口，缺失则插件不会加载）④ Console 看 fiber 报错 |
| 改了代码不生效 | `file:` 安装是**拷贝**不是链接：重新 `pnpm build` 后**必须重跑 install 脚本**，再刷新页面（HMR 按 rev 重新拉取） |
| 类型报错（SlotMap 键不认识） | 缺座位声明方包的类型导入/依赖，见第 3 步第一条 |
| 想卸载 | `npx @deepseek-ai/dsh@latest plugin --profile web remove @dsh-ecosystem/session-stats`，并手动删除 cordis.patch.yml 里对应的 roster 条目（`- insert:` 块） |

## 第 6 步：发布（可选）

```bash
# 包目录内
cd packages/session-stats
pnpm publish --access public
# 之后用户即可：
# dsh plugin --profile web add @dsh-ecosystem/session-stats
```

发布前确认：`files` 含 `lib`、peerDependencies 版本与 DSH 对齐、产物为最新构建。

## 完整参考

- 插件契约与 API：[plugin-authoring.md](plugin-authoring.md)
- 座位目录与服务清单：[slot-catalog.md](slot-catalog.md)
- 可运行的完整样例：`packages/sample-greeter/`
