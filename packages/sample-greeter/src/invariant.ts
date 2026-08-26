/**
 * 包的 invariant 伴生模块（官方约定：每个包都从 `./invariant` 注册检查）。
 *
 * 本插件无运行时 invariant（Slot 注册与字典均为注册表所有、由 HMR 安全规范
 * 证明其回收，不发事件、无跨插件可变状态），因此 installer 为空。
 * 注册本身让 invariants 服务"保留"本包的包名所有权。
 */

import type { Context } from '@deepseek-ai/cordis'
// 装载 dsh-invariants 对 Context 的增强（ctx.invariants）
import type {} from '@deepseek-ai/dsh-invariants'

/** 完整 npm 包名，invariants 服务按此保留所有权。 */
const PACKAGE_NAME = '@zhengzhuangpro/dsh-sample-greeter'

/** Cordis companion 插件名。 */
export const name = 'sample-greeter-invariant'

/** 注册前需要服务。 */
export const inject = ['invariants']

/** 无运行时 invariant 检查。 */
const install = () => {}

/**
 * 注册本包的 invariant companion。
 * @param ctx - 携带 invariants 服务的 Cordis 上下文。
 * @returns 注册完成后安装的 disposer。
 */
export const apply = (ctx: Context) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
