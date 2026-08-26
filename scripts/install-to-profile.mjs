#!/usr/bin/env node
/**
 * install-to-profile.mjs — 把生态包插件安装到指定的 DSH profile
 *
 * 用法（profile 可省略，默认 web）：
 *   node scripts/install-to-profile.mjs [profile] <spec...> [--fix-workspace]
 *   pnpm install:profile sample-greeter            # 等价于 web sample-greeter
 *
 *   <profile>          DSH profile 名（默认 web），目录为 $DSH_HOME/profiles/<profile>
 *   <spec>             npm 包名/版本说明符，或本仓库 packages/ 下的插件目录名
 *                      （本地插件自动转换为 file: 绝对路径说明符）
 *   --fix-workspace    自动修复 profile 里无法解析的 workspace: 依赖
 *                      （如 @deepseek-ai/dsh-client-ui-snake: "workspace:^"），
 *                      这些残留依赖会让 pnpm add 直接失败（
 *                      ERR_PNPM_WORKSPACE_PKG_NOT_FOUND）。修复前会备份
 *                      package.json 与 cordis.patch.yml 为 .bak。
 *
 * 示例：
 *   pnpm install:profile sample-greeter
 *   pnpm install:profile web sample-greeter --fix-workspace
 *   pnpm install:profile web @zhengzhuangpro/dsh-sample-greeter@0.1.0
 *
 * 加载机制（重要）：
 *   1. 包必须装进 profile（pnpm 管理 $DSH_HOME/profiles/<profile>/node_modules）
 *   2. 客户端插件还需要一条 browser-roster loader 条目——本脚本会在安装成功后
 *      自动向 profile 的 cordis.patch.yml 追加（幂等，insert: 块；注意裸行
 *      `- id: … / name: …` 会被引导代码当作覆盖已有条目而静默跳过）：
 *        - insert:
 *            - id: <slug>
 *              name: "<包名>"
 *      这与官方 dsh-web-app bundle 里每个 dsh.client 插件一行的做法一致，
 *      dsh-client-modules 只扫描 loader 条目。
 *   3. 重启生效：dsh --profile <profile>（或 npx @deepseek-ai/dsh@latest web）
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync, renameSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES_DIR = join(REPO_ROOT, 'packages')

const args = process.argv.slice(2)
const fixWorkspace = args.includes('--fix-workspace')
const positional = args.filter((arg) => !arg.startsWith('--'))

// 第一个位置参数是已知 profile 时作为 profile；否则默认 web，全部视为插件说明符。
// 因此 `install:profile sample-greeter` 等价于 `install:profile web sample-greeter`。
const knownProfiles = listProfiles()
let profile = 'web'
let specs = positional
if (positional.length > 0 && knownProfiles.includes(positional[0])) {
  profile = positional[0]
  specs = positional.slice(1)
}

if (specs.length === 0) {
  console.error('用法: node scripts/install-to-profile.mjs [profile] <spec...> [--fix-workspace]')
  console.error('示例:')
  console.error('  pnpm install:profile sample-greeter              # 安装到 web profile')
  console.error('  pnpm install:profile web sample-greeter --fix-workspace')
  process.exit(2)
}

const profileDir = join(DSH_HOME, 'profiles', profile)
const patchFile = join(profileDir, 'cordis.patch.yml')
const pkgFile = join(profileDir, 'package.json')
if (!existsSync(pkgFile)) {
  console.error(`✗ 找不到 profile "${profile}"（期望 ${profileDir}/package.json）。`)
  console.error('  可用 profile: ' + listProfiles().join(', ') + '（或先用 dsh --profile <name> 初始化）')
  process.exit(1)
}

/** 扫描 profile package.json 里无法解析的 workspace: 依赖。 */
function unresolvableWorkspaceDeps() {
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  return Object.entries(deps).filter(([, spec]) => String(spec).startsWith('workspace:'))
}

/**
 * 从 cordis.patch.yml 移除指向指定包名的 roster 条目（兼容两种格式：
 * 裸行 `- id: x / name: y` 与 `- insert:` 块），保留注释与其他内容。
 * 块级解析：只重组顶层条目（顶格的 `- ...` 行 + 其后缩进行），
 * 未触碰的内容按原字节保留，绝不整体重排/重写 YAML。
 */
