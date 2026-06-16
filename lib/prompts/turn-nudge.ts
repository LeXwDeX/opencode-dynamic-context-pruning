export const TURN_NUDGE = `
New user turn. This is the moment topic changes are most likely.

Is this turn's request a different topic/task from the previous one?
- New or independent topic: call \`compress\` now to fold the previous topic's finished context into a summary. Its details no longer need verbatim retention.
- Continuation of the same topic: you may keep it, but still watch for stale accumulation.

Topic change is the clearest, most objective compression trigger — do not miss it.
`
