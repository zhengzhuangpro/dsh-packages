/**
 * sample-greeter Host 侧入口（Node 半区）。
 *
 * DSH 客户端插件契约要求包根可被 Loader 以普通 Node 模块解析并挂载——
 * 官方插件做法完全一致（ui-jobs 注释原文）：
 *   "Pure UI plugin: the empty apply exists so the plugin appears in the
 *    host cordis.yml / Loader; the browser half ships via exports["./client"]"
 *
 * 本插件纯 UI，无 Host 侧行为；浏览器侧代码在 src/client.ts，
 * 通过 package.json 的 dsh.client 声明被发现。
 */

/** Host 插件主体——无 Host 侧行为。 */
export function apply(): void {}
