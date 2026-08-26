#!/usr/bin/env node
/**
 * create-plugin.mjs — 一键生成新 DSH Web 客户端插件骨架
 *
 * 用法：
 *   pnpm create:plugin <plugin-name>            # 等价于 node scripts/create-plugin.mjs <plugin-name>
 *
 * 示例：
 *   pnpm create:plugin session-stats
 *   → 生成 packages/session-stats/（包名 @zhengzhuangpro/session-stats）
 *
 * 生成内容（与 sample-greeter 同构，对齐官方包目录结构，可直接构建并安装）：
 *   package.json   # dsh.client 声明 + main/exports（"." / "./invariant" / "./client"）+ scripts
 *   tsconfig.json
 *   src/index.ts           # Host 侧空入口（Loader 挂载条目必需，构建为 lib/index.js）
 *   src/invariant.ts       # invariant 伴生模块（官方约定，构建为 lib/invariant.js）
 *   src/client/            # 浏览器侧全部代码（构建为 lib/client.js，__ModuleLoader__ 格式）
 *     ├── index.ts         #   入口：inject + apply（含两处 Slot 注册示例）
 *     ├── i18n.ts          #   字典 + LocaleNamespaceMap 类型增强
 *     ├── components.tsx   #   示例组件（footer action + composer dock）
 *     ├── style.ts         #   CSS 注入辅助
 *     ├── <name>.css       #   主题 token 样式
 *     └── css.d.ts         #   *.css 模块声明
 *   README.md
 *
 * 生成后：
 *   pnpm --filter @zhengzhuangpro/<name> typecheck
 *   pnpm build
 *   pnpm install:profile <name>
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES_DIR = join(ROOT, 'packages')

const name = process.argv[2]
if (!name) {
  console.error('用法: pnpm create:plugin <plugin-name>')
  console.error('示例: pnpm create:plugin session-stats')
  process.exit(2)
}
if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error(`✗ 插件名 "${name}" 不合法：请使用小写 kebab-case（如 session-stats）`)
  process.exit(2)
}

const pkgDir = join(PACKAGES_DIR, name)
if (existsSync(pkgDir)) {
  console.error(`✗ ${pkgDir} 已存在，请换一个名字或先删除。`)
  process.exit(1)
}

const pkgName = `@zhengzhuangpro/dsh-${name}`
/** kebab-case → PascalCase，用于类型/组件标识符（如 session-stats → SessionStats）。 */
const pascal = name
  .split('-')
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join('')
const title = name
  .split('-')
  .map((w) => w[0].toUpperCase() + w.slice(1))
  .join(' ')

/** 与 sample-greeter 保持一致的 DSH 版本基线。 */
const DSH_VERSION = '^0.1.1-rc.2'

const files = {
  'package.json': `{
  "name": "${pkgName}",
  "version": "0.1.0",
  "description": "DSH Web 插件：${title}。",
  "type": "module",
  "license": "MIT",
  "main": "lib/index.js",
  "files": [
    "lib"
  ],
  "exports": {
    ".": "./lib/index.js",
    "./invariant": "./lib/invariant.js",
    "./client": "./lib/client.js",
    "./package.json": "./package.json"
  },
  "dsh": {
    "client": {
      "inject": [
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-locale"
      ],
      "platform": "web"
    }
  },
  "scripts": {
    "bundle": "node ../../scripts/build-client.mjs ${name}",
    "bundle:watch": "node ../../scripts/build-client.mjs ${name} --watch",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-client-locale": "${DSH_VERSION}",
    "@deepseek-ai/dsh-client-runtime": "${DSH_VERSION}",
    "@deepseek-ai/dsh-invariants": "${DSH_VERSION}",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-client-locale": "${DSH_VERSION}",
    "@deepseek-ai/dsh-client-runtime": "${DSH_VERSION}",
    "@deepseek-ai/dsh-client-ui-conversation": "${DSH_VERSION}",
    "@deepseek-ai/dsh-client-ui-sidebar": "${DSH_VERSION}",
    "@deepseek-ai/dsh-client-ui-slots": "${DSH_VERSION}",
    "@deepseek-ai/dsh-invariants": "${DSH_VERSION}",
    "@types/react": "~18.3.1",
    "react": "^18.2.0",
    "typescript": "^5.7.0"
  }
}
`,

  'tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src"]
}
`,

  'src/index.ts': `/**
 * ${pkgName} Host 侧入口（Node 半区）。
 *
 * DSH 客户端插件契约要求包根可被 Loader 以普通 Node 模块解析并挂载——
 * 官方插件做法完全一致（ui-jobs 注释原文）：
 *   "Pure UI plugin: the empty apply exists so the plugin appears in the
 *    host cordis.yml / Loader; the browser half ships via exports["./client"]"
 *
 * 本插件纯 UI，无 Host 侧行为；浏览器侧代码在 src/client/，
 * 通过 package.json 的 dsh.client 声明被发现。
 */

