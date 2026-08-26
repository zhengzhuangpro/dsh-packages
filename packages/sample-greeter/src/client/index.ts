/**
 * sample-greeter 客户端插件入口。
 *
 * 契约（DSH Web 客户端插件）：
 *   - 本文件被构建为 lib/client.js（__ModuleLoader__.load 格式），
 *     路径由 package.json 的 exports["./client"] 声明。
 *   - 必须导出 `inject`（cordis 服务名数组）与 `apply(ctx)`。
 *   - 用到的 DSH 包在 package.json 的 dsh.client.inject 中声明
 *     （模块图依赖），构建时保持 external。
 *
 * 演示内容：
 *   1. i18n：注册命名空间字典，label/文案随界面语言切换
 *   2. sidebar.footer.action：侧边栏底部操作项（点击开关问候条）
 *   3. conversation.composer.dock：输入区底部信息条（问候 + 实时时钟）
 *   4. CSS 注入（data-plugin-css 去重）与卸载清理
 */

import type { Context } from '@deepseek-ai/cordis'
// 以下空类型导入用于装载 client 类型的模块增强：
//   - dsh-client-runtime/client    → ctx.slots / ctx.sessions / ctx.workspaces
//   - dsh-client-locale/client     → ctx.locale
//   - dsh-client-ui-sidebar/client → SlotMap 中的 sidebar.* 键（含 sidebar.footer.action）
//   - dsh-client-ui-conversation/client → SlotMap 中的 conversation.* 键（含 composer.dock）
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { GreeterDock, GreeterFooterAction } from './components'
import { dictionaries } from './i18n'
import { injectStyle } from './style'
import { resetGreetingState } from './store'
import css from './greeter.css'

const PLUGIN_ID = '@dsh-ecosystem/sample-greeter'
const NS = 'greeter'

/** 本插件注入的 cordis 服务。 */
export const inject = ['slots', 'locale']

export function apply(ctx: Context) {
  // CSS 注入（去重）
  injectStyle(PLUGIN_ID, css)

  // i18n：注册命名空间字典；register 返回退订函数，随 fiber 卸载自动清理
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'sample-greeter: dictionaries')

  // 绑定翻译函数（每次调用读取当前语言，跟随界面语言切换）
  const t = ctx.locale.bind(NS)

  // 侧边栏底部操作项
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'sample-greeter',
      order: 90,
      label: () => t('footer.label'),
      locale: NS,
    }, GreeterFooterAction),
  )

  // 输入区底部信息条
  ctx.slots.inject('conversation.composer.dock', () =>
    ctx.slots.register({
      name: 'conversation.composer.dock',
      id: 'sample-greeter',
      order: 90,
      locale: NS,
    }, GreeterDock),
  )

  // 卸载时复位模块级共享状态
  ctx.effect(() => () => resetGreetingState(), 'sample-greeter: state reset')
}
