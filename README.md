# dsh-packages

[![pnpm](https://img.shields.io/badge/pnpm-workspace-blue)](https://pnpm.io/workspaces)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 浏览器界面（`web` profile）的**客户端插件聚合 monorepo**。

每个插件以 npm 包形式发布，用户通过 `dsh plugin --profile web add <pkg>` 一行安装即可增强 DSH Web 界面——侧边栏、设置页、会话头部、输入区、消息操作、主题等都可以扩展。

## 📦 插件清单

| 包名 | 版本 | 说明 |
| --- | --- | --- |
| [`@zhengzhuangpro/dsh-hotnews`](packages/hotnews-dsh) | ![npm](https://img.shields.io/npm/v/@zhengzhuangpro/dsh-hotnews) | 🔥 热榜聚合页签（百度/微博/抖音/知乎/GitHub 等） |
| [`@zhengzhuangpro/dsh-sample-greeter`](packages/sample-greeter) | ![npm](https://img.shields.io/npm/v/@zhengzhuangpro/dsh-sample-greeter) | 📝 插件开发示例（i18n / 双 Slot） |

## 🚀 快速开始

### 安装插件

```bash
# 方式一：终端安装
npx dsh plugin --profile web add @zhengzhuangpro/dsh-hotnews

# 方式二：在 DSH 聊天里直接说
# "帮我安装 dsh plugin --profile web add @zhengzhuangpro/dsh-hotnews"
```

> ⚠️ 部分插件需要额外追加配置条目，详见各插件 README。

### 重启生效

```bash
npx @deepseek-ai/dsh@latest web
```

### 卸载插件

```bash
npx @deepseek-ai/dsh@latest plugin --profile web remove @zhengzhuangpro/dsh-hotnews
```

---

## 🛠️ 本地开发

### 环境准备

```bash
git clone https://github.com/zhengzhuangpro/dsh-packages.git
cd dsh-packages
pnpm install
```

### 构建插件

```bash
pnpm build                          # 构建所有插件
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle   # 构建单个插件
```

### 安装到本地 DSH

```bash
pnpm install:profile @zhengzhuangpro/dsh-hotnews
```

### 类型检查

```bash
pnpm typecheck                      # 全仓类型检查
```

### 新建插件

```bash
pnpm create:plugin <plugin-name>    # 一键生成插件骨架
pnpm install                        # 让 pnpm 识别新工作区包
```

---

## 🏗️ 仓库结构

```
dsh-packages/
├── package.json                    # 根工程（pnpm workspaces）
├── pnpm-workspace.yaml
├── tsconfig.base.json              # 共享 TS 配置
├── scripts/
│   ├── create-plugin.mjs           # 一键生成新插件骨架
│   ├── build-client.mjs            # 构建管线
│   └── install-to-profile.mjs      # 一键安装插件到本地 DSH
├── docs/
│   ├── adding-a-plugin.md          # 新插件分步教程
│   ├── plugin-authoring.md         # 开发指南（契约 / Slot / 服务 / 主题）
│   └── slot-catalog.md             # Slot 座位目录
└── packages/
    ├── hotnews-dsh/                # 热门新闻插件
    └── sample-greeter/             # 示例插件
```

---

## 📖 文档

| 文档 | 读者 | 内容 |
| --- | --- | --- |
| [docs/adding-a-plugin.md](docs/adding-a-plugin.md) | 插件作者 | 从零新增插件的分步教程（5 分钟走完） |
| [docs/plugin-authoring.md](docs/plugin-authoring.md) | 插件作者 | 插件契约 / Slot API / 服务 / 主题 / 本地化 / 发布 |
| [docs/slot-catalog.md](docs/slot-catalog.md) | 插件作者 | 全部 Slot 座位目录（含注册参数与 owner props） |

---

## ❓ FAQ

**装完没生效？**
① 确认 `npx @deepseek-ai/dsh@latest plugin --profile web list` 里能看到该包；
② 确认 `cordis.patch.yml` 里有对应的 roster 条目（`- insert:` 块）；
③ 确认重启的是同一个 profile；
④ 打开 DevTools Console 看有没有报错。

**改了源码怎么生效？**
`file:` 安装是拷贝而非链接，重新 `pnpm build` 后要重跑 `pnpm install:profile <pkg>`，再刷新页面。

**插件包名空间是什么？**
本仓库约定 `@zhengzhuangpro/*`，想换 scope 改 `package.json` 的 `name` 即可。

---

## 📄 许可

[MIT](LICENSE)
