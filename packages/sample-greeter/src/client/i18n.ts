/**
 * 示例插件的本地化字典。
 *
 * 通过 locale 服务的 register(ns, dicts) 注册；键名对应 DSH 内置的
 * LocaleId（zh / en），界面语言切换后 label 与组件文案会自动跟随
 * （label 使用 thunk 形式，每次投影时重新读取当前语言）。
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

/** 绑定到 greeter 命名空间的翻译函数类型（键域 = 本字典键联合）。 */
export type GreeterT = TranslateNS<'greeter'>
export interface GreeterDict {
  /** 侧边栏底部操作项的显示文本。 */
  'footer.label': string
  /** 问候开关的按钮文案。 */
  'footer.toggleOn': string
  'footer.toggleOff': string
  /** 输入区底部信息条的问候语（{title} 为会话标题占位）。 */
  'dock.greeting': string
  /** 信息条里的时钟前缀。 */
  'dock.clock': string
  /** 未命名会话的兜底标题。 */
  'dock.untitled': string
}

/**
 * 把本插件的命名空间并入 LocaleNamespaceMap，
 * 使 ctx.locale.register / bind 对 'greeter' 获得完整类型提示。
 * 命名空间的值类型是字典键的联合（与官方 common / settings.locale 一致）。
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    greeter: keyof GreeterDict
  }
}

export const dictionaries: Record<'zh' | 'en', GreeterDict> = {
  zh: {
    'footer.label': '问候插件',
    'footer.toggleOn': '显示问候',
    'footer.toggleOff': '隐藏问候',
    'dock.greeting': '你好，{title} 👋 来自 DSH Web 插件生态包。',
    'dock.clock': '本地时间',
    'dock.untitled': '未命名会话',
  },
  en: {
    'footer.label': 'Greeter',
    'footer.toggleOn': 'Show greeting',
    'footer.toggleOff': 'Hide greeting',
    'dock.greeting': 'Hello, {title} 👋 from the DSH Web plugin ecosystem.',
    'dock.clock': 'Local time',
    'dock.untitled': 'Untitled session',
  },
}
