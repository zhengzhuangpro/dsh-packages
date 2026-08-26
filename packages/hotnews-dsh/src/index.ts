/**
 * dsh-hotnews Host 半区（Node 侧）。
 *
 * 职责：注册一个 webServer 前缀路由 `/hotnews/api`，供浏览器侧的客户端插件
 * 同源 fetch 热门新闻。抓取逻辑复用 hotnews（npm 库，>= 0.1.7-beta.0）的
 * fetchNews / sources API，构建时由 esbuild 打进 lib/index.js，产物自包含。
 *
 * 路由：
 *   GET /hotnews/api/sources                → 全部来源目录
 *   GET /hotnews/api/list?source=weibo&limit=10 → 某来源的热门列表
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
// 装载 dsh-host-webserver 对 Context 的增强（ctx.webServer）
import type {} from '@deepseek-ai/dsh-host-webserver'
// hotnews npm 库（github.com/zhengzhuangpro/hotnews），构建时打包进产物
import { fetchNews, sources } from 'hotnews'

/** 声明 inject 让 Cordis 等待 webServer 服务就绪后再调用 apply。 */
export const inject = ['webServer']

export function apply(ctx: Context) {
  // 路由随 fiber 卸载自动移除
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/hotnews/api',
    handler: handleRequest,
  }), 'dsh-hotnews: api route')
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const route = url.pathname.replace(/^\/hotnews\/api\/?/, '')
  try {
    if (route === 'sources' || route === '') {
      respond(res, 200, {
        sources: sources.map(({ id, name, description }) => ({ id, name, description })),
      })
      return
    }
    if (route === 'list') {
      const sourceId = url.searchParams.get('source') ?? 'weibo'
      const limit = clampLimit(url.searchParams.get('limit'))
      try {
        // fetchNews：未知源 id 会抛出含全部可用 id 的 Error
        const items = await fetchNews(sourceId, { limit })
        respond(res, 200, {
          source: sourceId,
          name: sources.find((s) => s.id === sourceId)?.name ?? sourceId,
          updatedAt: new Date().toISOString(),
          items,
        })
      } catch (error) {
        // 区分"未知源"与"网络/解析失败"
        const message = error instanceof Error ? error.message : String(error)
        if (message.includes('unknown source') || /available/i.test(message)) {
          respond(res, 404, { error: message, available: sources.map((s) => s.id) })
        } else {
          respond(res, 500, { error: message })
        }
      }
      return
    }
    respond(res, 404, { error: `unknown route: ${route}` })
  } catch (error) {
    respond(res, 500, {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

function clampLimit(raw: string | null): number {
  const n = Number(raw ?? 10)
  if (!Number.isFinite(n)) return 10
  return Math.max(1, Math.min(50, Math.floor(n)))
}

function respond(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(body))
}
