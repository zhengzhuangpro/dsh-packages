# @dsh-ecosystem/sample-greeter

DSH Web 客户端插件示例：演示生态包中一个标准插件的最小完整写法。

## 功能

- **侧边栏底部操作项**（`sidebar.footer.action`）：👋 问候插件入口，点击开关问候条
- **输入区底部信息条**（`conversation.composer.dock`）：问候语 + 实时时钟
- **i18n**：`zh` / `en` 双语言字典，跟随界面语言即时切换
- **主题适配**：样式全部使用 `--dsw-alias-*` 主题 token，自动适配亮/暗色

## 目录（对齐官方包结构）

```
src/
├── index.ts        # Host 侧空入口（Loader 挂载条目必需，构建为 lib/index.js）
├── invariant.ts    # invariant 伴生模块（官方约定，构建为 lib/invariant.js）
└── client/         # 浏览器侧全部代码（构建为 lib/client.js）
    ├── index.ts    #   插件入口：inject + apply（Slot 注册 / i18n / 样式注入 / 清理）
    ├── i18n.ts     #   字典 + LocaleNamespaceMap 类型增强
    ├── components.tsx  # 两个 Slot 组件（t 为标准 prop，由注册机制注入）
    ├── store.ts    #   模块级共享状态（含卸载复位）
    ├── style.ts    #   CSS 注入辅助（data-plugin-css 去重）
    └── greeter.css #   插件样式（主题 token）
```

## 开发

```bash
pnpm install                # 仓库根目录安装依赖
pnpm --filter @dsh-ecosystem/sample-greeter bundle      # 构建 lib/client.js
pnpm --filter @dsh-ecosystem/sample-greeter typecheck   # 类型检查
```

## 安装到 DSH

```bash
# 本地开发安装（file: 协议，自动追加 browser-roster 条目到 cordis.patch.yml；
# profile 有 snake 的 workspace: 残留依赖时加 --fix-workspace）
pnpm install:profile sample-greeter

# 或发布到 npm 后：
npx @deepseek-ai/dsh@latest plugin --profile web add @dsh-ecosystem/sample-greeter
```

重启生效：`npx @deepseek-ai/dsh@latest web`。
客户端插件需要"安装包 + cordis.patch.yml 里的 roster 条目"两者齐备才加载，
`install-to-profile.mjs` 会自动完成。完整机制见 docs/plugin-authoring.md。