function removeRosterRows(names) {
  if (!existsSync(patchFile)) return
  const { head, blocks } = parsePatchBlocks(readFileSync(patchFile, 'utf8'))
  const kept = []
  for (const block of blocks) {
    if (isInsertBlock(block)) {
      // 块内子条目：按 `- id:` 行切分，移除名字命中者与无名字的孤儿条目
      const subs = splitInsertEntries(block.body)
      const keptSubs = []
      let removedAny = false
      for (const sub of subs) {
        const name = entryNameOf(sub)
        if (name === null && sub.length > 0) continue // 无名字 → 视为孤儿，丢弃
        if (name !== null && names.has(name)) {
          removedAny = true
          continue
        }
        keptSubs.push(...sub)
      }
      if (keptSubs.length > 0) {
        kept.push(block.top)
        kept.push(...keptSubs)
      }
      // 空 insert 块（或全部子条目被移除）→ 整个块丢弃
      void removedAny
    } else {
      // 裸行条目：名字在首行之后的缩进行里
      const name = entryNameOf(block.body)
      if (name === null || !names.has(name)) {
        kept.push(block.top)
        kept.push(...block.body)
      }
    }
  }
  writeFileSync(patchFile, [...head, ...kept].join('\n'))
}

/** 解析 patch 文件为「头部注释/空行 + 顶层条目块」。 */
function parsePatchBlocks(content) {
  const lines = content.split('\n')
  const head = []
  const blocks = []
  let current = null
  for (const line of lines) {
    const isTopLevelEntry = line.startsWith('-') && !/^\s/.test(line)
    if (isTopLevelEntry) {
      if (current) blocks.push(current)
      current = { top: line, body: [] }
    } else if (current) {
      current.body.push(line)
    } else {
      head.push(line)
    }
  }
  if (current) blocks.push(current)
  return { head, blocks }
}

/** 是否为 `- insert:` 顶层块。 */
function isInsertBlock(block) {
  return /^-\s*insert\s*:/.test(block.top)
}

/** 在 insert 块体内按 `- id:` 行切分为若干子条目。 */
function splitInsertEntries(body) {
  const subs = []
  let current = null
  for (const line of body) {
    if (/^\s+- id:/.test(line)) {
      if (current) subs.push(current)
      current = [line]
    } else if (current) {
      current.push(line)
    }
  }
  if (current) subs.push(current)
  return subs
}

