/**
 * 样式注入辅助。
 *
 * 把插件 CSS 以 <style> 标签注入 document.head，并通过
 * `data-plugin-css` 标记去重——与官方 DSH 客户端插件的约定一致，
 * 多次激活/热更新不会产生重复样式。
 */

const injected = new Set<string>()

export function injectStyle(pluginId: string, css: string): void {
  if (typeof document === 'undefined') return
  const tagId = `${pluginId}/style.css`
  if (injected.has(tagId)) return
  if (document.querySelector(`style[data-plugin-css=${JSON.stringify(tagId)}]`) !== null) return
  const tag = document.createElement('style')
  tag.dataset.plugin = pluginId
  tag.dataset.pluginCss = tagId
  tag.textContent = css
  document.head.appendChild(tag)
  injected.add(tagId)
}
