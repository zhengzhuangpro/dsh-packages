# @zhengzhuangpro/dsh-hotnews

[![npm version](https://img.shields.io/npm/v/@zhengzhuangpro/dsh-hotnews.svg)](https://www.npmjs.com/package/@zhengzhuangpro/dsh-hotnews)
[![npm downloads](https://img.shields.io/npm/dm/@zhengzhuangpro/dsh-hotnews.svg)](https://www.npmjs.com/package/@zhengzhuangpro/dsh-hotnews)
[![license](https://img.shields.io/npm/l/@zhengzhuangpro/dsh-hotnews.svg)](../../LICENSE)

> 📰 在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 里看热搜——百度 / 微博 / 抖音 / 虎扑 / 知乎 / 掘金 / 36氪 / GitHub / 少数派 / 华尔街见闻，一个页签搞定。

## ✨ 功能亮点

- 🔥 **十大平台热榜聚合**：百度、微博、抖音、虎扑、知乎、掘金、36氪、GitHub、少数派、华尔街见闻
- 🎨 **自动主题适配**：跟随 DSH 亮色 / 暗色主题
- 🌐 **中英文国际化**：跟随界面语言自动切换
- 🔄 **一键刷新**：实时获取最新热榜数据
- 🖱️ **点击跳转**：直接打开原文链接
- 📦 **零配置开箱即用**：数据经 Host 同源路由中转，无跨域问题

## 📸 使用效果

```
┌─────────────────────────────────────────────┐
│  [ Chat ]  [ 🔥 热榜 ]                      │
├─────────────────────────────────────────────┤
│  [百度] [微博] [抖音] [虎扑] [知乎] ...       │
│                                              │
│  1. 某某热搜话题                    1234万    │
│  2. 某某新闻事件                     890万    │
│  3. ...                                      │
└─────────────────────────────────────────────┘
```

## 🚀 安装

> 自 v0.0.2-beta.4 起，插件声明了 `dsh.bundle`，`dsh plugin add` **自动激活**，无需任何手动配置。

### 方式一：AI 一键安装（推荐）

在 DSH Web 界面聊天框中输入：

```
帮我安装 dsh plugin --profile web add @zhengzhuangpro/dsh-hotnews
```

安装即激活，重启生效。

### 方式二：终端安装

```bash
npx dsh plugin --profile web add @zhengzhuangpro/dsh-hotnews
```

然后重启：

```bash
npx @deepseek-ai/dsh@latest web
```

安装命令会自动把插件加入 profile 的配置层（`dsh.profile.bundles`），
插件自带的 `cordis.patch.yml` 随层加载——热榜页签开箱即用。

## 🗑️ 卸载

```bash
dsh plugin --profile web remove @zhengzhuangpro/dsh-hotnews
```

卸载同样自动：插件离开配置层，无需手动清理任何文件。

---

## 🛠️ 开发

### 环境准备

```bash
git clone https://github.com/zhengzhuangpro/dsh-packages.git
cd dsh-packages
pnpm install
```

### 开发调试

```bash
# 构建插件
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle

# 安装到本地 DSH
pnpm install:profile @zhengzhuangpro/dsh-hotnews

# 启动 DSH 开发服务器
npx @deepseek-ai/dsh@latest web --port 3081
```

修改代码后重新构建，刷新页面即可：

```bash
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle
```

### 类型检查

```bash
pnpm --filter @zhengzhuangpro/dsh-hotnews typecheck
```

---

## 📦 打包与发布

### 打包

```bash
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle
```

产物输出到 `lib/` 目录：

```
lib/
├── index.js          # 入口（invariant + host 逻辑）
├── invariant.js      # 插件契约声明
└── client.js         # 客户端 UI（Slot 注册 / 组件 / 样式 / i18n）
```

### 发布

```bash
# 进入包目录
cd packages/hotnews-dsh

# 发布正式版
npm publish --access public

# 发布 beta 版
npm publish --access public --tag beta
```

> ⚠️ `npm publish` 会自动触发 `prepublishOnly` 钩子执行 `npm run bundle`，无需手动先 build。

### 升级版本

```bash
cd packages/hotnews-dsh

# 补丁版本 0.0.2 -> 0.0.3
npm version patch

# beta 版本 0.0.2-beta.1 -> 0.0.2-beta.2
npm version prerelease --preid=beta
```

---

## 📖 技术实现

- 数据来源：[hotnews](https://github.com/zhengzhuangpro/hotnews)（≥ 0.1.7-beta.0）npm 库
- 构建时将 `fetchNews` / `sources` API 打包进 `lib/index.js`
- 用户安装时**无需额外依赖**，数据通过 Host 同源路由中转，**无跨域问题**

## 📄 许可

[MIT](../../LICENSE)
