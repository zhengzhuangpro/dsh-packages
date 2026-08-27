# @zhengzhuangpro/dsh-hotnews

[![npm version](https://img.shields.io/npm/v/@zhengzhuangpro/dsh-hotnews.svg)](https://www.npmjs.com/package/@zhengzhuangpro/dsh-hotnews)
[![npm downloads](https://img.shields.io/npm/dm/@zhengzhuangpro/dsh-hotnews.svg)](https://www.npmjs.com/package/@zhengzhuangpro/dsh-hotnews)
[![license](https://img.shields.io/npm/l/@zhengzhuangpro/dsh-hotnews.svg)](../../LICENSE)

> 📰 View trending news inside [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — Baidu · Weibo · Douyin · Hupu · Zhihu · Juejin · 36Kr · GitHub · Sspai · V2EX · WallStreetCN, all in one tab.

## ✨ Features

- 🔥 **11 platforms aggregated**: Baidu, Weibo, Douyin, Hupu, Zhihu, Juejin, 36Kr, GitHub, Sspai, V2EX, WallStreetCN
- 🎨 **Auto theme**: Follows DSH light / dark mode
- 🌐 **i18n ready**: Chinese / English follows interface language
- 🔄 **One-click refresh**: Get the latest trending data in real time
- 🖱️ **Click to open**: Jump directly to the original article
- 📦 **Zero config**: Data served through same-origin Host route, no CORS issues

## 📸 Preview

```
┌─────────────────────────────────────────────┐
│  [ Chat ]  [ 🔥 Hot News ]                  │
├─────────────────────────────────────────────┤
│  [Baidu] [Weibo] [Douyin] [Hupu] [V2EX]... │
│                                              │
│  1. Trending topic #1               12.3M   │
│  2. Trending topic #2                8.9M   │
│  3. ...                                      │
└─────────────────────────────────────────────┘
```

## 🚀 Install

### Option 1: Ask the AI (Recommended)

Type in the DSH Web chat:

```
帮我安装 dsh plugin --profile web add @zhengzhuangpro/dsh-hotnews
```

The AI will install and configure everything automatically.

### Option 2: Terminal

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

> ⚠️ Running only `npx dsh plugin add` without the config entry will leave the plugin unloaded. The command above handles both steps.

## 🗑️ Uninstall

```bash
dsh plugin --profile web remove @zhengzhuangpro/dsh-hotnews
# Also remove the corresponding - insert: block from
# ~/.dsh/profiles/web/cordis.patch.yml
```

---

## 🛠️ Development

### Setup

```bash
git clone https://github.com/zhengzhuangpro/dsh-packages.git
cd dsh-packages
pnpm install
```

### Build & Debug

```bash
# Build the plugin
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle

# Install to local DSH
pnpm install:profile @zhengzhuangpro/dsh-hotnews

# Start dev server
npx @deepseek-ai/dsh@latest web --port 3081
```

After editing code, rebuild and refresh:

```bash
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle
```

### Type Check

```bash
pnpm --filter @zhengzhuangpro/dsh-hotnews typecheck
```

---

## 📦 Build & Publish

### Build

```bash
pnpm --filter @zhengzhuangpro/dsh-hotnews bundle
```

Output in `lib/`:

```
lib/
├── index.js          # Entry (invariant + host logic)
├── invariant.js      # Plugin contract declaration
└── client.js         # Client UI (Slot registration / components / styles / i18n)
```

### Publish

```bash
# Enter package directory
cd packages/hotnews-dsh

# Publish stable
npm publish --access public

# Publish beta
npm publish --access public --tag beta
```

> ⚠️ `npm publish` automatically triggers the `prepublishOnly` hook to run `npm run bundle` — no need to build manually first.

### Bump Version

```bash
cd packages/hotnews-dsh

# Patch 0.0.2 -> 0.0.3
npm version patch

# Beta 0.0.2-beta.1 -> 0.0.2-beta.2
npm version prerelease --preid=beta
```

---

## 📖 Technical Details

- Data source: [hotnews](https://github.com/zhengzhuangpro/hotnews) (≥ 0.1.7-beta.0) npm library
- `fetchNews` / `sources` API bundled into `lib/index.js` at build time
- End users **do not need to install hotnews**, data served through same-origin Host route

## 📄 License

[MIT](../../LICENSE)
