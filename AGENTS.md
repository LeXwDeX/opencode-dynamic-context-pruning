# AGENTS.md

## Commands

```bash
npm run typecheck          # tsc --noEmit (must pass before commit)
npm test                   # node --import tsx --test tests/*.test.ts
npm run build              # tsup (bundle) + tsc --emitDeclarationOnly
npm run format:check       # prettier --check (CI enforces this)
npm run check:package      # build + verify-package.mjs (runs on prepublishOnly)
```

Run a single test: `node --import tsx --test tests/compress-range.test.ts`

## Architecture

OpenCode plugin (`@opencode-ai/plugin`). Entry: `index.ts` → returns hook handlers + tool registration.

- **`lib/hooks.ts`** — All 5 plugin hooks: `chat.system.transform`, `chat.messages.transform`, `text.complete`, `command.execute.before`, `event`
- **`lib/compress/`** — Compress tool: `message.ts` (per-message mode), `range.ts` (range mode), `pipeline.ts` (shared prepare/finalize)
- **`lib/state/`** — Session state: `types.ts` (SessionState), `persistence.ts` (disk save/load), `state.ts` (checkSession, init), `utils.ts` (resetOnCompaction — inert, only resets toolParameters)
- **`lib/messages/`** — Message processing: `inject/` (nudge injection), `priority.ts`, `prune.ts`, `reasoning-strip.ts`, `query.ts`, `shape.ts`
- **`lib/prompts/`** — All prompts in **Chinese** (intentional — reduces XML tag hallucination with qwen models). `store.ts` loads custom overrides from disk.
- **`lib/config.ts`** — Config resolution: global `~/.config/opencode/dcp.jsonc` → project `.opencode/dcp.jsonc`
- **`lib/update.ts`** — Auto-update via npm. `PACKAGE_NAME` constant must match `package.json` name.

## Build & Package

- **ESM-only** (`"type": "module"`). tsup bundles to single `dist/index.js`. `jsonc-parser` is bundled inline (broken ESM).
- `tsc --emitDeclarationOnly` generates `.d.ts` files separately.
- `scripts/verify-package.mjs` validates: import graph has no CJS deps, tarball excludes source/tests/scripts, required files present. Runs automatically on `npm publish`.
- `.npmignore` excludes `lib/`, `index.ts`, `tests/`, `scripts/` from tarball — only `dist/`, `README.md`, `LICENSE` ship.

## Testing

- Test runner: `node:test` (not jest/vitest). Tests use `node:assert/strict`.
- **Known failure**: `tests/prompts.test.ts:53` — Bun doesn't support nested `t.test()`. This is pre-existing and unrelated to changes.
- Tests assert on **Chinese prompt text** — when changing prompts, update test regex patterns in `tests/message-priority.test.ts`, `tests/prompts.test.ts`, `tests/compress-message.test.ts`.
- `resetOnCompaction` is **inert** — tests in `tests/message-ids.test.ts` assert state is preserved after compaction.

## Formatting

Prettier: no semicolons, double quotes, 4-space indent, 100 char width, trailing commas. Run `npm run format` to auto-fix.

## Publishing

```bash
npm version patch          # bumps version + creates git tag v*
git push fork master --tags  # triggers GitHub Actions → npm publish
```

GitHub Actions workflow `.github/workflows/publish.yml` handles build + publish using `secrets.NPM_TOKEN`.

## Key Constraints

- `@opencode-ai/plugin` is a **peerDependency** (>=1.4.3) — don't add it to dependencies.
- `stripStaleMetadata` must **not** include `"reasoning"` type — breaks Anthropic signature preservation.
- `chat.messages.transform` handler clones messages before transforms and wraps in try/catch (fail-open). Don't remove this defensive wrapping.
- State persistence: `lastCompaction` and `messageIds` are saved to disk. Don't make them in-memory only.