/** 取条目（裸行 body 或 insert 子条目）里的第一个 name 值。 */
function entryNameOf(lines) {
  for (const line of lines) {
    const m = /^\s*name:\s*["']?([^"'\s]+)/.exec(line)
    if (m) return m[1]
  }
  return null
}

/** 追加（或替换）一条 browser-roster loader 条目——必须用 `insert:` 块。
 *  注意：裸行 `- id: x / name: y` 会被引导代码当作"覆盖已有条目"处理并静默跳过
 *  （applyEntryPatches: patch: entry "x" not found），所以新条目必须走 insert。 */
function appendRosterRow(pkgName) {
  const slug = pkgName.replace(/^@[^/]+\//, '').replace(/[^a-z0-9-]/gi, '-')
  // 先移除旧条目（含旧格式裸行与历史 bug 留下的孤儿块），保证幂等
  removeRosterRows(new Set([pkgName]))
  const content = existsSync(patchFile) ? readFileSync(patchFile, 'utf8') : ''
  if (content.includes(`name: "${pkgName}"`)) {
    console.log(`  ✓ roster 条目已存在（${pkgName}），跳过追加`)
    return
  }
  const block = `- insert:\n    - id: ${slug}\n      name: "${pkgName}"`
  const sep = content.trim() === '' ? '' : content.endsWith('\n') ? '' : '\n'
  const trailing = content.endsWith('\n') ? '' : '\n'
  writeFileSync(patchFile, `${content}${sep}${block}${trailing}\n`)
  console.log(`  ✓ 已向 ${patchFile} 追加 roster 条目（insert 块）: ${pkgName}`)
}

/** 从 npm 说明符中提取包名（@scope/name@version → @scope/name）。 */
function packageNameOf(spec) {
  if (spec.startsWith('@')) {
    const at = spec.lastIndexOf('@')
    if (at > 0) return spec.slice(0, at)
    return spec
  }
  const at = spec.indexOf('@')
  return at > 0 ? spec.slice(0, at) : spec
}

/** 本地 packages/ 下的目录名 → { name, spec }；npm 说明符原样透传。 */
function resolveSpecs(specs) {
  return specs.map((spec) => {
    const localDir = join(PACKAGES_DIR, spec)
    if (existsSync(join(localDir, 'package.json'))) {
      const name = JSON.parse(readFileSync(join(localDir, 'package.json'), 'utf8')).name
      return { name, spec: `file:${localDir}`, localDir }
    }
    return { name: packageNameOf(spec), spec, localDir: null }
  })
}

const resolvedSpecs = resolveSpecs(specs)
console.log(`profile: ${profileDir}`)
console.log(`安装: ${resolvedSpecs.map((r) => r.spec).join(' ')}`)

// ── 处理 workspace: 残留依赖 ──────────────────────────────────────────────
const broken = unresolvableWorkspaceDeps()
if (broken.length > 0) {
  console.warn(`\n⚠ 检测到 ${broken.length} 个无法解析的 workspace: 依赖（会阻塞 pnpm 安装）：`)
  for (const [name, spec] of broken) console.warn(`    ${name}: "${spec}"`)
  if (!fixWorkspace) {
    console.error('\n✗ 安装中止。请二选一：')
    console.error('  1) 手动从 profile 的 package.json 删除上述依赖（同时删除 cordis.patch.yml 里对应的 roster 行），再重试')
    console.error('  2) 加上 --fix-workspace 自动处理（会先备份 package.json 与 cordis.patch.yml）')
    process.exit(1)
  }
  // 先复制备份，再在活文件上修改（保留注释等其余内容）
  writeFileSync(`${pkgFile}.bak`, readFileSync(pkgFile))
  if (existsSync(patchFile)) writeFileSync(`${patchFile}.bak`, readFileSync(patchFile))
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
  for (const [name] of broken) {
    delete pkg.dependencies?.[name]
    delete pkg.devDependencies?.[name]
  }
  writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n')
  removeRosterRows(new Set(broken.map(([name]) => name)))
  console.log('  ✓ 已备份并清理（package.json.bak / cordis.patch.yml.bak）')
}

// ── pnpm 安装 ──────────────────────────────────────────────────────────────
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const profilePkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
const profileDeps = { ...(profilePkg.dependencies ?? {}), ...(profilePkg.devDependencies ?? {}) }
/** 本次运行是否创建了备份（只有它才能被恢复逻辑使用，避免误用旧 .bak）。 */
let backedUpThisRun = broken.length > 0
try {
  // file: 依赖是安装时的快照拷贝（pnpm 对相同 spec 不会重新打包），
  // 所以对本地包先 remove 再 add，强制刷新为新构建。
  for (const { name } of resolvedSpecs) {
    if (profileDeps[name]) {
      execSync(`${pnpm} remove "${name}"`, { cwd: profileDir, stdio: 'inherit' })
      console.log(`  ↻ 已移除旧拷贝 ${name}，重新安装…`)
    }
  }
  execSync(`${pnpm} add ${resolvedSpecs.map((r) => `"${r.spec}"`).join(' ')}`, {
    cwd: profileDir,
    stdio: 'inherit',
  })
} catch (error) {
  console.error('\n✗ pnpm add 失败（详见上方输出）。')
  if (backedUpThisRun) {
    if (existsSync(`${pkgFile}.bak`)) renameSync(`${pkgFile}.bak`, pkgFile)
    if (existsSync(`${patchFile}.bak`)) renameSync(`${patchFile}.bak`, patchFile)
    console.error('  已还原备份（--fix-workspace 的修改未保留）。')
  }
  process.exit(1)
}

// ── roster 条目（insert 块格式）────────────────────────────────────────────
for (const { name, localDir } of resolvedSpecs) {
  const pkg = localDir
    ? JSON.parse(readFileSync(join(localDir, 'package.json'), 'utf8'))
    : null
  if (pkg?.dsh?.client) {
    appendRosterRow(pkg.name)
  } else if (pkg?.dsh?.bundle?.patch || (localDir && existsSync(join(localDir, 'cordis.patch.yml')))) {
    console.warn(`  ⚠ ${pkg.name} 是 Host 侧 bundle：请自行把其 patch 挂载进 profile 的组合树。`)
  } else if (!localDir) {
    // npm 说明符：若该包声明了 dsh.client 则同样需要 roster 行
    console.log(`  · ${name}: 已安装（发布包请确认其 dsh.client 声明，必要时手动补 roster 行）`)
  }
}

console.log(`\n✓ 安装完成。重启生效：dsh --profile ${profile}`)
console.log('  注意：file: 安装是快照拷贝——改完插件源码后请重新构建（pnpm build）')
console.log('  并重跑本脚本（会自动 remove+add 刷新），再重启生效。')

function listProfiles() {
  const dir = join(DSH_HOME, 'profiles')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
}
