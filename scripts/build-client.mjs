#!/usr/bin/env node
/**
 * build-client.mjs — DSH Web 客户端插件构建脚本
 *
 * 把 packages/* 下每个插件的 `src/client.(ts|tsx|js|mjs)` 打包成 DSH Web
 * 运行时可加载的模块格式：
 *
 *   window.__ModuleLoader__.load({
 *     id: "<package name>",
 *     factory: (require) => {
 *       var module = { exports: {} };
 *       var exports = module.exports;
 *       Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
 *       ...打包后的代码...
 *       return module.exports;
 *     }
 *   });
 *
 * 产物写到 package.json 中 `exports["./client"]` 指向的文件（通常 lib/client.js）。
 * 构建契约要点：
 *   - 依赖（react、@deepseek-ai/*、dsh.client.inject 列表）保持 external，
 *     运行时由 DSH 的模块加载器通过 factory 的 require 解析。
 *   - 插件入口只需导出 `inject`（cordis 服务名数组）与 `apply(ctx)`。
 *   - CSS 采用约定：`import css from './x.css'` 会把文件内容内联为字符串导出，
 *     配合 style.ts 中的 injectStyle() 注入 <style>（带 data-plugin-css 去重）。
 *
 * 用法：
 *   node scripts/build-client.mjs                 # 构建所有插件
 *   node scripts/build-client.mjs sample-greeter  # 构建单个插件
 *   node scripts/build-client.mjs --watch         # 监听 src/ 变化自动重建
 */

import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, watch } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGES_DIR = join(ROOT, 'packages')

// 默认 external：react 家族（字符串形式，JS API 支持）；@deepseek-ai/* 用
// onResolve 插件标记 external（JS API 的 external 不支持正则）。
const DEFAULT_EXTERNAL = [
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
  'react-dom/client',
]

/** 把所有 @deepseek-ai/* 导入标记为 external（运行时由模块加载器解析）。 */
const DSH_EXTERNAL = {
  name: 'dsh-external',
  setup(ctx) {
    ctx.onResolve({ filter: /^@deepseek-ai\// }, (args) => ({
      path: args.path,
      external: true,
    }))
  },
}

const CSS_LOADER = {
  name: 'dsh-css-inline',
  setup(ctx) {
    ctx.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = readFileSync(args.path, 'utf8')
      return {
        loader: 'js',
        contents: `export default ${JSON.stringify(css)}`,
      }
    })
  },
}

/** 列出待构建的插件目录（packages/* 下含 package.json 的目录）。 */
function listPackageDirs() {
  if (!existsSync(PACKAGES_DIR)) return []
  return readdirSync(PACKAGES_DIR)
    .map((name) => join(PACKAGES_DIR, name))
    .filter((dir) => statSync(dir).isDirectory() && existsSync(join(dir, 'package.json')))
}

