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

/** 缓存每个 source 的数据 */
const cache = new Map<string, { items: NewsItemView[]; updatedAt: string }>()

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
  // 切换时使用缓存，如果没有缓存则获取
  void loadSource(id, false)
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

/** 加载指定 source 的数据，force=true 时强制刷新 */
async function loadSource(sourceId: string, force: boolean): Promise<void> {
  // 检查缓存
  if (!force) {
    const cached = cache.get(sourceId)
    if (cached) {
      state = { ...state, items: cached.items, updatedAt: cached.updatedAt, loading: false, error: null }
      emit()
      return
    }
  }

  state = { ...state, loading: true, error: null }
  emit()
  await ensureSources()

  try {
    const res = await fetch(`/hotnews/api/list?source=${encodeURIComponent(sourceId)}&limit=20`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { items: NewsItemView[]; updatedAt: string }
    const items = data.items ?? []
    const updatedAt = data.updatedAt ?? null

    // 更新缓存
    cache.set(sourceId, { items, updatedAt: updatedAt ?? '' })

    state = { ...state, loading: false, items, updatedAt }
    emit()
  } catch (error) {
    state = { ...state, loading: false, error: error instanceof Error ? error.message : String(error) }
    emit()
  }
}

/** 刷新当前 source（点击刷新按钮时调用） */
export async function refresh(): Promise<void> {
  await loadSource(state.source, true)
}

/** 插件卸载时复位。 */
export function resetNewsState(): void {
  state = INITIAL
  cache.clear()
  emit()
}
