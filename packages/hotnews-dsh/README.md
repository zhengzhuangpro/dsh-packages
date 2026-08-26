# @zhengzhuangpro/dsh-hotnews

在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 里看热搜 📰

百度 / 微博 / 抖音 / 虎扑 / 知乎 / 掘金 / 36氪 / GitHub —— 一个页签搞定。

## 效果

装完重启，在会话页面顶部切换到 🔥**热榜**页签（和 Chat 并列），就是完整的热榜页面：

- 顶部来源切换芯片（点击切换平台）
- 刷新按钮 + 更新时间
- 热门列表（标题 / 热度 / 点击跳转原文）
- 自动跟随亮色 / 暗色主题，中文 / 英文跟随界面语言

## 安装

**方式一（推荐）：在 DSH 聊天里直接说**

打开 DeepSeek Harness Web 界面，对 AI 说：

> 你帮我安装一下 dsh plugin --profile web add @zhengzhuangpro/dsh-hotnews

AI 会自动执行安装并补充必要的配置条目，重启即生效。

**方式二：终端一键搞定**

装包 + 追加配置条目，一条命令复制粘贴即可：

```bash
npx dsh plugin --profile web add @zhengzhuangpro/dsh-hotnews \
  && cat << 'EOF' >> ~/.dsh/profiles/web/cordis.patch.yml
- insert:
    - id: dsh-hotnews
      name: "@zhengzhuangpro/dsh-hotnews"
EOF
```

然后重启：

```bash
npx @deepseek-ai/dsh@latest web
```

> ⚠ 如果只跑 `npx dsh plugin --profile web add` 而没追加配置条目，
> 插件不会加载（热榜页签不会出现，`/hotnews/api` 接口 404）。
> 这是 DSH 当前的设计：安装包与挂载条目是两步操作，命令已帮你合在一起了。

## 数据来源

插件复用 [hotnews](https://github.com/zhengzhuangpro/hotnews)（>= 0.1.7-beta.0）npm 库的
`fetchNews` / `sources` API，构建时打包进 `lib/index.js`——
用户安装时**不需要装 hotnews**，也没有跨域问题（数据经 Host 同源路由中转）。

## 开发

```bash
git clone <本仓库地址>
pnpm install
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle
pnpm install:profile @zhengzhuangpro/dsh-hotnews
npx @deepseek-ai/dsh@latest web --port 3081
```

改完代码后：

```bash
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle
pnpm install:profile @zhengzhuangpro/dsh-hotnews
# 刷新页面即可
```

## 卸载

```bash
dsh plugin --profile web remove @zhengzhuangpro/dsh-hotnews
# 同时手动删掉 ~/.dsh/profiles/web/cordis.patch.yml 里对应的 - insert: 块
```

## 许可

[MIT](../../LICENSE)
