export const CONTEXT_LIMIT_NUDGE = `<dcp-system-reminder>
CRITICAL: max context limit reached.

You are at or beyond the configured max context threshold. This is an emergency context-recovery moment.

You MUST call \`compress\` now. Do not continue normal exploration until compression is done.

If mid-atomic-step, finish that one step, then compress immediately.

Selection
Start from older, already-finished history and capture as much stale context as possible in one pass.
Do not select the latest working messages unless they are clearly concluded.

Summary requirements
Your summary must cover all key details in the selected messages so work can continue.
If the range contains user messages, preserve their intent fully. For short user messages, prefer direct quotes to avoid semantic drift.
</dcp-system-reminder>
`
