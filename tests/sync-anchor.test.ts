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

test("resolveBoundaryIds error includes available block IDs and message IDs", () => {
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
            assert.match(err.message, /Available message IDs/)
            assert.match(err.message, /m0001/)
            return true
        },
    )
})

test("resolveBoundaryIds error explains compacted-out message IDs", () => {
    const state = createSessionState()
    const sessionID = "s1"

    // Create 5 messages and assign refs, so m0001-m0005 all exist in byRef
    const messages = [
        makeMessage(sessionID, "msg-1", "user", "text 1"),
        makeMessage(sessionID, "msg-2", "assistant", "text 2"),
        makeMessage(sessionID, "msg-3", "user", "text 3"),
        makeMessage(sessionID, "msg-4", "assistant", "text 4"),
        makeMessage(sessionID, "msg-5", "user", "text 5"),
    ]
    assignMessageRefs(state, messages)

    // Simulate compaction: remove msg-3 from the conversation
    // (but m0003 mapping persists in state.messageIds.byRef)
    const compactedMessages = messages.filter((m) => m.info.id !== "msg-3")
    const context = buildSearchContext(state, compactedMessages)

    assert.throws(
        () => {
            resolveBoundaryIds(context, state, "m0003", "m0005")
        },
        (err: Error) => {
            assert.match(err.message, /compacted out/)
            assert.match(err.message, /Available message IDs/)
            return true
        },
    )
})

test("resolveBoundaryIds invalid startId format includes available boundaries and usage guidance", () => {
    const state = createSessionState()
    const sessionID = "s1"

    const messages = [
        makeMessage(sessionID, "msg-anchor-1", "user", "anchor text"),
        makeMessage(sessionID, "msg-end-1", "assistant", "end text"),
    ]

    assignMessageRefs(state, messages)
    state.prune.messages.blocksById.set(1, buildBlock(1, "msg-anchor-1", "msg-compress-1"))

    const context = buildSearchContext(state, messages)

    assert.throws(
        () => {
            resolveBoundaryIds(context, state, "start-1", "m0002")
        },
        (err: Error) => {
            assert.match(err.message, /startId is invalid/)
            assert.match(err.message, /mNNNN/)
            assert.match(err.message, /bN/)
            assert.match(err.message, /Available message IDs: m0001, m0002/)
            assert.match(err.message, /Available block IDs: b1/)
            assert.match(err.message, /Use exactly one of the listed injected IDs/)
            assert.match(err.message, /compressed content.*bN/)
            return true
        },
    )
})

test("resolveBoundaryIds never-assigned message ID includes invalid reason and exact-ID guidance", () => {
    const state = createSessionState()
    const sessionID = "s1"

    const messages = [
        makeMessage(sessionID, "msg-1", "user", "text 1"),
        makeMessage(sessionID, "msg-2", "assistant", "text 2"),
        makeMessage(sessionID, "msg-3", "user", "text 3"),
        makeMessage(sessionID, "msg-4", "assistant", "text 4"),
        makeMessage(sessionID, "msg-5", "user", "text 5"),
        makeMessage(sessionID, "msg-6", "assistant", "text 6"),
        makeMessage(sessionID, "msg-7", "user", "text 7"),
        makeMessage(sessionID, "msg-8", "assistant", "text 8"),
        makeMessage(sessionID, "msg-9", "user", "text 9"),
        makeMessage(sessionID, "msg-10", "assistant", "text 10"),
        makeMessage(sessionID, "msg-11", "user", "text 11"),
    ]

    assignMessageRefs(state, messages)

    const context = buildSearchContext(state, messages)

    assert.throws(
        () => {
            resolveBoundaryIds(context, state, "m0572", "m0011")
        },
        (err: Error) => {
            assert.match(err.message, /startId m0572 is not available \(invalid ID\)/)
            assert.match(err.message, /Available message IDs: m0001 to m0011 \(11 total\)/)
            assert.match(err.message, /Use exactly one of the listed injected IDs/)
            return true
        },
    )
})

test("resolveBoundaryIds does not offer compressed original message IDs as boundaries", () => {
    const state = createSessionState()
    const sessionID = "s1"

    const originalMessages = [
        makeMessage(sessionID, "msg-anchor-1", "user", "anchor text"),
        makeMessage(sessionID, "msg-compacted-1", "assistant", "compacted text"),
        makeMessage(sessionID, "msg-end-1", "user", "end text"),
    ]

    assignMessageRefs(state, originalMessages)
    const block = buildBlock(1, "msg-anchor-1", "msg-compress-1")
    block.effectiveMessageIds = ["msg-anchor-1", "msg-compacted-1"]
    state.prune.messages.blocksById.set(1, block)

    const visibleMessages = originalMessages.filter(
        (message) => message.info.id !== "msg-compacted-1",
    )
    const context = buildSearchContext(state, visibleMessages)

    assert.throws(
        () => {
            resolveBoundaryIds(context, state, "m0002", "m0003")
        },
        (err: Error) => {
            assert.match(err.message, /startId m0002 is not available/)
            assert.match(err.message, /message was likely compacted out of the conversation/)
            assert.match(err.message, /Available message IDs: m0001, m0003/)
            assert.doesNotMatch(err.message, /Available message IDs:.*m0002/)
            assert.match(err.message, /Available block IDs: b1/)
            assert.match(err.message, /compressed content.*bN/)
            return true
        },
    )
})
