import assert from "node:assert/strict"
import test from "node:test"
import { syncCompressionBlocks } from "../lib/messages"
import { resolveBoundaryIds, buildSearchContext } from "../lib/compress/search"
import { createSessionState, type CompressionBlock, type WithParts } from "../lib/state"
import { Logger } from "../lib/logger"
import { assignMessageRefs } from "../lib/message-ids"

function makeMessage(
    sessionID: string,
    id: string,
    role: "user" | "assistant",
    text: string,
): WithParts {
    return {
        info: {
            id,
            role,
            sessionID,
            agent: "assistant",
            time: { created: 1 },
        } as WithParts["info"],
        parts: [
            {
                id: `${id}-part`,
                messageID: id,
                sessionID,
                type: "text",
                text,
            },
        ] as any,
    }
}

function buildBlock(
    blockId: number,
    anchorMessageId: string,
    compressMessageId: string,
): CompressionBlock {
    return {
        blockId,
        runId: 1,
        active: true,
        deactivatedByUser: false,
        compressedTokens: 10,
        summaryTokens: 5,
        durationMs: 100,
        mode: "range",
        topic: `topic-${blockId}`,
        batchTopic: `batch-${blockId}`,
        startId: "m0001",
        endId: "m0001",
        anchorMessageId,
        compressMessageId,
        includedBlockIds: [],
        consumedBlockIds: [],
        parentBlockIds: [],
        directMessageIds: [anchorMessageId],
        directToolIds: [],
        effectiveMessageIds: [anchorMessageId],
        effectiveToolIds: [],
        createdAt: blockId,
        summary: `summary-${blockId}`,
    }
}

test("syncCompressionBlocks preserves block when compressMessageId pruned but anchorMessageId exists", () => {
    const state = createSessionState()
    const block = buildBlock(1, "msg-anchor-1", "msg-compress-1")
    state.prune.messages.blocksById.set(1, block)
    state.prune.messages.activeBlockIds.add(1)

    const messages = [makeMessage("s1", "msg-anchor-1", "user", "anchor text")]

    const logger = new Logger(false)
    syncCompressionBlocks(state, logger, messages)

    assert.equal(block.active, true, "block should remain active")
    assert.equal(
        state.prune.messages.activeBlockIds.has(1),
        true,
        "block ID should be in activeBlockIds",
    )
})

test("syncCompressionBlocks deactivates block when anchorMessageId is also pruned", () => {
    const state = createSessionState()
    const block = buildBlock(1, "msg-anchor-1", "msg-compress-1")
    state.prune.messages.blocksById.set(1, block)
    state.prune.messages.activeBlockIds.add(1)

    const messages = [makeMessage("s1", "msg-other", "user", "unrelated")]

    const logger = new Logger(false)
    syncCompressionBlocks(state, logger, messages)

    assert.equal(block.active, false, "block should be deactivated")
    assert.equal(
        state.prune.messages.activeBlockIds.has(1),
        false,
        "block ID should not be in activeBlockIds",
    )
})

test("resolveBoundaryIds resolves inactive block when anchorMessageId exists (fallback)", () => {
    const state = createSessionState()
    const sessionID = "s1"

    const messages = [
        makeMessage(sessionID, "msg-anchor-1", "user", "anchor text"),
        makeMessage(sessionID, "msg-end-1", "assistant", "end text"),
    ]

    assignMessageRefs(state, messages)

    const block = buildBlock(1, "msg-anchor-1", "msg-compress-1")
    block.active = false
    state.prune.messages.blocksById.set(1, block)

    const context = buildSearchContext(state, messages)
    const result = resolveBoundaryIds(context, state, "b1", "m0002")

    assert.equal(result.startReference.kind, "compressed-block")
    assert.equal(result.startReference.blockId, 1)
})

test("resolveBoundaryIds error includes available block IDs", () => {
    const state = createSessionState()
    const sessionID = "s1"

    const messages = [
        makeMessage(sessionID, "msg-1", "user", "text 1"),
        makeMessage(sessionID, "msg-2", "assistant", "text 2"),
        makeMessage(sessionID, "msg-3", "user", "text 3"),
        makeMessage(sessionID, "msg-4", "assistant", "text 4"),
        makeMessage(sessionID, "msg-5", "user", "text 5"),
    ]

    assignMessageRefs(state, messages)

    const context = buildSearchContext(state, messages)

    assert.throws(
        () => {
            resolveBoundaryIds(context, state, "b999", "m0005")
        },
        (err: Error) => {
            assert.match(err.message, /No block IDs available/)
            return true
        },
    )
})
