/**
 * Compute the input token budget for a model — the value DCP percentage
 * thresholds (`maxContextLimit`, `minContextLimit`) should resolve against.
 *
 * Two cases:
 *   1. `limit.input` defined (OpenAI GPT-5 line: gpt-5.4, gpt-5.5, …):
 *      use it directly. The provider enforces it as a hard input ceiling,
 *      and `limit.input + limit.output ≈ limit.context` by definition.
 *   2. `limit.input` undefined (shared-pool models — all Anthropic, gpt-4o,
 *      Gemini, Grok, DeepSeek, …): subtract `limit.output` from `limit.context`.
 *      This guarantees `input + worst-case output ≤ limit.context`, preventing
 *      `context_length_exceeded` errors when the model fills its output budget.
 *
 * Mirrors the convention in opencode core (`session/overflow.ts::usable()`).
 */
export function computeInputBudget(limit: {
    context: number
    input?: number
    output?: number
}): number {
    if (!limit.context) return 0
    return limit.input ?? Math.max(0, limit.context - (limit.output ?? 0))
}
