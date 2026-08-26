/**
 * 示例插件内部的轻量共享状态（问候条显隐）。
 *
 * 注意：这是模块级状态，插件被卸载/热更新时不会自动清除，
 * 因此 client.ts 的 apply 中用 ctx.effect 注册了复位清理。
 */

type Listener = () => void

let visible = true
const listeners = new Set<Listener>()

export function isGreetingVisible(): boolean {
  return visible
}

export function setGreetingVisible(next: boolean): void {
  if (next === visible) return
  visible = next
  for (const fn of listeners) fn()
}

/** 订阅状态变化，返回退订函数（可直接作为 useEffect 的清理函数）。 */
export function subscribeGreetingVisible(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 插件卸载时复位，避免残留状态影响下一次激活。 */
export function resetGreetingState(): void {
  visible = true
  for (const fn of listeners) fn()
}
