# @zhengzhuangpro/dsh-hotnews

View trending news inside [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 📰

Baidu · Weibo · Douyin · Hupu · Zhihu · Juejin · 36Kr · GitHub — all in one tab.

## Preview

After installation and restart, a 🔥 **Hot News** tab appears at the top of the conversation view (alongside Chat). The full-featured panel includes:

- Source switcher chips (tap to change platform)
- Refresh button + last-updated timestamp
- Hot list (title / popularity / click to open original)
- Auto light/dark theme, zh/en language follows interface setting

## Install

**Option 1 (recommended): Just ask the AI**

Open the DSH Web interface and type in chat:

> 帮我安装一下 dsh plugin --profile web add @zhengzhuangpro/dsh-hotnews

The AI will install it and add the required config automatically, then restart to activate.

**Option 2: One-liner for the terminal**

Install the package and append the required config entry in one step:

```bash
npx dsh plugin --profile web add @zhengzhuangpro/dsh-hotnews \
  && cat << 'EOF' >> ~/.dsh/profiles/web/cordis.patch.yml
- insert:
    - id: dsh-hotnews
      name: "@zhengzhuangpro/dsh-hotnews"
EOF
```

Then restart:

```bash
npx @deepseek-ai/dsh@latest web
```

> ⚠ Running only `npx dsh plugin --profile web add` without the config entry
> will leave the plugin unloaded (the Hot News tab won't appear and `/hotnews/api` returns 404).
> The DSH design requires both steps — the command above handles them together.

## Data Source

The plugin uses the [hotnews](https://github.com/zhengzhuangpro/hotnews) (>= 0.1.7-beta.0) npm library's
`fetchNews` / `sources` API, bundled into `lib/index.js` at build time —
end users **do not need to install hotnews**, and there are **no CORS issues**
(data is served through a same-origin Host route).

## Development

```bash
git clone <this repo>
pnpm install
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle
pnpm install:profile @zhengzhuangpro/dsh-hotnews
npx @deepseek-ai/dsh@latest web --port 3081
```

After editing code:

```bash
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle
pnpm install:profile @zhengzhuangpro/dsh-hotnews
# Then just refresh the page — no reinstall needed.
```

## Uninstall

```bash
dsh plugin --profile web remove @zhengzhuangpro/dsh-hotnews
# Also manually delete the - insert: block for this plugin from
# ~/.dsh/profiles/web/cordis.patch.yml
```

## License

[MIT](../../LICENSE)
