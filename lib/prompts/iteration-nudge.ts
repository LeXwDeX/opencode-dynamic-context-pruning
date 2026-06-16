export const ITERATION_NUDGE = `
Many iterations elapsed without new user input.

Has the current iteration's task effectively finished, or has its topic drifted away from earlier steps?
- If earlier steps belong to a resolved problem or a superseded exploration, call \`compress\` now to fold them into a summary.
- If the iteration still continues the same unfinished goal and early context is still needed, keep it.

Do not let finished exploration directions keep occupying context. Topic drift is the best moment to compress.
`
