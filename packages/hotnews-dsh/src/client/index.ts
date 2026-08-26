/**
 * dsh-hotnews 客户端插件入口。
 *
 * 契约（DSH Web 客户端插件）：
 *   - 构建为 lib/client.js（__ModuleLoader__.load 格式），路径由
 *     package.json 的 exports["./client"] 声明
 *   - 必须导出 inject（cordis 服务名数组）与 apply(ctx)
 *   - 用到的 DSH 包在 package.json 的 dsh.client.inject 中声明（模块图依赖）
 *
 * 注册一个 conversation.view 视图页签（list 形态，风险 none）：
 *   占用会话主体主区域，与 chat / 轨迹视图并列，
 *   由会话主体一次渲染一个，点击页签切换。
 * 数据从 Host 半区注册的同源路由 /hotnews/api 拉取。
 */

import type { Context } from '@deepseek-ai/cordis'
// 空类型导入：装载 client 类型的模块增强（Context 服务 / SlotMap 键）
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { HotnewsView } from './components'
import { dictionaries } from './i18n'
import { injectStyle } from './style'
import { resetNewsState } from './store'
import css from './hotnews.css'

const PLUGIN_ID = '@zhengzhuangpro/dsh-hotnews'
const NS = 'dsh-hotnews'

/** 本插件注入的 cordis 服务。 */
export const inject = ['slots', 'locale']

export function apply(ctx: Context) {
  // CSS 注入（data-plugin-css 去重）
  injectStyle(PLUGIN_ID, css)

  // i18n：注册命名空间字典（register 返回退订函数，随 fiber 卸载自动清理）
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-hotnews: dictionaries')

  const t = ctx.locale.bind(NS)

  // 会话视图页签：占用对话主区域，与 chat / 轨迹视图并列
  ctx.slots.inject('conversation.view', () =>
    ctx.slots.register({
      name: 'conversation.view',
      id: 'dsh-hotnews',
      order: 90,
      label: () => t('view.label'),
      locale: NS,
    }, HotnewsView),
  )

  // 卸载时复位共享状态
  ctx.effect(() => () => resetNewsState(), 'dsh-hotnews: state reset')
}
