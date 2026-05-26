# DCP Fork Fix Plan

## Goal
Port high-value fixes from 4 upstream PRs (#550, #547, #530, #510) to master branch.

## Work Packages

### WP1: reasoning-strip.ts — Exclude reasoning from stripStaleMetadata
- **Source**: PR #530 (tracycam) approach
- **File**: `lib/messages/reasoning-strip.ts`
- **Change**: Remove `"reasoning"` from `RELEVANT_TYPES` array (line 28)
- **Why**: Anthropic reasoning parts have `signature` field that must be preserved; opencode native already handles reasoning→text conversion for model switches
- **Risk**: LOW (1 file, 1 line)

### WP2: State persistence — Persist lastCompaction + messageIds
- **Source**: PR #547 (LeXwDeX) + PR #530 (tracycam)
- **Files**: `lib/state/persistence.ts`, `lib/state/state.ts`, `lib/state/utils.ts`
- **Changes**:
  1. Add `lastCompaction` and `messageIds` to `PersistedSessionState` interface
  2. Save them in `saveState()`, restore in `loadState()`
  3. Make `resetOnCompaction()` inert — only reset `toolParameters`
  4. In `ensureSessionInitialized()`, restore `lastCompaction` from persisted state
- **Why**: Without persistence, session restart triggers `resetOnCompaction` which wipes all DCP state
- **Risk**: MEDIUM (3 files, state shape change)

### WP3: hooks.ts — Fail-open transforms with try/catch
- **Source**: PR #510 (gmnstr)
- **File**: `lib/hooks.ts`
- **Change**: Wrap `createChatMessageTransformHandler` transform chain in try/catch, clone messages before transform, return original on error
- **Why**: Transform failures crash the entire chat flow
- **Risk**: LOW (1 file, defensive only)

### WP4: Continuation nudge after compress
- **Source**: PR #547 (LeXwDeX)
- **File**: TBD (likely `lib/hooks.ts` or compress tool handler)
- **Change**: After DCP compress tool executes, inject a system-reminder nudge to continue
- **Why**: Model stops generating after compress tool returns, leaving user without response
- **Risk**: LOW

### WP5: Chinese prompts
- **Source**: PR #547 (LeXwDeX) commit 568c42b
- **Files**: `lib/prompts/*.ts`
- **Change**: Translate all DCP prompts to Chinese
- **Why**: Reduces qwen3.7-max XML tag hallucination
- **Risk**: LOW (content only, no logic)

## Execution Order
1. WP1 + WP3 (parallel, independent files)
2. WP2 (depends on understanding state flow)
3. WP4 (needs exploration of compress tool handler)
4. WP5 (independent, can be last)

## Acceptance
- All changes compile (`bun typecheck` passes)
- Existing tests pass (`bun test`)
- No regressions in DCP compress/restore flow
