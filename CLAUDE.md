# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 提交规范

提交信息结尾加上 Co-Authored-By，不要让 Claude 出现在 GitHub Contributors 列表：

```
🤖 Generated with Claude Code (https://claude.ai/code)
```

## 仓库概述

dsh-packages 是面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 浏览器界面（`web` profile）的客户端插件 monorepo。每个插件以 npm 包形式发布，用户通过 `dsh plugin --profile web add <pkg>` 安装。

包名空间：`@zhengzhuangpro/*`

## 常用命令

```bash
# 安装依赖（Node.js >= 20，pnpm >= 10）
pnpm install

# 构建全部插件
pnpm build

# 构建单个插件
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle

# 类型检查（全仓）
pnpm typecheck

# 类型检查（单个包）
pnpm --filter @zhengzhuangpro/dsh-hotnews typecheck

# 监听模式构建
pnpm build:watch

# 生成新插件骨架
pnpm create:plugin <plugin-name>

# 安装插件到本地 DSH profile（自动追加 cordis.patch.yml roster 条目）
pnpm install:profile <plugin-name>

# 发布
cd packages/<plugin-name>
npm publish --access public          # 正式版
npm publish --access public --tag beta  # beta 版
```

注意：仓库内无 ESLint/Prettier/Jest 等 lint 或 test 配置。

## 架构

### 构建管线（scripts/build-client.mjs）

esbuild 驱动，每个插件产出三个文件到 `lib/`：

| 产物 | 格式 | 平台 | 用途 |
|---|---|---|---|
| `lib/client.js` | CJS（`__ModuleLoader__` 包装） | browser | 浏览器侧 UI，react 和 `@deepseek-ai/*` 标记 external |
| `lib/index.js` | ESM | node | Host 侧入口（Loader 挂载必需） |
| `lib/invariant.js` | ESM | node | Invariant 伴生模块，注册包名所有权 |

CSS 文件通过 esbuild 自定义插件内联为字符串导出（`export default "..."`）。

### 插件契约

一个 DSH Web 客户端插件必须满足：

1. **package.json**：`dsh.client.platform: "web"`，`dsh.client.inject` 声明模块图依赖，`exports["./client"]` 指向客户端产物
2. **客户端入口**：导出 `inject`（cordis 服务名数组）和 `apply(ctx)` 函数
3. **Host 入口**：`lib/index.js` 存在（空 apply 即可）
4. **cordis.patch.yml**：必须有 `- insert:` 块形式的 roster 条目（裸行会被静默跳过）

### Slot 系统

Slot 是 UI 扩展机制，推荐使用低风险的 `list` 形态：

```ts
ctx.slots.inject('sidebar.footer.action', () =>
  ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'my-plugin',
    order: 90,
    label: () => t('label'),
    locale: NS,
  }, MyComponent),
)
```

常用扩展点：`sidebar.footer.action`、`conversation.composer.dock`、`conversation.view`、`conversation.input.left` / `.right`、`settings.section`、`shell.overlay`。

### 关键客户端服务

- `ctx.slots` — Slot 注册/查询
- `ctx.locale` — i18n：`register(ns, dicts)` / `bind(ns)` 返回 `t` 函数
- `ctx.effect` — fiber 生命周期副作用（卸载自动清理）
- `ctx.webServer` — Host 侧路由注册（`register({ kind, path, handler })`）

### 源码目录结构（每个插件统一）

```
src/
  index.ts           # Host 侧入口（空 apply 或业务逻辑）
  invariant.ts       # invariant 伴生模块
  client/
    index.ts         # 客户端入口（inject + apply）
    components.tsx   # React 组件
    i18n.ts          # 本地化字典
    store.ts         # 模块级共享状态
    style.ts         # CSS 注入辅助（data-plugin-css 去重）
    <name>.css       # 样式（使用 --dsw-alias-* 主题 token）
```

### 依赖策略

- 根 `devDependencies` 包含所有 DSH 生态包和构建工具，全仓共享
- 各插件 `peerDependencies` 声明运行时消费的 DSH 包版本
- 各插件 `devDependencies` 包含构建/类型检查所需（含 Slot 声明方包的类型导入）
