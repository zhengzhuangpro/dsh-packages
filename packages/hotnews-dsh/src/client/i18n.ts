/**
 * dsh-hotnews 客户端本地化字典。
 * 来源名称（百度/微博/抖音…）由 Host 端 sources 元数据提供，无需翻译。
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

export interface HotnewsDict {
  /** 会话视图页签文本（conversation.view 的 label 投影）。 */
  'view.label': string
  'panel.refresh': string
  'panel.loading': string
  'panel.error': string
  'panel.empty': string
  /** 列表刷新时间前缀。 */
  'panel.updatedAt': string
}

/** 绑定到 dsh-hotnews 命名空间的翻译函数类型。 */
export type HotnewsT = TranslateNS<'dsh-hotnews'>

export const dictionaries: Record<'zh' | 'en', HotnewsDict> = {
  zh: {
    'view.label': '热榜',
    'panel.refresh': '刷新',
    'panel.loading': '加载中…',
    'panel.error': '获取失败',
    'panel.empty': '暂无数据',
    'panel.updatedAt': '更新于',
  },
  en: {
    'view.label': 'Hot News',
    'panel.refresh': 'Refresh',
    'panel.loading': 'Loading…',
    'panel.error': 'Failed to load',
    'panel.empty': 'No data',
    'panel.updatedAt': 'Updated at',
  },
}

/**
 * 把命名空间并入 LocaleNamespaceMap（值为字典键联合），
 * 使 register / bind 获得完整类型提示。
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'dsh-hotnews': keyof HotnewsDict
  }
}
