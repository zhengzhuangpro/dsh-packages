/**
 * 样式注入辅助：以 <style> 注入 document.head，data-plugin-css 去重。
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
