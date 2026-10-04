# Taffy

Taffy is a CLI that serves a chat-like visual workspace. Agent replies primarily use diagrams, drawings, animations, and video; prose supports the visual. Keep the implementation small and reuse the existing Codex CLI, authentication, model routing, and tools.

- `src/cli.ts`: command parsing and one-port server startup.
- `src/server.ts`: authenticated UI/API and local artifact delivery.
- `src/agent.ts`: Codex exec/resume and bounded structured output.
- `src/schema.ts`: visual response and feedback contract.
- `src/ui/`: React, tldraw, CodeMirror, and animation/video views.
- `scripts/build.ts`: frontend bundle and standalone CLI packaging.
- `Formula/taffy.rb`: draft Homebrew source-build formula.
- `.github/workflows/`: checks and platform archive builds.

Use Bun. Run `bun install --frozen-lockfile`, `bun run check`, `bun test`, `bun run build`, and `bun run test:browser` for relevant runtime/UI changes. Long-running processes belong in tmux. Validate the compiled CLI from a directory outside the source checkout.

Keep public responses short without concealing risks or errors. Preserve the user's draft and selected evidence while other work updates. Send actual drawing data and selected code to the same agent thread. Never treat an annotation as approval to modify, merge, or deploy code.

The draft replaces the native desktop product. Git history retains the prior application. Do not change the existing Taffy/cmux installations or running research prototype while testing this branch. Keep the PR in draft; do not merge, tag, or publish a release without a new instruction.
