/**
 * 示例插件的两个 Slot 组件。
 *
 * 组件 props 由注册机制注入：
 *   - owner props：Slot 声明方提供的运行数据（sidebar.footer.action → { wide }；
 *     conversation.composer.dock → { session, input }）
 *   - 标准 props：注册 spec 中 `locale` 字段绑定的翻译函数 `t`（以及其他标准 hooks）
 *
 * 这里只声明我们实际消费的字段；多余字段由调用方传入，结构类型天然兼容。
 */

import { useEffect, useState } from 'react'
import type { GreeterT } from './i18n'
import {
  isGreetingVisible,
  setGreetingVisible,
  subscribeGreetingVisible,
} from './store'

/** sidebar.footer.action 的 owner props（见 Slot 目录）。 */
export interface GreeterFooterActionProps {
  /** 侧边栏是否处于展开状态（false = 56px 窄栏 rail）。 */
  wide: boolean
  /** 标准 prop：绑定到本条目 locale 命名空间的翻译函数。 */
  t: GreeterT
}

export function GreeterFooterAction({ wide, t }: GreeterFooterActionProps) {
  const visible = useGreetingVisible()
  return (
    <button
      type="button"
      className={wide ? 'dshg-footer-action' : 'dshg-footer-action dshg-footer-action--rail'}
      title={t(visible ? 'footer.toggleOff' : 'footer.toggleOn')}
      onClick={() => setGreetingVisible(!visible)}
    >
      <span className="dshg-footer-action__icon" aria-hidden="true">👋</span>
      {wide ? <span className="dshg-footer-action__label">{t('footer.label')}</span> : null}
    </button>
  )
}

/** conversation.composer.dock 的 owner props 子集（完整为 InputZone）。 */
export interface GreeterDockProps {
  session: {
    sessionId: string
  }
  /** 标准 prop：绑定到本条目 locale 命名空间的翻译函数。 */
  t: GreeterT
}

export function GreeterDock({ session, t }: GreeterDockProps) {
  const visible = useGreetingVisible()
  const now = useClock(1000)
  if (!visible) return null
  const title = session.sessionId || t('dock.untitled')
  return (
    <div className="dshg-dock">
      <span className="dshg-dock__greeting">{t('dock.greeting', { title })}</span>
      <span className="dshg-dock__clock">{t('dock.clock')} · {now}</span>
    </div>
  )
}

function useGreetingVisible(): boolean {
  const [visible, setVisible] = useState(isGreetingVisible)
  useEffect(() => subscribeGreetingVisible(() => setVisible(isGreetingVisible())), [])
  return visible
}

function useClock(intervalMs: number): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now.toLocaleTimeString()
}