/** 读取插件声明，校验是否为 DSH web 客户端插件。 */
function readManifest(pkgDir) {
  const pkgPath = join(pkgDir, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const clientDecl = pkg.dsh?.client
  if (!clientDecl) {
    console.warn(`  ! ${pkg.name ?? relative(ROOT, pkgDir)}: 未声明 dsh.client，跳过`)
    return null
  }
  if (clientDecl.platform !== 'web') {
    console.warn(`  ! ${pkg.name}: dsh.client.platform 必须是 "web"，跳过`)
    return null
  }
  const clientRel = typeof pkg.exports?.['./client'] === 'string'
    ? pkg.exports['./client']
    : pkg.exports?.['./client']?.default
  if (!clientRel) {
    throw new Error(`${pkg.name}: 声明了 dsh.client 但 exports["./client"] 缺失（应为字符串或 { default }）`)
  }
  const entryCandidates = ['src/client/index.ts', 'src/client/index.tsx', 'src/client.ts', 'src/client.tsx', 'src/client.js', 'src/client.mjs']
  const entry = entryCandidates.find((rel) => existsSync(join(pkgDir, rel)))
  if (!entry) {
    throw new Error(`${pkg.name}: 找不到入口（期望 ${entryCandidates.join(' / ')}）`)
  }
  const hostEntryCandidates = ['src/index.ts', 'src/index.tsx', 'src/index.js', 'src/index.mjs']
  const hostEntry = hostEntryCandidates.find((rel) => existsSync(join(pkgDir, rel)))
  const mainRel = typeof pkg.main === 'string' ? pkg.main : null
  // invariant 伴生模块（官方约定：每个包都从 ./invariant 注册检查）
  const invariantCandidates = ['src/invariant.ts', 'src/invariant.tsx', 'src/invariant.js', 'src/invariant.mjs']
  const invariantEntry = invariantCandidates.find((rel) => existsSync(join(pkgDir, rel)))
  const invariantRel = typeof pkg.exports?.['./invariant'] === 'string'
    ? pkg.exports['./invariant']
    : pkg.exports?.['./invariant']?.default
  return {
    name: pkg.name,
    pkgDir,
    entry,
    outFile: join(pkgDir, clientRel),
    hostEntry,
    hostOutFile: hostEntry ? join(pkgDir, mainRel ?? 'lib/index.js') : null,
    invariantEntry,
    invariantOutFile: invariantEntry ? join(pkgDir, invariantRel ?? 'lib/invariant.js') : null,
    inject: clientDecl.inject ?? [],
    external: clientDecl.external ?? [],
  }
}

/** esbuild 打包 + 包装成 __ModuleLoader__ 格式，写出 client 产物。 */
async function buildClient(manifest) {
  const result = await build({
    entryPoints: [join(manifest.pkgDir, manifest.entry)],
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    write: false,
    logLevel: 'silent',
    plugins: [CSS_LOADER, DSH_EXTERNAL],
    external: [...DEFAULT_EXTERNAL, ...manifest.inject, ...manifest.external],
  })

  const code = result.outputFiles[0].text
  const wrapped = [
    `window.__ModuleLoader__.load({`,
    `\tid: ${JSON.stringify(manifest.name)},`,
    `\tfactory: (require) => {`,
    `\t\tvar module = { exports: {} };`,
    `\t\tvar exports = module.exports;`,
    `\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });`,
    code
      .split('\n')
      .map((line) => `\t\t${line}`)
      .join('\n'),
    `\t\treturn module.exports;`,
    `\t}`,
    `});`,
    '',
  ].join('\n')

  mkdirSync(dirname(manifest.outFile), { recursive: true })
  writeFileSync(manifest.outFile, wrapped)
  return wrapped.length
}

/**
 * 打包 Host 侧空入口（src/index.ts → lib/index.js）。
 * DSH 客户端插件的契约：包根必须可被 Loader 以普通 Node 模块解析并挂载
 * （官方插件都在 host 侧放一个空 apply——"the empty apply exists so the
 * plugin appears in the host cordis.yml / Loader"）。缺少它，loader 条目
 * 挂载失败，dsh-client-modules 会将该插件从客户端模块图剔除。
 */
async function buildHost(manifest) {
  if (!manifest.hostEntry) {
    console.warn(`  ! ${manifest.name}: 缺少 Host 侧入口 src/index.ts（Loader 无法挂载条目，插件不会加载）`)
    return null
  }
  const result = await build({
    entryPoints: [join(manifest.pkgDir, manifest.hostEntry)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    write: false,
    logLevel: 'silent',
    plugins: [DSH_EXTERNAL],
  })
  mkdirSync(dirname(manifest.hostOutFile), { recursive: true })
  writeFileSync(manifest.hostOutFile, result.outputFiles[0].text)
  return result.outputFiles[0].text.length
}

/**
 * 打包 invariant 伴生模块（src/invariant.ts → lib/invariant.js）。
 * 官方约定：每个包都从 `./invariant` 导出伴生插件，向 invariants 服务
 * 注册本包的检查（无检查时 installer 为空）。
 */
async function buildInvariant(manifest) {
  if (!manifest.invariantEntry) return null
  const result = await build({
    entryPoints: [join(manifest.pkgDir, manifest.invariantEntry)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    write: false,
    logLevel: 'silent',
    plugins: [DSH_EXTERNAL],
  })
  mkdirSync(dirname(manifest.invariantOutFile), { recursive: true })
  writeFileSync(manifest.invariantOutFile, result.outputFiles[0].text)
  return result.outputFiles[0].text.length
}

async function buildAll(names, { watchMode = false } = {}) {
  const manifests = listPackageDirs()
    .map(readManifest)
    .filter(Boolean)
    .filter((m) => names.length === 0 || names.includes(m.name) || names.includes(relative(PACKAGES_DIR, m.pkgDir)))

  if (manifests.length === 0) {
    console.warn('没有匹配的插件需要构建。')
    return
  }

  for (const manifest of manifests) {
    const clientBytes = await buildClient(manifest)
    console.log(`  ✓ ${manifest.name} client → ${relative(ROOT, manifest.outFile)} (${(clientBytes / 1024).toFixed(1)} KiB)`)
    const hostBytes = await buildHost(manifest)
    if (hostBytes !== null) {
      console.log(`  ✓ ${manifest.name} host   → ${relative(ROOT, manifest.hostOutFile)} (${(hostBytes / 1024).toFixed(1)} KiB)`)
    }
    const invariantBytes = await buildInvariant(manifest)
    if (invariantBytes !== null) {
      console.log(`  ✓ ${manifest.name} invar. → ${relative(ROOT, manifest.invariantOutFile)} (${(invariantBytes / 1024).toFixed(1)} KiB)`)
    }
  }

  if (watchMode) {
    console.log('\n监听 src/ 变化中…（Ctrl-C 退出）')
    const timers = new Map()
    for (const manifest of manifests) {
      const srcDir = join(manifest.pkgDir, 'src')
      if (!existsSync(srcDir)) continue
      watch(srcDir, { recursive: true }, (event, filename) => {
        if (filename == null || filename.endsWith('.css') === false && !/\.(ts|tsx|js|mjs)$/.test(filename)) return
        clearTimeout(timers.get(manifest.name))
        timers.set(
          manifest.name,
          setTimeout(async () => {
            try {
              const clientBytes = await buildClient(manifest)
              console.log(`  ↻ ${manifest.name} client → ${relative(ROOT, manifest.outFile)} (${(clientBytes / 1024).toFixed(1)} KiB)`)
              const hostBytes = await buildHost(manifest)
              if (hostBytes !== null) {
                console.log(`  ↻ ${manifest.name} host   → ${relative(ROOT, manifest.hostOutFile)} (${(hostBytes / 1024).toFixed(1)} KiB)`)
              }
              const invariantBytes = await buildInvariant(manifest)
              if (invariantBytes !== null) {
                console.log(`  ↻ ${manifest.name} invar. → ${relative(ROOT, manifest.invariantOutFile)} (${(invariantBytes / 1024).toFixed(1)} KiB)`)
              }
            } catch (error) {
              console.error(`  ✗ ${manifest.name} 构建失败:\n${error.message}`)
            }
          }, 120),
        )
      })
    }
    await new Promise(() => {}) // 常驻
  }
}

const args = process.argv.slice(2)
const watchMode = args.includes('--watch')
const names = args.filter((arg) => !arg.startsWith('--'))

console.log('DSH Web 插件构建')
buildAll(names, { watchMode }).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
