# @zhengzhuangpro/dsh-sample-greeter

[![npm version](https://img.shields.io/npm/v/@zhengzhuangpro/dsh-sample-greeter.svg)](https://www.npmjs.com/package/@zhengzhuangpro/dsh-sample-greeter)
[![npm downloads](https://img.shields.io/npm/dm/@zhengzhuangpro/dsh-sample-greeter.svg)](https://www.npmjs.com/package/@zhengzhuangpro/dsh-sample-greeter)
[![license](https://img.shields.io/npm/l/@zhengzhuangpro/dsh-sample-greeter.svg)](../../LICENSE)

> 📝 DSH Web 示例插件：展示客户端插件的标准写法——i18n、双 Slot 注册、CSS 注入与实时时钟。

## ✨ 演示内容

- **侧边栏底部操作项**（`sidebar.footer.action`）：👋 问候入口，点击开关问候条
- **输入区底部信息条**（`conversation.composer.dock`）：问候语 + 实时时钟
- **i18n**：`zh` / `en` 双语言字典，跟随界面语言即时切换
- **主题适配**：样式全部使用 `--dsw-alias-*` 主题 token，自动适配亮/暗色

## 📂 目录结构

```
src/
├── index.ts           # Host 侧空入口（Loader 挂载条目必需）
├── invariant.ts       # invariant 伴生模块（官方约定）
└── client/            # 浏览器侧全部代码（构建为 lib/client.js）
    ├── index.ts       #   插件入口：inject + apply
    ├── i18n.ts        #   字典 + LocaleNamespaceMap 类型增强
    ├── components.tsx #   两个 Slot 组件（t 为标准 prop）
    ├── store.ts       #   模块级共享状态（含卸载复位）
    ├── style.ts       #   CSS 注入辅助（data-plugin-css 去重）
    └── greeter.css    #   插件样式（主题 token）
```

## 🚀 安装

### 本地开发安装

```bash
pnpm install:profile sample-greeter
```

### npm 安装

```bash
npx @deepseek-ai/dsh@latest plugin --profile web add @zhengzhuangpro/dsh-sample-greeter
```

然后重启：

```bash
npx @deepseek-ai/dsh@latest web
```

## 🛠️ 开发

```bash
# 构建
pnpm --filter @zhengzhuangpro/dsh-sample-greeter bundle

# 类型检查
pnpm --filter @zhengzhuangpro/dsh-sample-greeter typecheck
```

## 📦 打包与发布

```bash
# 打包
pnpm --filter @zhengzhuangpro/dsh-sample-greeter bundle

# 发布
cd packages/sample-greeter
npm publish --access public

# 发布 beta
npm publish --access public --tag beta
```

## 📄 许可

[MIT](../../LICENSE)
