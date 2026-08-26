/**
 * CSS 模块声明：构建脚本把 `import css from './x.css'` 内联为字符串。
 */
declare module '*.css' {
  const css: string
  export default css
}
