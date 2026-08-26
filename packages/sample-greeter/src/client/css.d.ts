/**
 * CSS 模块声明：构建脚本会把 `import css from './x.css'` 内联为字符串，
 * 这里为 TypeScript 提供对应类型（构建时无需真实 CSS 模块工具链）。
 */
declare module '*.css' {
  const css: string
  export default css
}
