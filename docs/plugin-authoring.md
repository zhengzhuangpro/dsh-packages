# DSH Web 插件开发指南

本指南面向在本仓库（或任何遵循 DSH 客户端插件契约的仓库）开发 Web 插件的开发者。
内容基于 DSH `0.1.1-rc.2` 的运行时实现与官方客户端插件（`dsh-client-ui-*`）的写法。

---

## 1. 插件是什么

DSH Web 界面（浏览器侧）是一个 Cordis 运行时。一个 **客户端插件** 是一个 npm 包：

- 在 `package.json` 中声明 `dsh.client`（平台、模块图依赖）
- 提供 `./client` 导出，指向一个构建产物（`lib/client.js`）
- 产物是 **`__ModuleLoader__` 模块格式**，由浏览器内的模块加载器执行
- 导出 `inject`（cordis 服务名数组）与 `apply(ctx)`（插件主体）
- **还必须有一个 Host 侧空入口**（`main` → `lib/index.js`，内容为空 `apply`）——
  Loader 挂载 roster 条目时以普通 Node 模块导入包根；缺少它会报
  `ERR_PACKAGE_PATH_NOT_EXPORTED`，条目挂载失败，插件从客户端模块图被剔除。
  官方插件注释原文："the empty apply exists so the plugin appears in the host
  cordis.yml / Loader; the browser half ships via exports[\"./client\"]"

运行时的发现流程（`dsh-client-modules`）：

1. 扫描 **loader 条目**（`ctx.loader.entries()`）——因此插件除了被安装，还必须在
   profile 的 `cordis.patch.yml` 里有一条 browser-roster 条目（与官方 bundle 中
   每个 `dsh.client` 插件一行的做法一致）。**必须用 `insert:` 块**——裸行
   `- id: … / name: …` 会被引导代码当作"覆盖已有条目"而静默跳过
   （`applyEntryPatches`：`patch: entry "x" not found`）：
   ```yaml
   - insert:
       - id: my-plugin
         name: "@zhengzhuangpro/my-plugin"
   ```
2. 对每个 loader 条目读取 `package.json` 的 `dsh.client` → 要求 `platform === "web"`
3. 读取 `exports["./client"]`（字符串或 `{ default }`）→ 定位产物文件
4. 读取 `dsh.client.inject` → 作为模块图依赖（加载顺序）
5. 浏览器按依赖顺序加载各 bundle，`apply(ctx)` 在 fiber 中执行

> 关键：**Host 空入口 + 安装包 + roster 行**，三者缺一不可。
> `pnpm install:profile`（`scripts/install-to-profile.mjs`）会自动完成安装与
> roster 行（幂等）；构建脚本自动产出三个产物：
> `src/client/` → `lib/client.js`、`src/index.ts` → `lib/index.js`、
> `src/invariant.ts` → `lib/invariant.js`。

## 2. package.json 契约

```jsonc
{
  "name": "@zhengzhuangpro/my-plugin",
  "type": "module",
  "main": "lib/index.js",                     // 必须：Host 空入口（Loader 挂载条目用）
  "files": ["lib"],
  "exports": {
    ".": "./lib/index.js",                    // 必须：包根可被 Node 导入（Loader 挂载条目用）
    "./invariant": "./lib/invariant.js",      // 约定：invariant 伴生模块（官方每个包都有）
    "./client": "./lib/client.js",            // 必须：客户端产物路径（字符串或 { default }）
    "./package.json": "./package.json"
  },
  "dsh": {
    "client": {
      "platform": "web",                   // 必须："web" 才会被客户端运行时发现
      "inject": [                          // 模块图依赖（这些包先于本包加载）
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-locale"
      ],
      "external": []                       // 可选：额外 external（运行时解析）
    }
  },
  "scripts": {
    "bundle": "node ../../scripts/build-client.mjs my-plugin",
    "bundle:watch": "node ../../scripts/build-client.mjs my-plugin --watch",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {                    // 运行时消费的 DSH 包与 react
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-client-runtime": "^0.1.1-rc.2",
    "@deepseek-ai/dsh-client-locale": "^0.1.1-rc.2",
    "react": "^18.2.0"
  },
  "devDependencies": { /* 构建/类型检查用：typescript、@types/react、上述包 + 你注册的 Slot 声明方包 */ }
}
```

`dsh.client.inject` 的取值原则：你**直接消费其服务的包**（通常
`@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-locale`）。

## 3. 入口：`src/client/index.ts`

浏览器侧全部代码放在 `src/client/` 下（对齐官方包结构）；根目录还有
`src/index.ts`（Host 空入口）与 `src/invariant.ts`（invariant 伴生）：

```
src/
├── index.ts        # Host 空入口（→ lib/index.js）
├── invariant.ts    # invariant 伴生（→ lib/invariant.js，官方约定）
└── client/         # 浏览器侧（→ lib/client.js，__ModuleLoader__ 格式）
    └── index.ts    # ← 本节的插件入口
```

```ts
import type { Context } from '@deepseek-ai/cordis'
// 空类型导入：装载 client 类型的模块增强（Context 上的服务、SlotMap 键）
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// 你注册的 Slot 的声明方包（提供 SlotMap 键的类型）
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

/** 注入的 cordis 服务。 */
export const inject = ['slots', 'locale']

export function apply(ctx: Context) {
  // 1. i18n：注册命名空间字典（返回退订函数，ctx.effect 自动清理）
  ctx.effect(() => ctx.locale.register('my-ns', { zh: {...}, en: {...} }), 'my-plugin: dictionaries')

  const t = ctx.locale.bind('my-ns')

  // 2. 注册 Slot：ctx.slots.inject(key, () => ctx.slots.register(spec, Component))
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'my-plugin',
      order: 90,
      label: () => t('footer.label'),   // thunk：每次投影重读，跟随语言切换
      locale: 'my-ns',                  // 绑定命名空间 → 组件收到标准 prop `t`
    }, MyFooterAction),
  )
}
```

要点：

- `inject` 导出的是 **cordis 服务名**（`slots` / `locale` / `theme` …），
  与 package.json 的 `dsh.client.inject`（**包名**，模块图依赖）是两回事
- 所有副作用都要走 `ctx.effect` / `ctx.on` 等 fiber 生命周期 API，
  插件停止/热更新时自动回收
- 不要访问未在 `inject` 声明的 `ctx.xxx`；可选服务用 `ctx.get('name')` 判空

## 4. Slot 系统

Slot 是 DSH Web 的 UI 扩展机制：由 shell 声明"座位"，插件注册"入驻"。
查询实时目录：

```text
运行中的界面里：设置 → 插件 页面；或参考 docs/slot-catalog.md 的快照。
```

### 4.1 形态

| 形态 | 语义 | 注册参数 |
| --- | --- | --- |
| `single` | 单座位，后注册者覆盖（shadowing） | `{ name, priority? }`，**慎用** |
| `list` | 加性列表，按 `id` 单元格合并 | `{ name, id, order?, label?, priority? }` |
| `keyed` | 按键分发（如工具名、命令名） | `{ name, key }` |
| `chain` | 选择器链，首个匹配者接管 | `{ name, select(owner) }` |

安全选择：优先 `list` 形态的座位（`replaceRisk: "none"`）；`single` 座位覆盖官方
UI，风险高。

### 4.2 注册 API

```ts
// 两个 API 在 slots 服务上：
ctx.slots.inject(key, () => ctx.slots.register(spec, Component))
//   inject —— 在 key 对应的声明存活期间安装注册效果（返回退订函数）
//   register —— 返回移除注册的 disposer
```

组件收到的 props 由四部分合成：

1. **owner props**：Slot 声明方提供的运行数据
   （如 `sidebar.footer.action` → `{ wide }`；`conversation.composer.dock` → `{ session, input }`）
2. **标准 props**：`useSessions` / `useWorkspaces` / `sessionId` / `useProjection` 等 hooks
3. **locale props**：spec 声明 `locale: 'my-ns'` 时注入 `t`（`TranslateNS<'my-ns'>`）
4. **inject props**：spec 声明 `inject` 工厂时的业务面

组件只声明自己消费的字段，多余字段由调用方传入（结构类型兼容）：

```tsx
export interface MyFooterActionProps {
  wide: boolean
  t: GreeterT // = TranslateNS<'my-ns'>
}
export function MyFooterAction({ wide, t }: MyFooterActionProps) {
  return <button className="x-action" title={t('label')}>{wide ? t('label') : '✨'}</button>
}
```

### 4.3 常用座位（加性、低风险）

| 座位 | 形态 | 用途 | owner props |
| --- | --- | --- | --- |
| `sidebar.footer.action` | list | 侧边栏底部操作项 | `{ wide }` |
| `settings.section` | list | 新增设置页 | — |
| `settings.general.item` | list | 通用设置行 | — |
| `conversation.session.header.actions` | list | 会话头部按钮 | — |
| `conversation.session.header.utilities` | list | 会话头部右侧工具 | — |
| `conversation.input.left` / `.right` | list | 输入框工具行控件 | `{ session, input }` |
| `conversation.input.dock` / `conversation.composer.dock` | list | 输入区上方/下方信息条 | `{ session, input }` |
| `conversation.chat.assistant-actions` | list | 助手消息操作条 | — |
| `shell.overlay` | list | 全局浮层 | — |
| `tool.call.toolview` | keyed | 工具调用卡片（键 = 工具名，开放域） | — |

## 5. 客户端服务（`ctx.*`）

| 服务 | 说明 |
| --- | --- |
| `slots` | Slot 注册/查询（`inject` / `register` / `entries` / `spec`） |
| `locale` | 字典注册（`register(ns, dicts)`）、绑定（`bind(ns)`）、切换语言 |
| `theme` | 主题注册、token 覆盖（`overrideTokens(source, tokens)`） |
| `sessions` | 会话操作：打开、fork、搜索、subagent 目录 |
| `workspaces` | 工作区：创建、连接、目录浏览 |
| `layout` | 侧栏 / 详情列开关 |
| `timer` | 定时器（`timeout` / `interval` / `throttle` / `debounce`），随 fiber 清理 |

服务名必须出现在入口的 `inject` 导出中。事件（如 `slots/changed`、
`connection/reset`）用 `ctx.on(...)` 监听，同样随 fiber 清理。

## 6. 主题与样式

- 颜色一律使用主题 token：`--dsw-alias-bg-base`、`--dsw-alias-label-secondary`、
  `--dsw-alias-border-l1`、`--dsw-alias-state-success-primary` 等（亮/暗自动适配）
- CSS 注入约定：`import css from './x.css'`（构建脚本内联为字符串），
  用 `style.ts` 的 `injectStyle(pluginId, css)` 注入（`data-plugin-css` 去重）
- 若要整体换肤：`theme` 服务的 `overrideTokens` 可覆盖 token（需要亮/暗两套值）

## 7. 本地化

```ts
// i18n.ts —— 字典 + 命名空间类型增强
export interface MyDict { 'footer.label': string }
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'my-ns': keyof MyDict }
}
export type MyT = TranslateNS<'my-ns'>
export const dictionaries: Record<'zh' | 'en', MyDict> = { ... }
```

注册后：

- `ctx.locale.register('my-ns', dictionaries)`（返回退订函数）
- `const t = ctx.locale.bind('my-ns')` → `t('footer.label', { name })`
- 组件通过 spec 的 `locale: 'my-ns'` 自动获得 `t` prop

## 8. 构建与产物验证

```bash
pnpm build                 # 全部
pnpm --filter <pkg> bundle # 单个
pnpm build:watch           # 监听 src/ 重建
```

构建产物（`lib/client.js`）必须满足：

```js
window.__ModuleLoader__.load({
  id: "<包名>",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    // ...打包后的代码（react / @deepseek-ai/* 保持 require external）
    return module.exports;
  }
});
```

校验命令：

```bash
node -e "const fs=require('fs');const c=fs.readFileSync('packages/<pkg>/lib/client.js','utf8');
if(!c.startsWith('window.__ModuleLoader__.load(')){console.error('BAD FORMAT');process.exit(1)}
console.log('OK: bundle format valid')"
```

## 9. 安装到 profile

```bash
# 本地开发（file: 协议；自动追加 roster 条目，profile 有 workspace: 残留依赖时加 --fix-workspace）
pnpm install:profile <plugin-dir-or-name>             # profile 省略时默认 web

# 已发布到 npm（npx 启动的 DSH 同样适用）
npx @deepseek-ai/dsh@latest plugin --profile web add <pkg>
```

安装后需要**重启** profile 生效：`npx @deepseek-ai/dsh@latest web`。

加载的两个必要条件（脚本已自动处理，手动操作时对照检查）：

1. 包装进 profile：`~/.dsh/profiles/web/node_modules`（loader 的 `baseUrl` 是
   profile 目录，`createRequire(baseUrl)` 父级回溯可解析到）
2. browser-roster loader 条目（`dsh-client-modules` 只扫描 loader 条目；**必须用
   `insert:` 块**，裸行会被跳过）：

   ```yaml
   # profile 的 cordis.patch.yml
   - insert:
       - id: my-plugin
         name: "@zhengzhuangpro/my-plugin"
   ```

   注意：本机 web profile 可能有 `@deepseek-ai/dsh-client-ui-snake: "workspace:^"`
   这类**无法解析的 workspace 残留依赖**，会让任何 `pnpm add` 报
   `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`；用 `--fix-workspace` 自动清理（会备份）。
   Host 侧 bundle（声明了 `dsh.bundle.patch`）则需把其 patch 挂载进组合树。

## 10. 发布

```bash
# 在包目录
pnpm publish --access public
# 或仓库级多包发布（建议接入 changesets）
```

发布前确认：`files` 包含 `lib`；`exports["./client"]` 路径正确；peerDependencies 版本
与 DSH 对齐；产物重新构建过。

## 11. 调试建议

1. 浏览器 DevTools → Console：查看 `__ModuleLoader__` 相关日志、fiber 报错
2. `pnpm build:watch` + 页面刷新：HMR 机制会按 `rev` 重新拉取产物
3. Slot 未出现：确认 `dsh.client.platform`、`exports["./client"]`、
   `dsh.client.inject` 是否齐全；确认坐位为 list 形态且 id 未与官方冲突
4. 插件报错：先看浏览器 Console 的 fiber 错误栈；必要时临时在 apply 中打日志