/** Host 插件主体——无 Host 侧行为。 */
export function apply(): void {}
`,

  'src/invariant.ts': `/**
 * ${pkgName} 的 invariant 伴生模块（官方约定：每个包都从 \`./invariant\` 注册检查）。
 *
 * 本插件无运行时 invariant（Slot 注册与字典均为注册表所有、由 HMR 安全规范
 * 证明其回收），因此 installer 为空；注册本身让 invariants 服务保留本包的
 * 包名所有权。
 */

import type { Context } from '@deepseek-ai/cordis'
// 装载 dsh-invariants 对 Context 的增强（ctx.invariants）
import type {} from '@deepseek-ai/dsh-invariants'

/** 完整 npm 包名，invariants 服务按此保留所有权。 */
const PACKAGE_NAME = '${pkgName}'

/** Cordis companion 插件名。 */
export const name = '${name}-invariant'

/** 注册前需要服务。 */
export const inject = ['invariants']

/** 无运行时 invariant 检查。 */
const install = () => {}

/**
 * 注册本包的 invariant companion。
 * @param ctx - 携带 invariants 服务的 Cordis 上下文。
 * @returns 注册完成后安装的 disposer。
 */
export const apply = (ctx: Context) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
`,

  'src/client/index.ts': `/**
 * ${pkgName} 客户端插件入口。
 *
 * 契约（DSH Web 客户端插件）：
 *   - 构建为 lib/client.js（__ModuleLoader__.load 格式），
 *     路径由 package.json 的 exports["./client"] 声明
 *   - 必须导出 inject（cordis 服务名数组）与 apply(ctx)
 *   - 用到的 DSH 包在 package.json 的 dsh.client.inject 中声明（模块图依赖）
 *
 * 骨架已注册两个加性 Slot（list 形态，风险 none）：
 *   - sidebar.footer.action         侧边栏底部操作项
 *   - conversation.composer.dock    输入区底部信息条
 * 按需增删，完整座位目录见 docs/slot-catalog.md。
 */

import type { Context } from '@deepseek-ai/cordis'
// 空类型导入：装载 client 类型的模块增强（Context 服务 / SlotMap 键）
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ${pascal}Dock, ${pascal}FooterAction } from './components'
import { dictionaries } from './i18n'
import { injectStyle } from './style'
import css from './${name}.css'

const PLUGIN_ID = '${pkgName}'
const NS = '${name}'

/** 本插件注入的 cordis 服务。 */
export const inject = ['slots', 'locale']

export function apply(ctx: Context) {
  // CSS 注入（data-plugin-css 去重）
  injectStyle(PLUGIN_ID, css)

  // i18n：注册命名空间字典（register 返回退订函数，随 fiber 卸载自动清理）
  ctx.effect(() => ctx.locale.register(NS, dictionaries), '${name}: dictionaries')

  const t = ctx.locale.bind(NS)

  // 侧边栏底部操作项
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register({
      name: 'sidebar.footer.action',
      id: '${name}',
      order: 90,
      label: () => t('footer.label'),
      locale: NS,
    }, ${pascal}FooterAction),
  )

  // 输入区底部信息条
  ctx.slots.inject('conversation.composer.dock', () =>
    ctx.slots.register({
      name: 'conversation.composer.dock',
      id: '${name}',
      order: 90,
      locale: NS,
    }, ${pascal}Dock),
  )
}
`,

  'src/client/i18n.ts': `/**
 * ${pkgName} 本地化字典。
 * 键名对应 DSH 内置 LocaleId（zh / en）；label 使用 thunk 形式，
 * 每次投影时重新读取当前语言，切换语言即时生效。
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

export interface ${pascal}Dict {
  /** 侧边栏底部操作项的显示文本。 */
  'footer.label': string
  /** 输入区信息条文案（{title} 为占位符）。 */
  'dock.greeting': string
}

/** 绑定到 ${name} 命名空间的翻译函数类型。 */
export type ${pascal}T = TranslateNS<'${name}'>

export const dictionaries: Record<'zh' | 'en', ${pascal}Dict> = {
  zh: {
    'footer.label': '${title}',
    'dock.greeting': '来自 ${title} 插件的问候 👋',
  },
  en: {
    'footer.label': '${title}',
    'dock.greeting': 'Hello from the ${title} plugin 👋',
  },
}

