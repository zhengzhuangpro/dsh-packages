/**
 * dsh-hotnews 的会话视图组件（conversation.view 座位）。
 *
 * 注册后成为会话主体里的一个视图页签（与 chat / 轨迹视图并列，
 * 由会话主体一次渲染一个），占用整个对话页面而非悬浮层。
 * 组件 props 由注册机制注入：owner props + 标准 prop `t`。
 */

import { useEffect, useState } from 'react'
import type { HotnewsT } from './i18n'
import { getState, refresh, setSource, subscribe } from './store'

/** conversation.view 的 owner props（inspect 握手，本视图无需处理）。 */
export interface HotnewsViewProps {
  /** 标准 prop：绑定到本条目 locale 命名空间的翻译函数。 */
  t: HotnewsT
}

export function HotnewsView({ t }: HotnewsViewProps) {
  const state = useNewsState()

  // 首次进入视图时自动加载（store 无 open 态，视图挂载即首次）
  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="dshn-view">
      <div className="dshn-view__toolbar">
        <span className="dshn-view__title">🔥 {t('view.label')}</span>
        <button type="button" className="dshn-btn" onClick={() => void refresh()} disabled={state.loading}>
          {t('panel.refresh')}
        </button>
        {state.updatedAt !== null ? (
          <span className="dshn-view__updatedAt">
            {t('panel.updatedAt')} {new Date(state.updatedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>

      {state.sources.length > 0 ? (
        <div className="dshn-sources">
          {state.sources.map((s) => (
            <button
              key={s.id}
              type="button"
              className={s.id === state.source ? 'dshn-chip dshn-chip--active' : 'dshn-chip'}
              onClick={() => setSource(s.id)}
              title={s.description}
            >
              {s.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="dshn-view__body">
        {state.loading ? <p className="dshn-hint">{t('panel.loading')}</p> : null}
        {!state.loading && state.error !== null ? (
          <p className="dshn-hint dshn-hint--error">{t('panel.error')}：{state.error}</p>
        ) : null}
        {!state.loading && state.error === null && state.items.length === 0 ? (
          <p className="dshn-hint">{t('panel.empty')}</p>
        ) : null}
        {state.items.map((item) => (
          <a
            key={`${item.rank}-${item.title}`}
            className={`dshn-item ${item.rank <= 3 ? 'dshn-item--top' : ''}`}
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className={`dshn-item__rank ${item.rank <= 3 ? 'dshn-item__rank--top' : ''}`}>
              {item.rank <= 3 ? getRankIcon(item.rank) : item.rank}
            </span>
            <span className="dshn-item__title">{item.title}</span>
            {item.hot ? <span className="dshn-item__hot">{item.hot}</span> : null}
          </a>
        ))}
      </div>
    </div>
  )
}

function getRankIcon(rank: number): string {
  switch (rank) {
    case 1: return '🥇'
    case 2: return '🥈'
    case 3: return '🥉'
    default: return String(rank)
  }
}

function useNewsState() {
  const [state, setState] = useState(getState)
  useEffect(() => subscribe(() => setState(getState())), [])
  return state
}
