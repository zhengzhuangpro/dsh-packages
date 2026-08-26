/**
 * dsh-hotnews 客户端共享状态（当前来源、列表数据）。
 *
 * 模块级 store + 订阅；插件卸载时由 client/index.ts 的 ctx.effect 复位。
 * 数据从同源 Host 路由 /hotnews/api 拉取（Host 半区注册）。
 */

export interface NewsSourceView {
  id: string
  name: string
  description: string
}

export interface NewsItemView {
  title: string
  url: string
  hot?: string
  rank: number
}

export interface NewsState {
  source: string
  items: NewsItemView[]
  sources: NewsSourceView[]
  loading: boolean
  error: string | null
  updatedAt: string | null
}

const INITIAL: NewsState = {
  source: 'weibo',
  items: [],
  sources: [],
  loading: false,
  error: null,
  updatedAt: null,
}

let state: NewsState = INITIAL
const listeners = new Set<() => void>()

function emit(): void {
  for (const fn of listeners) fn()
}

export function getState(): NewsState {
  return state
}

/** 订阅状态变化，返回退订函数。 */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function setSource(id: string): void {
  if (state.source === id) return
  state = { ...state, source: id }
  emit()
  void refresh()
}

/** 拉取来源目录（仅首次）。 */
async function ensureSources(): Promise<void> {
  if (state.sources.length > 0) return
  try {
    const res = await fetch('/hotnews/api/sources')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { sources: NewsSourceView[] }
    state = { ...state, sources: data.sources ?? [] }
    emit()
  } catch {
    // 静默：目录拉取失败不阻塞列表
  }
}

export async function refresh(): Promise<void> {
  state = { ...state, loading: true, error: null }
  emit()
  await ensureSources()
  try {
    const res = await fetch(`/hotnews/api/list?source=${encodeURIComponent(state.source)}&limit=20`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { items: NewsItemView[]; updatedAt: string }
    state = { ...state, loading: false, items: data.items ?? [], updatedAt: data.updatedAt ?? null }
    emit()
  } catch (error) {
    state = { ...state, loading: false, error: error instanceof Error ? error.message : String(error) }
    emit()
  }
}

/** 插件卸载时复位。 */
export function resetNewsState(): void {
  state = INITIAL
  emit()
}