/**
 * 把命名空间并入 LocaleNamespaceMap（值为字典键联合），
 * 使 register / bind 获得完整类型提示。
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    '${name}': keyof ${pascal}Dict
  }
}
`,

  'src/client/components.tsx': `/**
 * Slot 组件。
 * props 由注册机制注入：owner props（座位声明方提供）+ 标准 prop \`t\`
 * （spec 声明 locale 时自动绑定到对应命名空间）。
 */

import type { ${pascal}T } from './i18n'

/** sidebar.footer.action 的 owner props。 */
export interface ${pascal}FooterActionProps {
  /** 侧边栏是否展开（false = 56px 窄栏 rail）。 */
  wide: boolean
  /** 标准 prop：绑定到本条目 locale 命名空间的翻译函数。 */
  t: ${pascal}T
}

export function ${pascal}FooterAction({ wide, t }: ${pascal}FooterActionProps) {
  return (
    <button type="button" className={wide ? 'dshp-action' : 'dshp-action dshp-action--rail'}>
      <span className="dshp-action__icon" aria-hidden="true">✨</span>
      {wide ? <span className="dshp-action__label">{t('footer.label')}</span> : null}
    </button>
  )
}

/** conversation.composer.dock 的 owner props 子集（完整为 InputZone）。 */
export interface ${pascal}DockProps {
  session: {
    sessionId: string
  }
  /** 标准 prop：绑定到本条目 locale 命名空间的翻译函数。 */
  t: ${pascal}T
}

export function ${pascal}Dock({ session, t }: ${pascal}DockProps) {
  return (
    <div className="dshp-dock">
      <span className="dshp-dock__greeting">{t('dock.greeting', { title: session.sessionId })}</span>
    </div>
  )
}
`,

  'src/client/style.ts': `/**
 * 样式注入辅助：以 <style> 注入 document.head，data-plugin-css 去重。
 */
const injected = new Set<string>()

export function injectStyle(pluginId: string, css: string): void {
  if (typeof document === 'undefined') return
  const tagId = \`\${pluginId}/style.css\`
  if (injected.has(tagId)) return
  if (document.querySelector(\`style[data-plugin-css=\${JSON.stringify(tagId)}]\`) !== null) return
  const tag = document.createElement('style')
  tag.dataset.plugin = pluginId
  tag.dataset.pluginCss = tagId
  tag.textContent = css
  document.head.appendChild(tag)
  injected.add(tagId)
}
`,

  'src/client/css.d.ts': `/**
 * CSS 模块声明：构建脚本把 \`import css from './x.css'\` 内联为字符串。
 */
declare module '*.css' {
  const css: string
  export default css
}
`,

  [`src/client/${name}.css`]: `/* ${pkgName} 插件样式：全部使用 DSH 主题 token（--dsw-alias-*），自动适配亮/暗色。 */

.dshp-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 24px;
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease;
}

.dshp-action:hover,
.dshp-action:focus-visible {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-border-l2);
}

.dshp-action--rail {
  padding: 0;
  width: 28px;
  justify-content: center;
}

.dshp-action__icon {
  font-size: 14px;
  line-height: 1;
}

.dshp-dock {
  display: flex;
  align-items: baseline;
  padding: 2px 4px 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.dshp-dock__greeting {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
}
`,

  'README.md': `# ${pkgName}

DSH Web 客户端插件：${title}。

## 开发

\`\`\`bash
pnpm --filter ${pkgName} typecheck   # 类型检查
pnpm --filter ${pkgName} bundle      # 构建 lib/client.js
pnpm build                           # 或从仓库根构建全部
\`\`\`

## 安装到 DSH

\`\`\`bash
pnpm install:profile ${name}                              # 本地开发（file: 协议）
dsh plugin --profile web add ${pkgName}                   # 发布到 npm 后
\`\`\`

重启生效：\`dsh --profile web\`。完整开发指南见 docs/plugin-authoring.md。
`,
}

// 写入模板文件（递归创建 src/client 等子目录）
const srcDir = join(pkgDir, 'src')
mkdirSync(srcDir, { recursive: true })
for (const [rel, content] of Object.entries(files)) {
  const target = join(pkgDir, rel)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

console.log(`✓ 已生成插件骨架: ${pkgDir}`)
console.log(`  包名: ${pkgName}`)
console.log('')
console.log('下一步：')
console.log(`  1. pnpm install                       # 让 pnpm 识别新工作区包`)
console.log(`  2. pnpm --filter ${pkgName} typecheck  # 类型检查`)
console.log(`  3. pnpm build                          # 构建 lib/client.js`)
console.log(`  4. pnpm install:profile ${name}             # 安装到 DSH web profile`)
console.log('  5. 重启生效: dsh --profile web')
console.log('')
console.log('开发指南: docs/plugin-authoring.md   |   从零教程: docs/adding-a-plugin.md')
