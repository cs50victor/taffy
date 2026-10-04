# Taffy

A chat-like workspace where the main replies are diagrams, drawings, and short Manim videos. Ask a question, point at code, or draw on a response. Keep the prose short and expand the evidence when you need it.

This draft replaces the native desktop app with one command and one browser port. It keeps the name Taffy and uses your existing Codex installation, login, configuration, model routing, and tools. There is no new provider protocol.

## Run the draft

Install Bun, Codex, and Manim, then build this branch:

```sh
brew install bun manim
brew install --cask codex
codex login
bun install --frozen-lockfile
bun run build
./dist/taffy /path/to/project
```

Open the private link printed by the command. A LAN link works on another device on the same network; a VPN can provide private access beyond it. The command binds port 4177 by default; use `--host 127.0.0.1` for local access or `--port 0` for a free port. Keep the connection link private: it grants access to your project agent. The built-in server uses HTTP; use a trusted LAN or private VPN.

The executable embeds the browser UI and assets. Installed users need Codex and Manim on PATH, but do not need Bun or Node to run Taffy. Use `taffy --help` for options.

## Homebrew preview

The source-build recipe lives in `Formula/taffy.rb` and follows this draft branch. To try it without replacing an installed desktop launcher:

```sh
brew tap cs50victor/taffy-web https://github.com/cs50victor/taffy
git -C "$(brew --repo cs50victor/taffy-web)" checkout feat/visual-web-cli
brew install --HEAD --skip-link cs50victor/taffy-web/taffy
"$(brew --prefix cs50victor/taffy-web/taffy)/bin/taffy" /path/to/project
```

This is a draft recipe, not a published release or an update to the existing Taffy tap.

## Conversation and visuals

- Replies show a connected diagram or a real MP4 rendered by Manim Community Edition; this is the maintained community engine, distinct from 3Blue1Brown's own ManimGL version.
- Select a source excerpt or relationship, draw on the canvas, and send it to the same conversation; the canvas attachment is an actual PNG and can be switched off.
- Older replies remain in compact history; supporting evidence expands separately.
- Drafts and drawings stay in the browser while the agent works, and failures retain the previous response and submitted draft.
- One agent turn runs at a time, accepted request IDs prevent duplicate execution, and provider errors remain visible.

Conversation state and video artifacts live under `~/.local/state/taffy/<project-hash>`. Canvas annotations are local to each browser. Use `--state-dir` to change storage. Private links change on restart. If the process was killed without cleanup, verify the PID in `server.lock/pid` before removing that lock directory.

Codex retains its configured execution permissions. Taffy tells it to inspect real files, preserve evidence, and change code only when requested; drawing on a reply is not approval to edit, merge, or deploy.

## Check the branch

```sh
bun run check
bun test
bun run build
bunx playwright install chromium
bun run test:browser
bun scripts/smoke.ts
```

The browser check runs the compiled executable outside this checkout and exercises authentication, code selection, PNG export, draft/focus preservation, failures, video seeking, and mobile layout. The optional smoke script uses your real Codex account in a new scratch directory and renders a Manim video in the same thread. It consumes normal provider usage.

Render the included example directly with `manim -ql examples/morph.py Morph`.

The canvas SDK uses the tldraw license, which permits development and requires separate terms for production use. This draft preserves its enforcement and notices; resolve those terms before publishing a production build. See `THIRD_PARTY_LICENSES.md`.
